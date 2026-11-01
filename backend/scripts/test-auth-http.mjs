import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
let cookie='',csrf;const email=`test-${randomUUID()}@example.test`,password=randomUUID()+'-test';
async function request(path,body){
 const response=await fetch((process.env.FLIGHTPARTY_TEST_URL || 'http://127.0.0.1:8080')+'/api'+path,{method:body===undefined?'GET':'POST',headers:{...(cookie?{cookie}:{}),...(csrf?{[csrf.headerName]:csrf.token}:{}),'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const set=response.headers.get('set-cookie');if(set)cookie=set.split(';')[0];return response;
}
csrf=await (await request('/csrf')).json();assert.equal((await request('/session/guest',{})).status,200);
const guestCookie=cookie;
const registered=await request('/auth/register',{email,password,displayName:'HTTP test pilot'});assert.equal(registered.status,200);
assert.match(registered.headers.get('set-cookie'),/Max-Age=2592000/i);
assert.match(registered.headers.get('set-cookie'),/HttpOnly/i);
const account=await registered.json();assert.equal(account.emailVerified,false);assert.notEqual(cookie,guestCookie);
let me=await (await request('/me')).json();assert.equal(me.kind,'account');assert.equal(me.account.id,account.id);
assert.equal(me.recording.freeRemaining,1);assert.equal(me.recording.member,false);assert.equal(me.recording.monthlyUsd,9);assert.equal(me.recording.annualUsd,59);assert.equal(me.recording.paymentConfigured,false);
assert.equal((await request('/billing/checkout',{requestId:randomUUID(),plan:'UNKNOWN'})).status,400);
assert.equal((await request('/billing/checkout',{requestId:randomUUID(),plan:'MONTHLY'})).status,503);
assert.equal((await request('/auth/logout',{})).status,200);assert.equal((await (await request('/me')).json()).kind,'guest');
assert.equal((await request('/billing/checkout',{requestId:randomUUID(),plan:'MONTHLY'})).status,401);
assert.equal((await request('/auth/login',{email,password:'incorrect-test-password'})).status,401);
const logged=await request('/auth/login',{email,password});assert.equal(logged.status,200);assert.equal((await logged.json()).id,account.id);
assert.match(logged.headers.get('set-cookie'),/Max-Age=2592000/i);
// A fresh client with the persisted cookie restores the account without signing in again.
const origin=process.env.FLIGHTPARTY_TEST_URL || 'http://127.0.0.1:8080';
const persisted=await fetch(origin+'/api/me',{headers:{cookie}});
assert.equal((await persisted.json()).account.id,account.id);
assert.equal((await request('/auth/logout',{})).status,200);
console.log('Auth HTTP: register, unverified email, session rotation, login failure, 30-day persistent cookie, fresh-client restoration and logout verified');
