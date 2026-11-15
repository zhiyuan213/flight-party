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

/* Ship both scripts into one small DOM so the dialog is verified as rendered
   markup, not just as a source grep. Same pattern as site-joycoin.test.mjs,
   with the catalogue widened to the billiard / board-game cosmetics. */
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
    querySelector(sel) {return nodes[sel] || (nodes[sel] = makeEl('span'));},
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
  const catalog = [...shop.matchAll(/\{id:'([a-z0-9-]+)',kind:'([a-z0-9-]+)'/g)];
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
  return {
    get dialog() {return dialogEl;},
    clickCard(id) {
      const card = rootEl.all.find(el => el.dataset.shopId === id);
      assert.ok(card, `${id} is in the catalogue`);
      for (const fn of rootEl.listeners.click || []) fn({target: card});
    },
    confirm() {
      const target = {closest: sel => sel === '[data-shop-confirm]' ? {} : null};
      for (const fn of dialogEl.listeners.click || []) fn({target});
    },
    cancel() {
      const target = {closest: sel => sel === '[data-shop-cancel]' ? {} : null};
      for (const fn of dialogEl.listeners.click || []) fn({target});
    }
  };
}

/* ---------------------------------------------------------------- rendered */
test('the redeem dialog prints ONE route note, under the price, in both languages', () => {
  for (const [locale, note] of [['zh', '传说：年度 VIP 免费替换'], ['en', 'Legendary: Annual VIP equips for free']]) {
    const s = sandbox(locale);
    s.clickCard('cue-aurora');
    const html = s.dialog.innerHTML;
    assert.equal(s.dialog.open, true, `${locale}: dialog opens for a non-member`);
    assert.equal((html.match(/class="shop-buy-vip-note"/g) || []).length, 1,
      `${locale}: exactly one explanation`);
    assert.ok(!html.includes('shop-buy-rarity'), `${locale}: the gold box in the art column is gone`);
    assert.ok(html.includes(note), `${locale}: the short grade sentence is shown`);
    assert.ok(!html.includes('VIP members equip directly') && !html.includes('年度 VIP 会员无需'),
      `${locale}: the second, near-identical sentence is not rendered`);
    const option = html.indexOf('shop-pay-option');
    const noteAt = html.indexOf('shop-buy-vip-note');
    const actions = html.indexOf('shop-buy-actions');
    assert.ok(option >= 0 && noteAt > option && actions > noteAt,
      `${locale}: price -> note -> action group`);
    assert.ok(html.indexOf('data-shop-confirm') > actions && html.indexOf('data-shop-cancel') > actions,
      `${locale}: CTA and Cancel live inside the action group`);
    assert.match(html, /5,000 Joy Coin 兑换并替换|Redeem for 5,000 Joy Coin/);
  }
});

test('the art column shows only the product, centred, with no note pinned to its bottom', () => {
  const s = sandbox();
  s.clickCard('cue-aurora');
  const html = s.dialog.innerHTML;
  const art = html.slice(html.indexOf('class="shop-buy-art"'), html.indexOf('class="shop-buy-pay"'));
  assert.match(art, /黑曜镶金球杆/);
  assert.match(art, /黑曜漆面、紫晶拼花与精细金属嵌线/);
  assert.ok(!art.includes('shop-buy-vip-note') && !art.includes('shop-buy-rarity'),
    'no gold rule box remains in the product column');
  assert.match(css, /\.shop-buy-art\{[\s\S]*?justify-content:center/,
    'the product group is vertically centred in the reserved height');
});

test('the dialog still confirms and cancels through delegated clicks', () => {
  const s = sandbox();
  s.clickCard('cue-aurora');
  assert.equal(s.dialog.open, true);
  s.cancel();
  assert.equal(s.dialog.open, false, 'Cancel still closes');
  s.clickCard('cue-aurora');
  assert.equal(s.dialog.open, true);
  s.confirm();
  assert.equal(s.dialog.open, false, 'Confirm still buys and closes');
});

/* ----------------------------------------------------------------- styles */
test('the note is quiet helper text and Chinese copy does not leave an orphan line', () => {
  const rule = css.match(/\.shop-buy-vip-note\{([\s\S]*?)\}/)?.[1] || '';
  assert.ok(rule, 'the note rule survives (older tests assert its selector)');
  assert.match(rule, /color:var\(--jp-muted\)/);
  assert.match(rule, /font-weight:600/);
  assert.match(rule, /text-align:left/);
  assert.match(rule, /text-wrap:balance/, 'two balanced lines instead of a "换。" orphan');
  assert.ok(!rule.includes('#ffd479'), 'no loud gold helper text');
});

test('information stays on top while CTA, short-funds hint and Cancel form one bottom group', () => {
  const actions = css.match(/\.shop-buy-actions\{([\s\S]*?)\}/)?.[1] || '';
  assert.match(actions, /margin-top:auto/);
  assert.match(actions, /display:flex;flex-direction:column/);
  assert.ok(!actions.includes('border-top'), 'whitespace groups the actions, no extra divider rule');
  assert.match(css, /\.shop-buy-short\{[\s\S]*?text-align:center/);
  assert.match(css, /@media\(max-width:520px\)\{[\s\S]*?\.shop-buy-actions\{margin-top:0/,
    'stacked columns do not push actions to a nonexistent bottom');
  assert.match(css, /\.shop-buy-body\{[\s\S]*?grid-template-columns:minmax\(0,1fr\) minmax\(0,1\.05fr\)/,
    'the two desktop columns are unchanged');
});

/* ------------------------------------------------------------ copy + chain */
test('both bilingual route strings and the shared cache key are preserved', () => {
  assert.match(shop, /var routeNote=gradeNote\|\|vipNote/);
  assert.match(shop, /Epic: VIP and Annual VIP equip for free/);
  assert.match(shop, /传说：年度 VIP 免费替换/);
  assert.match(shop, /VIP members equip directly, with no '\+COIN\+' spent/);
  assert.match(shop, /VIP 会员无需 '\+COIN\+'，可直接替换/);
  /* A trailing &d=... busts the browser cache without bumping the frozen
     shared key; it is NOT part of the key, so exclude it when extracting. */
  const cssKey = page.match(/site-shop\.css\?v=([^"'&]+)/)?.[1];
  const jsKey = page.match(/site-shop\.js\?v=([^"'&]+)/)?.[1];
  assert.ok(cssKey && jsKey && cssKey === jsKey, 'one shared cache key');
  assert.equal(cssKey, '20261112-gamelanes1', 'no bump: bumping breaks three tests and 20 hard-coded refs');
});
