import assert from 'node:assert/strict';
import {poolBot,poolMove} from '../../dist/table/pool.js';

const origin=process.env.TABLE_QA_ORIGIN||'http://127.0.0.1:18099';
function client(){
  let cookie='',csrf;
  return {
    async call(path,body){
      const response=await fetch(origin+path,{method:body===undefined?'GET':'POST',headers:{cookie,...(csrf?{[csrf.headerName]:csrf.token}:{}),...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
      const cookies=response.headers.getSetCookie();if(cookies.length)cookie=cookies.map(s=>s.split(';')[0]).join('; ');
      const text=await response.text();let value;try{value=text?JSON.parse(text):null;}catch{value=text;}
      if(!response.ok){const error=Error(path+' HTTP '+response.status);error.status=response.status;throw error;}return value;
    },
    async init(){csrf=await this.call('/api/csrf');await this.call('/api/session/guest',{});}
  };
}
const a=client(),b=client(),outsider=client();await Promise.all([a.init(),b.init(),outsider.init()]);
let room=await a.call('/api/table/rooms',{game:'pool',mode:'FRIENDS'}),activeId=room.id;
try{
  assert.equal(room.board.cells.length,53);assert.equal(room.board.cells.filter((_,i)=>i<48&&i%3===2).reduce((n,v)=>n+v,0),16);
  await b.call(`/api/table/rooms/${activeId}/join`,{});await a.call(`/api/table/rooms/${activeId}/ready`,{});room=await b.call(`/api/table/rooms/${activeId}/ready`,{});
  await assert.rejects(outsider.call(`/api/table/rooms/${activeId}`),e=>e.status===403);
  await assert.rejects(a.call(`/api/table/rooms/${activeId}/move`,{commandId:crypto.randomUUID(),version:room.version,position:100*3600}),e=>e.status===409);
  await new Promise(resolve=>setTimeout(resolve,Math.max(0,room.playStartsAt-room.serverNow)+100));
  let n=0,assigned=false;
  while(room.phase==='PLAYING'){
    assert.ok(n<200,'match must settle by 200 shots');
    const actor=room.board.turn===1?a:b,other=room.board.turn===1?b:a;
    room=await actor.call(`/api/table/rooms/${activeId}`);if(room.phase!=='PLAYING')break;
    const command=n===0?100*3600:poolBot(room.board),expected=poolMove(room.board,room.board.turn,command);
    const input={commandId:crypto.randomUUID(),version:room.version,position:command};
    if(n===0){const blocked=await other.call(`/api/table/rooms/${activeId}/move`,{...input,commandId:crypto.randomUUID()});assert.equal(blocked.board.moves,room.board.moves);}
    const next=await actor.call(`/api/table/rooms/${activeId}/move`,input);
    assert.deepEqual(next.board.cells,expected.cells,'Java and JS authoritative cells must match');
    assert.equal(next.board.turn,expected.turn);assert.equal(next.board.winner,expected.winner);assert.equal(next.board.over,expected.over);
    if(n===0){const duplicate=await actor.call(`/api/table/rooms/${activeId}/move`,input);assert.deepEqual(duplicate.board,next.board);assert.deepEqual((await other.call(`/api/table/rooms/${activeId}`)).board,next.board);}
    room=next;n++;assigned||=room.board.cells[50]!==0;
    if(n%20===0)console.log('Verified shots:',n);
  }
  assert.equal(room.phase,'OVER');assert.ok(assigned,'valid pockets assign opposite groups');
  for(const c of [a,b])assert.deepEqual(await c.call('/api/table/stats/pool'),{points:0,completedGames:0});
  console.log(`Complete guest pool match: ${n} shots; winner ${room.board.winner}; Java/JS parity, groups, countdown, permissions and idempotency passed.`);
  assert.equal((await a.call(`/api/table/rooms/${activeId}/rematch`,{})).id,activeId);
  const next=await b.call(`/api/table/rooms/${activeId}/rematch`,{});assert.notEqual(next.id,activeId);assert.equal(next.board.cells.length,53);assert.equal(next.board.moves,0);
  assert.equal((await a.call(`/api/table/rooms/${activeId}`)).id,next.id);activeId=next.id;
  console.log('Two-client rematch starts a fresh 15-ball game; guest cumulative stats remain zero.');
}finally{
  for(const c of [a,b])await c.call(`/api/table/rooms/${activeId}/leave`,{}).catch(()=>{});
}
