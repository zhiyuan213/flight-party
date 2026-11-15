/* Manual "准备" in a two-human table friends room.
   The server owns the votes (V22 table_room_ready) and publishes them as
   View.ready; the waiting dialog lights the button when the room is full,
   turns it into "已准备" after the click, paints a tag on BOTH portraits and
   holds the dialog for 200ms after the second vote before showing the board. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const table = read('dist/table/table.js');
const css = read('dist/table/room-dialog.css');
const html = read('dist/table/index.html');
const service = read('backend/src/main/java/com/flightparty/table/TableService.java');
const javaTest = read('backend/src/test/java/com/flightparty/table/TableCosmeticsServiceTest.java');

const helpers = table.slice(table.indexOf('function roomIsFull('), table.indexOf('function paintNoScore('));

function harness(lang = 'zh') {
  const btn = {
    hidden: false, disabled: false, textContent: '', title: '', dataset: {},
    removeAttribute(name) {if (name === 'data-ready') delete this.dataset.ready;}
  };
  const nodes = {'ready-room': btn};
  const ctx = vm.createContext({
    $: id => nodes[id] || null, room: null, readyBusy: false, playStartDelay: false,
    playStartTimer: null, tableLang: () => lang, clearTimeout: () => {}, setTimeout: () => 1
  });
  vm.runInContext(helpers, ctx);
  return {btn, ctx, paint: () => vm.runInContext('paintReadyButton()', ctx)};
}
const room = (over = {}) => ({
  id: 'r1', origin: 'FRIENDS', phase: 'WAITING', you: 0,
  bots: [false, false], ready: [false, false], ...over
});

test('the waiting dialog has a dedicated ready button, before the invite action', () => {
  assert.match(html, /<div id="room-tools" hidden><button id="ready-room" hidden>准备<\/button><button id="share">/);
  assert.match(html, /room-dialog\.css\?v=20261115-joincoin1/);
  assert.match(html, /src="table\.js\?v=20261115-joincoin1[^"]*"/);
});

test('the button has three visual states and the seat tag reuses the shop green', () => {
  assert.match(css, /#ready-room\[data-ready="available"\]\{[^}]*linear-gradient/);
  assert.match(css, /#ready-room\[data-ready="done"\]\{[^}]*#2f9e6d/);
  assert.match(css, /\.seat-ready-tag\{[^}]*position:absolute;top:-5px;right:-5px/);
  assert.match(css, /\.seat\.is-ready \.avatar-shell\{[^}]*#2f9e6d/);
  assert.match(css, /#room-tools button:disabled\{[^}]*opacity:\.6/);
});

test('the frontend votes manually, paints both tags and holds the start for 200ms', () => {
  assert.match(table, /\$\('ready-room'\)\.onclick=async\(\)=>\{/);
  assert.match(table, /request\('\/api\/table\/rooms\/'\+room\.id\+'\/ready',\{\}\)/);
  assert.match(table, /room\.ready\[i\]===true\)/);
  assert.match(table, /tag\.className='seat-ready-tag'/);
  assert.match(table, /playStartTimer=setTimeout\(\(\)=>\{playStartTimer=null;playStartDelay=false;/);
  assert.match(table, /\},200\);/);
  assert.match(table, /screen=playStartDelay\?'waiting':screenForRoom\(value\)/);
  assert.match(table, /双方已准备，即将开始…/);
  assert.match(table, /paintReadyButton\(\);paintFourEffects/);
  // No more silent auto-vote: a friends room must not start on its own.
  assert.match(table, /function autoReadyFriendsRoom\(value\)\{\/\* no-op/);
  assert.ok(!table.includes("request('/api/table/rooms/'+value.id+'/ready',{})"));
});

test('the backend publishes one authoritative ready flag per seat', () => {
  assert.match(service, /public record View\([^)]*List<Boolean> ready,long turnClockUntil\) \{\}/);
  assert.match(service, /select principal_id from table_room_ready where room_id=:id/);
  assert.match(service, /List<Boolean> ready=r\.seats\.stream\(\)\.map\(s->votes\.contains\(s\.principal\(\)\)\)\.toList\(\)/);
  assert.match(javaTest, /readyVotesArePublishedPerSeatAndStartTheRoomOnTheSecondVote/);
  assert.match(javaTest, /assertEquals\(List\.of\(true,false\),first\.ready\(\)/);
});

test('a room with an empty seat keeps the button dim and disabled', () => {
  const h = harness();
  h.ctx.room = room({bots: [false], ready: [false]});
  h.paint();
  assert.equal(h.btn.hidden, false, 'the button is present while waiting');
  assert.equal(h.btn.dataset.ready, 'waiting');
  assert.equal(h.btn.disabled, true, 'no vote while the friend has not joined');
  assert.equal(h.btn.textContent, '准备');
  assert.match(h.btn.title, /等待好友加入后可准备/);
});

test('a full two-human room lights the button up', () => {
  for (const ready of [[false, false], [false, true]]) {
    const h = harness();
    h.ctx.room = room({ready});
    h.paint();
    assert.equal(h.btn.dataset.ready, 'available');
    assert.equal(h.btn.disabled, false);
    assert.equal(h.btn.textContent, '准备');
  }
});

test('casting a vote removes the highlight and changes the label to 已准备', () => {
  const h = harness();
  h.ctx.room = room({ready: [true, false]});
  h.paint();
  assert.equal(h.btn.dataset.ready, 'done', 'highlight is gone');
  assert.equal(h.btn.disabled, true);
  assert.equal(h.btn.textContent, '已准备');
  assert.equal(h.btn.title, '');
});

test('the 200ms hold keeps both ready tags visible, then the button retires', () => {
  const h = harness();
  h.ctx.room = room({phase: 'PLAYING', ready: [true, true]});
  h.ctx.playStartDelay = true;
  h.paint();
  assert.equal(h.btn.hidden, false);
  assert.equal(h.btn.dataset.ready, 'done');
  assert.equal(h.btn.textContent, '已准备');

  h.ctx.playStartDelay = false;
  h.paint();
  assert.equal(h.btn.hidden, true);
  assert.equal(h.btn.dataset.ready, undefined);
});

test('quick match and local games never show the ready button', () => {
  for (const over of [{origin: 'QUICK'}, null]) {
    const h = harness();
    h.ctx.room = over ? room(over) : null;
    h.paint();
    assert.equal(h.btn.hidden, true);
  }
});

test('bot-filled seats are never treated as a full human room, and English copy works', () => {
  const h = harness('en');
  h.ctx.room = room({bots: [false, true]});
  h.paint();
  assert.equal(h.btn.dataset.ready, 'waiting');
  assert.equal(vm.runInContext('roomIsFull(room)', h.ctx), false);

  const h2 = harness('en');
  h2.ctx.room = room({ready: [true, true]});
  h2.paint();
  assert.equal(h2.btn.textContent, 'Ready');
  assert.equal(vm.runInContext('myReady(room)', h2.ctx), true);
});
