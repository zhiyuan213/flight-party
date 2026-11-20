import {SNOOKER_LIGHT} from './snooker-light.js?v=20261113-reboundlight1';
/* Snooker · Canvas 2D presentation layer.
 *
 * The rules live in snooker.js / snooker-duel.js and stay untouched. This view
 * reuses Pool's presentation pipeline (same table geometry, sphere lighting,
 * cue and audio chain) but snooker keeps its own identity:
 *   - green cloth, grained wooden frame, recessed pockets with rounded jaws,
 *     shaded cushions, D zone and colour spots
 *   - 22 solid-colour balls at radius 11, drawn with Pool's original soft
 *     sphere lighting; only the cue ball gets a small black rolling dot
 *   - a brass collector for balls actually removed from the current board;
 *     colours that the rules re-spot return to the cloth, never the collector.
 *
 * The authoritative cell array, shot command and replay frames keep exactly
 * the same format as before. Presentation-only callbacks (onShotResult /
 * onAnimating) let the shell announce a settled shot before the turn passes.
 */
import {colours,radius,placeCue,snookerTargets} from './snooker.js?v=20261110-dotblack1&release=20261115-polishrelease1&power=20261120-poolpower30';
import {snookerStart,viewState,NOM_BASE} from './snooker-duel.js?v=20261112-gamelanes1&release=20261115-polishrelease1&power=20261120-poolpower30';
import {TABLE_WIDTH,TABLE_HEIGHT,TABLE_PAD} from './pool-table.js';
import {makeSnookerTable} from './snooker-table.js?v=20261114-pocketdepth1';
import {SNOOKER_POCKET_SCALE} from './pool-geometry.js?v=20261114-pocketdepth1&power=20261120-poolpower30';
import {drawPoolBall,rollSphere,sphereIdentity} from './pool-ball.js?v=20261113-pocketdepth1';
import {ballSkin,cueSkin,tableSkin} from './billiard-cosmetics.js?v=20261112-gamelanes1';
import {drawCue} from './snooker-cue.js?v=20261112-natural1';
import {drawSnookerPocketDrops,snookerPocketMotion,SNOOKER_POCKET_DURATION as POCKET_DURATION} from './snooker-pocket-motion.js?v=20261113-wellmotion1&release=20261115-polishrelease1';
import {syncSnookerCollection,collectionActive,drawSnookerCollectionTrack,drawSnookerCollectedBalls} from './snooker-collection.js?v=20261113-wellmotion1&release=20261115-polishrelease1';
import {chainLevels,poolImpact,poolImpactBurst,pocketSoundStages,replayImpacts,unlockPoolAudio,poolMuted,setPoolMuted,setImpactVoice} from './pool-audio.js?v=20261113-snookerrail1&release=20261115-polishrelease1&audio=20261115-levels1&power=20261120-poolpower30';
import {playPocketChime} from './pool-pocket-sfx.js?v=20261110-glove2&audio=20261115-levels1';

const W=TABLE_WIDTH,H=TABLE_HEIGHT,PAD=TABLE_PAD,SCALE=2,R=radius,BALLS=22;
// Reserve the same 88-unit outer strip as Pool, without changing table units.
const VIEW_W=TABLE_WIDTH;
const reduced=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const cueAngle=(x,y,tx,ty)=>Math.atan2(ty-y,tx-x);
/* colours[0] is the cue ball, colours[1] is red, colours[2..7] are the six
   colours. Ball ids 1..6 are the colours and ids 7..21 are the reds. */
const sphereColour=id=>id===0?0:id<=6?id+1:1;
const SOUND_BOX={x:1000+PAD*2-46,y:12,w:32,h:28};
const AIM_COLOUR='#ffffff',AIM_WIDTH=2.4,AIM_OUTLINE='#102015';
const TARGET_IDLE_MS=10000,TARGET_PERIOD_MS=5000,TARGET_FADE_MS=600,TARGET_HOLD_MS=1000;
const TARGET_PULSE_MS=TARGET_FADE_MS*2+TARGET_HOLD_MS;
const STRIKE_MS=140;
const pocketSettle=item=>item.start+POCKET_DURATION+60;

export function createSnooker(ui){
  // Smaller snooker balls get their own short, bright cushion voice. Ball-ball
  // impacts still use the shared CC0 recording.
  setImpactVoice('snooker');
  const {canvas,ctx,point,label}=ui;
  canvas.width=VIEW_W*SCALE;canvas.height=H*SCALE;
  let state=viewState(snookerStart()),angle=0,playing=false,busy=false,computer=false,pull=null;
  let frame=0,timer=0,busyTimer=0,appliedKey=null,awaitingShot=false;
  let returns=[],orientations=Array.from({length:BALLS},sphereIdentity),painted=null;
  let collected=[];
  let replay=null,striking=null,queued=null,ringStart=null,lastShooterTurn=1;
  let lastPaint=0,powerPreview=false,snapshotToken=0;
  let animating=false,settleWaiters=[];

  function setAnimating(value){
    if(animating===value)return;
    animating=value;ui.onAnimating?.(value);
    if(!value){const waiting=settleWaiters;settleWaiters=[];for(const done of waiting)done();}
  }
  const setPower=value=>{
    if(ui.setPower)ui.setPower(value);
    else ui.power.value=String(value);
  };
  // Snooker's shot command has no spin field: the hit-point selector shifts the
  // cue tip and marks the cue ball visually, without touching the rule engine.
  const spinOffset=()=>{
    const spin=Number(ui.spin?.()||0);
    if(!spin)return [0,0];
    const t=(spin-1)*Math.PI/4;
    return [Math.sin(t)*R*.55,-Math.cos(t)*R*.55];
  };

  // The cached table is rendered at 2x, like Pool's, so the felt weave and the
  // pocket jaws stay sharp when the canvas is scaled down by CSS.
  const table=document.createElement('canvas');
  table.width=W*SCALE;table.height=H*SCALE;
  const tableContext=table.getContext('2d');
  tableContext.scale(SCALE,SCALE);
  /* The cloth is cached at 2x like Pool's. Rebuild it only when the shared
     table theme changes; with no theme the original baize is byte-identical. */
  let clothKey=null;
  function ensureCloth(){
    const tSkin=tableSkin(),key=tSkin?tSkin.theme:'original';
    if(clothKey===key)return;
    clothKey=key;
    makeSnookerTable(tableContext,{skin:tSkin});
  }

  function sphere(c,id,x,y,r,roll=0,heading=0,orientation=null,global=false){
    drawPoolBall(c,sphereColour(id),x,y,r,roll,heading,orientation,
      {...SNOOKER_LIGHT,x:(global?PAD:0)+SNOOKER_LIGHT.x,y:(global?PAD:0)+SNOOKER_LIGHT.y},{plain:true,overhead:true,palette:colours,skin:ballSkin()});
  }
  const channelSphere=(c,id,x,y,r,roll,heading,orientation)=>sphere(c,id,x,y,r,roll,heading,orientation,true);
  const human=()=>playing&&!busy&&!state.over&&!state.inHand&&!!ui.canPlay?.();
  const toTable=p=>({x:p.x/SCALE-PAD,y:p.y/SCALE-PAD});
  const inSoundBox=p=>{const x=p.x/SCALE,y=p.y/SCALE;return x>=SOUND_BOX.x&&x<=SOUND_BOX.x+SOUND_BOX.w&&y>=SOUND_BOX.y&&y<=SOUND_BOX.y+SOUND_BOX.h;};

  // One stroke treatment for incoming/outgoing guides, the ghost and idle rings.
  function strokeAim(opacity=1){
    ctx.save();ctx.globalAlpha*=opacity;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.strokeStyle=AIM_OUTLINE;ctx.lineWidth=AIM_WIDTH+1.4;ctx.stroke();
    ctx.strokeStyle=AIM_COLOUR;ctx.lineWidth=AIM_WIDTH;ctx.stroke();ctx.restore();
  }

  function guide(c,now){
    if(globalThis.document?.body?.dataset.noGuide==='1')return;
    const x=c[0]/10,y=c[1]/10,dx=Math.cos(angle),dy=Math.sin(angle);
    const wallX=dx>0?(1000-x)/dx:dx<0?-x/dx:Infinity;
    const wallY=dy>0?(500-y)/dy:dy<0?-y/dy:Infinity;
    // Middle pockets have no cushion across x 466..526: never stop the line
    // at an imaginary rail there.
    let wall=Math.min(wallX,wallY);
    if(wallY<=wallX&&Number.isFinite(wallY)){const hx=x+dx*wallY,gap=30*SNOOKER_POCKET_SCALE;
      if(hx>500-gap&&hx<500+gap)wall=wallY+140;}
    let end=wall,target=-1;
    for(let i=1;i<BALLS;i++)if(c[i*3+2]){
      const ax=c[i*3]/10-x,ay=c[i*3+1]/10-y,t=ax*dx+ay*dy,perp=ax*ax+ay*ay-t*t;
      if(t>0&&perp<(R*2)**2){
        const hit=Math.max(0,t-Math.sqrt((R*2)**2-perp));
        if(hit<end){end=hit;target=i;}
      }
    }
    ctx.save();
    // The contact ring keeps the actual ball radius, so aiming geometry agrees
    // with the simulation even though the reference-style stroke is heavier.
    // Stop the rounded guide at the near rim, leaving the translucent disc clear.
    const lineEnd=Math.max(0,end-R-AIM_WIDTH*.5);
    if(lineEnd>0){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dx*lineEnd,y+dy*lineEnd);strokeAim();}
    ctx.beginPath();ctx.arc(x+dx*end,y+dy*end,R,0,Math.PI*2);
    ctx.fillStyle='#ffffff33';ctx.fill();strokeAim();
    if(target>=0&&end<wall){
      const tx=c[target*3]/10,ty=c[target*3+1]/10,ox=tx-(x+dx*end),oy=ty-(y+dy*end),d=Math.hypot(ox,oy)||1;
      ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(tx+ox/d*72,ty+oy/d*72);strokeAim();
    }
    ctx.restore();
  }

  function targetRings(c,now){
    if(!human()){ringStart=null;return;}
    ringStart??=now;
    const elapsed=now-ringStart-TARGET_IDLE_MS;
    if(elapsed<0)return;
    const phase=elapsed%TARGET_PERIOD_MS;
    if(phase>=TARGET_PULSE_MS)return;
    // Keep the original fade-in/out, with one extra second at full visibility.
    const ramp=Math.min(1,phase/TARGET_FADE_MS,(TARGET_PULSE_MS-phase)/TARGET_FADE_MS);
    const fade=reduced()?1:Math.sin(Math.PI*.5*ramp)**2;
    if(fade<=0)return;
    ctx.save();
    for(const id of snookerTargets(state)){
      if(id>=BALLS||!c[id*3+2])continue;
      ctx.beginPath();ctx.arc(c[id*3]/10,c[id*3+1]/10,R+5,0,Math.PI*2);
      ctx.fillStyle=`rgba(255,255,255,${.2*fade})`;ctx.fill();strokeAim(fade);
    }
    ctx.restore();
  }

  function soundIcon(){
    const b=SOUND_BOX,cx=b.x+b.w/2,cy=b.y+b.h/2;
    ctx.save();
    ctx.fillStyle='#00000055';ctx.beginPath();ctx.roundRect(b.x,b.y,b.w,b.h,7);ctx.fill();
    ctx.strokeStyle='#ffffff9c';ctx.lineWidth=1.5;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(cx-9,cy-3);ctx.lineTo(cx-5,cy-3);ctx.lineTo(cx-1,cy-7);
    ctx.lineTo(cx-1,cy+7);ctx.lineTo(cx-5,cy+3);ctx.lineTo(cx-9,cy+3);ctx.closePath();ctx.stroke();
    if(poolMuted()){
      ctx.strokeStyle='#ff9a8a';ctx.beginPath();
      ctx.moveTo(cx+3,cy-4);ctx.lineTo(cx+10,cy+4);ctx.moveTo(cx+10,cy-4);ctx.lineTo(cx+3,cy+4);ctx.stroke();
    }else{
      ctx.beginPath();ctx.arc(cx-2,cy,5,-.7,.7);ctx.stroke();
      ctx.beginPath();ctx.arc(cx-2,cy,9,-.7,.7);ctx.stroke();
    }
    ctx.restore();
  }

  function advanceOrientations(c){
    if(painted){
      for(let i=0;i<BALLS;i++)if(painted[i*3+2]&&c[i*3+2]){
        const dx=(c[i*3]-painted[i*3])/10,dy=(c[i*3+1]-painted[i*3+1])/10,d=Math.hypot(dx,dy);
        if(d>0&&d<100)orientations[i]=rollSphere(orientations[i],dx,dy,R);
      }
    }
    painted=c.slice(0,BALLS*3);
  }

  function paint(c,now,opts={}){
    ensureCloth();
    ctx.setTransform(SCALE,0,0,SCALE,0,0);
    ctx.clearRect(0,0,VIEW_W,H);
    drawSnookerCollectionTrack(ctx);
    ctx.drawImage(table,0,0,TABLE_WIDTH,TABLE_HEIGHT);
    ctx.save();ctx.translate(PAD,PAD);
    targetRings(c,now);
    if(opts.cue){
      guide(c,now);
      const [ox,oy]=spinOffset();
      ctx.save();ctx.translate(ox,oy);
      /* `opts.cue` is true only for the human's own stroke: a bot replay never
         paints a cue in this branch, so MY theme is always the right one here.
         (`computer` means "this match has a bot", not "it is the bot's turn".) */
      drawCue(ctx,[c[0],c[1]],angle*1800/Math.PI,opts.pull||0,cueSkin(true));
      ctx.restore();
    }
    for(let i=0;i<BALLS;i++)if(c[i*3+2])sphere(ctx,i,c[i*3]/10,c[i*3+1]/10,R,0,0,orientations[i]);
    /* No coloured hit-point dot on the cue ball: the shared sphere painter
       already pins a small BLACK rotation mark to the white ball, and a second
       red dot made it look like two differently coloured spots. The hit-point
       selector still shifts the cue tip via spinOffset() above; its visible
       marker lives in the left rail's cue-ball control, not on the table. */
    ctx.restore();
    drawSnookerPocketDrops(ctx,returns,now,R,channelSphere);
    drawSnookerCollectedBalls(ctx,collected,now,R,channelSphere);
    soundIcon();
  }

  /* Pocket knocks, wooden echoes and the final drop keep the existing voices.
     The decorative collector does not change shot timing or scoring. */
  function returnSounds(now){
    for(const item of returns){
      const age=now-item.start;
      if(age<0||age>POCKET_DURATION+80||reduced())continue;
      const body=Math.min(1,Math.max(0,item.strength??.15));
      const stages=pocketSoundStages(snookerPocketMotion(item),body);
      item.soundStages??=new Set();
      const due=[];
      for(const [at,key,kind,volume,echo] of stages)
        if(age>=at&&age-at<100&&!item.soundStages.has(key)){item.soundStages.add(key);due.push({at,kind,volume,echo});}
      if(due.length){
        due.sort((a,b)=>a.at-b.at);const first=due[0].at;
        for(const s of due)poolImpact(s.kind,s.volume,0,1,(s.at-first)/1000,-1,s.echo??1);
      }
    }
  }

  function pruneReturns(now){returns=returns.filter(e=>now<pocketSettle(e));}
  const returnsActive=now=>returns.some(e=>now<pocketSettle(e));

  function sampleFrame(frames,progress){
    const p=Math.max(0,Math.min(frames.length-1,progress));
    const a=frames[Math.floor(p)],b=frames[Math.min(frames.length-1,Math.floor(p)+1)],f=p%1;
    return a.map((v,i)=>i%3===2?v:a[i-i%3+2]?v+(b[i]-v)*f:v);
  }

  function render(cells,now,opts){
    pruneReturns(now);
    advanceOrientations(cells);
    paint(cells,now,opts);
    returnSounds(now);
  }
  const cuePull=now=>striking?(1-Math.min(1,(now-striking.start)/STRIKE_MS))*striking.power*.45
    :(pull||powerPreview)?Number(ui.power.value)*.45:0;
  function draw(cells=state.cells,opts){
    const now=performance.now();
    const options=opts||{cue:human()||!!striking,pull:cuePull(now)};
    render(cells,now,options);
    kick();
  }
  function kick(){if(!frame&&playing)frame=requestAnimationFrame(loop);}

  function loop(now){
    frame=0;
    if(!playing)return;
    if(striking&&(reduced()||now-striking.start>=STRIKE_MS)){
      const shot=striking;striking=null;
      poolImpact('cue',shot.power/100);
      ui.onShoot(shot.command);
    }
    if(replay)advanceReplay(now);
    // Include the previous paint time so a spectator gets the final resting
    // frame as well as the last moving frame when the collector settles.
    const need=!!replay||!!striking||returnsActive(now)||collectionActive(collected,lastPaint||now)||human();
    if(need&&now-lastPaint>=16){
      lastPaint=now;
      const cells=replay?replay.cells:state.cells;
      render(cells,now,{cue:!replay&&(human()||!!striking),pull:cuePull(now)});
    }
    if(need)frame=requestAnimationFrame(loop);
  }

  function refresh(){
    const names=[label('Yellow','黄球'),label('Green','绿球'),label('Brown','棕球'),label('Blue','蓝球'),label('Pink','粉球'),label('Black','黑球')];
    const target=state.on==='red'?label('Red','红球'):state.on==='colour'?label('Colour','彩球'):names[state.on-1];
    const turn=computer?(state.turn===1?label('You','你'):label('Computer','电脑')):label('Player ','玩家 ')+state.turn;
    const rolling=(!!replay||animating)?label('Balls rolling · ','球滚动中 · '):'';
    ui.status(rolling+state.scores.join(' : ')+'  ·  '+turn+'  ·  '+(state.inHand?label('Place the cue ball in the D','在 D 区摆放白球'):target)+'  ·  '+label('Break','单杆')+' '+state.breakScore+(state.penalty?'  ·  '+label('Foul','犯规')+' +'+state.penalty:''));
    ui.state?.(state);
    ui.action.disabled=!human();
    const nominationLabel=ui.nomination.closest('label');
    if(nominationLabel)nominationLabel.hidden=!human()||state.on!=='colour';
    const selected=ui.nomination.value;
    ui.nomination.replaceChildren(new Option(label('From aim','按瞄准判定'),'0'),
      ...snookerTargets(state).filter(id=>id<=6).map(id=>new Option(names[id-1],String(id))));
    ui.nomination.value=Array.from(ui.nomination.options).some(option=>option.value===selected)?selected:'0';
  }

  function shoot(power,nomination=Number(ui.nomination.value)||0){
    if(!human()||!Number.isFinite(power))return;
    unlockPoolAudio();
    power=Math.round(Math.min(100,Math.max(5,power)));
    const command=(nomination||0)*NOM_BASE+power*3600+(Math.round(angle*1800/Math.PI)+3600)%3600;
    busy=true;awaitingShot=true;refresh();
    /* Pool consumes the pull on every shot and returns its cue to the top of
       the track. Do the same here so the wooden cue never stays hidden after
       a hard shot; the strike animation keeps its own captured power. */
    setPower(0);
    clearTimeout(busyTimer);
    /* If the local/room pipeline rejects the shot, never leave the table
       frozen: release the input lock after a short grace period. */
    busyTimer=setTimeout(()=>{if(awaitingShot){awaitingShot=false;busy=false;refresh();draw();}},3000);
    if(reduced()){poolImpact('cue',power/100);ui.onShoot(command);return;}
    striking={start:performance.now(),power,command};
    kick();
  }

  function shotPowerOf(command){
    return Number.isFinite(command)?Math.floor((command%NOM_BASE)/3600):undefined;
  }
  function frameValues(raw){
    return typeof raw==='string'?raw.split(',').map(Number):Array.isArray(raw)?raw:null;
  }
  function startReplay(next,target){
    const source=state.cells.slice(0,BALLS*3);
    const frames=[source,...(next.history||[]).map(frameValues)].filter(f=>f&&f.length>=BALLS*3);
    const events=Array.isArray(next.audioEvents)?next.audioEvents:[];
    return {frames,started:performance.now(),target,shooterTurn:state.turn,
      events:events.filter(e=>e&&e.kind!=='pocket'&&Number.isFinite(e.time)),
      pockets:events.filter(e=>e&&e.kind==='pocket'),
      eventIndex:0,lastIndex:0,soundPairs:new Map(),captured:[],cells:source,
      power:shotPowerOf(next.shotCommand),
      key:'s'+(next.shotCommand??'-')+':'+(next.moves??0)};
  }

  function captureBall(r,id,prev,before,cur,k,targetCells){
    if(returns.some(e=>e.id===id))return;
    const speed=Math.max(
      Math.hypot(prev[id*3]-before[id*3],prev[id*3+1]-before[id*3+1]),
      Math.hypot(cur[id*3]-prev[id*3],cur[id*3+1]-prev[id*3+1]))/400;
    const capture=r.pockets.find(e=>e.id===id);
    returns.push({id,scratch:id===0,
      // A colour that rules re-spot on the same shot must not also roll back.
      respot:id>0&&id<=6&&!!targetCells[id*3+2],
      strength:capture?.strength??Math.min(1,speed),
      vx:capture?.vx??(cur[id*3]-prev[id*3])/20,
      vy:capture?.vy??(cur[id*3+1]-prev[id*3+1])/20,
      shotPower:r.power,holeIndex:capture?.holeIndex,
      orientation:orientations[id]?.slice(),
      x:cur[id*3]/10+PAD,y:cur[id*3+1]/10+PAD,start:r.started+k*16});
    r.captured.push(id);
    // The replay already knows its final authoritative board. Only schedule a
    // ball that stays absent after this shot; the white and re-spots are skipped.
    collected=syncSnookerCollection(collected,targetCells,pocketSettle(returns.at(-1)),{animate:true,ids:[id]});
  }

  function advanceReplay(now){
    const r=replay,frames=r.frames,elapsed=Math.max(0,now-r.started);
    const p=Math.min(frames.length-1,elapsed/16),i=Math.floor(p);
    const due=[];
    while(r.eventIndex<r.events.length&&r.events[r.eventIndex].time<=elapsed)due.push(r.events[r.eventIndex++]);
    // Authoritative collision strengths use the same sample and mix as Pool.
    // Frame-reconstructed events below retain their separate compensation.
    if(due.length===1)poolImpact(due[0].kind,due[0].strength);
    else if(due.length>1)poolImpactBurst(due);
    if(i>r.lastIndex){
      for(let k=r.lastIndex+1;k<=i;k++){
        const before=frames[Math.max(0,k-2)],prev=frames[k-1],cur=frames[k];
        for(let id=0;id<BALLS;id++)if(prev[id*3+2]&&!cur[id*3+2])captureBall(r,id,prev,before,cur,k,r.target.cells);
        // Hosted rooms send frames but no impact timeline: reconstruct the
        // collisions from frame velocities, with the same 24 ms de-duping.
        if(!r.events.length){
          const batch=[];
          for(const event of replayImpacts(before,prev,cur,BALLS)){
            if(event.kind==='pocket')continue;
            if(k*16-(r.soundPairs.get(event.key)??-1000)<24)continue;
            r.soundPairs.set(event.key,k*16);batch.push(event);
          }
          if(batch.length===1)poolImpact(batch[0].kind,batch[0].strength,batch[0].tangent||0);
          else if(batch.length>1)poolImpactBurst(chainLevels(batch));
        }
      }
      r.lastIndex=i;
    }
    r.cells=sampleFrame(frames,p);
    if(p>=frames.length-1&&!returnsActive(now))finishReplay();
  }

  /* A shot is only "finished" once every ball has stopped and the pocket
     animation has ended. The shell uses this to show its result card and to
     hold the turn highlight / opponent move until that moment. */
  function announceShot(before,after,captured,shooter){
    ui.onShotResult?.({shooter,
      gained:[after.scores[0]-before.scores[0],after.scores[1]-before.scores[1]],
      penalty:after.penalty,pots:captured.filter(id=>id>0).length,
      breakScore:after.breakScore,on:after.on,turn:after.turn,
      scores:after.scores,over:after.over});
  }

  function finishReplay(){
    const r=replay;replay=null;
    const before=state;
    busy=false;awaitingShot=false;clearTimeout(busyTimer);
    state=r.target;
    collected=syncSnookerCollection(collected,state.cells,performance.now());
    returns=[];
    setAnimating(false);
    ui.nomination.value='0';refresh();draw();
    const pots=r.captured.filter(id=>id>0).length;
    if(pots&&!state.over)playPocketChime(pots,r.key);
    announceShot(before,state,r.captured,r.shooterTurn);
    if(state.over)ui.finish(label('Player ','玩家 ')+state.winner+label(' wins!',' 获胜！')+' · '+state.scores.join(' : '));
    if(queued){const next=queued;queued=null;applyBoard(next);}
  }

  /* Snapshot-only boards (no replay frames, or reduced motion) still show a
     pocket drop, so hosted/room pots never lose their visual feedback. */
  function captureSnapshot(previous,next,now){
    if(reduced())return;
    for(let id=0;id<BALLS;id++)if(previous[id*3+2]&&!next[id*3+2]&&!returns.some(e=>e.id===id)){
      returns.push({id,scratch:id===0,respot:id>0&&id<=6&&!!next[id*3+2],
        strength:.35,vx:(next[id*3]-previous[id*3])/20,vy:(next[id*3+1]-previous[id*3+1])/20,
        orientation:orientations[id]?.slice(),
        x:previous[id*3]/10+PAD,y:previous[id*3+1]/10+PAD,start:now});
    }
  }

  /* Authoritative board == the only source of truth. Local play and hosted
     rooms both hand the same cells/history here; the replay is purely visual. */
  function applyBoard(next){
    if(!next||!next.cells)return;
    const key=(next.shotCommand??'-')+':'+(next.moves??0);
    if(key===appliedKey)return;
    // An update arriving mid-replay is queued, not consumed: keep the old key
    // so the queued board is still applied once the current replay settles.
    if(replay){queued=next;kick();return;}
    appliedKey=key;awaitingShot=false;clearTimeout(busyTimer);
    const before=state,target=viewState(next),frames=next.history||[];
    lastShooterTurn=before.turn;
    if(!reduced()&&frames.length>1){
      replay=startReplay(next,target);
      setAnimating(true);
      busy=true;refresh();kick();return;
    }
    const previous=state.cells.slice(0,BALLS*3),now=performance.now();
    captureSnapshot(previous,target.cells,now);
    const captured=[];
    for(let id=1;id<BALLS;id++)if(previous[id*3+2]&&!target.cells[id*3+2])captured.push(id);
    collected=syncSnookerCollection(collected,target.cells,now+POCKET_DURATION+60,{animate:!reduced(),ids:captured});
    state=target;busy=false;ui.nomination.value='0';refresh();draw();
    // The initial rack is a snapshot too, but it is not a shot: never open a
    // result card before the first stroke.
    if(Number(next.moves||0)>0&&Number.isFinite(next.shotCommand))
      announceShot(before,target,captured,before.turn);
    if(state.over)ui.finish(label('Player ','玩家 ')+state.winner+label(' wins!',' 获胜！')+' · '+state.scores.join(' : '));
    setAnimating(true);
    const token=++snapshotToken;
    setTimeout(()=>{
      if(token===snapshotToken&&!replay&&!striking&&!returnsActive(performance.now()))setAnimating(false);
    },POCKET_DURATION+100);
  }

  const pullDistance=p=>(pull.x-p.x)*Math.cos(angle)+(pull.y-p.y)*Math.sin(angle);
  const dragPower=distance=>Math.round(Math.min(100,Math.max(5,distance/SCALE*.7)));
  canvas.onpointermove=event=>{
    if(!human()||state.inHand)return;
    const p=point(event);
    if(pull){
      if(event.pointerId!==pull.id)return;
      setPower(dragPower(pullDistance(p)));
    }else{const t=toTable(p);angle=cueAngle(state.cells[0]/10,state.cells[1]/10,t.x,t.y);}
    draw();
  };
  canvas.onpointerdown=event=>{
    if(event.button!==0)return;
    const p=point(event);
    if(inSoundBox(p)){unlockPoolAudio();setPoolMuted(!poolMuted());ui.onSoundChange?.();draw();return;}
    unlockPoolAudio();
    if(!human()||pull)return;
    const t=toTable(p);
    if(state.inHand){if(placeCue(state,t.x,t.y)){refresh();draw();}return;}
    angle=cueAngle(state.cells[0]/10,state.cells[1]/10,t.x,t.y);
    pull={...p,id:event.pointerId};canvas.setPointerCapture?.(event.pointerId);draw();
  };
  canvas.onpointerup=event=>{
    if(!pull||event.pointerId!==pull.id)return;
    const distance=pullDistance(point(event));
    pull=null;
    if(distance>6*SCALE&&human()){
      setPower(dragPower(distance));
      shoot(Number(ui.power.value));
    }else draw();
  };
  canvas.onpointercancel=canvas.onlostpointercapture=event=>{
    if(pull?.id===event.pointerId){pull=null;draw();}
  };
  ui.action.onclick=()=>{unlockPoolAudio();if(human())shoot(Number(ui.power.value));};

  draw();refresh();
  return {refresh,applyBoard,
    // Presentation-only queries used by the room shell / arcade page.
    shoot(power){if(human())shoot(power);},
    repaint(){draw();},
    previewPower(value){setPower(value);powerPreview=true;draw();},
    clearPreview(){powerPreview=false;draw();},
    whenSettled(){return animating?new Promise(done=>settleWaiters.push(done)):Promise.resolve();},
    animating(){return animating;},
    replayTurn(){return replay?.shooterTurn??lastShooterTurn??state.turn;},
    stop(){
      playing=false;pull=null;busy=false;awaitingShot=false;
      replay=null;striking=null;queued=null;returns=[];collected=[];painted=null;powerPreview=false;
      cancelAnimationFrame(frame);frame=0;clearTimeout(timer);clearTimeout(busyTimer);
      setAnimating(false);
    },start(withBot){
      cancelAnimationFrame(frame);frame=0;clearTimeout(timer);clearTimeout(busyTimer);
      computer=withBot;appliedKey=null;busy=false;awaitingShot=false;pull=null;playing=true;angle=0;
      replay=null;striking=null;queued=null;returns=[];painted=null;ringStart=null;
      powerPreview=false;lastShooterTurn=1;setAnimating(false);
      orientations=Array.from({length:BALLS},sphereIdentity);
      state=viewState(ui.board?.()||snookerStart());
      collected=syncSnookerCollection([],state.cells,performance.now());
      // Aim just below the red rack by default. A line straight at the rack
      // centre (790,250) clips the pink spot, and (790,285) fouls at medium
      // power. (790,280) is legal at both 55% and 65%. The rail idles at 0%
      // like the Pool game so the full wooden cue stays visible; the hidden
      // range keeps whatever power the host page configured.
      angle=cueAngle(state.cells[0]/10,state.cells[1]/10,790,280);
      ui.nomination.value='0';setPower(Number(ui.power.value));refresh();draw();kick();
    },state(){return state;}};
}
