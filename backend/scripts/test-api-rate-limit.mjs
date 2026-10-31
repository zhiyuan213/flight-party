import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const base='http://127.0.0.1:8080';let cookie='';
async function request(path,options={}) {
 const response=await fetch(base+path,{...options,headers:{...options.headers,...(cookie?{cookie}:{})}});
 const set=response.headers.get('set-cookie');if(set)cookie=set.split(';')[0];return response;
}
const csrf=await (await request('/api/csrf')).json();
const headers={[csrf.headerName]:csrf.token,'content-type':'application/json'};
assert.equal((await request('/api/session/guest',{method:'POST',headers,body:'{}'})).status,200);
const path=`/api/rooms/${randomUUID()}/leave`;let limited;
for(let i=0;i<125;i++){
 const response=await request(path,{method:'POST',headers,body:'{}'});
 if(response.status===429){limited=response;break;}
 assert.equal(response.status,404);
}
assert.ok(limited,'write limit was not enforced');
assert.equal(limited.headers.get('retry-after'),'60');
const body=await limited.json();assert.equal(body.code,'RATE_LIMITED');assert.ok(body.requestId);
assert.equal((await request('/api/me')).status,200);
console.log('Rate limit: excess writes rejected; read access remains available');
