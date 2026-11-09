import {pocketEntryPath,TABLE_PAD,TABLE_HOLES} from './pool-table.js';
import {drawPoolBall,rollSphere,sphereIdentity} from './pool-ball.js';
import {tracePocketBack,pocketIndex} from './pool-geometry.js';
const R=16,SPACING=33,ARC_RADIUS=40,LEAD_IN=28;
const EXIT_X=TABLE_PAD+1044,EXIT_Y=TABLE_PAD+2,ARC_X=EXIT_X+LEAD_IN,ARC_Y=EXIT_Y+ARC_RADIUS;
export const RETURN_X=ARC_X+ARC_RADIUS,RETURN_BOTTOM=TABLE_PAD+509;
export const POCKET_DURATION=650,RETURN_SPEED=.38,HIDDEN_SPEED=1,MIN_EXIT_GAP=180,RETURN_SETTLE_DURATION=220;
const ARC_LENGTH=ARC_RADIUS*Math.PI/2;
function pocket(item){
  if(Number.isInteger(item.holeIndex)&&TABLE_HOLES[item.holeIndex])return TABLE_HOLES[item.holeIndex];
  if(!Number.isFinite(item.x)||!Number.isFinite(item.y))return TABLE_HOLES[2];
  const x=item.x-TABLE_PAD,y=item.y-TABLE_PAD;
  return TABLE_HOLES.reduce((a,b)=>Math.hypot(x-b[0],y-b[1])<Math.hypot(x-a[0],y-a[1])?b:a);
}
function pathLength(slot){return LEAD_IN+ARC_LENGTH+Math.max(0,RETURN_BOTTOM-slot*SPACING-ARC_Y);}
export function returnTiming(item={},index=0){
  if(item.scratch){const start=Number.isFinite(item.start)?item.start:0;return {distance:0,slot:-1,exitDelay:Infinity,travelDuration:0,visibleDuration:0,exitAt:Infinity,impactAt:start+160,impactDelay:160,completeAt:start+POCKET_DURATION,duration:POCKET_DURATION};}
  const hole=pocket(item),distance=1044-hole[0]+hole[1],slot=item.slot??index;
  // Under-table route: horizontally to the right collector, up its side, then 44 units to the outlet.
  const exitDelay=POCKET_DURATION+distance/HIDDEN_SPEED,start=Number.isFinite(item.start)?item.start:0;
  const exitAt=Number.isFinite(item.exitAt)?item.exitAt:start+exitDelay,travelDuration=pathLength(slot)/RETURN_SPEED;
  const impactAt=exitAt+travelDuration,completeAt=impactAt+RETURN_SETTLE_DURATION;
  return {distance,slot,exitDelay,travelDuration,visibleDuration:travelDuration+RETURN_SETTLE_DURATION,exitAt,impactAt,impactDelay:impactAt-start,completeAt,duration:completeAt-start};
}
// Legacy duration refers to the nearest (top-right) pocket only. Callers with entries must use returnTiming.
export const RETURN_DURATION=returnTiming({}).duration;
export function scheduleReturns(entries){
  const ordered=entries.filter(item=>!item.scratch).map((item,order)=>({item,order,ready:(Number.isFinite(item.start)?item.start:0)+POCKET_DURATION+(1044-pocket(item)[0]+pocket(item)[1])/HIDDEN_SPEED})).sort((a,b)=>a.ready-b.ready||a.order-b.order);
  let previous=-Infinity,previousComplete=-Infinity;
  for(let slot=0;slot<ordered.length;slot++){
    const {item,ready}=ordered[slot],travelDuration=pathLength(slot)/RETURN_SPEED;item.slot=slot;
    // Keep followers upstream until the preceding ball has completed its rebound.
    item.exitAt=Math.max(ready,previous+MIN_EXIT_GAP,previousComplete+30-travelDuration);
    item.impactAt=item.exitAt+travelDuration;item.completeAt=item.impactAt+RETURN_SETTLE_DURATION;
    previous=item.exitAt;previousComplete=item.completeAt;
  }
  return ordered.map(({item})=>item);
}
export function returnPosition(itemOrIndex,elapsed){
  const item=typeof itemOrIndex==='number'?{slot:itemOrIndex,start:0}:itemOrIndex;
  if(item.scratch)return {x:EXIT_X,y:EXIT_Y,visible:false,angle:0,heading:0};
  const timing=returnTiming(item),start=Number.isFinite(item.start)?item.start:0,visibleAge=elapsed-(timing.exitAt-start);
  if(visibleAge<0)return {x:EXIT_X,y:EXIT_Y,visible:false,angle:0,heading:0};
  if(elapsed>=timing.duration-1e-8)return {x:RETURN_X,y:RETURN_BOTTOM-timing.slot*SPACING,visible:true,angle:pathLength(timing.slot)/R,heading:Math.PI/2};
  if(elapsed>=timing.impactDelay){
    const u=Math.max(0,Math.min(1,(elapsed-timing.impactDelay)/RETURN_SETTLE_DURATION)),bounce=3*Math.sin(Math.PI*u);
    return {x:RETURN_X,y:RETURN_BOTTOM-timing.slot*SPACING-bounce,visible:true,angle:(pathLength(timing.slot)-bounce)/R,heading:Math.PI/2};
  }
  const d=Math.min(pathLength(timing.slot),Math.max(0,visibleAge*RETURN_SPEED));
  if(d<LEAD_IN)return {x:EXIT_X+d,y:EXIT_Y,visible:true,angle:d/R,heading:0};
  if(d<LEAD_IN+ARC_LENGTH){const a=(d-LEAD_IN)/ARC_RADIUS;return {x:ARC_X+ARC_RADIUS*Math.sin(a),y:ARC_Y-ARC_RADIUS*Math.cos(a),visible:true,angle:d/R,heading:a};}
  return {x:RETURN_X,y:Math.min(RETURN_BOTTOM-timing.slot*SPACING,ARC_Y+d-LEAD_IN-ARC_LENGTH),visible:true,angle:d/R,heading:Math.PI/2};
}
const MOTION_STEP=4,motionCache=new WeakMap();
function backWall(middle){
  const points=[];
  tracePocketBack({
    moveTo(x,y){points.push([x,y]);},lineTo(x,y){points.push([x,y]);},
    bezierCurveTo(ax,ay,bx,by,cx,cy){
      const [x,y]=points.at(-1);
      for(let i=1;i<=32;i++){const t=i/32,u=1-t;points.push([u*u*u*x+3*u*u*t*ax+3*u*t*t*bx+t*t*t*cx,u*u*u*y+3*u*u*t*ay+3*u*t*t*by+t*t*t*cy]);}
    }
  },middle);
  const center=middle?[0,-26]:[-17,-17];
  return points.slice(1).map((b,i)=>{
    const a=points[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
    let nx=-dy/length,ny=dx/length;
    if((center[0]-a[0])*nx+(center[1]-a[1])*ny<0){nx=-nx;ny=-ny;}
    return {a,dx,dy,length,nx,ny};
  });
}
const backWalls=[backWall(false),backWall(true)];
// Velocities use the same table units per 8 ms as the shot simulator. Only the
// closed back of the actual well is a wall; its open mouth never invents a hit.
export function pocketMotion(item){
  const signature=[item.x,item.y,item.vx,item.vy,item.holeIndex,item.strength,item.orientation],cached=motionCache.get(item);
  if(cached&&signature.every((v,i)=>Object.is(v,cached.signature[i])))return cached.motion;
  const hole=pocket(item),h=[hole[0]+TABLE_PAD,hole[1]+TABLE_PAD],sx=hole[0]===1000?-1:1,sy=hole[1]===500?-1:1,middle=hole[0]===500;
  let x=((Number.isFinite(item.x)?item.x:h[0])-h[0])*sx,y=((Number.isFinite(item.y)?item.y:h[1])-h[1])*sy;
  // Old snapshots without velocity still descend naturally; current replays
  // always supply their measured incoming vector, including a stationary ball.
  let vx,vy;
  if(Number.isFinite(item.vx)&&Number.isFinite(item.vy)){vx=item.vx*sx/8;vy=item.vy*sy/8;}
  else{const dx=(middle?0:-17)-x,dy=(middle?-29:-17)-y,d=Math.hypot(dx,dy)||1,speed=.14+.18*(item.strength??.5);vx=dx/d*speed;vy=dy/d*speed;}
  // The ball loses speed as it drops into the padded pocket. Limit only speed,
  // retaining the incoming direction instead of steering toward either side.
  const visualScale=Math.min(1,.55/(Math.hypot(vx,vy)||1));vx*=visualScale;vy*=visualScale;
  const samples=[],contacts=[],walls=backWalls[middle?1:0],holeIndex=TABLE_HOLES.indexOf(hole);
  let distance=0,orientation=Array.isArray(item.orientation)&&item.orientation.length===9&&item.orientation.every(Number.isFinite)?item.orientation.slice():sphereIdentity();
  let dropAt=380,touching=false,insideSeen=pocketIndex(h[0]+x*sx-TABLE_PAD,h[1]+y*sy-TABLE_PAD)===holeIndex;
  const sample=time=>({time,x:h[0]+x*sx,y:h[1]+y*sy,vx:vx*sx,vy:vy*sy,distance,orientation});
  samples.push(sample(0));
  for(let time=MOTION_STEP;time<=POCKET_DURATION+MOTION_STEP;time+=MOTION_STEP){
    const dt=Math.min(MOTION_STEP,POCKET_DURATION-(time-MOTION_STEP));if(dt<=0)break;
    const px=x,py=y;x+=vx*dt;y+=vy*dt;
    const insideWell=pocketIndex(h[0]+x*sx-TABLE_PAD,h[1]+y*sy-TABLE_PAD)===holeIndex;
    // A captured ball cannot climb back onto the cloth. If a real rebound
    // reaches the open lip, it drops below it instead of hitting a fake wall.
    if(insideSeen&&!insideWell&&(middle?y>-20:x+y>-2)){x=px;y=py;dropAt=time-dt;break;}
    insideSeen||=insideWell;
    if(time<=dropAt){
      let nearest=null,clearance=Infinity;
      for(const wall of walls){
        const t=Math.max(0,Math.min(1,((x-wall.a[0])*wall.dx+(y-wall.a[1])*wall.dy)/(wall.length*wall.length)));
        const qx=wall.a[0]+wall.dx*t,qy=wall.a[1]+wall.dy*t,dx=x-qx,dy=y-qy,d=Math.hypot(dx,dy);
        clearance=Math.min(clearance,d);
        if(d<R&&(!nearest||d<nearest.d))nearest={wall,qx,qy,dx,dy,d};
      }
      if(clearance>R+.2)touching=false;
      // The exact crest is horizontal. Preserve its symmetry instead of using
      // either neighboring tessellation chord as an arbitrary sideways normal.
      if(middle&&Math.abs(x)<1e-9&&Math.abs(vx)<1e-9&&y<-38){nearest={wall:{nx:0,ny:1},qx:0,qy:-54,dx:0,dy:y+54,d:Math.abs(y+54)};}
      if(nearest){
        const {wall,qx,qy,dx,dy,d}=nearest,inside=dx*wall.nx+dy*wall.ny>=0;
        const nx=inside&&d>1e-9?dx/d:wall.nx,ny=inside&&d>1e-9?dy/d:wall.ny,incoming=-(vx*nx+vy*ny);
        x+=nx*(inside?R-d:R+d);y+=ny*(inside?R-d:R+d);
        if(incoming>0){
          const before=[vx*sx,vy*sy],tangent=vx*-ny+vy*nx;
          vx=.32*incoming*nx+.8*tangent*-ny;vy=.32*incoming*ny+.8*tangent*nx;
          if(incoming>.003&&!touching){
            const normalSpeed=incoming*8/visualScale;
            contacts.push({time:Math.min(time,POCKET_DURATION),strength:Math.min(1,normalSpeed/40),normalSpeed,x:h[0]+qx*sx,y:h[1]+qy*sy,nx:nx*sx,ny:ny*sy,before,after:[vx*sx,vy*sy]});
            if(contacts.length===1)dropAt=Math.min(380,Math.max(220,time+140));
          }
          touching=true;
        }
      }
    }
    const decay=Math.exp(-dt*.002);vx*=decay;vy*=decay;
    const dx=(x-px)*sx,dy=(y-py)*sy;distance+=Math.hypot(dx,dy);orientation=rollSphere(orientation,dx,dy,R);
    samples.push(sample(Math.min(time,POCKET_DURATION)));
    if(time>=dropAt)break;
  }
  // Below the lip the collector turns toward the real under-table outlet:
  // five pockets feed rightward; the lower-right pocket feeds upward. Preserve
  // entry velocity at the join, then ease its direction into the hidden chute.
  const join=samples.at(-1);dropAt=join.time;
  const direction=holeIndex===5?[0,-1]:[1,0],turnTime=32,duration=POCKET_DURATION-dropAt;
  const end=direction[0]?(h[0]+(middle?26:sx===1?18:54)+R+20):h[1]-18-R-20;
  const alongVelocity=join.vx*direction[0]+join.vy*direction[1],alongDistance=direction[0]?(end-join.x):(join.y-end);
  const turnDistance=turnTime*(1-Math.exp(-duration/turnTime)),speed=(alongDistance-alongVelocity*turnDistance)/(duration-turnDistance);
  const target=[direction[0]*speed,direction[1]*speed];
  for(let time=dropAt+MOTION_STEP;time<=POCKET_DURATION+MOTION_STEP;time+=MOTION_STEP){
    const t=Math.min(time,POCKET_DURATION),age=t-dropAt,turn=turnTime*(1-Math.exp(-age/turnTime));
    const wx=join.x+target[0]*age+(join.vx-target[0])*turn,wy=join.y+target[1]*age+(join.vy-target[1])*turn;
    const previous=samples.at(-1),dx=wx-previous.x,dy=wy-previous.y;distance+=Math.hypot(dx,dy);orientation=rollSphere(orientation,dx,dy,R);
    samples.push({time:t,x:wx,y:wy,vx:target[0]+(join.vx-target[0])*Math.exp(-age/turnTime),vy:target[1]+(join.vy-target[1])*Math.exp(-age/turnTime),distance,orientation});
    if(t===POCKET_DURATION)break;
  }
  const motion={samples,contacts,dropAt,duration:POCKET_DURATION,h,sx,sy,middle,direction};motionCache.set(item,{signature,motion});return motion;
}
export function pocketPosition(item,elapsed){
  const motion=pocketMotion(item),time=Math.max(0,Math.min(POCKET_DURATION,elapsed)),index=Math.min(motion.samples.length-2,Math.floor(time/MOTION_STEP));
  const a=motion.samples[index],b=motion.samples[index+1],u=(time-a.time)/(b.time-a.time),x=a.x+(b.x-a.x)*u,y=a.y+(b.y-a.y)*u;
  const depth=Math.max(0,Math.min(1,(time-motion.dropAt)/80));
  return {x,y,h:motion.h,sx:motion.sx,sy:motion.sy,middle:motion.middle,angle:(a.distance+(b.distance-a.distance)*u)/R,heading:Math.atan2(a.vy,a.vx),orientation:rollSphere(a.orientation,x-a.x,y-a.y,R),depth,visible:time<POCKET_DURATION};
}
function descendingPocketPath(ctx,middle,depth){
  // Close the open approach smoothly as the sphere goes below the rim. The
  // sphere itself stays opaque and full-size, then the well edge occludes it.
  const t=depth*depth*(3-2*depth);ctx.beginPath();tracePocketBack(ctx,middle);
  if(middle)ctx.bezierCurveTo(90-67*t,130-129*t,-90+67*t,130-129*t,-26,-20);
  else ctx.bezierCurveTo(100-98*t,100-82*t,100-82*t,100-98*t,18,-20);
  ctx.closePath();
}
export function drawReturnChannel(ctx,entries,now,layer='all',ballRadius=R){
  const ordered=scheduleReturns(entries);
  ctx.save();ctx.lineJoin='round';ctx.lineCap='round';
  if(layer!=='pockets'){
    const channel=()=>{ctx.beginPath();ctx.moveTo(TABLE_PAD+1034,EXIT_Y);ctx.lineTo(ARC_X,EXIT_Y);ctx.arc(ARC_X,ARC_Y,ARC_RADIUS,-Math.PI/2,0);ctx.lineTo(RETURN_X,RETURN_BOTTOM);};
    // Two independent rails: a 4-unit raised gold rim, a 5-unit dark gap,
    // then a 4-unit lower dark rail around the 39-unit rolling floor.
    // Rounded stroke ends preserve two distinct U-shaped rails below the final ball.
    ctx.save();ctx.shadowColor='#000a';ctx.shadowBlur=5;ctx.shadowOffsetY=4;ctx.strokeStyle='#c6a13b';ctx.lineWidth=65;channel();ctx.stroke();ctx.restore();
    ctx.strokeStyle='#020709';ctx.lineWidth=57;channel();ctx.stroke();
    ctx.strokeStyle='#59491f';ctx.lineWidth=47;channel();ctx.stroke();
    ctx.strokeStyle='#070c0f';ctx.lineWidth=39;channel();ctx.stroke();
    // A few braces connect only the gap between rails, never the ball passage.
    ctx.save();ctx.lineCap='butt';
    for(const y of [ARC_Y+105,ARC_Y+265,ARC_Y+425]){
      for(const [a,b] of [[RETURN_X-28.5,RETURN_X-23.5],[RETURN_X+23.5,RETURN_X+28.5]]){
        ctx.strokeStyle='#5d491e';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(a,y);ctx.lineTo(b,y);ctx.stroke();
      }
    }
    ctx.restore();
    for(const item of ordered){const p=returnPosition(item,now-item.start);if(p.visible)drawPoolBall(ctx,item.id,p.x,p.y,ballRadius,p.angle,p.heading);}
  }
  if(layer!=='under')for(const item of entries){
    const elapsed=now-item.start;if(elapsed<0||elapsed>=POCKET_DURATION||item.x===undefined)continue;
    const p=pocketPosition(item,elapsed);if(!p.visible)continue;
    ctx.save();ctx.translate(p.h[0],p.h[1]);ctx.scale(p.sx,p.sy);
    if(p.depth>0)descendingPocketPath(ctx,p.middle,p.depth);else pocketEntryPath(ctx,p.middle);
    ctx.clip();ctx.scale(p.sx,p.sy);ctx.translate(-p.h[0],-p.h[1]);
    drawPoolBall(ctx,item.id,p.x,p.y,ballRadius,p.angle,p.heading,p.orientation);ctx.restore();
  }
  ctx.restore();
}
