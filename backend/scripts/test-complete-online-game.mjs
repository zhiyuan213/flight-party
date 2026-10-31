import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const origin=process.env.FLIGHTPARTY_TEST_URL || 'http://127.0.0.1:8081';
const signed=process.argv.includes('--signed');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function client(){
 let cookie='',csrf;
 async function request(path,body){
  const response=await fetch(origin+'/api'+path,{method:body===undefined?'GET':'POST',headers:{...(cookie?{cookie}:{}),...(csrf?{[csrf.headerName]:csrf.token}:{}),'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});
  const set=response.headers.get('set-cookie');if(set)cookie=set.split(';')[0];
  const text=await response.text();if(!response.ok){const error=new Error(`HTTP ${response.status}`);error.status=response.status;throw error;}return text?JSON.parse(text):null;
 }
 csrf=await request('/csrf');await request('/session/guest',{});
 if(signed){const credentials={email:`game-${randomUUID()}@example.test`,password:randomUUID()+'-test',displayName:'Network test pilot'};request.account=await request('/auth/register',credentials);request.credentials=credentials;}
 return request;
}
const a=await client(),b=await client();
const room=await a('/rooms',{});await b('/rooms/join',{code:room.roomId});
await a(`/rooms/${room.roomId}/ready`,{ready:true});await b(`/rooms/${room.roomId}/ready`,{ready:true});
console.log('Room created with two independent human clients:',room.roomId);
const end=Date.now()+20*60*1000;let moves=0,last='',lastReport=Date.now(),loggedOut=false;const commands=new Map();
while(Date.now()<end){
 const snapshot=await a(`/rooms/${room.roomId}/snapshot`);
 if(snapshot.phase!=='PLAYING'&&snapshot.phase!=='SETTLED'){await sleep(250);continue;}
 if(signed&&!loggedOut){await a('/auth/logout',{});assert.equal((await a('/me')).kind,'guest');loggedOut=true;console.log('Seat 0 signed out after match start; frozen account must still receive result');}
 const game=await a(`/rooms/${room.roomId}/game`);
 if(game.phase==='OVER'){
  const results=[];
  for(let retry=0;retry<100;retry++){const result=await a(`/rooms/${room.roomId}/result`);if(result.status==='COMMITTED'){results.push(result);break;}await sleep(250);}
  assert.equal(results.length,1,'settlement did not commit');
  assert.deepEqual(await b(`/rooms/${room.roomId}/result`),results[0]);
  assert.deepEqual(results[0].ranking.map(p=>p.pointsDelta),[2,1,-1,-1]);
  for(let retry=0;retry<40&&(await a('/me')).activeRoomId;retry++)await sleep(250);
  assert.equal((await a('/me')).activeRoomId,null);assert.equal((await b('/me')).activeRoomId,null);
  if(signed){
   await a('/auth/login',a.credentials);
   for(const [seat,client] of [[0,a],[1,b]]){
    const profile=await client('/me');assert.equal(profile.account.id,client.account.id);
    assert.equal(profile.statistics.completedGames,1);
    assert.equal(profile.statistics.points,results[0].ranking.find(p=>p.seatIndex===seat).pointsDelta);
   }
   for(let i=0;i<3;i++)await a(`/rooms/${room.roomId}/result`);
   assert.equal((await a('/me')).statistics.completedGames,1);
   console.log('Signed statistics verified: frozen identity survives logout; games counted exactly once');
  }
  const next=await a('/rooms',{});assert.notEqual(next.roomId,room.roomId);await a(`/rooms/${next.roomId}/leave`,{});
  console.log('PASS: complete authoritative network game, matching rankings, committed points, seat release and new room',JSON.stringify(results[0]));process.exit(0);
 }
 const actor=game.turn===0?a:game.turn===1?b:null;
 const key=JSON.stringify(game);
 if(key!==last){if(game.phase==='ANIMATING')moves++;last=key;}
 if(Date.now()-lastReport>15000){console.log(`Progress: ${moves} moves observed; turn ${game.turn}; phase ${game.phase}; finished seats ${game.ranking.length}`);lastReport=Date.now();}
 if(actor&&(game.phase==='ROLL'||game.phase==='CHOOSE')){
  if(!commands.has(key))commands.set(key,randomUUID());
  const commandId=commands.get(key);
  try{
   if(game.phase==='ROLL'){const rolled=await actor(`/rooms/${room.roomId}/roll`,{commandId});await sleep(Math.max(0,rolled.busyUntil-Date.now()+10));}
   else{const player=game.players.find(p=>p.seat===game.turn);const legal=[0,1].filter(i=>player.planes[i]<57);legal.sort((x,y)=>player.planes[y]-player.planes[x]);await actor(`/rooms/${room.roomId}/move`,{commandId,planeId:legal[0]});}
  }catch(error){if(error.status!==409)throw error;}
 }
 await sleep(150);
}
throw new Error('Complete network game exceeded 20-minute test deadline');
