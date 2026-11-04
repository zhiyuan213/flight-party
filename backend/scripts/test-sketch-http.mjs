import assert from 'node:assert/strict';
const origin=process.env.TABLE_QA_ORIGIN||'http://127.0.0.1:8083';
function client(){let cookie='',csrf;return{async call(path,body){const r=await fetch(origin+path,{method:body===undefined?'GET':'POST',headers:{cookie,...(csrf?{[csrf.headerName]:csrf.token}:{}),...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});const set=r.headers.getSetCookie();if(set.length)cookie=set.map(s=>s.split(';')[0]).join('; ');const text=await r.text();if(!r.ok){const e=Error(path+' '+r.status);e.status=r.status;throw e;}return text?JSON.parse(text):null;},async init(){csrf=await this.call('/api/csrf');await this.call('/api/session/guest',{});}};}
const a=client(),b=client();await Promise.all([a.init(),b.init()]);
if(!process.env.TABLE_QA_GUEST_ONLY)await a.call('/api/auth/register',{email:'games-'+crypto.randomUUID()+'@example.test',password:'Games-QA-12345',displayName:'Games QA'});
let room=await a.call('/api/table/rooms',{game:'draw',mode:'FRIENDS'});const id=room.id;await b.call('/api/table/rooms/'+id+'/join',{});await a.call('/api/table/rooms/'+id+'/ready',{});room=await b.call('/api/table/rooms/'+id+'/ready',{});
for(let round=0;round<6;round++){
 const drawer=room.board.turn===1?a:b,guesser=room.board.turn===1?b:a;
 const drawing=await drawer.call('/api/table/rooms/'+id),guessing=await guesser.call('/api/table/rooms/'+id);
 assert.notEqual(guessing.board.fen,drawing.board.fen);
 await assert.rejects(guesser.call('/api/table/rooms/'+id+'/sketch',{commandId:crypto.randomUUID(),version:room.version,action:'stroke',points:[0,0,500,500]}),e=>e.status===409);
 room=await drawer.call('/api/table/rooms/'+id+'/sketch',{commandId:crypto.randomUUID(),version:room.version,action:'stroke',points:[0,0,500,500]});
 if(round===0){room=await guesser.call('/api/table/rooms/'+id+'/sketch',{commandId:crypto.randomUUID(),version:room.version,action:'guess',text:'not-the-answer'});await assert.rejects(guesser.call('/api/table/rooms/'+id+'/sketch',{commandId:crypto.randomUUID(),version:room.version,action:'guess',text:drawing.board.fen}),e=>e.status===429);await new Promise(resolve=>setTimeout(resolve,1100));}
 const input={commandId:crypto.randomUUID(),version:room.version,action:'guess',text:drawing.board.fen};
 room=await guesser.call('/api/table/rooms/'+id+'/sketch',input);
 const duplicate=await guesser.call('/api/table/rooms/'+id+'/sketch',input);assert.equal(duplicate.board.moves,room.board.moves);
}
assert.equal(room.phase,'OVER');assert.deepEqual(room.board.cells,[9,9]);assert.equal(room.board.winner,0);
if(!process.env.TABLE_QA_GUEST_ONLY){const stats=await a.call('/api/table/stats/draw');assert.equal(stats.completedGames,1);assert.equal(stats.points,2);}
console.log('Drawing: six rounds, answer redaction, role validation, strokes, scoring and deduplication passed.');
