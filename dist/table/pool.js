import {poolTargets,settlePool,STATE_SIZE,PENALTY_VISIT} from './pool-rules.js?v=20261110-glove2';
import {pocketIndex,resolveCushion,POOL_HOLES} from './pool-geometry.js?v=20261114-pocketdepth1';
import {PLACE_BASE,decodePoolPlace,poolCueInHand,legalCueSpot} from './pool-place.js?v=20261110-glove2';
import {botTuning,jitter,pick} from '../bot-difficulty.js?v=20261112-gamelanes1';

// Deterministic 2D billiard core. The Java authority
// (backend/.../PoolRules.java) mirrors these constants AND the exact
// arithmetic order. The state path uses only + - * / and sqrt; Math.pow is
// evaluated once at module load, never inside the 4800-step loop.
//
// Units: table 1000 x 500, collision radius 16, velocity in table units per
// 8 ms, one simulation step is 2 ms (hence the .25 travel factor).
//
// Spin model: a bounded rigid-body approximation. `wz` is vertical-axis side
// spin, `top` is follow/draw. Side spin bends the path through cloth friction
// at the contact patch (no Magnus term); its transverse acceleration is
// renormalised so it changes direction only, never speed. This is an
// engineering approximation, not a full 3D rigid-body solve.

/* Pool's cue-speed constant. Snooker deliberately does NOT reuse it: its own
   30%-softer value lives in snooker.js and is passed in as the optional
   `shotSpeed` argument below. Keeping the default here means the 8-ball path
   is bit-for-bit unchanged. */
export const SHOT_SPEED=0.48;
// Cloth drag: .991 used to be the speed retained per 8 ms (a .009 loss).
// Cutting that loss by a quarter twice gives .99325, then .9949375
// (.00675 -> .0050625 loss); the .25 exponent converts the same per-8ms rate
// to the 2 ms simulation step. Keep PoolRules.java in step.
const DAMP=Math.pow(.9949375,.25);
const SIDE=[0,0,Math.SQRT1_2,1,Math.SQRT1_2,0,-Math.SQRT1_2,-1,-Math.SQRT1_2];
const FOLLOW=[0,1,Math.SQRT1_2,0,-Math.SQRT1_2,-1,-Math.SQRT1_2,0,Math.SQRT1_2];
const SIDE_K=.020, WZ_DECAY=.9975;
const TOP_K=.00025, TP_DECAY=.996;
const E_BALL=.95, MU_BB=.05, SPIN_R=.55, SPIN_T=.22;
const MU_RAIL=.20, RAIL_SPIN_K=.020, RAIL_WZ_DECAY=.62;
// Rest threshold. The old .035 let a ball crawl for ~3 s below unit speed,
// which felt sluggish and made every shot take 4-6 s regardless of power.
// .2 shortens a shot by 25-34% while preserving slow rolls into pockets:
// higher values were measured to strand balls in front of the jaws.
const STOP=.2;

export function poolStart(){const cells=Array(STATE_SIZE).fill(0);cells[0]=2500;cells[1]=2500;cells[2]=1;const rack=[1,9,2,10,8,3,4,11,5,12,6,13,7,14,15];let k=0;for(let col=0;col<5;col++)for(let row=0;row<=col;row++){const n=rack[k++];cells[n*3]=6500+col*282;cells[n*3+1]=2500+Math.round((row-col*.5)*326);cells[n*3+2]=1;}return{game:'pool',cells,turn:1,winner:0,over:false,moves:0,fen:'',history:[]};}

/* railTangentLoss caps how much of the tangential (along-rail) velocity a
   single cushion contact may remove, as a fraction of that tangential speed.
   Pool passes 1, i.e. the original min(|vt|, MU_RAIL*railSpeed) Coulomb cap.
   Snooker passes .25: its cue ball has no side-spin field to rebuild the
   sideways component, so a near-perpendicular hit used to zero it completely
   and leave the ball sliding along one horizontal line, bouncing left/right
   forever instead of rebounding upward. At ordinary impact angles
   (|vt| >= .25*railSpeed) the cap is inactive and both games are unchanged. */
/* `shotSpeed` is the per-game power-to-velocity constant. Pool never passes
   it (default SHOT_SPEED); Snooker passes its own constant at 70% of it so a
   full-power snooker stroke travels 30% softer without touching the shared
   SHOT_SPEED, the damping/friction constants or the Java PoolRules mirror. */
export function simulateCueShot(cells,command,ballCount=16,radius=16,railTangentLoss=1,shotSpeed=SHOT_SPEED){
 const spinCode=Math.floor(command/363600),shot=command%363600,power=Math.floor(shot/3600),angle=shot%3600;
 if(!Number.isInteger(command)||command<0||spinCode>8||power<1||power>100)throw Error('shot');
 const side=SIDE[spinCode],follow=FOLLOW[spinCode];
 const c=cells.slice(),x=[],y=[],vx=Array(ballCount).fill(0),vy=Array(ballCount).fill(0),wz=Array(ballCount).fill(0),top=Array(ballCount).fill(0),alive=[];
 for(let i=0;i<ballCount;i++){x[i]=c[i*3]/10;y[i]=c[i*3+1]/10;alive[i]=c[i*3+2]===1;}
 vx[0]=Math.cos(angle*Math.PI/1800)*power*shotSpeed;
 vy[0]=Math.sin(angle*Math.PI/1800)*power*shotSpeed;
 wz[0]=-side*power/100;top[0]=follow*power/100;
 const audioEvents=[],history=[],frame=()=>x.flatMap((v,i)=>[Math.round(v*10),Math.round(y[i]*10),alive[i]?1:0]).join(',');
 let pocket=0,scratch=false,black=false,firstContact=0;const potted=[];
 /* Continuous collision detection. Each ball has a linear flight segment
    across one 2 ms macro step, anchored at (sx,sy) at time t0 in [0,1].
    dvx/dvy is the velocity that produced that segment; it is re-anchored at
    every impact so later contacts in the same step use the new velocity. */
 const sx=[],sy=[],dvx=[],dvy=[],t0=[],dirty=[];
 const CONTACT=radius*2,CONTACT2=CONTACT*CONTACT,MAX_CCD_EVENTS=64;
 // Resting contacts: near-identical velocities leave a ~1e-4 approach that
 // floating-point noise re-triggers forever at t=0. STOP=.2 already zeroes
 // slow balls, so .01 never filters a real impact.
 const MIN_APPROACH=.01;

 for(let step=0;step<4800;step++){
  let speed=0;
  for(let i=0;i<ballCount;i++){
   sx[i]=x[i];sy[i]=y[i];dvx[i]=vx[i];dvy[i]=vy[i];t0[i]=0;dirty[i]=false;
  }
  for(let i=0;i<ballCount;i++)if(alive[i]){
   x[i]+=vx[i]*.25;y[i]+=vy[i]*.25;
   const holeIndex=pocketIndex(x[i],y[i]);
   if(holeIndex>=0){
    audioEvents.push({time:step*2,kind:'pocket',strength:Math.min(1,Math.sqrt(vx[i]*vx[i]+vy[i]*vy[i])/40),vx:vx[i],vy:vy[i],holeIndex,id:i,key:'pocket:'+i});
    alive[i]=false;potted.push(i);vx[i]=vy[i]=wz[i]=top[i]=0;
    if(i===0)scratch=true;else if(i===8)black=true;else pocket++;continue;
   }
   const rail=resolveCushion(x[i],y[i],vx[i],vy[i],radius),railSpeed=rail.normalSpeed;
   x[i]=rail.x;y[i]=rail.y;vx[i]=rail.vx;vy[i]=rail.vy;
   if(rail.hit&&railSpeed>0){
    const nx=rail.nx,ny=rail.ny,tx=-ny,ty=nx,vt=vx[i]*tx+vy[i]*ty;
    // Side spin changes the rebound angle. Coulomb friction removes tangential
    // speed; the spin kick is bounded by the incoming normal speed.
    const kick=RAIL_SPIN_K*railSpeed*wz[i];
    vx[i]+=tx*kick;vy[i]+=ty*kick;
    const friction=Math.min(Math.abs(vt)*railTangentLoss,MU_RAIL*railSpeed);
    if(vt>0){vx[i]-=tx*friction;vy[i]-=ty*friction;}
    else if(vt<0){vx[i]+=tx*friction;vy[i]+=ty*friction;}
    wz[i]*=RAIL_WZ_DECAY;top[i]*=.8;
   }
   if(railSpeed>.12)audioEvents.push({time:step*2,kind:'rail',strength:Math.min(1,railSpeed/40),id:i,key:'rail:'+i});
   // Cloth friction: bounded damping modulation by follow/draw spin.
   const damp=Math.min(.99999,DAMP+TOP_K*top[i]);
   vx[i]*=damp;vy[i]*=damp;
   // Side spin bends the trajectory without changing speed.
   if(wz[i]!==0){
    const sp=Math.sqrt(vx[i]*vx[i]+vy[i]*vy[i]);
    if(sp>1e-9){
     const ox=vx[i],oy=vy[i],k=SIDE_K*wz[i]/sp;
     vx[i]=ox-oy*k;vy[i]=oy+ox*k;
     const ns=Math.sqrt(vx[i]*vx[i]+vy[i]*vy[i]);
     if(ns>1e-9){const s=sp/ns;vx[i]*=s;vy[i]*=s;}
    }
    wz[i]*=WZ_DECAY;if(Math.abs(wz[i])<1e-6)wz[i]=0;
   }
   top[i]*=TP_DECAY;if(Math.abs(top[i])<1e-6)top[i]=0;
   const now=Math.sqrt(vx[i]*vx[i]+vy[i]*vy[i]);
   if(now<STOP){vx[i]=vy[i]=wz[i]=top[i]=0;}
   speed+=Math.sqrt(vx[i]*vx[i]+vy[i]*vy[i]);
  }
  /* Solve every ball pair analytically for its time of impact inside this
     step. The old code sampled positions only at the step end, so a fast cue
     ball penetrated up to 12 units before the contact normal was read and
     thin cuts were bent by 5-13 degrees. Here the earliest impact is applied
     at the exact 2R contact geometry, then both balls travel the remaining
     fraction of the step with their post-impulse velocity. */
  for(let event=0;event<MAX_CCD_EVENTS;event++){
   let bestT=2,bi=-1,bj=-1,bnx=0,bny=0;
   for(let i=0;i<ballCount;i++)if(alive[i])for(let j=i+1;j<ballCount;j++)if(alive[j]){
    const lo=Math.max(t0[i],t0[j]);
    // r(t) = r0 + u*t is the relative position across the whole step.
    const r0x=(sx[j]-dvx[j]*.25*t0[j])-(sx[i]-dvx[i]*.25*t0[i]);
    const r0y=(sy[j]-dvy[j]*.25*t0[j])-(sy[i]-dvy[i]*.25*t0[i]);
    const ux=(dvx[j]-dvx[i])*.25,uy=(dvy[j]-dvy[i])*.25;
    const a=ux*ux+uy*uy;
    if(a<=1e-18)continue;
    const b=2*(r0x*ux+r0y*uy);
    const cc=r0x*r0x+r0y*r0y-CONTACT2;
    let t;
    if(cc<=0)t=lo;                                  // already touching
    else{
     const disc=b*b-4*a*cc;
     if(disc<0)continue;
     t=(-b-Math.sqrt(disc))/(2*a);
     if(t<lo||t>1)continue;
    }
    const cx=r0x+ux*t,cy=r0y+uy*t,d=Math.sqrt(cx*cx+cy*cy);
    if(d<1e-9||cx*ux+cy*uy>=0)continue;              // separating, not impacting
    const nx=cx/d,ny=cy/d;
    if((vx[i]-vx[j])*nx+(vy[i]-vy[j])*ny<=MIN_APPROACH)continue;
    if(t<bestT){bestT=t;bi=i;bj=j;bnx=nx;bny=ny;}
   }
   if(bi<0)break;
   let ciX=sx[bi]+dvx[bi]*.25*(bestT-t0[bi]),ciY=sy[bi]+dvy[bi]*.25*(bestT-t0[bi]);
   let cjX=sx[bj]+dvx[bj]*.25*(bestT-t0[bj]),cjY=sy[bj]+dvy[bj]*.25*(bestT-t0[bj]);
   const dx=cjX-ciX,dy=cjY-ciY,d=Math.sqrt(dx*dx+dy*dy),nx=bnx,ny=bny;
   const overlap=(CONTACT-d)/2;
   if(overlap>0){ciX-=nx*overlap;ciY-=ny*overlap;cjX+=nx*overlap;cjY+=ny*overlap;}
   const approach=(vx[bi]-vx[bj])*nx+(vy[bi]-vy[bj])*ny;
   if(approach>.12)audioEvents.push({time:step*2,kind:'ball',strength:Math.min(1,approach/32),key:bi+':'+bj});
   if(bi===0&&!firstContact)firstContact=bj;
   const incomingX=vx[bi],incomingY=vy[bi],incomingSpeed=Math.sqrt(incomingX*incomingX+incomingY*incomingY);
   const jn=(1+E_BALL)/2*approach;
   vx[bi]-=jn*nx;vy[bi]-=jn*ny;vx[bj]+=jn*nx;vy[bj]+=jn*ny;
   // Tangential Coulomb impulse: throw plus spin transfer.
   const tx=-ny,ty=nx,vt=(vx[bi]-vx[bj])*tx+(vy[bi]-vy[bj])*ty+SPIN_R*(wz[bi]+wz[bj]);
   let jt=-vt*.5;const cap=MU_BB*jn;
   if(jt>cap)jt=cap;else if(jt<-cap)jt=-cap;
   vx[bi]-=jt*tx;vy[bi]-=jt*ty;vx[bj]+=jt*tx;vy[bj]+=jt*ty;
   wz[bi]-=jt*SPIN_T;wz[bj]-=jt*SPIN_T;
   // Follow/draw fires on every real contact, scaled by the surviving spin
   // budget. No permanent contactSpin latch.
   if(bi===0&&top[0]!==0&&incomingSpeed>1e-9){
    const spinSpeed=Math.min(power*shotSpeed*Math.abs(top[0]),incomingSpeed)*Math.min(1,approach/incomingSpeed);
    const forward=spinSpeed*.36*follow,lateral=spinSpeed*.18*side;
    const limit=Math.min(incomingSpeed,Math.sqrt(vx[0]*vx[0]+vy[0]*vy[0]+forward*forward+lateral*lateral));
    vx[0]+=(incomingX*forward-incomingY*lateral)/incomingSpeed;
    vy[0]+=(incomingY*forward+incomingX*lateral)/incomingSpeed;
    const outgoing=Math.sqrt(vx[0]*vx[0]+vy[0]*vy[0]);
    if(outgoing>limit){vx[0]*=limit/outgoing;vy[0]*=limit/outgoing;}
    top[0]*=.45;
   }
   top[bj]+=top[bi]*.2;
   // Re-anchor at the impact: the rest of this step uses the new velocity.
   sx[bi]=ciX;sy[bi]=ciY;t0[bi]=bestT;dvx[bi]=vx[bi];dvy[bi]=vy[bi];dirty[bi]=true;
   sx[bj]=cjX;sy[bj]=cjY;t0[bj]=bestT;dvx[bj]=vx[bj];dvy[bj]=vy[bj];dirty[bj]=true;
  }
  for(let i=0;i<ballCount;i++)if(dirty[i]){
   x[i]=sx[i]+dvx[i]*.25*(1-t0[i]);y[i]=sy[i]+dvy[i]*.25*(1-t0[i]);
   // Position-only clamp: the cushion impulse was already applied above.
   const rail=resolveCushion(x[i],y[i],vx[i],vy[i],radius);
   x[i]=rail.x;y[i]=rail.y;
  }
  if(step%8===0&&history.length<600)history.push(frame());
  if(speed<.04&&step>1)break;
 }
 // Always expose the pocket transition before cue-ball respawn, even between replay samples.
 if(scratch){if(history.at(-1)?.split(',')[2]!=='0')history.push(frame());alive[0]=true;outer:for(let xx=180;xx<=420;xx+=30)for(let yy=80;yy<450;yy+=30){if(x.every((v,i)=>i===0||!alive[i]||Math.sqrt((xx-v)*(xx-v)+(yy-y[i])*(yy-y[i]))>=33)){x[0]=xx;y[0]=yy;break outer;}}}
 for(let i=0;i<ballCount;i++){c[i*3]=Math.round(x[i]*10);c[i*3+1]=Math.round(y[i]*10);c[i*3+2]=alive[i]?1:0;}
 history.push(frame());return {c,potted,firstContact,history,audioEvents,black,pocket};
}

/* Ball in hand is a state update, not a turn: the spot is authoritative, can
   be adjusted repeatedly, and the following shot starts from that exact spot. */
export function placePoolCue(s,actor,command){
 const spot=decodePoolPlace(command);
 if(!spot||!poolCueInHand(s)||!legalCueSpot(s.cells,spot.x,spot.y))throw Error('place');
 const cells=Array.from({length:STATE_SIZE},(_,i)=>s.cells[i]||0);
 cells[0]=spot.x;cells[1]=spot.y;
 return {game:'pool',cells,turn:s.turn,winner:s.winner,over:s.over,moves:s.moves,
  fen:s.fen,history:[],audioEvents:[],shotCommand:s.shotCommand??null};
}

export function poolMove(s,actor,command){
 if(s.over||s.turn!==actor)throw Error('turn');
 // Any command at or above the place prefix is a placement attempt; an
 // out-of-range spot is rejected by placePoolCue instead of being parsed as a shot.
 if(Number.isFinite(command)&&command>=PLACE_BASE)return placePoolCue(s,actor,command);
 const cells=Array.from({length:STATE_SIZE},(_,i)=>s.cells[i]||0);
 const {c,potted,firstContact,history,audioEvents,black,pocket}=simulateCueShot(cells,command);
 const result=settlePool(s.cells,c,actor,potted,firstContact);const over=result.over||s.moves+1>=200,winner=result.over?result.winner:over?(c[48]===c[49]?0:c[48]>c[49]?1:2):0;if(over)c[PENALTY_VISIT]=0;return{game:'pool',cells:c,turn:result.turn,winner,over,moves:s.moves+1,fen:result.foul?'犯规：'+result.foulReason:black?'8号球落袋':'本杆落袋 '+pocket+' 颗',history,audioEvents,shotCommand:command};
}

// Aim at the ghost ball for the most open pocket instead of the object-ball
// centre, scale power by distance, and use a light follow/draw spot.
/* The classic computer opponent: nearest legal ball, then its nearest pocket.
   Kept verbatim as the "normal" level and as the no-level legacy path. */
function legacyPoolBot(s){
 const c=s.cells;let target=8,best=Infinity;
 for(const i of poolTargets(c,s.turn)){const dx=c[i*3]-c[0],dy=c[i*3+1]-c[1],d=Math.sqrt(dx*dx+dy*dy);if(d<best){target=i;best=d;}}
 const tx=c[target*3]/10,ty=c[target*3+1]/10,cx=c[0]/10,cy=c[1]/10;
 let hole=POOL_HOLES[0],hd=Infinity;
 for(const h of POOL_HOLES){const dx=h[0]-tx,dy=h[1]-ty,d=dx*dx+dy*dy;if(d<hd){hd=d;hole=h;}}
 let px=tx-hole[0],py=ty-hole[1];const pl=Math.sqrt(px*px+py*py)||1;
 const gx=tx+32*px/pl,gy=ty+32*py/pl;
 const a=(Math.round(Math.atan2(gy-cy,gx-cx)*1800/Math.PI)+3600)%3600;
 const power=Math.max(28,Math.min(92,Math.round(34+Math.sqrt((gx-cx)*(gx-cx)+(gy-cy)*(gy-cy))/14)));
 const spot=best>3200?1:5;
 return spot*363600+power*3600+a;
}
/* Distance from a point to a segment, in table units. Used by Pro and Hell to
   notice a ball parked in the cue path or in the object-ball -> pocket lane. */
function segmentDistance(px,py,ax,ay,bx,by){
 const dx=bx-ax,dy=by-ay,len=dx*dx+dy*dy;
 const t=len?Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/len)):0;
 return Math.hypot(px-(ax+t*dx),py-(ay+t*dy));
}
/* Every legal ball x pocket combination, scored by the whole cue-ball ->
   ghost-ball -> pocket path, plus three safety terms shared by Pro and Hell:
   a live 8-ball in the cue lane, between the object ball and its pocket, or
   parked against the target is priced so a greedy "cheapest path" can never
   carry the 8-ball in by accident (an early 8 is an instant loss); impossible
   cut angles are rejected; and a ball in either lane (a likely wrong-first-
   contact foul) is penalised. Hell additionally prefers the straighter,
   higher-percentage cut. */
function poolShots(s,precise){
 const c=s.cells,out=[],cx=c[0]/10,cy=c[1]/10;
 /* The 8-ball is never a legal target while a group is still open. */
 const eightAlive=c[8*3+2]===1,ex=eightAlive?c[8*3]/10:0,ey=eightAlive?c[8*3+1]/10:0;
 const blockers=[];
 for(let j=1;j<16;j++)if(c[j*3+2])blockers.push([c[j*3]/10,c[j*3+1]/10,j]);
 for(const i of poolTargets(c,s.turn)){
  const tx=c[i*3]/10,ty=c[i*3+1]/10;
  const ballDist=Math.sqrt((c[i*3]-c[0])**2+(c[i*3+1]-c[1])**2);
  for(const h of POOL_HOLES){
   const px=tx-h[0],py=ty-h[1],pl=Math.sqrt(px*px+py*py)||1;
   const gx=tx+32*px/pl,gy=ty+32*py/pl;
   const dx=gx-cx,dy=gy-cy;
   const dist=Math.sqrt(dx*dx+dy*dy)||1;
   let penalty=0;
   /* cos of the cut angle: the cue must approach the ghost ball from the
      side OPPOSITE the pocket. A non-positive cosine means the approach is
      from behind the pocket, which cannot pot. */
   const cos=(dx*(-px)+dy*(-py))/(dist*pl);
   if(cos<=0)continue;
   if(eightAlive&&i!==8){
    /* An 8-ball in the cue lane is hit before the target; one in the
       object->pocket lane is carried toward the pocket with it; one parked
       against the target scatters into a pocket on the carom. Price all three
       heavily but keep the shot, so a forced thin lane is still available. */
    if(segmentDistance(ex,ey,cx,cy,gx,gy)<32)penalty+=1600;
    if(segmentDistance(ex,ey,tx,ty,h[0],h[1])<40)penalty+=1600;
    if(Math.hypot(ex-tx,ey-ty)<48)penalty+=1200;
   }
   /* A ball parked in either lane usually means a wrong first contact (foul)
      or a wasted shot, so Pro and Hell both prefer a clear lane. */
   for(const [bx,by,j] of blockers){
    if(j===i||j===8)continue;
    if(segmentDistance(bx,by,cx,cy,gx,gy)<32)penalty+=300;
    if(segmentDistance(bx,by,tx,ty,h[0],h[1])<32)penalty+=300;
   }
   if(precise){
    /* Hell additionally prefers the straighter, higher-percentage cut. */
    penalty+=(1-cos)*60;
   }
   const a=(Math.round(Math.atan2(gy-cy,gx-cx)*1800/Math.PI)+3600)%3600;
   const power=Math.max(28,Math.min(92,Math.round(34+dist/14)));
   /* A close pocket is a reliable pot, so weight the object->pocket leg over
      the cue->ghost leg; that is what wins frames, not the shortest walk. */
   out.push({a,power,spot:ballDist>3200?1:5,cost:dist*.4+Math.sqrt(px*px+py*py)+penalty});
  }
 }
 return out;
}
const angleOf=command=>command%3600;
const powerOf=command=>Math.floor(command/3600)%101;
const spotOf=command=>Math.floor(command/363600);
export function poolBot(s,level,rng=Math.random){
 const tune=botTuning(level);
 if(!tune||tune.level==='normal')return legacyPoolBot(s);
 if(tune.blunder&&rng()<tune.blunder)
  return 5*363600+(28+Math.floor(rng()*65))*3600+Math.floor(rng()*3600);
 if(tune.level==='easy'){
  const legacy=legacyPoolBot(s);
  const a=(angleOf(legacy)+Math.round(jitter(tune.aimDeg*10,rng))+3600)%3600;
  const power=Math.max(28,Math.min(100,powerOf(legacy)+Math.round(jitter(tune.power,rng))));
  return spotOf(legacy)*363600+power*3600+a;
 }
 const shots=poolShots(s,tune.cue>=2);
 if(!shots.length)return legacyPoolBot(s);
 const best=shots.reduce((a,b)=>b.cost<a.cost?b:a,shots[0]);
 const a=(best.a+Math.round(jitter(tune.aimDeg*10,rng))+3600)%3600;
 const power=Math.max(28,Math.min(100,best.power+Math.round(jitter(tune.power,rng))));
 return best.spot*363600+power*3600+a;
}
export {renderPool} from './pool-view.js?v=20261112-gamelanes1&release=20261115-polishrelease1';
