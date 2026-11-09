/* Bubble Duel renderer.
 *
 * The board is authoritative state from bubbles-duel.js (locally) or from the
 * room API (online). This module only draws it and reports the player's aim as
 * an angle code through ui.onShoot. It never decides scores or winners. */
import {W,H,R,ROW,LAUNCH_Y,LIMIT,GRID,N,ANGLE_MAX,decodeAngle,encodeAngle,
  S_CEIL,S_UP,S_NEXT,S_SCORE1,S_SCORE2,S_COMBO,S_SLOT,S_ANGLE,S_COLOUR,
  S_MATCH,S_FLOAT,S_POINTS,S_LIMIT,S_SEAT,MAX_MOVES} from './bubbles-duel.js?v=20261109-duel1';

const TAU=Math.PI*2;
/* Purely visual offset: keeps the score strip clear of the top bubble row.
   Rules use unshifted coordinates; every draw/test/shift uses the same TOP. */
const TOP=40;
const palette=['#43a9ff','#ffd24a','#ff56ac','#a866ff','#4ce0b0'];
const seatColours=['#43a9ff','#ff56ac'];
const SP=128,ORB_R=46,ORB_SCALE=SP/(2*ORB_R);
const sprites=new Map();
let backdrop=null;
const channels=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));

function orbSprite(colour){
  if(sprites.has(colour))return sprites.get(colour);
  const c=document.createElement('canvas');c.width=c.height=SP;
  const g=c.getContext('2d'),cx=SP/2,cy=SP/2,r=ORB_R,[cr,cg,cb]=channels(colour);
  const tint=a=>`rgba(${cr},${cg},${cb},${a})`,white=a=>`rgba(255,255,255,${a})`;

  const halo=g.createRadialGradient(cx,cy,r*.6,cx,cy,r*1.36);
  halo.addColorStop(0,tint(.42));halo.addColorStop(.5,tint(.14));halo.addColorStop(1,tint(0));
  g.fillStyle=halo;g.beginPath();g.arc(cx,cy,r*1.36,0,TAU);g.fill();

  g.save();g.beginPath();g.arc(cx,cy,r,0,TAU);g.clip();
  const body=g.createRadialGradient(cx-r*.32,cy-r*.4,r*.04,cx,cy,r*1.08);
  body.addColorStop(0,white(.86));body.addColorStop(.14,white(.46));
  body.addColorStop(.32,tint(.46));body.addColorStop(.68,tint(.6));
  body.addColorStop(.92,tint(.86));body.addColorStop(1,'rgba(26,9,52,.84)');
  g.fillStyle=body;g.fillRect(0,0,SP,SP);
  const refract=g.createRadialGradient(cx+r*.34,cy+r*.4,0,cx+r*.34,cy+r*.4,r*.72);
  refract.addColorStop(0,white(.55));refract.addColorStop(.45,tint(.3));refract.addColorStop(1,tint(0));
  g.fillStyle=refract;g.fillRect(0,0,SP,SP);
  const shade=g.createRadialGradient(cx,cy,r*.58,cx,cy,r);
  shade.addColorStop(0,'rgba(18,6,40,0)');shade.addColorStop(1,'rgba(18,6,40,.68)');
  g.fillStyle=shade;g.fillRect(0,0,SP,SP);
  const sheen=g.createLinearGradient(0,cy-r,0,cy+r*.15);
  sheen.addColorStop(0,white(.46));sheen.addColorStop(1,white(0));
  g.fillStyle=sheen;g.fillRect(cx-r,cy-r,2*r,r*1.15);
  g.restore();

  let rim=colour;
  if(typeof g.createConicGradient==='function'){
    rim=g.createConicGradient(-Math.PI/2,cx,cy);
    ['#ffffff',colour,'#9ef4ff','#ffffff','#ffb0e6',colour,'#ffffff']
      .forEach((stop,i,all)=>rim.addColorStop(i/(all.length-1),stop));
  }
  g.strokeStyle=rim;g.lineWidth=3.4;g.globalAlpha=.92;
  g.beginPath();g.arc(cx,cy,r-1.7,0,TAU);g.stroke();g.globalAlpha=1;
  g.strokeStyle=white(.5);g.lineWidth=1.2;
  g.beginPath();g.arc(cx,cy,r-5,0,TAU);g.stroke();

  g.save();g.translate(cx-r*.34,cy-r*.42);g.rotate(-.5);
  const spec=g.createRadialGradient(0,0,0,0,0,r*.56);
  spec.addColorStop(0,white(.98));spec.addColorStop(.38,white(.6));spec.addColorStop(1,white(0));
  g.fillStyle=spec;g.beginPath();g.ellipse(0,0,r*.56,r*.29,0,0,TAU);g.fill();g.restore();
  g.strokeStyle=white(.5);g.lineWidth=2.6;
  g.beginPath();g.arc(cx,cy,r*.78,1.12*Math.PI,1.48*Math.PI);g.stroke();
  g.fillStyle=white(.9);g.beginPath();g.arc(cx+r*.44,cy-r*.48,r*.065,0,TAU);g.fill();
  g.strokeStyle=white(.34);g.lineWidth=2.2;
  g.beginPath();g.arc(cx,cy,r*.74,.22*Math.PI,.78*Math.PI);g.stroke();

  sprites.set(colour,c);return c;
}

function makeBackdrop(){
  const c=document.createElement('canvas');c.width=W;c.height=H;
  const g=c.getContext('2d');
  const base=g.createLinearGradient(0,0,0,H);
  base.addColorStop(0,'#2b1052');base.addColorStop(.38,'#1c0a39');base.addColorStop(1,'#0c051d');
  g.fillStyle=base;g.fillRect(0,0,W,H);
  for(const [x,y,r,col] of [[70,80,230,'rgba(130,58,224,.30)'],[300,250,200,'rgba(240,60,170,.17)'],
    [170,610,250,'rgba(90,48,200,.16)'],[W/2,LAUNCH_Y,155,'rgba(180,90,255,.20)']]){
    const glow=g.createRadialGradient(x,y,0,x,y,r);
    glow.addColorStop(0,col);glow.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=glow;g.fillRect(0,0,W,H);
  }
  let seed=20261109;
  const rand=()=>{seed=(Math.imul(seed,1103515245)+12345)&0x7fffffff;return seed/0x7fffffff;};
  for(let i=0;i<150;i++){
    const x=rand()*W,y=rand()*H,s=.35+rand()*1.45,a=.1+rand()*.5;
    g.fillStyle=`rgba(255,255,255,${a.toFixed(3)})`;
    g.beginPath();g.arc(x,y,s,0,TAU);g.fill();
  }
  for(let i=0;i<12;i++){
    const x=18+rand()*(W-36),y=40+rand()*(H-140),s=3+rand()*5,a=.25+rand()*.45;
    g.strokeStyle=`rgba(226,196,255,${a.toFixed(3)})`;g.lineWidth=.9;
    g.beginPath();g.moveTo(x-s,y);g.lineTo(x+s,y);g.moveTo(x,y-s);g.lineTo(x,y+s);g.stroke();
    g.fillStyle=`rgba(255,255,255,${Math.min(1,a+.2).toFixed(3)})`;
    g.beginPath();g.arc(x,y,1.1,0,TAU);g.fill();
  }
  g.save();g.strokeStyle='rgba(214,158,255,.5)';g.lineWidth=1;g.setLineDash([6,7]);
  g.shadowColor='rgba(190,100,255,.9)';g.shadowBlur=9;
  g.beginPath();g.moveTo(0,LIMIT+TOP);g.lineTo(W,LIMIT+TOP);g.stroke();g.restore();
  return c;
}

function readBoard(board){
  const c=board?.cells;
  if(!c)return null;
  return{
    cells:Array.from({length:N},(_,i)=>c[i]?palette[c[i]-1]:null),
    ceiling:c[S_CEIL]*ROW,
    up:c[S_UP]?palette[c[S_UP]-1]:null,
    next:c[S_NEXT]?palette[c[S_NEXT]-1]:null,
    score1:c[S_SCORE1],score2:c[S_SCORE2],combo:c[S_COMBO],
    moves:board.moves,turn:board.turn,over:board.over,winner:board.winner,
    limit:c[S_LIMIT]||MAX_MOVES,
    lastSlot:c[S_SLOT],lastAngle:c[S_ANGLE],lastColour:c[S_COLOUR],
    lastMatch:c[S_MATCH],lastFloat:c[S_FLOAT],lastPoints:c[S_POINTS],lastSeat:c[S_SEAT]
  };
}

export function createBubbles(ui){
  const {canvas,ctx,point,label}=ui;
  canvas.width=W;canvas.height=H;
  let aim=-Math.PI/2,display=readBoard(ui.board?.())||null,board=ui.board?.()||null;
  let flight=null,effects=[],frame=0,running=false,appliedKey='';
  const colourOf=index=>index>0?palette[index-1]:null;

  function orb(x,y,colour,r=R-1.4){
    const size=2*r*ORB_SCALE;
    ctx.drawImage(orbSprite(colour),x-size/2,y-size/2,size,size);
  }
  function launcher(angle){
    const cx=W/2,cy=LAUNCH_Y;
    ctx.save();ctx.translate(cx,cy);ctx.rotate(angle+Math.PI/2);
    const metal=ctx.createLinearGradient(-10,0,10,0);
    metal.addColorStop(0,'#31244e');metal.addColorStop(.28,'#c9bdf0');
    metal.addColorStop(.52,'#f4ecff');metal.addColorStop(.78,'#7c69ac');metal.addColorStop(1,'#251a3e');
    ctx.fillStyle=metal;
    ctx.beginPath();ctx.moveTo(-9,6);ctx.lineTo(-6.5,-32);ctx.lineTo(6.5,-32);ctx.lineTo(9,6);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(-6.5,-31);ctx.lineTo(6.5,-31);ctx.stroke();
    ctx.restore();
    const glow=ctx.createRadialGradient(cx,cy+6,2,cx,cy+6,38);
    glow.addColorStop(0,'rgba(206,160,255,.55)');glow.addColorStop(1,'rgba(120,50,210,0)');
    ctx.fillStyle=glow;ctx.beginPath();ctx.ellipse(cx,cy+8,38,22,0,0,TAU);ctx.fill();
    ctx.strokeStyle='rgba(226,208,255,.8)';ctx.lineWidth=3;
    ctx.beginPath();ctx.ellipse(cx,cy+9,23,12,0,0,TAU);ctx.stroke();
    ctx.strokeStyle='rgba(120,80,190,.85)';ctx.lineWidth=5;
    ctx.beginPath();ctx.ellipse(cx,cy+9,23,12,0,Math.PI,TAU);ctx.stroke();
  }
  function scoreStrip(){
    if(!display)return;
    ctx.save();
    ctx.fillStyle='rgba(12,5,29,.88)';
    ctx.beginPath();ctx.roundRect(10,5,W-20,29,9);ctx.fill();
    ctx.strokeStyle='rgba(200,150,255,.34)';ctx.lineWidth=1;ctx.stroke();
    const active1=display.turn===1&&!display.over,active2=display.turn===2&&!display.over;
    ctx.font='700 13px system-ui,sans-serif';
    ctx.textAlign='left';ctx.fillStyle=active1?seatColours[0]:'rgba(226,208,255,.62)';
    ctx.fillText(label('P1','玩家1')+' '+display.score1,20,25);
    ctx.textAlign='right';ctx.fillStyle=active2?seatColours[1]:'rgba(226,208,255,.62)';
    ctx.fillText(display.score2+' '+label('P2','玩家2'),W-20,25);
    ctx.textAlign='center';ctx.fillStyle='rgba(226,208,255,.8)';ctx.font='600 11px system-ui,sans-serif';
    ctx.fillText(label('ROUND','回合')+' '+display.moves+'/'+display.limit,W/2,25);
    ctx.restore();
  }
  function hit(p){
    if(!display)return false;
    for(let i=0;i<N;i++)if(display.cells[i]){
      const g=GRID[i];
      if(Math.hypot(g.x-p.x,g.y+display.ceiling+TOP-p.y)<R*2-1)return true;
    }
    return false;
  }
  function advance(p,step){
    p.x+=p.vx*step;p.y+=p.vy*step;
    if(p.x<R||p.x>W-R){p.x=p.x<R?2*R-p.x:2*(W-R)-p.x;p.vx*=-1;}
  }
  function draw(){
    if(!backdrop)backdrop=makeBackdrop();
    ctx.globalAlpha=1;ctx.drawImage(backdrop,0,0);
    if(display){
      for(let i=0;i<N;i++)if(display.cells[i])orb(GRID[i].x,GRID[i].y+display.ceiling+TOP,display.cells[i]);
    }
    for(const effect of effects){
      const alpha=Math.min(1,effect.life/12);
      if(effect.falling){
        ctx.globalAlpha=alpha*.3;ctx.fillStyle=effect.colour;
        ctx.beginPath();ctx.arc(effect.x,effect.y-8,3.2,0,TAU);ctx.fill();
      }else{
        ctx.globalAlpha=alpha*.42;ctx.strokeStyle=effect.colour;ctx.lineWidth=2.4;
        ctx.beginPath();ctx.arc(effect.x,effect.y,R*(2.25-effect.scale*.9),0,TAU);ctx.stroke();
      }
      ctx.globalAlpha=alpha;orb(effect.x,effect.y,effect.colour,R*effect.scale);
    }
    ctx.globalAlpha=1;
    const ready=display&&!flight&&display.up&&!display.over&&ui.canPlay?.();
    if(ready){
      const preview={x:W/2,y:LAUNCH_Y,vx:Math.cos(aim),vy:Math.sin(aim)};
      for(let i=0;i<28;i++){
        advance(preview,13);
        if(preview.y<R+display.ceiling+TOP||hit(preview))break;
        const fade=1-i/32;
        ctx.globalAlpha=.16*fade;ctx.fillStyle=display.up;
        ctx.beginPath();ctx.arc(preview.x,preview.y,6,0,TAU);ctx.fill();
        ctx.globalAlpha=.95*fade;ctx.fillStyle='#ffffff';
        ctx.beginPath();ctx.arc(preview.x,preview.y,1.7,0,TAU);ctx.fill();
      }
      ctx.globalAlpha=1;
    }
    launcher(aim);
    if(flight)orb(flight.x,flight.y,flight.colour);
    else if(display?.up)orb(W/2,LAUNCH_Y,display.up);
    if(display?.next){
      ctx.globalAlpha=.55;ctx.fillStyle='#9a5fe0';
      ctx.beginPath();ctx.ellipse(W/2-42,LAUNCH_Y+14,13,5,0,0,TAU);ctx.fill();
      ctx.globalAlpha=1;orb(W/2-42,LAUNCH_Y+3,display.next,12);
    }
    ctx.globalAlpha=1;
    scoreStrip();
    if(display?.over){
      ctx.fillStyle='rgba(10,4,24,.93)';ctx.fillRect(0,H/2-52,W,104);
      ctx.strokeStyle='rgba(200,150,255,.38)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(0,H/2-52);ctx.lineTo(W,H/2-52);ctx.moveTo(0,H/2+52);ctx.lineTo(W,H/2+52);ctx.stroke();
      ctx.textAlign='center';ctx.fillStyle='#f4ecff';ctx.font='700 26px system-ui,sans-serif';
      ctx.fillText(display.winner?label('P'+display.winner+' wins!','玩家'+display.winner+' 获胜！'):label('Draw!','平局！'),W/2,H/2+2);
      ctx.font='500 14px system-ui,sans-serif';ctx.fillStyle='rgba(226,208,255,.8)';
      ctx.fillText(display.score1+' : '+display.score2,W/2,H/2+28);
      ctx.textAlign='left';
    }
  }
  function popEffects(snapshot){
    const slot=snapshot.lastSlot;
    if(slot<0||slot>=N)return;
    const g=GRID[slot],y=g.y+snapshot.ceiling+TOP,colour=colourOf(board.cells[S_COLOUR])||'#ffffff';
    effects.push({x:g.x,y,colour,life:16,scale:1,falling:false,velocity:0});
    const count=Math.min(10,snapshot.lastMatch+snapshot.lastFloat);
    for(let i=0;i<count;i++){
      const angle=i/count*TAU;
      effects.push({x:g.x+Math.cos(angle)*16,y:y+Math.sin(angle)*16,colour,life:14+i,scale:.8,falling:false,velocity:0});
    }
    if(snapshot.lastPoints>0)effects.push({x:g.x,y,colour:'#ffffff',life:22,scale:1.35,falling:false,velocity:0});
  }
  function endFlight(){
    flight=null;
    display=readBoard(board);
    if(display)popEffects(display);
    refreshStatus();
  }
  function tick(){
    if(!running)return;
    if(flight){
      for(let step=0;flight&&step<6;step++){
        advance(flight,4);
        flight.steps++;
        if(flight.y<=flight.targetY||flight.steps>360)endFlight();
      }
    }
    for(const effect of effects){
      effect.life--;
      if(effect.falling){effect.velocity+=.42;effect.y+=effect.velocity;}
      else effect.scale*=.87;
    }
    effects=effects.filter(effect=>effect.life>0&&effect.y<H+R);
    draw();
    frame=requestAnimationFrame(tick);
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
    const shotCode=next.cells[S_ANGLE],shotColour=next.cells[S_COLOUR],slot=next.cells[S_SLOT];
    const canAnimate=previous&&next.moves>previous.moves&&shotColour>0&&slot>=0&&slot<N&&running;
    if(canAnimate){
      const a=decodeAngle(shotCode);
      flight={x:W/2,y:LAUNCH_Y,vx:Math.cos(a),vy:Math.sin(a),colour:colourOf(shotColour),
        targetY:GRID[slot].y+next.cells[S_CEIL]*ROW+TOP,steps:0};
      effects=[];
    }else{
      flight=null;display=readBoard(next);
    }
    refreshStatus();
  }
  const fire=()=>{
    if(!running||flight||!ui.canPlay?.())return;
    ui.onShoot?.(encodeAngle(aim));
  };
  function target(event){
    const p=point(event);
    aim=Math.max(-Math.PI+.16,Math.min(-.16,Math.atan2(Math.min(-1,p.y-LAUNCH_Y),p.x-W/2)));
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
  return{
    stop(){running=false;flight=null;cancelAnimationFrame(frame);frame=0;},
    start(){
      if(running)return;
      running=true;ui.action.disabled=false;
      ui.action.textContent=label('Fire','发射');
      if(!frame)frame=requestAnimationFrame(tick);
      refreshStatus();
    },
    refresh(){ui.action.textContent=label('Fire','发射');refreshStatus();},
    applyBoard,
    state(){return board?{moves:board.moves,turn:board.turn,over:board.over,score:[board.cells[S_SCORE1],board.cells[S_SCORE2]]}:null;},
    reset(){appliedKey='';flight=null;effects=[];board=ui.board?.()||null;display=readBoard(board);}
  };
}
