import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const origin=process.env.FLIGHTPARTY_TEST_URL||'http://127.0.0.1:8080';
async function client(){
 let cookie='',csrf;
 async function request(path,body){const r=await fetch(origin+'/api'+path,{method:body===undefined?'GET':'POST',headers:{cookie,'content-type':'application/json',...(csrf?{[csrf.headerName]:csrf.token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});const set=r.headers.get('set-cookie');if(set)cookie=set.split(';')[0];return r;}
 csrf=await(await request('/csrf')).json();assert.equal((await request('/session/guest',{})).status,200);return request;
}
const owner=await client(),guest=await client(),outsider=await client();
const email=`name-${randomUUID()}@example.test`,password=randomUUID()+'-test',nickname='大卫 <pilot>';
const registration=await owner('/auth/register',{email,password,displayName:nickname});assert.equal(registration.status,200);const account=await registration.json();
const room=await(await owner('/rooms',{})).json();
assert.equal(room.seats[0].displayName,nickname);
let joined=await(await guest('/rooms/join',{code:room.roomId})).json();
assert.equal(joined.seats[0].displayName,nickname,'Other players receive the nickname');assert.equal(joined.seats[1].displayName,null);
assert.ok(!JSON.stringify(joined).includes(email));assert.ok(!JSON.stringify(joined).includes(account.id));
assert.equal((await outsider(`/rooms/${room.roomId}/snapshot`)).status,403);
await owner(`/rooms/${room.roomId}/ready`,{ready:true});await guest(`/rooms/${room.roomId}/ready`,{ready:true});await owner(`/rooms/${room.roomId}/start-now`,{});
for(let i=0;i<60;i++){joined=await(await guest(`/rooms/${room.roomId}/snapshot`)).json();if(joined.phase==='PLAYING')break;await new Promise(r=>setTimeout(r,250));}
assert.equal(joined.phase,'PLAYING');assert.equal(joined.seats[0].displayName,nickname);assert.ok(joined.seats.filter(s=>s.bot).every(s=>s.displayName===null));
assert.equal((await owner('/auth/logout',{})).status,200);await new Promise(r=>setTimeout(r,1100));
joined=await(await guest(`/rooms/${room.roomId}/snapshot`)).json();assert.equal(joined.seats[0].displayName,nickname,'Match identity survives logout');
console.log('PASS: public nickname shared with another session in lobby and game; guests/bots unnamed, private identity hidden, outsider denied, started account name retained after logout. Room:',room.roomId);
