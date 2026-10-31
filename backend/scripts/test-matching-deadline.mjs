import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
let cookie='',csrf;
async function request(path,body) {
 const response=await fetch('http://127.0.0.1:8080/api'+path,{method:body===undefined?'GET':'POST',headers:{...(cookie?{cookie}:{}),...(csrf?{[csrf.headerName]:csrf.token}:{}),'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const set=response.headers.get('set-cookie');if(set)cookie=set.split(';')[0];assert.equal(response.status,200);return response.json();
}
csrf=await request('/csrf');await request('/session/guest',{});
const friend=await request('/rooms',{});
const room=await request(`/rooms/${friend.roomId}/ready`,{ready:true});assert.equal(room.phase,'MATCHING');
const deadline=Date.parse(room.matchingDeadline);assert.ok(deadline>Date.now());
let snapshot=room;
while(Date.now()<deadline+5000) {
 snapshot=await request(`/rooms/${room.roomId}/snapshot`);
 assert.equal(snapshot.matchingDeadline,room.matchingDeadline);
 if(snapshot.phase==='PLAYING') break;
 await new Promise(resolve=>setTimeout(resolve,500));
}
assert.equal(snapshot.phase,'PLAYING');assert.equal(snapshot.seats.length,4);
assert.equal(snapshot.seats.filter(s=>s.bot).length,3);
assert.equal(snapshot.yourSeat,room.yourSeat);
console.log('Deadline: fixed server deadline, three bot seats and original human seat verified');
const game=await request(`/rooms/${room.roomId}/game`);
assert.equal(game.phase,'ROLL');assert.equal(game.players.length,4);
assert.ok(game.players.every(player=>player.planes.every(p=>p===-1)));
console.log('Activation: authoritative initial game available after durable start');
const commandId=randomUUID();
const roll=await request(`/rooms/${room.roomId}/roll`,{commandId});
assert.ok(roll.game.die>=1&&roll.game.die<=6);assert.equal(roll.game.phase,'CHOOSE');
assert.deepEqual(await request(`/rooms/${room.roomId}/roll`,{commandId}),roll);
console.log('Roll: server result and identical command retry verified');
await new Promise(resolve=>setTimeout(resolve,Math.max(0,roll.busyUntil-Date.now()+50)));
const moveId=randomUUID();
const moved=await request(`/rooms/${room.roomId}/move`,{commandId:moveId,planeId:0});
assert.equal(moved.move.to,roll.game.die-1);assert.equal(moved.move.state.phase,'ANIMATING');
assert.deepEqual(await request(`/rooms/${room.roomId}/move`,{commandId:moveId,planeId:0}),moved);
console.log('Move: authoritative takeoff destination and identical retry verified');
await new Promise(resolve=>setTimeout(resolve,Math.max(0,moved.busyUntil-Date.now()+400)));
const next=await request(`/rooms/${room.roomId}/game`);
assert.equal(next.turn,1);assert.ok(['ROLL','CHOOSE','ANIMATING'].includes(next.phase));
console.log('Advance: animation deadline automatically advances to the next seat');
await new Promise(resolve=>setTimeout(resolve,2500));
const automated=await request(`/rooms/${room.roomId}/game`);
assert.ok(automated.players.find(p=>p.seat===1).planes.some(p=>p>=0));
console.log('Bot: next native bot rolls and moves without client commands');
