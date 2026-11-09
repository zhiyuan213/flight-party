// Shared visible pocket boundary and physical cloth-facing cushion surfaces.
export const POOL_HOLES=[[0,0],[500,0],[1000,0],[0,500],[500,500],[1000,500]];
export function tracePocketBack(ctx,middle){
  if(middle){
    ctx.moveTo(-26,-20);ctx.bezierCurveTo(-24,-40,-20,-54,0,-54);
    ctx.bezierCurveTo(20,-54,24,-40,26,-20);
  }else{
    ctx.moveTo(18,-20);ctx.lineTo(-3,-40);
    ctx.bezierCurveTo(-16,-53,-34,-47,-43,-34);
    ctx.bezierCurveTo(-54,-19,-45,-5,-33,7);ctx.lineTo(-20,18);
  }
}
export function tracePocket(ctx,middle){
  ctx.beginPath();tracePocketBack(ctx,middle);
  if(middle)ctx.bezierCurveTo(23,1,-23,1,-26,-20);
  else ctx.bezierCurveTo(2,18,18,2,18,-20);
  ctx.closePath();
}
function curve(points,a,b,c){
  const p=points.at(-1);
  for(let i=1;i<=24;i++){
    const t=i/24,u=1-t;
    points.push([u*u*u*p[0]+3*u*u*t*a[0]+3*u*t*t*b[0]+t*t*t*c[0],u*u*u*p[1]+3*u*u*t*a[1]+3*u*t*t*b[1]+t*t*t*c[1]]);
  }
}
function outline(middle){
  const points=[];
  tracePocket({beginPath(){},closePath(){},moveTo(x,y){points.push([x,y]);},lineTo(x,y){points.push([x,y]);},bezierCurveTo(ax,ay,bx,by,cx,cy){curve(points,[ax,ay],[bx,by],[cx,cy]);}},middle);
  return points;
}
const wells=[outline(false),outline(true)];
function inside(x,y,points){
  let result=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const [ax,ay]=points[i],[bx,by]=points[j];
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)result=!result;
  }
  return result;
}
export function pocketIndex(x,y){
  for(let i=0;i<POOL_HOLES.length;i++){
    const [hx,hy]=POOL_HOLES[i],dx=(x-hx)*(hx===1000?-1:1),dy=(y-hy)*(hy===500?-1:1);
    if(Math.abs(dx)>64||Math.abs(dy)>64)continue;
    if(inside(dx,dy,wells[hx===500?1:0]))return i;
  }
  return -1;
}
const topLeft=[[18,-20],[38,0],[466,0]];
curve(topLeft,[472,0],[472,-4],[474,-20]);
const topRight=topLeft.map(([x,y])=>[1000-x,y]).reverse();
const leftSide=[[-20,482],[0,462],[0,38],[-20,18]];
const paths=[topLeft,topRight,topLeft.map(([x,y])=>[x,500-y]).reverse(),topRight.map(([x,y])=>[x,500-y]).reverse(),leftSide,leftSide.map(([x,y])=>[1000-x,y]).reverse()];
const rails=paths.map(points=>points.slice(1).map((b,i)=>{
  const a=points[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
  return {a,b,dx,dy,length,nx:-dy/length,ny:dx/length};
}));
// Read-only proximity query for sampled server replay audio; it never moves balls.
export function cushionContact(x,y,radius=20){
  let nearest=null;
  for(const segments of rails)for(const s of segments){
    const t=Math.max(0,Math.min(1,((x-s.a[0])*s.dx+(y-s.a[1])*s.dy)/(s.length*s.length)));
    const dx=x-s.a[0]-s.dx*t,dy=y-s.a[1]-s.dy*t,d=Math.hypot(dx,dy);
    if(d>radius||dx*s.nx+dy*s.ny<-.01||nearest&&d>=nearest.distance)continue;
    nearest={distance:d,nx:d>1e-9?dx/d:s.nx,ny:d>1e-9?dy/d:s.ny};
  }
  return nearest;
}
export function resolveCushion(x,y,vx,vy,radius=16){
  let normalSpeed=0,nx=0,ny=0,hit=false;
  // Quarter-step travel is at most eight units, smaller than the 16-unit radius.
  for(let pass=0;pass<2;pass++)for(const segments of rails){
    let nearest=null;
    for(const s of segments){
      if(x<Math.min(s.a[0],s.b[0])-radius||x>Math.max(s.a[0],s.b[0])+radius||y<Math.min(s.a[1],s.b[1])-radius||y>Math.max(s.a[1],s.b[1])+radius)continue;
      const t=Math.max(0,Math.min(1,((x-s.a[0])*s.dx+(y-s.a[1])*s.dy)/(s.length*s.length)));
      const dx=x-s.a[0]-s.dx*t,dy=y-s.a[1]-s.dy*t,d=Math.hypot(dx,dy);
      if(d<radius&&(!nearest||d<nearest.d))nearest={s,dx,dy,d};
    }
    if(!nearest)continue;
    const {s,dx,dy,d}=nearest;
    const front=dx*s.nx+dy*s.ny>=0;
    const ux=front&&d>1e-9?dx/d:s.nx,uy=front&&d>1e-9?dy/d:s.ny;
    const overlap=front?radius-d:radius+d;
    x+=ux*overlap;y+=uy*overlap;
    const incoming=-(vx*ux+vy*uy);
    if(incoming>0){
      vx+=1.92*incoming*ux;vy+=1.92*incoming*uy;hit=true;
      if(incoming>normalSpeed){normalSpeed=incoming;nx=ux;ny=uy;}
    }
  }
  return {x,y,vx,vy,normalSpeed,nx,ny,hit};
}
