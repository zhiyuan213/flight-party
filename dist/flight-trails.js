import {planeSkin} from './plane-skin.js';
import {drawPropeller} from './propeller.js';

export const RAINBOW_COLORS=Object.freeze(['#ff365d','#ff8a24','#ffd633','#23d990','#25baf5','#426bff','#9950f5']);
const TRAIL_LIFETIME=1550;
const rgba=(hex,alpha)=>`rgba(${hex.slice(1).match(/../g).map(v=>parseInt(v,16)).join(',')},${alpha})`;
// The oldest end narrows and fades continuously, instead of deleting a full-width segment.
export function trailEnvelope(age){const remaining=Math.max(0,Math.min(1,1-age));return{width:remaining**.65,alpha:remaining**.8};}
const connected=(p,q)=>q&&q.key===p.key&&q.style===p.style&&q.time>=p.time&&q.time-p.time<180&&Math.hypot(q.x-p.x,q.y-p.y,q.z-p.z)<1.5;
const smooth=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};

// One seven-band ribbon shares every section/edge: no independently wiggling tubes.
// Cross-sections stay in world x/z and pass through the exact same projection as the plane.
export function rainbowRibbon(samples,project,now){
 if(samples.length<2)return[];
 const sections=[];let distance=0,tangent={x:1,z:0};
 for(let i=0;i<samples.length;i++){
  const p=samples[i],previous=samples[Math.max(0,i-1)],next=samples[Math.min(samples.length-1,i+1)];
  if(i)distance+=Math.hypot(p.x-previous.x,p.z-previous.z);
  const dx=next.x-previous.x,dz=next.z-previous.z,length=Math.hypot(dx,dz);
  if(length>=.00001)tangent={x:dx/length,z:dz/length};
  const envelope=trailEnvelope((now-p.time)/TRAIL_LIFETIME),tip=smooth(distance/.72),halfWidth=.31*envelope.width*tip;
  const edges=Array.from({length:8},(_,band)=>{const offset=(band/7*2-1)*halfWidth;return project({x:p.x-tangent.z*offset,y:p.y,z:p.z+tangent.x*offset});});
  sections.push({center:project(p),edges,alpha:envelope.alpha*tip});
 }
 if(distance<.00001)return[];
 const result=[];
 for(let i=1;i<sections.length;i++){
  if(!connected(samples[i-1],samples[i]))continue;
  const from=sections[i-1],to=sections[i];
  result.push({from,to,bands:RAINBOW_COLORS.map((color,band)=>({color,vertices:[from.edges[band],to.edges[band],to.edges[band+1],from.edges[band+1]]}))});
 }
 return result;
}

function drawRainbow(c,samples,project,now){
 const segments=rainbowRibbon(samples,project,now);if(!segments.length)return;
 const gradient=(segment,color,opacity=1)=>{const {from,to}=segment,g=c.createLinearGradient(from.center.x,from.center.y,to.center.x,to.center.y);g.addColorStop(0,rgba(color,from.alpha*opacity));g.addColorStop(1,rgba(color,to.alpha*opacity));return g;};
 c.save();c.globalAlpha=1;c.lineCap='round';c.lineJoin='round';
 // Soft pearl edge under the colored ribbon; no expensive blur or pale color overlay.
 for(const segment of segments){
  const width=section=>Math.hypot(section.edges[7].x-section.edges[0].x,section.edges[7].y-section.edges[0].y),w=(width(segment.from)+width(segment.to))/2;
  for(const [extra,opacity] of [[4,.10],[1.8,.28]]){c.lineWidth=w+extra;c.strokeStyle=gradient(segment,'#f3faff',opacity);c.beginPath();c.moveTo(segment.from.center.x,segment.from.center.y);c.lineTo(segment.to.center.x,segment.to.center.y);c.stroke();}
 }
 for(let band=0;band<RAINBOW_COLORS.length;band++)for(const segment of segments){
  const face=segment.bands[band];c.fillStyle=gradient(segment,face.color);c.beginPath();face.vertices.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fill();
  // Hairline overlap hides antialias seams between adjacent samples of the same color.
  c.lineWidth=.5;c.strokeStyle=c.fillStyle;c.stroke();
 }
 c.restore();
}
// Cosmetic samples are rendering-only. No game rules, positions or random dice are touched.
export class FlightTrails {
 constructor(){this.points=[];this.last=new Map();this.serial=0;}
 clear(){this.points=[];this.last.clear();}
 emit(style,key,p,now,reduced=false){
  if(reduced){this.clear();return;}
  if(!['star','rainbow','cloud'].includes(style))return;
  const prior=this.last.get(key);
  if(prior&&(now-prior.time<30||Math.hypot(p.x-prior.x,p.z-prior.z,p.y-prior.y)<.018))return;
  this.last.set(key,{...p,time:now});this.points.push({x:p.x,y:p.y,z:p.z,style,key,time:now,id:this.serial++});
  if(this.points.length>96)this.points.splice(0,this.points.length-96);
 }
 draw(c,project,scale,now,reduced=false){
  if(reduced){this.clear();return;}this.points=this.points.filter(p=>now-p.time<TRAIL_LIFETIME);
  for(const [key,p] of this.last)if(now-p.time>=TRAIL_LIFETIME)this.last.delete(key);
  for(let i=0;i<this.points.length;i++){
   if(this.points[i].style==='rainbow'){
    const samples=[this.points[i]];
    while(connected(this.points[i],this.points[i+1]))samples.push(this.points[++i]);
    drawRainbow(c,samples,project,now);continue;
   }
   const p=this.points[i],age=(now-p.time)/TRAIL_LIFETIME,envelope=trailEnvelope(age),a=project(p),size=Math.max(3,Math.min(16,scale*.15)),jitter=Math.sin(p.id*2.4)*size*.45;
   const q=this.points[i+1],linked=connected(p,q);
   c.save();c.globalAlpha=1;
   const next=linked?trailEnvelope((now-q.time)/TRAIL_LIFETIME):null,b=linked?project(q):null;
   const gradient=(color,startAlpha=1,endAlpha=startAlpha)=>{const g=c.createLinearGradient(a.x,a.y,b.x,b.y);g.addColorStop(0,rgba(color,envelope.alpha*startAlpha));g.addColorStop(1,rgba(color,next.alpha*endAlpha));return g;};
   if(p.style==='cloud'){
    if(linked){
     c.lineCap='round';
     // Layered wisps read as a continuous slipstream, without hard outlined bubbles.
     for(const [width,color,alpha] of [[1.8,'#a8cde7',.20],[1.2,'#e8f6ff',.60],[.58,'#ffffff',.98]]){c.lineWidth=size*width*(envelope.width+next.width)/2;c.strokeStyle=gradient(color,alpha);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}
    }
   }else{
    if(linked){c.lineCap='round';c.lineWidth=Math.max(.4,size*.42*(envelope.width+next.width)/2);c.strokeStyle=gradient('#ffc535',.58);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}
    if(p.id%3!==0){c.restore();continue;}c.globalAlpha=envelope.alpha;
    c.translate(a.x+jitter,a.y-jitter);c.rotate(p.id*.4);const r=size*(1-age*.25),g=c.createLinearGradient(-r,-r,r,r);g.addColorStop(0,'#fff5a6');g.addColorStop(.4,p.id%2?'#ffcf36':'#8cddff');g.addColorStop(1,p.id%2?'#c57c14':'#2a7bcb');c.fillStyle=g;c.beginPath();for(let k=0;k<10;k++){const angle=k*Math.PI/5-Math.PI/2,rad=r*(k%2?.40:1);k?c.lineTo(Math.cos(angle)*rad,Math.sin(angle)*rad):c.moveTo(Math.cos(angle)*rad,Math.sin(angle)*rad);}c.closePath();c.strokeStyle=p.id%2?'#b8862c':'#387aab';c.lineWidth=1.2;c.stroke();c.fill();c.strokeStyle='#fff7c3';c.lineWidth=.7;c.beginPath();c.moveTo(-r*.18,-r*.28);c.lineTo(0,-r*.78);c.stroke();
   }
   c.restore();
  }
 }

}
const previewRuns=new WeakMap();
export const previewTrailProjection=p=>({x:150+p.x*40,y:60+p.z*32-p.y*40});
export function startTrailPreview(canvas,style,reduced=false,loop=false,planeStyle='classic'){
 const context=canvas.getContext('2d'),trail=new FlightTrails(),start=performance.now(),token={},bodies=new Map(),selectedSkin=planeSkin(planeStyle),classicSkin=planeSkin('classic');let lastCycle=-1,ready=false;previewRuns.set(canvas,token);
 const loadBody=skin=>{
  if(bodies.has(skin.style))return bodies.get(skin.style);
  const entry={image:null,loaded:false,skin};bodies.set(skin.style,entry);
  if(typeof Image==='undefined')return entry;
  const image=new Image();entry.image=image;image.decoding='async';
  image.onload=()=>{entry.loaded=!!(image.naturalWidth||image.width);if(ready&&reduced)draw(performance.now());};
  image.onerror=()=>{entry.loaded=false;if(ready&&reduced)draw(performance.now());};
  image.src=new URL(skin.asset,import.meta.url).href;return entry;
 };
 const classic=loadBody(classicSkin),selected=loadBody(selectedSkin);ready=true;
 const draw=now=>{
  if(previewRuns.get(canvas)!==token||!canvas.isConnected||!canvas.closest('dialog')?.open||canvas.closest('[role=tabpanel]')?.hidden)return;
  const elapsed=now-start;if(!reduced&&!loop&&elapsed>3400)return;const cycle=Math.floor(elapsed/3400);if(cycle!==lastCycle){trail.clear();lastCycle=cycle;}
  const t=reduced?0:Math.min(1,(elapsed%3400)/1800),x=35+t*230,y=50-Math.sin(t*Math.PI)*12;
  context.clearRect(0,0,300,95);if(!reduced&&t<1)trail.emit(style,'preview',{x:(x-150)/40,y:(60-y)/40,z:0},now);trail.draw(context,previewTrailProjection,40,now,reduced);
  const body=selected.loaded?selected:classic.loaded?classic:null;
  if(body){const width=44,height=width*(body.image.naturalHeight||body.image.height)/(body.image.naturalWidth||body.image.width);context.save();context.translate(x,y);context.drawImage(body.image,-width/2,-height*.91,width,height);drawPropeller(context,width,height,now,body.skin.propellerColor,reduced,0,body.skin.hubStyle);context.restore();}
  if(!reduced)requestAnimationFrame(draw);
 };requestAnimationFrame(draw);
}


// VIP-only soft outer glow for selected trail styles (does not affect scoring or hitboxes)
export function drawVipGlow(c, samples, project, now, style){
 if(!style || samples.length < 2) return;
 const glow = style === 'gold-glow' ? 'rgba(255,225,69,0.35)' :
              style === 'night-glow' ? 'rgba(201,168,255,0.4)' :
              style === 'aurora-shimmer' ? 'rgba(224,255,255,0.45)' :
              style === 'obsidian-edge' ? 'rgba(255,179,160,0.3)' :
              style === 'soft-cloud' ? 'rgba(184,230,255,0.25)' : null;
 if(!glow) return;
 c.save();
 c.strokeStyle = glow;
 c.lineWidth = 18;
 c.lineCap = 'round';
 c.lineJoin = 'round';
 c.globalCompositeOperation = 'lighter';
 c.beginPath();
 let started = false;
 for(const p of samples){
  const pt = project(p);
  if(!started){ c.moveTo(pt.x, pt.y); started = true; }
  else c.lineTo(pt.x, pt.y);
 }
 c.stroke();
 c.restore();
}
