import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
let cookie='',csrf;
async function request(path,body){const response=await fetch('http://127.0.0.1:8080/api'+path,{method:body===undefined?'GET':'POST',headers:{...(cookie?{cookie}:{}),...(csrf?{[csrf.headerName]:csrf.token}:{}),'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(5000)});const set=response.headers.get('set-cookie');if(set)cookie=set.split(';')[0];if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json();}
csrf=await request('/csrf');await request('/session/guest',{});const room=await request('/rooms',{});
try{
 execFileSync('docker',['compose','-f','deploy/compose.yaml','restart','backend'],{stdio:'ignore'});
 let restored;
 for(let i=0;i<40;i++){try{restored=await request(`/rooms/${room.roomId}/snapshot`);break;}catch{}await new Promise(r=>setTimeout(r,500));}
 assert.equal(restored?.roomId,room.roomId);assert.equal(restored.yourSeat,room.yourSeat);assert.equal(restored.seats.length,1);
 assert.equal((await request('/me')).activeRoomId,room.roomId);
 console.log('Service restart: same session, room and seat recovered without duplicate admission');
}finally{await fetch(`http://127.0.0.1:8080/api/rooms/${room.roomId}/leave`,{method:'POST',headers:{cookie,[csrf.headerName]:csrf.token}});}
