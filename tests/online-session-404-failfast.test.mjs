import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import {OnlineSession} from '../dist/online-session.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');

// Run initialize() with a scripted fetch, counting every attempt. Backoff
// timers resolve immediately so the test measures the retry policy, not time.
async function run(response, {origin = 'https://example.test'} = {}) {
  const originalFetch = globalThis.fetch, originalTimeout = globalThis.setTimeout;
  let calls = 0;
  globalThis.setTimeout = fn => { queueMicrotask(fn); return 0; };
  globalThis.fetch = async url => {
    calls++;
    const value = typeof response === 'function' ? response(url, calls) : response;
    if (value instanceof Error) throw value;
    if (value instanceof Response) return value;
    return new Response(JSON.stringify(String(url).endsWith('/csrf')
      ? {headerName: 'X-CSRF-TOKEN', token: 'test-only'} : {kind: 'guest'}));
  };
  try {
    const session = new OnlineSession({origin});
    let error = null;
    try { await session.initialize(); } catch (e) { error = e; }
    return {calls, error, authState: session.authState};
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.setTimeout = originalTimeout;
  }
}

test('a 404 from /api/csrf fails immediately instead of retrying four times', async () => {
  const r = await run(new Response('Not Found', {status: 404}));
  assert.equal(r.calls, 1, 'one definitive 404, not a backoff storm');
  assert.equal(r.error?.status, 404);
  assert.equal(r.authState, 'error', 'the UI can show its failure state at once');
});

test('other 4xx are also definitive', async () => {
  for (const status of [400, 401, 403, 422]) {
    const r = await run(new Response('rejected', {status}));
    assert.equal(r.calls, 1, `${status} must not be retried`);
  }
});

test('server errors and network failures keep the original exponential backoff', async () => {
  const server = await run(new Response('unavailable', {status: 503}));
  assert.equal(server.calls, 4, '5xx still uses all four attempts');
  assert.equal(server.authState, 'error');
  const offline = await run(new Error('transient'));
  assert.equal(offline.calls, 4, 'a thrown network error has no status and still retries');
});

test('a healthy backend still succeeds in one pass', async () => {
  const r = await run((url) => new Response(JSON.stringify(
    String(url).endsWith('/csrf') ? {headerName: 'X-CSRF-TOKEN', token: 'test-only'}
      : String(url).endsWith('/me') ? {kind: 'account', account: {displayName: 'Pilot'}}
        : {kind: 'guest'})));
  assert.equal(r.calls, 3, 'csrf + guest + me, no extra probes');
  assert.equal(r.error, null);
  assert.equal(r.authState, 'ready');
});

test('the shell loads the guarded module version', () => {
  const app = read('dist/app.js');
  const source = read('dist/online-session.js');
  assert.match(app, /online-session\.js\?v=20261116-roomleave1/);
  assert.match(source, /error\.status>=400&&error\.status<500\)\{this\.apiDownUntil=Date\.now\(\)\+30000;/);
  assert.match(source, /const down=this\.down\(\);if\(down\)throw down;/, 'repeat probes short-circuit');
  assert.ok(!/fetch\('\/api\/csrf'\)/.test(source), 'no separate csrf probe was added');
});
