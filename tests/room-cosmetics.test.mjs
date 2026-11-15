import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoomCosmeticSync} from '../dist/table/room-cosmetics.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const room={id:'room-a',you:0,phase:'PLAYING'},selection={pieceId:'four-piece-neon',boardId:''};
test('cosmetic acknowledgement updates just a seat and cannot apply an obsolete board',async()=>{
  const pending=[],seats=[];
  const sync=createRoomCosmeticSync({request:(url,body)=>new Promise(resolve=>pending.push({url,body,resolve})),onSeat:(...args)=>seats.push(args)});
  sync.sync(room,'four',selection);sync.sync(room,'four',selection);assert.equal(pending.length,1);
  assert.equal(pending[0].url,'/api/table/rooms/room-a/cosmetics');assert.deepEqual(pending[0].body,selection);
  sync.sync({...room,id:'room-b'},'four',selection);
  pending[0].resolve({id:'room-a',profiles:[{piece:selection.pieceId}],board:{moves:0}});await tick();assert.equal(seats.length,0);
  pending[1].resolve({id:'room-b',profiles:[{piece:selection.pieceId}],board:{moves:0}});await tick();
  assert.deepEqual(seats,[['room-b',0,{piece:selection.pieceId}]]);
});
test('a deleted room stops only its selection key; the next room still publishes',async()=>{
  let calls=0;const timers=[],seats=[];
  const sync=createRoomCosmeticSync({request:async()=>{
    calls++;if(calls===1)throw {status:404};return {id:'other',profiles:[{piece:selection.pieceId}]};
  },onSeat:(...args)=>seats.push(args),schedule:fn=>timers.push(fn)});
  sync.sync(room,'four',selection);await tick();sync.sync(room,'four',selection);await tick();
  assert.equal(calls,1);assert.equal(timers.length,0);
  sync.sync({...room,id:'other'},'four',selection);await tick();
  assert.equal(calls,2);assert.deepEqual(seats,[['other',0,{piece:selection.pieceId}]]);
});
test('unsupported endpoint stops all retries while transient failures are bounded',async()=>{
  const timers=[];
  for(const status of [405,501]){
    let calls=0;
    const sync=createRoomCosmeticSync({request:async()=>{calls++;throw {status};},onSeat(){},schedule:fn=>timers.push(fn)});
    sync.sync(room,'four',selection);await tick();sync.sync({...room,id:'other'},'four',selection);await tick();
    assert.equal(calls,1);assert.equal(timers.length,0);
  }
  let attempts=0;const retry=createRoomCosmeticSync({request:async()=>{attempts++;throw {status:503};},onSeat(){},schedule:fn=>timers.push(fn)});
  retry.sync(room,'four',selection);await tick();await timers.shift()();await tick();await timers.shift()();await tick();
  assert.equal(attempts,3);assert.equal(timers.length,0);
});
test('leaving or changing selection invalidates earlier requests',async()=>{
  let resolve;const seats=[];
  const sync=createRoomCosmeticSync({request:()=>new Promise(r=>resolve=r),onSeat:(...args)=>seats.push(args)});
  sync.sync(room,'four',selection);sync.stop();resolve({id:room.id,profiles:[{piece:selection.pieceId}]});await tick();assert.equal(seats.length,0);
});
