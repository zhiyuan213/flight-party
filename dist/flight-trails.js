const rainbowColors=['#f63867','#ffb41f','#22c781','#278df8','#8650df'];
const shade=(hex,amount)=>'#'+hex.slice(1).match(/../g).map(v=>Math.max(0,Math.min(255,Math.round(parseInt(v,16)*amount))).toString(16).padStart(2,'0')).join('');
export function rainbowTube(p,q){
 const dx=q.x-p.x,dz=q.z-p.z,len=Math.hypot(dx,dz);if(len<.0001)return[];const nx=-dz/len,nz=dx/len,r=.035,faces=[];
 for(let band=0;band<5;band++){
  const ring=(v)=>Array.from({length:6},(_,k)=>{const angle=k*Math.PI/3,side=(band-2)*r*1.9+Math.cos(angle)*r;return{x:v.x+nx*side,y:v.y+Math.sin(angle)*r,z:v.z+nz*side};});const left=ring(p),right=ring(q);
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
  if(prior&&(now-prior.time<45||Math.hypot(p.x-prior.x,p.z-prior.z,p.y-prior.y)<.018))return;
  this.last.set(key,{...p,time:now});this.points.push({x:p.x,y:p.y,z:p.z,style,key,time:now,id:this.serial++});
  if(this.points.length>96)this.points.splice(0,this.points.length-96);
 }
 draw(c,project,scale,now,reduced=false){
  if(reduced){this.clear();return;}this.points=this.points.filter(p=>now-p.time<850);
  for(let i=0;i<this.points.length;i++){
   const p=this.points[i],age=(now-p.time)/850;if(age<.04)continue;const a=project(p),size=Math.max(3,Math.min(16,scale*.15)),jitter=Math.sin(p.id*2.4)*size*.45;
   c.save();c.globalAlpha=Math.min(1,(1-age)/.4)*.98;
   if(p.style==='rainbow'){
    const q=this.points[i+1];if(q&&q.key===p.key&&q.style===p.style&&q.time-p.time<180){
     const faces=rainbowTube(p,q).map(face=>({...face,screen:face.vertices.map(project)}));faces.sort((a,b)=>a.screen.reduce((n,p)=>n+p.y,0)-b.screen.reduce((n,p)=>n+p.y,0));
     for(const face of faces){c.beginPath();face.screen.forEach((v,k)=>k?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y));c.closePath();c.fillStyle=face.color;c.fill();}
    }
   }else if(p.style==='cloud'){
    for(let k=0;k<3;k++){const x=a.x+(k-1)*size*.65,y=a.y+jitter*.2+(k%2?-.35:0)*size,r=size*(.68+age*.2);const g=c.createRadialGradient(x-r*.32,y-r*.4,r*.04,x,y,r);g.addColorStop(0,'#fff');g.addColorStop(.45,'#e9faff');g.addColorStop(.75,'#8fd0ee');g.addColorStop(1,'#4d93c9');c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
   }else{
    c.translate(a.x+jitter,a.y-jitter);c.rotate(p.id*.4);const r=size*(1-age*.25),g=c.createLinearGradient(-r,-r,r,r);g.addColorStop(0,'#fff5a6');g.addColorStop(.4,p.id%3?'#ffcf36':'#8cddff');g.addColorStop(1,p.id%3?'#c57c14':'#2a7bcb');c.fillStyle=g;c.beginPath();for(let k=0;k<10;k++){const angle=k*Math.PI/5-Math.PI/2,rad=r*(k%2?.40:1);k?c.lineTo(Math.cos(angle)*rad,Math.sin(angle)*rad):c.moveTo(Math.cos(angle)*rad,Math.sin(angle)*rad);}c.closePath();c.strokeStyle=p.id%3?'#b8862c':'#387aab';c.lineWidth=1.2;c.stroke();c.fill();c.strokeStyle='#fff7c3';c.lineWidth=.7;c.beginPath();c.moveTo(-r*.18,-r*.28);c.lineTo(0,-r*.78);c.stroke();
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
  const elapsed=now-start;if(!loop&&elapsed>2400)return;const cycle=Math.floor(elapsed/2400);if(cycle!==lastCycle){trail.clear();lastCycle=cycle;}
  const t=Math.min(1,(elapsed%2400)/1600),x=35+t*230,y=50-Math.sin(t*Math.PI)*12;
  context.clearRect(0,0,300,95);if(!reduced&&t<1)trail.emit(style,'preview',{x:(x-150)/40,y:(60-y)/40,z:0},now);trail.draw(context,p=>({x:150+p.x*40,y:60-p.y*40}),40,now,reduced);
  context.font='35px sans-serif';context.fillStyle='#347ce9';context.fillText('✈',x,60-Math.sin(t*Math.PI)*12);
  if(!reduced)requestAnimationFrame(draw);
 };requestAnimationFrame(draw);
}

