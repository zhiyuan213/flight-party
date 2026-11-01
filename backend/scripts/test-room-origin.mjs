import assert from 'node:assert/strict';
const origin=process.env.FLIGHTPARTY_TEST_URL||'https://flight.joyflock.com';
async function client(){let cookie='',csrf;async function request(path,body){const r=await fetch(origin+'/api'+path,{method:body===undefined?'GET':'POST',headers:{cookie,'content-type':'application/json',...(csrf?{[csrf.headerName]:csrf.token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});const set=r.headers.get('set-cookie');if(set)cookie=set.split(';')[0];return r;}csrf=await(await request('/csrf')).json();assert.equal((await request('/session/guest',{})).status,200);return request;}
const a=await client(),b=await client(),quick=await client(),outsider=await client();
const room=await(await a('/rooms',{})).json();assert.equal(room.origin,'FRIENDS');
assert.equal((await(await b('/rooms/join',{code:room.roomId})).json()).origin,'FRIENDS');
assert.equal((await outsider(`/rooms/${room.roomId}/rematch`,{})).status,403);
assert.equal((await a(`/rooms/${room.roomId}/rematch`,{})).status,409,'Cannot rematch a running or waiting game');
await a(`/rooms/${room.roomId}/ready`,{ready:true});await b(`/rooms/${room.roomId}/ready`,{ready:true});
const matched=await(await quick('/rooms/quick',{})).json();assert.equal(matched.origin,'QUICK');
if(matched.roomId===room.roomId){
 assert.equal((await(await a(`/rooms/${room.roomId}/snapshot`)).json()).origin,'FRIENDS');
 assert.equal((await(await b(`/rooms/${room.roomId}/snapshot`)).json()).origin,'FRIENDS');
}
assert.equal((await quick(`/rooms/${matched.roomId}/rematch`,{})).status,409);
await quick(`/rooms/${matched.roomId}/leave`,{});await b(`/rooms/${room.roomId}/leave`,{});await a(`/rooms/${room.roomId}/leave`,{});
console.log('PASS: invitation creator/joiner see FRIENDS; public quick entrant sees QUICK; outsider and premature rematches rejected; test seats released');
