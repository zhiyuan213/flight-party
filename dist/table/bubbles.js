/* Bubble Duel renderer — versus edition (two boards, side by side).
 *
 * Canvas 2D, fully procedural: a soft pastel sky, glossy candy bubbles, a
 * clean rotating launcher on the ACTIVE board, a short directional aim hint
 * (no landing prediction), and juicy pop / fall / attack / score effects.
 *
 * The authoritative state comes from bubbles-duel.js (locally) or the room
 * API (online). This module only draws it and reports the player's aim as an
 * angle code through ui.onShoot. It never decides scores or winners. */

import {W,H,R,ROW,LAUNCH_Y,LIMIT,GRID,N,ANGLE_MAX,decodeAngle,encodeAngle,
  S_CEIL1,S_CEIL2,S_UP,S_NEXT,S_SCORE1,S_SCORE2,S_COMBO1,S_COMBO2,
  S_SLOT,S_ANGLE,S_COLOUR,S_MATCH,S_FLOAT,S_POINTS,S_ATTACK,S_LIMIT,S_SEAT,MAX_MOVES}
  from './bubbles-duel.js?v=20261112-gamelanes1';
import {bubbleLaunch,bubbleBounce,bubblePop,bubbleCombo,bubbleFall,bubbleClear,bubbleAttack}
  from './bubbles-audio.js?v=20261113-bubbles2&audio=20261115-levels1';

const TAU=Math.PI*2;
const WW=W*2;                 /* two boards side by side */
const TOP=46;                 /* visual offset for the score strip */
const palette=['#ff5d73','#ffb020','#3ecf6e','#35a8ff','#9b6bff'];
const seatColours=['#3aa0ff','#ff5d73'];
const SP=160,ORB_R=58,ORB_SCALE=SP/(2*ORB_R);
const MAX_WORLD_SCALE=1.25;

const sprites=new Map();
let backdrop=null,backdropKey='';
const viewScale=typeof window==='undefined'?1:Math.min(Math.max(window.devicePixelRatio||1,1),2.5);
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
const rgba=(c,a=1)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;
const WHITE=[255,255,255],DEEP=[56,22,88],INK=[30,12,52];

function orbSprite(colour,scale){
  const key=colour+'@'+scale;
  if(sprites.has(key))return sprites.get(key);
  const c=document.createElement('canvas');c.width=c.height=Math.round(SP*scale);
  const g=c.getContext('2d');g.scale(scale,scale);
  const cx=SP/2,cy=SP/2,r=ORB_R,base=rgb(colour);
  const hi=mix(base,WHITE,.42),lo=mix(base,DEEP,.5),edge=mix(base,INK,.72);
  const tint=a=>rgba(base,a);
  const glow=g.createRadialGradient(cx,cy,r*.9,cx,cy,r*1.38);
  glow.addColorStop(0,tint(.15));glow.addColorStop(1,tint(0));
  g.fillStyle=glow;g.beginPath();g.arc(cx,cy,r*1.38,0,TAU);g.fill();
  const body=g.createRadialGradient(cx-r*.34,cy-r*.4,r*.08,cx+r*.06,cy+r*.1,r*1.12);
  body.addColorStop(0,rgba(hi,1));
  body.addColorStop(.34,rgba(base,1));
  body.addColorStop(.72,rgba(lo,1));
  body.addColorStop(1,rgba(edge,1));
  g.fillStyle=body;g.beginPath();g.arc(cx,cy,r,0,TAU);g.fill();
  const sheen=g.createLinearGradient(0,cy-r,0,cy+r*.16);
  sheen.addColorStop(0,rgba(WHITE,.52));sheen.addColorStop(1,rgba(WHITE,0));
  g.fillStyle=sheen;g.beginPath();g.arc(cx,cy,r*.98,0,TAU);g.fill();
  const bot=g.createRadialGradient(cx,cy+r*.72,0,cx,cy+r*.72,r*.82);
  bot.addColorStop(0,rgba(edge,.3));bot.addColorStop(1,rgba(edge,0));
  g.fillStyle=bot;g.beginPath();g.arc(cx,cy,r*.98,0,TAU);g.fill();
  g.strokeStyle=rgba(mix(base,WHITE,.62),.5);g.lineWidth=1.6;
  g.beginPath();g.arc(cx,cy,r-1,0,TAU);g.stroke();
  g.strokeStyle=rgba(edge,.62);g.lineWidth=1.2;
  g.beginPath();g.arc(cx,cy,r-2.7,0,TAU);g.stroke();
  g.save();g.translate(cx-r*.34,cy-r*.42);g.rotate(-.5);
  const spec=g.createRadialGradient(0,0,0,0,0,r*.5);
  spec.addColorStop(0,rgba(WHITE,.95));spec.addColorStop(.5,rgba(WHITE,.45));spec.addColorStop(1,rgba(WHITE,0));
  g.fillStyle=spec;g.beginPath();g.ellipse(0,0,r*.44,r*.22,0,0,TAU);g.fill();
  g.restore();
  g.fillStyle=rgba(WHITE,.9);g.beginPath();g.arc(cx+r*.32,cy-r*.44,r*.07,0,TAU);g.fill();
  g.fillStyle=rgba(WHITE,.55);g.beginPath();g.arc(cx+r*.4,cy+r*.18,r*.045,0,TAU);g.fill();
  sprites.set(key,c);return c;
}

function makeBackdrop(sw,sh,scale){
  const c=document.createElement('canvas');
  c.width=Math.max(1,Math.round(sw*scale));c.height=Math.max(1,Math.round(sh*scale));
  const g=c.getContext('2d');g.scale(scale,scale);
  const base=g.createLinearGradient(0,0,0,sh);
  base.addColorStop(0,'#101b36');base.addColorStop(.45,'#142442');
  base.addColorStop(.8,'#1b2041');base.addColorStop(1,'#10172e');
  g.fillStyle=base;g.fillRect(0,0,sw,sh);
  for(const [x,y,r,col] of [
    [sw*.14,sh*.16,sw*.3,'rgba(126,196,255,.16)'],
    [sw*.86,sh*.34,sw*.26,'rgba(186,150,255,.13)'],
    [sw*.5,sh*.8,sw*.32,'rgba(150,210,255,.14)'],
    [sw*.26,sh*.9,sw*.24,'rgba(255,170,220,.12)']
  ]){
    const glow=g.createRadialGradient(x,y,0,x,y,r);
    glow.addColorStop(0,col);glow.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=glow;g.fillRect(0,0,sw,sh);
  }
  let seed=918273;
  const rand=()=>{seed=(Math.imul(seed,1103515245)+12345)&0x7fffffff;return seed/0x7fffffff;};
  for(let i=0;i<42;i++){
    const x=rand()*sw,y=rand()*sh,r=6+rand()*34,a=.04+rand()*.1;
    const b=g.createRadialGradient(x,y,0,x,y,r);
    b.addColorStop(0,`rgba(255,255,255,${a.toFixed(3)})`);
    b.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=b;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();
  }
  const vig=g.createRadialGradient(sw/2,sh*.44,Math.min(sw,sh)*.3,sw/2,sh*.5,Math.max(sw,sh)*.85);
  vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(3,7,19,.65)');
  g.fillStyle=vig;g.fillRect(0,0,sw,sh);
  return c;
}

function readBoard(board){
  const c=board?.cells;
  if(!c)return null;
  const mapBoard=off=>Array.from({length:N},(_,i)=>c[off+i]?palette[c[off+i]-1]:null);
  return{
    cells1:mapBoard(0),cells2:mapBoard(N),
    ceiling1:c[S_CEIL1]*ROW,ceiling2:c[S_CEIL2]*ROW,
    up:c[S_UP]?palette[c[S_UP]-1]:null,
    next:c[S_NEXT]?palette[c[S_NEXT]-1]:null,
    score1:c[S_SCORE1],score2:c[S_SCORE2],
    combo1:c[S_COMBO1],combo2:c[S_COMBO2],
    moves:board.moves,turn:board.turn,over:board.over,winner:board.winner,
    limit:c[S_LIMIT]||MAX_MOVES,
    lastSlot:c[S_SLOT],lastAngle:c[S_ANGLE],lastColour:c[S_COLOUR],
    lastMatch:c[S_MATCH],lastFloat:c[S_FLOAT],lastPoints:c[S_POINTS],
    lastAttack:c[S_ATTACK],lastSeat:c[S_SEAT]
  };
}

/* View-side replay of the pop/floating split, used ONLY to animate the clear
   effect. `prevCells` is the shooter's board (length N, raw ints). */
function classifyClear(prevCells,slot,colour){
  const cells=prevCells.slice();
  const popped=new Set(),fell=[];
  if(slot<0||slot>=N||!colour)return {popped,fell};
  cells[slot]=colour;
  const seen=new Set([slot]),queue=[slot];
  for(let head=0;head<queue.length;head++){
    for(const n of GRID[queue[head]].neighbours){
      if(seen.has(n)||cells[n]!==colour)continue;
      seen.add(n);queue.push(n);
    }
  }
  if(seen.size>=3)for(const i of seen){popped.add(i);cells[i]=0;}
  const seeds=[];for(const g of GRID)if(g.r===0&&cells[g.i])seeds.push(g.i);
  const attached=new Set(seeds),aq=[...seeds];
  for(let head=0;head<aq.length;head++){
    for(const n of GRID[aq[head]].neighbours){
      if(attached.has(n)||!cells[n])continue;
      attached.add(n);aq.push(n);
    }
  }
  for(let i=0;i<N;i++)if(cells[i]&&!attached.has(i))fell.push(i);
  return {popped,fell};
}

export function createBubbles(ui){
  const {canvas,ctx,label}=ui;
  const host=canvas.parentElement;
  const scale=viewScale;
  if(host)Object.assign(host.style,{position:'relative',display:'block',padding:'0',
    margin:'0 auto',width:'100%',height:'100%',minHeight:'0',
    flex:'1 1 auto',background:'transparent',border:'0',boxShadow:'none',overflow:'hidden'});
  Object.assign(canvas.style,{position:'absolute',top:'0',left:'0',right:'auto',bottom:'auto',
    display:'block',width:'100%',height:'100%'});

  let stageW=WW,stageH=H,originX=0,originY=0,worldScale=1,laidOut=false;
  const point=event=>{
    const p=ui.point(event);
    return{x:(p.x/scale-originX)/worldScale,y:(p.y/scale-originY)/worldScale};
  };
  let aim=-Math.PI/2,display=readBoard(ui.board?.())||null,board=ui.board?.()||null;
  let flight=null,effects=[],frame=0,running=false,appliedKey='',shake=0,previousCells=null;
  const colourOf=index=>index>0?palette[index-1]:null;
  const activeSeat=()=>display?display.turn:1;
  const activeXoff=()=>activeSeat()===1?0:W;

  function layout(){
    if(!host)return;
    const rect=host.getBoundingClientRect();
    const hw=Math.max(1,Math.round(rect.width)),sh=Math.max(1,Math.round(rect.height));
    if(laidOut&&hw===stageW&&sh===stageH)return;
    laidOut=true;
    stageW=hw;stageH=sh;
    canvas.width=Math.round(hw*scale);canvas.height=Math.round(sh*scale);
    canvas.style.width=hw+'px';canvas.style.height=sh+'px';
    ctx.setTransform(scale,0,0,scale,0,0);
    worldScale=Math.min(MAX_WORLD_SCALE,hw/WW,sh/H);
    originX=(hw-WW*worldScale)/2;
    originY=(sh-H*worldScale)/2;
    backdrop=null;
    draw();
  }
  function orb(x,y,colour,r=R-1.4){
    const size=2*r*ORB_SCALE;
    ctx.drawImage(orbSprite(colour,scale),x-size/2,y-size/2,size,size);
  }

  function launcher(angle,cx){
    const cy=LAUNCH_Y,spin=angle+Math.PI/2;
    ctx.save();ctx.fillStyle='#182746';ctx.strokeStyle='#e7bf72';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(cx,cy+23,43,15,0,0,TAU);ctx.fill();ctx.stroke();ctx.restore();
    const chrome=(x0,x1)=>{
      const g=ctx.createLinearGradient(x0,0,x1,0);
      g.addColorStop(0,'#8b93ad');g.addColorStop(.18,'#eef2fa');
      g.addColorStop(.4,'#f8fbff');g.addColorStop(.6,'#c7d0e2');
      g.addColorStop(.82,'#7f8aa6');g.addColorStop(1,'#6a7490');
      return g;
    };
    const pool=ctx.createRadialGradient(cx,cy+20,2,cx,cy+20,78);
    pool.addColorStop(0,'rgba(120,150,220,.22)');
    pool.addColorStop(.6,'rgba(140,120,220,.08)');
    pool.addColorStop(1,'rgba(120,120,220,0)');
    ctx.fillStyle=pool;ctx.beginPath();ctx.ellipse(cx,cy+22,78,26,0,0,TAU);ctx.fill();
    ctx.save();ctx.translate(cx,cy);ctx.rotate(spin);ctx.lineCap='round';
    ctx.strokeStyle=chrome(-8,8);ctx.lineWidth=12;
    ctx.beginPath();ctx.moveTo(0,8);ctx.lineTo(0,30);ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(-3,10);ctx.lineTo(-3,28);ctx.stroke();
    ctx.fillStyle=chrome(-20,20);
    ctx.beginPath();
    ctx.moveTo(-19,8);ctx.lineTo(-16,26);ctx.quadraticCurveTo(-16,33,-6,33);
    ctx.lineTo(6,33);ctx.quadraticCurveTo(16,33,16,26);ctx.lineTo(19,8);
    ctx.quadraticCurveTo(0,15,-19,8);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=1.4;
    ctx.beginPath();ctx.moveTo(-17,10);ctx.lineTo(-14,25);ctx.quadraticCurveTo(-14,31,-6,31);ctx.stroke();
    ctx.fillStyle=chrome(-14,14);
    ctx.beginPath();ctx.roundRect(-14,32,28,8,4);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.45)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(-10,32.5);ctx.lineTo(10,32.5);ctx.stroke();
    ctx.restore();
    const bloom=ctx.createRadialGradient(cx,cy,2,cx,cy,30);
    bloom.addColorStop(0,'rgba(255,255,255,.35)');
    bloom.addColorStop(.6,'rgba(180,160,255,.12)');
    bloom.addColorStop(1,'rgba(160,140,255,0)');
    ctx.fillStyle=bloom;ctx.beginPath();ctx.arc(cx,cy,30,0,TAU);ctx.fill();
  }

  function scoreStrip(){
    if(!display)return;
    const y=7,h=32,x0=8,x1=WW-8;
    ctx.save();
    ctx.shadowColor='rgba(120,140,200,.25)';ctx.shadowBlur=14;
    ctx.fillStyle='rgba(12,20,42,.94)';
    ctx.beginPath();ctx.roundRect(x0,y,x1-x0,h,16);ctx.fill();
    ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(171,190,255,.55)';ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(x0,y,x1-x0,h,16);ctx.stroke();
    const active1=display.turn===1&&!display.over,active2=display.turn===2&&!display.over;
    if(!display.over){
      const gx=active1?x0+80:x1-80;
      const glow=ctx.createRadialGradient(gx,y+h/2,2,gx,y+h/2,90);
      glow.addColorStop(0,active1?'rgba(58,160,255,.3)':'rgba(255,93,115,.3)');
      glow.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=glow;ctx.fillRect(active1?x0:x1-160,y,160,h);
    }
    ctx.textBaseline='middle';ctx.font='700 13px system-ui,sans-serif';
    ctx.fillStyle=seatColours[0];ctx.beginPath();ctx.arc(x0+20,y+h/2,5,0,TAU);ctx.fill();
    ctx.textAlign='left';ctx.fillStyle=active1?'#8ddcff':'rgba(219,229,255,.85)';
    ctx.fillText(label('P1','玩家1')+'  '+display.score1,x0+31,y+h/2+1);
    ctx.fillStyle=seatColours[1];ctx.beginPath();ctx.arc(x1-20,y+h/2,5,0,TAU);ctx.fill();
    ctx.textAlign='right';ctx.fillStyle=active2?'#ff9bb9':'rgba(219,229,255,.85)';
    ctx.fillText(display.score2+'  '+label('P2','玩家2'),x1-31,y+h/2+1);
    ctx.textAlign='center';ctx.font='800 13px system-ui,sans-serif';
    ctx.fillStyle='rgba(245,216,148,.95)';
    ctx.fillText(label('BUBBLE DUEL','泡泡对决'),W-110,y+h/2+1);
    ctx.font='700 11px system-ui,sans-serif';ctx.fillStyle='rgba(186,203,235,.85)';
    ctx.fillText(label('ROUND','回合')+' '+display.moves+'/'+display.limit,W,y+h/2+1);
    ctx.restore();
  }

  function walls(xoff,active){
    ctx.save();
    for(const side of [0,1]){
      const x=xoff+(side?W:0),inward=side?-1:1;
      const grad=ctx.createLinearGradient(x,0,x+inward*10,0);
      grad.addColorStop(0,active?'rgba(120,150,230,.28)':'rgba(120,150,220,.14)');
      grad.addColorStop(1,'rgba(120,150,220,0)');
      ctx.fillStyle=grad;ctx.fillRect(Math.min(x,x+inward*10),TOP-10,10,H-TOP);
      ctx.strokeStyle=active?'rgba(70,120,220,.5)':'rgba(150,170,230,.32)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(x+inward*1.5,TOP-10);ctx.lineTo(x+inward*1.5,H-8);ctx.stroke();
    }
    /* danger line near the bottom of the board */
    ctx.setLineDash([6,6]);
    ctx.strokeStyle='rgba(255,96,120,.4)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(xoff+4,LIMIT+TOP);ctx.lineTo(xoff+W-4,LIMIT+TOP);ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function boardLabel(xoff,seat){
    const active=activeSeat()===seat;
    ctx.save();
    ctx.font='700 10px system-ui,sans-serif';ctx.textAlign='center';
    ctx.fillStyle=active?seatColours[seat-1]:'rgba(186,203,235,.8)';
    ctx.fillText((seat===1?label('P1','玩家1'):label('P2','玩家2'))+(active?'  ·  '+(display.turn===seat?label('YOUR TURN','你的回合'):'') : ''),xoff+W/2,TOP+14);
    ctx.restore();
  }

  function drawAimGuide(){
    if(!display||flight||!display.up||display.over||!ui.canPlay?.())return;
    const xoff=activeXoff();
    const cells=activeSeat()===1?display.cells1:display.cells2;
    const ceiling=activeSeat()===1?display.ceiling1:display.ceiling2;
    const {pts}=simulate(aim,ceiling,cells,xoff);
    const tint=rgb(display.up),MAX=220;
    const hint=[pts[0]];
    let acc=0;
    for(let i=1;i<pts.length;i++){
      acc+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);
      hint.push(pts[i]);
      if(acc>=MAX)break;
    }
    if(hint.length<2)return;
    ctx.save();
    ctx.strokeStyle=rgba(tint,.42);ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(hint[0].x,hint[0].y);
    for(let i=1;i<hint.length;i++)ctx.lineTo(hint[i].x,hint[i].y);
    ctx.stroke();
    ctx.restore();
    const step=Math.max(1,Math.floor(hint.length/8));
    for(let i=0;i<hint.length;i+=step){
      const fade=1-i/hint.length;
      const p=hint[i],radius=Math.max(1.2,2.8-i*(1.4/hint.length));
      ctx.globalAlpha=.2*fade;ctx.fillStyle=rgba(tint,1);
      ctx.beginPath();ctx.arc(p.x,p.y,radius*2,0,TAU);ctx.fill();
      ctx.globalAlpha=.9*fade;ctx.fillStyle='#ffffff';
      ctx.beginPath();ctx.arc(p.x,p.y,Math.max(.7,radius*.5),0,TAU);ctx.fill();
    }
    ctx.globalAlpha=1;
    const tip=hint[hint.length-1],prev=hint[hint.length-2];
    const ang=Math.atan2(tip.y-prev.y,tip.x-prev.x);
    ctx.save();ctx.translate(tip.x,tip.y);ctx.rotate(ang);
    ctx.fillStyle=rgba(tint,.82);
    ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(-3,-4.5);ctx.lineTo(-3,4.5);ctx.closePath();ctx.fill();
    ctx.restore();
  }

  function drawWorld(){
    scoreStrip();
    const active=activeSeat();
    for(const side of [0,1]){
      const xoff=side*W;
      const cells=side===0?display?.cells1:display?.cells2;
      const ceiling=side===0?display?.ceiling1:display?.ceiling2;
      walls(xoff,active===side+1);
      // Turn information stays in the HUD, clear of the first bubble row.
      if(cells)for(let i=0;i<N;i++)if(cells[i])orb(xoff+GRID[i].x,GRID[i].y+ceiling+TOP,cells[i]);
    }
    for(const e of effects)drawEffect(e);
    drawAimGuide();
    const xoff=activeXoff();
    launcher(aim,xoff+W/2);
    if(flight)orb(flight.x,flight.y,flight.colour);
    else if(display?.up)orb(xoff+W/2,LAUNCH_Y,display.up);
    if(display?.next){
      const nx=xoff+58,ny=H-42;
      ctx.fillStyle='rgba(22,34,63,.9)';
      ctx.beginPath();ctx.arc(nx,ny,17,0,TAU);ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.95)';ctx.lineWidth=1.2;
      ctx.beginPath();ctx.arc(nx,ny,17,0,TAU);ctx.stroke();
      orb(nx,ny,display.next,13);
      ctx.font='700 10px system-ui,sans-serif';ctx.textAlign='center';
      ctx.textBaseline='alphabetic';ctx.fillStyle='rgba(219,229,255,.9)';
      ctx.fillText(label('NEXT','下一颗'),nx,ny-26);
      ctx.textAlign='left';
    }
    ctx.globalAlpha=1;
  }

  function draw(){
    const key=stageW+'x'+stageH+'@'+scale;
    if(!backdrop||backdropKey!==key){backdrop=makeBackdrop(stageW,stageH,scale);backdropKey=key;}
    ctx.globalAlpha=1;ctx.drawImage(backdrop,0,0,stageW,stageH);
    ctx.save();
    ctx.translate(originX,originY);
    ctx.scale(worldScale,worldScale);
    if(shake>0.2)ctx.translate((Math.random()*2-1)*shake,(Math.random()*2-1)*shake);
    drawWorld();
    ctx.restore();
    ctx.globalAlpha=1;
  }

  function simulate(aim,ceiling,cells,xoff){
    const top=ceiling+TOP;
    let x=xoff+W/2,y=LAUNCH_Y,vx=Math.cos(aim),vy=Math.sin(aim),impact=-1;
    const pts=[{x,y}];
    for(let i=0;i<420;i++){
      x+=vx*4;y+=vy*4;
      if(x<xoff+R){x=2*(xoff+R)-x;vx=-vx;pts.push({x,y,b:1});}
      else if(x>xoff+W-R){x=2*(xoff+W-R)-x;vx=-vx;pts.push({x,y,b:1});}
      else pts.push({x,y});
      if(y<=R+top)break;
      for(let j=0;j<N;j++){
        if(!cells[j])continue;
        const g=GRID[j];
        if(Math.hypot(xoff+g.x-x,g.y+top-y)<R*2-1){impact=j;break;}
      }
      if(impact>=0)break;
    }
    let slot=-1,best=Infinity;
    if(impact>=0){
      for(const i of GRID[impact].neighbours)if(!cells[i]){
        const g=GRID[i],d=Math.hypot(xoff+g.x-x,g.y+top-y);
        if(d<best){best=d;slot=i;}
      }
    }else{
      for(const g of GRID)if(g.r===0&&!cells[g.i]){
        const d=Math.hypot(xoff+g.x-x,g.y+top-y);
        if(d<best){best=d;slot=g.i;}
      }
    }
    if(slot<0)for(let i=0;i<N;i++)if(!cells[i]){slot=i;break;}
    return {pts,slot};
  }

  function drawEffect(e){
    const p=e.life/e.maxLife;
    if(e.type==='ring'){
      const r=e.r0+(1-p)*(e.r1-e.r0);
      ctx.globalAlpha=p*.5;ctx.strokeStyle=e.colour;ctx.lineWidth=3*p+.5;
      ctx.beginPath();ctx.arc(e.x,e.y,r,0,TAU);ctx.stroke();
    }else if(e.type==='part'){
      ctx.globalAlpha=p;ctx.fillStyle=e.colour;
      ctx.beginPath();ctx.arc(e.x,e.y,e.size*(.4+.6*p),0,TAU);ctx.fill();
    }else if(e.type==='fall'){
      ctx.globalAlpha=Math.min(1,p*2.6);orb(e.x,e.y,e.colour,R*p);
    }else if(e.type==='text'){
      ctx.globalAlpha=Math.min(1,p*1.8);
      ctx.font=e.big?'900 22px system-ui,sans-serif':'900 16px system-ui,sans-serif';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.lineWidth=4;ctx.strokeStyle='rgba(171,190,255,.55)';
      ctx.strokeText(e.str,e.x,e.y);
      ctx.fillStyle=e.colour;ctx.fillText(e.str,e.x,e.y);
      ctx.textAlign='left';
    }
    ctx.globalAlpha=1;
  }

  function endFlight(){
    const snapshot=readBoard(board);
    flight=null;
    if(snapshot)spawnEffects(snapshot);
    display=readBoard(board);
    refreshStatus();
  }

  function spawnEffects(s){
    const slot=s.lastSlot,seat=s.lastSeat;
    if(slot>=0&&slot<N){
      const xoff=seat===1?0:W;
      const ceiling=seat===1?s.ceiling1:s.ceiling2;
      const g=GRID[slot];
      const gx=xoff+g.x,gy=g.y+ceiling+TOP;
      const colour=colourOf(board.cells[S_COLOUR])||'#ffffff';
      let popped=new Set(),fell=[];
      if(previousCells){
        const res=classifyClear(previousCells,slot,board.cells[S_COLOUR]);
        popped=res.popped;fell=res.fell;
      }
      if(popped.size>=3||s.lastMatch>=3){
        for(const i of popped){
          const c=GRID[i];
          const col=previousCells[i]?colourOf(previousCells[i]):colour;
          effects.push({type:'ring',x:xoff+c.x,y:c.y+ceiling+TOP,colour:col,r0:R*.4,r1:R*2.1,life:18,maxLife:18});
          const base=rgb(col);
          for(let k=0;k<10;k++){
            const a=Math.random()*TAU,sp=1.5+Math.random()*3.4;
            effects.push({type:'part',x:xoff+c.x,y:c.y+ceiling+TOP,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,colour:rgba(base,.9),size:2+Math.random()*3,life:16+Math.random()*10,maxLife:26});
          }
        }
        bubblePop(Math.max(3,popped.size||s.lastMatch));
        shake=Math.min(10,4+(Math.max(3,popped.size)-3)*1.2);
      }
      for(const i of fell){
        const c=GRID[i];
        effects.push({type:'fall',x:xoff+c.x,y:c.y+ceiling+TOP,colour:previousCells[i]?colourOf(previousCells[i]):'#ffffff',vy:0,life:46,maxLife:46});
      }
      if(fell.length)bubbleFall();
      if(s.lastAttack>0){
        const oppXoff=seat===1?W:0;
        effects.push({type:'text',x:oppXoff+W/2,y:H*.4,str:label('ATTACK','攻击')+' +'+s.lastAttack,colour:'#ff9bb9',life:52,maxLife:52,big:true});
        bubbleAttack(s.lastAttack);
      }
      if(s.lastPoints>0){
        effects.push({type:'text',x:gx,y:gy-16,str:'+'+s.lastPoints,colour:'#8ddcff',life:40,maxLife:40,big:false});
        const shooter=seat===1?s.combo1:s.combo2;
        if(shooter>=1){
          effects.push({type:'text',x:gx,y:gy-42,str:'COMBO ×'+Math.min(shooter,9),colour:'#ff9bb9',life:44,maxLife:44,big:true});
          bubbleCombo(shooter);
        }
      }
    }
    if(clearedBoard(s)){
      effects.push({type:'text',x:WW/2,y:H*.42,str:label('CLEAR!','清空！'),colour:'#8ddcff',life:80,maxLife:80,big:true});
      bubbleClear();
    }
  }

  function clearedBoard(s){
    const c=board?.cells;if(!c)return false;
    const off=(s.lastSeat===1?0:N);
    for(let i=0;i<N;i++)if(c[off+i])return false;
    return true;
  }

  function tick(){
    if(!running)return;
    if(flight){
      advanceFlight(flight,15);
      if(flight.done)endFlight();
    }
    for(const e of effects){
      e.life--;
      if(e.type==='part'){e.x+=e.vx;e.y+=e.vy;e.vy+=.12;}
      if(e.type==='fall'){e.vy+=.5;e.y+=e.vy;}
    }
    effects=effects.filter(e=>e.life>0&&e.y<H+40);
    if(shake>0)shake*=.85;else shake=0;
    draw();
    frame=requestAnimationFrame(tick);
  }

  function advanceFlight(f,dist){
    f.d+=dist;
    while(f.seg<f.pts.length-1){
      const a=f.pts[f.seg],b=f.pts[f.seg+1];
      const len=Math.hypot(b.x-a.x,b.y-a.y)||1e-6;
      if(f.d<=len){
        const t=f.d/len;
        f.x=a.x+(b.x-a.x)*t;f.y=a.y+(b.y-a.y)*t;
        return;
      }
      f.d-=len;f.seg++;
      if(f.pts[f.seg]?.b&&!f.bounced){f.bounced=true;bubbleBounce();}
    }
    f.x=f.pts[f.pts.length-1].x;f.y=f.pts[f.pts.length-1].y;f.done=true;
  }

  function refreshStatus(){
    if(!display||!ui.status)return;
    const p1=label('P1','玩家1'),p2=label('P2','玩家2');
    ui.status(p1+' '+display.score1+' : '+display.score2+' '+p2+'  ·  '+label('Round','回合')+' '+display.moves+'/'+display.limit+
      '  ·  '+(display.over?label('Finished','已结束'):label('Turn','轮到')+' '+(display.turn===1?p1:p2)));
  }

  function applyBoard(next){
    if(!next?.cells)return;
    const key=next.moves+':'+next.cells[S_SEAT];
    if(key===appliedKey){board=next;refreshStatus();return;}
    const previous=board;
    board=next;
    appliedKey=key;
    const seat=next.cells[S_SEAT]||1;
    const off=seat===1?0:N;
    previousCells=previous?.cells?previous.cells.slice(off,off+N):null;
    const shotCode=next.cells[S_ANGLE],shotColour=next.cells[S_COLOUR],slot=next.cells[S_SLOT];
    const canAnimate=previous&&next.moves>previous.moves&&shotColour>0&&slot>=0&&slot<N&&running;
    if(canAnimate){
      const a=decodeAngle(shotCode);
      const prevCeil=previous.cells[(seat===1?S_CEIL1:S_CEIL2)]*ROW;
      const prevCells=display?((seat===1?display.cells1:display.cells2)||[]):[];
      const xoff=seat===1?0:W;
      const {pts}=simulate(a,prevCeil,prevCells,xoff);
      if(slot>=0)pts.push({x:xoff+GRID[slot].x,y:GRID[slot].y+prevCeil+TOP});
      flight={x:xoff+W/2,y:LAUNCH_Y,colour:colourOf(shotColour),
        pts,d:0,seg:0,done:false,bounced:false};
      effects=[];
    }else{
      flight=null;display=readBoard(next);previousCells=null;
    }
    refreshStatus();
  }
  const fire=()=>{
    if(!running||flight||!ui.canPlay?.())return;
    bubbleLaunch();
    ui.onShoot?.(encodeAngle(aim));
  };
  function target(event){
    const p=point(event);
    const cx=activeXoff()+W/2;
    aim=Math.max(-Math.PI+.16,Math.min(-.16,Math.atan2(Math.min(-1,p.y-LAUNCH_Y),p.x-cx)));
  }
  canvas.onpointermove=target;
  canvas.onpointerdown=event=>{target(event);fire();};
  canvas.onkeydown=event=>{
    if(!['ArrowLeft','ArrowRight',' '].includes(event.key))return;
    event.preventDefault();
    if(event.key===' ')fire();
    else aim=Math.max(-Math.PI+.16,Math.min(-.16,aim+(event.key==='ArrowLeft'?-.08:.08)));
  };
  ui.action.onclick=fire;
  layout();
  const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(layout);
  observer?.observe(host||canvas);
  return{
    stop(){running=false;flight=null;cancelAnimationFrame(frame);frame=0;},
    start(){
      if(running)return;
      running=true;ui.action.disabled=false;
      ui.action.textContent=label('Fire','发射');
      if(!frame)frame=requestAnimationFrame(tick);
      refreshStatus();
    },
    refresh(){ui.action.textContent=label('Fire','发射');refreshStatus();layout();},
    applyBoard,
    state(){return board?{moves:board.moves,turn:board.turn,over:board.over,score:[board.cells[S_SCORE1],board.cells[S_SCORE2]]}:null;},
    reset(){appliedKey='';flight=null;effects=[];previousCells=null;board=ui.board?.()||null;display=readBoard(board);}
  };
}
