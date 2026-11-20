import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import {OnlineSession} from '../dist/online-session.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');

function patch({fetchImpl, socketImpl}) {
  const saved = {fetch: globalThis.fetch, WebSocket: globalThis.WebSocket};
  globalThis.fetch = fetchImpl;
  if (socketImpl) globalThis.WebSocket = socketImpl;
  return () => { globalThis.fetch = saved.fetch; globalThis.WebSocket = saved.WebSocket; };
}
const pathOf = url => new URL(String(url)).pathname;
const json = value => new Response(JSON.stringify(value), {headers: {'content-type': 'application/json'}});
const identity = {kind: 'account', activeRoomId: null, account: {displayName: 'Pilot'}};
const room = {roomId: 'r1', phase: 'WAITING_FRIENDS', origin: 'FRIENDS', seats: [], yourSeat: 0};

/* A socket that reports the server's 1008 policy close as soon as close() is
   called, exactly like RoomSocket.publish() does after the seat is dropped. */
class PolicyCloseSocket {
  constructor(url) { this.url = url; }
  send() {}
  close() { if (this.onclose) this.onclose({code: 1008}); }
}

test('guest and /api/me share one bootstrap round trip', async () => {
  const events = [];
  let releaseGuest;
  const guestGate = new Promise(resolve => { releaseGuest = resolve; });
  let restore = patch({fetchImpl: async url => {
    const path = pathOf(url);
    if (path === '/api/csrf') return json({headerName: 'X-CSRF-TOKEN', token: 'x'});
    if (path === '/api/session/guest') {
      events.push('guest-start');
      await guestGate;
      events.push('guest-end');
      return json({kind: 'guest'});
    }
    if (path === '/api/me') { events.push('me-start'); return json(identity); }
    throw new Error('unexpected ' + path);
  }});
  try {
    const session = new OnlineSession({origin: 'https://example.test'});
    const pending = session.initialize();
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(events, ['guest-start', 'me-start'],
      '/api/me must start before the guest response arrives');
    releaseGuest();
    assert.deepEqual(await pending, identity);
    assert.deepEqual(events, ['guest-start', 'me-start', 'guest-end']);
  } finally { restore(); }
});

test('a brand-new guest still refreshes /api/me once after the principal is written', async () => {
  const paths = [];
  let restore = patch({fetchImpl: async url => {
    const path = pathOf(url); paths.push(path);
    if (path === '/api/csrf') return json({headerName: 'X-CSRF-TOKEN', token: 'x'});
    if (path === '/api/session/guest') return json({kind: 'guest'});
    if (path === '/api/me') return json(paths.filter(p => p === '/api/me').length > 1
      ? {kind: 'guest', activeRoomId: null} : {kind: 'none', activeRoomId: null});
    throw new Error('unexpected ' + path);
  }});
  try {
    const session = new OnlineSession({origin: 'https://example.test'});
    assert.equal((await session.initialize()).kind, 'guest');
    assert.deepEqual(paths, ['/api/csrf', '/api/session/guest', '/api/me', '/api/me']);
  } finally { restore(); }
});

test('leave detaches before the request so a 1008 close cannot re-request /snapshot', async () => {
  const paths = [];
  let restore = patch({socketImpl: PolicyCloseSocket, fetchImpl: async (url, init) => {
    const path = pathOf(url);
    paths.push(path);
    if (path === '/api/csrf') return json({headerName: 'X-CSRF-TOKEN', token: 'x'});
    if (path === '/api/session/guest') return json({kind: 'guest'});
    if (path === '/api/me') return json(identity);
    if (path === '/api/rooms' && init?.method === 'POST') return json(room);
    if (path === '/api/rooms/r1/leave') return new Response('');
    if (path === '/api/rooms/r1/snapshot') return new Response('Forbidden', {status: 403});
    throw new Error('unexpected ' + path);
  }});
  try {
    const session = new OnlineSession({origin: 'https://example.test'});
    assert.equal((await session.create()).roomId, 'r1');
    await session.leave();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(session.room, null, 'the left room is cleared');
    assert.ok(!paths.includes('/api/rooms/r1/snapshot'),
      'no stale snapshot request after a deliberate leave');
    await assert.rejects(session.startNow(), error => error.status === 403);
    assert.ok(!paths.some(p => p.includes('/start-now')),
      'a late command is rejected locally without a doomed 403 round trip');
    assert.equal(paths.filter(p => p === '/api/rooms/r1/leave').length, 1);
  } finally { restore(); }
});

test('a 403 on the guest probe refreshes the CSRF token instead of disabling play', async () => {
  const paths = [];
  let guestAttempts = 0;
  let restore = patch({fetchImpl: async url => {
    const path = pathOf(url); paths.push(path);
    if (path === '/api/csrf') return json({headerName: 'X-CSRF-TOKEN', token: 'token-' + paths.filter(p => p === '/api/csrf').length});
    if (path === '/api/session/guest') {
      guestAttempts++;
      if (guestAttempts === 1) return new Response('Forbidden', {status: 403});
      return json({kind: 'guest'});
    }
    if (path === '/api/me') return json(identity);
    throw new Error('unexpected ' + path);
  }});
  try {
    const session = new OnlineSession({origin: 'https://example.test'});
    assert.deepEqual(await session.initialize(), identity);
    assert.equal(session.authState, 'ready');
    assert.equal(guestAttempts, 2, 'one retry with the session the browser kept');
    assert.equal(paths.filter(p => p === '/api/csrf').length, 2);
    assert.equal(session.csrf.token, 'token-2');
  } finally { restore(); }
});

test('a 403 on /api/csrf itself is still a definitive failure', async () => {
  const paths = [];
  let restore = patch({fetchImpl: async url => {
    paths.push(pathOf(url));
    return new Response('Forbidden', {status: 403});
  }});
  try {
    const session = new OnlineSession({origin: 'https://example.test'});
    await assert.rejects(session.initialize(), error => error.status === 403);
    assert.equal(paths.length, 1, 'no retry storm on a definitive 4xx');
    assert.equal(session.authState, 'error');
  } finally { restore(); }
});

test('an expired room pointer is discarded instead of blocking the welcome screen', async () => {
  let restore = patch({fetchImpl: async () => new Response('Forbidden', {status: 403})});
  try {
    const session = new OnlineSession({origin: 'https://example.test'});
    session.room = room;
    let left = 0;
    session.addEventListener('left', event => { if (event.detail?.stale) left++; });
    await assert.rejects(session.restore('r1'), error => error.status === 403);
    assert.equal(session.room, null);
    assert.equal(session.closed, true);
    assert.equal(left, 1);
  } finally { restore(); }
});

test('a newer room survives a slow leave response', async () => {
  let releaseLeave;
  const leaveGate = new Promise(resolve => { releaseLeave = resolve; });
  const paths = [];
  let restore = patch({socketImpl: PolicyCloseSocket, fetchImpl: async (url, init) => {
    const path = pathOf(url); paths.push(path);
    if (path === '/api/csrf') return json({headerName: 'X-CSRF-TOKEN', token: 'x'});
    if (path === '/api/session/guest') return json({kind: 'guest'});
    if (path === '/api/me') return json(identity);
    if (path === '/api/rooms' && init?.method === 'POST') {
      return json(paths.filter(p => p === '/api/rooms').length > 1
        ? {...room, roomId: 'r2'} : room);
    }
    if (path === '/api/rooms/r1/leave') { await leaveGate; return new Response(''); }
    throw new Error('unexpected ' + path);
  }});
  try {
    const session = new OnlineSession({origin: 'https://example.test'});
    await session.create();
    const leaving = session.leave();
    const fresh = await session.create();
    assert.equal(fresh.roomId, 'r2');
    releaseLeave();
    await leaving;
    assert.equal(session.room?.roomId, 'r2', 'the old leave must not erase the new room');
  } finally { restore(); }
});

test('shipped entry points use the new module versions and the app tolerates a stale room', () => {
  const app = read('dist/app.js');
  const index = read('dist/index.html');
  const native = read('dist/portal/native-flight.html');
  assert.match(app, /online-session\.js\?v=20261116-csrfretry1/);
  assert.match(app, /live-room-ui\.js\?v=20261116-roomleave1/);
  assert.match(app, /audio=20261116-idle1/);
  assert.match(index, /rl=20261116-poolshell1/);
  assert.match(native, /rl=20261116-poolshell1/);
  assert.match(app, /try\{room=await onlineSession\.restore\(identity\.activeRoomId\);\}catch\(error\)\{room=null;\}/);
  assert.match(app, /Date\.now\(\)-lastIdentityRefresh<60000/);
});

test('an expired-room dead end offers a one-click retry and leaves optimistically', () => {
  const ui = read('dist/live-room-ui.js');
  assert.match(ui, /data-live="retry"/);
  assert.match(ui, /error\.status===403\?t\('This room has ended/);
  assert.match(ui, /if\(\[403,404\]\.includes\(error\.status\)\)session\.discard\?\.\(\)/);
  assert.match(ui, /dialog\.close\(\);clearSharedPage\(\);\s*if\(room&&/);
  assert.ok(!/action\(async\(\)=>\{if\(session\.room&&\['WAITING_FRIENDS','MATCHING'\]/.test(ui),
    'leave no longer keeps the dialog (and its buttons) open for a slow request');
});

test('audio prefetch is deferred to idle time and lazy per sound', () => {
  const audio = read('dist/audio.js');
  assert.match(audio, /window\.requestIdleCallback\(start,\{timeout:4000\}\)/);
  assert.match(audio, /if\(!buffer\)\{this\.tone\(330,120,\.15\);this\.load\(name\);return;\}/);
});

test('versioned static assets are cached; HTML documents still revalidate', () => {
  const conf = read('deploy/nginx.conf');
  assert.match(conf, /map "\$uri:\$args" \$joyflock_static_cache/);
  assert.match(conf, /~\\\.html\(\?::\|\$\) "no-cache"/);
  assert.match(conf, /~\(\?:\^\|:\|&\)v=\s+"public, max-age=86400"/);
  assert.match(conf, /default "no-cache"/);
  assert.match(conf, /add_header Cache-Control \$joyflock_static_cache/);
  assert.match(conf, /location = \/portal\/index\.html \{\s*add_header Cache-Control "no-cache"/);
  assert.match(conf, /location ~ \^\/\(table\/\|assets\/\(pool\/\|audio\/pool\/\)\)/,
    'the production-only static regex location must be preserved');
  assert.ok(!/^\s*\/\*/m.test(conf), 'nginx comments use #, never C block comments');
});
