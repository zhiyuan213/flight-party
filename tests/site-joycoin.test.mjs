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
const css = read('dist/site-points.css');
const page = read('dist/shop.html');
const version = points.match(/var VERSION='([^']+)'/)?.[1];
const shells = ['dist/portal/index.html', 'dist/membership.html', 'dist/terms.html',
  'dist/privacy.html', 'dist/contact.html', 'dist/shop.html'];

/* Run BOTH shipped scripts against one small DOM that has a real header pill
   host, so the name is verified as rendered behaviour, not a source grep. */
function sandbox(locale = 'zh') {
  const store = new Map(), listeners = {}, nodes = {};
  let dialogEl = null;
  const makeEl = (tag = 'div') => ({
    tagName: tag, className: '', innerHTML: '', textContent: '', src: '', alt: '', id: '',
    dataset: {}, attributes: {}, children: [], all: [], listeners: {}, open: false,
    style: {setProperty() {}, removeProperty() {}},
    classList: {toggle() {}, add() {}, remove() {}},
    setAttribute(k, v) {this.attributes[k] = v;},
    getAttribute(k) {return Object.hasOwn(this.attributes, k) ? this.attributes[k] : null;},
    hasAttribute(k) {return Object.hasOwn(this.attributes, k);},
    removeAttribute(k) {delete this.attributes[k];},
    append(child) {this.children.push(child);},
    addEventListener(type, fn) {(this.listeners[type] ??= []).push(fn);},
    querySelector(sel) {
      if (sel === '[data-jp=amount]') return this.children.find(c => c.dataset.jp === 'amount');
      if (sel === '[data-jp=label]') return this.children.find(c => c.dataset.jp === 'label');
      return nodes[sel] || (nodes[sel] = makeEl('span'));
    },
    querySelectorAll() {return this.all;},
    closest(sel) {return sel === '[data-shop-id]' && this.dataset.shopId ? this : null;},
    showModal() {this.open = true;},
    close() {this.open = false; (this.listeners.close || []).forEach(fn => fn());}
  });
  const html = makeEl('html');
  if (locale === 'zh') html.setAttribute('data-locale', 'zh');
  const body = makeEl('body'), host = makeEl('div');
  const ids = {
    'shop-root': makeEl('div'), 'shop-wallet': makeEl('div'),
    'shop-current': makeEl('div'), 'shop-hangar-current': makeEl('div')
  };
  const rootEl = ids['shop-root'];
  const catalog = [...shop.matchAll(/\{id:'([a-z0-9-]+)',kind:'(cursor|avatar|plane|trail)'/g)];
  rootEl.all = catalog.map(([, id]) => {
    const card = makeEl('button');
    card.dataset.shopId = id;
    return card;
  });
  const document = {
    documentElement: html, body, readyState: 'complete',
    createElement(tag) {const el = makeEl(tag); if (tag === 'dialog') dialogEl = el; return el;},
    getElementById(id) {return ids[id] || null;},
    querySelector(sel) {return sel === '.topbar .top-actions' ? host : null;},
    addEventListener() {}
  };
  const win = {
    addEventListener(type, fn) {(listeners[type] ??= []).push(fn);},
    dispatchEvent(event) {(listeners[event.type] || []).forEach(fn => fn(event));}
  };
  const context = {
    window: win, document,
    localStorage: {getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, v)},
    CustomEvent: function (type, options) {this.type = type; this.detail = options?.detail;},
    setTimeout: () => 0, clearTimeout() {}, console
  };
  runInNewContext(points, context);
  runInNewContext(shop, context);
  const pill = host.children.find(c => c.id === 'jp-pill');
  return {
    points: win.__joyflockPoints, shop: win.__joyflockShop, pill,
    root: rootEl, wallet: ids['shop-wallet'], dialog: dialogEl,
    toast: () => body.children.find(el => el.className === 'jp-toast')?.textContent ?? null,
    clickCard(id) {
      const card = rootEl.all.find(el => el.dataset.shopId === id);
      assert.ok(card, `${id} is in the catalogue`);
      for (const fn of rootEl.listeners.click || []) fn({target: card});
    },
    confirm() {
      const target = {closest: sel => sel === '[data-shop-confirm]' ? {} : null};
      for (const fn of dialogEl.listeners.click || []) fn({target});
    }
  };
}

test('one official name, exported by the wallet and consumed by the shop', () => {
  assert.match(points, /var CURRENCY='Joy Coin';/);
  assert.match(points, /window\.__joyflockPoints=\{\s*version:VERSION,currency:CURRENCY,/);
  assert.match(points, /window\.__joyflockShop=\{\s*version:VERSION,currency:CURRENCY,/);
  assert.match(shop, /var COIN=API\.currency\|\|'Joy Coin'/, 'the shop reads the wallet name');
  assert.equal((points.match(/Joy Coin/g) || []).length >= 1, true);
  const s = sandbox();
  assert.equal(s.points.currency, 'Joy Coin');
  assert.equal(s.shop.currency, 'Joy Coin');
  assert.ok(!/积分/.test(shop), 'no legacy currency word survives in shop copy');
  assert.ok(!/积分商城|Points shop/.test(page));
  assert.ok(!/积分商城|Points shop/.test(shells.map(read).join('\n')));
});

test('the compact header pill publishes the name in a tooltip, label and accessible name', () => {
  const zh = sandbox('zh'), en = sandbox('en');
  for (const s of [zh, en]) {
    assert.ok(s.pill, 'the wallet pill is built');
    assert.equal(s.pill.dataset.coin, '10,000 Joy Coins',
      'hover spells out the current balance in the plural currency name');
    assert.equal(s.pill.querySelector('[data-jp=amount]').textContent, '10,000');
    assert.equal(s.pill.querySelector('[data-jp=label]').textContent, 'Joy Coin');
  }
  assert.equal(zh.pill.getAttribute('aria-label'), 'Joy Coin 余额：10,000');
  assert.equal(en.pill.getAttribute('aria-label'), 'Joy Coin balance: 10,000');
  zh.points.set({total:9000});
  assert.equal(zh.pill.dataset.coin, '9,000 Joy Coins', 'the hover text follows the live balance');
  assert.match(css, /\.jp-pill\{[^}]*position:relative/, 'the tooltip is positioned against the pill');
  assert.match(css, /\.jp-pill\{[^}]*z-index:60/,
    'the hover transform creates a stacking context, so the pill itself must sit above the shop wallet');
  assert.match(css, /html body>\.topbar\{z-index:3\}/,
    'the header is lifted above the same-z-index shop page so the tooltip is visible');
  assert.match(css, /\.jp-pill\[data-coin\]::after\{[\s\S]*?content:attr\(data-coin\)/);
  assert.match(css, /\.jp-pill:hover\[data-coin\]::after,\.jp-pill:focus-visible\[data-coin\]::after/);
  assert.match(css, /prefers-reduced-motion:reduce[\s\S]*?\.jp-pill\[data-coin\]::after/);
  assert.match(css, /\.topbar \.top-actions \.jp-pill \.jp-label\{display:none\}/,
    'the pill keeps its compact reserved width');
});

test('shop copy, dialog and receipt all quote Joy Coin in both languages', () => {
  const zh = sandbox('zh');
  assert.match(zh.root.innerHTML, /Joy Coin 商城/);
  assert.match(zh.root.innerHTML, /唯一货币 Joy Coin（✦ 星标）/);
  assert.match(zh.wallet.innerHTML, /Joy Coin 余额/);
  assert.ok(!/积分/.test(zh.root.innerHTML), 'no legacy currency word in the shop shell');
  assert.ok(!/积分/.test(zh.wallet.innerHTML));

  zh.clickCard('cursor-ember');
  assert.equal(zh.dialog.open, true);
  assert.match(zh.dialog.innerHTML, /以 1,000 Joy Coin 兑换并替换/);
  assert.match(zh.dialog.innerHTML, /Joy Coin/);
  assert.ok(!/积分/.test(zh.dialog.innerHTML));
  zh.confirm();
  assert.equal(zh.toast(), '已扣除 1,000 Joy Coin 并替换成功。');
  assert.equal(zh.points.get().total, 9000);

  const en = sandbox('en');
  assert.match(en.root.innerHTML, /Joy Coin Shop/);
  assert.match(en.wallet.innerHTML, /Joy Coin balance/);
  en.clickCard('cursor-ember');
  assert.match(en.dialog.innerHTML, /Redeem for 1,000 Joy Coin/);
  en.confirm();
  assert.equal(en.toast(), 'Redeemed for 1,000 Joy Coin and equipped.');
});

test('page titles and top note keep the shop name; the footer shop link is gone', () => {
  assert.match(page, /<title>Joy Coin Shop — JoyFlock<\/title>/);
  assert.match(page, /'Joy Coin 商城 — JoyFlock':'Joy Coin Shop — JoyFlock'/);
  assert.match(page, /One currency: Joy Coin\.<\/span><span class="lang-cn">Joy Coin，装扮全站。<\/span>/);
  for (const p of shells) {
    const text = read(p);
    assert.doesNotMatch(text, /lang-en">Joy Coin Shop<\/span><span class="lang-cn">Joy Coin 商城<\/span>/,
      `${p}: the footer no longer repeats the shop link`);
    assert.match(text, /href="\/shop\.html"/, `${p}: the top nav still links to the shop`);
  }
});

test('every user-facing 积分 / points label is now the single Joy Coins currency', () => {
  assert.match(read('dist/table/index.html'), /月胜率榜/);
  assert.match(read('dist/privacy.html'), /Joy Coins 和局数/);
  assert.match(read('dist/table/table.js'), /我的战绩：0 Joy Coins · 0 局/);
  assert.match(read('dist/table/intro-boot.js'), /我的战绩：0 Joy Coins · 0 局/);
  assert.doesNotMatch(read('dist/table/index.html'), /积分/);
  assert.doesNotMatch(read('dist/privacy.html'), /积分/);
});

test('the whole site shares the bumped cache key', () => {
  assert.equal(version, '20261112-gamelanes1');
  for (const p of ['dist/shop.html', 'dist/site-shop.js', 'dist/site-points.js', 'dist/site-plane-fx.js',
    'dist/site-trail-fx.js', 'dist/app.js', 'dist/portal/index.html', 'dist/index.html', 'dist/table/index.html',
    'dist/table/arcade.html', 'dist/membership.html', 'dist/terms.html', 'dist/privacy.html', 'dist/contact.html'])
    assert.ok(read(p).includes(version), `${p} uses the new key`);
  for (const p of ['dist/site-shop.js', 'dist/site-points.js', 'dist/site-plane-fx.js', 'dist/site-trail-fx.js'])
    assert.equal(read(p).match(/var VERSION='([^']+)'/)?.[1], version);
  assert.ok(!/20261112-raritysort1/.test(read('dist/shop.html')), 'the previous key is gone');
});
