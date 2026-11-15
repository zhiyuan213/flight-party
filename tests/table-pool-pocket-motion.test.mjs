import test from 'node:test';
import assert from 'node:assert/strict';
import {TABLE_PAD,TABLE_HOLES} from '../dist/table/pool-table.js';
import {pocketMotion,pocketPosition,returnTiming,POCKET_DURATION} from '../dist/table/pool-return.js';
import {poolStart,poolMove} from '../dist/table/pool.js';
import {pocketIndex} from '../dist/table/pool-geometry.js';
import {rollSphere,sphereIdentity} from '../dist/table/pool-ball.js';

function entry(holeIndex,{x=0,y=-4,vx=0,vy=-4,...rest}={}){
  const [hx,hy]=TABLE_HOLES[holeIndex],sx=hx===1000?-1:1,sy=hy===500?-1:1;
  return {id:1,holeIndex,start:100,x:TABLE_PAD+hx+x*sx,y:TABLE_PAD+hy+y*sy,vx:vx*sx,vy:vy*sy,...rest};
}

test('straight middle-pocket entry stays on its incoming center line until it reaches the collector',()=>{
  for(const holeIndex of [1,4]){
    const item=entry(holeIndex),motion=pocketMotion(item);
    assert.equal(motion.contacts.length,1,'a central entry hits the back once, not alternating side walls');
    for(let t=0;t<=motion.dropAt;t+=2)assert.equal(pocketPosition(item,t).x,item.x);
    assert.ok(pocketPosition(item,600).x>item.x,'below the rim, the rightward collector carries the ball away');
    assert.equal(motion.contacts[0].nx,0);
    assert.ok(motion.contacts[0].time<motion.dropAt);
  }
});

test('angled entry follows its measured vector until a real cavity-wall contact',()=>{
  const right=entry(1,{vx:1,vy:-4}),left=entry(1,{vx:-1,vy:-4});
  assert.ok(pocketMotion(right).contacts[0].time>40);
  for(const t of [4,12,28,40]){
    const r=pocketPosition(right,t),l=pocketPosition(left,t);
    assert.ok(r.x>right.x&&l.x<left.x);
    assert.ok(Math.abs((r.x-right.x)/(r.y-right.y)+.25)<1e-10,'no sideways attraction or scripted zigzag');
    assert.ok(Math.abs((r.x-right.x)+(l.x-left.x))<1e-9);
    assert.ok(Math.abs(r.y-l.y)<1e-9);
  }
});

test('wall contacts reverse only the incoming normal component and lose energy',()=>{
  for(const holeIndex of [0,1,2,3,4,5]){
    const item=entry(holeIndex,holeIndex%3===1?{vx:1,vy:-4}:{x:0,y:0,vx:-3,vy:-4});
    const motion=pocketMotion(item);assert.ok(motion.contacts.length>0);
    for(const c of motion.contacts){
      const beforeNormal=c.before[0]*c.nx+c.before[1]*c.ny,afterNormal=c.after[0]*c.nx+c.after[1]*c.ny;
      assert.ok(beforeNormal<0&&afterNormal>0);
      assert.ok(Math.abs(afterNormal/(-beforeNormal)-.32)<1e-10);
      assert.ok(Math.hypot(...c.after)<Math.hypot(...c.before));
      assert.ok(c.time>0&&c.time<=motion.dropAt);
      assert.ok(c.strength>0&&c.strength<=1&&c.normalSpeed>0);
      assert.ok(Math.abs(Math.hypot(c.nx,c.ny)-1)<1e-10);
      assert.ok(Math.abs(c.x-(TABLE_PAD+TABLE_HOLES[holeIndex][0]))<55);
      assert.ok(Math.abs(c.y-(TABLE_PAD+TABLE_HOLES[holeIndex][1]))<55);
    }
  }
});

test('weak and stationary entries do not invent two pocket-wall collisions',()=>{
  for(const vy of [0,-.1]){
    const item=entry(1,{vx:0,vy}),motion=pocketMotion(item);
    assert.equal(motion.contacts.length,0);
    if(vy===0)for(const p of motion.samples.filter(p=>p.time<=motion.dropAt)){assert.equal(p.x,item.x);assert.equal(p.y,item.y);}
    assert.equal(pocketPosition(item,0).depth,0);
    assert.equal(pocketPosition(item,motion.dropAt).depth,0);
    assert.equal(pocketPosition(item,POCKET_DURATION).visible,false);
  }
});

test('the same incoming angle mirrors in all four corner wells before their routes diverge',()=>{
  const items=[0,2,3,5].map(i=>entry(i,{x:0,y:0,vx:-3,vy:-4}));
  const last=Math.min(...items.map(i=>pocketMotion(i).dropAt));
  for(const t of [0,16,80,160,last].filter(t=>t<=last)){
    const poses=items.map(item=>{const p=pocketPosition(item,t);return [(p.x-p.h[0])*p.sx,(p.y-p.h[1])*p.sy,p.depth];});
    for(const p of poses.slice(1))for(let axis=0;axis<3;axis++)assert.ok(Math.abs(p[axis]-poses[0][axis])<1e-9);
  }
  assert.deepEqual(items.map(i=>pocketMotion(i).contacts.map(c=>c.time)),Array(4).fill(pocketMotion(items[0]).contacts.map(c=>c.time)));
});

test('five pockets feed right and the lower-right pocket feeds upward under the rim',()=>{
  for(let hole=0;hole<6;hole++){
    const item=entry(hole,hole%3===1?{}:{x:0,y:0,vx:-3,vy:-4}),motion=pocketMotion(item);
    const join=pocketPosition(item,motion.dropAt),late=pocketPosition(item,600),end=pocketPosition(item,650);
    assert.deepEqual(motion.direction,hole===5?[0,-1]:[1,0]);
    assert.ok(hole===5?late.y<join.y:late.x>join.x);
    assert.ok(hole===5?end.y<late.y:end.x>late.x);
    assert.equal(late.depth,1,'the real well silhouette occludes the final route');
    assert.equal(end.visible,false);
    for(const dt of [.01,.1,1]){
      const a=pocketPosition(item,motion.dropAt-dt),b=pocketPosition(item,motion.dropAt+dt);
      assert.ok(Math.hypot(b.x-a.x,b.y-a.y)<=dt*1.2,'the collector join does not teleport the ball');
    }
  }
});

function shotEntry(x,y,angle,power){
  const s=poolStart();for(let i=1;i<16;i++)s.cells[i*3+2]=0;
  s.cells[0]=x*10;s.cells[1]=y*10;
  const result=poolMove(s,1,power*3600+angle),capture=result.audioEvents.find(e=>e.kind==='pocket');
  assert.ok(capture,'fixture must physically enter a pocket');
  const frame=result.history.map(f=>f.split(',').map(Number)).find(f=>!f[2]);
  return {...capture,x:frame[0]/10+TABLE_PAD,y:frame[1]/10+TABLE_PAD};
}

test('real angled shot enters leftward, contacts its left back wall, and does not chatter along it',()=>{
  const item=shotEntry(530,100,2550,30),motion=pocketMotion(item),initial=pocketPosition(item,0),approach=pocketPosition(item,40);
  assert.ok(approach.x<initial.x&&approach.y<initial.y);
  assert.ok(Math.abs((approach.x-initial.x)/(approach.y-initial.y)-item.vx/item.vy)<1e-9);
  assert.ok(motion.contacts[0].x<initial.x&&motion.contacts[0].nx>0);
  assert.ok(motion.contacts.length<=3,'continuous scraping of one curved wall is not repeated impact audio');
  for(let i=1;i<motion.samples.length;i++){
    const a=motion.samples[i-1],b=motion.samples[i];
    assert.ok(Math.hypot(b.x-a.x,b.y-a.y)<=2.3,'4 ms sampling stays spatially continuous');
  }
});

test('shallow real rebounds descend before their center can return onto the cloth',()=>{
  // These lock the legacy straight-descent geometry. A firm 67% stroke is now
  // claimed by the animated orbit branch, so disable both effects explicitly
  // here; the animated path has its own continuity and symmetry tests.
  for(const [x,angle,power] of [[460,2900,20],[490,2650,20],[460,3050,67]]){
    const item={...shotEntry(x,70,angle,power),rattle:false,rebound:false},motion=pocketMotion(item);
    assert.ok(motion.dropAt<220,'the returning open-lip crossing starts descent early');
    for(const p of motion.samples.filter(p=>p.time<=motion.dropAt))assert.equal(pocketIndex(p.x-TABLE_PAD,p.y-TABLE_PAD),item.holeIndex);
    assert.ok(motion.contacts.every(c=>c.time<=motion.dropAt));
  }
});

test('pocket rolling continues the incoming sphere orientation without resetting its numbers',()=>{
  const orientation=rollSphere(sphereIdentity(),37,-29),saved=orientation.slice(),item=entry(1,{orientation});
  assert.deepEqual(pocketPosition(item,0).orientation,orientation);
  const p=pocketPosition(item,4),expected=rollSphere(orientation,p.x-item.x,p.y-item.y);
  for(let i=0;i<9;i++)assert.ok(Math.abs(p.orientation[i]-expected[i])<1e-10);
  assert.deepEqual(orientation,saved,'the captured table orientation is immutable');
  const cached=pocketMotion(item);item.orientation=sphereIdentity();assert.notEqual(pocketMotion(item),cached);
});

test('cue-ball scratches use the identical entry motion without changing under-table route timing',()=>{
  const colored=entry(1),white={...colored,id:0,scratch:true};
  for(const t of [0,32,160,400,650])assert.deepEqual(pocketPosition(colored,t),pocketPosition(white,t));
  assert.equal(returnTiming(white).duration,POCKET_DURATION);
  assert.equal(returnTiming(colored).exitDelay,POCKET_DURATION+544);
  assert.equal(returnTiming(white).exitAt,Infinity);
});

test('motion is cached independently of return-slot updates and reflects corrected velocity metadata',()=>{
  const item=entry(1),first=pocketMotion(item);item.slot=4;item.exitAt=5000;
  assert.equal(pocketMotion(item),first);
  item.vx=1;assert.notEqual(pocketMotion(item),first);
  assert.ok(pocketPosition(item,16).x>item.x);
});

test('contact strength follows incoming speed rather than a repeated fixed sound level',()=>{
  const strengths=[2,4,16,32].map(speed=>{
    const motion=pocketMotion(entry(1,{vy:-speed}));assert.ok(motion.contacts.length>0);return motion.contacts[0].strength;
  });
  for(let i=1;i<strengths.length;i++)assert.ok(strengths[i]>strengths[i-1]);
});
