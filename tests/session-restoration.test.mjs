import test from 'node:test';
import assert from 'node:assert/strict';
import {OnlineSession} from '../dist/online-session.js';
test('temporary startup failure retries without publishing a false guest identity',async()=>{
 const original=globalThis.fetch,timeout=globalThis.setTimeout;let calls=0,failures=2;
 const account={kind:'account',account:{displayName:'Test pilot'}};
 globalThis.setTimeout=fn=>{queueMicrotask(fn);return 0;};
 globalThis.fetch=async url=>{calls++;if(failures-->0)throw new Error('transient');return new Response(JSON.stringify(String(url).endsWith('/me')?account:String(url).endsWith('/csrf')?{headerName:'X-CSRF-TOKEN',token:'test-only'}:{kind:'guest'}));};
 try{const session=new OnlineSession({origin:'https://example.test'}),identities=[];session.addEventListener('identity',e=>identities.push(e.detail));
  const [a,b]=await Promise.all([session.initialize(),session.initialize()]);assert.deepEqual(a,account);assert.deepEqual(b,account);assert.equal(session.authState,'ready');assert.equal(identities.length,1);assert.equal(calls,5);
  globalThis.fetch=async()=>{throw new Error('offline');};await assert.rejects(session.refreshIdentity());assert.deepEqual(session.identity,account);assert.equal(identities.length,1);
 }finally{globalThis.fetch=original;globalThis.setTimeout=timeout;}
});
