/* 2026-11-14 · Custody refinement: hosted = no countdown, idle online seat =
   hosted, reconnect / pointer activity = instant reclaim.

   Behaviour of the shared presence helper is executed in a VM snippet taken
   straight from dist/table/table.js; the remaining tests guard the wiring on
   both shells and on the Java services so the two halves cannot drift. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {needsPresenceSignal,turnClockVisible} from '../dist/online-custody.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const table = read('dist/table/table.js');
const app = read('dist/app.js');
const policy = read('backend/src/main/java/com/flightparty/online/CustodyPolicy.java');
const service = read('backend/src/main/java/com/flightparty/table/TableService.java');
const tableController = read('backend/src/main/java/com/flightparty/table/TableController.java');
const roomController = read('backend/src/main/java/com/flightparty/room/RoomController.java');
const roomRules = read('backend/src/main/java/com/flightparty/room/RoomRules.java');
const roomPresence = read('backend/src/main/java/com/flightparty/room/RoomPresence.java');
const roomRolls = read('backend/src/main/java/com/flightparty/room/RoomRollService.java');
const roomSocket = read('backend/src/main/java/com/flightparty/realtime/RoomSocket.java');
const redisStore = read('backend/src/main/java/com/flightparty/room/RedisRoomStore.java');
const doc = read('docs/ONLINE-GAME-MANAGEMENT.md');

/* ------------------------------------------------------- presence helper */
const snippet = table.slice(table.indexOf('let activityBusy=false'), table.indexOf('/* A 1s repaint'));
function harness(over = {}) {
  const calls = [], applied = [];
  let clock = 1_700_000_000_000;
  const ctx = vm.createContext({
    room: {id: 'r1', phase: 'PLAYING', managed: true, you: 0,
      custody: ['active', 'active'], version: 3, serverNow: 0, deadline: 0, ...over},
    needsPresenceSignal,
    request: async (path, body) => {calls.push({path, body});return {id: 'r1', version: 4, you: 0, custody: ['active', 'active']};},
    apply: view => applied.push(view),
    document: {addEventListener() {}},
    Date: {now: () => clock}
  });
  vm.runInContext(snippet, ctx);
  return {ctx, calls, applied, tick: ms => {clock += ms;}};
}

test('active pointer events are throttled and read-only on the server', async () => {
  const h = harness();
  await vm.runInContext("reportActivity('pointer')", h.ctx);
  assert.equal(h.calls.length, 1,
    'the first pointer event is reported so a hosted state arriving afterwards cannot be missed');
  assert.equal(h.calls[0].body.reason, 'pointer');
  await vm.runInContext("reportActivity('pointer')", h.ctx);
  assert.equal(h.calls.length, 1, 'an active seat reports at most once every 5s');
  h.tick(5100);
  await vm.runInContext("reportActivity('pointer')", h.ctx);
  assert.equal(h.calls.length, 2);
  assert.match(service, /An active seat is READ-ONLY/,
    'wiggling the mouse must never restart the 30s idle clock');
});

test('a hosted seat is reclaimed by any pointer event, once per 1.2s', async () => {
  const h = harness({custody: ['hosted', 'active']});
  await vm.runInContext("reportActivity('pointer')", h.ctx);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].path, '/api/table/rooms/r1/activity');
  assert.equal(h.calls[0].body.reason, 'pointer');
  assert.equal(h.applied.length, 1, 'the reclaimed view is painted immediately');
  await vm.runInContext("reportActivity('pointer')", h.ctx);
  assert.equal(h.calls.length, 1, 'throttled so a moving mouse cannot spam the API');
  h.tick(1300);
  await vm.runInContext("reportActivity('pointer')", h.ctx);
  assert.equal(h.calls.length, 2);
});

test('a fresh page load signals presence even when the seat looks active', async () => {
  const h = harness();
  await vm.runInContext("reportActivity('resume')", h.ctx);
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].body.reason, 'resume');
  await vm.runInContext("reportActivity('resume')", h.ctx);
  assert.equal(h.calls.length, 2, 'resume is never throttled');
});

test('presence is only for managed playing rooms', async () => {
  for (const over of [{phase: 'WAITING'}, {managed: false}, {phase: 'OVER'}]) {
    const h = harness({...over, custody: ['hosted', 'active']});
    await vm.runInContext("reportActivity('pointer')", h.ctx);
    assert.deepEqual(h.calls, []);
  }
});

/* ------------------------------------------- flight turn-clock visibility */
const clockSnippet = app.slice(app.indexOf('function turnClockHidden(){'), app.indexOf('function beginTurn(){'));
function clockHarness(states, turn, over = {}) {
  const ctx = vm.createContext({
    onlineMode: true, game: {turn, phase: 'roll'}, prefs: {lang: 'zh'},
    turnClockVisible, flightCustody: index => ({state: states[index] || 'active'}),
    ...over
  });
  vm.runInContext(clockSnippet, ctx);
  return vm.runInContext('turnClockHidden()', ctx);
}

test('the flight clock is hidden for the current hosted or bot turn', () => {
  assert.equal(clockHarness(['active', 'hosted'], 1), true, 'opponent hosted on turn');
  assert.equal(clockHarness(['active', 'bot'], 1), true, 'native bot on turn');
  assert.equal(clockHarness(['hosted', 'active'], 0), true, 'my own hosted turn');
  assert.equal(clockHarness(['hosted', 'active'], 1), false,
    'I am hosted but the opponent is on turn — their 30s clock stays visible');
  assert.equal(clockHarness(['active', 'grace'], 1), false, 'grace is still a real human turn');
  assert.equal(clockHarness(['active', 'active'], 0), false);
});

test('the flight clock never hides outside a live online match', () => {
  assert.equal(clockHarness(['active', 'hosted'], 1, {onlineMode: false}), false);
  assert.equal(clockHarness(['active', 'hosted'], 1, {game: {turn: 1, phase: 'over'}}), false);
});

/* ------------------------------------------------------------- wiring */
test('both shells expose an explicit activity endpoint and a resume call', () => {
  assert.match(tableController, /@PostMapping\("\/rooms\/\{id\}\/activity"\)/);
  assert.match(tableController, /"resume"\.equals\(input\.reason\(\)\)/);
  assert.match(service, /@Transactional public View activity\(UUID id,boolean resume,HttpServletRequest request\)/);
  assert.match(roomController, /@PostMapping\("\/\{id\}\/activity"\)/);
  assert.match(table, /reportActivity\('resume'\)/);
  assert.match(app, /reportFlightActivity\('resume'\)/);
  assert.match(app, /\/api\/rooms\/'\+id\+'\/activity/);
  assert.match(table, /\/api\/table\/rooms\/'\+id\+'\/activity/);
  for (const type of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart']) {
    assert.ok(table.includes(`'${type}'`), 'table pointer listener: ' + type);
    assert.ok(app.includes(`'${type}'`), 'flight pointer listener: ' + type);
  }
});

test('polling is no longer presence on either backend', () => {
  assert.match(service, /A polling snapshot is NOT presence/);
  assert.match(service, /r=tick\(bind\(r,p\)\)/);
  assert.match(service, /private Room reclaim\(Room r,UUID p\)/);
  assert.match(roomPresence, /pong only keeps the connection lease alive/);
  assert.doesNotMatch(roomPresence, /rooms\.mutate\(room,r->RoomRules\.resumeCustody\(r,principal,now\)\)/);
  assert.match(roomSocket, /presence\.resume\(room\.get\(\)\.room\(\),principal,Instant\.now\(\)\)/);
});

test('an expired idle turn hosts the seat on both room systems', () => {
  assert.match(policy, /hostOnIdle\(String resolved, long turnDeadline, long now\)/);
  assert.match(service, /CustodyPolicy\.hostOnIdle\(t\.resolved\(now\),r\.deadline\(\),now\)/);
  assert.match(roomRules, /public static Room hostIdle\(Room room,int seatIndex,long now\)/);
  assert.match(roomRolls, /RoomRules\.hostIdle\(r,game\.turn\(\),now\)/);
  assert.match(redisStore, /CustodyPolicy\.IDLE_MS/);
  assert.match(roomRolls, /CustodyPolicy\.IDLE_MS,CustodyPolicy\.IDLE_MS/);
  assert.doesNotMatch(roomRolls, /\+15000 end/);
});

test('hosted turns never re-arm the 30s clock and hide its display', () => {
  assert.match(policy, /public static boolean turnClockVisible\(String resolved\)/);
  assert.match(policy, /HOSTED_PACE_MS = 1_200L/);
  assert.match(service, /CustodyPolicy\.nextDeadline\(nextState,nextGrace,now\)/);
  assert.match(service, /long turnClockUntil=CustodyPolicy\.turnClockVisible\(clockState\)\?r\.deadline:0L/);
  assert.match(table, /Number\.isFinite\(room\.turnClockUntil\)/);
  assert.match(table, /turnClockVisible\(Array\.isArray\(room\.custody\)/);
  assert.match(app, /needsPresenceSignal,turnClockVisible\} from '\.\/online-custody\.js/);
  assert.match(app, /function turnClockHidden\(\)/);
  assert.match(app, /flightCustody\(Number\(game\.turn\),prefs\.lang\)\.state/);
  assert.match(app, /return !turnClockVisible\(state\)/);
  assert.match(app, /\$\('timer'\)\.textContent=hidden\?'':paused/);
});

test('the management document records the new presence rules', () => {
  for (const phrase of ['空闲', '鼠标', '不再显示', '托管中', 'activity', '重连'])
    assert.ok(doc.includes(phrase), 'missing documented rule: ' + phrase);
});
