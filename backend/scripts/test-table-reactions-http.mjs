import assert from 'node:assert/strict';
const origin=process.env.TABLE_QA_ORIGIN||'http://127.0.0.1:8081';
function client(){let cookie='',csrf;return{async call(path,body){const r=await fetch(origin+path,{method:body===undefined?'GET':'POST',headers:{cookie,...(csrf?{[csrf.headerName]:csrf.token}:{}),...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});const set=r.headers.getSetCookie();if(set.length)cookie=set.map(s=>s.split(';')[0]).join('; ');const txt=await r.text();let value;try{value=txt?JSON.parse(txt):null;}catch{value=txt;}if(!r.ok){const e=Error(path+' '+r.status+' '+txt);e.status=r.status;throw e;}return value;},async init(){csrf=await this.call('/api/csrf');await this.call('/api/session/guest',{});}};}
const a=client(),b=client(),outsider=client();await Promise.all([a.init(),b.init(),outsider.init()]);

let room=await a.call('/api/table/rooms',{game:'four',mode:'FRIENDS'});const id=room.id;room=await b.call('/api/table/rooms/'+id+'/join',{});const version=room.version;
const burst=[{commandId:crypto.randomUUID(),emoji:'😂'},{commandId:crypto.randomUUID(),emoji:'😂'}];const responses=await Promise.allSettled(burst.map(input=>a.call('/api/table/rooms/'+id+'/reactions',input)));assert.equal(responses.filter(r=>r.status==='fulfilled').length,1);assert.equal(responses.find(r=>r.status==='rejected').reason.status,429);const winner=responses.findIndex(r=>r.status==='fulfilled'),input=burst[winner],sent=responses[winner].value;assert.equal(sent.length,1);assert.equal(sent[0].emoji,'😂');assert.equal(sent[0].seat,0);
const duplicated=await a.call('/api/table/rooms/'+id+'/reactions',input);assert.equal(duplicated.length,1);assert.equal(duplicated[0].id,sent[0].id);
const received=await b.call('/api/table/rooms/'+id+'/reactions');assert.equal(received[0].id,sent[0].id);assert.deepEqual(await b.call('/api/table/rooms/'+id+'/reactions?after='+sent[0].id),[]);
assert.equal((await b.call('/api/table/rooms/'+id)).version,version);
await assert.rejects(outsider.call('/api/table/rooms/'+id+'/reactions'),e=>e.status===403);
await assert.rejects(outsider.call('/api/table/rooms/'+id+'/reactions',{commandId:crypto.randomUUID(),emoji:'👍'}),e=>e.status===403);
await assert.rejects(a.call('/api/table/rooms/'+id+'/reactions',{commandId:crypto.randomUUID(),emoji:'<script>'}),e=>e.status===400);

await new Promise(resolve=>setTimeout(resolve,1600));await a.call('/api/table/rooms/'+id+'/reactions',{commandId:crypto.randomUUID(),emoji:'👍'});
for(const period of ['day','week','month'])assert.ok(Array.isArray(await a.call('/api/table/leaderboards/four?period='+period)));
await assert.rejects(a.call('/api/table/leaderboards/four?period=invalid'),e=>e.status===400);
await a.call('/api/table/rooms/'+id+'/leave',{});console.log('Shared reactions, cursor, command deduplication, role access, rate limit and leaderboard periods passed.');
