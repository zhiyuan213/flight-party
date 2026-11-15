/* 2026-11-14 · Result trophies must not pulse during online snapshots.

   An online room keeps publishing snapshots after the match is final (easy bot
   still finishing a paced move, reconnect grace, etc). `updateResult()` used to
   call `replaceChildren()` on EVERY snapshot, which restarted result-art-in
   (scale .84 -> 1) on both trophy <img> nodes. Local computer matches only
   render once, so the bug was invisible there.

   The fix builds the two cards once per displayed result state. This test runs
   the REAL production function in a VM with DOM stubs and counts rebuilds. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const shellSrc = read('../dist/table/pool-shell.js');
const css = read('../dist/table/result-points.css');
const KEY = '20261115-joincoin1';

/* Extract the whole function: it ends at the first column-0 closing brace. */
const start = shellSrc.indexOf('function updateResult(options) {');
assert.ok(start >= 0, 'updateResult exists');
const fnSrc = shellSrc.slice(start, shellSrc.indexOf('\n}', start) + 2);
assert.match(fnSrc, /shell\.resultPlayers\.replaceChildren/);
assert.match(fnSrc, /resultFrame=requestAnimationFrame\(reveal\)/);

function fakeEl() {
  return {
    dataset: {}, style: {}, children: [], hidden: false, open: false,
    textContent: '', title: '', src: '', alt: '', decoding: '', type: '',
    disabled: false, onclick: undefined, replaceCount: 0,
    classList: {toggle() {}, add() {}, remove() {}, contains() {return false;}},
    setAttribute(k, v) {this[k] = v;},
    getAttribute(k) {return Object.hasOwn(this, k) ? this[k] : null;},
    append(...kids) {this.children.push(...kids);},
    appendChild(k) {this.children.push(k); return k;},
    replaceChildren(...kids) {this.children = kids; this.replaceCount++;},
    querySelector() {return null;},
    querySelectorAll() {return [];},
    getAnimations() {return [];},
    focus() {}, close() {this.open = false;}, showModal() {this.open = true;}
  };
}

function harness() {
  const shell = {
    strip: fakeEl(), resultDialog: fakeEl(), resultEmblem: fakeEl(),
    resultTitle: fakeEl(), resultDescription: fakeEl(), resultNote: fakeEl(),
    resultReopen: fakeEl(), resultPlayers: fakeEl(), resultIsPool: false,
    confetti: fakeEl()
  };
  const nodes = {};
  const $ = id => (nodes[id] ??= fakeEl());
  const document = {
    body: {dataset: {screen: 'play'}, classList: {contains: () => false}, append() {}},
    documentElement: {lang: 'zh-CN'},
    hidden: false, querySelector: () => null
  };
  const ctx = {
    shell, $, document, element: () => fakeEl(),
    resultDetails: o => ({winner: o.board.winner, kind: o.board.winner === 1 ? 'win' : 'loss', title: 'T', description: 'D'}),
    poolSeatSummary: () => ({score: 4, legacy: false}),
    pointsTicker: {hide() {}, reveal() {}},
    clearConfetti() {}, celebrateResult() {}, openResult() {}, cancelAnimationFrame() {},
    setResultEmblem() {},
    /* Do not execute the reveal callback: only the synchronous card build
       matters here. A truthy id also models the pending preview frame. */
    requestAnimationFrame: () => 1,
    gridResult: false, gridGame: '', current: {board: {over: true}},
    resultKey: null, resultFrame: 0, resultShown: false,
    confettiTimer: null, rematchBusy: false, resultPlayersKey: null,
    location: {search: ''}, URLSearchParams
  };
  const options = (over = {}) => ({
    room: {id: 'room-42'}, me: null, local: false, computer: false,
    names: ['zhiyuanC', 'Guest'], generation: 1, mySeat: 1, scores: null,
    board: {over: true, moves: 101, winner: 2, ...over}
  });
  const run = o => {
    ctx.__options = o;
    runInNewContext(fnSrc + '\nupdateResult(__options);', ctx);
    return ctx;
  };
  const arts = () => shell.resultPlayers.children.flatMap(row =>
    row.children.filter(k => k.className === 'pool-result-player-art' ||
      (k.src || '').includes('/assets/result/')));
  return {ctx, shell, run, options, arts, document};
}

test('the production function still declares the idempotency guard', () => {
  assert.match(shellSrc, /let resultPlayersKey = null;/);
  assert.match(shellSrc, /resultPlayersKey=null/,
    'both the not-ended path and the new-result path clear the signature');
  assert.equal((shellSrc.match(/resultPlayersKey=null/g) || []).length, 2);
  assert.match(shellSrc, /if\(resultPlayersKey!==playersKey\)\{\s*resultPlayersKey=playersKey;\s*shell\.resultPlayers\.replaceChildren/);
  assert.match(shellSrc, /if\(resultShown\)art\.style\.animation='none'/,
    'a late rebuild on an open dialog cannot replay the entrance animation');
  /* The animation itself is kept — first reveal should still animate. */
  assert.match(css, /animation:result-art-in \.45s/);
  assert.match(css, /@keyframes result-art-in/);
});

test('repeated online snapshots of one finished match rebuild the cards exactly once', () => {
  const h = harness();
  const o = h.options();
  h.run(o);
  assert.equal(h.shell.resultPlayers.replaceCount, 1, 'first snapshot builds the cards');
  assert.equal(h.shell.resultPlayers.children.length, 2);
  /* Model the dialog being visible while snapshots keep arriving. */
  h.ctx.resultShown = true; h.ctx.resultFrame = 0;
  for (let i = 0; i < 6; i++) h.run(o);
  assert.equal(h.shell.resultPlayers.replaceCount, 1,
    'six more snapshots must NOT replace the trophy nodes');
  assert.equal(h.shell.resultPlayers.children.length, 2);
  assert.equal(h.ctx.resultKey, 'room-42:101:2');
});

test('a genuinely new result rebuilds the cards and follows the new winner', () => {
  const h = harness();
  h.run(h.options());
  h.ctx.resultShown = true; h.ctx.resultFrame = 0;
  h.run(h.options({moves: 102, winner: 1}));
  assert.equal(h.shell.resultPlayers.replaceCount, 2);
  const outcomes = h.shell.resultPlayers.children.map(row => row.dataset.outcome);
  assert.deepEqual(outcomes, ['winner', 'loser'], 'gold cup follows the result, not the seat');
  assert.equal(h.ctx.resultKey, 'room-42:102:1');
});

test('a locale switch rebuilds once, but late rebuilds suppress the replay', () => {
  const h = harness();
  const o = h.options();
  h.run(o);
  h.ctx.resultShown = true; h.ctx.resultFrame = 0;
  h.document.documentElement.lang = 'en';
  h.run(o);
  assert.equal(h.shell.resultPlayers.replaceCount, 2, 'signature includes the locale');
  const imgs = h.shell.resultPlayers.children.flatMap(row => row.children).filter(k => k.src);
  assert.equal(imgs.length, 2);
  for (const img of imgs) assert.equal(img.style.animation, 'none',
    'no second scale animation on an already visible dialog');
});

test('the shell and its consumers share the bumped cache key', () => {
  assert.match(shellSrc, new RegExp(`\\?v=${KEY}`));
  for (const p of ['../dist/table/table.js', '../dist/table/index.html', '../dist/app.js'])
    assert.ok(read(p).includes(KEY), `${p} uses the bumped key`);
});
