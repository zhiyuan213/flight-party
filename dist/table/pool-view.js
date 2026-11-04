import {pullPower,spotCode,encodePoolShot,openingSeconds} from './pool-input.js?v=20261105-mouse1';
import {poolImpact, poolMuted, setPoolMuted, unlockPoolAudio} from './pool-audio.js?v=20261105-mouse1';

const W = 1112, H = 612, PAD = 56, R = 12;
const holes = [[0,0],[500,0],[1000,0],[0,500],[500,500],[1000,500]];
const colors = ['#f8faf6','#efc329','#2568d2','#c93639','#793caa','#e67920','#168669','#8d2d31','#141924'];
const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const circle = (c,x,y,r,fill) => { c.fillStyle=fill;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill(); };
const line = (c,x,y,xx,yy,color,width=1) => {c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();};

// Preserve server positions and disappearance timing; interpolate only visible coordinates.
export function samplePoolFrame(frames, progress) {
  const position=Math.max(0,Math.min(frames.length-1,progress));
  const a=frames[Math.floor(position)],b=frames[Math.min(frames.length-1,Math.floor(position)+1)],f=position%1;
  return a.map((v,i)=>i%3===2 ? v : a[i-i%3+2]&&b[i-i%3+2] ? v+(b[i]-v)*f : v);
}
export function poolAim(clientX,clientY,rect,cells) {
  const x=(clientX-rect.left)/rect.width*W-PAD, y=(clientY-rect.top)/rect.height*H-PAD;
  return (Math.round(Math.atan2(y-cells[1]/10,x-cells[0]/10)*1800/Math.PI)+3600)%3600;
}

function makeTable(ctx) {
  ctx.clearRect(0,0,W,H);
  const wood=ctx.createLinearGradient(0,0,0,H);wood.addColorStop(0,'#75503a');wood.addColorStop(.05,'#c18b55');wood.addColorStop(.11,'#402c25');wood.addColorStop(.9,'#4f3227');wood.addColorStop(1,'#ab7345');
  ctx.fillStyle=wood;ctx.beginPath();ctx.roundRect(3,3,W-6,H-6,38);ctx.fill();
  for(let i=0;i<8;i++) {ctx.strokeStyle=i%2?'#e6b77a12':'#170e0d28';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(8+i*3,8+i*3,W-16-i*6,H-16-i*6,34-i);ctx.stroke();}
  ctx.fillStyle='#071f2c';ctx.fillRect(PAD-18,PAD-18,1036,536);
  ctx.save();ctx.translate(PAD,PAD);
  const felt=ctx.createRadialGradient(460,190,35,500,250,690);felt.addColorStop(0,'#228abb');felt.addColorStop(.65,'#17658e');felt.addColorStop(1,'#0a3553');ctx.fillStyle=felt;ctx.fillRect(0,0,1000,500);
  // Deterministic fine weave, cached once rather than regenerated each animation frame.
  ctx.lineWidth=.45;for(let y=1;y<500;y+=3){line(ctx,0,y,1000,y-25,'#b5eaff0b',.45);}for(let x=1;x<1000;x+=4){line(ctx,x,0,x+35,500,'#001a3020',.45);}
  line(ctx,250,25,250,475,'#bbdce62b',1);
  circle(ctx,250,250,3,'#d4f3ff70');circle(ctx,750,250,3,'#d4f3ff70');
  ctx.textAlign='center';ctx.font='600 14px sans-serif';ctx.fillStyle='#c0edff19';ctx.fillText('J O Y F L O C K',500,265);
  const cushion=ctx.createLinearGradient(0,-18,0,18);cushion.addColorStop(0,'#338eb4');cushion.addColorStop(.55,'#177292');cushion.addColorStop(1,'#08415d');
  for(const [x,width] of [[28,437],[535,437]]){ctx.fillStyle=cushion;ctx.fillRect(x,-18,width,18);ctx.fillRect(x,500,width,18);line(ctx,x,1,x+width,1,'#8cd6e766',2);line(ctx,x,499,x+width,499,'#00263f88',3);}
  ctx.fillStyle='#176687';ctx.fillRect(-18,28,18,444);ctx.fillRect(1000,28,18,444);line(ctx,1,28,1,472,'#89c9df66',2);line(ctx,999,28,999,472,'#00223b88',3);
  for(const [x,y] of holes){const g=ctx.createRadialGradient(x-5,y-6,5,x,y,32);g.addColorStop(0,'#1c242b');g.addColorStop(.7,'#030b13');g.addColorStop(1,'#000');circle(ctx,x,y,31,'#b0a084');circle(ctx,x,y,27,g);ctx.strokeStyle='#e2d0ad77';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,30,Math.PI,Math.PI*2);ctx.stroke();}
  for(const x of [125,250,375,625,750,875])for(const y of [-36,536]){ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.fillStyle='#edddbb';ctx.fillRect(-2.4,-2.4,4.8,4.8);ctx.restore();}
  for(const x of [-36,1036])for(const y of [125,250,375])circle(ctx,x,y,2.6,'#edddbb');
  ctx.restore();
}

function ball(ctx,id,x,y,roll=0,heading=0,alpha=1) {
  ctx.save();ctx.translate(x,y);ctx.globalAlpha=alpha;
  ctx.save();ctx.scale(1,.62);circle(ctx,2,7,15,'#00101d65');ctx.restore();
  const g=ctx.createRadialGradient(-4,-5,1,2,3,15);g.addColorStop(0,id===0?'#fff':colors[id]);g.addColorStop(.5,colors[id]);g.addColorStop(1,id===0?'#9eafb2':'#090f1d');circle(ctx,0,0,R,g);
  ctx.save();ctx.beginPath();ctx.arc(0,0,R-.5,0,Math.PI*2);ctx.clip();ctx.rotate(heading);
  // The number patch and cue-ball red spots orbit with travelled distance, making roll legible.
  const phase=roll/R,offset=Math.sin(phase)*8,compression=Math.max(.25,Math.abs(Math.cos(phase)));
  ctx.translate(offset,0);ctx.scale(compression,1);ctx.rotate(-heading);
  if(id){circle(ctx,0,0,6.6,'#fff7e9');ctx.fillStyle='#101720';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(id),0,.5);}
  else{circle(ctx,0,0,1.8,'#d13d35');circle(ctx,-7,-5,1.1,'#d13d35');circle(ctx,5,7,1.1,'#d13d35');}
  ctx.restore();
  const shine=ctx.createRadialGradient(-4,-5,0,-4,-5,7);shine.addColorStop(0,'#ffffffcc');shine.addColorStop(1,'#ffffff00');circle(ctx,-4,-5,7,shine);
  ctx.strokeStyle='#ffffff44';ctx.lineWidth=.7;ctx.beginPath();ctx.arc(0,0,R-.5,Math.PI*1.05,Math.PI*1.65);ctx.stroke();ctx.restore();
}

function cue(ctx,c,angle,pull=0) {
  ctx.save();ctx.translate(c[0]/10,c[1]/10);ctx.rotate(angle*Math.PI/1800+Math.PI);ctx.translate(27+pull,0);
  const wood=ctx.createLinearGradient(0,-4,0,4);wood.addColorStop(0,'#fff2ba');wood.addColorStop(.3,'#dbab62');wood.addColorStop(1,'#805331');
  ctx.shadowColor='#00162655';ctx.shadowBlur=3;ctx.shadowOffsetY=4;ctx.fillStyle=wood;ctx.beginPath();ctx.moveTo(0,-2);ctx.lineTo(215,-4);ctx.lineTo(215,4);ctx.lineTo(0,2);ctx.closePath();ctx.fill();ctx.shadowColor='transparent';ctx.fillStyle='#e6e2cf';ctx.fillRect(0,-2,10,4);ctx.fillStyle='#7bc5e0';ctx.fillRect(-3,-2,3,4);ctx.fillStyle='#212333';ctx.fillRect(150,-3.5,48,7);ctx.fillStyle='#d9c4a0';ctx.fillRect(199,-4,3,8);ctx.restore();
}
function guide(ctx,c,angle) {
  const x=c[0]/10,y=c[1]/10,nx=Math.cos(angle*Math.PI/1800),ny=Math.sin(angle*Math.PI/1800);let length=Infinity,target=-1;
  for(let i=1;i<9;i++)if(c[i*3+2]){const dx=c[i*3]/10-x,dy=c[i*3+1]/10-y,t=dx*nx+dy*ny,d2=dx*dx+dy*dy-t*t;if(t>0&&d2<24*24){const hit=t-Math.sqrt(24*24-d2);if(hit>=0&&hit<length){length=hit;target=i;}}}
  const wall=Math.min(nx>0?(988-x)/nx:nx<0?(12-x)/nx:Infinity,ny>0?(488-y)/ny:ny<0?(12-y)/ny:Infinity);length=Math.min(length,wall);
  ctx.setLineDash([5,8]);line(ctx,x,y,x+nx*length,y+ny*length,'#e6faff9c',1.4);ctx.setLineDash([]);
  ctx.strokeStyle='#effcffbb';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(x+nx*length,y+ny*length,R,0,Math.PI*2);ctx.stroke();
  if(target>=0&&length<wall){const tx=c[target*3]/10,ty=c[target*3+1]/10,dx=tx-(x+nx*length),dy=ty-(y+ny*length),d=Math.hypot(dx,dy);line(ctx,tx,ty,tx+dx/d*72,ty+dy/d*72,'#fff5a780',1.6);}
}

export function renderPool(host,s,can) {
  if(!host.querySelector('.pool-table-canvas')) {
    host.innerHTML='<div class="pool-left-controls"><button class="pool-sound" type="button" aria-label="切换台球音效"></button><div class="pool-hit"><canvas class="pool-spot" width="160" height="160" role="button" tabindex="0" aria-label="选择白球击球点"></canvas><button type="button" class="pool-spot-reset">中心击球</button></div><div class="pool-power-meter" role="meter" aria-label="击球力度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="power-cue"></div><div class="power-fill"></div></div><output class="pool-power-value">0%</output></div><div class="pool-table-wrap"><canvas class="pool-table-canvas" width="1668" height="918" aria-label="台球桌，移动鼠标瞄准，按住左键后拉蓄力，松开击球"></canvas><div class="pool-countdown" hidden aria-live="polite"><b>3</b><span>准备开球</span></div></div><div class="pool-controls"><label>击球力度 <output>65%</output><input type="range" min="1" max="100" value="65" aria-label="击球力度"></label><button class="pool-shoot" data-position="234000">击球</button><button class="pool-unlock" type="button">重新瞄准</button></div><p class="pool-note"></p>';
    host._angle=0;host._power=0;host._spin=0;host._roll=Array(9).fill(0);host._heading=Array(9).fill(0);
    host.addEventListener('pointerdown',unlockPoolAudio);
    host.querySelector('.pool-sound').onclick=()=>{unlockPoolAudio();setPoolMuted(!poolMuted());host.querySelector('.pool-sound').textContent=poolMuted()?'静音':'声音';};
    host._releaseAim=()=>{host._locked=false;host._pullStart=null;host._power=0;host._update?.();host._paint?.(host._current.cells);};
    host.querySelector('.pool-unlock').onclick=host._releaseAim;
    host._strike=(power)=>{if(!host._ready()||host._striking)return;const b=host.querySelector('.pool-shoot');host._power=power;host._locked=true;host._striking=true;host._update();const start=performance.now(),token=host._animationToken;const strike=now=>{if(token!==host._animationToken||!host.isConnected){host._striking=false;return;}const t=Math.max(0,(now-start)/150);host._paint(host._current.cells,Math.max(0,(1-t)*power*.8));if(t<1&&!reduced())requestAnimationFrame(strike);else{host._striking=false;host._cueDispatched=true;host._update();b.dataset.position=encodePoolShot(power,host._angle,host._spin);poolImpact('cue',power/100);b.click();host._cueDispatched=false;host._locked=false;host._power=0;}};requestAnimationFrame(strike);};
    host.addEventListener('click',event=>{const b=event.target.closest?.('.pool-shoot');if(!b||host._cueDispatched)return;event.stopImmediatePropagation();if(!b.disabled)host._strike(Number(host.querySelector('input').value));},true);
    const spot=host.querySelector('.pool-spot');spot.onpointerdown=e=>{const r=spot.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*2-1,y=(e.clientY-r.top)/r.height*2-1;if(Math.hypot(x,y)>.88)return;host._spin=spotCode(x,y);host._update();};spot.onkeydown=e=>{const map={ArrowUp:1,ArrowRight:3,ArrowDown:5,ArrowLeft:7,'0':0};if(e.key in map){e.preventDefault();host._spin=map[e.key];host._update();}};host.querySelector('.pool-spot-reset').onclick=()=>{host._spin=0;host._update();};
  }
  if(host._animating&&s.moves!==host._lastMove){host._queued={s,can};return;}
  host._current=s;host._can=can;
  const canvas=host.querySelector('.pool-table-canvas'),ctx=canvas.getContext('2d');
  host.querySelector('.pool-note').textContent=s.fen||'移动瞄准 · 按住左键后拉蓄力 · 松开击球 · 右键取消';
  
  host.querySelector('.pool-sound').textContent=poolMuted()?'静音':'声音';
  host._ready=()=>host._can&&!host._animating&&!host._striking&&Date.now()+(host._serverOffset||0)>=(host._openingUntil||0)&&!host._current.over;
  const update=()=>{const input=host.querySelector('input'),button=host.querySelector('.pool-shoot'),power=host._locked?host._power:Number(input.value);host.querySelector('.pool-controls output').textContent=power+'%';button.dataset.position=encodePoolShot(Math.max(1,power),host._angle,host._spin);button.disabled=!host._ready();input.disabled=button.disabled;button.textContent=host._animating?'球正在滚动…':host._striking?'正在出杆…':'击球';
    const meter=host.querySelector('.pool-power-meter');meter.setAttribute('aria-valuenow',String(host._power));meter.style.setProperty('--pull',host._power+'%');meter.style.setProperty('--cue-pull',(host._power*1.2)+'px');host.querySelector('.pool-power-value').textContent=host._power+'%';
    const spot=host.querySelector('.pool-spot'),c=spot.getContext('2d');c.clearRect(0,0,160,160);const g=c.createRadialGradient(55,45,1,80,80,68);g.addColorStop(0,'#fff');g.addColorStop(.7,'#f2f2ee');g.addColorStop(1,'#999da5');circle(c,80,80,65,g);const theta=(host._spin-1)*Math.PI/4;circle(c,80+(host._spin?Math.sin(theta)*40:0),80-(host._spin?Math.cos(theta)*40:0),6,'#df5048');host.querySelector('.pool-spot-reset').textContent=['中心击球','高杆','右上塞','右塞','右下塞','低杆','左下塞','左塞','左上塞'][host._spin];};host._update=update;
  const paint=(c,pull=0)=>{ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);if(!host._table){host._table=document.createElement('canvas');host._table.width=W;host._table.height=H;makeTable(host._table.getContext('2d'));}ctx.clearRect(0,0,W,H);ctx.drawImage(host._table,0,0);ctx.save();ctx.translate(PAD,PAD);
    if(host._can&&!s.over&&!host._animating){guide(ctx,c,host._angle);cue(ctx,c,host._angle,pull||host._power*.8);}
    const prev=host._painted;
    for(let i=0;i<9;i++)if(c[i*3+2]){if(prev?.[i*3+2]){const dx=(c[i*3]-prev[i*3])/10,dy=(c[i*3+1]-prev[i*3+1])/10,d=Math.hypot(dx,dy);if(d<100){host._roll[i]+=d;if(d>.02)host._heading[i]=Math.atan2(dy,dx);}}ball(ctx,i,c[i*3]/10,c[i*3+1]/10,host._roll[i],host._heading[i]);}host._painted=c.slice();ctx.restore();};host._paint=paint;
  canvas.onpointerdown=e=>{if(e.button!==0||!host._ready())return;e.preventDefault();unlockPoolAudio();if(!host._locked)host._angle=poolAim(e.clientX,e.clientY,canvas.getBoundingClientRect(),host._current.cells);host._locked=true;host._pullStart={x:e.clientX,y:e.clientY};host._power=0;canvas.setPointerCapture?.(e.pointerId);paint(host._current.cells);update();};
  canvas.onpointermove=e=>{if(!host._ready())return;if(host._locked){if(!host._pullStart)return;host._power=pullPower(host._pullStart,{x:e.clientX,y:e.clientY},host._angle,W/canvas.getBoundingClientRect().width);}else host._angle=poolAim(e.clientX,e.clientY,canvas.getBoundingClientRect(),host._current.cells);paint(host._current.cells);update();};
  canvas.onpointerup=e=>{if(!host._locked||!host._pullStart)return;host._pullStart=null;try{canvas.releasePointerCapture?.(e.pointerId);}catch{}if(host._power>=3)host._strike(host._power);else{host._locked=false;host._power=0;update();paint(host._current.cells);}};
  canvas.onpointercancel=host._releaseAim;canvas.oncontextmenu=e=>{e.preventDefault();host._releaseAim();};
  host.onkeydown=e=>{if(e.key==='Escape')host._releaseAim();};
  host.querySelector('input').oninput=()=>{update();if(!host._animating)paint(host._current.cells);};
  if(host._aimMove!==s.moves||!can||s.over){host._locked=false;host._pullStart=null;host._power=0;host._aimMove=s.moves;}
  const countdown=host.querySelector('.pool-countdown');
  const tick=()=>{const count=openingSeconds(host._openingUntil||0,Date.now()+(host._serverOffset||0));countdown.hidden=!count;countdown.querySelector('b').textContent=String(count);update();if(count){host._counting=true;host._countdownFrame=requestAnimationFrame(tick);}else{host._counting=false;host._countdownFrame=null;}};
  if(!host._counting)tick();
  const previous=host._snapshot;host._snapshot=s.cells.slice();
  if(s.moves&&host._lastMove!==s.moves&&s.history?.length&&previous&&!reduced()) {
    host._lastMove=s.moves;host._animating=true;
    const frames=[previous.slice(0,27),...s.history.map(h=>h.split(',').map(Number))],start=performance.now(),token=host._animationToken=(host._animationToken||0)+1;
    let lastIndex=0,lastSound=-1000;
    const frame=now=>{if(token!==host._animationToken||!host.isConnected)return;const elapsed=Math.max(0,now-start),p=Math.min(frames.length-1,elapsed/100),i=Math.floor(p);
      if(i>lastIndex){const a=frames[lastIndex],b=frames[i];let kind=null,strength=.3;for(let j=0;j<9;j++)if(a[j*3+2]&&!b[j*3+2]){kind='pocket';strength=.7;}if(!kind&&i>1){const prev=frames[i-1],before=frames[Math.max(0,i-2)];for(let j=0;j<9;j++)if(b[j*3+2]&&prev[j*3+2]){const dx=b[j*3]-prev[j*3],dy=b[j*3+1]-prev[j*3+1],ox=prev[j*3]-before[j*3],oy=prev[j*3+1]-before[j*3+1];if((Math.hypot(dx,dy)>10&&Math.hypot(ox,oy)>10&&(dx*ox+dy*oy)/(Math.hypot(dx,dy)*Math.hypot(ox,oy))<.9)||(j>0&&Math.hypot(ox,oy)<10&&Math.hypot(dx,dy)>30)){kind=(b[j*3]<350||b[j*3]>9650||b[j*3+1]<350||b[j*3+1]>4650)?'rail':'ball';strength=Math.min(1,Math.hypot(dx-ox,dy-oy)/700);break;}}}if(kind&&elapsed-lastSound>55){poolImpact(kind,strength);lastSound=elapsed;}lastIndex=i;}
      paint(samplePoolFrame(frames,p));if(p<frames.length-1)requestAnimationFrame(frame);else{host._animating=false;paint(s.cells);host._update();if(host._queued){const next=host._queued;host._queued=null;renderPool(host,next.s,next.can);}}};requestAnimationFrame(frame);
  } else if(!host._animating){host._lastMove=s.moves;paint(s.cells);}
  update();
}
