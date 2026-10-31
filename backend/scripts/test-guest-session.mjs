import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';

const origin = 'http://127.0.0.1:8080';
let cookie = '';
async function request(path, options = {}) {
  const response = await fetch(origin + path, {...options, headers: {...options.headers, ...(cookie ? {cookie} : {})}});
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  return response;
}
let ready = false;
for (let i=0;i<30;i++) {
  try { if ((await request('/api/me')).ok) { ready = true; break; } } catch {}
  await new Promise(resolve => setTimeout(resolve, 500));
}
assert.ok(ready, 'backend did not become ready');
assert.equal((await (await request('/api/me')).json()).kind, 'none');
assert.equal((await request('/api/session/guest', {method:'POST'})).status, 403);
const csrfResponse = await request('/api/csrf');
assert.equal(csrfResponse.status, 200);
const csrf = await csrfResponse.json();
assert.ok(cookie && csrf.token && csrf.headerName);
for (let i=0;i<2;i++) {
  const response = await request('/api/session/guest', {method:'POST', headers:{[csrf.headerName]:csrf.token}});
  assert.equal(response.status, 200);
  assert.equal((await response.json()).kind, 'guest');
}
assert.equal((await (await request('/api/me')).json()).kind, 'guest');
if (process.argv.includes('--restart')) {
  execFileSync('docker', ['compose','-f','deploy/compose.yaml','restart','backend'], {stdio:'ignore'});
  let result;
  for (let i=0;i<30;i++) {
    try { const response = await request('/api/me'); if (response.ok) { result = await response.json(); break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.equal(result?.kind, 'guest');
}
console.log('Guest session: CSRF, creation, reuse and identity check passed');
