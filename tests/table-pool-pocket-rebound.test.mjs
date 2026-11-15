import test from 'node:test';
import assert from 'node:assert/strict';
import {TABLE_PAD} from '../dist/table/pool-table.js';
import {pocketMotion,pocketPosition,POCKET_DURATION} from '../dist/table/pool-return.js';
import {poolStart,poolMove} from '../dist/table/pool.js';

// Real shots, so the bounce count is driven by the same measured capture the
// game hands to the pocket renderer.
function shot(x,y,angle,power){
  const s=poolStart();for(let i=1;i<16;i++)s.cells[i*3+2]=0;
  s.cells[0]=x*10;s.cells[1]=y*10;
  const r=poolMove(s,1,power*3600+angle),cap=r.audioEvents.find(e=>e.kind==='pocket');
  assert.ok(cap,'fixture must physically pot');
  const f=r.history.map(v=>v.split(',').map(Number)).find(v=>!v[2]);
  return {result:r,item:{...cap,id:3,start:0,scratch:true,shotPower:power,x:f[0]/10+TABLE_PAD,y:f[1]/10+TABLE_PAD}};
}
const mid=p=>shot(500,100,2700,p).item;
const corner=p=>shot(100,100,2250,p).item;

test('a gentle straight pot keeps one muted contact; a firm one gets only a couple',()=>{
  // Drive floor lowered to .30: a 30% stroke arrives below the speed floor and
  // stays quiet; 40% already crosses it and rattles once.
  for(const power of [30]){
    const m=pocketMotion(mid(power));
    assert.equal(m.rebound,null);
    assert.equal(m.rattle,null);
    assert.equal(m.contacts.length,1);
  }
  // Cloth drag cut twice: power 60 now reaches three rebounds, so 55 is the
  // top of the "a couple of contacts" range.
  for(const power of [40,55]){
    const m=pocketMotion(mid(power));
    assert.ok(m.rebound,'a firm stroke still rattles');
    assert.ok(m.rebound.bounces<=2,'but only a couple of contacts, not the full-power volley');
  }
});

test('bounce count follows measured power: 3 / 6 / 8 rebounds, full power always eight',()=>{
  const counts=[70,90,100].map(p=>{
    const item=mid(p),m=pocketMotion(item);
    assert.ok(m.rebound,'hard straight pot should bounce');
    assert.equal(m.rattle,null,'the spiral branch must stay exclusive');
    assert.equal(m.contacts.length,m.rebound.bounces);
    assert.ok(m.rebound.end>=m.contacts.at(-1).time&&m.rebound.end<POCKET_DURATION);
    assert.equal(m.dropAt,m.rebound.end);
    return m.rebound.bounces;
  });
  assert.deepEqual(counts,[3,6,8]);
  assert.equal(pocketMotion(corner(100)).rebound.bounces,8,'full power is eight on corner pockets too');
});

test('a full-power shot always triggers one of the two pocket effects',()=>{
  const cases=[
    [410,70,3200],   // fast graze: the spiral branch
    [500,70,2700],   // straight and fast: normal rebound
    [460,70,3000],   // the old 10-14 offset gap
    [400,70,2200],   // full power but almost all speed bled away
    [440,70,2400],
    [460,70,2900],
    [500,150,2700],  // longer roll
    [100,100,2250]   // corner pocket
  ];
  for(const [x,y,a] of cases){
    const m=pocketMotion(shot(x,y,a,100).item);
    assert.ok(m.rattle||m.rebound,`full power must animate: x${x} y${y} a${a}`);
    assert.ok(m.rattle?m.rattle.turns>0:m.rebound.bounces>0);
  }
});

test('the fallback is driven by stroke power, not just measured entry speed',()=>{
  const slow=shot(440,70,2400,100).item;
  assert.ok(Math.hypot(slow.vx,slow.vy)<30,'fixture really is a slow arrival');
  const without={...slow,shotPower:undefined};
  // Either pocket effect counts: with lower cloth drag this slow arrival now
  // lands in the spiral branch instead of the straight rebound branch.
  const active=m=>m.rattle||m.rebound;
  assert.equal(active(pocketMotion(without)),null,'without stroke power it stays a plain drop');
  assert.ok(active(pocketMotion(slow)),'stroke power alone triggers one of the two effects');
  const cached=pocketMotion(slow);
  slow.shotPower=50;
  assert.equal(active(pocketMotion(slow)),null);
  assert.notEqual(pocketMotion(slow),cached,'shotPower is part of the cache signature');
});

test('impacts accelerate: gaps never lengthen and the tail is much tighter than the head',()=>{
  for(const item of [mid(70),mid(90),mid(100),corner(100)]){
    const m=pocketMotion(item),times=m.contacts.map(c=>c.time);
    const gaps=times.map((t,i)=>i?t-times[i-1]:t);
    assert.ok(gaps.length>=2);
    // The 4 ms sampling grid can quantise two late impacts onto equal ticks;
    // non-increasing plus a substantially tighter tail is the real contract.
    for(let i=1;i<gaps.length;i++)assert.ok(gaps[i]<=gaps[i-1],`gap ${i} must not lengthen: ${gaps.join('/')}`);
    assert.ok(gaps.at(-1)<gaps[0]*.75,`the volley must accelerate overall: ${gaps.join('/')}`);
    assert.ok(m.dropAt<=320,'a hard rattle finishes quickly instead of dragging out');
  }
  // More pace means an earlier first impact and more of them, not a slower one.
  const slow=pocketMotion(mid(70)),fast=pocketMotion(mid(100));
  // Both volleys can start on the same 4 ms sampling tick; more pace is
  // expressed by extra impacts, not necessarily an earlier first one.
  assert.ok(fast.contacts[0].time<=slow.contacts[0].time);
  assert.ok(fast.rebound.bounces>slow.rebound.bounces);
  assert.equal(fast.rebound.bounces,8);
  assert.ok(fast.dropAt<=250,'eight impacts still finish within about a quarter second');
});

test('each rebound reverses travel along the entry axis and stays spatially continuous',()=>{
  for(const item of [mid(70),mid(90),mid(100),corner(100)]){
    const m=pocketMotion(item),u=m.rebound.u;
    let previous=0,flips=0,maxStep=0;
    for(let i=0;i<m.samples.length;i++){
      const p=m.samples[i];
      if(i){const a=m.samples[i-1];maxStep=Math.max(maxStep,Math.hypot(p.x-a.x,p.y-a.y));}
      if(p.time>m.dropAt)continue;
      const along=(p.vx*m.sx)*u[0]+(p.vy*m.sy)*u[1];
      if(previous&&along*previous<0)flips++;
      if(Math.abs(along)>1e-6)previous=along;
    }
    assert.equal(flips,m.rebound.bounces-1,'one reversal per extra wall contact');
    assert.ok(maxStep<=2.3,'4 ms sampling stays continuous');
    for(let i=1;i<m.samples.length;i++){
      assert.ok(m.samples[i].time>m.samples[i-1].time&&m.samples[i].time<=POCKET_DURATION);
    }
  }
});

test('rebound contacts decay in strength and describe a legal wall normal',()=>{
  for(const item of [mid(70),mid(100)]){
    const m=pocketMotion(item);
    assert.ok(m.contacts.length>=2);
    for(let i=0;i<m.contacts.length;i++){
      const c=m.contacts[i];
      assert.ok(c.time>0&&c.time<=m.dropAt);
      assert.ok(c.strength>0&&c.strength<=1&&c.normalSpeed>0);
      assert.ok(Math.abs(Math.hypot(c.nx,c.ny)-1)<1e-10);
      assert.ok(Math.hypot(...c.after)<Math.hypot(...c.before),'each rebound loses energy');
      const before=c.before[0]*c.nx+c.before[1]*c.ny,after=c.after[0]*c.nx+c.after[1]*c.ny;
      assert.ok(before<0&&after>0);
      if(i)assert.ok(c.time>m.contacts[i-1].time&&c.strength<m.contacts[i-1].strength);
    }
  }
});

test('the ball sinks gradually during the rebounds and is gone at 650 ms',()=>{
  const item=mid(100),m=pocketMotion(item);
  let previous=0;
  for(let t=0;t<=POCKET_DURATION;t+=20){
    const p=pocketPosition(item,t);
    assert.ok(p.rebound&&!p.rattle);
    assert.equal(p.bounces,m.rebound.bounces);
    assert.ok(p.depth>=previous-1e-12,'depth only increases');
    previous=p.depth;
  }
  assert.equal(pocketPosition(item,0).depth,0);
  assert.ok(pocketPosition(item,120).depth<.3,'early rebounds stay visible');
  assert.equal(pocketPosition(item,640).depth,1);
  assert.equal(pocketPosition(item,POCKET_DURATION).visible,false);
});

test('glancing hard entries still spiral and never enter the rebound branch',()=>{
  const m=pocketMotion(shot(410,70,3200,100).item);
  assert.ok(m.rattle&&m.rattle.turns>1.5);
  assert.equal(m.rebound,null);
});

test('the explicit switch overrides detection and invalidates the motion cache',()=>{
  const base=mid(100);
  const off={...base,rebound:false},forced={...mid(30),rebound:true};
  assert.equal(pocketMotion(off).rebound,null);
  assert.ok(pocketMotion(forced).rebound,'a forced rebound works even on a soft entry');
  const cached=pocketMotion(base);
  assert.equal(pocketMotion(base),cached);
  base.rebound=false;
  assert.equal(pocketMotion(base).rebound,null);
  assert.notEqual(pocketMotion(base),cached,'the switch is part of the cache signature');
});

test('rebound is presentation only: resolved state, events and frames are identical',()=>{
  const a=shot(500,100,2700,100),b=shot(500,100,2700,100);
  const on=pocketMotion(a.item),off=pocketMotion({...b.item,rebound:false});
  assert.ok(on.rebound&&!off.rebound);
  assert.deepEqual(a.result.cells,b.result.cells);
  assert.deepEqual(a.result.audioEvents,b.result.audioEvents);
  assert.deepEqual(a.result.history,b.result.history);
  assert.equal(on.duration,off.duration);
  assert.equal(off.contacts.length,1,'with the effect off the old single contact returns');
});
