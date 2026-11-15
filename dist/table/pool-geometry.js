// Shared visible pocket boundary and physical cloth-facing cushion surfaces.
export const POOL_HOLES=[[0,0],[500,0],[1000,0],[0,500],[500,500],[1000,500]];
// Visual-only widening of the drawn mouth. pocketIndex (and its Java mirror)
// always uses the plain, unexpanded contour, so making the hole look bigger
// can never change which shots are captured or any replay/parity frame.
export const POCKET_VISUAL_EXPAND=2;
/* Presentation-only pocket size, relative to Pool's drawn mouth. A WPBSA
 * snooker corner is 85 mm and a middle pocket ~100 mm against a 52.5 mm ball
 * on a 1778 mm wide table: 4.8% / 5.6% of the width. Pool's drawn mouth is
 * ~56 units (11.2% of the 500-unit width). Halving the silhouette lands
 * snooker at 5.6% / 5.6%, i.e. a 1.75x ball diameter -- the same tight ratio
 * the Pool table already uses. Per-type radii split that further: the middle
 * matches the real ~1.9x ball, and the corner was widened to ~1.8x ball per
 * visual feedback (real is ~1.6x; the user wanted a roomier mouth).
 * pocketIndex() and its Java mirror deliberately keep the plain contour, so
 * this never changes a shot outcome, replay frame or parity fixture. */
export const SNOOKER_POCKET_SCALE=.5;
/* The reference snooker table draws each pocket as a recessed well, not a
 * jaw/guard/well assembly, and each well is RECESSED into the rail: measured
 * against the reference art, a corner centre sits ~12 units outside the
 * baize corner and a middle centre ~25 units behind the cushion nose, so the
 * wood and the curved jaws wrap the hole instead of the hole sitting on the
 * cloth. The four corner mouths were widened slightly per visual feedback;
 * their centres and the middle mouths stay fixed. Radii/offsets here are at
 * scale 1; at the snooker default (.5) the corners are (-12,-12) r20 and the
 * middles (0,-25) r21. Purely visual:
 * pocketIndex() and the Java mirror keep their original capture contour. */
export const SNOOKER_POCKET_R=34; // legacy default; snookerPockets now uses per-type radii below
const SNOOKER_CORNER_R=40,SNOOKER_MIDDLE_R=42;
const SNOOKER_CORNER_OUT=24,SNOOKER_MIDDLE_OUT=50;
export function snookerPockets(scale=1){
  return POOL_HOLES.map(([hx,hy])=>{
    const middle=hx===500;
    return {middle,
      x:middle?hx:hx+(hx===0?-SNOOKER_CORNER_OUT*scale:SNOOKER_CORNER_OUT*scale),
      y:hy+(hy===0?-1:1)*(middle?SNOOKER_MIDDLE_OUT:SNOOKER_CORNER_OUT)*scale,
      r:(middle?SNOOKER_MIDDLE_R:SNOOKER_CORNER_R)*scale};
  });
}
/* Clip for the pocket-drop animation. Local coordinates are relative to the
 * hole with +x/+y pointing into the playing surface (the caller mirrors the
 * right/bottom holes). A widening throat joins the recessed circle to the
 * existing cloth-side approach. Separate circle/rectangle subpaths leave a
 * visible gap at the rim, slicing a ball before it has entered the well. */
export function snookerCirclePath(ctx,middle,scale=1,depth=0){
  const s=scale,cx=middle?0:-SNOOKER_CORNER_OUT*s,cy=(middle?-SNOOKER_MIDDLE_OUT:-SNOOKER_CORNER_OUT)*s,r=(middle?SNOOKER_MIDDLE_R:SNOOKER_CORNER_R)*s;
  const d=Math.max(0,Math.min(1,depth)),t=d*d*(3-2*d),open=1-t;
  ctx.beginPath();
  if(open<=.001)return; // Fully below the rim: an empty clip hides the ball.
  ctx.arc(cx,cy,r*open,0,Math.PI*2);
  if(middle){
    const neck=r*.9*open,width=80*open;
    ctx.moveTo(cx-neck,cy);
    ctx.lineTo(cx+neck,cy);
    ctx.lineTo(width,0);
    ctx.lineTo(width,100*open);
    ctx.lineTo(-width,100*open);
    ctx.lineTo(-width,0);
    ctx.closePath();
  }else{
    const neck=r*.7*open,lip=r*1.3*open,reach=100*open;
    ctx.moveTo(cx+neck,cy-neck);
    ctx.lineTo(lip,0);
    ctx.lineTo(reach,0);
    ctx.lineTo(reach,reach);
    ctx.lineTo(0,reach);
    ctx.lineTo(0,lip);
    ctx.lineTo(cx-neck,cy+neck);
    ctx.closePath();
  }
}
export function expandPocketPoint(x,y,middle,expand=POCKET_VISUAL_EXPAND,scale=1){
  if(!expand&&scale===1)return [x,y];
  const cx=middle?0:-17,cy=middle?-26:-17,dx=x-cx,dy=y-cy,len=Math.hypot(dx,dy)||1;
  const ex=x+dx/len*expand,ey=y+dy/len*expand;
  return scale===1?[ex,ey]:[ex*scale,ey*scale];
}
/* Scale a table point toward its nearest pocket. Used only for drawing the
 * cushion ends so the jaw gap shrinks with the mouth. Long straight rails have
 * no interior points here, so the nearest pocket is always unambiguous. */
export function scaleAboutHole(x,y,scale){
  let hx=0,hy=0,best=Infinity;
  for(const [px,py] of POOL_HOLES){const d=(x-px)**2+(y-py)**2;if(d<best){best=d;hx=px;hy=py;}}
  return [hx+(x-hx)*scale,hy+(y-hy)*scale];
}
// Path-only wrapper: every endpoint and Bezier control point is pushed away
// from the well centre by the same distance. Guards, the dark well and the
// animation back wall then share one contour without duplicating constants.
export function pocketVisualContext(ctx,middle,expand=POCKET_VISUAL_EXPAND,scale=1){
  const p=(x,y)=>expandPocketPoint(x,y,middle,expand,scale);
  return {
    beginPath:()=>ctx.beginPath(),closePath:()=>ctx.closePath(),
    moveTo:(x,y)=>ctx.moveTo(...p(x,y)),
    lineTo:(x,y)=>ctx.lineTo(...p(x,y)),
    bezierCurveTo:(ax,ay,bx,by,cx,cy)=>ctx.bezierCurveTo(...p(ax,ay),...p(bx,by),...p(cx,cy))
  };
}
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
// Cushion restitution, mirrored by PoolGeometry.E_RAIL on the server.
// A ball resting in front of a middle mouth is legal and is not clamped.
export const E_RAIL=.78;
export function resolveCushion(x,y,vx,vy,radius=16){
  let normalSpeed=0,nx=0,ny=0,hit=false;
  // Full power travels 12 units per 2ms quarter-step, still under the 16-unit radius.
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
      vx+=(1+E_RAIL)*incoming*ux;vy+=(1+E_RAIL)*incoming*uy;hit=true;
      if(incoming>normalSpeed){normalSpeed=incoming;nx=ux;ny=uy;}
    }
  }
  return {x,y,vx,vy,normalSpeed,nx,ny,hit};
}
