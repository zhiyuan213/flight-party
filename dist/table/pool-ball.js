// One shared sphere painter for the table, target row and return channel.
// The texture is projected onto a sphere; lighting remains in world space.
import {paintSphereFinish} from './billiard-materials.js?v=20261113-materials1';
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
// Isotropic light vector: reflections and cast shadows use the same overhead lamp.
export function overheadLightAt(x,y,light){
  const dx=light.x-x,dy=light.y-y,height=Number.isFinite(light.height)&&light.height>0?light.height:420;
  const length=Math.hypot(dx,dy,height);
  return {x:dx/length*.78,y:dy/length*.78};
}
export function drawPoolBall(ctx,id,x,y,r=16,angle=0,heading=0,orientation=null,light=null,options=null) {
  /* One malformed argument must never reach createRadialGradient: a single
     thrown TypeError kills the whole animation frame (frozen table, no cue).
     Normalise radius / centre and ignore a light without finite coordinates. */
  r=Number.isFinite(r)&&r>0?r:16;
  x=Number.isFinite(x)?x:0;y=Number.isFinite(y)?y:0;
  const lit=light&&Number.isFinite(light.x)&&Number.isFinite(light.y)?light:null;
  // Plain palettes omit stripes and numbers. Snooker opts into a centered
  // overhead lamp; the default Pool light and shadow path stays unchanged.
  const plain=!!options?.plain,table=options?.palette||palette,skin=options?.skin||null;
  const original=plain?(table[id]||table[0]):palette[id>8?id-8:id];
  /* A themed rack still has SIXTEEN different balls: only the material and
     the per-id signature change, never the number or its colour. */
  const color=skin&&skin.colorFor?skin.colorFor(id,plain,original):original;
  ctx.save();ctx.translate(x,y);
  const overhead=!!(plain&&options?.overhead&&lit),direction=overhead?overheadLightAt(x,y,lit):null;
  const lx=direction?direction.x:lit?Math.max(-.65,Math.min(.65,(lit.x-x)/700)):-.3,ly=direction?direction.y:lit?Math.max(-.65,Math.min(.65,(lit.y-y)/550)):-.52;
  if(overhead){
    // The cast shadow points away from the lamp; the contact core stays under the ball.
    const sx=-lx*r*1.65,sy=-ly*r*1.65;
    ctx.save();ctx.shadowColor='#0006';ctx.shadowBlur=r*.48;
    ctx.fillStyle='#0006';ctx.beginPath();ctx.ellipse(sx,sy,r*1.02,r*.78,Math.atan2(sy,sx),0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;ctx.fillStyle='#0007';ctx.beginPath();ctx.ellipse(0,0,r*.72,r*.68,0,0,Math.PI*2);ctx.fill();ctx.restore();
  }else{
  ctx.save();ctx.shadowColor='#0008';ctx.shadowBlur=r*.32;ctx.fillStyle='#0005';ctx.beginPath();ctx.ellipse(-lx*r*.8,-ly*r*.8,r*.94,r*.8,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#0005';ctx.beginPath();ctx.ellipse(0,1,r*.7,r*.62,0,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.clip();
  const basis=orientation||rollSphere(sphereIdentity(),Math.cos(heading)*angle*r,Math.sin(heading)*angle*r,r);
  const project=(a,b,c)=>[basis[0]*a+basis[3]*b+basis[6]*c,basis[1]*a+basis[4]*b+basis[7]*c,basis[2]*a+basis[5]*b+basis[8]*c];
  ctx.save();
  ctx.fillStyle=!plain&&id>8?(skin?skin.stripe:'#f9f7ee'):color;ctx.fillRect(-r,-r,r*2,r*2);
  if(!plain&&id>8){ctx.fillStyle=color;for(let latitude=-.55;latitude<.55;latitude+=.11){for(let t=0;t<Math.PI*2;t+=Math.PI/32){const points=[[latitude,t],[Math.min(.55,latitude+.11),t],[Math.min(.55,latitude+.11),t+Math.PI/32],[latitude,t+Math.PI/32]].map(([v,u])=>project(Math.sqrt(1-v*v)*Math.sin(u),v,Math.sqrt(1-v*v)*Math.cos(u)));if(points.some(p=>p[2]<0))continue;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0]*r,p[1]*r):ctx.moveTo(p[0]*r,p[1]*r));ctx.closePath();ctx.fill();}}}
  if(skin)paintSphereFinish(ctx,r,project,skin,id,plain);
  // Opposite number patches are permanently fixed to the sphere.
  for(const side of (plain?[]:[1,-1])){const p=project(0,0,side);if(p[2]<=0)continue;const u=project(side,0,0),v=project(0,1,0);ctx.save();ctx.transform(u[0],u[1],v[0],v[1],p[0]*r*.88,p[1]*r*.88);
    if(skin&&id&&skin.metal){const metal=ctx.createLinearGradient(-r*.5,-r*.5,r*.5,r*.5);skin.metal.forEach((c,i)=>metal.addColorStop(i/(skin.metal.length-1),c));ctx.fillStyle=metal;ctx.beginPath();ctx.arc(0,0,r*.6,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle=skin?skin.patch:'#fffbed';ctx.beginPath();ctx.arc(0,0,r*.54,0,Math.PI*2);ctx.fill();if(id){ctx.lineWidth=r*.055;ctx.strokeStyle=skin?skin.ink:'#111722';ctx.stroke();}ctx.fillStyle=skin?skin.ink:'#111722';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='800 '+r*.78+'px Arial';if(id)ctx.fillText(String(id),0,r*.04);else{ctx.fillStyle=skin?skin.mark:'#d33f35';ctx.beginPath();ctx.arc(0,0,r*.14,0,Math.PI*2);ctx.fill();}ctx.restore();}
  ctx.restore();
  if(skin){ctx.save();ctx.globalAlpha=.045;const tint=ctx.createLinearGradient(-r,-r,r,r);
   tint.addColorStop(0,skin.hi);tint.addColorStop(1,skin.lo);
   ctx.fillStyle=tint;ctx.fillRect(-r,-r,r*2,r*2);ctx.restore();}
  const shade=ctx.createRadialGradient(lx*r,ly*r,r*.1,0,0,r*1.13);shade.addColorStop(0,'#ffffff55');shade.addColorStop(.48,'#ffffff00');shade.addColorStop(.8,'#00000022');shade.addColorStop(1,'#000000b0');ctx.fillStyle=shade;ctx.fillRect(-r,-r,r*2,r*2);
  if(overhead){
    ctx.fillStyle='#ffffffb0';ctx.beginPath();
    ctx.ellipse(lx*r,ly*r,r*.25,r*.15,Math.atan2(ly,lx)+Math.PI/2,0,Math.PI*2);ctx.fill();
  }else{
  ctx.fillStyle='#ffffffc0';ctx.beginPath();ctx.ellipse(lx*r,ly*r,r*.25,r*.12,-.35,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffffff35';ctx.beginPath();ctx.ellipse(r*.42,r*.32,r*.1,r*.28,-.5,0,Math.PI*2);ctx.fill();
  }
  /* Only the snooker cue ball (plain palette, id 0) carries a rotation mark:
     a small BLACK dot pinned to the sphere's poles. It travels with
     `orientation`, so the otherwise featureless white ball visibly turns while
     rolling. Two poles keep one dot on the visible hemisphere. */
  if(plain&&id===0)for(const side of [1,-1]){
    const p=project(0,0,side);
    if(p[2]<=.06)continue;
    const depth=Math.min(1,p[2]),size=r*.15*(.8+.2*depth);
    ctx.fillStyle='#141414';ctx.beginPath();ctx.arc(p[0]*r,p[1]*r,size,0,Math.PI*2);ctx.fill();
  }
  // No floating neon ring: skin.marks seeds the rotating surface engraving.
  ctx.restore();
}
