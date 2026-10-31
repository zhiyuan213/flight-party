import assert from 'node:assert/strict';
async function client(){
 let cookie='',csrf;
 async function call(path,body){const response=await fetch((process.env.FLIGHTPARTY_TEST_URL || 'http://127.0.0.1:8080')+'/api'+path,{method:body===undefined?'GET':'POST',headers:{...(cookie?{cookie}:{}),...(csrf?{[csrf.headerName]:csrf.token}:{}),'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});const set=response.headers.get('set-cookie');if(set)cookie=set.split(';')[0];return response;}
 csrf=await (await call('/csrf')).json();assert.equal((await call('/session/guest',{})).status,200);return call;
}
const owner=await client(),peers=await Promise.all(Array.from({length:4},client));
const room=await (await owner('/rooms',{})).json();
try{
 const repeated=await Promise.all(Array.from({length:8},()=>owner('/rooms',{})));
 for(const response of repeated)assert.equal((await response.json()).roomId,room.roomId);
 const joins=await Promise.all(peers.map(peer=>peer('/rooms/join',{code:room.roomId})));
 assert.equal(joins.filter(r=>r.status===200).length,3);assert.equal(joins.filter(r=>r.status===409).length,1);
 const snapshot=await (await owner(`/rooms/${room.roomId}/snapshot`)).json();
 assert.equal(snapshot.seats.length,4);assert.equal(new Set(snapshot.seats.map(s=>s.index)).size,4);
 for(let i=0;i<peers.length;i++)if(joins[i].status===200)assert.equal((await peers[i](`/rooms/${room.roomId}/leave`,{})).status,200);
 console.log('Concurrent room admission: one room per identity, capacity enforced and unique seats');
}finally{await owner(`/rooms/${room.roomId}/leave`,{});}
