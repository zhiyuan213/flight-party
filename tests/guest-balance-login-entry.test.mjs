import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {runInNewContext} from 'node:vm';

const read = p => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const points = read('dist/site-points.js');
const shop = read('dist/site-shop.js');
const nativeGame = read('dist/portal/native-game.js');
const generator = read('scripts/build-native-games.mjs');
const pages = ['dist/portal/native-flight.html', 'dist/portal/native-table.html'].map(p => ({p, html: read(p)}));

function htmlFiles(dir = 'dist') {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...htmlFiles(p));
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

test('a guest sees a zero balance while the local wallet stays untouched', () => {
  assert.match(points, /function accountName\(\)/);
  assert.match(points, /function shownTotal\(\)\{[\s\S]*?accountName\(\)\?state\.total:0/);
  assert.match(points, /display:shownTotal\(\)/, 'the shop reads the display value through get()');
  assert.match(points, /'joyflock:account-changed',render/, 'sign-in/out repaints the pill');
  assert.match(shop, /fmt\(s\.display===undefined\?s\.total:s\.display\)/, 'shop balance uses the display value');
  assert.match(shop, /var short=Math\.max\(0,price-s\.total\)/, 'purchases still use the real wallet');
});

test('every shipped shell loads the guest-zero wallet build', () => {
  const shells = htmlFiles().filter(p => read(p).includes('site-points.js?v='));
  assert.ok(shells.length >= 10, 'the wallet is shared by every shell');
  for (const p of shells) {
    assert.match(read(p), /site-points\.js\?v=[^"']*&z=20261117-guestzero1/, `${p} ships the new wallet`);
  }
  assert.match(read('dist/shop.html'), /site-shop\.js\?v=[^"']*&z=20261117-guestzero1/);
});

test('native detail pages use the shared account entry instead of the inner game dialog', () => {
  assert.doesNotMatch(nativeGame, /account\.textContent=name/, 'no text mirroring');
  assert.doesNotMatch(nativeGame, /document\.getElementById\('account-open'\)\?\.click\(\)/, 'no click forwarding');
  assert.match(nativeGame, /joyflock:auth-changed/, 'the inner game still refreshes its identity');
  assert.match(generator, /site-account\.js\?v=20261112-gamelanes1&p=20261116-nospace1/);
  assert.match(generator, /native-game\.js\?v=20261117-chrome1/);
  for (const {p, html} of pages) {
    assert.match(html, /site-account\.js\?v=20261112-gamelanes1&p=20261116-nospace1/, `${p} loads the shared account script`);
    const button = html.match(/<button id="chrome-account"[^>]*>[\s\S]*?<\/button>/)?.[0] || '';
    assert.match(button, /<span class="lang-en">Sign in<\/span><span class="lang-cn">登录<\/span>/,
      `${p} starts from the same label as the portal`);
    assert.doesNotMatch(button, /登录 \/ 注册|Sign in \/ Register/, `${p} no longer mirrors the pool dialog label`);
    assert.ok(html.indexOf('id="chrome-account"') < html.indexOf('id="account-open"'),
      `${p} keeps the shared header before the hidden game header`);
  }
});

/* Run the shipped wallet against a DOM that has a real browser location, so
   the guest/signed-in branches are verified as rendered behaviour. */
function wallet(account) {
  const store = new Map();
  if (account !== undefined) store.set('joyflock.accountName', account);
  store.set('joyflock.demoGrant.v1', '1'); // a returning browser already claimed the one-off demo top-up
  store.set('joyflock.shop.v1', JSON.stringify({v: 3, points: 100720, owned: {}, equipped: {}}));
  const listeners = {};
  const makeEl = (tag = 'div') => ({
    tagName: tag, className: '', innerHTML: '', textContent: '', id: '', src: '', alt: '',
    dataset: {}, attributes: {}, children: [], all: [], listeners: {},
    style: {setProperty() {}, removeProperty() {}},
    classList: {add() {}, remove() {}, toggle() {}, contains() {return false;}},
    setAttribute(k, v) {this.attributes[k] = v;},
    getAttribute(k) {return Object.hasOwn(this.attributes, k) ? this.attributes[k] : null;},
    hasAttribute(k) {return Object.hasOwn(this.attributes, k);},
    removeAttribute(k) {delete this.attributes[k];},
    append(child) {this.children.push(child);},
    addEventListener(type, fn) {(this.listeners[type] ??= []).push(fn);},
    querySelector(sel) {
      if (sel === '[data-jp=amount]') return this.children.find(c => c.dataset.jp === 'amount');
      if (sel === '[data-jp=label]') return this.children.find(c => c.dataset.jp === 'label');
      return makeEl('span');
    },
    querySelectorAll() {return this.all;}
  });
  const html = makeEl('html');
  const body = makeEl('body'), host = makeEl('div');
  const document = {
    documentElement: html, body, readyState: 'complete', cookie: '',
    createElement: makeEl,
    getElementById() {return null;},
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
    location: {hostname: 'joyflock.com'},
    CustomEvent: function (type) {this.type = type;},
    setTimeout: () => 0, clearTimeout() {}, console
  };
  runInNewContext(points, context);
  const pill = host.children.find(c => c.id === 'jp-pill');
  const amount = () => pill.querySelector('[data-jp=amount]').textContent;
  return {pill, amount, api: win.__joyflockPoints, store, win,
    announce: () => win.dispatchEvent({type: 'joyflock:account-changed', detail: null})};
}

test('guest balance renders 0, signing in reveals the same stored wallet', () => {
  const guest = wallet();
  assert.equal(guest.amount(), '0', 'no account means no visible coins');
  assert.equal(guest.pill.dataset.coin, '0 Joy Coins');
  assert.equal(guest.pill.getAttribute('aria-label'), 'Joy Coin balance: 0');
  assert.equal(guest.api.get().total, 100720, 'the local wallet is never erased');
  assert.equal(guest.api.get().display, 0);

  guest.store.set('joyflock.accountName', 'zhiyuanC');
  guest.announce();
  assert.equal(guest.amount(), '100,720', 'the account-changed event repaints the pill');
  assert.equal(guest.api.get().display, 100720);

  guest.store.set('joyflock.accountName', '0');
  guest.announce();
  assert.equal(guest.amount(), '0', 'signing out hides the balance again');
  assert.equal(guest.api.get().total, 100720, 'signing out keeps the local wallet');
});

test('a visitor with a cached account sees the balance on the first frame', () => {
  const signed = wallet('zhiyuanC');
  assert.equal(signed.amount(), '100,720');
  assert.equal(signed.api.get().display, 100720);
});
