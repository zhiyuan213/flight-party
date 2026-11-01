export const propellerAngle=(now,reduced=false,phase=0)=>reduced?0:now*.022+phase;
export function drawPropeller(c,width,height,now,color='#3487ec',reduced=false,phase=0){
 const radius=width*.153,angle=propellerAngle(now,reduced,phase);
 c.save();c.translate(width*.324,-height*.181);c.transform(.83,-.18,.12,1,0,0);
 const fill=c.createLinearGradient(-radius*.18,-radius,radius*.18,0);fill.addColorStop(0,'#b8e6ff');fill.addColorStop(.35,color);fill.addColorStop(1,/^#[0-9a-f]{6}$/i.test(color)?'#'+color.slice(1).match(/../g).map(v=>Math.round(parseInt(v,16)*.55).toString(16).padStart(2,'0')).join(''):'#174f92');
 const blades=(offset,alpha)=>{c.save();c.globalAlpha=alpha;c.rotate(angle+offset);for(let i=0;i<3;i++){c.save();c.rotate(i*Math.PI*2/3);c.fillStyle=fill;c.beginPath();c.ellipse(0,-radius*.53,radius*.18,radius*.53,-.12,0,Math.PI*2);c.fill();c.restore();}c.restore();};
 if(!reduced){blades(-.32,.18);blades(.32,.18);}blades(0,.94);
 const hub=c.createRadialGradient(-radius*.09,-radius*.10,0,0,0,radius*.34);hub.addColorStop(0,'#fff8a7');hub.addColorStop(.45,'#ffe145');hub.addColorStop(1,'#d99113');c.fillStyle=hub;c.beginPath();c.ellipse(0,0,radius*.29,radius*.34,0,0,Math.PI*2);c.fill();c.restore();
}
