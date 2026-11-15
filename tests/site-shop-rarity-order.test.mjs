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
const version = points.match(/var VERSION='([^']+)'/)?.[1];

const rank = {default: -1, rare: 0, epic: 1, legend: 2};
const rarities = [...points.matchAll(/'([a-z0-9-]+)':'(default|rare|epic|legend)'/g)]
  .reduce((acc, [, id, key]) => (acc[id] = key, acc), {});
const catalog = [...shop.matchAll(/\{id:'([A-Za-z0-9-]+)',kind:'([A-Za-z0-9-]+)'/g)]
  .map(([, id, kind]) => ({id, kind, grade: rarities[id]}));
const GAME_KINDS = ['fourPiece', 'fourPiecePink', 'fourBoard', 'gomokuPiece', 'gomokuPieceWhite', 'gomokuBoard',
  'chessPiece', 'chessBoard', 'xoPiece', 'xoBoard'];

/* Build the REAL shop shell in a tiny DOM, then read the generated card HTML.
   This checks what a visitor actually sees, not just the source array. */
function shellSandbox() {
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
  const body = makeEl();
  const document = {
    documentElement: html, body, readyState: 'complete',
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
  return {html: ids['shop-root'].innerHTML, exported: win.__joyflockShopCatalog};
}

function sections(markup) {
  return [...markup.matchAll(/<section class="shop-section" data-kind="([a-z]+)">([\s\S]*?)<\/section>/g)]
    .map(([, kind, body]) => ({
      kind,
      cards: [...body.matchAll(/data-shop-id="([a-z0-9-]+)" data-rarity="(default|rare|epic|legend)"/g)]
        .map(([, id, grade]) => ({id, grade}))
    }));
}

function monotone(cards) {
  return cards.every((c, i) => i === 0 || rank[cards[i - 1].grade] <= rank[c.grade]);
}

test('the catalogue source itself is grouped 默认 → Rare → Epic → Legendary in every category', () => {
  assert.equal(catalog.length, 110,
    '12 cursors + 16 avatars + 6 planes + 4 trails + 54 active game products + 18 billiard products');
  for (const {id, grade} of catalog) assert.ok(grade, `${id} has a grade`);
  for (const kind of ['plane', 'trail', 'cursor', 'avatar', 'ball', 'cue', 'table', ...GAME_KINDS]) {
    const rows = catalog.filter(x => x.kind === kind);
    assert.deepEqual(rows.map(x => x.grade),
      rows.map(x => x.grade).sort((a, b) => rank[a] - rank[b]),
      `${kind} cards are grouped by grade`);
  }
  assert.deepEqual(catalog.filter(x => x.kind === 'cursor').map(x => x.id), [
    'cursor-star', 'cursor-ember', 'cursor-leaf', 'cursor-bubble', 'cursor-shell',
    'cursor-rainbow', 'cursor-frost', 'cursor-heart', 'cursor-butterfly',
    'cursor-amethyst', 'cursor-comet', 'cursor-nova'
  ], 'Rare / Epic / Legendary cursors, original order kept within each grade');
  assert.deepEqual(catalog.filter(x => x.kind === 'avatar').map(x => x.id), [
    'avatar-starling', 'avatar-cloudy', 'avatar-owl', 'avatar-bear',
    'avatar-bob', 'avatar-ponytail',
    'avatar-rocket', 'avatar-luna', 'avatar-fox', 'avatar-bot',
    'avatar-buns', 'avatar-waves',
    'avatar-octo', 'avatar-crown', 'avatar-blossom', 'avatar-beret'
  ], 'free Happy Smile first, then Rare / Epic / Legendary avatars');
});

test('renderSection() uses one stable grade sort, so new products file themselves', () => {
  assert.match(shop, /var GRADE_ORDER=\{default:-1,rare:0,epic:1,legend:2\}/);
  assert.match(shop, /function graded\(kinds\)\{/);
  assert.match(shop, /CATALOG\.filter\(function\(x\)\{return kinds\.indexOf\(x\.kind\)>=0;\}\)/,
    'a per-game section grades all of its kinds through ONE stable sorter');
  assert.match(shop, /var items=graded\(kinds\);/);
  assert.match(shop, /function gridHtml\(modifier,items\)\{/,
    'every lane reuses the same six-column grid helper');
  assert.match(shop, /kinds\.length>1\s*\n?\s*\?kinds\.map\(function\(k\)\{/,
    'only a section owning BOTH roles is split into lanes');
  assert.match(shop, /var d=\(GRADE_ORDER\[rarityOf\(a\.item\.id\)\]\|\|0\)-\(GRADE_ORDER\[rarityOf\(b\.item\.id\)\]\|\|0\);/);
  assert.match(shop, /if\(d\)return d;/);
  assert.match(shop, /return pa-pb\|\|a\.i-b\.i/,
    'inside one grade pieces lead boards, and the catalogue index breaks ties');
  assert.ok(shop.includes("renderSection(g,g==='four'?['fourPiece','fourPiecePink','fourBoard']:g==='gomoku'?['gomokuPiece','gomokuPieceWhite']:g==='xo'?['xoPiece','xoPieceO','xoBoard']:[g+(g==='chess'?'Board':'Piece')],gameHead(g))"));
  assert.match(shop, /section\('plane'\)\+section\('trail'\)\+section\('cursor'\)\+section\('avatar'\)\+\s*GAME_KEYS\.map\(gameSection\)\.join\(''\)\+\s*section\('ball'\)\+section\('cue'\)\+section\('table'\)/,
    'all ELEVEN sections are present, in catalogue order');
});

test('the rendered shop HTML really lists cards in grade order, with starters first', () => {
  const {html, exported} = shellSandbox();
  const groups = sections(html);
  assert.deepEqual(groups.map(g => g.kind),
    ['plane', 'trail', 'cursor', 'avatar', 'four', 'gomoku', 'chess', 'xo', 'ball', 'cue', 'table']);
  assert.deepEqual(groups.map(g => g.cards.length), [6, 4, 12, 16, 18, 12, 6, 18, 6, 6, 6],
    'Four offers blue, pink and boards; Gomoku black+white; XO X+O+board');
  const laneGrades6 = ['default', 'rare', 'rare', 'epic', 'epic', 'legend'];
  for (const g of groups.filter(x => ['four', 'gomoku', 'chess', 'xo'].includes(x.kind))) {
    assert.deepEqual(g.cards.map(c => c.grade),
      g.kind === 'four' ? [...laneGrades6, ...laneGrades6, ...laneGrades6] : g.kind === 'gomoku' ? [...laneGrades6, ...laneGrades6] : g.kind === 'xo' ? [...laneGrades6, ...laneGrades6, ...laneGrades6] : laneGrades6,
      `${g.kind}: every lane keeps 默认 → Rare → Epic → Legendary`);
    if (g.kind === 'four') assert.deepEqual(g.cards.map(c => c.id),
      ['default','neon','coral','jade','pearl','aurora'].map(t => 'four-piece-' + t)
        .concat(['default','blossom','heart','bow','diamond','candy'].map(t => 'four-pink-piece-' + t))
        .concat(['default','neon','coral','jade','pearl','aurora'].map(t => 'four-board-' + t)),
      'the 棋子 lane is complete before the 粉色棋子 and 棋盘 lanes begin');
    else if (g.kind === 'gomoku') assert.deepEqual(g.cards.map(c => c.id),
      ['default','neon','coral','jade','pearl','aurora'].map(t => 'gomoku-piece-' + t)
        .concat(['default','neon','coral','jade','pearl','aurora'].map(t => 'gomoku-white-piece-' + t)),
      'the black 棋子 lane is complete before the white 棋子 lane begins');
    else if (g.kind === 'xo') assert.deepEqual(g.cards.map(c => c.id),
      ['default','neon','coral','jade','pearl','aurora'].map(t => 'xo-piece-' + t)
        .concat(['default','neon','coral','jade','pearl','aurora'].map(t => 'xo-o-piece-' + t))
        .concat(['default','neon','coral','jade','pearl','aurora'].map(t => 'xo-board-' + t)),
      'the X lane is complete before the O and board lanes begin');
    else assert.ok(g.cards.every(c => c.id.includes(g.kind === 'chess' ? '-board-' : '-piece-')));
  }
  for (const g of groups) {
    if (g.kind === 'four') {
      assert.ok(monotone(g.cards.slice(0, 6)) && monotone(g.cards.slice(6, 12)) && monotone(g.cards.slice(12)),
        '四子连珠 restarts the grade order at each lane boundary');
    } else if (g.kind === 'gomoku') {
      assert.ok(monotone(g.cards.slice(0, 6)) && monotone(g.cards.slice(6, 12)),
        '五子棋 restarts the grade order at the black/white lane boundary');
    } else if (g.kind === 'xo') {
      assert.ok(monotone(g.cards.slice(0, 6)) && monotone(g.cards.slice(6, 12)) && monotone(g.cards.slice(12)),
        '井字棋 restarts the grade order at each lane boundary');
    } else {
      assert.ok(monotone(g.cards), `${g.kind} cards never drop back to a lower grade`);
    }
    assert.deepEqual([...new Set(g.cards.map(c => c.grade))].sort((a, b) => rank[a] - rank[b]),
      [...new Set(g.cards.map(c => c.grade))], `${g.kind} grades are contiguous`);
    assert.equal(rarities[g.cards[0].id], g.cards[0].grade, `${g.kind} first card grade matches the wallet`);
    assert.equal(exported.rarityOf(g.cards[0].id), g.cards[0].grade, 'shipped API agrees with the badge');
  }
  assert.deepEqual(groups.map(g => g.cards[0].id),
    ['plane-classic', 'trail-none', 'cursor-star', 'avatar-starling',
      'four-piece-default', 'gomoku-piece-default', 'chess-board-default', 'xo-piece-default',
      'ball-default', 'cue-default', 'table-default'],
    'every free 默认 baseline leads its own section, including Happy Smile');
  assert.deepEqual([...new Set(groups[0].cards.map(c => c.grade))], ['default', 'rare', 'epic', 'legend']);
  assert.deepEqual(groups[1].cards.map(c => c.grade), ['default', 'rare', 'epic', 'legend'],
    'no trail + one effect per grade, in order');
  assert.deepEqual(groups[2].cards.map(c => c.grade),
    ['default', 'rare', 'rare', 'rare', 'rare', 'epic', 'epic', 'epic', 'epic', 'legend', 'legend', 'legend']);
  assert.deepEqual(groups[3].cards.map(c => c.grade),
    ['default', 'rare', 'rare', 'rare', 'rare', 'rare', 'epic', 'epic', 'epic', 'epic', 'epic', 'epic', 'legend', 'legend', 'legend', 'legend']);
  assert.equal(exported.version, version, 'the exported catalogue shares the cache key');
  assert.equal(exported.items.length, 110);
});

test('prices, perks and the six-column grid are untouched by the re-order', () => {
  assert.match(points, /var PRICE=1000/);
  assert.match(points, /var LEGEND_PRICE=5000/);
  assert.match(points, /rare:\{price:PRICE,perk:''\},\s*epic:\{price:EPIC_PRICE,perk:'vip'\},\s*legend:\{price:LEGEND_PRICE,perk:'annual'\}/);
  assert.match(read('dist/site-shop.css'), /\.shop-grid\{display:grid;grid-template-columns:repeat\(6,minmax\(0,1fr\)\);gap:9px\}/);
  assert.equal(version, '20261112-gamelanes1');
});
