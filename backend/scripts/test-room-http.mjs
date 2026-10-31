import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
async function client() {
 let cookie='',csrf;
 async function request(path,body) {
  const response=await fetch((process.env.FLIGHTPARTY_TEST_URL || 'http://127.0.0.1:8080')+'/api'+path,{method:body===undefined?'GET':'POST',headers:{...(cookie?{cookie}:{}),...(csrf?{[csrf.headerName]:csrf.token}:{}),'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const set=response.headers.get('set-cookie');if(set)cookie=set.split(';')[0];return response;
 }
 csrf=await (await request('/csrf')).json();assert.equal((await request('/session/guest',{})).status,200);return request;
}
const a=await client(),b=await client(),outsider=await client();
const created=await a('/rooms',{});assert.equal(created.status,200);const room=await created.json();
assert.equal((await (await a('/me')).json()).activeRoomId,room.roomId);
try {
 assert.equal((await outsider(`/rooms/${room.roomId}/snapshot`)).status,403);
 assert.equal((await outsider(`/rooms/${room.roomId}/result`)).status,403);
 assert.equal((await outsider(`/rooms/${room.roomId}/reaction`,{commandId:randomUUID(),emoji:'🎉'})).status,403);
 assert.equal((await a(`/rooms/${room.roomId}/reaction`,{commandId:randomUUID(),emoji:'unsupported'})).status,400);
 assert.deepEqual(await (await a(`/rooms/${room.roomId}/result`)).json(),{status:'PENDING',ranking:[]});
 const joined=await b('/rooms/join',{code:room.roomId});assert.equal(joined.status,200);
 const view=await joined.json();assert.equal(view.yourSeat,1);assert.equal(view.seats.length,2);
 assert.equal((await (await a(`/rooms/${room.roomId}/snapshot`)).json()).seats.length,2);
 assert.ok(!JSON.stringify(view).includes('principal'));
 assert.equal((await a(`/rooms/${room.roomId}/ready`,{ready:true})).status,200);
 const matching=await (await b(`/rooms/${room.roomId}/ready`,{ready:true})).json();
 assert.equal(matching.phase,'MATCHING');assert.ok(matching.matchingDeadline);
 const quick=await (await outsider('/rooms/quick',{})).json();
 assert.equal(quick.roomId,room.roomId);assert.equal(quick.matchingDeadline,matching.matchingDeadline);
 assert.equal((await outsider(`/rooms/${room.roomId}/leave`,{})).status,200);
 console.log('Room HTTP: two sessions share room; outsider rejected; identities hidden');
} finally {
 await b(`/rooms/${room.roomId}/leave`,{});await a(`/rooms/${room.roomId}/leave`,{});
 assert.equal((await (await a('/me')).json()).activeRoomId,null);
}
