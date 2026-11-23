import {makeTable,TABLE_WIDTH,TABLE_HEIGHT,TABLE_PAD} from './pool-table.js?v=20261112-gamelanes1';
import {drawReturnChannel,returnTiming,pocketMotion,POCKET_DURATION,RETURN_SPEED} from './pool-return.js?v=20261110-glove2&power=20261120-poolpower30';
import {pullPower,meterPower,spotCode,encodePoolShot,SPIN_STRIDE} from './pool-input.js?v=20261110-glove2&power=20261120-poolpower30';
import {updatePoolCountdown,cancelPoolCountdown} from './pool-countdown.js?release=20261115-polishrelease1';
import {replayImpacts,poolImpact,poolImpactBurst,chainLevels,pocketSoundStages, poolMuted, setPoolMuted, unlockPoolAudio} from './pool-audio.js?v=20261113-snookerrail1&release=20261115-polishrelease1&audio=20261115-levels1&power=20261120-poolpower30';
import {drawPoolBall,rollSphere,rotateSphere,sphereIdentity} from './pool-ball.js?v=20261112-gamelanes1';
import {ballSkin,cueSkin,tableSkin} from './billiard-cosmetics.js?v=20261112-gamelanes1';
import {drawCue as cue} from './pool-cue.js';
import {opponentShot,replayOpponentShot,opponentCuePose,REPLAY_CUE_DURATION} from './pool-opponent-cue.js?v=20261110-glove2';
import {targetsFor,isNineBall} from './pool-rules.js?v=20261110-glove2&nine=20261120-nineball1';
import {encodePoolPlace,poolCueInHand,clampCueSpot} from './pool-place.js?v=20261110-glove2';
import {drawGlovedHand,GLOVE_IDLE_ALPHA,GLOVE_DRAG_ALPHA} from './pool-glove.js?v=20261112-grip1';

const W = TABLE_WIDTH, H = TABLE_HEIGHT, PAD = TABLE_PAD, R = 16;
/* Snooker draws one solid white aim stroke with a dark outline. Pool used a
   faint blue dashed guide plus a warm yellow object-ball line; both billiards
   now share exactly the same constants and stroke treatment. */
const AIM_COLOUR='#ffffff',AIM_WIDTH=2.4,AIM_OUTLINE='#102015';
const TARGET_RING_IDLE_MS=10000, TARGET_RING_PERIOD_MS=5000, TARGET_RING_PULSE_MS=1200, TARGET_RING_OPACITY=.8;
function targetRingPhase(start,now){
  const elapsed=start==null?-1:now-start-TARGET_RING_IDLE_MS;
  return elapsed<0?Infinity:elapsed%TARGET_RING_PERIOD_MS;
}
const holes = [[0,0],[500,0],[1000,0],[0,500],[500,500],[1000,500]];
const colors = ['#f8faf6','#efc329','#2568d2','#c93639','#793caa','#e67920','#168669','#8d2d31','#141924'];
const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const circle = (c,x,y,r,fill) => { c.fillStyle=fill;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill(); };

// One stroke treatment for the incoming guide, the ghost ball, the object-ball
// line and the idle target rings. The dark under-stroke keeps white readable
// on every cloth theme; the top stroke is always pure white.
function strokeAim(ctx,opacity=1){
  ctx.save();ctx.globalAlpha*=opacity;ctx.lineCap='round';ctx.lineJoin='round';
  ctx.strokeStyle=AIM_OUTLINE;ctx.lineWidth=AIM_WIDTH+1.4;ctx.stroke();
  ctx.strokeStyle=AIM_COLOUR;ctx.lineWidth=AIM_WIDTH;ctx.stroke();ctx.restore();
}

function drawTargetRings(ctx,cells,targets,radius,opacity){
  ctx.save();
  for(const id of targets){
    ctx.beginPath();
    ctx.arc(cells[id*3]/10,cells[id*3+1]/10,radius+5,0,Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,'+(.2*opacity)+')';ctx.fill();
    strokeAim(ctx,opacity);
  }
  ctx.restore();
}

// Preserve server positions and disappearance timing; interpolate only visible coordinates.
export function samplePoolFrame(frames, progress) {
  const position=Math.max(0,Math.min(frames.length-1,progress));
  const a=frames[Math.floor(position)],b=frames[Math.min(frames.length-1,Math.floor(position)+1)],f=position%1;
  return a.map((v,i)=>i%3===2 ? v : a[i-i%3+2] ? v+(b[i]-v)*f : v);
}
export function poolAim(clientX,clientY,rect,cells) {
  const x=(clientX-rect.left)/rect.width*W-PAD, y=(clientY-rect.top)/rect.height*H-PAD;
  return (Math.round(Math.atan2(y-cells[1]/10,x-cells[0]/10)*1800/Math.PI)+3600)%3600;
}

/* drawPoolBall takes `light` (9th) and `options` (10th) separately. Passing
   the skin inside the light object used to drop options.skin AND, when the
   light had no x/y, produced NaN -> createRadialGradient threw -> the whole
   animation frame died (frozen table, invisible cue). */
function ball(ctx,id,x,y,roll=0,heading=0,alpha=1,orientation=null,radius=R,skin=null) {ctx.save();ctx.globalAlpha=alpha;drawPoolBall(ctx,id,x,y,radius,roll/16,heading,orientation,{x:480,y:234},{skin});ctx.restore();}

// `now` stays in the shared call signature for the replay/opponent paths; a
// solid white line needs no rolling dash phase.
function guide(ctx,c,angle,radius=R,now=0) {
  if(globalThis.document?.body?.dataset.noGuide==='1')return;
  const x=c[0]/10,y=c[1]/10,nx=Math.cos(angle*Math.PI/1800),ny=Math.sin(angle*Math.PI/1800);let length=Infinity,target=-1;
  for(let i=1;i<16;i++)if(c[i*3+2]){const dx=c[i*3]/10-x,dy=c[i*3+1]/10-y,t=dx*nx+dy*ny,d2=dx*dx+dy*dy-t*t;if(t>0&&d2<32*32){const hit=t-Math.sqrt(32*32-d2);if(hit>=0&&hit<length){length=hit;target=i;}}}
  const wallX=nx>0?(984-x)/nx:nx<0?(16-x)/nx:Infinity;
  const wallY=ny>0?(484-y)/ny:ny<0?(16-y)/ny:Infinity;
  let wall=Math.min(wallX,wallY);
  // The middle pockets have no cushion across x 466..526. Never draw the aim
  // line into an imaginary rail there; let it continue through the mouth.
  if(wallY<=wallX&&Number.isFinite(wallY)){const hx=x+nx*wallY;if(hx>466&&hx<526)wall=wallY+140;}
  length=Math.min(length,wall);
  ctx.save();
  // Solid white, exactly like Snooker. Stop at the near rim of the contact
  // disc so the heavier stroke never cuts through the ghost ball.
  const lineEnd=Math.max(0,length-radius-AIM_WIDTH*.5);
  if(lineEnd>0){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+nx*lineEnd,y+ny*lineEnd);strokeAim(ctx);}
  ctx.beginPath();ctx.arc(x+nx*length,y+ny*length,radius,0,Math.PI*2);
  ctx.fillStyle='#ffffff33';ctx.fill();strokeAim(ctx);
  if(target>=0&&length<wall){const tx=c[target*3]/10,ty=c[target*3+1]/10,dx=tx-(x+nx*length),dy=ty-(y+ny*length),d=Math.hypot(dx,dy);
    // This is only the first object's free path, not a prediction through a
    // rack. Stop at its next contact rather than drawing through the eight.
    const ox=dx/d,oy=dy/d;let outgoing=72;
    for(let i=1;i<16;i++)if(i!==target&&c[i*3+2]){
      const bx=c[i*3]/10-tx,by=c[i*3+1]/10-ty,t=bx*ox+by*oy;
      const side2=bx*bx+by*by-t*t;
      if(t>0&&side2<32*32)outgoing=Math.min(outgoing,Math.max(0,t-Math.sqrt(32*32-side2)));
    }
    ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(tx+ox*outgoing,ty+oy*outgoing);strokeAim(ctx);}
  ctx.restore();
}

export function cancelPoolOpponentShot(host) {
  host._cancelOpponentCue?.();
  host._opponentCue=null;
}

// The local computer prepares its actual command before moving any balls.
// Cancellation always settles, so restarting/leaving cannot resume the old turn.
export function animatePoolOpponentShot(host,command,isCurrent=()=>true) {
  cancelPoolOpponentShot(host);
  const shot=opponentShot(command),state=host._current;
  if(!shot||!state?.cells[2]||!isCurrent()||host._animating||state.over)return Promise.resolve(false);
  if(reduced()){poolImpact('cue',shot.power/100);return Promise.resolve(true);}
  return new Promise(resolve=>{
    const start=performance.now(),token=host._animationToken;
    const finish=completed=>{
      if(host._cancelOpponentCue!==cancel)return;
      host._cancelOpponentCue=null;host._opponentCue=null;host._update?.();
      resolve(completed);
    };
    const cancel=()=>finish(false);
    host._cancelOpponentCue=cancel;
    const frame=now=>{
      if(host._cancelOpponentCue!==cancel)return;
      if(token!==host._animationToken||!host.isConnected||!isCurrent()||host._current.moves!==state.moves){finish(false);return;}
      const pose=opponentCuePose(shot,now-start);
      host._opponentCue=pose;host._paint(state.cells,0,now);host._update?.();
      if(!pose.done)requestAnimationFrame(frame);
      else {poolImpact('cue',shot.power/100);finish(true);}
    };
    host._opponentCue=opponentCuePose(shot,0);host._paint(state.cells,0,start);host._update?.();
    requestAnimationFrame(frame);
  });
}

export function renderPool(host,s,can,options={}) {
  // Archived pre-upgrade rooms retain their authoritative 29-cell result. They
  // cannot be interpreted as a 16-ball board or silently replaced by a new rack.
  if(s.cells.length<48){
    cancelPoolOpponentShot(host);cancelPoolCountdown(host);
    host._animationToken=(host._animationToken||0)+1;
    host._current=s;host._can=false;host._animating=false;host._striking=false;
    host._returns=[];host._painted=null;host._snapshot=null;host._queued=null;host._scratchVisible=false;host._targetRingStart=null;
    host._paint=null;host._update=null;host._ready=()=>false;
    host.innerHTML='<section class="pool-table-wrap" role="status"><p>这是升级前的台球对局。已结束的对局可选择「再玩一局」，已关闭的房间请返回重新开局。</p></section>';
    return;
  }
  if(!host.querySelector('.pool-table-canvas')) {
    host.innerHTML='<div class="pool-left-controls"><button class="pool-sound" type="button" aria-label="切换台球音效"></button><div class="pool-hit"><canvas class="pool-spot" width="160" height="160" role="button" tabindex="0" aria-label="选择白球击球点"></canvas></div><div class="pool-power-meter" role="meter" aria-label="击球力度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="power-cue"></div></div><output class="pool-power-value">0%</output></div><div class="pool-table-wrap"><canvas class="pool-table-canvas" width="2464" height="1288" aria-label="台球桌，移动鼠标瞄准，按住左键后拉蓄力，松开击球"></canvas><div class="pool-countdown" hidden aria-live="polite"><b>3</b><span>准备开球</span></div></div><div class="pool-controls"><label>击球力度 <output>65%</output><input type="range" min="1" max="100" value="65" aria-label="击球力度"></label><button class="pool-shoot" data-position="234000">击球</button><button class="pool-unlock" type="button">重新瞄准</button></div><p class="pool-note"></p>';
    // One board-wide scrim also covers the gutter and protruding table rims.
    host.append(host.querySelector('.pool-countdown'));
    host._angle=0;host._power=0;host._spin=0;host._roll=Array(16).fill(0);host._heading=Array(16).fill(0);
    host.addEventListener('pointerdown',unlockPoolAudio);
    host.querySelector('.pool-sound').onclick=()=>{unlockPoolAudio();setPoolMuted(!poolMuted());host.querySelector('.pool-sound').textContent=poolMuted()?'静音':'声音';};
    // Invisible relay into table.js's single commit path. A real DOM button is
    // used (rather than calling into table.js) so online and local play stay
    // identical, including version/commandId handling.
    const relay=host.ownerDocument?.createElement?.('button');
    if(relay){relay.type='button';relay.className='pool-place';relay.hidden=true;relay.setAttribute('aria-hidden','true');host.append?.(relay);}
    host._releaseAim=()=>{host._meterPointer=null;host._locked=false;host._pullStart=null;host._power=0;host._update?.();host._paint?.(host._current.cells);};
    host.querySelector('.pool-unlock').onclick=host._releaseAim;
    host._strike=(power)=>{if(!host._ready()||host._striking)return;const b=host.querySelector('.pool-shoot');host._power=power;host._locked=true;host._striking=true;host._update();const start=performance.now(),token=host._animationToken;const strike=now=>{if(token!==host._animationToken||!host.isConnected){host._striking=false;return;}const t=Math.max(0,(now-start)/150);host._paint(host._current.cells,Math.max(0,(1-t)*power*.8));if(t<1&&!reduced())requestAnimationFrame(strike);else{host._striking=false;host._cueDispatched=true;host._update();b.dataset.position=encodePoolShot(power,host._angle,host._spin);poolImpact('cue',power/100);b.click();host._cueDispatched=false;host._locked=false;host._power=0;host._spin=0;host._update();}};requestAnimationFrame(strike);};
    host.addEventListener('click',event=>{const b=event.target.closest?.('.pool-shoot');if(!b||host._cueDispatched)return;event.stopImmediatePropagation();if(!b.disabled)host._strike(Number(host.querySelector('input').value));},true);
    const spot=host.querySelector('.pool-spot');spot.onpointerdown=e=>{if(!host._ready())return;const r=spot.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*2-1,y=(e.clientY-r.top)/r.height*2-1;if(Math.hypot(x,y)>.88)return;host._spin=spotCode(x,y);host._update();};spot.onkeydown=e=>{const map={ArrowUp:1,ArrowRight:3,ArrowDown:5,ArrowLeft:7,'0':0};if(host._ready()&&e.key in map){e.preventDefault();host._spin=map[e.key];host._update();}};
  }
  if(host._animating&&s.moves!==host._lastMove){host._queued={s,can,options};return;}
  host._current=s;host._can=can;
  // Ball in hand: the authoritative spot lives in the state, but while the
  // player drags we paint a local spot so the ball, guide line and cue all
  // move together before the place command is committed.
  host._inHand=poolCueInHand(s);
  if(!host._inHand){host._cuePlace=null;host._placing=null;host._placeMove=null;}
  else if(!host._cuePlace||host._placeMove!==s.moves){
    host._cuePlace={x:s.cells[0],y:s.cells[1]};host._placeMove=s.moves;host._placing=null;
  }
  const aimCellsFor=cells=>{
    // During a replay `cells` is a historical frame: pinning the cue ball to
    // the respot would freeze it in place while the other balls are still
    // rolling. The local drag spot only applies once the replay is over and
    // it is actually this player's turn to place the ball.
    if(!host._inHand||!host._cuePlace||!host._can||host._animating||host._striking)return cells;
    const a=cells.slice();a[0]=host._cuePlace.x;a[1]=host._cuePlace.y;return a;
  };
  const canvas=host.querySelector('.pool-table-canvas'),ctx=canvas.getContext('2d');
  const note=host.querySelector('.pool-note');let lastNote='';
  // The "ball in hand" hint and the glove must appear together, and only after
  // the shot has finished rolling and the turn has passed to this player.
  // Writing the hint at the top of renderPool() used to expose both while the
  // opponent's replay was still on screen.
  const updateNote=()=>{
    const current=host._current;
    const text=host._animating?'球正在滚动…'
      :host._striking?'正在出杆…'
      :host._opponentCue?'对手正在出杆…'
      :host._inHand
        ?(current.fen||'白球落袋')+(host._can&&!current.over
          ?' · 拖动白手套摆放白球，可反复调整':' · 等待对手摆球')
        :(current.fen||'移动瞄准 · 按住左键后拉蓄力 · 松开击球 · 右键取消');
    if(lastNote!==text){note.textContent=text;lastNote=text;}
  };
  
  host.querySelector('.pool-sound').textContent=poolMuted()?'静音':'声音';
  host._ready=()=>host._can&&!host._animating&&!host._striking&&!host._opponentCue&&Date.now()+(host._serverOffset||0)>=(host._openingUntil||0)&&!host._current.over;
  const update=()=>{const input=host.querySelector('input'),button=host.querySelector('.pool-shoot'),power=host._locked?host._power:Number(input.value);host.querySelector('.pool-controls output').textContent=power+'%';button.dataset.position=encodePoolShot(Math.max(1,power),host._angle,host._spin);button.disabled=!host._ready();input.disabled=button.disabled;button.textContent=host._animating?'球正在滚动…':host._striking?'正在出杆…':'击球';
    const meter=host.querySelector('.pool-power-meter');meter.setAttribute('aria-valuenow',String(host._power));meter.style.setProperty('--pull',host._power+'%');meter.style.setProperty('--cue-pull',(host._power*.98)+'%');host.querySelector('.pool-power-value').textContent=host._power+'%';
    const spot=host.querySelector('.pool-spot'),c=spot.getContext('2d');c.clearRect(0,0,160,160);const g=c.createRadialGradient(55,45,1,80,80,68);g.addColorStop(0,'#fff');g.addColorStop(.7,'#f2f2ee');g.addColorStop(1,'#999da5');circle(c,80,80,65,g);const theta=(host._spin-1)*Math.PI/4;circle(c,80+(host._spin?Math.sin(theta)*40:0),80-(host._spin?Math.cos(theta)*40:0),6,'#df5048');updateNote();};host._update=update;
  const paint=(c,pull=0,now=performance.now())=>{
    /* Read the published themes ONCE per frame. A theme change also rebuilds
       the cached table canvas; without a theme every painter keeps its old
       artwork (skin === null). */
    const bSkin=ballSkin(),tSkin=tableSkin(),myCue=cueSkin(true);
    const tableKey=tSkin?tSkin.theme:'original';
    const returnBall=(cc,id,x,y,r,angle,heading,orientation)=>
      drawPoolBall(cc,id,x,y,r,angle,heading,orientation,null,{skin:bSkin});
    const aim=aimCellsFor(c);const radius=Math.max(1,R-2*W/(canvas.clientWidth||W));
    ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
    /* A REAL theme change rebuilds the cache in BOTH directions, including
       back to the free 默认 baseline (skin === null). An unset key belongs to
       a Node / VM stub with a pre-built canvas and is deliberately left
       alone so no extra document access happens there. */
    if(!host._table||(host._tableKey!==undefined&&host._tableKey!==tableKey)){
      host._table=document.createElement('canvas');host._table.width=W*2;host._table.height=H*2;
      const tableContext=host._table.getContext('2d');tableContext.scale(2,2);
      makeTable(tableContext,{skin:tSkin});host._tableKey=tableKey;
    }
    ctx.clearRect(0,0,W,H);drawReturnChannel(ctx,host._returns||[],now,'under',radius,returnBall);
    ctx.drawImage(host._table,0,0,W,H);ctx.save();ctx.translate(PAD,PAD);
    if(host._ready()&&(c[49+s.turn]||isNineBall(s.game))){
      host._targetRingStart??=now;
      const phase=targetRingPhase(host._targetRingStart,now);
      if(phase<TARGET_RING_PULSE_MS){
        const fade=reduced()?1:Math.sin(Math.PI*phase/TARGET_RING_PULSE_MS)**2;
        if(fade>0)drawTargetRings(ctx,c,targetsFor(c,s.turn,s.game),radius,TARGET_RING_OPACITY*fade);
      }
    }else host._targetRingStart=null;
    if(host._opponentCue&&c[2]){const opponent=host._opponentCue;if(opponent.guide)guide(ctx,aim,opponent.angle,radius,now);cue(ctx,aim,opponent.angle,opponent.pull,null);}
    else if(host._can&&!s.over&&!host._animating){guide(ctx,aim,host._angle,radius,now);cue(ctx,aim,host._angle,pull||host._power*.8,myCue);}
    host._orientation??=Array.from({length:16},sphereIdentity);const prev=host._painted;host._returns??=[];
    // The snapshot-driven path has no replay frames, so it must still carry
    // the stroke power or those pots would silently use the old quiet drop.
    const strokePower=Number.isFinite(s.shotCommand)?Math.floor((s.shotCommand%363600)/3600):undefined;
    host._returns=host._returns.filter(e=>!e.scratch||now<returnTiming(e).completeAt);
    if(s.game==='nineball')host._returns=host._returns.filter(e=>e.scratch||e.id<=9);
    if(prev?.[2]&&!c[2]&&!reduced()&&!host._returns.some(e=>e.scratch))host._returns.push({id:0,scratch:true,shotPower:strokePower,orientation:host._orientation?.[0]?.slice(),x:c[0]/10+PAD,y:c[1]/10+PAD,start:now});
    const returnLimit=s.game==='nineball'?10:16;
    for(let id=1;id<returnLimit;id++){if(c[id*3+2])host._returns=host._returns.filter(e=>e.id!==id);else if(!host._returns.some(e=>e.id===id))host._returns.push({id,shotPower:strokePower,orientation:host._orientation?.[id]?.slice(),x:c[id*3]/10+PAD,y:c[id*3+1]/10+PAD,start:prev?.[id*3+2]&&!reduced()?now:now-10000});}
    host._scratchVisible=host._returns.some(e=>e.scratch&&now<returnTiming(e).completeAt);
    // The glove is an interaction affordance, not part of the board state:
    // never offer the ball while a replay, a strike, the opponent's cue or a
    // pocket-return animation is still running, and only on this player's turn.
    // It goes directly AFTER the cue ball: the fingertips overlap it like the
    // reference hand setting the ball down, while every other ball stays on
    // top of the hand.
    const gloveVisible=host._inHand&&host._can&&!host._animating&&!host._striking&&!host._opponentCue
      &&!host._current.over&&host._cuePlace&&c[2]&&!host._scratchVisible;
    const gloveAlpha=host._placing?GLOVE_DRAG_ALPHA:GLOVE_IDLE_ALPHA;
    for(let i=0;i<16;i++)if(c[i*3+2]&&!(i===0&&host._scratchVisible)){if(prev?.[i*3+2]){const dx=(c[i*3]-prev[i*3])/10,dy=(c[i*3+1]-prev[i*3+1])/10,d=Math.hypot(dx,dy);if(d<100){host._orientation[i]=rollSphere(host._orientation[i],dx,dy);host._roll[i]=(host._roll[i]||0)+d;if(d>.02)host._heading[i]=Math.atan2(dy,dx);}}ball(ctx,i,aim[i*3]/10,aim[i*3+1]/10,host._roll[i],host._heading[i],1,host._orientation[i],radius,bSkin);
      if(i===0&&gloveVisible)drawGlovedHand(ctx,host._cuePlace.x/10,host._cuePlace.y/10,gloveAlpha);}
    host._painted=c.slice();ctx.restore();drawReturnChannel(ctx,host._returns,now,'pockets',radius,returnBall);
    let returnSoundLevel=0,returnSoundGain=1;
    for(const item of host._returns){const timing=returnTiming(item),age=now-item.start;if(age<0||now>timing.completeAt+100||reduced())continue;
      const body=Math.min(1,Math.max(0,item.strength??.15));
      const motion=pocketMotion(item),stages=pocketSoundStages(motion,body);if(!item.scratch)stages.push([timing.impactAt-item.start,'stop',timing.slot===0?'wood-drop':'ball',Math.min(1,RETURN_SPEED/2.5)]);
      item.soundStages??=new Set();
      // One voice per visual wall contact. A dropped frame can make several
      // stages due at once; keep their exact spacing by scheduling each at
      // its own offset instead of firing them all on the same audio tick.
      const due=[];
      for(const [at,key,kind,volume,echo] of stages)
        if(age>=at&&age-at<100&&!item.soundStages.has(key)){item.soundStages.add(key);due.push({at,kind,volume,echo});}
      if(due.length){due.sort((a,b)=>a.at-b.at);const first=due[0].at;
        for(const s of due)poolImpact(s.kind,s.volume,0,1,(s.at-first)/1000,-1,s.echo??1);}
      if(age>=motion.dropAt&&(item.scratch?age<POCKET_DURATION:now<timing.impactAt)){
        const inVisibleChannel=!item.scratch&&now>=timing.exitAt;
        returnSoundLevel=Math.max(returnSoundLevel,RETURN_SPEED/2.5*1.5*(inVisibleChannel?1:.45));
        if(inVisibleChannel)returnSoundGain=2;
      }
    }
    if(returnSoundLevel>0&&now-(host._lastRollSound||0)>90){host._lastRollSound=now;poolImpact('wood-roll',returnSoundLevel,0,returnSoundGain);}
  };host._paint=paint;
  const resetTargetRingIdle=()=>{
    if(!host._ready()||!host._current.cells[49+host._current.turn])return;
    const now=performance.now();
    const wasVisible=host._targetRingStart!=null&&now-host._targetRingStart>=TARGET_RING_IDLE_MS;
    host._targetRingStart=now;
    if(wasVisible)host._paint(host._current.cells,0,now);
  };
  host.onpointermove=host.onpointerdown=host.onpointerup=host.oninput=resetTargetRingIdle;
  if(host.ownerDocument&&!host._guideFrame&&can&&!s.over){
    let lastPaint=0;
    const tick=now=>{
      host._guideFrame=0;
      if(!host.isConnected||host.ownerDocument.body.dataset.screen!=='play'||!host._can||host._current.over)return;
      const ringStart=host._targetRingStart;
      const ringDue=host._ready()&&host._current.cells[49+host._current.turn]&&
        (ringStart==null||(targetRingPhase(ringStart,now)<TARGET_RING_PULSE_MS)!==
          (targetRingPhase(ringStart,lastPaint)<TARGET_RING_PULSE_MS));
      if(!host._animating&&!host._striking&&!host._opponentCue&&now-lastPaint>=32&&(!reduced()||ringDue)){
        lastPaint=now;
        host._paint(host._current.cells,0,now);
      }
      host._guideFrame=requestAnimationFrame(tick);
    };
    host._guideFrame=requestAnimationFrame(tick);
  }
  const canvasPoint=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*W-PAD,y:(e.clientY-r.top)/r.height*H-PAD};};
  const commitCuePlace=()=>{
    const q=host._cuePlace,current=host._current.cells;
    if(!q||(q.x===current[0]&&q.y===current[1]))return;
    const relay=host.querySelector('.pool-place');
    if(!relay)return;
    relay.dataset.position=String(encodePoolPlace(q.x,q.y));
    relay.click();
  };
  canvas.onpointerdown=e=>{
    // A press on the offered cue ball starts a placement drag instead of aim.
    if(host._inHand&&host._can&&e.button===0&&!host._animating&&!host._striking&&host._cuePlace){
      const p=canvasPoint(e),q=host._cuePlace;
      if(Math.hypot(p.x-q.x/10,p.y-q.y/10)<=30){
        e.preventDefault();unlockPoolAudio();
        host._placing={pointer:e.pointerId,dx:q.x/10-p.x,dy:q.y/10-p.y};if(canvas.style)canvas.style.cursor='none';
        canvas.setPointerCapture?.(e.pointerId);
        paint(host._current.cells);return;
      }
    }
    if(e.button!==0||!host._ready())return;e.preventDefault();unlockPoolAudio();if(!host._locked)host._angle=poolAim(e.clientX,e.clientY,canvas.getBoundingClientRect(),aimCellsFor(host._current.cells));host._locked=true;host._pullStart={x:e.clientX,y:e.clientY};host._power=0;canvas.setPointerCapture?.(e.pointerId);paint(host._current.cells);update();
  };
  canvas.onpointermove=e=>{
    if(host._placing){
      const p=canvasPoint(e),next=clampCueSpot(host._current.cells,(p.x+host._placing.dx)*10,(p.y+host._placing.dy)*10,host._cuePlace);
      if(next)host._cuePlace=next;
      paint(host._current.cells);return;
    }
    if(!host._ready())return;if(host._locked){if(!host._pullStart)return;host._power=pullPower(host._pullStart,{x:e.clientX,y:e.clientY},host._angle,W/canvas.getBoundingClientRect().width);}else host._angle=poolAim(e.clientX,e.clientY,canvas.getBoundingClientRect(),aimCellsFor(host._current.cells));paint(host._current.cells);update();
  };
  canvas.onpointerup=e=>{
    if(host._placing){host._placing=null;try{canvas.releasePointerCapture?.(e.pointerId);}catch{}if(canvas.style)canvas.style.cursor='';paint(host._current.cells);commitCuePlace();return;}
    if(!host._locked||!host._pullStart)return;host._pullStart=null;try{canvas.releasePointerCapture?.(e.pointerId);}catch{}if(host._power>=3)host._strike(host._power);else{host._locked=false;host._power=0;update();paint(host._current.cells);}
  };
  canvas.onpointercancel=e=>{if(host._placing){host._placing=null;if(canvas.style)canvas.style.cursor='';paint(host._current.cells);return;}host._releaseAim();};
  canvas.oncontextmenu=e=>{e.preventDefault();host._releaseAim();};
  const meter=host.querySelector('.pool-power-meter');
  const meterUpdate=e=>{const r=meter.getBoundingClientRect();host._power=meterPower(e.clientY,r.top+10,r.height-20);update();paint(host._current.cells);};
  meter.onpointerdown=e=>{if(e.button!==0||!host._ready())return;e.preventDefault();host._locked=true;host._meterPointer=e.pointerId;meter.setPointerCapture?.(e.pointerId);meterUpdate(e);};
  meter.onpointermove=e=>{if(host._meterPointer===e.pointerId&&host._ready())meterUpdate(e);};
  meter.onpointerup=e=>{if(host._meterPointer!==e.pointerId)return;host._meterPointer=null;meter.releasePointerCapture?.(e.pointerId);if(host._power>=3)host._strike(host._power);else host._releaseAim();};
  meter.onpointercancel=()=>{host._meterPointer=null;host._releaseAim();};
  meter.oncontextmenu=e=>{e.preventDefault();host._meterPointer=null;host._releaseAim();};
  host.onkeydown=e=>{if(e.key==='Escape')host._releaseAim();resetTargetRingIdle();};
  host.querySelector('input').oninput=()=>{update();if(!host._animating)paint(host._current.cells);};
  if(host._aimMove!==s.moves||!can||s.over){host._locked=false;host._pullStart=null;host._power=0;host._aimMove=s.moves;}
  const countdown=host.querySelector('.pool-countdown');
  updatePoolCountdown(host,countdown,host._openingUntil||0,host._serverOffset||0,update);
  const previous=host._snapshot,previousTurn=host._snapshotTurn,previousMove=host._snapshotMove;host._snapshot=s.cells.slice();host._snapshotTurn=s.turn;host._snapshotMove=s.moves;
  if(s.moves&&host._lastMove!==s.moves&&s.history?.length&&previous&&!reduced()) {
    host._lastMove=s.moves;host._animating=true;host._replayTurn=previousTurn;
    const frames=[previous.slice(0,48),...s.history.map(h=>h.split(',').map(Number))];
    const opponent=options.opponentSeat===previousTurn&&s.moves===previousMove+1?replayOpponentShot(frames,s.shotCommand):null;
    const preparation=opponent?REPLAY_CUE_DURATION:0,start=performance.now()+preparation,token=host._animationToken=(host._animationToken||0)+1;
    const shot=s.moves===previousMove+1?opponentShot(s.shotCommand):null;
    const spin=shot?Math.floor(s.shotCommand/SPIN_STRIDE):0;
    // Carry the actual stroke power to the pocket animation: a ball that
    // loses speed on a long roll still belongs to a full-power shot.
    const shotPower=Number.isFinite(s.shotCommand)?Math.floor((s.shotCommand%363600)/3600):undefined;
    // Online pool states carry no audioEvents; locally resolved shots do. Only
    // skip frame reconstruction when real non-pocket events are actually there,
    // so an empty event list can never silence the whole shot.
    const hasServerImpacts=Array.isArray(s.audioEvents)&&s.audioEvents.some(e=>e.kind!=='pocket');
    const tipAngle=(spin-1)*Math.PI/4,aimAngle=(shot?.angle??0)*Math.PI/1800;
    const spinAxis=[-Math.sin(aimAngle)*Math.cos(tipAngle),Math.cos(aimAngle)*Math.cos(tipAngle),Math.sin(tipAngle)];
    const spinDuration=spin?450+shot.power*14:0;
    let spinAngle=0,scratched=false;
    let cueSound=false;
    let lastIndex=0,eventIndex=0;const soundPairs=new Map();
    const frame=now=>{if(token!==host._animationToken||!host.isConnected)return;
      if(opponent&&now<start){host._opponentCue=opponentCuePose(opponent,now-start+preparation,preparation);paint(frames[0],0,now);requestAnimationFrame(frame);return;}
      if(opponent&&!cueSound){cueSound=true;host._opponentCue=null;poolImpact('cue',opponent.power/100);}
      const elapsed=Math.max(0,now-start),p=Math.min(frames.length-1,elapsed/16),i=Math.floor(p);
      const due=[];
      while(s.audioEvents&&eventIndex<s.audioEvents.length&&s.audioEvents[eventIndex].time<=elapsed){const e=s.audioEvents[eventIndex++];if(e.kind!=='pocket')due.push(e);}
      if(due.length===1)poolImpact(due[0].kind,due[0].strength);
      else if(due.length>1)poolImpactBurst(due);
      if(i>lastIndex){for(let k=lastIndex+1;k<=i;k++){
        // Inspect every replay transition, even if a display frame spans capture and respot.
        host._returns??=[];for(let id=0;id<16;id++)if(frames[k-1][id*3+2]&&!frames[k][id*3+2]&&!host._returns.some(e=>e.id===id)){
          if(id===0)scratched=true;
          const last=frames[k-1],prior=frames[Math.max(0,k-2)],captured=frames[k];
          const speed=Math.max(Math.hypot(last[id*3]-prior[id*3],last[id*3+1]-prior[id*3+1]),Math.hypot(captured[id*3]-last[id*3],captured[id*3+1]-last[id*3+1]))/400;
          const capture=s.audioEvents?.find(e=>e.kind==='pocket'&&e.id===id),strength=capture?.strength??Math.min(1,speed);
          const vx=capture?.vx??(captured[id*3]-last[id*3])/20,vy=capture?.vy??(captured[id*3+1]-last[id*3+1])/20;
          host._returns.push({id,scratch:id===0,strength,vx,vy,shotPower,holeIndex:capture?.holeIndex,orientation:host._orientation?.[id]?.slice(),x:captured[id*3]/10+PAD,y:captured[id*3+1]/10+PAD,start:start+k*16});
        }
        const batch=[];
        for(const event of replayImpacts(frames[Math.max(0,k-2)],frames[k-1],frames[k])){
          if(hasServerImpacts||event.kind==='pocket')continue;
          if(k*16-(soundPairs.get(event.key)??-1000)<24)continue;
          soundPairs.set(event.key,k*16);batch.push(event);
        }
        if(batch.length===1)poolImpact(batch[0].kind,batch[0].strength,batch[0].tangent||0);
        else if(batch.length>1)poolImpactBurst(chainLevels(batch));
      }lastIndex=i;}
      // Integrate residual spin by time, even when the replay's ball center has stopped.
      if(spin&&!scratched){
        const progress=Math.min(1,elapsed/spinDuration);
        const angle=(shot.power/100)*spinDuration/125*(1-(1-progress)**3);
        host._orientation[0]=rotateSphere(host._orientation[0],...spinAxis,angle-spinAngle);
        spinAngle=angle;
      }
      paint(samplePoolFrame(frames,p),0,now);if(p<frames.length-1||spin&&!scratched&&elapsed<spinDuration||host._returns?.some(e=>now<returnTiming(e).completeAt))requestAnimationFrame(frame);else{host._animating=false;host._update();paint(s.cells,0,now);if(host._queued){const next=host._queued;host._queued=null;renderPool(host,next.s,next.can,next.options);}}};requestAnimationFrame(frame);
  } else if(!host._animating){host._lastMove=s.moves;paint(s.cells);}
  update();
}

