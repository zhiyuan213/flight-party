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
const openBody = shop.slice(shop.indexOf('function open(id)'), shop.indexOf('function confirm()'));
const catalog = [...shop.matchAll(/\{id:'([a-z0-9-]+)',kind:'(cursor|avatar|plane|trail)'/g)]
  .map(([, id, kind]) => ({id, kind}));

/* Run BOTH shipped scripts against one small DOM, so clicking a real card
   exercises the shipped open()/confirm()/toast() rather than a copy of them. */
function sandbox(locale = 'zh') {
  const store = new Map(), winListeners = {}, styles = {};
  let dialogEl = null;

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
      closest(sel) {return sel === '[data-shop-id]' && this.dataset.shopId ? this : null;},
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
  const rootEl = ids['shop-root'];
  rootEl.all = catalog.map(({id}) => {
    const card = makeEl('button');
    card.dataset.shopId = id;
    return card;
  });

  const document = {
    documentElement: html, body, readyState: 'complete',
    createElement(tag) {const el = makeEl(tag); if (tag === 'dialog') dialogEl = el; return el;},
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
    CustomEvent: function (type, options) {this.type = type; this.detail = options && options.detail;},
    setTimeout: () => 0, clearTimeout: () => {}, console
  };
  runInNewContext(points, context);
  runInNewContext(shop, context);

  return {
    api: win.__joyflockShop, points: win.__joyflockPoints, dialog: dialogEl, styles,
    toast: () => body.children.find(el => el.className === 'jp-toast')?.textContent ?? null,
    clickCard(id) {
      const card = rootEl.all.find(el => el.dataset.shopId === id);
      assert.ok(card, `${id} is in the catalogue`);
      for (const fn of rootEl.listeners.click || []) fn({target: card});
    },
    confirm() {
      const target = {closest: sel => sel === '[data-shop-confirm]' ? {} : null};
      for (const fn of dialogEl.listeners.click || []) fn({target});
    },
    setLocale(next) {
      if (next === 'zh') html.setAttribute('data-locale', 'zh');
      else html.removeAttribute('data-locale');
    }
  };
}

test('ownership is checked before the VIP perk and never opens the redeem dialog', () => {
  assert.match(openBody, /if\(s\.owned\[id\]\)\{/);
  assert.ok(openBody.indexOf('if(s.owned[id]){') < openBody.indexOf('if(freeFor(id)){'),
    'an owned item is handled before the membership branch');
  const owned = openBody.slice(openBody.indexOf('if(s.owned[id]){'), openBody.indexOf('if(freeFor(id)){'));
  assert.match(owned, /if\(dialog&&dialog\.open\)\{dialog\.close\(\);selected=null;\}/,
    'a lingering dialog is dismissed');
  assert.match(owned, /API\.buy\(id\)/, 'the real equip path runs');
  assert.match(owned, /API\.toast\(replacedToast\(item\.kind\)\)/, 'the success notice is emitted');
  assert.match(owned, /return;/, 'the branch never falls through to the dialog');
  assert.ok(!/showModal|renderDialog/.test(owned), 'no confirmation is shown for an owned item');
  assert.ok(!/Already owned: this is your original pointer|已经拥有：这是你的经典光标/.test(shop),
    'the old "already owned" status toast is gone');
  assert.ok(openBody.indexOf('dialog.showModal()') > openBody.indexOf('if(freeFor(id)){'),
    'the dialog still belongs to the unowned, paying path');
});

test('one success notice per cosmetic category, bilingual, shared with the dialog fallback', () => {
  assert.match(shop, /function replacedToast\(kind\)/);
  assert.match(shop, /kind==='plane'\?t\('Aircraft replaced successfully','成功替换飞行器'\)/);
  assert.match(shop, /kind==='avatar'\?t\('Avatar replaced successfully','成功替换头像'\)/);
  assert.match(shop, /t\('Cursor replaced successfully','成功替换光标'\)/);
  assert.match(shop, /:replacedToast\(item\.kind\)\)/, 'the dialog fallback repeats the same notice');
  assert.ok(!/Equipped the item you own|已替换为已拥有的道具/.test(shop));
});

test('a redeemed cursor re-equips in one click, with no dialog and no extra charge', () => {
  const s = sandbox('zh');
  assert.equal(s.points.get().total, 10000);

  s.clickCard('cursor-rainbow');
  assert.equal(s.dialog.open, true, 'an unowned item still opens the redeem dialog');
  s.confirm();
  assert.equal(s.points.get().equipped.cursor, 'cursor-rainbow');
  assert.equal(s.points.get().total, 7000, 'the Epic cursor costs 3,000');
  assert.equal(s.toast(), '已扣除 3,000 Joy Coin 并替换成功。');
  assert.equal(s.dialog.open, false);

  s.clickCard('cursor-star');                       // owned starter, not equipped
  assert.equal(s.dialog.open, false, 'owned = no confirmation');
  assert.equal(s.points.get().equipped.cursor, 'cursor-star', 'the click really replaces it');
  assert.equal(s.points.get().total, 7000, 'switching owned items is free');
  assert.equal(s.toast(), '成功替换光标');

  s.clickCard('cursor-rainbow');                    // owned and previously redeemed
  assert.equal(s.dialog.open, false);
  assert.equal(s.points.get().equipped.cursor, 'cursor-rainbow');
  assert.equal(s.toast(), '成功替换光标');
  assert.equal(s.points.get().total, 7000);

  s.clickCard('cursor-rainbow');                    // already equipped: still a short notice, no dialog
  assert.equal(s.dialog.open, false);
  assert.equal(s.toast(), '成功替换光标');
  assert.equal(s.points.get().total, 7000);
});

test('owned aircraft and avatars report their own category, and buying still costs points', () => {
  const s = sandbox('zh');
  s.clickCard('plane-classic');                     // owned + equipped starter aircraft
  assert.equal(s.dialog.open, false);
  assert.equal(s.toast(), '成功替换飞行器');
  assert.equal(s.points.get().total, 10000);

  s.clickCard('plane-cloud2d');                     // unowned Rare aircraft
  assert.equal(s.dialog.open, true, 'unowned aircraft still ask before spending');
  s.confirm();
  assert.equal(s.points.get().equipped.plane, 'plane-cloud2d');
  assert.equal(s.points.get().total, 9000);
  s.clickCard('plane-classic');
  assert.equal(s.dialog.open, false);
  assert.equal(s.points.get().equipped.plane, 'plane-classic');
  assert.equal(s.toast(), '成功替换飞行器');
  assert.equal(s.points.get().total, 9000);

  s.clickCard('avatar-cloudy');
  assert.equal(s.dialog.open, true);
  s.confirm();
  assert.equal(s.points.get().total, 8000);
  s.clickCard('avatar-cloudy');
  assert.equal(s.dialog.open, false);
  assert.equal(s.toast(), '成功替换头像');
  assert.equal(s.points.get().total, 8000);
});

test('English visitors get the translated notices; VIP one-click equip is unaffected', () => {
  const s = sandbox('en');
  s.clickCard('plane-classic');
  assert.equal(s.toast(), 'Aircraft replaced successfully');
  s.clickCard('cursor-star');
  assert.equal(s.toast(), 'Cursor replaced successfully');
  s.setLocale('zh');
  s.clickCard('cursor-star');
  assert.equal(s.toast(), '成功替换光标');

  const vip = sandbox('zh');
  vip.points.set({vip: true, live: true});
  vip.clickCard('cursor-rainbow');                  // Epic perk, not owned
  assert.equal(vip.dialog.open, false);
  assert.equal(vip.points.get().equipped.cursor, 'cursor-rainbow');
  assert.equal(vip.points.get().total, 10000);
  assert.match(vip.toast(), /VIP 免费/);
  vip.clickCard('cursor-ember');                   // Rare: even VIP pays
  assert.equal(vip.dialog.open, true);
  vip.confirm();
  assert.equal(vip.points.get().total, 9000);
  vip.clickCard('cursor-ember');                   // now owned
  assert.equal(vip.dialog.open, false);
  assert.equal(vip.toast(), '成功替换光标', 'ownership wins over the membership label');
  assert.equal(vip.points.get().total, 9000);
});
