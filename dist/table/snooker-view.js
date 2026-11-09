import {colours,radius,placeCue,snookerTargets} from './snooker.js?v=20261109-snooker3';
import {snookerStart,viewState,NOM_BASE} from './snooker-duel.js?v=20261109-snookerlive1';
import {POOL_HOLES} from './pool-geometry.js';
import {drawPoolBall} from './pool-ball.js';
import {drawCue} from './pool-cue.js';
import {poolImpact} from './pool-audio.js?v=20261106-ui2';

const PADX=58,PADY=44,W=1000+PADX*2,H=500+PADY*2;
const cueAngle=(x,y,tx,ty)=>Math.atan2(ty-y,tx-x);
const SPHERES=[colours[0],colours[1],colours[2],colours[3],colours[4],colours[5],colours[6],colours[7]];
export function createSnooker(ui){
  const {canvas,ctx,point,label}=ui;
  canvas.width=W;canvas.height=H;
  let state=viewState(snookerStart()),angle=0,playing=false,busy=false,computer=false,pull=null,frame=0,timer=0,busyTimer=0,appliedKey=null,awaitingShot=false;
  const colour=id=>id===0?0:id<=6?id+1:1;
  function circle(x,y,r,fill){
    ctx.fillStyle=fill;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  }
  function line(x,y,tx,ty,fill,width){
    ctx.strokeStyle=fill;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(tx,ty);ctx.stroke();
  }
  // The same sphere painter / lighting as the main pool game, with solid
  // snooker colours and no number patches.
  function ball(id,x,y){
    drawPoolBall(ctx,colour(id),x,y,radius,0,0,null,{x:500,y:240},{plain:true,palette:SPHERES});
  }
  const background=document.createElement('canvas');
  background.width=W;background.height=H;
  function table(){
    const c=background.getContext('2d');
    c.clearRect(0,0,W,H);
    // Wooden rail: soft cast shadow, warm bevel, dark inlay line.
    c.save();c.shadowColor='#000b';c.shadowBlur=30;c.shadowOffsetY=13;
    const wood=c.createLinearGradient(0,0,0,H);
    wood.addColorStop(0,'#c59259');wood.addColorStop(.1,'#97663b');wood.addColorStop(.46,'#5c3720');
    wood.addColorStop(.86,'#7d4d2d');wood.addColorStop(1,'#bb8751');
    c.fillStyle=wood;c.beginPath();c.roundRect(3,3,W-6,H-6,28);c.fill();c.restore();
    c.strokeStyle='#f7d9a666';c.lineWidth=2;c.beginPath();c.roundRect(5,5,W-10,H-10,26);c.stroke();
    c.strokeStyle='#180d0755';c.lineWidth=3;c.beginPath();c.roundRect(11,11,W-22,H-22,21);c.stroke();
    c.strokeStyle='#dcb67333';c.lineWidth=1;c.beginPath();c.roundRect(16,16,W-32,H-32,17);c.stroke();
    // Recessed well under the cushions.
    c.fillStyle='#0b1d12';c.beginPath();c.roundRect(PADX-22,PADY-22,1044,544,10);c.fill();
    // Cloth with a broad overhead lamp and a fine woven nap.
    c.save();c.beginPath();c.rect(PADX-9,PADY-9,1018,518);c.clip();
    const cloth=c.createRadialGradient(PADX+500,PADY+200,20,PADX+500,PADY+250,690);
    cloth.addColorStop(0,'#4e9d4d');cloth.addColorStop(.56,'#2e7a39');cloth.addColorStop(1,'#154627');
    c.fillStyle=cloth;c.fillRect(PADX-9,PADY-9,1018,518);
    for(let i=0;i<11000;i++){
      c.fillStyle=i%2?'#dcf8c20b':'#041a0d0c';
      c.fillRect(PADX+(i*233.17)%1000,PADY+(i*97.31)%500,3,1);
    }
    c.restore();
    // Six cushions, split at the pocket jaws.
    const rail=(x,y,w,h,vertical)=>{
      const g=vertical?c.createLinearGradient(x,0,x+w,0):c.createLinearGradient(0,y,0,y+h);
      g.addColorStop(0,'#0d2717');g.addColorStop(.24,'#2b6b36');g.addColorStop(.52,'#408f49');
      g.addColorStop(.8,'#225b2e');g.addColorStop(1,'#0b2013');
      c.fillStyle=g;c.fillRect(x,y,w,h);
      c.fillStyle='#c7e6ac22';c.fillRect(x+(vertical?w-2:2),y+(vertical?2:1),vertical?2:w-4,vertical?h-4:1.5);
    };
    rail(PADX+42,PADY-15,416,15,false);rail(PADX+542,PADY-15,416,15,false);
    rail(PADX+42,PADY+500,416,15,false);rail(PADX+542,PADY+500,416,15,false);
    rail(PADX-15,PADY+42,15,416,true);rail(PADX+1000,PADY+42,15,416,true);
    // Pockets: brass lip, recessed well and a soft inner shadow.
    for(const [x,y] of POOL_HOLES){
      const px=PADX+x,py=PADY+y;
      c.save();c.shadowColor='#0009';c.shadowBlur=9;
      c.fillStyle='#40301d';c.beginPath();c.arc(px,py,20,0,Math.PI*2);c.fill();c.restore();
      const well=c.createRadialGradient(px-4,py-5,1,px,py,17);
      well.addColorStop(0,'#22271e');well.addColorStop(.5,'#0c110d');well.addColorStop(1,'#020503');
      c.fillStyle=well;c.beginPath();c.arc(px,py,16.5,0,Math.PI*2);c.fill();
      c.strokeStyle='#b6c7a355';c.lineWidth=1.4;c.beginPath();c.arc(px,py,18,0,Math.PI*2);c.stroke();
    }
    // Pearl sights along the wooden rail.
    const sight=(x,y)=>{
      c.save();c.translate(x,y);c.rotate(Math.PI/4);
      c.fillStyle='#0b1520aa';c.fillRect(-3.6,-3.6,7.8,7.8);
      const pearl=c.createRadialGradient(-1,-1,.3,0,0,4);
      pearl.addColorStop(0,'#fffdf0');pearl.addColorStop(.6,'#dfeadb');pearl.addColorStop(1,'#9db7a9');
      c.fillStyle=pearl;c.fillRect(-3,-3,6,6);c.restore();
    };
    for(let i=1;i<8;i++){const x=PADX+i*125;sight(x,PADY-31);sight(x,PADY+531);}
    for(let i=1;i<4;i++){const y=PADY+i*125;sight(PADX-31,y);sight(PADX+1031,y);}
    // Baulk line, D and the six colour spots.
    c.strokeStyle='#e2f3d47a';c.lineWidth=1.6;
    c.beginPath();c.moveTo(PADX+260,PADY+8);c.lineTo(PADX+260,PADY+492);c.stroke();
    c.beginPath();c.arc(PADX+260,PADY+250,80,Math.PI/2,Math.PI*1.5);c.stroke();
    for(const [x,y] of [[260,250],[500,250],[752,250],[918,250],[260,170],[260,330]]){
      c.fillStyle='#e8f5d955';c.beginPath();c.arc(PADX+x,PADY+y,2.6,0,Math.PI*2);c.fill();
    }
  }
  table();
  function draw(cells=state.cells){
    ctx.clearRect(0,0,W,H);ctx.drawImage(background,0,0);
    ctx.save();ctx.translate(PADX,PADY);
    if(playing&&!busy&&!state.over&&!state.inHand){
      const x=cells[0]/10,y=cells[1]/10,dx=Math.cos(angle),dy=Math.sin(angle);
      let end=Math.min(dx>0?(1000-x)/dx:dx<0?-x/dx:Infinity,dy>0?(500-y)/dy:dy<0?-y/dy:Infinity);
      for(let i=1;i<22;i++)if(cells[i*3+2]){
        const ax=cells[i*3]/10-x,ay=cells[i*3+1]/10-y,t=ax*dx+ay*dy,perpendicular=ax*ax+ay*ay-t*t;
        if(t>0&&perpendicular<(radius*2)**2)end=Math.min(end,Math.max(0,t-Math.sqrt((radius*2)**2-perpendicular)));
      }
      ctx.setLineDash([5,7]);line(x,y,x+dx*end,y+dy*end,'#f3ffdfbd',1.4);ctx.setLineDash([]);
      ctx.strokeStyle='#f3ffdf88';ctx.lineWidth=1.3;
      ctx.beginPath();ctx.arc(x+dx*end,y+dy*end,radius,0,Math.PI*2);ctx.stroke();
      // The same tapered wooden cue used by the main pool game.
      drawCue(ctx,[cells[0],cells[1]],angle*1800/Math.PI,pull?Number(ui.power.value)*.45:0);
    }
    for(let i=0;i<22;i++)if(cells[i*3+2])ball(i,cells[i*3]/10,cells[i*3+1]/10);
    ctx.restore();
  }
  function refresh(){
    const names=[label('Yellow','黄球'),label('Green','绿球'),label('Brown','棕球'),label('Blue','蓝球'),label('Pink','粉球'),label('Black','黑球')];
    const target=state.on==='red'?label('Red','红球'):state.on==='colour'?label('Colour','彩球'):names[state.on-1];
    const turn=computer?(state.turn===1?label('You','你'):label('Computer','电脑')):label('Player ','玩家 ')+state.turn;
    ui.status(state.scores.join(' : ')+'  ·  '+turn+'  ·  '+(state.inHand?label('Place the cue ball in the D','在 D 区摆放白球'):target)+'  ·  '+label('Break','单杆')+' '+state.breakScore+(state.penalty?'  ·  '+label('Foul','犯规')+' +'+state.penalty:''));
    ui.state?.(state);
    ui.action.disabled=!human();
    ui.nomination.closest('label').hidden=!human()||state.on!=='colour';
    const selected=ui.nomination.value;
    ui.nomination.replaceChildren(new Option(label('From aim','按瞄准判断'),'0'),
      ...snookerTargets(state).filter(id=>id<=6).map(id=>new Option(names[id-1],String(id))));
    ui.nomination.value=Array.from(ui.nomination.options).some(option=>option.value===selected)?selected:'0';
  }
  function shoot(power,nomination=Number(ui.nomination.value)||0){
    if(!human()||!Number.isFinite(power))return;
    power=Math.round(Math.min(100,Math.max(5,power)));
    const command=(nomination||0)*NOM_BASE+power*3600+(Math.round(angle*1800/Math.PI)+3600)%3600;
    busy=true;awaitingShot=true;refresh();poolImpact('cue',power/100);
    clearTimeout(busyTimer);
    /* If the local/room pipeline rejects the shot, never leave the table
       frozen: release the input lock after a short grace period. A successful
       board update cancels this timer and takes over with the replay. */
    busyTimer=setTimeout(()=>{if(awaitingShot){awaitingShot=false;busy=false;refresh();draw();}},3000);
    ui.onShoot(command);
  }
  /* Authoritative board == the only source of truth. Local play and hosted
     rooms both hand the same cells/history here; the replay is purely visual. */
  function applyBoard(next){
    if(!next||!next.cells)return;
    const key=(next.shotCommand??'-')+':'+(next.moves??0);
    if(key===appliedKey)return;
    appliedKey=key;awaitingShot=false;
    clearTimeout(busyTimer);cancelAnimationFrame(frame);
    const target=viewState(next),frames=next.history||[];
    const finish=()=>{
      state=target;busy=false;ui.nomination.value='0';refresh();draw();
      if(state.over)ui.finish(label('Player ','玩家 ')+state.winner+label(' wins!',' 获胜！')+' · '+state.scores.join(' : '));
    };
    if(frames.length>1){
      busy=true;refresh();
      const started=performance.now();
      const replay=now=>{
        const index=Math.max(0,Math.floor((now-started)/16));
        if(index<frames.length){
          const current=frames[index];
          if(typeof current!=='string'){finish();return;}
          const values=current.split(',').map(Number);
          if(values.length>=66)draw(values);
          frame=requestAnimationFrame(replay);return;
        }
        finish();
      };
      frame=requestAnimationFrame(replay);
    }else finish();
  }
  const human=()=>playing&&!busy&&!state.over&&!state.inHand&&!!ui.canPlay?.();
  const pullDistance=p=>(pull.x-p.x)*Math.cos(angle)+(pull.y-p.y)*Math.sin(angle);
  const dragPower=distance=>Math.round(Math.min(100,Math.max(5,distance*.7)));
  const toTable=p=>({x:p.x-PADX,y:p.y-PADY});
  canvas.onpointermove=event=>{
    if(!human()||state.inHand)return;
    const p=point(event);
    if(pull){
      if(event.pointerId!==pull.id)return;
      ui.power.value=dragPower(pullDistance(p));
    }
    else{const t=toTable(p);angle=cueAngle(state.cells[0]/10,state.cells[1]/10,t.x,t.y);}
    draw();
  };
  canvas.onpointerdown=event=>{
    if(!human()||pull||event.button!==0)return;
    const p=point(event),t=toTable(p);
    if(state.inHand){if(placeCue(state,t.x,t.y)){refresh();draw();}return;}
    angle=cueAngle(state.cells[0]/10,state.cells[1]/10,t.x,t.y);pull={...p,id:event.pointerId};canvas.setPointerCapture(event.pointerId);draw();
  };
  canvas.onpointerup=event=>{
    if(!pull||event.pointerId!==pull.id)return;
    const distance=pullDistance(point(event));
    pull=null;
    if(distance>6&&human()){
      ui.power.value=dragPower(distance);
      shoot(Number(ui.power.value));
    }else draw();
  };
  canvas.onpointercancel=canvas.onlostpointercapture=event=>{
    if(pull?.id===event.pointerId){pull=null;draw();}
  };
  ui.action.onclick=()=>{if(human())shoot(Number(ui.power.value));};
  draw();refresh();
  return {refresh,applyBoard,stop(){playing=false;pull=null;busy=false;awaitingShot=false;cancelAnimationFrame(frame);clearTimeout(timer);clearTimeout(busyTimer);},start(withBot){
    cancelAnimationFrame(frame);clearTimeout(timer);clearTimeout(busyTimer);
    computer=withBot;appliedKey=null;busy=false;awaitingShot=false;pull=null;playing=true;angle=0;
    state=viewState(ui.board?.()||snookerStart());
    // Point the cue at the red rack by default, so the Shoot button is useful
    // even before the player drags to aim (angle 0 used to be an instant foul).
    angle=cueAngle(state.cells[0]/10,state.cells[1]/10,790,250);
    ui.nomination.value='0';refresh();draw();
  },state(){return state;}};
}
