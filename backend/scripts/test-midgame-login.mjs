import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const origin=process.env.FLIGHTPARTY_TEST_URL||'https://flight.joyflock.com';
async function client(){let cookie='',csrf;async function request(path,body){const r=await fetch(origin+'/api'+path,{method:body===undefined?'GET':'POST',headers:{cookie,'content-type':'application/json',...(csrf?{[csrf.headerName]:csrf.token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});const set=r.headers.get('set-cookie');if(set)cookie=set.split(';')[0];assert.ok(r.ok,`${path}: ${r.status}`);return r.json();}csrf=await request('/csrf');await request('/session/guest',{});return request;}
async function start(c){const room=await c('/rooms',{});await c(`/rooms/${room.roomId}/ready`,{ready:true});await c(`/rooms/${room.roomId}/start-now`,{});for(let i=0;i<60;i++){const s=await c(`/rooms/${room.roomId}/snapshot`);if(s.phase==='PLAYING')return s;await new Promise(r=>setTimeout(r,250));}throw Error('did not start');}
const a=await client(),b=await client();const email=`midgame-${randomUUID()}@example.test`,password=randomUUID()+'-test';
const account=await a('/auth/register',{email,password,displayName:'Midgame test pilot'});
const first=await start(a),second=await start(b);assert.notEqual(first.roomId,second.roomId);
await b('/auth/login',{email,password});assert.equal((await b('/me')).account.id,account.id);
assert.equal((await a('/me')).activeRoomId,first.roomId);assert.equal((await b('/me')).activeRoomId,second.roomId);
await new Promise(r=>setTimeout(r,1100));assert.equal((await b(`/rooms/${second.roomId}/snapshot`)).seats[0].displayName,'Midgame test pilot');
await b('/auth/logout',{});await new Promise(r=>setTimeout(r,1100));assert.equal((await b(`/rooms/${second.roomId}/snapshot`)).seats[0].displayName,'Midgame test pilot');
console.log('PASS: two independent live matches remain playable after midgame login; immutable nickname survives logout. Verify ledger for synthetic account and rooms:',JSON.stringify({account:account.id,rooms:[first.roomId,second.roomId]}));
