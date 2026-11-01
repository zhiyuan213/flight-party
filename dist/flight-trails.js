const rainbowColors=['#f63867','#ffb41f','#22c781','#278df8','#8650df'];
const TRAIL_LIFETIME=1550;
const shade=(hex,amount)=>'#'+hex.slice(1).match(/../g).map(v=>Math.max(0,Math.min(255,Math.round(parseInt(v,16)*amount))).toString(16).padStart(2,'0')).join('');
const rgba=(hex,alpha)=>`rgba(${hex.slice(1).match(/../g).map(v=>parseInt(v,16)).join(',')},${alpha})`;
// The oldest end narrows and fades continuously, instead of deleting a full-width segment.
export function trailEnvelope(age){const remaining=Math.max(0,Math.min(1,1-age));return{width:remaining**.65,alpha:remaining**.8};}
export function rainbowTube(p,q,startWidth=1,endWidth=1){
 const dx=q.x-p.x,dz=q.z-p.z,len=Math.hypot(dx,dz);if(len<.0001)return[];const nx=-dz/len,nz=dx/len,r=.035,faces=[];
 for(let band=0;band<5;band++){
  const ring=(v,width)=>Array.from({length:6},(_,k)=>{const angle=k*Math.PI/3,side=((band-2)*r*1.9+Math.cos(angle)*r)*width;return{x:v.x+nx*side,y:v.y+Math.sin(angle)*r*width,z:v.z+nz*side};});const left=ring(p,startWidth),right=ring(q,endWidth);
  for(let k=0;k<6;k++)faces.push({vertices:[left[k],right[k],right[(k+1)%6],left[(k+1)%6]],color:shade(rainbowColors[band],.72+.30*(Math.sin((k+.5)*Math.PI/3)+1)/2)});
 }return faces;
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
   const p=this.points[i],age=(now-p.time)/TRAIL_LIFETIME,envelope=trailEnvelope(age),a=project(p),size=Math.max(3,Math.min(16,scale*.15)),jitter=Math.sin(p.id*2.4)*size*.45;
   const q=this.points[i+1],connected=q&&q.key===p.key&&q.style===p.style&&q.time-p.time<180&&Math.hypot(q.x-p.x,q.y-p.y,q.z-p.z)<1.5;
   c.save();c.globalAlpha=1;
   const next=connected?trailEnvelope((now-q.time)/TRAIL_LIFETIME):null,b=connected?project(q):null;
   const gradient=(color,startAlpha=1,endAlpha=startAlpha)=>{const g=c.createLinearGradient(a.x,a.y,b.x,b.y);g.addColorStop(0,rgba(color,envelope.alpha*startAlpha));g.addColorStop(1,rgba(color,next.alpha*endAlpha));return g;};
   if(p.style==='rainbow'){
    if(connected){
     const faces=rainbowTube(p,q,envelope.width,next.width).map(face=>({...face,screen:face.vertices.map(project)}));faces.sort((a,b)=>a.screen.reduce((n,p)=>n+p.y,0)-b.screen.reduce((n,p)=>n+p.y,0));
     for(const face of faces){c.beginPath();face.screen.forEach((v,k)=>k?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y));c.closePath();c.fillStyle=gradient(face.color);c.fill();}
    }
   }else if(p.style==='cloud'){
    if(connected){
     c.lineCap='round';
     // Layered wisps read as a continuous slipstream, without hard outlined bubbles.
     for(const [width,color,alpha] of [[1.8,'#a8cde7',.20],[1.2,'#e8f6ff',.60],[.58,'#ffffff',.98]]){c.lineWidth=size*width*(envelope.width+next.width)/2;c.strokeStyle=gradient(color,alpha);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}
    }
   }else{
    if(connected){c.lineCap='round';c.lineWidth=Math.max(.4,size*.42*(envelope.width+next.width)/2);c.strokeStyle=gradient('#ffc535',.58);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}
    if(p.id%3!==0){c.restore();continue;}c.globalAlpha=envelope.alpha;
    c.translate(a.x+jitter,a.y-jitter);c.rotate(p.id*.4);const r=size*(1-age*.25),g=c.createLinearGradient(-r,-r,r,r);g.addColorStop(0,'#fff5a6');g.addColorStop(.4,p.id%2?'#ffcf36':'#8cddff');g.addColorStop(1,p.id%2?'#c57c14':'#2a7bcb');c.fillStyle=g;c.beginPath();for(let k=0;k<10;k++){const angle=k*Math.PI/5-Math.PI/2,rad=r*(k%2?.40:1);k?c.lineTo(Math.cos(angle)*rad,Math.sin(angle)*rad):c.moveTo(Math.cos(angle)*rad,Math.sin(angle)*rad);}c.closePath();c.strokeStyle=p.id%2?'#b8862c':'#387aab';c.lineWidth=1.2;c.stroke();c.fill();c.strokeStyle='#fff7c3';c.lineWidth=.7;c.beginPath();c.moveTo(-r*.18,-r*.28);c.lineTo(0,-r*.78);c.stroke();
   }
   c.restore();
  }
 }

}
const previewRuns=new WeakMap();
export function startTrailPreview(canvas,style,reduced=false,loop=false){
 const context=canvas.getContext('2d'),trail=new FlightTrails(),start=performance.now(),token={};let lastCycle=-1;previewRuns.set(canvas,token);
 const draw=now=>{
  if(previewRuns.get(canvas)!==token||!canvas.isConnected||!canvas.closest('dialog')?.open||canvas.closest('[role=tabpanel]')?.hidden)return;
  const elapsed=now-start;if(!loop&&elapsed>3400)return;const cycle=Math.floor(elapsed/3400);if(cycle!==lastCycle){trail.clear();lastCycle=cycle;}
  const t=Math.min(1,(elapsed%3400)/1800),x=35+t*230,y=50-Math.sin(t*Math.PI)*12;
  context.clearRect(0,0,300,95);if(!reduced&&t<1)trail.emit(style,'preview',{x:(x-150)/40,y:(60-y)/40,z:0},now);trail.draw(context,p=>({x:150+p.x*40,y:60-p.y*40}),40,now,reduced);
  context.font='35px sans-serif';context.fillStyle='#347ce9';context.fillText('✈',x,60-Math.sin(t*Math.PI)*12);
  if(!reduced)requestAnimationFrame(draw);
 };requestAnimationFrame(draw);
}

