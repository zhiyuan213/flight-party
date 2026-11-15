import test from 'node:test';
import assert from 'node:assert/strict';
import {TABLE_PAD,TABLE_HOLES} from '../dist/table/pool-table.js';
import {pocketMotion,pocketPosition,POCKET_DURATION} from '../dist/table/pool-return.js';
import {poolStart,poolMove} from '../dist/table/pool.js';

// A real shot is used wherever possible so the trigger is checked against the
// same measured capture the game feeds to the pocket renderer.
function shot(x,y,angle,power){
  const s=poolStart();for(let i=1;i<16;i++)s.cells[i*3+2]=0;
  s.cells[0]=x*10;s.cells[1]=y*10;
  const r=poolMove(s,1,power*3600+angle),cap=r.audioEvents.find(e=>e.kind==='pocket');
  assert.ok(cap,'fixture must physically pot');
  const f=r.history.map(v=>v.split(',').map(Number)).find(v=>!v[2]);
  return {result:r,item:{...cap,id:3,start:0,scratch:true,x:f[0]/10+TABLE_PAD,y:f[1]/10+TABLE_PAD}};
}
function entry(holeIndex,{x=0,y=-6,vx=0,vy=-4,...rest}={}){
  const [hx,hy]=TABLE_HOLES[holeIndex],sx=hx===1000?-1:1,sy=hy===500?-1:1;
  return {id:3,holeIndex,start:0,x:TABLE_PAD+hx+x*sx,y:TABLE_PAD+hy+y*sy,vx:vx*sx,vy:vy*sy,...rest};
}

test('gentle pots stay quiet; a medium graze turns fewer laps than a full-power one',()=>{
  const quiet=[
    shot(500,100,2700,30).item,                 // gentle straight pot
    shot(460,70,2900,20).item,                 // gentle shallow pot
    entry(1),entry(1,{vy:-32}),entry(1,{vx:8,vy:-24})
  ];
  for(const item of quiet)assert.equal(pocketMotion(item).rattle,null,'quiet entry must not orbit');
  // Drive is continuous now: a medium stroke still animates, but turns far
  // less and drops sooner instead of silently drilling into the pocket.
  const turns=power=>pocketMotion(shot(410,70,3200,power).item).rattle?.turns??0;
  assert.ok(turns(65)>0,'a 65% graze no longer falls through the gap');
  assert.ok(turns(65)<turns(80)&&turns(80)<turns(100),'softer strokes turn fewer laps');
  assert.ok(turns(65)<1.2,'a medium stroke turns about one lap at most');
  for(const [args] of [[[410,70,3200,100]],[[420,70,3200,90]],[[440,70,3100,100]]]){
    const m=pocketMotion(shot(...args).item);
    assert.ok(m.rattle,'hard glancing pot should orbit the well');
    assert.ok(m.rattle.turns>1.5&&m.rattle.turns<2.7);
    assert.ok(m.rattle.offset>=11,'the offset threshold no longer leaves a gap');
  }
});

test('the orbit is sampled on the 4 ms grid and never jumps farther than one normal pocket step',()=>{
  for(const args of [[410,70,3200,100],[420,70,3200,90],[440,70,3100,100]]){
    const item=shot(...args).item,m=pocketMotion(item),r=m.rattle;
    assert.equal(r.start%4,0);assert.equal(r.end%4,0);assert.ok(r.end<POCKET_DURATION);
    assert.equal(m.dropAt,r.end);
    assert.equal(m.samples[0].time,0);
    for(let i=1;i<m.samples.length;i++){
      const a=m.samples[i-1],b=m.samples[i];
      assert.ok(b.time>a.time&&b.time<=POCKET_DURATION);
      assert.ok(Math.hypot(b.x-a.x,b.y-a.y)<=2.3,'orbit stays spatially continuous');
      assert.ok(Number.isFinite(b.vx)&&Number.isFinite(b.vy));
    }
    // Radius shrinks and the centre sinks: the last orbit lap is tighter than the first.
    const centre=r.center,local=p=>({x:(p.x-m.h[0])*m.sx,y:(p.y-m.h[1])*m.sy});
    const first=local(m.samples[Math.round(r.start/4)+8]),last=local(m.samples[Math.round(r.end/4)]);
    assert.ok(Math.hypot(last.x-centre[0],last.y-centre[1])<Math.hypot(first.x-centre[0],first.y-centre[1]));
  }
});

test('a rattling ball sinks gradually, mirrors when the entry mirrors, and is gone at 650 ms',()=>{
  const item=shot(410,70,3200,100).item,m=pocketMotion(item);
  let previous=0;
  for(let t=0;t<=POCKET_DURATION;t+=20){
    const p=pocketPosition(item,t);
    assert.ok(p.rattle&&p.turns>1.5);
    assert.ok(p.depth>=previous-1e-12,'depth only increases');
    previous=p.depth;
  }
  assert.equal(pocketPosition(item,m.rattle.start).depth,0);
  assert.ok(pocketPosition(item,m.rattle.start+80).depth<.15,'the first lap stays visible');
  assert.equal(pocketPosition(item,600).depth,1);
  assert.equal(pocketPosition(item,POCKET_DURATION).visible,false);

  const right=pocketMotion(entry(1,{vx:32,vy:-30,rattle:true})).rattle;
  const left=pocketMotion(entry(1,{vx:-32,vy:-30,rattle:true})).rattle;
  assert.equal(right.dir,-left.dir,'opposite grazing sides orbit in opposite directions');
  assert.ok(right.turns>0&&left.turns>0);
});

test('orbit contacts decay, precede the drop, and describe a legal wall normal',()=>{
  const m=pocketMotion(shot(410,70,3200,100).item);
  assert.ok(m.contacts.length>=2);
  for(let i=0;i<m.contacts.length;i++){
    const c=m.contacts[i];
    assert.ok(c.time>0&&c.time<m.dropAt);
    assert.ok(c.strength>0&&c.strength<=1&&c.normalSpeed>0);
    assert.ok(Math.abs(Math.hypot(c.nx,c.ny)-1)<1e-10);
    assert.ok(Math.hypot(...c.after)<Math.hypot(...c.before),'each scrape loses energy');
    const before=c.before[0]*c.nx+c.before[1]*c.ny,after=c.after[0]*c.nx+c.after[1]*c.ny;
    assert.ok(before<0&&after>0);
    if(i)assert.ok(c.time>m.contacts[i-1].time&&c.strength<m.contacts[i-1].strength);
  }
});

test('the explicit switch overrides detection and invalidates the motion cache',()=>{
  const base=shot(410,70,3200,100).item;
  const off={...base,rattle:false},quiet=entry(1,{vx:0,vy:-4,rattle:true});
  assert.equal(pocketMotion(off).rattle,null);
  assert.ok(pocketMotion(quiet).rattle,'a forced rattle works even on a soft entry');
  assert.ok(pocketMotion(base).rattle,'the live item was never mutated by the forced copies');
  const cached=pocketMotion(base);
  assert.equal(pocketMotion(base),cached);
  base.rattle=false;
  assert.equal(pocketMotion(base).rattle,null);
  assert.notEqual(pocketMotion(base),cached,'the switch is part of the cache signature');
});

test('rattle is presentation only: the resolved state and pocket events are identical',()=>{
  const a=shot(410,70,3200,100),b=shot(410,70,3200,100);
  const on=pocketMotion(a.item),off=pocketMotion({...b.item,rattle:false});
  assert.ok(on.rattle&&!off.rattle);
  assert.deepEqual(a.result.cells,b.result.cells);
  assert.deepEqual(a.result.audioEvents,b.result.audioEvents);
  assert.deepEqual(a.result.history,b.result.history);
  assert.equal(on.duration,off.duration);
  assert.equal(on.h.length,2);
  // Turning the effect off restores the original descent exactly.
  const plain=pocketMotion({...a.item,rattle:false});
  assert.deepEqual(off.samples.map(s=>s.time),plain.samples.map(s=>s.time));
});
