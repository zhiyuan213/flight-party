// One shared sphere painter for the table, target row and return channel.
// The texture is projected onto a sphere; lighting remains in world space.
const palette=['#faf9f2','#f1c52b','#256bd8','#d94137','#814db2','#ef8c24','#218766','#843d32','#10151c'];
export const sphereIdentity=()=>[1,0,0,0,1,0,0,0,1];
export function rollSphere(matrix,dx,dy,r=16){
  const d=Math.hypot(dx,dy);if(!d)return matrix;
  return rotateSphere(matrix,-dy/d,dx/d,0,d/r);
}
export function rotateSphere(matrix,ax,ay,az,angle){
  const c=Math.cos(angle),s=Math.sin(angle),t=1-c,result=[];
  for(let i=0;i<9;i+=3){
    const x=matrix[i],y=matrix[i+1],z=matrix[i+2],dot=ax*x+ay*y+az*z;
    result.push(x*c+(ay*z-az*y)*s+ax*dot*t,y*c+(az*x-ax*z)*s+ay*dot*t,z*c+(ax*y-ay*x)*s+az*dot*t);
  }
  return result;
}
export function drawPoolBall(ctx,id,x,y,r=16,angle=0,heading=0,orientation=null,light=null,options=null) {
  // `options.plain` reuses the exact same sphere lighting for solid-colour games
  // (snooker): a custom palette, no stripes and no number patches.
  const plain=!!options?.plain,table=options?.palette||palette;
  const color=plain?(table[id]||table[0]):palette[id>8?id-8:id];
  ctx.save();ctx.translate(x,y);
  const lx=light?Math.max(-.65,Math.min(.65,(light.x-x)/700)):-.3,ly=light?Math.max(-.65,Math.min(.65,(light.y-y)/550)):-.52;
  ctx.save();ctx.shadowColor='#0008';ctx.shadowBlur=r*.32;ctx.fillStyle='#0005';ctx.beginPath();ctx.ellipse(-lx*r*.8,-ly*r*.8,r*.94,r*.8,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#0005';ctx.beginPath();ctx.ellipse(0,1,r*.7,r*.62,0,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.clip();
  const basis=orientation||rollSphere(sphereIdentity(),Math.cos(heading)*angle*r,Math.sin(heading)*angle*r,r);
  const project=(a,b,c)=>[basis[0]*a+basis[3]*b+basis[6]*c,basis[1]*a+basis[4]*b+basis[7]*c,basis[2]*a+basis[5]*b+basis[8]*c];
  ctx.save();
  ctx.fillStyle=!plain&&id>8?'#f9f7ee':color;ctx.fillRect(-r,-r,r*2,r*2);
  if(!plain&&id>8){ctx.fillStyle=color;for(let latitude=-.55;latitude<.55;latitude+=.11){for(let t=0;t<Math.PI*2;t+=Math.PI/32){const points=[[latitude,t],[Math.min(.55,latitude+.11),t],[Math.min(.55,latitude+.11),t+Math.PI/32],[latitude,t+Math.PI/32]].map(([v,u])=>project(Math.sqrt(1-v*v)*Math.sin(u),v,Math.sqrt(1-v*v)*Math.cos(u)));if(points.some(p=>p[2]<0))continue;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0]*r,p[1]*r):ctx.moveTo(p[0]*r,p[1]*r));ctx.closePath();ctx.fill();}}}
  // Opposite number patches are permanently fixed to the sphere.
  for(const side of (plain?[]:[1,-1])){const p=project(0,0,side);if(p[2]<=0)continue;const u=project(side,0,0),v=project(0,1,0);ctx.save();ctx.transform(u[0],u[1],v[0],v[1],p[0]*r*.88,p[1]*r*.88);ctx.fillStyle='#fffbed';ctx.beginPath();ctx.arc(0,0,r*.47,0,Math.PI*2);ctx.fill();ctx.fillStyle='#111722';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 '+r*.7+'px Arial';if(id)ctx.fillText(String(id),0,r*.035);else{ctx.fillStyle='#d33f35';ctx.beginPath();ctx.arc(0,0,r*.09,0,Math.PI*2);ctx.fill();}ctx.restore();}
  ctx.restore();
  const shade=ctx.createRadialGradient(lx*r,ly*r,r*.1,0,0,r*1.13);shade.addColorStop(0,'#ffffff55');shade.addColorStop(.48,'#ffffff00');shade.addColorStop(.8,'#00000022');shade.addColorStop(1,'#000000b0');ctx.fillStyle=shade;ctx.fillRect(-r,-r,r*2,r*2);
  ctx.fillStyle='#ffffffc0';ctx.beginPath();ctx.ellipse(lx*r,ly*r,r*.25,r*.12,-.35,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffffff35';ctx.beginPath();ctx.ellipse(r*.42,r*.32,r*.1,r*.28,-.5,0,Math.PI*2);ctx.fill();ctx.restore();
}
