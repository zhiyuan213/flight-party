import test from 'node:test';
import assert from 'node:assert/strict';
import {onlineMovement} from '../dist/online-movement.js';
function state(phase,pieces){const players=pieces.map((pieces,color)=>({color,pieces}));return{phase,players,active:players};}
test('late or coalesced normal moves animate even after server animation phase ended',()=>{
 const before=state('choose',[[4,-1],[9,-1]]),after=state('roll',[[9,-1],[-1,-1]]);
 assert.deepEqual(onlineMovement(before,after),{color:0,piece:0,from:4,to:9,captured:[{color:1,piece:0,from:9}]});
 assert.deepEqual(onlineMovement(before,{...after,phase:'animating'}),onlineMovement(before,after));
 assert.equal(onlineMovement(after,after),null);
});
test('initial reconnects and multi-action gaps do not replay stale audio or movement',()=>{
 const s=state('roll',[[0,0],[0,0]]);
 assert.equal(onlineMovement(null,s),null);
 assert.equal(onlineMovement(s,state('roll',[[3,0],[2,0]])),null);
 assert.equal(onlineMovement(s,state('roll',[[12,0],[0,0]])),null);
});
