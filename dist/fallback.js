import {FlightTrails} from './flight-trails.js';
// Fixed-camera 2.5D renderer. Rule coordinates are owned exclusively by engine.js.
// All board geometry, contact shadows, movement and particles share this projection.
import {TRACK,HOMES,coord,FINISH} from './engine.js';
import {MATERIALS} from './palette.js';
import {AIRPORT_SIZE,GROUND_CENTER,groundPoint,groundScale} from './ground-projection.js';
const COLORS=MATERIALS.map(m=>m.base);
const MARKERS=MATERIALS.map(m=>m.marker);
const BASES=[[-3.58,-3.58],[3.58,-3.58],[3.58,3.58],[-3.58,3.58]];
const TAU=Math.PI*2;
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>t*t*(3-2*t);
const point=([x,z])=>({x:(x-7)*.72,y:.39,z:(z-7)*.72});
function position(color,piece,progress){
 // groundY belongs only to rendering: it anchors the shadow to the receiving surface.
 if(progress<0)return{x:BASES[color][0]+(piece?.78:-.78),y:.66,z:BASES[color][1]+.06,groundY:.54};
 if(progress>=FINISH)return{x:(color%2?1:-1)*(.25+piece*.28),y:.48,z:color<2?-.3:.3,groundY:.43};
 return {...point(coord(color,progress)),groundY:.32};
}
function shade(hex,amount){const n=parseInt(hex.slice(1),16);return `rgb(${[16,8,0].map(s=>Math.max(0,Math.min(255,((n>>s)&255)+amount))).join(',')})`;}
function roundedPoints(x,z,w,d,r){const points=[];for(const [cx,cz,start] of [[x+w/2-r,z-d/2+r,-Math.PI/2],[x+w/2-r,z+d/2-r,0],[x-w/2+r,z+d/2-r,Math.PI/2],[x-w/2+r,z-d/2+r,Math.PI]])for(let i=0;i<=7;i++){const a=start+i*Math.PI/14;points.push({x:cx+Math.cos(a)*r,z:cz+Math.sin(a)*r});}return points;}

function chamferPoints(x,z,w,d,cut){const l=x-w/2,r=x+w/2,t=z-d/2,b=z+d/2;return[{x:l+cut,z:t},{x:r-cut,z:t},{x:r,z:t+cut},{x:r,z:b-cut},{x:r-cut,z:b},{x:l+cut,z:b},{x:l,z:b-cut},{x:l,z:t+cut}];}
function tint(hex,amount){const n=parseInt(hex.slice(1),16);return `rgb(${[16,8,0].map(s=>Math.round(lerp((n>>s)&255,255,amount))).join(',')})`;}
export class CanvasBoard{
 constructor(wrap,onSelect,{reduced=false}={}){
  this.wrap=wrap;this.onSelect=onSelect;this.reduced=reduced;this.mode='illustrated';wrap.dataset.renderer='illustrated';
  this.canvas=document.createElement('canvas');this.canvas.setAttribute('aria-label','Flight Party board. Raised route tiles, two planes per player. Select a highlighted plane or use the plane buttons.');wrap.append(this.canvas);this.ctx=this.canvas.getContext('2d');
  this.planes=[];this.keys=[];this.anims=[];this.effects=[];this.trails=[];this.shake=0;this.art={};this.sprites={};this.generation=0;
  for(const [key,file] of Object.entries({plane0:'plane-blue.png',plane1:'plane-orange.png',plane2:'plane-green.png',plane3:'plane-red.png',world:'airport-island-v5.png',ocean:'ocean-water-v5.png',cloud:'cloud-bank.png',smoke:'smoke-puff.png'})){
   const img=new Image();img.onload=()=>{this.boardCache=null;const max=key==='cloud'?768:['world','ocean'].includes(key)?0:320;if(max){const sprite=document.createElement('canvas');sprite.width=max;sprite.height=Math.round(max*img.naturalHeight/img.naturalWidth);sprite.getContext('2d').drawImage(img,0,0,sprite.width,sprite.height);this.sprites[key]=sprite;}if(key==='world')this.islandSprite=this.featherIsland(img);};img.src='assets/'+file;this.art[key]=img;
  }
  this.ro=new ResizeObserver(()=>this.resize());this.ro.observe(wrap);
  this.canvas.addEventListener('pointerup',e=>{const r=this.canvas.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;for(const p of [...this.planes].sort((a,b)=>b.z-a.z)){const a=this.project(p),k=this.depth(p.z);if(this.keys.includes(`${p.color}:${p.piece}`)&&Math.hypot(a.x-x,a.y-this.scale*.28*k-y)<this.scale*.74*k){this.onSelect(p.piece);return;}}});
  this.resize();this.frame=this.frame.bind(this);requestAnimationFrame(this.frame);
 }
 resize(){const w=this.wrap.clientWidth,h=this.wrap.clientHeight;if(!w||!h){this.w=0;this.h=0;return;}this.w=w;this.h=h;this.dpr=Math.min(devicePixelRatio,2);this.canvas.width=w*this.dpr;this.canvas.height=h*this.dpr;this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);this.boardCache=null;
  // One calibrated ground plane: resizing changes scale only, never its camera angle.
  this.scale=Math.min(w/15,h/11.8);this.pitch=.76;const r=this.worldRect();this.cx=r.x+GROUND_CENTER.u*r.width;this.cy=r.y+GROUND_CENTER.v*r.height;
 }
 worldRect(){const width=AIRPORT_SIZE.width*this.scale,height=AIRPORT_SIZE.height*this.scale;return{x:(this.w-width)/2,y:(this.h-height)/2,width,height};}
 depth(z=0){return groundScale(z);}
 project(p){const g=groundPoint(p.x,p.z),k=this.depth(p.z);return{x:this.cx+(g.u-GROUND_CENTER.u)*AIRPORT_SIZE.width*this.scale,y:this.cy+(g.v-GROUND_CENTER.v)*AIRPORT_SIZE.height*this.scale-p.y*this.scale*k};}
 setGame(game){this.cosmeticTrails??=new FlightTrails();this.cosmeticTrails.clear();this.generation++;for(const a of this.anims)a.resolve();this.anims=[];this.effects=[];this.trails=[];this.shake=0;this.game=game;this.planes=[];for(const p of game.active)for(let i=0;i<2;i++)this.planes.push({...position(p.color,i,p.pieces[i]),color:p.color,piece:i,heading:0,spin:0,squash:0,air:0,shock:0});this.keys=[];}
 sync(game){this.game=game;for(const p of this.planes)Object.assign(p,position(p.color,p.piece,game.players[p.color].pieces[p.piece]),{spin:0,squash:0,air:0,shock:0});}
 setSelectable(keys){this.keys=keys;}
 featherIsland(img){
  // Blend only the outer sea pixels into the larger ocean, leaving roads and land opaque.
  const out=document.createElement('canvas');out.width=img.naturalWidth;out.height=img.naturalHeight;const c=out.getContext('2d'),w=out.width,h=out.height;c.drawImage(img,0,0);
  c.globalCompositeOperation='destination-in';
  const horizontal=c.createLinearGradient(0,0,w,0);horizontal.addColorStop(0,'#0000');horizontal.addColorStop(.024,'#000');horizontal.addColorStop(.976,'#000');horizontal.addColorStop(1,'#0000');c.fillStyle=horizontal;c.fillRect(0,0,w,h);
  const vertical=c.createLinearGradient(0,0,0,h);vertical.addColorStop(0,'#0000');vertical.addColorStop(.025,'#000');vertical.addColorStop(.975,'#000');vertical.addColorStop(1,'#0000');c.fillStyle=vertical;c.fillRect(0,0,w,h);return out;
 }
 tween(ms,update){if(this.reduced){update(1);return Promise.resolve();}return new Promise(resolve=>this.anims.push({ms,update,resolve,start:performance.now()}));}
 puff(p,size=.35,life=850,seed=0){if(this.reduced)return;this.effects.push({kind:'smoke',x:p.x,y:p.y,z:p.z,size,life,start:performance.now(),seed});}
 async move(result,onBump){
  this.keys=[];const gen=this.generation,p=this.planes.find(p=>p.color===result.color&&p.piece===result.piece);if(!p)return;
  if(this.reduced){Object.assign(p,position(p.color,p.piece,result.to));for(const v of result.captured)Object.assign(this.planes.find(q=>q.color===v.color&&q.piece===v.piece),position(v.color,v.piece,-1));if(result.captured.length)onBump?.(this.project(p));return;}
  p.air=1;const count=result.to-result.from;
  for(let step=result.from+1;step<=result.to;step++){
   const end=position(p.color,p.piece,step),start={...p};p.heading=end.x<start.x?1:0;
   if(step===result.from+1)this.puff({...p,y:p.y-.05},.48,650,step);
   await this.tween(Math.max(100,Math.min(175,1250/count)),t=>{const e=ease(t);p.x=lerp(start.x,end.x,e);p.z=lerp(start.z,end.z,e);p.groundY=lerp(start.groundY,end.groundY,e);p.y=lerp(start.y,end.y,e)+Math.sin(t*Math.PI)*.14;p.spin=Math.sin(t*Math.PI)*.035*(p.heading?-1:1);const owner=this.game?.players?.[p.color];if(owner?.member)this.cosmeticTrails.emit(owner.flightTrail,`${p.color}:${p.piece}`,p,performance.now(),this.reduced);});
   if(gen!==this.generation)return;
  }
  p.air=0;p.spin=0;
  if(result.captured.length){
   const impact={x:p.x,y:p.y+.12,z:p.z};
   const victims=result.captured.map(v=>this.planes.find(q=>q.color===v.color&&q.piece===v.piece));
   const direction=p.heading?-1:1;p.x-=direction*.21;
   for(const q of victims){q.x+=direction*.18;q.squash=.4;q.shock=1;}
   onBump?.(this.project(impact));this.shake=5;
   this.effects.push({...impact,kind:'impact',start:performance.now(),life:1250});
   for(let i=0;i<7;i++){const angle=i*TAU/7;this.puff({x:impact.x-direction*.32+Math.cos(angle)*.48,y:.48,z:impact.z+.1+Math.sin(angle)*.34},.76+(i%3)*.12,1150+i*45,i);}
   await this.tween(110,t=>{p.squash=Math.sin(t*Math.PI)*.35;});if(gen!==this.generation)return;
   await Promise.all(victims.map(async(q,index)=>{
    const start={...q},end=position(q.color,q.piece,-1),side=(end.x>=start.x?1:-1);
    const trail={points:[],start:performance.now(),life:1900};this.trails.push(trail);let emitted=-1;
    await this.tween(1370,t=>{
     const e=1-Math.pow(1-t,1.35);q.x=lerp(start.x,end.x,e)+Math.sin(t*Math.PI)*side*.35;q.z=lerp(start.z,end.z,e);q.groundY=lerp(start.groundY,end.groundY,e);q.y=lerp(start.y,end.y,e)+Math.sin(t*Math.PI)*2.15;
     q.spin=side*(Math.sin(t*Math.PI)*.75+t*TAU);q.squash=.32*Math.max(0,1-t*5);q.air=1;
     const tick=Math.floor(t*24);if(tick!==emitted){emitted=tick;trail.points.push({x:q.x,y:q.y,z:q.z});this.puff(q,.43+.14*t,1000,tick+index*7);}
    });
    if(gen!==this.generation)return;q.spin=0;q.shock=0;
    this.puff({...end,y:end.y-.15},.6,600,index);
    await this.tween(180,t=>{q.y=end.y+Math.sin(t*Math.PI)*.11;q.squash=Math.sin(t*Math.PI)*.22;});q.air=0;q.squash=0;Object.assign(q,end);
   }));
   if(gen!==this.generation)return;Object.assign(p,position(p.color,p.piece,result.to));
  }else await this.tween(130,t=>{p.squash=Math.sin(t*Math.PI)*.17;});
  p.squash=0;
 }
 polygon(points,y,dx=0,dy=0){const c=this.ctx;c.beginPath();points.forEach((p,i)=>{const a=this.project({...p,y});if(i)c.lineTo(a.x+dx,a.y+dy);else c.moveTo(a.x+dx,a.y+dy);});c.closePath();}
 surface(x,z,w,d,r,y,fill,chamfer=false){const c=this.ctx;this.polygon((chamfer?chamferPoints:roundedPoints)(x,z,w,d,r),y);c.fillStyle=fill;c.fill();}
 solid(x,z,w,d,r,bottom,top,color,{ivory=false,shadow=true,chamfer=false,bevel=.045}={}){
  const c=this.ctx,s=this.scale,outline=(chamfer?chamferPoints:roundedPoints)(x,z,w,d,r),a=this.project({x:x-w/2,y:top,z:z-d/2}),b=this.project({x:x+w/2,y:top,z:z+d/2});
  if(shadow){c.save();c.shadowColor='#473a3170';c.shadowBlur=s*.095;c.shadowOffsetX=s*.055;c.shadowOffsetY=s*.11;this.polygon(outline,bottom);c.fillStyle='#57422c55';c.fill();c.restore();}
  // Draw real projected vertical walls, then the bevel and its inset top.
  for(let i=0;i<outline.length;i++){
   const p=outline[i],q=outline[(i+1)%outline.length],pa=this.project({...p,y:top}),qa=this.project({...q,y:top}),pb=this.project({...p,y:bottom}),qb=this.project({...q,y:bottom});
   c.beginPath();c.moveTo(pa.x,pa.y);c.lineTo(qa.x,qa.y);c.lineTo(qb.x,qb.y);c.lineTo(pb.x,pb.y);c.closePath();
   const side=c.createLinearGradient(pa.x,Math.min(pa.y,qa.y),pb.x,Math.max(pb.y,qb.y)+1);const facet=(q.z-p.z)>.001?-15:(q.x-p.x)<-.001?-4:8;side.addColorStop(0,ivory?'#e6dfd0':shade(color,-17+facet));side.addColorStop(1,ivory?'#aaa498':shade(color,-49+facet));c.fillStyle=side;c.fill();
  }
  const edge=c.createLinearGradient(a.x,a.y,b.x,b.y);edge.addColorStop(0,ivory?'#ffffff':tint(color,.48));edge.addColorStop(.48,ivory?'#f5f0e5':tint(color,.14));edge.addColorStop(1,ivory?'#c4bbab':shade(color,-32));this.surface(x,z,w,d,r,top,edge,chamfer);
  const inset=Math.min(bevel,w*.06),topGrad=c.createLinearGradient(a.x,a.y,b.x*.25+a.x*.75,b.y);topGrad.addColorStop(0,ivory?'#fffdf8':tint(color,.10));topGrad.addColorStop(.55,ivory?'#f7f3ea':color);topGrad.addColorStop(1,ivory?'#ece6da':shade(color,-8));this.surface(x,z,w-inset*2,d-inset*2,Math.max(.02,r-inset*.45),top+.012,topGrad,chamfer);
 }
 ellipse(x,z,rx,rz,y,fill,stroke=null,width=1){const c=this.ctx;const points=[];for(let i=0;i<48;i++){const a=i*TAU/48;points.push({x:x+Math.cos(a)*rx,z:z+Math.sin(a)*rz});}this.polygon(points,y);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
 pad(ci){
  const c=this.ctx,s=this.scale,[x,z]=BASES[ci],col=COLORS[ci];
  this.solid(x,z,3.38,3.35,.39,.10,.24,'#efe7d9',{ivory:true,chamfer:true,bevel:.055});
  this.solid(x,z,3.24,3.20,.37,.24,.31,MATERIALS[ci].side,{chamfer:true,shadow:false,bevel:.025});
  this.solid(x,z,3.17,3.13,.36,.31,.53,col,{chamfer:true,shadow:false,bevel:.075});
  this.polygon(chamferPoints(x,z,2.98,2.94,.30),.55);c.strokeStyle=MATERIALS[ci].edge;c.lineWidth=s*.018;c.lineJoin='miter';c.stroke();
  this.polygon(chamferPoints(x,z,2.86,2.82,.27),.552);c.strokeStyle='#ffffff67';c.lineWidth=s*.012;c.stroke();
  const seamA=this.project({x,y:.552,z:z-1.39}),seamB=this.project({x,y:.552,z:z+1.39});c.beginPath();c.moveTo(seamA.x,seamA.y);c.lineTo(seamB.x,seamB.y);c.strokeStyle='#16335321';c.lineWidth=s*.012;c.stroke();
  for(let i=0;i<2;i++){
   const pos=position(ci,i,-1),p=this.project({...pos,y:.565}),k=this.depth(z);
   const bowl=c.createLinearGradient(p.x,p.y-.63*s*k,p.x,p.y+.53*s*k);bowl.addColorStop(0,shade(col,-98));bowl.addColorStop(.16,shade(col,-57));bowl.addColorStop(.68,shade(col,-27));bowl.addColorStop(1,shade(col,32));
   this.ellipse(pos.x,pos.z,.66,.79,.56,bowl,shade(col,-12),s*.024);
   const floor=c.createRadialGradient(p.x-.13*s,p.y+.13*s,.02*s,p.x,p.y+.15*s,.62*s);floor.addColorStop(0,shade(col,3));floor.addColorStop(.64,shade(col,-12));floor.addColorStop(1,shade(col,-39));
   this.ellipse(pos.x,pos.z+.11,.545,.60,.535,floor);
   c.save();c.beginPath();c.ellipse(p.x,p.y,.66*s*k,.79*this.pitch*s*k,0,.06,Math.PI-.06);c.strokeStyle='#ffffff62';c.lineWidth=s*.018;c.stroke();
   c.translate(p.x,p.y+.10*s);c.scale(1,this.pitch);c.font=`900 ${s*.59*k}px Flight, sans-serif`;c.fillStyle='#ffffff42';c.textAlign='center';c.textBaseline='middle';c.fillText('✈',0,0);c.restore();
  }
 }
 board(){
  const c=this.ctx,s=this.scale;
  const sky=c.createLinearGradient(0,0,0,this.h);sky.addColorStop(0,'#99d4fa');sky.addColorStop(.4,'#31a1de');sky.addColorStop(1,'#4db6e5');c.fillStyle=sky;c.fillRect(0,0,this.w,this.h);
  const ocean=this.art.ocean;if(ocean?.complete&&ocean.naturalWidth){const size=Math.max(this.w,this.h);c.drawImage(ocean,(this.w-size)/2,(this.h-size)/2,size,size);}
  const world=this.art.world;if(world.complete&&world.naturalWidth){
   const r=this.worldRect();c.drawImage(this.islandSprite||world,r.x,r.y,r.width,r.height);
  }
  // The board is inset into the island pavement, with a low curb rather than a floating slab.
  this.solid(0,0,11.45,11.45,1.2,-.035,.055,'#e5dfd0',{ivory:true,chamfer:true,bevel:.055,shadow:false});
  // Low tiled color fields sit below the white track; the gap creates the contact shadow.
  c.save();this.polygon(chamferPoints(0,0,11.30,11.30,1.15),.075);c.clip();
  for(let z=0;z<15;z++)for(let x=0;x<15;x++){
   const ci=z<7?(x<7?0:1):(x<7?3:2),p=point([x,z]);this.surface(p.x,p.z,.719,.719,.015,.07,MATERIALS[ci].floor);
   this.polygon(roundedPoints(p.x,p.z,.72,.72,.01),.071);c.strokeStyle='#1a377e24';c.lineWidth=s*.011;c.stroke();
  }
  // Warm directional material wash ties board and sprites to the same upper-left light.
  this.polygon(roundedPoints(0,0,10.8,10.8,.05),.075);const wash=c.createLinearGradient(this.cx-4*s,this.cy-4*s,this.cx+4*s,this.cy+5*s);wash.addColorStop(0,'#ffffff08');wash.addColorStop(.5,'#ffffff00');wash.addColorStop(1,'#122d580b');c.fillStyle=wash;c.fill();
  c.restore();
  const tiles=TRACK.map((co,i)=>({...point(co),ci:Math.floor(i/13),safe:i%13===0}));
  HOMES.forEach((lane,ci)=>lane.forEach(co=>tiles.push({...point(co),ci,home:true})));
  // One complete shadow pass keeps shadows off neighbouring tile tops.
  for(const p of tiles){c.save();c.shadowColor='#332d2670';c.shadowBlur=s*.075;c.shadowOffsetX=s*.045;c.shadowOffsetY=s*.13;this.surface(p.x,p.z,.714,.714,.06,.085,'#57432350');c.restore();}
  for(const p of tiles.sort((a,b)=>a.z-b.z||a.x-b.x)){
   this.solid(p.x,p.z,.709,.709,.066,.085,.31,p.home?MATERIALS[p.ci].lane:'#fff9ed',{ivory:!p.home,shadow:false});
   if(p.home){const a=this.project({...p,y:.335}),k=this.depth(p.z);c.save();c.translate(a.x,a.y);c.scale(k,k*this.pitch);c.rotate([Math.PI/2,Math.PI,-Math.PI/2,0][p.ci]);c.beginPath();c.moveTo(0,-.18*s);c.lineTo(.175*s,.12*s);c.lineTo(-.175*s,.12*s);c.closePath();c.fillStyle='#fffdf1';c.fill();c.strokeStyle='#ffffffb0';c.lineWidth=s*.012;c.stroke();c.restore();}
   else{this.ellipse(p.x,p.z,.201,.201,.338,MARKERS[p.ci],'#ffffffb5',s*.012);if(p.safe)this.ellipse(p.x,p.z,.048,.048,.34,'#fffaf0');}
  }
  for(let i=0;i<4;i++)this.pad(i);
  this.finishBadge();
 }
 finishBadge(){
  const c=this.ctx,s=this.scale,center=this.project({x:0,y:.40,z:0});
  this.ellipse(0,0,1.06,1.06,.18,'#a69a85');this.ellipse(0,0,1.07,1.07,.32,'#f7f0e4','#ffffffba',s*.024);
  const order=[1,2,3,0];for(let q=0;q<4;q++){
   const pts=[{x:0,z:0}];for(let i=0;i<=20;i++){const a=-Math.PI/2+(q+i/20)*Math.PI/2;pts.push({x:Math.cos(a)*1.035,z:Math.sin(a)*1.035});}
   this.polygon(pts,.385);const g=c.createLinearGradient(center.x-s,center.y-s,center.x+s,center.y+s);g.addColorStop(0,tint(MATERIALS[order[q]].lane,.13));g.addColorStop(1,MATERIALS[order[q]].lane);c.fillStyle=g;c.fill();c.strokeStyle='#ffffffb0';c.lineWidth=s*.012;c.stroke();
  }
  this.ellipse(0,0,.61,.61,.405,'#193f8a','#b0dcff',s*.018);
  const g=c.createLinearGradient(center.x-.5*s,center.y-.5*s,center.x+.45*s,center.y+.5*s);g.addColorStop(0,'#427ed8');g.addColorStop(.55,'#2e61b5');g.addColorStop(1,'#21438e');this.ellipse(0,0,.565,.565,.425,g);
  // A shaded, waving checker flag, with a silver mast; all points scale with the badge.
  c.save();c.translate(center.x-.235*s,center.y-.28*s);c.rotate(-.15);
  const fw=.58*s,fh=.45*s,cloth=(u,v)=>({x:.035*s+u*fw,y:v*fh+Math.sin(u*TAU-.2)*.037*s+u*.015*s});
  const clothPath=()=>{c.beginPath();for(let j=0;j<=20;j++){const p=cloth(j/20,0);if(j)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);}for(let j=20;j>=0;j--){const p=cloth(j/20,1);c.lineTo(p.x,p.y);}c.closePath();};
  c.save();c.translate(.025*s,.025*s);clothPath();c.fillStyle='#12336380';c.fill();c.restore();
  c.lineCap='round';c.beginPath();c.moveTo(.014*s,-.045*s);c.lineTo(.014*s,.65*s);c.strokeStyle='#15357570';c.lineWidth=.075*s;c.stroke();
  const pole=c.createLinearGradient(-.025*s,0,.045*s,0);pole.addColorStop(0,'#a9bfdc');pole.addColorStop(.35,'#ffffff');pole.addColorStop(.7,'#f4faff');pole.addColorStop(1,'#718dbb');c.beginPath();c.moveTo(0,-.05*s);c.lineTo(0,.64*s);c.strokeStyle=pole;c.lineWidth=.052*s;c.stroke();
  for(let row=0;row<3;row++)for(let col=0;col<4;col++){
   c.beginPath();for(let j=0;j<=5;j++){const p=cloth((col+j/5)/4,row/3);if(j)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);}for(let j=5;j>=0;j--){const p=cloth((col+j/5)/4,(row+1)/3);c.lineTo(p.x,p.y);}c.closePath();
   const light=c.createLinearGradient(col*fw/4,0,(col+1)*fw/4,fh);if((row+col)%2){light.addColorStop(0,'#fffef5');light.addColorStop(.5,'#ffffff');light.addColorStop(1,'#bdd1e8');}else{light.addColorStop(0,'#1f3e74');light.addColorStop(.5,'#365b91');light.addColorStop(1,'#102855');}c.fillStyle=light;c.fill();
  }
  clothPath();c.strokeStyle='#f0f6ffaf';c.lineWidth=.014*s;c.lineJoin='round';c.stroke();c.restore();
 }

 drawPlane(p,now){
  const c=this.ctx,s=this.scale,k=this.depth(p.z),a=this.project(p),sel=this.keys.includes(`${p.color}:${p.piece}`),groundY=p.groundY??.32,ground=this.project({...p,y:groundY});
  c.save();
  // A broad soft penumbra plus a compact contact core, on the ground rather than the sprite.
  // Airborne lift affects spread and opacity only; idle bobbing/rotation never drag the shadow.
  const height=Math.max(0,p.y-groundY-.08),spread=1+Math.min(height,2.5)*.35;
  c.save();c.translate(ground.x+.035*s*k,ground.y+.015*s*k);
  const shadowLayer=(radius,flatten,alpha)=>{c.save();c.scale(1,flatten);const r=radius*s*k*spread,g=c.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,`rgba(15,30,41,${alpha})`);g.addColorStop(.38,`rgba(15,30,41,${alpha*.76})`);g.addColorStop(.72,`rgba(15,30,41,${alpha*.25})`);g.addColorStop(1,'rgba(15,30,41,0)');c.fillStyle=g;c.beginPath();c.arc(0,0,r,0,TAU);c.fill();c.restore();};
  shadowLayer(.64,.44,.34/(1+height*.9));
  shadowLayer(.39,.34,.56/(1+height*4.5));
  c.restore();
  c.translate(a.x,a.y);
  if(sel){c.beginPath();c.ellipse(0,.02*s,.50*s*k,.35*s*k,0,0,TAU);c.strokeStyle='#fff8aa';c.lineWidth=3;c.shadowColor='#ffe566';c.shadowBlur=10;c.stroke();c.shadowBlur=0;}
  const bob=this.reduced?0:Math.sin(now*.002+p.color+p.piece)*.011*s;c.translate(0,-bob);c.rotate(p.spin);c.scale(1+p.squash*.5,1-p.squash*.38);if(p.heading)c.scale(-1,1);
  const img=this.sprites['plane'+p.color]||this.art['plane'+p.color],width=1.36*s*k,heightPx=img?.width?width*img.height/img.width:width;
  if(img&&(img.width||img.naturalWidth))c.drawImage(img,-width*.5,-heightPx*.91,width,heightPx);
  // Permanent aircraft identity, printed on the existing white fuselage panel.
  // Counter-mirror just the glyph when the aircraft turns; its panel anchor still follows the body.
  c.save();c.translate(-width*.099,-heightPx*.420);if(p.heading)c.scale(-1,1);c.transform(.88,.23,-.08,1,0,0);c.font=`900 ${heightPx*.090}px Flight,sans-serif`;c.textAlign='center';c.textBaseline='middle';c.lineWidth=heightPx*.009;c.strokeStyle='#ffffffb0';c.strokeText(String(p.piece+1),0,0);c.fillStyle='#17437b';c.fillText(String(p.piece+1),0,0);c.restore();
  if(p.shock){c.save();if(p.heading)c.scale(-1,1);c.rotate(-p.spin);c.font=`900 ${s*.35*k}px Flight`;c.textAlign='center';c.strokeStyle='#735132';c.lineWidth=3;c.fillStyle='#fff8b2';c.strokeText('!',width*.4,-heightPx*.77);c.fillText('!',width*.4,-heightPx*.77);c.restore();}
  c.restore();
 }
 drawSmoke(now){
  const c=this.ctx,s=this.scale,img=this.sprites.smoke||this.art.smoke;
  for(const e of this.effects){if(e.kind!=='smoke')continue;const t=(now-e.start)/e.life,a=this.project({x:e.x+Math.sin(e.seed*2)*t*.14,y:e.y+t*.24,z:e.z});if(t<0||t>=1)continue;const size=e.size*s*(.65+t*.95)*this.depth(e.z),alpha=Math.min(1,t*9)*(1-t)*.87;c.save();c.globalAlpha=alpha;c.translate(a.x,a.y);c.rotate(Math.sin(e.seed*5)*.3+t*.2);if(img&&(img.width||img.naturalWidth)){const ratio=(img.height||img.naturalHeight)/(img.width||img.naturalWidth);c.drawImage(img,-size*.6,-size*.58,size*1.2,size*1.2*ratio);}else{for(let i=0;i<5;i++){const x=Math.cos(i*2.4)*size*.2,y=Math.sin(i*2.4)*size*.2,g=c.createRadialGradient(x-size*.09,y-size*.1,0,x,y,size*.3);g.addColorStop(0,'#fff');g.addColorStop(.65,'#f7fbff');g.addColorStop(1,'#a9bad000');c.fillStyle=g;c.beginPath();c.arc(x,y,size*.3,0,TAU);c.fill();}}c.restore();}
 }
 drawTrails(now){const c=this.ctx,s=this.scale;for(const trail of this.trails){const age=(now-trail.start)/trail.life;if(trail.points.length<3||age>1)continue;c.save();c.lineCap='round';c.lineJoin='round';c.globalAlpha=(1-age)*.75;for(const offset of [-.07,.07]){c.beginPath();trail.points.forEach((p,i)=>{const a=this.project({...p,x:p.x+offset});if(i)c.lineTo(a.x,a.y);else c.moveTo(a.x,a.y);});c.strokeStyle=offset<0?'#ffffff':'#cdeaff';c.lineWidth=s*(offset<0?.035:.016);c.stroke();}c.restore();}}
 drawImpact(now){
  const c=this.ctx,s=this.scale;
  for(const e of this.effects){if(e.kind!=='impact')continue;const age=(now-e.start)/e.life,a=this.project(e);if(age<0||age>=1)continue;
   for(let i=0;i<7;i++){const angle=i*2.399+.3,travel=Math.min(1,age*3),r=(.34+travel*(.38+(i%3)*.12))*s,x=a.x+Math.cos(angle)*r,y=a.y+Math.sin(angle)*r*.66-.15*s-age*.09*s;c.save();c.translate(x,y);c.rotate(i*.8+age*1.7);c.globalAlpha=Math.min(1,(1-age)*3);const size=(.135+(i%3)*.025)*s;const star=c.createLinearGradient(-size,-size,size,size);star.addColorStop(0,'#fff8a1');star.addColorStop(.45,'#ffe143');star.addColorStop(1,'#f2a51b');c.beginPath();for(let j=0;j<10;j++){const rr=j%2?size*.45:size,aa=j*Math.PI/5-Math.PI/2;c.lineTo(Math.cos(aa)*rr,Math.sin(aa)*rr);}c.closePath();c.shadowColor='#85532244';c.shadowBlur=2;c.shadowOffsetY=2;c.fillStyle=star;c.fill();c.strokeStyle='#e3a919';c.lineWidth=1;c.stroke();c.restore();}
   c.save();c.globalAlpha=Math.min(1,(1-age)*4);c.translate(a.x-.13*s,a.y-1.15*s-Math.sin(Math.min(1,age*4)*Math.PI)*.13*s);c.rotate(-.21);const pop=.9+Math.sin(Math.min(1,age*5)*Math.PI)*.15;c.scale(pop,pop);c.font=`900 ${s*.48}px Flight,sans-serif`;c.textAlign='center';c.lineJoin='round';c.lineWidth=s*.072;c.strokeStyle='#fff7d8';c.strokeText('BOOP!',0,0);c.lineWidth=s*.046;c.strokeStyle='#633820';c.strokeText('BOOP!',0,0);c.fillStyle='#ffdc32';c.fillText('BOOP!',0,0);c.restore();
  }
 }
 drawClouds(now){const img=this.sprites.cloud||this.art.cloud;if(!img||!(img.width||img.naturalWidth))return;const c=this.ctx,s=this.scale;const clouds=[[-7.0,-2.4,4.6,.95],[7.05,1.6,4.2,.96],[-5.5,6.1,4.8,1],[5.0,6.2,4.8,1],[-6.3,-5.55,2.4,.85]];for(let i=0;i<clouds.length;i++){const [x,z,width,alpha]=clouds[i],a=this.project({x,y:0,z}),drift=this.reduced?0:Math.sin(now*.00009+i)*s*.09;const w=width*s,ratio=(img.height||img.naturalHeight)/(img.width||img.naturalWidth);c.save();c.globalAlpha=alpha;c.drawImage(img,a.x-w/2+drift,a.y-w*ratio*.45,w,w*ratio);c.restore();}}
 background(){const key=`${this.w}:${this.h}:${this.art.world.naturalWidth}:${document.fonts.status}`;if(!this.boardCache||this.cacheKey!==key){const target=document.createElement('canvas');target.width=this.canvas.width;target.height=this.canvas.height;const main=this.ctx;this.ctx=target.getContext('2d');this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);this.board();this.ctx=main;this.boardCache=target;this.cacheKey=key;}this.ctx.drawImage(this.boardCache,0,0,this.w,this.h);}
 frame(now){
  if(this.w&&this.h){const c=this.ctx;c.clearRect(0,0,this.w,this.h);const pending=this.anims;this.anims=[];for(const a of pending){const t=Math.min(1,(now-a.start)/a.ms);a.update(t);if(t===1)a.resolve();else this.anims.push(a);}
   this.effects=this.effects.filter(e=>now-e.start<e.life);this.trails=this.trails.filter(e=>now-e.start<e.life);c.save();if(this.shake>.2){c.translate(Math.sin(now*.15)*this.shake,Math.cos(now*.12)*this.shake*.4);this.shake*=.78;}
   this.background();this.cosmeticTrails?.draw(c,p=>this.project(p),this.scale,now,this.reduced);this.drawTrails(now);this.drawSmoke(now);for(const p of [...this.planes].sort((a,b)=>a.z-b.z||a.y-b.y))this.drawPlane(p,now);this.drawImpact(now);this.drawClouds(now);c.restore();
  }requestAnimationFrame(this.frame);
 }
}
