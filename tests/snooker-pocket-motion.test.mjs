import test from 'node:test';
import assert from 'node:assert/strict';
import {TABLE_PAD} from '../dist/table/pool-table.js';
import {snookerPockets,SNOOKER_POCKET_SCALE} from '../dist/table/pool-geometry.js';
import {snookerPocketMotion,snookerPocketPosition,SNOOKER_POCKET_DURATION,drawSnookerPocketDrops} from '../dist/table/snooker-pocket-motion.js';
import {radius} from '../dist/table/snooker.js';

function entry(index,speed=40,glancing=false){
  const well=snookerPockets(SNOOKER_POCKET_SCALE)[index];
  const radial=well.middle?[0,well.y<250?1:-1]:[well.x<500?Math.SQRT1_2:-Math.SQRT1_2,well.y<250?Math.SQRT1_2:-Math.SQRT1_2];
  let vx=-radial[0]-(glancing?radial[1]*.7:0),vy=-radial[1]+(glancing?radial[0]*.7:0),length=Math.hypot(vx,vy);
  return {id:7,holeIndex:index,x:TABLE_PAD+well.x+radial[0]*(well.r+6),y:TABLE_PAD+well.y+radial[1]*(well.r+6),vx:vx/length*speed,vy:vy/length*speed,start:0};
}

test('snooker capture starts at the real replay position, without Pool scaling',()=>{
  for(let index=0;index<6;index++)for(const glancing of [false,true]){
    const item=entry(index,48,glancing),p=snookerPocketPosition(item,0),m=snookerPocketMotion(item);
    assert.equal(p.x,item.x);assert.equal(p.y,item.y);
    assert.equal(m.mode,glancing?'orbit':'rebound');
    let before=p;
    for(let time=1;time<=SNOOKER_POCKET_DURATION;time++){
      const next=snookerPocketPosition(item,time);assert.ok(Math.hypot(next.x-before.x,next.y-before.y)<1.1,'continuous trajectory');before=next;
    }
  }
});

test('every snooker orbit and rebound keeps the whole sphere inside the black circle at all six mouths',()=>{
  for(let index=0;index<6;index++)for(const glancing of [false,true])for(const speed of [2,12,26,48]){
    const item=entry(index,speed,glancing),m=snookerPocketMotion(item);
    for(let time=m.leadEnd;time<=SNOOKER_POCKET_DURATION;time++){
      const p=snookerPocketPosition(item,time),d=Math.hypot(p.x-m.center[0],p.y-m.center[1]);
      assert.ok(d+radius*p.radiusScale<=m.well.r+.0001,`${index} ${m.mode} ${speed} ${time}`);
    }
    for(const hit of m.contacts){
      assert.ok(hit.time>=m.leadEnd&&hit.time<=m.dropAt);
      assert.ok(Math.hypot(hit.x-m.center[0],hit.y-m.center[1])+radius<=m.well.r+.0001);
    }
    assert.ok(m.dropAt+m.sinkDuration<=SNOOKER_POCKET_DURATION);
  }
});

test('entry speed controls snooker rebound count and orbit length, even after a powerful slow shot',()=>{
  const slow=snookerPocketMotion(entry(1,4)),medium=snookerPocketMotion(entry(1,26)),hard=snookerPocketMotion(entry(1,48));
  assert.equal(slow.bounces,1);assert.equal(medium.bounces,2);assert.equal(hard.bounces,4);
  assert.equal(hard.contacts.length,4);
  const slowGraze=snookerPocketMotion({...entry(1,4,true),shotPower:100}),hardGraze=snookerPocketMotion(entry(1,48,true));
  assert.ok(slowGraze.turns<.4);assert.ok(hardGraze.turns>1.4);
  assert.ok(slowGraze.dropAt<hardGraze.dropAt);
  assert.ok(hard.contacts.every((hit,i)=>!i||hit.strength<hard.contacts[i-1].strength));
});

test('snooker pocket audio contacts match the visible reversals and descending phase',()=>{
  const item=entry(1,48),m=snookerPocketMotion(item);
  for(const contact of m.contacts){
    const p=snookerPocketPosition(item,contact.time),before=snookerPocketPosition(item,contact.time-2),after=snookerPocketPosition(item,contact.time+2);
    assert.ok(Math.hypot(p.x-contact.x,p.y-contact.y)<1e-8);
    assert.ok((p.x-before.x)*(after.x-p.x)+(p.y-before.y)*(after.y-p.y)<0,'changes direction at contact');
  }
  assert.equal(snookerPocketPosition(item,m.dropAt).depth,0);
  assert.ok(snookerPocketPosition(item,m.dropAt+60).depth>0);
  assert.equal(snookerPocketPosition(item,m.dropAt+m.sinkDuration).visible,false);
  assert.equal(snookerPocketPosition(item,SNOOKER_POCKET_DURATION).visible,false);
});

test('snooker pocket cache follows changed inputs and handles snapshot-only balls',()=>{
  const item=entry(0,48),copy=structuredClone(item),first=snookerPocketMotion(item);
  assert.equal(snookerPocketMotion(item),first);assert.deepEqual(item,copy);
  item.vx*=.2;item.vy*=.2;assert.notEqual(snookerPocketMotion(item),first);
  for(const snapshot of [{id:0,x:TABLE_PAD+500,y:TABLE_PAD,strength:.2},{id:7,holeIndex:4,strength:.6},{id:7,holeIndex:1,vx:0,vy:0}]){
    const m=snookerPocketMotion(snapshot);assert.ok(m.samples.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));assert.equal(m.mode,'rebound');
  }
  const inside={id:7,holeIndex:1,x:TABLE_PAD+500,y:TABLE_PAD-20,vx:0,vy:-26},m=snookerPocketMotion(inside);
  for(let t=0;t<=m.leadEnd;t++){
    const p=snookerPocketPosition(inside,t);assert.ok(Math.hypot(p.x-m.center[0],p.y-m.center[1])<=5+.0001,'already captured balls never back out toward cloth');
  }
});

test('snooker renderer clips the orbit to the actual well and keeps the unscaled position',()=>{
  const item=entry(1,48,true),m=snookerPocketMotion(item),elapsed=m.leadEnd+60,p=snookerPocketPosition(item,elapsed),arcs=[],balls=[];
  const ctx={globalAlpha:1,save(){},restore(){},beginPath(){},arc(...args){arcs.push(args);},clip(){}};
  drawSnookerPocketDrops(ctx,[item],elapsed,radius,(...args)=>balls.push(args));
  assert.deepEqual(arcs[0].slice(0,3),[...m.center,m.well.r]);assert.equal(balls.length,1);
  assert.equal(balls[0][2],p.x);assert.equal(balls[0][3],p.y);
});
