import {TABLE_PAD} from './pool-table.js';
import {POOL_HOLES,snookerPockets,snookerCirclePath,SNOOKER_POCKET_SCALE} from './pool-geometry.js';
import {rollSphere,sphereIdentity} from './pool-ball.js?v=20261113-pocketdepth1';
import {radius as BALL_RADIUS} from './snooker.js?v=20261110-dotblack1&release=20261115-polishrelease1&power=20261120-poolpower30';

/* Presentation only. The authoritative shot has already potted this ball.
 * Work in the actual recessed snooker circles, never a scaled Pool well:
 * the approach may cross the open throat, but every orbit/contact is inside
 * the black hole, with enough clearance for the whole eleven-unit sphere. */
export const SNOOKER_POCKET_DURATION=650;
const R=BALL_RADIUS,STEP=4,TAU=Math.PI*2,cache=new WeakMap();
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=t=>t*t*(3-2*t);
const mix=(a,b,t)=>a+(b-a)*t;
const unit=(x,y,fallback=[0,-1])=>{const d=Math.hypot(x,y);return d>1e-8?[x/d,y/d]:fallback;};
function holeFor(item){
  if(Number.isInteger(item.holeIndex)&&POOL_HOLES[item.holeIndex])return item.holeIndex;
  const x=(Number.isFinite(item.x)?item.x:TABLE_PAD+1000)-TABLE_PAD;
  const y=(Number.isFinite(item.y)?item.y:TABLE_PAD)-TABLE_PAD;
  let index=0,distance=Infinity;
  for(let i=0;i<POOL_HOLES.length;i++){const [hx,hy]=POOL_HOLES[i],d=Math.hypot(x-hx,y-hy);if(d<distance){index=i;distance=d;}}
  return index;
}
function bezier(a,b,c,d,t){const u=1-t;return [u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*d[0],u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*d[1]];}

export function snookerPocketMotion(item){
  const signature=[item.x,item.y,item.vx,item.vy,item.holeIndex,item.strength,...(item.orientation||[])];
  const old=cache.get(item);if(old&&signature.length===old.signature.length&&signature.every((v,i)=>Object.is(v,old.signature[i])))return old.motion;
  const index=holeFor(item),well=snookerPockets(SNOOKER_POCKET_SCALE)[index];
  const [hx,hy]=POOL_HOLES[index],center=[well.x+TABLE_PAD,well.y+TABLE_PAD];
  const from=[Number.isFinite(item.x)?item.x:hx+TABLE_PAD,Number.isFinite(item.y)?item.y:hy+TABLE_PAD];
  const measured=Number.isFinite(item.vx)&&Number.isFinite(item.vy);
  const incoming=measured?Math.hypot(item.vx,item.vy):clamp(item.strength??.2)*36;
  const level=clamp(incoming/48),toward=unit(center[0]-from[0],center[1]-from[1]);
  const velocity=measured?unit(item.vx,item.vy,toward):toward;
  const cross=(center[0]-from[0])*velocity[1]-(center[1]-from[1])*velocity[0];
  const offset=Math.abs(cross),glancing=offset>well.r*.24&&incoming>1;
  const mode=glancing?'orbit':'rebound',safeRadius=Math.max(0,well.r-R-.5);
  const entryRadius=Math.min(safeRadius,Math.hypot(from[0]-center[0],from[1]-center[1]));
  const radial=unit(from[0]-center[0],from[1]-center[1],[-velocity[0],-velocity[1]]);
  const entry=[center[0]+radial[0]*entryRadius,center[1]+radial[1]*entryRadius];
  const leadDistance=Math.hypot(entry[0]-from[0],entry[1]-from[1]);
  const leadEnd=Math.ceil(clamp(leadDistance/(.18+.38*level),28,164)/STEP)*STEP;
  const dir=cross>=0?1:-1,theta0=Math.atan2(radial[1],radial[0]);
  const tangent=[-radial[1]*dir,radial[0]*dir];
  // An outward/stale snapshot vector cannot make an approach loop on baize.
  const approachDirection=velocity[0]*toward[0]+velocity[1]*toward[1]>.15?velocity:toward;
  const handle=Math.min(leadDistance*.22,8);
  const a=[from[0]+approachDirection[0]*handle,from[1]+approachDirection[1]*handle];
  const endDirection=glancing?tangent:[-radial[0],-radial[1]];
  const b=[entry[0]-endDirection[0]*handle,entry[1]-endDirection[1]*handle];
  const contacts=[],turns=glancing?.22+1.28*level:0,bounces=glancing?0:1+Math.floor(3.2*level);
  const effectDuration=Math.round((glancing?170+210*level:150+210*level)/STEP)*STEP;
  let dropAt=leadEnd+effectDuration;
  const knots=[{time:leadEnd,p:entry}];
  if(!glancing){
    const weights=Array.from({length:bounces},(_,i)=>Math.pow(.78,i));
    const total=weights.reduce((a,b)=>a+b,0);let age=0;
    for(let i=0;i<bounces;i++){
      age+=weights[i]/total*(effectDuration-36);
      const amplitude=safeRadius*Math.pow(.67,i),sign=i%2===0?-1:1;
      const p=[center[0]+radial[0]*amplitude*sign,center[1]+radial[1]*amplitude*sign];
      const time=leadEnd+Math.round(age/STEP)*STEP;
      knots.push({time,p});
      contacts.push({time,strength:(.16+.7*level)*Math.pow(.59,i),x:p[0],y:p[1],nx:-radial[0]*sign,ny:-radial[1]*sign});
    }
    knots.push({time:dropAt,p:center});
  }else{
    // A glancing ball rolls around the padded inner wall. Small soft taps
    // follow that visible orbit; their times also drive the existing audio.
    const count=1+Math.floor(level*2);
    for(let i=0;i<count;i++){
      const u=(i+.25)/(count+.5),theta=theta0+dir*TAU*turns*u;
      const rr=mix(entryRadius,Math.min(entryRadius,1.5),smooth(u));
      contacts.push({time:leadEnd+Math.round(effectDuration*u/STEP)*STEP,strength:(.12+.35*level)*Math.pow(.62,i),
        x:center[0]+Math.cos(theta)*rr,y:center[1]+Math.sin(theta)*rr,nx:-Math.cos(theta),ny:-Math.sin(theta)});
    }
  }
  function effectPose(time){
    if(glancing){const u=clamp((time-leadEnd)/effectDuration),theta=theta0+dir*TAU*turns*u,rr=mix(entryRadius,Math.min(entryRadius,1.5),smooth(u));return [center[0]+Math.cos(theta)*rr,center[1]+Math.sin(theta)*rr];}
    const next=knots.findIndex(k=>k.time>=time),j=Math.max(1,next<0?knots.length-1:next),left=knots[j-1],right=knots[j];
    const u=clamp((time-left.time)/(right.time-left.time));return [mix(left.p[0],right.p[0],u),mix(left.p[1],right.p[1],u)];
  }
  const sinkFrom=effectPose(dropAt),sinkDuration=Math.min(110,SNOOKER_POCKET_DURATION-dropAt),samples=[];
  let orientation=Array.isArray(item.orientation)&&item.orientation.length===9&&item.orientation.every(Number.isFinite)?item.orientation.slice():sphereIdentity(),distance=0;
  const times=[];for(let t=0;t<SNOOKER_POCKET_DURATION;t+=STEP)times.push(t);times.push(SNOOKER_POCKET_DURATION);
  for(const time of times){
    const depth=clamp((time-dropAt)/sinkDuration),sink=smooth(depth);
    const point=time<leadEnd?bezier(from,a,b,entry,time/leadEnd):time<dropAt?effectPose(time):[mix(sinkFrom[0],center[0],sink),mix(sinkFrom[1],center[1],sink)];
    const previous=samples.at(-1),dx=previous?point[0]-previous.x:0,dy=previous?point[1]-previous.y:0;
    distance+=Math.hypot(dx,dy);orientation=rollSphere(orientation,dx,dy,R);
    samples.push({time,x:point[0],y:point[1],distance,orientation,depth,phase:time<leadEnd?'approach':time<dropAt?mode:'sink'});
  }
  const motion={samples,contacts,dropAt,duration:SNOOKER_POCKET_DURATION,leadEnd,sinkDuration,center,well,index,
    h:[hx+TABLE_PAD,hy+TABLE_PAD],sx:hx===1000?-1:1,sy:hy===500?-1:1,middle:well.middle,
    mode,level,turns,bounces,safeRadius,rattle:glancing?{start:leadEnd,end:dropAt,turns}:null,rebound:glancing?null:{start:leadEnd,end:dropAt,bounces}};
  cache.set(item,{signature,motion});return motion;
}

export function snookerPocketPosition(item,elapsed){
  const m=snookerPocketMotion(item),time=clamp(elapsed,0,SNOOKER_POCKET_DURATION);
  const i=Math.min(m.samples.length-2,Math.floor(time/STEP)),a=m.samples[i],b=m.samples[i+1],u=(time-a.time)/(b.time-a.time);
  const x=mix(a.x,b.x,u),y=mix(a.y,b.y,u),depth=clamp((time-m.dropAt)/m.sinkDuration);
  return {x,y,depth,phase:time<m.leadEnd?'approach':time<m.dropAt?m.mode:'sink',
    angle:mix(a.distance,b.distance,u)/R,heading:Math.atan2(b.y-a.y,b.x-a.x),orientation:rollSphere(a.orientation,x-a.x,y-a.y,R),
    visible:elapsed>=0&&time<m.dropAt+m.sinkDuration&&time<SNOOKER_POCKET_DURATION,
    radiusScale:1-.7*smooth(depth),opacity:1-Math.pow(smooth(depth),3),rattle:m.mode==='orbit',rebound:m.mode==='rebound',turns:m.turns,bounces:m.bounces};
}

export function drawSnookerPocketDrops(ctx,entries,now,ballRadius=R,paintBall){
  for(const item of entries){
    const elapsed=now-item.start;if(elapsed<0||elapsed>=SNOOKER_POCKET_DURATION)continue;
    const p=snookerPocketPosition(item,elapsed);if(!p.visible)continue;
    const m=snookerPocketMotion(item);ctx.save();
    if(p.phase==='approach'){
      ctx.translate(m.h[0],m.h[1]);ctx.scale(m.sx,m.sy);snookerCirclePath(ctx,m.middle,SNOOKER_POCKET_SCALE,0);ctx.clip();
      ctx.scale(m.sx,m.sy);ctx.translate(-m.h[0],-m.h[1]);
    }else{ctx.beginPath();ctx.arc(m.center[0],m.center[1],m.well.r,0,TAU);ctx.clip();}
    ctx.globalAlpha*=p.opacity;
    paintBall(ctx,item.id,p.x,p.y,ballRadius*p.radiusScale,p.angle,p.heading,p.orientation);
    ctx.restore();
  }
}
