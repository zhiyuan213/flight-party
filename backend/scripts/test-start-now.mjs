import assert from 'node:assert/strict';
const origin=process.env.FLIGHTPARTY_TEST_URL||'http://127.0.0.1:8080';
async function client(){
 let cookie='',csrf;
 async function request(path,body){const response=await fetch(origin+'/api'+path,{method:body===undefined?'GET':'POST',headers:{cookie,'content-type':'application/json',...(csrf?{[csrf.headerName]:csrf.token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});const next=response.headers.get('set-cookie');if(next)cookie=next.split(';')[0];return response;}
 csrf=await(await request('/csrf')).json();assert.equal((await request('/session/guest',{})).status,200);return request;
}
const a=await client(),b=await client(),outsider=await client();
const room=await(await a('/rooms',{})).json();
assert.equal((await a(`/rooms/${room.roomId}/start-now`,{})).status,409,'Friend waiting does not bypass readiness');
assert.equal((await b('/rooms/join',{code:room.roomId})).status,200);
assert.equal((await a(`/rooms/${room.roomId}/ready`,{ready:true})).status,200);
const matching=await(await b(`/rooms/${room.roomId}/ready`,{ready:true})).json();
assert.equal(matching.phase,'MATCHING');
assert.equal((await outsider(`/rooms/${room.roomId}/start-now`,{})).status,403);
const responses=await Promise.all(Array.from({length:8},(_,i)=>(i%2?a:b)(`/rooms/${room.roomId}/start-now`,{})));
for(const response of responses){assert.equal(response.status,200);const state=await response.json();assert.ok(['STARTING','PLAYING'].includes(state.phase));assert.equal(state.matchingDeadline,matching.matchingDeadline);assert.equal(state.seats.length,4);assert.equal(state.seats.filter(s=>s.bot).length,2);assert.deepEqual(state.seats.filter(s=>!s.bot).map(s=>s.index).sort(),[0,1]);}
assert.equal((await outsider('/rooms/join',{code:room.roomId})).status,409,'No new participants after start');
const end=Date.now()+15000;let state;
do{state=await(await a(`/rooms/${room.roomId}/snapshot`)).json();if(state.phase==='PLAYING')break;await new Promise(r=>setTimeout(r,200));}while(Date.now()<end);
assert.equal(state.phase,'PLAYING');
assert.equal((await a(`/rooms/${room.roomId}/start-now`,{})).status,200,'Retry after activation is idempotent');
assert.equal((await a(`/rooms/${room.roomId}/game`)).status,200);
console.log('PASS: current two humans retained, two bots filled immediately, eight duplicate clicks start one room, outsiders and late joins rejected; room:',room.roomId);
