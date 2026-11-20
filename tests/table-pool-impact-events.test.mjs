import test from 'node:test';
import assert from 'node:assert/strict';
import {poolStart,poolMove} from '../dist/table/pool.js';

function clearTable(x=250,y=250){
  const state=poolStart();
  for(let id=1;id<16;id++)state.cells[id*3+2]=0;
  state.cells[0]=x*10;state.cells[1]=y*10;
  return state;
}
function place(state,id,x,y){state.cells[id*3]=x*10;state.cells[id*3+1]=y*10;state.cells[id*3+2]=1;}
const shoot=(state,power,angle=0)=>poolMove(state,1,power*3600+angle);
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-12,`${actual} differs from ${expected}`);

test('light, medium and hard ball contacts emit increasing normal-impact strengths',()=>{
  const strengths=[20,50,90].map(power=>{
    const state=clearTable(300,250);place(state,1,340,250);
    const event=shoot(state,power).audioEvents.find(e=>e.kind==='ball'&&e.key==='0:1');
    assert.ok(event);assert.equal(event.time%2,0);
    near(event.strength,Math.min(1,power*.624*Math.pow(.9949375,.25)**(event.time/2+1)/32));
    return event.strength;
  });
  assert.ok(strengths[0]<strengths[1]&&strengths[1]<strengths[2]);
});

test('cushion events retain incoming normal speed before rebound and damping',()=>{
  const strengths=[20,50,90].map(power=>{
    const event=shoot(clearTable(970,250),power).audioEvents.find(e=>e.kind==='rail');
    assert.ok(event);assert.equal(event.id,0);assert.equal(event.key,'rail:0');
    assert.equal(event.time%2,0);
    near(event.strength,Math.min(1,power*.0156*Math.pow(.9949375,.25)**(event.time/2)));
    return event.strength;
  });
  assert.ok(strengths[0]<strengths[1]&&strengths[1]<strengths[2]);
  const angle=600,power=33,event=shoot(clearTable(980,200),power,angle).audioEvents.find(e=>e.kind==='rail');
  near(event.strength,power*.0156*Math.cos(angle*Math.PI/1800)*Math.pow(.9949375,.25)**(event.time/2));
  assert.ok(event.strength<.26,'a glancing hit must not use total speed as cushion strength');
});

test('pocket events preserve capture speed before zeroing velocity and respotting the cue ball',()=>{
  const strengths=[20,50,90].map(power=>{
    const state=shoot(clearTable(500,30),power,2700),events=state.audioEvents.filter(e=>e.kind==='pocket');
    assert.equal(events.length,1);
    const event=events[0];assert.equal(event.id,0);assert.equal(event.key,'pocket:0');
    assert.equal(event.holeIndex,1);assert.ok(Math.abs(event.vx)<1e-10);assert.ok(event.vy<0);
    // strength is an audio/animation level clamped to 1; at power 90+ the
    // capture speed exceeds the 40-unit normaliser, so clamp the expectation.
    near(Math.min(1,Math.hypot(event.vx,event.vy)/40),event.strength);
    near(event.strength,Math.min(1,power*.0156*Math.pow(.9949375,.25)**(event.time/2)));
    assert.equal(state.cells[2],1,'the final cue ball is already respotted');
    assert.ok(event.strength>.15,'capture must retain the pre-zeroed speed');
    return event.strength;
  });
  assert.ok(strengths[0]<strengths[1]&&strengths[1]<strengths[2]);
});

test('an object-ball pocket event identifies the captured ball after a real collision',()=>{
  const state=clearTable(500,80);place(state,1,500,35);
  const result=shoot(state,90,2700),hit=result.audioEvents.find(e=>e.kind==='ball'),capture=result.audioEvents.find(e=>e.kind==='pocket'&&e.id===1);
  assert.ok(hit);assert.ok(capture);assert.ok(capture.time>hit.time);
  assert.equal(capture.key,'pocket:1');assert.ok(capture.strength>0&&capture.strength<=1);
  assert.equal(result.cells[5],0);
  assert.equal(result.audioEvents.filter(e=>e.kind==='pocket'&&e.id===1).length,1);
});

test('stationary ball and cushion contacts do not repeatedly emit impact events',()=>{
  const state=clearTable();place(state,1,984,160);place(state,2,984,192);
  const result=shoot(state,1);
  assert.deepEqual(result.audioEvents,[]);
  assert.deepEqual(result.cells.slice(3,9),state.cells.slice(3,9));
});

test('a nearly tangential cushion rebound below the normal-speed threshold is silent',()=>{
  const result=shoot(clearTable(983.9,250),2,899);
  assert.ok(result.history.some(frame=>Number(frame.split(',')[0])===9840),'the cue ball reaches the cushion');
  assert.deepEqual(result.audioEvents,[]);
});
