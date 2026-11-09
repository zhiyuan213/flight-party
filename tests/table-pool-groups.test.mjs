import test from 'node:test';
import assert from 'node:assert/strict';
import {poolStart,poolMove} from '../dist/table/pool.js';
import {poolTargets,settlePool} from '../dist/table/pool-rules.js';
import {returnPosition,RETURN_DURATION,RETURN_X,RETURN_BOTTOM} from '../dist/table/pool-return.js';
import {TABLE_PAD} from '../dist/table/pool-table.js';
import {meterPower} from '../dist/table/pool-input.js';
import {rollSphere,sphereIdentity} from '../dist/table/pool-ball.js';

test('a foul grants one extra visit that survives pots and is spent once',()=>{
  let cells=poolStart().cells.slice(0,52); // Existing rooms have no penalty field.
  cells[50]=1;
  cells[51]=2;
  const shot=(actor,potted,first)=>{
    const next=cells.slice();
    for(const id of potted)if(id)next[id*3+2]=0;
    const result=settlePool(cells,next,actor,potted,first);
    cells=next;
    return result;
  };
  assert.equal(shot(1,[],9).turn,2);
  assert.equal(cells[52],1);
  assert.equal(shot(2,[9],9).turn,2);
  assert.equal(cells[52],1);
  assert.equal(shot(2,[],10).turn,2);
  assert.equal(cells[52],2);
  assert.equal(shot(2,[],10).turn,1);
  assert.equal(cells[52],0);
  assert.equal(shot(1,[],0).foulReason,'白球未碰到目标球');
  assert.equal(cells[52],1);
  assert.equal(shot(2,[0],10).foulReason,'白球落袋');
  assert.equal(cells[52],1);
});
test('rolling orientation is continuous across a cushion reversal and reverses with displacement',()=>{const start=sphereIdentity(),turned=rollSphere(start,30,12),back=rollSphere(turned,-30,-12);for(let i=0;i<9;i++)assert.ok(Math.abs(back[i]-start[i])<1e-10);assert.deepEqual(rollSphere(turned,0,0),turned);});
test('rack has 15 separated targets, centered eight and a full cue ball',()=>{const c=poolStart().cells;assert.equal(c.length,53);for(let i=0;i<16;i++){assert.equal(c[i*3+2],1);for(let j=i+1;j<16;j++)assert.ok(Math.hypot(c[i*3]-c[j*3],c[i*3+1]-c[j*3+1])>=320);}assert.equal(c[24],7064);assert.equal(c[25],2500);});
test('first legal solid or stripe assigns complementary groups and displays remaining targets',()=>{for(const id of [1,9]){const before=poolStart().cells,c=before.slice();c[id*3+2]=0;const r=settlePool(before,c,1,[id],id);assert.equal(r.turn,1);assert.equal(c[50],id===1?1:2);assert.equal(c[51],id===1?2:1);assert.equal(poolTargets(c,1).length,6);assert.ok(!poolTargets(c,1).includes(id));assert.equal(c[48],1);}});
test('scratch leaves an open table unassigned; wrong first contact switches turn',()=>{let b=poolStart().cells,c=b.slice();c[5]=0;assert.equal(settlePool(b,c,1,[1,0],1).foul,true);assert.equal(c[50],0);b[50]=1;b[51]=2;c=b.slice();assert.equal(settlePool(b,c,1,[9],9).turn,2);});
test('only a legal eight after own group is cleared wins',()=>{for(const cleared of [false,true]){const b=poolStart().cells;b[50]=1;b[51]=2;if(cleared)for(let i=1;i<8;i++)b[i*3+2]=0;const c=b.slice();c[26]=0;assert.equal(settlePool(b,c,1,[8],8).winner,cleared?1:2);assert.equal(settlePool(b,c.slice(),1,[8,0],8).winner,2);}});
test('return path connects outlet to column and settles without reversal',()=>{assert.equal(returnPosition(0,0).visible,false);const a=returnPosition(0,RETURN_DURATION*.3),b=returnPosition(0,RETURN_DURATION*.7),end=returnPosition(0,RETURN_DURATION);assert.ok(a.angle<b.angle);assert.equal(end.x,RETURN_X);assert.equal(end.y,RETURN_BOTTOM);assert.equal(returnPosition(14,RETURN_DURATION).y,RETURN_BOTTOM-14*33);});
test('meter maps full travel precisely including short and resized tracks',()=>{for(const height of [100,480]){assert.equal(meterPower(30,30,height),0);assert.equal(meterPower(30+height/2,30,height),50);assert.equal(meterPower(30+height,30,height),100);}});
test('replays contain all sixteen balls and densely sample the strongest shot',()=>{const s=poolMove(poolStart(),1,360000);assert.ok(s.history.length>50);for(const frame of s.history)assert.equal(frame.split(',').length,48);});

test('full power travels over four table lengths on a clear table',()=>{
  const s=poolStart();for(let i=1;i<16;i++)s.cells[i*3+2]=0;
  const frames=poolMove(s,1,360000).history.map(f=>f.split(',').map(Number));
  let distance=0,prev=[s.cells[0],s.cells[1]];
  for(const f of frames){distance+=Math.hypot(f[0]-prev[0],f[1]-prev[1])/10;prev=f;}
  assert.ok(distance>4250&&distance<4450,`travel ${distance}`);
});

test('a centered pot continues into the well without an invented sideways zigzag',async()=>{
  const {pocketPosition}=await import('../dist/table/pool-return.js');const item={holeIndex:1,x:TABLE_PAD+500,y:TABLE_PAD-5,vx:0,vy:-8};
  const start=pocketPosition(item,0);
  for(const age of [20,60,100,160]){
    const p=pocketPosition(item,age);assert.ok(Math.abs(p.x-start.x)<1e-8,'head-on entry must not acquire sideways motion');
  }
  assert.ok(pocketPosition(item,60).y<start.y,'the ball continues in its incoming direction');
});
