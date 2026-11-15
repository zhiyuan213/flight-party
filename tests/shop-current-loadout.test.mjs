import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const points = read('dist/site-points.js');
const shop = read('dist/site-shop.js');
const css = read('dist/site-shop.css');

/* Every equip slot in site-points.js: 4 site-wide, 9 board-game, 3 billiards.
   The hero strip must show ALL of them, not just the original four. */
const SLOTS = ['cursor', 'avatar', 'plane', 'trail',
  'fourPiece', 'fourPiecePink', 'fourBoard',
  'gomokuPiece', 'gomokuPieceWhite', 'chessBoard',
  'xoPiece', 'xoPieceO', 'xoBoard',
  'ball', 'cue', 'table'];
const BOARD_DEFAULT = ['four-piece-default', 'four-pink-piece-default', 'four-board-default',
  'gomoku-piece-default', 'gomoku-white-piece-default', 'chess-board-default',
  'xo-piece-default', 'xo-o-piece-default', 'xo-board-default'];
const BILLIARD_DEFAULT = ['ball-default', 'cue-default', 'table-default'];

/* Run both shipped scripts against one small DOM so paint() really writes the
   strip; no copy of the render logic is kept in the test. */
function sandbox(locale = 'zh') {
  const store = new Map(), winListeners = {}, styles = {};
  const makeEl = (tag = 'div') => {
    const nodes = {};
    return {
      tagName: tag, className: '', innerHTML: '', textContent: '', title: '', lang: '',
      dataset: {}, open: false, listeners: {}, children: [], all: [], nodes,
      attributes: {},
      style: {setProperty: (k, v) => {styles[k] = v;}, removeProperty: k => {delete styles[k];}},
      classList: {toggle() {}, add() {}, remove() {}},
      setAttribute(k, v) {this.attributes[k] = v;},
      getAttribute(k) {return Object.prototype.hasOwnProperty.call(this.attributes, k) ? this.attributes[k] : null;},
      hasAttribute(k) {return Object.prototype.hasOwnProperty.call(this.attributes, k);},
      removeAttribute(k) {delete this.attributes[k];},
      append(child) {this.children.push(child);},
      addEventListener(type, fn) {(this.listeners[type] ??= []).push(fn);},
      querySelector(sel) {return nodes[sel] || (nodes[sel] = makeEl('span'));},
      querySelectorAll() {return this.all;},
      closest() {return null;},
      showModal() {this.open = true;},
      close() {this.open = false; (this.listeners.close || []).forEach(fn => fn());}
    };
  };
  const html = makeEl('html');
  if (locale === 'zh') html.setAttribute('data-locale', 'zh');
  const body = makeEl('body');
  const ids = {
    'shop-root': makeEl('div'), 'shop-wallet': makeEl('div'),
    'shop-current': makeEl('div'), 'shop-hangar-current': makeEl('div')
  };
  const document = {
    documentElement: html, body, readyState: 'complete',
    createElement(tag) {return makeEl(tag);},
    getElementById(id) {return ids[id] || null;},
    querySelector() {return null;},
    addEventListener() {}
  };
  const win = {
    addEventListener(type, fn) {(winListeners[type] ??= []).push(fn);},
    dispatchEvent(event) {(winListeners[event.type] || []).forEach(fn => fn(event));}
  };
  const context = {
    window: win, document,
    localStorage: {getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, v)},
    CustomEvent: function (type) {this.type = type;},
    setTimeout: () => 0, clearTimeout: () => {}, console
  };
  runInNewContext(points, context);
  runInNewContext(shop, context);
  return {
    api: win.__joyflockShop,
    current: () => ids['shop-current'].innerHTML,
    buy: id => win.__joyflockShop.buy(id)
  };
}

const chipFor = (html, slot) => {
  const m = html.match(new RegExp(`<div class="shop-current-item" data-slot="${slot}"[\\s\\S]*?</div>`));
  assert.ok(m, `chip for ${slot} is rendered`);
  return m[0];
};

test('the loadout table declares all 16 equip slots exactly once', () => {
  const table = shop.slice(shop.indexOf('var LOADOUT_SLOTS=['), shop.indexOf('var LOADOUT_ART_VERSION='));
  const declared = [...table.matchAll(/\{slot:'([A-Za-z]+)'/g)].map(m => m[1]);
  assert.deepEqual(declared, SLOTS, 'one chip per equip slot, in shop order');
  assert.equal((table.match(/\{slot:/g) || []).length, 16);
  /* `slot:` (not `kind:`) keeps catalogue guards from counting these as goods. */
  assert.ok(!/kind:'/.test(table), 'loadout slots never masquerade as CATALOG products');
  assert.match(shop, /s\.equipped\[slot\.slot\]/);
  assert.match(shop, /if\(currentBox\)currentBox\.innerHTML=currentLoadoutHtml\(s\)/);
});

test('paint() renders 16 labelled chips with real equipped names and thumbnails', () => {
  const s = sandbox('zh');
  const html = s.current();
  assert.equal((html.match(/class="shop-current-item"/g) || []).length, 16);
  for (const slot of SLOTS) {
    const chip = chipFor(html, slot);
    assert.match(chip, /class="shop-current-slot"/, `${slot}: category label`);
    assert.match(chip, /class="shop-current-name"/, `${slot}: item name`);
  }
  assert.match(html, /class="shop-current-title">当前装配</);
  for (const name of ['默认光标', '开心笑脸', '默认蓝色飞机', '无拖尾',
    '默认棋子', '默认球组', '默认球杆', '默认桌球台']) {
    assert.ok(html.includes(name), `default name ${name} is shown`);
  }
  /* The first four slots keep the original markup (and FX hooks). */
  for (const cls of ['shop-current-cursor', 'shop-current-avatar',
    'shop-current-plane', 'shop-current-trail']) {
    assert.ok(html.includes(cls), `${cls} preserved`);
  }
  assert.match(html, /data-plane-current data-plane-style=/);
  assert.ok(html.includes('game-styles/four-piece-default.svg'));
  assert.ok(html.includes('billiards-v2/ball-default.svg'));
});

test('equipping a product updates only its own chip', () => {
  const s = sandbox('zh');
  assert.match(chipFor(s.current(), 'cursor'), /默认光标/);
  const before = chipFor(s.current(), 'ball');
  const result = s.buy('cursor-rainbow');
  assert.equal(result.ok, true);
  const html = s.current();
  assert.match(chipFor(html, 'cursor'), /彩虹光标/);
  assert.equal(chipFor(html, 'ball'), before, 'an unrelated slot is unchanged');
  assert.equal((html.match(/class="shop-current-item"/g) || []).length, 16,
    'equipping never duplicates or drops a chip');
});

test('a billiards and a board-game swap show the equipped theme thumbnail', () => {
  const s = sandbox('zh');
  s.buy('ball-neon');
  s.buy('four-board-neon');
  const html = s.current();
  assert.match(chipFor(html, 'ball'), /冰川珐琅球组/);
  assert.match(chipFor(html, 'ball'), /billiards-v2\/ball-neon\.svg/);
  assert.match(chipFor(html, 'fourBoard'), /冰川铝板/);
  assert.match(chipFor(html, 'fourBoard'), /game-styles\/four-board-neon\.svg/);
});

test('the English strip uses English category labels and item names', () => {
  const html = sandbox('en').current();
  assert.match(html, /class="shop-current-title">Equipped now</);
  assert.match(chipFor(html, 'cursor'), /class="shop-current-slot">Pointer</);
  assert.match(chipFor(html, 'cursor'), /Default pointer/);
  assert.match(chipFor(html, 'table'), /Billiards · cloth/);
  assert.equal((html.match(/class="shop-current-item"/g) || []).length, 16);
});

test('shop.html requests the rebuilt strip assets, not a stale cached pair', () => {
  const page = read('dist/shop.html');
  /* The frozen 20261112-gamelanes1 key is hard-coded by many other guards, so
     a second `&d=` parameter busts the browser cache without touching it. */
  assert.match(page, /site-shop\.css\?v=20261112-gamelanes1&d=20261115-loadout1/);
  assert.match(page, /site-shop\.js\?v=20261112-gamelanes1&d=20261115-loadout1/);
});

test('every shipped default thumbnail exists and the strip has chip styling', () => {
  for (const id of BOARD_DEFAULT) {
    assert.ok(existsSync(resolve(root, 'dist/assets/shop/game-styles', `${id}.svg`)), `${id}.svg`);
  }
  for (const id of BILLIARD_DEFAULT) {
    assert.ok(existsSync(resolve(root, 'dist/assets/shop/billiards-v2', `${id}.svg`)), `${id}.svg`);
  }
  assert.match(css, /\.shop-current\{[\s\S]{0,180}flex-wrap:wrap/);
  assert.match(css, /\.shop-current-item\{[\s\S]{0,260}border-radius:9px/);
  assert.match(css, /\.shop-current-svg\{width:24px;height:24px/);
  assert.match(css, /\.shop-current-slot\{/);
  assert.match(css, /\.shop-current-title\{/);
});
