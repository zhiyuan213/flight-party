import {makeTable,TABLE_WIDTH,TABLE_HEIGHT,TABLE_PAD} from './pool-table.js';
import {drawReturnChannel,returnTiming,pocketMotion,POCKET_DURATION,RETURN_SPEED} from './pool-return.js?v=20261107-ball-radius';
import {pullPower,meterPower,spotCode,encodePoolShot,SPIN_STRIDE} from './pool-input.js?v=20261106-ui2';
import {updatePoolCountdown,cancelPoolCountdown} from './pool-countdown.js';
import {replayImpacts,poolImpact,pocketSoundStages, poolMuted, setPoolMuted, unlockPoolAudio} from './pool-audio.js?v=20261107-return-gain';
import {drawPoolBall,rollSphere,rotateSphere,sphereIdentity} from './pool-ball.js?v=20261107-cue-spin';
import {drawCue as cue} from './pool-cue.js';
import {opponentShot,replayOpponentShot,opponentCuePose,REPLAY_CUE_DURATION} from './pool-opponent-cue.js?v=20261107-power-50';
import {poolTargets} from './pool-rules.js?v=20261106-penalty';

const W = TABLE_WIDTH, H = TABLE_HEIGHT, PAD = TABLE_PAD, R = 16;
const TARGET_RING_IDLE_MS=10000, TARGET_RING_PERIOD_MS=5000, TARGET_RING_PULSE_MS=1200, TARGET_RING_OPACITY=.8;
function targetRingPhase(start,now){
  const elapsed=start==null?-1:now-start-TARGET_RING_IDLE_MS;
  return elapsed<0?Infinity:elapsed%TARGET_RING_PERIOD_MS;
}
const holes = [[0,0],[500,0],[1000,0],[0,500],[500,500],[1000,500]];
const colors = ['#f8faf6','#efc329','#2568d2','#c93639','#793caa','#e67920','#168669','#8d2d31','#141924'];
const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const circle = (c,x,y,r,fill) => { c.fillStyle=fill;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill(); };
const line = (c,x,y,xx,yy,color,width=1) => {c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();};

function drawTargetRings(ctx,cells,targets,radius,opacity){
  ctx.save();
  ctx.strokeStyle='rgba(255,255,255,'+opacity+')';
  ctx.lineWidth=1.8;
  for(const id of targets){
    ctx.beginPath();
    ctx.arc(cells[id*3]/10,cells[id*3+1]/10,radius+5,0,Math.PI*2);
    ctx.stroke();
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

function ball(ctx,id,x,y,roll=0,heading=0,alpha=1,orientation=null,radius=R) {ctx.save();ctx.globalAlpha=alpha;drawPoolBall(ctx,id,x,y,radius,roll/16,heading,orientation,{x:480,y:234});ctx.restore();}

function guide(ctx,c,angle,radius=R,now=0) {
  const x=c[0]/10,y=c[1]/10,nx=Math.cos(angle*Math.PI/1800),ny=Math.sin(angle*Math.PI/1800);let length=Infinity,target=-1;
  for(let i=1;i<16;i++)if(c[i*3+2]){const dx=c[i*3]/10-x,dy=c[i*3+1]/10-y,t=dx*nx+dy*ny,d2=dx*dx+dy*dy-t*t;if(t>0&&d2<32*32){const hit=t-Math.sqrt(32*32-d2);if(hit>=0&&hit<length){length=hit;target=i;}}}
  const wall=Math.min(nx>0?(984-x)/nx:nx<0?(16-x)/nx:Infinity,ny>0?(484-y)/ny:ny<0?(16-y)/ny:Infinity);length=Math.min(length,wall);
  ctx.save();ctx.setLineDash([5,8]);ctx.lineDashOffset=reduced()?0:-(now*.016)%13;
  line(ctx,x,y,x+nx*length,y+ny*length,'#e6faff9c',1.4);ctx.restore();
  ctx.strokeStyle='#effcffbb';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(x+nx*length,y+ny*length,radius,0,Math.PI*2);ctx.stroke();
  if(target>=0&&length<wall){const tx=c[target*3]/10,ty=c[target*3+1]/10,dx=tx-(x+nx*length),dy=ty-(y+ny*length),d=Math.hypot(dx,dy);line(ctx,tx,ty,tx+dx/d*72,ty+dy/d*72,'#fff5a780',1.6);}
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
    host._angle=0;host._power=0;host._spin=0;host._roll=Array(16).fill(0);host._heading=Array(16).fill(0);
    host.addEventListener('pointerdown',unlockPoolAudio);
    host.querySelector('.pool-sound').onclick=()=>{unlockPoolAudio();setPoolMuted(!poolMuted());host.querySelector('.pool-sound').textContent=poolMuted()?'静音':'声音';};
    host._releaseAim=()=>{host._meterPointer=null;host._locked=false;host._pullStart=null;host._power=0;host._update?.();host._paint?.(host._current.cells);};
    host.querySelector('.pool-unlock').onclick=host._releaseAim;
    host._strike=(power)=>{if(!host._ready()||host._striking)return;const b=host.querySelector('.pool-shoot');host._power=power;host._locked=true;host._striking=true;host._update();const start=performance.now(),token=host._animationToken;const strike=now=>{if(token!==host._animationToken||!host.isConnected){host._striking=false;return;}const t=Math.max(0,(now-start)/150);host._paint(host._current.cells,Math.max(0,(1-t)*power*.8));if(t<1&&!reduced())requestAnimationFrame(strike);else{host._striking=false;host._cueDispatched=true;host._update();b.dataset.position=encodePoolShot(power,host._angle,host._spin);poolImpact('cue',power/100);b.click();host._cueDispatched=false;host._locked=false;host._power=0;host._spin=0;host._update();}};requestAnimationFrame(strike);};
    host.addEventListener('click',event=>{const b=event.target.closest?.('.pool-shoot');if(!b||host._cueDispatched)return;event.stopImmediatePropagation();if(!b.disabled)host._strike(Number(host.querySelector('input').value));},true);
    const spot=host.querySelector('.pool-spot');spot.onpointerdown=e=>{if(!host._ready())return;const r=spot.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*2-1,y=(e.clientY-r.top)/r.height*2-1;if(Math.hypot(x,y)>.88)return;host._spin=spotCode(x,y);host._update();};spot.onkeydown=e=>{const map={ArrowUp:1,ArrowRight:3,ArrowDown:5,ArrowLeft:7,'0':0};if(host._ready()&&e.key in map){e.preventDefault();host._spin=map[e.key];host._update();}};
  }
  if(host._animating&&s.moves!==host._lastMove){host._queued={s,can,options};return;}
  host._current=s;host._can=can;
  const canvas=host.querySelector('.pool-table-canvas'),ctx=canvas.getContext('2d');
  host.querySelector('.pool-note').textContent=s.fen||'移动瞄准 · 按住左键后拉蓄力 · 松开击球 · 右键取消';
  
  host.querySelector('.pool-sound').textContent=poolMuted()?'静音':'声音';
  host._ready=()=>host._can&&!host._animating&&!host._striking&&!host._opponentCue&&Date.now()+(host._serverOffset||0)>=(host._openingUntil||0)&&!host._current.over;
  const update=()=>{const input=host.querySelector('input'),button=host.querySelector('.pool-shoot'),power=host._locked?host._power:Number(input.value);host.querySelector('.pool-controls output').textContent=power+'%';button.dataset.position=encodePoolShot(Math.max(1,power),host._angle,host._spin);button.disabled=!host._ready();input.disabled=button.disabled;button.textContent=host._animating?'球正在滚动…':host._striking?'正在出杆…':'击球';
    const meter=host.querySelector('.pool-power-meter');meter.setAttribute('aria-valuenow',String(host._power));meter.style.setProperty('--pull',host._power+'%');meter.style.setProperty('--cue-pull',(host._power*.98)+'%');host.querySelector('.pool-power-value').textContent=host._power+'%';
    const spot=host.querySelector('.pool-spot'),c=spot.getContext('2d');c.clearRect(0,0,160,160);const g=c.createRadialGradient(55,45,1,80,80,68);g.addColorStop(0,'#fff');g.addColorStop(.7,'#f2f2ee');g.addColorStop(1,'#999da5');circle(c,80,80,65,g);const theta=(host._spin-1)*Math.PI/4;circle(c,80+(host._spin?Math.sin(theta)*40:0),80-(host._spin?Math.cos(theta)*40:0),6,'#df5048');};host._update=update;
  const paint=(c,pull=0,now=performance.now())=>{const radius=Math.max(1,R-2*W/(canvas.clientWidth||W));ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);if(!host._table){host._table=document.createElement('canvas');host._table.width=W*2;host._table.height=H*2;const tableContext=host._table.getContext('2d');tableContext.scale(2,2);makeTable(tableContext);}ctx.clearRect(0,0,W,H);drawReturnChannel(ctx,host._returns||[],now,'under',radius);ctx.drawImage(host._table,0,0,W,H);ctx.save();ctx.translate(PAD,PAD);
    if(host._ready()&&c[49+s.turn]){
      host._targetRingStart??=now;
      const phase=targetRingPhase(host._targetRingStart,now);
      if(phase<TARGET_RING_PULSE_MS){
        const fade=reduced()?1:Math.sin(Math.PI*phase/TARGET_RING_PULSE_MS)**2;
        if(fade>0)drawTargetRings(ctx,c,poolTargets(c,s.turn),radius,TARGET_RING_OPACITY*fade);
      }
    }else host._targetRingStart=null;
    if(host._opponentCue&&c[2]){const opponent=host._opponentCue;if(opponent.guide)guide(ctx,c,opponent.angle,radius,now);cue(ctx,c,opponent.angle,opponent.pull);}
    else if(host._can&&!s.over&&!host._animating){guide(ctx,c,host._angle,radius,now);cue(ctx,c,host._angle,pull||host._power*.8);}
    host._orientation??=Array.from({length:16},sphereIdentity);const prev=host._painted;host._returns??=[];
    host._returns=host._returns.filter(e=>!e.scratch||now<returnTiming(e).completeAt);
    if(prev?.[2]&&!c[2]&&!reduced()&&!host._returns.some(e=>e.scratch))host._returns.push({id:0,scratch:true,orientation:host._orientation?.[0]?.slice(),x:c[0]/10+PAD,y:c[1]/10+PAD,start:now});
    for(let id=1;id<16;id++){if(c[id*3+2])host._returns=host._returns.filter(e=>e.id!==id);else if(!host._returns.some(e=>e.id===id))host._returns.push({id,orientation:host._orientation?.[id]?.slice(),x:c[id*3]/10+PAD,y:c[id*3+1]/10+PAD,start:prev?.[id*3+2]&&!reduced()?now:now-10000});}
    host._scratchVisible=host._returns.some(e=>e.scratch&&now<returnTiming(e).completeAt);
    for(let i=0;i<16;i++)if(c[i*3+2]&&!(i===0&&host._scratchVisible)){if(prev?.[i*3+2]){const dx=(c[i*3]-prev[i*3])/10,dy=(c[i*3+1]-prev[i*3+1])/10,d=Math.hypot(dx,dy);if(d<100){host._orientation[i]=rollSphere(host._orientation[i],dx,dy);host._roll[i]=(host._roll[i]||0)+d;if(d>.02)host._heading[i]=Math.atan2(dy,dx);}}ball(ctx,i,c[i*3]/10,c[i*3+1]/10,host._roll[i],host._heading[i],1,host._orientation[i],radius);}host._painted=c.slice();ctx.restore();drawReturnChannel(ctx,host._returns,now,'pockets',radius);
    let returnSoundLevel=0,returnSoundGain=1;
    for(const item of host._returns){const timing=returnTiming(item),age=now-item.start;if(age<0||now>timing.completeAt+100||reduced())continue;
      const body=Math.min(1,Math.max(0,item.strength??.15));
      const motion=pocketMotion(item),stages=pocketSoundStages(motion,body);if(!item.scratch)stages.push([timing.impactAt-item.start,'stop',timing.slot===0?'wood-drop':'ball',Math.min(1,RETURN_SPEED/2.5)]);
      item.soundStages??=new Set();for(const [at,key,kind,volume] of stages)if(age>=at&&!item.soundStages.has(key)){item.soundStages.add(key);if(age-at<100)poolImpact(kind,volume);}
      if(age>=motion.dropAt&&(item.scratch?age<POCKET_DURATION:now<timing.impactAt)){
        const inVisibleChannel=!item.scratch&&now>=timing.exitAt;
        returnSoundLevel=Math.max(returnSoundLevel,RETURN_SPEED/2.5*(inVisibleChannel?1:.45));
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
  canvas.onpointerdown=e=>{if(e.button!==0||!host._ready())return;e.preventDefault();unlockPoolAudio();if(!host._locked)host._angle=poolAim(e.clientX,e.clientY,canvas.getBoundingClientRect(),host._current.cells);host._locked=true;host._pullStart={x:e.clientX,y:e.clientY};host._power=0;canvas.setPointerCapture?.(e.pointerId);paint(host._current.cells);update();};
  canvas.onpointermove=e=>{if(!host._ready())return;if(host._locked){if(!host._pullStart)return;host._power=pullPower(host._pullStart,{x:e.clientX,y:e.clientY},host._angle,W/canvas.getBoundingClientRect().width);}else host._angle=poolAim(e.clientX,e.clientY,canvas.getBoundingClientRect(),host._current.cells);paint(host._current.cells);update();};
  canvas.onpointerup=e=>{if(!host._locked||!host._pullStart)return;host._pullStart=null;try{canvas.releasePointerCapture?.(e.pointerId);}catch{}if(host._power>=3)host._strike(host._power);else{host._locked=false;host._power=0;update();paint(host._current.cells);}};
  canvas.onpointercancel=host._releaseAim;canvas.oncontextmenu=e=>{e.preventDefault();host._releaseAim();};
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
      while(s.audioEvents&&eventIndex<s.audioEvents.length&&s.audioEvents[eventIndex].time<=elapsed){const e=s.audioEvents[eventIndex++];if(e.kind!=='pocket')poolImpact(e.kind,e.strength);}
      if(i>lastIndex){for(let k=lastIndex+1;k<=i;k++){
        // Inspect every replay transition, even if a display frame spans capture and respot.
        host._returns??=[];for(let id=0;id<16;id++)if(frames[k-1][id*3+2]&&!frames[k][id*3+2]&&!host._returns.some(e=>e.id===id)){
          if(id===0)scratched=true;
          const last=frames[k-1],prior=frames[Math.max(0,k-2)],captured=frames[k];
          const speed=Math.max(Math.hypot(last[id*3]-prior[id*3],last[id*3+1]-prior[id*3+1]),Math.hypot(captured[id*3]-last[id*3],captured[id*3+1]-last[id*3+1]))/400;
          const capture=s.audioEvents?.find(e=>e.kind==='pocket'&&e.id===id),strength=capture?.strength??Math.min(1,speed);
          const vx=capture?.vx??(captured[id*3]-last[id*3])/20,vy=capture?.vy??(captured[id*3+1]-last[id*3+1])/20;
          host._returns.push({id,scratch:id===0,strength,vx,vy,holeIndex:capture?.holeIndex,orientation:host._orientation?.[id]?.slice(),x:captured[id*3]/10+PAD,y:captured[id*3+1]/10+PAD,start:start+k*16});
        }
        for(const event of replayImpacts(frames[Math.max(0,k-2)],frames[k-1],frames[k])){
          if(s.audioEvents||event.kind==='pocket')continue;
          if(k*16-(soundPairs.get(event.key)??-1000)<55)continue;
          soundPairs.set(event.key,k*16);poolImpact(event.kind,event.strength,event.tangent||0);
        }
      }lastIndex=i;}      if(i>0&&now-(host._lastClothSound||0)>100){const a=frames[i-1],b=frames[i];let speed=0;for(let j=0;j<16;j++)if(a[j*3+2]&&b[j*3+2])speed=Math.max(speed,Math.hypot(b[j*3]-a[j*3],b[j*3+1]-a[j*3+1])/10);if(speed>3){host._lastClothSound=now;poolImpact('roll',Math.min(.24,speed/150));}}
      // Integrate residual spin by time, even when the replay's ball center has stopped.
      if(spin&&!scratched){
        const progress=Math.min(1,elapsed/spinDuration);
        const angle=(shot.power/100)*spinDuration/125*(1-(1-progress)**3);
        host._orientation[0]=rotateSphere(host._orientation[0],...spinAxis,angle-spinAngle);
        spinAngle=angle;
      }
      paint(samplePoolFrame(frames,p),0,now);if(p<frames.length-1||spin&&!scratched&&elapsed<spinDuration||host._returns?.some(e=>now<returnTiming(e).completeAt))requestAnimationFrame(frame);else{host._animating=false;paint(s.cells,0,now);host._update();if(host._queued){const next=host._queued;host._queued=null;renderPool(host,next.s,next.can,next.options);}}};requestAnimationFrame(frame);
  } else if(!host._animating){host._lastMove=s.moves;paint(s.cells);}
  update();
}
