import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const origin=process.env.FLIGHTPARTY_TEST_URL||'https://flight.joyflock.com';
const credentials=JSON.parse(readFileSync(process.env.FLIGHTPARTY_TEST_SESSION_FILE));
async function request(path,body,authenticated=true){
 const response=await fetch(origin+'/api'+path,{method:body===undefined?'GET':'POST',headers:{...(authenticated?{cookie:credentials.cookie,[credentials.csrf.headerName]:credentials.csrf.token}:{}),'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(30000)});
 return response;
}
const before=await(await request('/me')).json();
assert.equal(before.recording.member,false,'Sandbox must not grant real paid membership');
assert.equal(before.recording.testMembership,true,'Provider payment must grant a sandbox entitlement');
const active=before.recording.subscriptions.find(s=>s.status==='TEST_ACTIVE'&&!s.cancelScheduled);
assert.ok(active,'Expected an active sandbox subscription');
// Anonymous requests must fail CSRF or identity checks, never cancel someone else's subscription.
assert.ok([401,403].includes((await request(`/billing/subscriptions/${active.id}/cancel`,{},false)).status));
const cancellation=await request(`/billing/subscriptions/${active.id}/cancel`,{});
assert.equal(cancellation.status,200);assert.equal((await cancellation.json()).status,'scheduled_cancel');
assert.equal((await request(`/billing/subscriptions/${active.id}/cancel`,{})).status,200);
const after=await(await request('/me')).json();
const updated=after.recording.subscriptions.find(s=>s.id===active.id);
assert.equal(updated.cancelScheduled,true);assert.equal(updated.validUntil,active.validUntil);
assert.equal(updated.status,'TEST_ACTIVE');assert.equal(after.recording.member,false);
console.log('PASS: real sandbox webhook entitlement; real membership isolated; anonymous cancellation rejected; repeated scheduled cancellation preserves paid period');
