import test from 'node:test';import assert from 'node:assert/strict';import {poolStart,poolMove,renderPool} from '../dist/table/pool.js';import {samplePoolFrame,poolAim} from '../dist/table/pool-view.js';import {TABLE_WIDTH,TABLE_HEIGHT,TABLE_PAD} from '../dist/table/pool-table.js';
import {animatePoolOpponentShot,cancelPoolOpponentShot} from '../dist/table/pool-view.js';
import {opponentShot,replayOpponentShot,opponentCuePose,OPPONENT_CUE_DURATION,REPLAY_CUE_DURATION} from '../dist/table/pool-opponent-cue.js';
import {poolSeatSummary} from '../dist/table/pool-shell.js';
function harness(){const queue=[],context=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}})},{get:(o,k)=>o[k]||(()=>{})}),canvas={width:1668,height:918,getContext:()=>context},button={dataset:{}},input={value:'65',style:{setProperty(){}}},nodes={canvas,'.pool-shoot':button,input,output:{},'.pool-controls output':{},'.pool-note':{},'.pool-score':{},'.pool-sound':{}};Object.assign(nodes,{'.pool-table-canvas':canvas,'.pool-spot':canvas,'.pool-spot-reset':{},'.pool-power-meter':{setAttribute(){},style:{setProperty(){}}},'.pool-power-value':{},'.pool-countdown':{querySelector:()=>({})}});const host={isConnected:true,querySelector:s=>nodes[s],_spin:0,_power:0,_angle:0,_roll:Array(16).fill(0),_heading:Array(16).fill(0),_table:{},_animationToken:0};return{queue,host,button};}
test('pool samples fractional frames without changing authoritative pocket flags',()=>{const a=[100,200,1],b=[200,400,1];assert.deepEqual(samplePoolFrame([a,b],.5),[150,300,1]);assert.deepEqual(samplePoolFrame([a,b],-2),a);assert.deepEqual(samplePoolFrame([a,b],5),b);assert.deepEqual(samplePoolFrame([a,[0,0,0]],.5),[50,100,1]);});
test('pool aim compensates for visible rail padding and scaling',()=>{const s=poolStart(),rect={left:10,top:20,width:TABLE_WIDTH,height:TABLE_HEIGHT};assert.equal(poolAim(10+TABLE_PAD+800,20+TABLE_PAD+250,rect,s.cells),0);assert.equal(poolAim(10+TABLE_PAD+250,20+TABLE_PAD+400,rect,s.cells),900);});
test('pool replay tolerates early timestamps, keeps polling from restarting, and unlocks next shot',()=>{const {queue,host,button}=harness(),old=globalThis.requestAnimationFrame;globalThis.requestAnimationFrame=fn=>queue.push(fn);try{const initial=poolStart();renderPool(host,initial,true);const state=poolMove(initial,1,234000);renderPool(host,state,true);assert.equal(button.disabled,true);renderPool(host,state,true);assert.equal(queue.length,1);assert.doesNotThrow(()=>queue.shift()(-10));assert.doesNotThrow(()=>queue.shift()(performance.now()+10000));assert.equal(button.disabled,false);assert.deepEqual(host._painted,state.cells);}finally{globalThis.requestAnimationFrame=old;}});
test('pool queues a later authoritative shot until the previous replay finishes',()=>{const {queue,host}=harness(),old=globalThis.requestAnimationFrame;globalThis.requestAnimationFrame=fn=>queue.push(fn);try{const initial=poolStart(),first=poolMove(initial,1,234000),second=poolMove(first,first.turn,234000);renderPool(host,initial,true);renderPool(host,first,true);renderPool(host,second,true);assert.equal(host._queued.s.moves,2);queue.shift()(performance.now()+10000);assert.equal(host._lastMove,2);queue.shift()(performance.now()+20000);assert.equal(host._animating,false);assert.deepEqual(host._painted,second.cells);}finally{globalThis.requestAnimationFrame=old;}});

function scratchReplay(){
  const initial=poolStart();initial.cells[0]=5000;initial.cells[1]=300;
  const captured=initial.cells.slice(0,48);captured[1]=180;captured[2]=0;
  const cells=initial.cells.slice();cells[0]=1800;cells[1]=800;
  return{initial,state:{...initial,cells,moves:1,turn:2,fen:'白球落袋，换手并复位',history:[captured.join(','),cells.slice(0,48).join(',')]}};
}
function replayClock(t,reducedMotion=false){
  const env=harness(),oldFrame=globalThis.requestAnimationFrame,oldMedia=globalThis.matchMedia;
  globalThis.requestAnimationFrame=fn=>env.queue.push(fn);
  globalThis.matchMedia=()=>({matches:reducedMotion});
  t.mock.method(performance,'now',()=>1000);
  t.after(()=>{globalThis.requestAnimationFrame=oldFrame;globalThis.matchMedia=oldMedia;});
  return env;
}
test('cue-ball scratch stays in its pocket for 650ms before respot and shot unlock',t=>{
  const {queue,host,button}=replayClock(t),{initial,state}=scratchReplay();
  renderPool(host,initial,true);renderPool(host,state,true);queue.shift()(1016);
  const scratch=host._returns.find(item=>item.scratch);
  assert.equal(scratch.id,0);assert.equal(scratch.start,1016);
  assert.equal(host._painted[2],0);assert.equal(host._scratchVisible,true);assert.equal(host._animating,true);
  queue.shift()(1032);
  assert.equal(host._painted[2],1,'authoritative replay already contains the respotted cue ball');
  assert.equal(host._painted[0],state.cells[0]);assert.equal(host._painted[1],state.cells[1]);
  assert.equal(host._scratchVisible,true);assert.equal(host._animating,true);assert.equal(button.disabled,true);
  queue.shift()(scratch.start+649);
  assert.equal(host._scratchVisible,true);assert.equal(host._animating,true);assert.equal(host._ready(),false);
  queue.shift()(scratch.start+650);
  assert.equal(host._scratchVisible,false);assert.equal(host._animating,false);assert.equal(button.disabled,false);
  assert.equal(host._ready(),true);assert.deepEqual(host._painted,state.cells);assert.equal(queue.length,0);
});
test('a long display frame crossing capture and respot still shows the cue-ball pocket animation',t=>{
  const {queue,host,button}=replayClock(t),{initial,state}=scratchReplay();
  renderPool(host,initial,true);renderPool(host,state,true);queue.shift()(1200);
  const scratches=host._returns.filter(item=>item.scratch);
  assert.equal(scratches.length,1);assert.equal(scratches[0].start,1016,'use the capture frame time, not the delayed display time');
  assert.equal(host._painted[2],1);assert.equal(host._scratchVisible,true);assert.equal(host._animating,true);assert.equal(button.disabled,true);
  queue.shift()(1666);
  assert.equal(host._scratchVisible,false);assert.equal(host._animating,false);assert.equal(button.disabled,false);
  assert.deepEqual(host._painted,state.cells);assert.equal(queue.length,0);
});
test('reduced motion applies the final cue-ball respot immediately without a pocket replay',t=>{
  const {queue,host,button}=replayClock(t,true),{initial,state}=scratchReplay();
  renderPool(host,initial,true);renderPool(host,state,true);
  assert.equal(host._scratchVisible,false);assert.equal(Boolean(host._animating),false);assert.equal(button.disabled,false);
  assert.equal(host._ready(),true);assert.deepEqual(host._painted,state.cells);
  assert.equal(host._returns.some(item=>item.scratch),false);assert.equal(queue.length,0);
});

test('pocket animation retains the actual capture strength for its later wall contacts',t=>{
  const {queue,host}=replayClock(t),initial=poolStart();initial.cells[0]=5000;initial.cells[1]=600;
  const state=poolMove(initial,1,80*3600+2700),capture=state.audioEvents.find(e=>e.kind==='pocket'&&e.id===0);
  assert.ok(capture&&capture.strength>.5);
  renderPool(host,initial,true);renderPool(host,state,true);queue.shift()(1250);
  const scratch=host._returns.find(e=>e.scratch);
  assert.ok(scratch);assert.equal(scratch.strength,capture.strength);
});

test('opponent cue uses the actual bot command, holds aim, pulls back, then strikes without altering player aim',async t=>{
  const {queue,host,button}=replayClock(t),initial=poolStart();initial.turn=2;
  renderPool(host,initial,false);host._angle=1350;host._spin=4;
  const before=initial.cells.slice(),done=animatePoolOpponentShot(host,4*363600+75*3600+450);
  assert.equal(host._opponentCue.angle,450);assert.equal(host._opponentCue.guide,true);
  assert.equal(host._opponentCue.pull,0);assert.equal(button.disabled,true);
  queue.shift()(1000+OPPONENT_CUE_DURATION*.75);
  const drawnBack=host._opponentCue.pull;
  assert.ok(drawnBack>45);assert.equal(host._opponentCue.guide,true);
  queue.shift()(1000+OPPONENT_CUE_DURATION*.95);
  assert.ok(host._opponentCue.pull<drawnBack);assert.equal(host._opponentCue.guide,false);
  assert.deepEqual(initial.cells,before,'presentation cannot execute the shot before impact');
  queue.shift()(1000+OPPONENT_CUE_DURATION);
  assert.equal(await done,true);assert.equal(host._opponentCue,null);assert.equal(queue.length,0);
  assert.equal(host._angle,1350);assert.equal(host._spin,4);assert.deepEqual(host._painted,initial.cells);
});

test('leaving or restarting cancels opponent preparation and settles its pending turn',async t=>{
  const {queue,host}=replayClock(t),initial=poolStart();renderPool(host,initial,false);
  const done=animatePoolOpponentShot(host,75*3600+900);
  cancelPoolOpponentShot(host);
  assert.equal(await done,false);assert.equal(host._opponentCue,null);
  queue.shift()(5000);
  assert.equal(queue.length,0);assert.equal(host._opponentCue,null);assert.deepEqual(host._painted,initial.cells);
  const next=animatePoolOpponentShot(host,75*3600+1800,()=>false);
  assert.equal(await next,false);assert.equal(queue.length,0);
});

test('online opponent preparation starts only from a received replay and polling does not restart it',t=>{
  const {queue,host,button}=replayClock(t),initial=poolStart();initial.turn=2;
  const state=poolMove(initial,2,75*3600),options={opponentSeat:2};
  renderPool(host,initial,false,options);assert.equal(host._opponentCue,undefined);assert.equal(queue.length,0);
  renderPool(host,state,true,options);queue.shift()(1000);
  assert.equal(host._opponentCue.angle,0);assert.equal(host._opponentCue.guide,true);
  assert.deepEqual(host._painted,initial.cells.slice(0,48));assert.equal(button.disabled,true);
  renderPool(host,state,true,options);assert.equal(queue.length,1);
  queue.shift()(1000+REPLAY_CUE_DURATION-1);
  assert.deepEqual(host._painted,initial.cells.slice(0,48));
  queue.shift()(1000+REPLAY_CUE_DURATION+16);
  assert.equal(host._opponentCue,null);assert.deepEqual(host._painted,state.history[0].split(',').map(Number));
  queue.shift()(20000);
  assert.equal(host._animating,false);assert.equal(button.disabled,false);assert.deepEqual(host._painted,state.cells);
});

test('online preparation delays capture and respot together, preserving the full scratch animation',t=>{
  const {queue,host,button}=replayClock(t),{initial,state}=scratchReplay();initial.turn=2;state.turn=1;
  const options={opponentSeat:2};renderPool(host,initial,false,options);renderPool(host,state,true,options);
  queue.shift()(1000+REPLAY_CUE_DURATION-1);
  assert.equal(host._returns.some(e=>e.scratch),false);
  queue.shift()(1000+REPLAY_CUE_DURATION+16);
  const scratch=host._returns.find(e=>e.scratch);
  assert.equal(scratch.start,1000+REPLAY_CUE_DURATION+16);assert.equal(button.disabled,true);
  queue.shift()(scratch.start+649);assert.equal(host._scratchVisible,true);
  queue.shift()(scratch.start+650);
  assert.equal(host._scratchVisible,false);assert.equal(host._animating,false);assert.equal(button.disabled,false);
});

test('network cue prefix preserves queued authoritative states and never repeats the local player stroke',t=>{
  const {queue,host}=replayClock(t),initial=poolStart();initial.turn=2;
  const first=poolMove(initial,2,75*3600),second=poolMove(first,first.turn,75*3600),options={opponentSeat:2};
  renderPool(host,initial,false,options);renderPool(host,first,false,options);renderPool(host,second,true,options);
  assert.equal(host._queued.options,options);
  queue.shift()(20000);
  assert.equal(host._lastMove,second.moves);assert.equal(host._queued,null);
  queue.shift()(30000);
  assert.equal(host._animating,false);assert.deepEqual(host._painted,second.cells);
  const own=poolStart(),ownShot=poolMove(own,1,75*3600);
  host._snapshot=null;host._lastMove=0;
  renderPool(host,own,true,options);renderPool(host,ownShot,false,options);queue.shift()(1016);
  assert.ok(!host._opponentCue);assert.deepEqual(host._painted,ownShot.history[0].split(',').map(Number));
});

test('reduced motion executes the bot presentation without an added animation delay',async t=>{
  const {queue,host}=replayClock(t,true),initial=poolStart();renderPool(host,initial,false);
  assert.equal(await animatePoolOpponentShot(host,75*3600),true);assert.equal(queue.length,0);assert.ok(!host._opponentCue);
});

test('opponent shot decoding and replay direction ignore later rebounds and respots',()=>{
  assert.deepEqual(opponentShot(8*363600+65*3600+3500),{angle:3500,power:65});assert.equal(opponentShot(0),null);
  assert.equal(replayOpponentShot([[100,100,1],[120,100,1],[80,100,1]]).angle,0);
  assert.equal(replayOpponentShot([[100,100,1],[100,100,0],[1800,800,1]]),null);
  assert.equal(replayOpponentShot([[100,100,1],[100,80,0],[1800,800,1]]).angle,2700);
  const shot={angle:800,power:80};assert.equal(opponentCuePose(shot,-100).pull,0);assert.equal(opponentCuePose(shot,5000).done,true);
});

test('replay cue pull retains low, medium and strong shots instead of saturating each at full power',()=>{
  for(const power of [10,45,90]){
    const initial=poolStart();
    for(let id=1;id<16;id++)initial.cells[id*3+2]=0;
    const state=poolMove(initial,1,power*3600+900);
    const shot=replayOpponentShot([initial.cells,...state.history.map(frame=>frame.split(',').map(Number))],state.shotCommand);
    assert.equal(shot.angle,900);assert.ok(Math.abs(shot.power-power)<1);
  }
});

test('archived 29-cell room cancels replay without fabricating balls and a new match renders normally',t=>{
  const {queue,host}=replayClock(t),initial=poolStart();
  renderPool(host,initial,true);renderPool(host,poolMove(initial,1,75*3600),false);
  const oldFrame=queue.shift(),cells=initial.cells.slice(0,29);cells[27]=3;cells[28]=4;
  const archived={...initial,cells,moves:8,over:true,winner:2},before=structuredClone(archived);
  renderPool(host,archived,false);
  assert.match(host.innerHTML,/升级前的台球对局/);assert.equal(host._ready(),false);
  assert.equal(host._animating,false);assert.deepEqual(host._returns,[]);assert.equal(host._painted,null);
  oldFrame(100000);assert.equal(queue.length,0,'a pending old frame cannot repaint archived data');
  assert.deepEqual(archived,before,'the server-owned archive is unchanged');
  const fresh=poolStart();renderPool(host,fresh,true);
  assert.equal(host._ready(),true);assert.deepEqual(host._painted,fresh.cells);
  assert.equal(host._returns.length,0);assert.ok(host._painted.every(Number.isFinite));
});

test('archived scores use legacy offsets without displaying invented groups or target balls',()=>{
  const cells=Array(29).fill(0);cells[27]=2;cells[28]=5;
  const board={cells},before=cells.slice();
  assert.deepEqual(poolSeatSummary(board,1),{legacy:true,group:0,score:2,targets:[]});
  assert.deepEqual(poolSeatSummary(board,2),{legacy:true,group:0,score:5,targets:[]});
  assert.deepEqual(cells,before);
  const current=poolStart();current.cells[50]=1;current.cells[48]=1;current.cells[5]=0;
  assert.deepEqual(poolSeatSummary(current,1),{legacy:false,group:1,score:1,targets:[2,3,4,5,6,7]});
});
