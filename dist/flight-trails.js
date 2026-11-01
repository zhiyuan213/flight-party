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
  if(reduced){this.clear();return;}
  this.points=this.points.filter(p=>now-p.time<650);
  const rainbow=['#f7a8c1','#ffd689','#c5e8a4','#8edbec','#b5b1f2'];
  for(let i=0;i<this.points.length;i++){
   const p=this.points[i],age=(now-p.time)/650;if(age<.08)continue;
   const a=project(p),size=Math.max(2,Math.min(12,scale*.065)),jitter=Math.sin(p.id*2.4)*size*.65;
   c.save();c.globalAlpha=(1-age)*.65;
   if(p.style==='rainbow'){
    const q=this.points[i+1];if(q&&q.key===p.key&&q.style===p.style&&q.time-p.time<150){const b=project(q);c.lineCap='round';for(let k=0;k<5;k++){c.beginPath();c.moveTo(a.x,a.y+(k-2)*size*.36);c.lineTo(b.x,b.y+(k-2)*size*.36);c.strokeStyle=rainbow[k];c.lineWidth=Math.max(1,size*.4);c.stroke();}}
   }else if(p.style==='cloud'){
    c.fillStyle='#f8fcff';c.strokeStyle='#b9dff5';c.lineWidth=.6;for(let k=0;k<3;k++){c.beginPath();c.arc(a.x+(k-1)*size*.65,a.y+jitter*.3+(k%2?-.35:0)*size,size*(.65+age*.3),0,Math.PI*2);c.fill();c.stroke();}
   }else{
    c.translate(a.x+jitter,a.y-jitter);c.rotate(p.id*.4);c.fillStyle=p.id%3?'#ffe599':'#b9e5ff';c.beginPath();for(let k=0;k<10;k++){const angle=k*Math.PI/5-Math.PI/2,r=size*(k%2?.38:1)*(1-age*.4);const x=Math.cos(angle)*r,y=Math.sin(angle)*r;k?c.lineTo(x,y):c.moveTo(x,y);}c.closePath();c.fill();
   }
   c.restore();
  }
 }
}
export function startTrailPreview(canvas,style,reduced=false){
 const context=canvas.getContext('2d'),trail=new FlightTrails(),start=performance.now();
 const draw=now=>{if(!canvas.isConnected||!canvas.closest('dialog')?.open||now-start>2400)return;const t=Math.min(1,(now-start)/1600),x=35+t*230,y=50-Math.sin(t*Math.PI)*12;context.clearRect(0,0,300,95);if(!reduced&&t<1)trail.emit(style,'preview',{x,y,z:0},now);trail.draw(context,p=>p,55,now,reduced);context.font='35px sans-serif';context.fillStyle='#347ce9';context.fillText('✈',x,60-Math.sin(t*Math.PI)*12);if(!reduced)requestAnimationFrame(draw);};requestAnimationFrame(draw);
}
