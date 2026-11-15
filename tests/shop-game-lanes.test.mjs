/* Connect Four is the ONE section that owns both 棋子 and 棋盘. Those eight
   cards must no longer interleave grade-by-grade: the section is split into
   two labelled lanes, all pieces first, then all boards. Each lane keeps the
   shared six-column grid, so a card never changes width or height, and the
   other ten sections keep their original single grid. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const points = read('dist/site-points.js');
const shop = read('dist/site-shop.js');
const css = read('dist/site-shop.css');
const page = read('dist/shop.html');
const KEY = '20261112-gamelanes1';

/* Render the REAL shop shell in a tiny DOM so the generated markup, not just
   the source array, is what gets asserted. */
function renderShop() {
  const store = new Map();
  const makeEl = () => ({
    className: '', innerHTML: '', textContent: '', dataset: {}, open: false,
    listeners: {}, children: [], all: [], attributes: {},
    style: {setProperty() {}, removeProperty() {}},
    classList: {toggle() {}, add() {}, remove() {}},
    setAttribute(k, v) {this.attributes[k] = v;},
    getAttribute(k) {return Object.hasOwn(this.attributes, k) ? this.attributes[k] : null;},
    hasAttribute(k) {return Object.hasOwn(this.attributes, k);},
    removeAttribute(k) {delete this.attributes[k];},
    append(child) {this.children.push(child);},
    addEventListener(type, fn) {(this.listeners[type] ??= []).push(fn);},
    querySelector() {return null;},
    querySelectorAll() {return this.all;},
    closest() {return null;},
    showModal() {this.open = true;},
    close() {this.open = false;}
  });
  const ids = {
    'shop-root': makeEl(), 'shop-wallet': makeEl(),
    'shop-current': makeEl(), 'shop-hangar-current': makeEl()
  };
  const html = makeEl();
  html.setAttribute('data-locale', 'zh');
  const document = {
    documentElement: html, body: makeEl(), readyState: 'complete',
    createElement: () => makeEl(),
    getElementById: id => ids[id] || null,
    querySelector: () => null,
    addEventListener() {}
  };
  const win = {addEventListener() {}, dispatchEvent() {}};
  const context = {
    window: win, document,
    localStorage: {getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, v)},
    CustomEvent: function (type, options) {this.type = type; this.detail = options?.detail;},
    setTimeout: () => 0, clearTimeout() {}, console
  };
  runInNewContext(points, context);
  runInNewContext(shop, context);
  return ids['shop-root'].innerHTML;
}

const sectionsOf = markup => [...markup.matchAll(/<section class="shop-section" data-kind="([a-z]+)">([\s\S]*?)<\/section>/g)]
  .map(([, kind, body]) => ({kind, body}));
const lanesOf = body => body.split(/<div class="shop-lane" data-lane="/).slice(1)
  .map(s => ({role: s.slice(0, s.indexOf('"')), body: s}));
const cardsOf = body => [...body.matchAll(/data-shop-id="([a-z0-9-]+)" data-rarity="(default|rare|epic|legend)"/g)]
  .map(([, id, grade]) => ({id, grade}));

const html = renderShop();
const sections = sectionsOf(html);
const four = sections.find(s => s.kind === 'four');
const lanes = four ? lanesOf(four.body) : [];
const gomoku = sections.find(s => s.kind === 'gomoku');
const gomokuLanes = gomoku ? lanesOf(gomoku.body) : [];
const xo = sections.find(s => s.kind === 'xo');
const xoLanes = xo ? lanesOf(xo.body) : [];

test('四子连珠 is split into exactly three labelled lanes: 棋子, 粉色棋子, 棋盘', () => {
  assert.ok(four, 'the Connect Four section exists');
  assert.deepEqual(lanes.map(l => l.role), ['piece', 'pink', 'board']);
  assert.match(lanes[0].body, /<div class="shop-lane-head"><h3>棋子<\/h3><small>[^<]*<\/small><\/div>/);
  assert.match(lanes[1].body, /<div class="shop-lane-head"><h3>粉色棋子<\/h3><small>[^<]*<\/small><\/div>/);
  assert.match(lanes[2].body, /<div class="shop-lane-head"><h3>棋盘<\/h3><small>[^<]*<\/small><\/div>/);
  assert.match(shop, /t\('Pieces','棋子'\)/);
  assert.match(shop, /t\('Pink pieces','粉色棋子'\)/);
  assert.match(shop, /t\('Board','棋盘'\)/);
  assert.equal((html.match(/class="shop-lane"/g) || []).length, 8,
    'Four keeps three lanes, Gomoku two, XO three');
});

test('五子棋 is split into two labelled lanes: 棋子 and 白色棋子', () => {
  assert.ok(gomoku, 'the Gomoku section exists');
  assert.deepEqual(gomokuLanes.map(l => l.role), ['piece', 'white']);
  assert.match(gomokuLanes[0].body, /<div class="shop-lane-head"><h3>棋子<\/h3><small>[^<]*<\/small><\/div>/);
  assert.match(gomokuLanes[1].body, /<div class="shop-lane-head"><h3>白色棋子<\/h3><small>[^<]*<\/small><\/div>/);
  assert.match(shop, /t\('White pieces','白色棋子'\)/);
  assert.deepEqual(cardsOf(gomokuLanes[0].body).map(c => c.id),
    ['gomoku-piece-default', 'gomoku-piece-neon', 'gomoku-piece-coral', 'gomoku-piece-jade', 'gomoku-piece-pearl', 'gomoku-piece-aurora']);
  assert.deepEqual(cardsOf(gomokuLanes[1].body).map(c => c.id),
    ['gomoku-white-piece-default', 'gomoku-white-piece-neon', 'gomoku-white-piece-coral', 'gomoku-white-piece-jade', 'gomoku-white-piece-pearl', 'gomoku-white-piece-aurora']);
});

test('井字棋 is split into three labelled lanes: X, O and 棋盘', () => {
  assert.ok(xo, 'the Tic-tac-toe section exists');
  assert.deepEqual(xoLanes.map(l => l.role), ['piece', 'o', 'board']);
  assert.match(xoLanes[1].body, /<div class="shop-lane-head"><h3>O 标志<\/h3><small>[^<]*<\/small><\/div>/);
  assert.match(shop, /t\('O marks','O 标志'\)/);
  assert.deepEqual(cardsOf(xoLanes[0].body).map(c => c.id),
    ['xo-piece-default', 'xo-piece-neon', 'xo-piece-coral', 'xo-piece-jade', 'xo-piece-pearl', 'xo-piece-aurora']);
  assert.deepEqual(cardsOf(xoLanes[1].body).map(c => c.id),
    ['xo-o-piece-default', 'xo-o-piece-neon', 'xo-o-piece-coral', 'xo-o-piece-jade', 'xo-o-piece-pearl', 'xo-o-piece-aurora']);
  assert.deepEqual(cardsOf(xoLanes[2].body).map(c => c.id),
    ['xo-board-default', 'xo-board-neon', 'xo-board-coral', 'xo-board-jade', 'xo-board-pearl', 'xo-board-aurora']);
});

test('each lane holds six cards of its own family, still ordered by grade', () => {
  assert.equal(lanes.length, 3);
  for (const lane of lanes) {
    assert.equal((lane.body.match(/<div class="shop-grid/g) || []).length, 1,
      'one shared six-column grid per lane');
    const cards = cardsOf(lane.body);
    assert.equal(cards.length, 6, '默认 + two Rare + two Epic + Legendary');
    assert.deepEqual(cards.map(c => c.grade), ['default', 'rare', 'rare', 'epic', 'epic', 'legend']);
  }
  const pieces = cardsOf(lanes[0].body).map(c => c.id);
  const pink = cardsOf(lanes[1].body).map(c => c.id);
  const boards = cardsOf(lanes[2].body).map(c => c.id);
  assert.deepEqual(pieces,
    ['four-piece-default', 'four-piece-neon', 'four-piece-coral', 'four-piece-jade', 'four-piece-pearl', 'four-piece-aurora']);
  assert.deepEqual(pink,
    ['four-pink-piece-default', 'four-pink-piece-blossom', 'four-pink-piece-heart', 'four-pink-piece-bow', 'four-pink-piece-diamond', 'four-pink-piece-candy']);
  assert.deepEqual(boards,
    ['four-board-default', 'four-board-neon', 'four-board-coral', 'four-board-jade', 'four-board-pearl', 'four-board-aurora']);
  assert.ok(!pieces.some(id => id.includes('-board-') || id.includes('-pink-')) &&
    pink.every(id => id.includes('-pink-')) &&
    !boards.some(id => id.includes('-piece-')),
    'the families never mix inside a lane');
});

test('the other ten sections keep one grid and no lane; totals are unchanged', () => {
  assert.deepEqual(sections.map(s => s.kind),
    ['plane', 'trail', 'cursor', 'avatar', 'four', 'gomoku', 'chess', 'xo', 'ball', 'cue', 'table']);
  assert.equal((html.match(/data-shop-id="/g) || []).length, 110, 'six white Gomoku + six O marks + six XO boards were added');
  for (const s of sections.filter(x => x.kind !== 'four' && x.kind !== 'gomoku' && x.kind !== 'xo')) {
    assert.ok(!s.body.includes('shop-lane'), `${s.kind} has no lane`);
    assert.equal((s.body.match(/<div class="shop-grid/g) || []).length, 1,
      `${s.kind} keeps its single grid`);
  }
});

test('lanes are headers only: the six-column grid and card size are untouched', () => {
  assert.match(css, /\.shop-grid\{display:grid;grid-template-columns:repeat\(6,minmax\(0,1fr\)\);gap:9px\}/);
  assert.match(css, /\.shop-lane-head\{[\s\S]{0,180}border-left:2px solid var\(--shop-lane-accent\)/);
  assert.match(css, /\.shop-lane\[data-lane="piece"\]\{--shop-lane-accent:#63b3ff\}/);
  assert.match(css, /\.shop-lane\[data-lane="board"\]\{--shop-lane-accent:#ffc861\}/);
  const laneRule = css.match(/\.shop-lane\{[^}]*\}/)?.[0] || '';
  assert.ok(laneRule && !/grid-template-columns|width:/.test(laneRule),
    'the lane never redefines the grid or narrows the cards');
  assert.ok(!/grid-column|grid-auto-flow|nth-child/.test(css),
    'no per-card placement hack');
});

test('the shop page loads the bumped CSS key', () => {
  assert.equal(points.match(/var VERSION='([^']+)'/)?.[1], KEY);
  assert.match(page, new RegExp('site-shop\\.css\\?v=' + KEY));
  assert.ok(!/20261112-hover501/.test(page), 'an older batch key is gone');
  const stale = [...page.matchAll(/\?v=(20261112-[a-z0-9]+)/g)].map(m => m[1]).filter(k => k !== KEY);
  assert.deepEqual(stale, [], 'no stale 20261112 batch key remains on the page');
});
