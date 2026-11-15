import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const table = read('dist/table/table.js');
const app = read('dist/app.js');
const service = read('backend/src/main/java/com/flightparty/table/TableService.java');

/* The production handler is a NAMED function, so these tests run the real
   source in a vm instead of re-implementing the branch logic. */
function restartMatchSource() {
  const begin = table.indexOf('async function restartMatch(){');
  const end = table.indexOf("$('again').onclick=restartMatch;", begin);
  assert.ok(begin >= 0 && end > begin, 'restartMatch is extractable from table.js');
  return table.slice(begin, end); // includes the closing "}\n"
}

function tableHarness(roomValue, next = {id: 'successor', phase: 'WAITING', origin: 'FRIENDS'}) {
  const calls = [], nodes = {};
  const ctx = vm.createContext({
    room: roomValue, computer: true, pending: false, screen: 'play', generation: 7,
    game: 'xo', rematchPending: false,
    localStart: withBot => calls.push('localStart:' + withBot),
    $: id => (nodes[id] ??= {textContent: ''}),
    render: () => calls.push('render'),
    enter: async mode => { calls.push('enter:' + mode); },
    request: async path => { calls.push('request:' + path); return next; },
    apply: value => { calls.push('apply:' + value.id); ctx.room = value; },
    syncRoomUrl: () => calls.push('syncRoomUrl'),
    schedulePoll: () => calls.push('schedulePoll'),
    reportActivity: () => calls.push('reportActivity'),
    queueRoomTheme: () => calls.push('queueRoomTheme'),
    pollRoomTheme: () => calls.push('pollRoomTheme'),
    console
  });
  return {
    ctx, calls, nodes,
    run: async () => { vm.runInContext(restartMatchSource(), ctx); await ctx.restartMatch(); }
  };
}

/* ---------------------------------------------- 1. table games: 3 modes */
test('table / computer: 再来一次 starts a fresh local match, no middle page', async () => {
  const h = tableHarness(null);
  await h.run();
  assert.deepEqual(h.calls, ['localStart:true']);
});

test('table / QUICK: back to the intro then re-queue for a new opponent', async () => {
  const h = tableHarness({id: 'old', origin: 'QUICK'});
  await h.run();
  assert.deepEqual(h.calls, ['localStart:false', 'render', 'enter:QUICK']);
  assert.equal(h.ctx.screen, 'home', 'the mode-selection middle page is the reset state');
  assert.equal(h.nodes.message.textContent, '');
});

test('table / FRIENDS: back to the intro then rejoin the shared WAITING successor', async () => {
  const h = tableHarness({id: 'old', origin: 'FRIENDS'});
  await h.run();
  assert.deepEqual(h.calls, [
    'localStart:false', 'render',
    'request:/api/table/rooms/old/rematch',
    'apply:successor', 'syncRoomUrl', 'schedulePoll', 'reportActivity',
    'render'
  ]);
  assert.equal(h.ctx.screen, 'home');
  assert.equal(h.ctx.pending, false, 'pending is always released');
  assert.equal(h.ctx.room.id, 'successor');
});

test('table / pending clicks are ignored and a failed rematch reports cleanly', async () => {
  const busy = tableHarness({id: 'old', origin: 'QUICK'});
  busy.ctx.pending = true;
  await busy.run();
  assert.deepEqual(busy.calls, []);

  const broken = tableHarness({id: 'old', origin: 'FRIENDS'});
  broken.ctx.request = async () => { const e = new Error('conflict'); e.status = 409; throw e; };
  await broken.run();
  assert.equal(broken.ctx.pending, false);
  assert.match(broken.nodes.message.textContent, /房间已不可用/);
});

/* ------------------------------------------- 2. Flight Party: middle page */
test('flight / returnToModeScreen(): welcome first, no /leave on a settled room', () => {
  const begin = app.indexOf('function returnToModeScreen(){');
  const end = app.indexOf('\n}', begin) + 2;
  assert.ok(begin >= 0 && end > begin, 'returnToModeScreen is extractable from app.js');
  const calls = [], removed = [];
  const ctx = vm.createContext({
    clearInterval: () => calls.push('clearInterval'), onlineTimer: 1,
    onlineSession: {close: () => calls.push('close'), leave: () => calls.push('leave')},
    onlineMode: true, onlineVersion: 5, onlineRoomId: 'old', roomSnapshot: {}, hostedResult: true,
    clearNoScoreNotice: () => calls.push('clearNoScoreNotice'),
    localStorage: {removeItem: k => removed.push(k)},
    flightRoomKey: () => 'joyflock.online.room.flight',
    cancel: () => calls.push('cancel'),
    discardLocalGame: () => calls.push('discardLocalGame'),
    show: id => calls.push('show:' + id)
  });
  vm.runInContext(app.slice(begin, end), ctx);
  ctx.returnToModeScreen();
  assert.equal(ctx.onlineMode, false);
  assert.equal(ctx.onlineRoomId, null);
  assert.equal(ctx.hostedResult, false);
  assert.deepEqual(removed, ['joyflock.online.room.flight']);
  assert.ok(!calls.includes('leave'), 'a SETTLED room must not call /leave (it returns 409)');
  assert.equal(calls.at(-1), 'show:welcome');
  assert.ok(calls.indexOf('close') < calls.indexOf('cancel'));
  assert.ok(calls.indexOf('discardLocalGame') < calls.indexOf('show:welcome'));
});

/* ------------------------------------------------------ 3. backend contract */
test('backend / rematch(): QUICK re-queues; FRIENDS opens one WAITING successor', () => {
  const method = service.slice(
    service.indexOf('@Transactional public View rematch'),
    service.indexOf('@Transactional public View ready')
  );
  assert.match(method, /if\(old\.origin\.equals\("QUICK"\)\)return create\(old\.game,"QUICK",request\)/);
  assert.match(method, /"FRIENDS","WAITING"/, 'a friends rematch waits for both players');
  assert.match(method, /successor_id=:next/, 'both clients land in the same room');
  assert.match(method, /filter\(s->!s\.bot\)/, 'bot fillers are dropped');
  assert.match(method, /GridRules\.start\(old\.game\),0,0\)/, 'no countdown, fresh board');
  assert.doesNotMatch(method, /table_rematch_votes/, 'no two-person vote gate');
  assert.doesNotMatch(method, /"FRIENDS","PLAYING"/, 'never auto-starts the next game');
});

/* ------------------------------------------------- 4. wiring & cache chain */
test('both shells are wired to the middle page and the shared chain is bumped', () => {
  assert.ok(table.includes("$('again').onclick=restartMatch;"));
  assert.ok(table.includes("localStart(false);screen='home';"));
  assert.ok(table.includes("await enter('QUICK');return;"));
  assert.ok(table.includes("'/api/table/rooms/'+originId+'/rematch'"));
  assert.ok(app.includes('function returnToModeScreen()'));
  assert.ok(app.includes("show('welcome')"));
  assert.ok(app.includes('returnToModeScreen();'));
  assert.ok(app.includes("if(friends)social.rematchFriends(roomId);"));
  assert.ok(app.includes("else social.openRoom('quick');"));
  assert.ok(app.includes("if(!onlineMode){start();return;}"));

  const chain = [
    'dist/app.js', 'dist/live-room-ui.js', 'dist/online-custody-ui.js',
    'dist/pool-result-preview.html', 'dist/table/index.html',
    'dist/table/pool-shell.js', 'dist/table/result-points.js', 'dist/table/table.js',
    'dist/index.html', 'dist/portal/index.html'
  ];
  for (const file of chain) {
    const text = read(file);
    assert.ok(text.includes('20261115-joincoin1'), `${file} uses the bumped key`);
    assert.ok(!text.includes('20261114-cardstable1'), `${file} has no stale key`);
  }
});

test('the behaviour is documented in the online-game management contract', () => {
  const doc = read('docs/ONLINE-GAME-MANAGEMENT.md');
  assert.match(doc, /再来一次按原模式重进/);
  assert.match(doc, /返回中间页/);
  assert.match(doc, /等待准备/);
});
