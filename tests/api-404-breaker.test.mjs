import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import {OnlineSession} from '../dist/online-session.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const sessionSource = read('dist/online-session.js');
const accountSource = read('dist/site-account.js');

/* Slice the real session() helper out of the plain (non-module) account script
   so the breaker is tested as behaviour, not just as a source-code comment. */
function loadAccountSession(api) {
  const start = accountSource.indexOf('var apiDownUntil=0');
  const end = accountSource.indexOf('function notifyGame()', start);
  assert.ok(start >= 0 && end > start, 'account session breaker is present');
  const source = accountSource.slice(start, end);
  return new Function('api', 'var csrf=null;\n' + source + '\nreturn session;')(api);
}

test('one definitive 404 stops every later session probe in the online transport', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response('Not Found', {status: 404}); };
  try {
    const s = new OnlineSession({origin: 'https://example.test'});
    for (const run of [
      () => s.initialize(),          // first probe
      () => s.initialize(),          // tab focus / login dialog
      () => s.initialize(),          // another visibility change
      () => s.refreshIdentity(),     // refreshLogin when authState was ready
      () => s.enter('/api/rooms', {}) // Quick match / Create room
    ]) { try { await run(); } catch {} }
    assert.equal(calls, 1, 'only the first 404 is sent; no repeat flood');
    assert.equal(s.authState, 'error');
  } finally {
    globalThis.fetch = original;
  }
});

test('the breaker expires and a healthy backend still initializes normally', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async url => {
    calls++;
    const body = String(url).endsWith('/csrf') ? {headerName: 'X-CSRF-TOKEN', token: 'x'}
      : String(url).endsWith('/me') ? {account: {displayName: 'Pilot'}} : {};
    return new Response(JSON.stringify(body));
  };
  try {
    const s = new OnlineSession({origin: 'https://example.test'});
    s.apiDownError = new Error('cached 404');
    s.apiDownUntil = Date.now() - 1; // the 30s window elapsed
    await s.initialize();
    assert.equal(calls, 3, 'csrf + guest + me');
    assert.equal(s.authState, 'ready');
    assert.equal(s.apiDownUntil, 0);
  } finally {
    globalThis.fetch = original;
  }
});

test('account dialog repeats are suppressed after a 4xx, but 5xx is not cached', async () => {
  let calls404 = 0;
  const fail404 = loadAccountSession(() => { calls404++; return Promise.reject(new Error('HTTP 404')); });
  for (let i = 0; i < 3; i++) await fail404().catch(() => {});
  assert.equal(calls404, 1, 'opening the login dialog repeatedly must not re-probe');

  let calls503 = 0;
  const fail503 = loadAccountSession(() => { calls503++; return Promise.reject(new Error('HTTP 503')); });
  for (let i = 0; i < 3; i++) await fail503().catch(() => {});
  assert.equal(calls503, 3, 'server errors stay retryable');
});

test('both guards only cache 4xx, use a short window and add no new endpoint', () => {
  assert.match(sessionSource, /error\.status>=400&&error\.status<500\)\{this\.apiDownUntil=Date\.now\(\)\+30000;/);
  assert.match(sessionSource, /down\(\)\{return this\.apiDownUntil>Date\.now\(\)/);
  assert.match(accountSource, /if\(m&&Number\(m\[1\]\)>=400&&Number\(m\[1\]\)<500\)\{apiDownUntil=Date\.now\(\)\+30000;/);
  assert.match(accountSource, /if\(Date\.now\(\)<apiDownUntil\)return Promise\.reject\(apiDownError/);
  assert.ok(accountSource.includes("if(/HTTP 404$/.test(e&&e.message||''))rememberDown(e);"),
    'the first-frame /api/me 404 primes the breaker so the login dialog adds no probe');
  assert.ok(!/fetch\('\/api\/(?!me\b)/.test(accountSource.slice(accountSource.indexOf('var apiDownUntil=0'), accountSource.indexOf('function notifyGame()'))),
    'the breaker introduces no extra endpoint');
  assert.ok(!/\/api\/leaderboards|\/api\/table/.test(sessionSource + accountSource.slice(accountSource.indexOf('var apiDownUntil=0'), accountSource.indexOf('function notifyGame()'))),
    'no new leaderboard or table calls');
});
