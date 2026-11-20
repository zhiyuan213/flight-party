import {pocketEntryPath,TABLE_PAD,TABLE_HOLES} from './pool-table.js';
import {drawPoolBall,rollSphere,sphereIdentity} from './pool-ball.js?v=20261112-gamelanes1';
import {tracePocketBack,pocketIndex,expandPocketPoint,pocketVisualContext,POCKET_VISUAL_EXPAND,snookerCirclePath} from './pool-geometry.js';
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
  const points=[],p=(x,y)=>expandPocketPoint(x,y,middle);
  // Follow the DRAWN mouth (visually widened), not the physical capture
  // contour, so a rebound never appears to hit a wall 2 units inside the hole.
  tracePocketBack({
    moveTo(x,y){points.push(p(x,y));},lineTo(x,y){points.push(p(x,y));},
    bezierCurveTo(ax,ay,bx,by,cx,cy){
      const [x,y]=points.at(-1),[a,b]=p(ax,ay),[c,d]=p(bx,by),[e,f]=p(cx,cy);
      for(let i=1;i<=32;i++){const t=i/32,u=1-t;points.push([u*u*u*x+3*u*u*t*a+3*u*t*t*c+t*t*t*e,u*u*u*y+3*u*u*t*b+3*u*t*t*d+t*t*t*f]);}
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
// A hard, off-centre pot can rattle around the curved well before dropping.
// This is a presentation-only branch: the pot itself was already decided by
// pool.js, so it cannot change any state, replay frame or server parity.
// 2026-11-20: cue speed rose 30% (.48 -> .624), so the drive normaliser
// scales with it; otherwise every straight pot would fall into the spiral
// branch. Snooker keeps its own softer speed and is barely affected because
// its high-power strokes are dominated by the stroke-power term below.
// One continuous "drive" level replaces the old pair of hard speed / stroke
// gates. It blends the measured capture speed with the stroke power so a long
// roll still belongs to the shot that produced it. Everything above the soft
// floor is claimed by exactly one of the two effects; only a genuinely gentle
// pot keeps the original single-contact descent.
const DRIVE_SPEED=62.4,DRIVE_FLOOR=.30,POWER_FLOOR=55,POWER_WEIGHT=.62;
const RATTLE_MIN_OFFSET=11;
const RATTLE_RADIUS=16,RATTLE_EXIT_RADIUS=2.2,RATTLE_SINK=9,RATTLE_SPEED=.35,RATTLE_OMEGA=.031;
function driveLevel(item,speed){
  const fromSpeed=Math.max(0,Math.min(1,speed/DRIVE_SPEED));
  const power=item.shotPower,fromPower=Number.isFinite(power)?Math.max(0,Math.min(1,(power-POWER_FLOOR)/(100-POWER_FLOOR))):0;
  return Math.max(fromSpeed,POWER_WEIGHT*fromPower);
}
function rattlePlan(item,hole,x,y,vx,vy){
  if(item.rattle===false||item.rebound===true)return null;
  const speed=Math.hypot(item.vx??0,item.vy??0),drive=driveLevel(item,speed);
  if(item.rattle!==true&&drive<DRIVE_FLOOR)return null;
  const center=hole[0]===500?[0,-26]:[-17,-17],dx=center[0]-x,dy=center[1]-y;
  const len=Math.hypot(vx,vy)||1e-9,dir0=[vx/len,vy/len];
  const cross=dx*dir0[1]-dy*dir0[0],offset=Math.abs(cross),along=dx*dir0[0]+dy*dir0[1];
  // Every glancing entry belongs to the orbit: a large impact parameter, or a
  // ball that has already swept past the well centre. Near-axis pots are left
  // to the rebound branch, so the two branches tile all animated entries.
  if(item.rattle!==true&&offset<RATTLE_MIN_OFFSET&&along>=0)return null;
  const level=item.rattle===true?Math.max(.6,Math.min(1,speed/62.4)):drive;
  const dir=cross>=0?1:-1,theta0=Math.atan2(dir0[1],dir0[0])-dir*Math.PI/2;
  const to=[center[0]+RATTLE_RADIUS*Math.cos(theta0),center[1]+RATTLE_RADIUS*Math.sin(theta0)];
  const from=[x,y],lead=Math.hypot(to[0]-x,to[1]-y);
  // Keep the Hermite lead proportional to its real length: clamping it short
  // used to make a long diagonal approach sprint into the orbit on frame one.
  const start=Math.max(44,Math.min(176,Math.round(lead/RATTLE_SPEED/MOTION_STEP)*MOTION_STEP));
  // A soft graze turns barely half a lap and drops; a full-power one still
  // completes two. The cube-free square keeps the low end short but visible.
  const turns=.25+1.9*level*level+.15*Math.min(1,offset/24);
  const span=Math.min(Math.round(2*Math.PI*turns/RATTLE_OMEGA/MOTION_STEP)*MOTION_STEP,500-start);
  return {from,to,dir0,dir1:dir0,center,theta0,dir,omega:RATTLE_OMEGA,r0:RATTLE_RADIUS,r1:RATTLE_EXIT_RADIUS,
    sink:RATTLE_SINK,speed:RATTLE_SPEED,start,end:start+span,turns:span*RATTLE_OMEGA/(2*Math.PI),level,offset,along};
}
function rattlePose(p,time){
  if(time<=p.start){
    const s=time/p.start,s2=s*s,s3=s2*s,tv=p.start*p.speed;
    const h00=2*s3-3*s2+1,h10=(s3-2*s2+s)*tv,h01=-2*s3+3*s2,h11=(s3-s2)*tv;
    return [h00*p.from[0]+h10*p.dir0[0]+h01*p.to[0]+h11*p.dir1[0],
      h00*p.from[1]+h10*p.dir0[1]+h01*p.to[1]+h11*p.dir1[1]];
  }
  const u=Math.min(1,(time-p.start)/(p.end-p.start)),theta=p.theta0+p.dir*p.omega*(time-p.start);
  const r=p.r0+(p.r1-p.r0)*Math.pow(u,1.3),cy=p.center[1]-p.sink*Math.pow(u,1.5);
  return [p.center[0]+r*Math.cos(theta),cy+r*Math.sin(theta)];
}
function rattleContacts(p,h,sx,sy){
  const count=1+Math.round(2*p.level),out=[];
  for(let i=0;i<count;i++){
    const time=Math.round((p.start+(i+.4)/(count+.3)*(p.end-p.start)*.66)/MOTION_STEP)*MOTION_STEP;
    const [lx,ly]=rattlePose(p,time),rx=lx-p.center[0],ry=ly-p.center[1],d=Math.hypot(rx,ry)||1;
    const nx=rx/d*sx,ny=ry/d*sy,strength=Math.min(1,(.5+.4*p.level)*Math.pow(.55,i)),incoming=.12*strength;
    const vt=p.r0*p.omega,tx=-ny*p.dir,ty=nx*p.dir;
    out.push({time,strength,normalSpeed:incoming*8,x:h[0]+lx*sx,y:h[1]+ly*sy,nx,ny,
      before:[tx*vt-nx*incoming,ty*vt-ny*incoming],
      after:[tx*vt*.9+nx*incoming*.32,ty*vt*.9+ny*incoming*.32]});
  }
  return out;
}
// A straight hard pot rattles back and forth between the back wall and the
// jaws. How many times it comes back is driven by the measured entry speed.
// Like the orbit above, this is presentation only: the pot is already settled
// by pool.js, so no state, replay frame or server parity can be affected.
const REBOUND_MAX_OFFSET=11,REBOUND_MAX_TIME=320;
function reboundLimits(center,u,s0,walls){
  let back=Math.max(s0+8,20);
  for(let s=2;s<=60;s++){
    const px=center[0]+u[0]*s,py=center[1]+u[1]*s;
    let clearance=Infinity;
    for(const w of walls){
      const t=Math.max(0,Math.min(1,((px-w.a[0])*w.dx+(py-w.a[1])*w.dy)/(w.length*w.length)));
      clearance=Math.min(clearance,Math.hypot(px-w.a[0]-w.dx*t,py-w.a[1]-w.dy*t));
    }
    // Stop where the sphere would first touch the real curved back wall.
    if(clearance<R){back=Math.max(s0+8,s-1);break;}
  }
  return {front:Math.max(s0+2,back-30),back};
}
function reboundPlan(item,hole,x,y,vx,vy,walls){
  if(item.rebound===false)return null;
  const speed=Math.hypot(item.vx??0,item.vy??0),drive=driveLevel(item,speed);
  if(item.rebound!==true&&drive<DRIVE_FLOOR)return null;
  const center=hole[0]===500?[0,-26]:[-17,-17],len=Math.hypot(vx,vy)||1e-9,u=[vx/len,vy/len];
  const dx=center[0]-x,dy=center[1]-y,offset=Math.abs(dx*u[1]-dy*u[0]),along=dx*u[0]+dy*u[1];
  // The orbit owns glancing entries; this branch takes the near-axis ones.
  // Because the orbit also claims every ball that has passed the centre, no
  // animated pot can fall through the gap between the two branches.
  if(item.rebound!==true&&(offset>REBOUND_MAX_OFFSET||along<0))return null;
  const level=item.rebound===true?Math.max(.55,Math.min(1,speed/62.4)):drive;
  const s0=(x-center[0])*u[0]+(y-center[1])*u[1];
  // Keep the off-axis part of the real capture point: projecting onto the
  // entry axis alone would teleport the sphere on the very first sample.
  const perp=[x-center[0]-u[0]*s0,y-center[1]-u[1]*s0],limits=reboundLimits(center,u,s0,walls);
  // The well narrows as the ball sinks: each lap is shorter than the last,
  // while the rebound keeps most of its speed. Travel shrinks faster than
  // velocity decays, so the impacts accelerate instead of dragging out.
  // Cube the level so a gentle pot gets a single muted contact and only a
  // near-full-power shot reaches the eight-hit rattle.
  // The widened drawn mouth adds ~2 units to the first lap. Close the funnel
  // slightly faster so the full-power volley keeps its original 240 ms finish.
  return {center,u,perp,s0,...limits,v0:.45+.12*level,rest:.90+.04*level,shrink:.735-.04*level,
    maxBounces:1+Math.round(7.4*level*level*level),level,start:0,end:REBOUND_MAX_TIME,bounces:0};
}
// Velocities use the same table units per 8 ms as the shot simulator. Only the
// closed back of the actual well is a wall; its open mouth never invents a hit.
export function pocketMotion(item){
  const signature=[item.x,item.y,item.vx,item.vy,item.holeIndex,item.strength,item.orientation,item.rattle,item.rebound,item.shotPower],cached=motionCache.get(item);
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
  const rattle=rattlePlan(item,hole,x,y,vx,vy);
  if(rattle){
    // The well is a bowl, not a flat wall: a glancing hard entry keeps its
    // tangential speed and spirals down its inner face. Radius, sink depth
    // and angular rate are analytic, so every 4 ms sample stays continuous.
    for(let time=MOTION_STEP;time<=rattle.end;time+=MOTION_STEP){
      const px=x,py=y,pose=rattlePose(rattle,time);
      x=pose[0];y=pose[1];vx=(x-px)/MOTION_STEP;vy=(y-py)/MOTION_STEP;
      const dx=(x-px)*sx,dy=(y-py)*sy;distance+=Math.hypot(dx,dy);
      orientation=rollSphere(orientation,dx,dy,R);
      samples.push(sample(time));
    }
    contacts.push(...rattleContacts(rattle,h,sx,sy));
    dropAt=rattle.end;
  }
  const rebound=rattle?null:reboundPlan(item,hole,x,y,vx,vy,walls);
  if(rebound){
    // One-dimensional rattle along the measured entry axis. Both ends are
    // real geometry: the back wall is probed above, the near end is the jaw
    // just inside the open lip. Every reversal loses energy, so hard shots
    // get more audible rebounds before the ball finally drops.
    let s=rebound.s0,v=rebound.v0;
    for(let time=MOTION_STEP;time<=rebound.end;time+=MOTION_STEP){
      const px=x,py=y;s+=v*MOTION_STEP;
      let hit=0;
      // The incoming ball must reach the back wall first; only after that
      // rebound can the near jaw turn it around again.
      if(s>=rebound.back){s=rebound.back;hit=1;}
      else if(rebound.bounces>0&&s<=rebound.front){s=rebound.front;hit=-1;}
      const incoming=Math.abs(v);
      if(hit){
        v=-v*rebound.rest;rebound.bounces++;
        // Anchor the new lap at the wall just struck and pull the opposite
        // jaw inward: the funnel closes as the ball drops.
        const span=(rebound.back-rebound.front)*rebound.shrink;
        if(hit>0)rebound.front=rebound.back-span;else rebound.back=rebound.front+span;
        const bx=rebound.center[0]+rebound.u[0]*s+rebound.perp[0],by=rebound.center[1]+rebound.u[1]*s+rebound.perp[1];
        const before=[rebound.u[0]*hit*incoming*sx,rebound.u[1]*hit*incoming*sy],after=[rebound.u[0]*v*sx,rebound.u[1]*v*sy];
        contacts.push({time,strength:Math.min(1,incoming/.6),normalSpeed:incoming*8/visualScale,
          x:h[0]+bx*sx,y:h[1]+by*sy,nx:-hit*rebound.u[0]*sx,ny:-hit*rebound.u[1]*sy,before,after});
      }
      x=rebound.center[0]+rebound.u[0]*s+rebound.perp[0];y=rebound.center[1]+rebound.u[1]*s+rebound.perp[1];
      vx=(x-px)/MOTION_STEP;vy=(y-py)/MOTION_STEP;
      const ddx=(x-px)*sx,ddy=(y-py)*sy;distance+=Math.hypot(ddx,ddy);
      orientation=rollSphere(orientation,ddx,ddy,R);
      samples.push(sample(time));
      if(hit&&(rebound.bounces>=rebound.maxBounces||Math.abs(v)<.05)){rebound.end=time;break;}
      v*=Math.exp(-MOTION_STEP*.0012);
      if(time>=REBOUND_MAX_TIME){rebound.end=time;break;}
    }
    dropAt=rebound.end;
  }
  for(let time=MOTION_STEP;!rattle&&!rebound&&time<=POCKET_DURATION+MOTION_STEP;time+=MOTION_STEP){
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
          // Tangential retention is deliberately low: a high value made fast
          // entries scrape around the curved well for the whole descent.
          vx=.32*incoming*nx+.35*tangent*-ny;vy=.32*incoming*ny+.35*tangent*nx;
          if(incoming>.003&&!touching){
            const normalSpeed=incoming*8/visualScale;
            contacts.push({time:Math.min(time,POCKET_DURATION),strength:Math.min(1,normalSpeed/40),normalSpeed,x:h[0]+qx*sx,y:h[1]+qy*sy,nx:nx*sx,ny:ny*sy,before,after:[vx*sx,vy*sy]});
            // Harder entries leave the lip sooner instead of orbiting the rim
            // for a fixed 220 ms. Weak shots keep the longer, softer descent.
            // Derive a continuous impact level from the measured entry vector;
            // item.strength is clamped to 1 and cannot distinguish 90 from 100.
            const impact=Math.max(0,Math.min(1,Math.hypot(item.vx??0,item.vy??0)/48));
            const floor=Math.round(220-90*impact);
            if(contacts.length===1)dropAt=Math.min(380,Math.max(floor,time+90));
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
  const turnDistance=turnTime*(1-Math.exp(-duration/turnTime));
  // A long orbit leaves less time for the hidden chute. Cap its exit speed so
  // the final frames stay continuous even when the effect ends near 500 ms.
  const rawSpeed=(alongDistance-alongVelocity*turnDistance)/(duration-turnDistance);
  const speed=Math.max(-.55,Math.min(.55,rawSpeed));
  const target=[direction[0]*speed,direction[1]*speed];
  for(let time=dropAt+MOTION_STEP;time<=POCKET_DURATION+MOTION_STEP;time+=MOTION_STEP){
    const t=Math.min(time,POCKET_DURATION),age=t-dropAt,turn=turnTime*(1-Math.exp(-age/turnTime));
    const wx=join.x+target[0]*age+(join.vx-target[0])*turn,wy=join.y+target[1]*age+(join.vy-target[1])*turn;
    const previous=samples.at(-1),dx=wx-previous.x,dy=wy-previous.y;distance+=Math.hypot(dx,dy);orientation=rollSphere(orientation,dx,dy,R);
    samples.push({time:t,x:wx,y:wy,vx:target[0]+(join.vx-target[0])*Math.exp(-age/turnTime),vy:target[1]+(join.vy-target[1])*Math.exp(-age/turnTime),distance,orientation});
    if(t===POCKET_DURATION)break;
  }
  const motion={samples,contacts,dropAt,duration:POCKET_DURATION,h,sx,sy,middle,direction,rattle,rebound};motionCache.set(item,{signature,motion});return motion;
}
export function pocketPosition(item,elapsed){
  const motion=pocketMotion(item),time=Math.max(0,Math.min(POCKET_DURATION,elapsed)),index=Math.min(motion.samples.length-2,Math.floor(time/MOTION_STEP));
  const a=motion.samples[index],b=motion.samples[index+1],u=(time-a.time)/(b.time-a.time),x=a.x+(b.x-a.x)*u,y=a.y+(b.y-a.y)*u;
  let depth=Math.max(0,Math.min(1,(time-motion.dropAt)/80));
  if(motion.rattle){
    const r=motion.rattle,s=Math.max(0,Math.min(1,(time-r.start)/(r.end-r.start)));
    // Keep the whole orbit on this side of the lip. Closing the well while the
    // ball is still circling used to hide the effect and read as "drilled in".
    depth=Math.max(depth,.16*s*s);
  }
  if(motion.rebound){
    const r=motion.rebound,s=Math.max(0,Math.min(1,(time-r.start)/(r.end-r.start)));
    // Same for the rapid rebounds: the well closes in the 80 ms after the
    // final impact, not during the visible rattling.
    depth=Math.max(depth,.12*s*s);
  }
  return {x,y,h:motion.h,sx:motion.sx,sy:motion.sy,middle:motion.middle,angle:(a.distance+(b.distance-a.distance)*u)/R,heading:Math.atan2(a.vy,a.vx),orientation:rollSphere(a.orientation,x-a.x,y-a.y,R),depth,rattle:!!motion.rattle,turns:motion.rattle?.turns??0,rebound:!!motion.rebound,bounces:motion.rebound?.bounces??0,visible:time<POCKET_DURATION};
}
function descendingPocketPath(ctx,middle,depth,scale=1){
  // Close the open approach smoothly as the sphere goes below the rim. The
  // sphere itself stays opaque and full-size, then the well edge occludes it.
  const t=depth*depth*(3-2*depth),v=pocketVisualContext(ctx,middle,POCKET_VISUAL_EXPAND,scale);
  ctx.beginPath();tracePocketBack(v,middle);
  if(middle)v.bezierCurveTo(90-67*t,130-129*t,-90+67*t,130-129*t,-26,-20);
  else v.bezierCurveTo(100-98*t,100-82*t,100-82*t,100-98*t,18,-20);
  ctx.closePath();
}
export function drawReturnChannel(ctx,entries,now,layer='all',ballRadius=R,paintBall=null,options={}){
  // Solid-colour games (snooker) reuse the same pocket motion and return
  // channel but need their own sphere painter. The default keeps Pool's
  // numbered balls byte-for-byte unchanged. options.pocketScale squeezes the
  // pocket silhouette (and the descending ball's orbit) toward the hole for
  // snooker's tighter mouths; Pool leaves it at 1 and is byte-identical.
  const sphere=paintBall||((c,id,x,y,r,angle,heading,orientation)=>drawPoolBall(c,id,x,y,r,angle,heading,orientation));
  const pocketScaleFor=middle=>typeof options.pocketScale==='function'?options.pocketScale(middle):options.pocketScale??1;
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
    for(const item of ordered){const p=returnPosition(item,now-item.start);if(p.visible)sphere(ctx,item.id,p.x,p.y,ballRadius,p.angle,p.heading);}
  }
  if(layer!=='under')for(const item of entries){
    const elapsed=now-item.start;if(elapsed<0||elapsed>=POCKET_DURATION||item.x===undefined)continue;
    const p=pocketPosition(item,elapsed);if(!p.visible)continue;
    const s=pocketScaleFor(p.middle);
    ctx.save();ctx.translate(p.h[0],p.h[1]);ctx.scale(p.sx,p.sy);
    if(options.pocketShape==='circle')snookerCirclePath(ctx,p.middle,s,p.depth);
    else if(p.depth>0)descendingPocketPath(ctx,p.middle,p.depth,s);else pocketEntryPath(ctx,p.middle,s);
    ctx.clip();ctx.scale(p.sx,p.sy);ctx.translate(-p.h[0],-p.h[1]);
    // Shrink the ball as it sinks so it visibly recedes into the pocket
    // instead of sliding behind a flat mouth. A smooth ease keeps the first
    // moments at the lip near full size, then the sphere falls away quickly.
    const sink=p.depth*p.depth*(3-2*p.depth);
    const radius=ballRadius*(1-.4*sink);
    // The motion was solved on the shared wide well. Squeeze its centre (not
    // the ball radius) into the smaller snooker mouth so the ball stays inside
    // the visible jaws while dropping.
    const bx=p.h[0]+(p.x-p.h[0])*s,by=p.h[1]+(p.y-p.h[1])*s;
    sphere(ctx,item.id,bx,by,radius,p.angle,p.heading,p.orientation);ctx.restore();
  }
  ctx.restore();
}
