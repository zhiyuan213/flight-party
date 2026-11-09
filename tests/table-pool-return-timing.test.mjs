import test from 'node:test';
import assert from 'node:assert/strict';
import {TABLE_PAD,TABLE_HOLES,TABLE_WIDTH} from '../dist/table/pool-table.js';
import {RETURN_X,RETURN_BOTTOM,RETURN_DURATION,RETURN_SPEED,RETURN_SETTLE_DURATION,MIN_EXIT_GAP,POCKET_DURATION,returnTiming,returnPosition,pocketPosition,pocketMotion,scheduleReturns} from '../dist/table/pool-return.js';
const entry=(holeIndex,start=0,id=holeIndex+1)=>({id,holeIndex,start,x:TABLE_PAD+TABLE_HOLES[holeIndex][0],y:TABLE_PAD+TABLE_HOLES[holeIndex][1]});
test('each pocket delay follows the horizontal collector then upward route length',()=>{
  const distances=TABLE_HOLES.map((_,i)=>returnTiming(entry(i)).distance);
  assert.deepEqual(distances,[1044,544,44,1544,1044,544]);
  assert.ok(returnTiming(entry(3)).exitDelay>returnTiming(entry(2)).exitDelay);
  for(let i=0;i<6;i++)assert.equal(returnTiming(entry(i)).exitDelay,POCKET_DURATION+distances[i]);
});
test('slot order follows outlet arrival, not pocket event insertion order',()=>{
  const far=entry(3,0),near=entry(2,100),middle=entry(1,20),ordered=scheduleReturns([far,near,middle]);
  assert.deepEqual(ordered.map(e=>e.holeIndex),[2,1,3]);assert.deepEqual(ordered.map(e=>e.slot),[0,1,2]);
  assert.equal(returnPosition(near,returnTiming(near).duration).y,RETURN_BOTTOM);
  assert.equal(returnPosition(far,returnTiming(far).duration).y,RETURN_BOTTOM-66);
});
test('simultaneous arrivals queue through the curved outlet with no ball overlap',()=>{
  const entries=Array.from({length:15},(_,i)=>entry(2,0,i+1));scheduleReturns(entries);
  for(let i=1;i<entries.length;i++)assert.ok(entries[i].exitAt-entries[i-1].exitAt>=MIN_EXIT_GAP);
  for(let now=entries[0].exitAt;now<=entries.at(-1).completeAt+10;now+=7){
    const visible=entries.map(e=>returnPosition(e,now-e.start)).filter(p=>p.visible);
    for(let i=0;i<visible.length;i++)for(let j=i+1;j<visible.length;j++)assert.ok(Math.hypot(visible[i].x-visible[j].x,visible[i].y-visible[j].y)>=32,`overlap at ${now}`);
  }
});
test('outlet motion is continuous around the radius and stays hidden until its scheduled exit',()=>{
  const e=entry(0,100);scheduleReturns([e]);const timing=returnTiming(e);
  assert.equal(returnPosition(e,timing.exitAt-e.start-.1).visible,false);
  let previous=returnPosition(e,timing.exitAt-e.start);
  assert.equal(previous.x,TABLE_PAD+1044,'the outlet still starts under the table frame');
  const endOfLead=returnPosition(e,timing.exitAt-e.start+28/RETURN_SPEED);
  assert.equal(endOfLead.x,previous.x+28);assert.equal(endOfLead.y,previous.y,'the inlet remains horizontal before the wider bend');
  assert.equal(RETURN_X,TABLE_PAD+1112,'the wider return channel moves right by 8 units');
  assert.equal(RETURN_X-65/2,TABLE_PAD+1104-49/2,'widening preserves the table-facing clearance');
  assert.ok(RETURN_X+65/2<TABLE_WIDTH,'both rails fit the existing canvas');
  assert.ok(Math.abs(timing.travelDuration*RETURN_SPEED-(28+40*Math.PI/2+467))<1e-8,'arrival time follows the larger radius at the unchanged rolling speed');
  const bendMiddle=returnPosition(e,timing.exitAt-e.start+(28+40*Math.PI/4)/RETURN_SPEED);
  assert.ok(Math.abs(bendMiddle.x-(endOfLead.x+40*Math.SQRT1_2))<1e-8);
  assert.ok(Math.abs(bendMiddle.y-(previous.y+40*(1-Math.SQRT1_2)))<1e-8,'the 40-unit radius leaves a positive 7.5-unit inner curve inside the 65-unit band');
  for(let elapsed=timing.exitAt-e.start+1;elapsed<=timing.impactDelay;elapsed++){
    const p=returnPosition(e,elapsed);assert.ok(Math.hypot(p.x-previous.x,p.y-previous.y)<=RETURN_SPEED+1e-8);assert.ok(p.angle>=previous.angle);previous=p;
  }
  assert.equal(returnPosition(e,timing.duration+1).x,RETURN_X);assert.equal(returnPosition(e,timing.duration+1).y,RETURN_BOTTOM);
});
test('legacy index form uses nearest-pocket duration and settled slot spacing',()=>{
  assert.equal(returnPosition(0,0).visible,false);assert.equal(returnPosition(0,RETURN_DURATION).x,RETURN_X);assert.equal(returnPosition(14,RETURN_DURATION).y,RETURN_BOTTOM-14*33);
});

test('first contact makes a small rebound before the slot becomes completely still',()=>{
  const e=entry(2,50);scheduleReturns([e]);const timing=returnTiming(e);
  assert.equal(timing.completeAt-timing.impactAt,RETURN_SETTLE_DURATION);
  const contact=returnPosition(e,timing.impactDelay),rebound=returnPosition(e,timing.impactDelay+RETURN_SETTLE_DURATION/2),settled=returnPosition(e,timing.duration);
  assert.equal(contact.y,RETURN_BOTTOM);assert.equal(contact.y-rebound.y,3);
  assert.ok(rebound.angle<contact.angle);assert.equal(settled.y,contact.y);
  assert.deepEqual(returnPosition(e,timing.duration+1000),settled);
});
test('following balls contact only after the preceding rebound is settled',()=>{
  const entries=Array.from({length:15},(_,i)=>entry(2,0,i+1));scheduleReturns(entries);
  for(let i=1;i<entries.length;i++)assert.ok(entries[i].impactAt>=entries[i-1].completeAt+29.999);
});
test('scratch has only a pocket animation and never consumes a return slot',()=>{
  const white={...entry(1,100,0),scratch:true},first=entry(2,150,1),second=entry(2,250,2),entries=[white,first,second];
  const ordered=scheduleReturns(entries);assert.deepEqual(ordered,[first,second]);assert.equal(first.slot,0);assert.equal(second.slot,1);assert.equal(white.slot,undefined);
  const timing=returnTiming(white);assert.equal(timing.duration,POCKET_DURATION);assert.equal(timing.completeAt,100+POCKET_DURATION);assert.equal(timing.exitAt,Infinity);assert.equal(timing.impactAt,260);
  for(const elapsed of [0,300,650,10000])assert.equal(returnPosition(white,elapsed).visible,false);
  assert.equal(entries.length,3,'caller retains the scratch entry for its pocket layer');
});


test('corner pocket entry mirrors before the under-table collector takes over',()=>{
  const entries=[0,2,3,5].map(i=>{const e=entry(i);e.x+=i===0||i===3?16:-16;e.y+=i<3?16:-16;return e;});
  const firstDrop=Math.min(...entries.map(e=>pocketMotion(e).dropAt));
  for(const age of [0,40,80,120,160].filter(t=>t<firstDrop)){
    const poses=entries.map(e=>{const p=pocketPosition(e,age);return [(p.x-p.h[0])*p.sx,(p.y-p.h[1])*p.sy];});
    for(const p of poses.slice(1))for(let axis=0;axis<2;axis++)assert.ok(Math.abs(p[axis]-poses[0][axis])<1e-9);
    if(age>=160)assert.ok(poses[0][0]<0&&poses[0][1]<0,'rebound stays inside the recessed corner well');
  }
});
