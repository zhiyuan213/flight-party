import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const exists = p => existsSync(resolve(root, p));
const js = read('dist/site-shop.js');
const css = read('dist/site-shop.css');
const page = read('dist/shop.html');
const points = read('dist/site-points.js');
const version = points.match(/var VERSION='([^']+)'/)?.[1];
const entries = [...js.matchAll(/\{id:'([a-z-]+)',kind:'(cursor|avatar)',en:'([^']+)',cn:'([^']+)'/g)]
  .map(([, id, kind, en, cn]) => ({id, kind, en, cn}));
/* Use the shipped resolver so a leftover legacy SVG cannot mask a missing
   generated avatar. Defer mount: this check only needs the published API. */
const assetWindow = {};
runInNewContext(points, {
  window: assetWindow,
  document: {readyState:'loading', addEventListener() {}},
  localStorage: {getItem() {return null;}, setItem() {}},
  setTimeout, clearTimeout, console
});

test('twelve pointers and sixteen expression and hairstyle avatars ship their runtime artwork', () => {
  assert.equal(entries.length, 28, '28 products in these two categories');
  assert.equal(entries.filter(e => e.kind === 'cursor').length, 12, 'default plus eleven purchasable cursors');
  assert.equal(entries.filter(e => e.kind === 'avatar').length, 16, '10 expressions plus 6 hairstyles');
  const defaultAvatar=assetWindow.__joyflockShop.defaults.avatar;
  assert.equal(defaultAvatar, 'avatar-starling');
  assert.equal(entries.find(e=>e.kind==='avatar').id, defaultAvatar, 'Happy Smile leads the avatar section');
  assert.equal(assetWindow.__joyflockShop.rarityOf(defaultAvatar), 'default');
  assert.equal(assetWindow.__joyflockShop.priceOf(defaultAvatar), 0);
  assert.equal(new Set(entries.map(e => e.id)).size, 28, 'ids are unique');
  for (const e of entries) {
    const url = assetWindow.__joyflockShop.assetUrl(e.id);
    const file = 'dist' + new URL(url, 'http://localhost').pathname;
    assert.ok(exists(file), `${e.id} runtime artwork ships at ${url}`);
    if (e.kind === 'avatar') {
      assert.match(url, /\/avatars-v4\/avatar-[a-z]+\.svg\?v=20261114-avatar5$/);
      const svg=read(file);
      assert.match(svg,/viewBox="0 0 256 256"/);
      assert.match(svg,/#F3D2AD/, 'all expression faces share one peach base');

    }
    assert.ok(e.en && e.cn, `${e.id} is translated`);
    assert.match(points, new RegExp("'" + e.id + "':'(default|rare|epic|legend)'"),
      `${e.id} has exactly one grade`);
  }
  assert.match(js, /section\('cursor'\)/);
  assert.match(js, /section\('avatar'\)/);
});

test('the first cursor is the free 默认 baseline and carries the 装配中 ribbon', () => {
  assert.equal(entries[0].id, 'cursor-star', 'the first card leads the cursor row');
  assert.equal(entries[0].cn, '默认光标');
  assert.equal(entries[0].en, 'Default pointer');
  assert.match(points, /'cursor-star':'default'/);
  assert.match(js, /rarityTag\(item\.id,'shop-rarity'\)/, 'the starter carries the same grade badge');
  assert.match(js, /shop-price-owned/, 'the price slot says owned instead of showing the star mark');
  assert.match(js, /'<span class="shop-price-owned">'\+esc\(t\('Owned','已拥有'\)\)/,
    'the bottom pill is the only place the card says 已拥有');
  assert.match(js, /<span class="shop-state" aria-hidden="true"><\/span>/,
    'the restored top-right ribbon is rendered');
  assert.match(js, /ribbon\.textContent=equipped\?t\('Equipped','装配中'\):''/,
    'it says 装配中 only while the card is equipped');
  assert.match(js, /if\(s\.owned\[id\]\)\{/, 'an owned item equips in one click, with no redeem dialog');
  assert.match(js, /成功替换光标/, 'the starter now reports a successful cursor replacement');
  assert.match(js, /该道具已拥有，换回不消耗 '\+COIN\+'。/);
  assert.ok(!/tier:'default'/.test(js), 'no legacy VIP/default tier badge');
  assert.match(js, /默认款/, 'the free baseline IS labelled explicitly');

  assert.match(points, /var DEFAULT_CURSOR='cursor-star'/);
  assert.match(points, /o\[DEFAULT_CURSOR\]=true/, 'owned from the first visit');
  assert.match(points, /cursor:DEFAULT_CURSOR/, 'equipped from the first visit');
  assert.match(points, /cursor!==DEFAULT_CURSOR&&kindOf\(cursor\)/,
    'the starter leaves the built-in / seasonal site pointer untouched');
  assert.match(points, /var baseline=\{plane:DEFAULT_PLANE,cursor:DEFAULT_CURSOR/,
    'restore default returns to the first card of its own slot');
  assert.match(points, /GAME_DEFAULTS\[kind\]\|\|baseline\[kind\]/,
    'per-game slots restore their OWN baseline');
  assert.equal(read('dist/assets/shop/cursor-star.svg'), read('dist/assets/cursor/plane.svg'),
    'the card artwork IS the original site pointer');
});

test('one currency, three grade prices: 1,000 / 3,000 / 5,000', () => {
  assert.equal(version, js.match(/var VERSION='([^']+)'/)?.[1], 'catalogue and wallet share one cache key');
  assert.match(js, /API\.priceOf\(id\)/);
  assert.match(points, /var PRICE=1000/);
  assert.match(points, /var EPIC_PRICE=3000/);
  assert.match(points, /var LEGEND_PRICE=5000/);
  assert.match(js, /mark\(\)\+fmt\(priceOf\(id\)\)/, 'card price uses the star mark and the grade price');
  assert.match(js, /Redeem for '\+fmt\(price\)\+' '\+COIN|以 '\+fmt\(price\)\+' '\+COIN\+' 兑换并替换/,
    'both languages quote prices in the one named currency');
  const withoutBrand=js.replace(/Joy Coin/g,'').replace(/\bCOIN\b/g,'')
    .replace(/joycoin1/g,'');   /* the cache key is not a currency name */
  assert.ok(!/gem|coin|credit|currency2|price:[0-9]/i.test(withoutBrand),
    'no second currency or per-item price');
});

test('clicking a card opens a redeem dialog that really buys and replaces', () => {
  assert.match(js, /dialog\.showModal\(\)/);
  assert.match(js, /data-shop-confirm/);
  assert.match(js, /API\.buy\(id\)/);
  assert.match(js, /API\.toast\(/);
  assert.ok(!/data-shop-reset|shop-reset|恢复初始装扮/.test(js), 'no reset-cosmetics buttons in the shop');
  assert.match(js, /equipped\[item\.kind\]===id/, 'equipped items are never charged again');
  assert.match(js, /Still need |还差 /, 'insufficient balance is explained');
});

test('a server-verified VIP equips for free; there is no preview feature', () => {
  assert.match(js, /var free=freeFor\(id\),owned=!!s\.owned\[id\]/);
  assert.match(js, /var cost=free\|\|owned\?0:price/);
  assert.match(js, /VIP 直接替换/);
  assert.match(js, /VIP FREE/);
  assert.match(js, /classList\.toggle\('is-vip'/);
  assert.ok(!/data-shop-preview|shop-preview|以 VIP 身份预览|Preview as VIP/.test(js));
  assert.ok(!/预览/.test(js), 'no preview button or preview toggle');
  assert.ok(!/data-jp-vip/.test(points));
});

test('VIP members replace an item in one click, without the redeem dialog', () => {
  const open = js.slice(js.indexOf('function open(id)'), js.indexOf('function confirm()'));
  assert.match(open, /if\(freeFor\(id\)\)\{/, 'the entitled-membership branch runs before the dialog');
  assert.match(open, /API\.buy\(id\)/, 'the real buy/equip path is used');
  assert.match(open, /if\(dialog&&dialog\.open\)\{dialog\.close\(\);selected=null;\}/,
    'a dialog left open by a state change cannot linger');
  const vipBody = open.slice(open.indexOf('if(freeFor(id)){'), open.indexOf('selected=id;renderDialog(id);'));
  assert.match(vipBody, /API\.buy\(id\)/);
  assert.match(vipBody, /return;\s*\}/, 'VIP path returns before the dialog');
  assert.ok(!/showModal/.test(vipBody), 'no dialog is opened for VIP');
  assert.ok(open.indexOf('dialog.showModal()') > open.indexOf('if(freeFor(id)){'),
    'the redeem dialog belongs to the non-VIP path only');
  assert.match(js, /VIP members equip directly, with no '\+COIN\+' spent/);
  assert.match(js, /VIP 会员无需 '\+COIN\+'，可直接替换/);
  assert.match(css, /\.shop-buy-vip-note\{/, 'the dialog explains the VIP route');
  assert.ok(!/预览|Preview as VIP|以 VIP 身份预览/.test(js), 'still no preview feature');
  // The wallet itself never charges an entitled member (tested behaviourally in site-points).
  assert.match(points, /var free=freeFor\(id\),owned=!!state\.owned\[id\]/);
  assert.match(points, /if\(!free&&!owned\)\{state\.total-=cost/);
});

test('/shop.html is reachable from every public page and uses one version chain', () => {
  const shells = [
    'dist/portal/index.html', 'dist/membership.html', 'dist/terms.html',
    'dist/privacy.html', 'dist/contact.html', 'dist/shop.html'
  ];
  for (const p of shells) {
    assert.match(read(p), /href="\/shop\.html"/, `${p} links to the shop`);
  }
  assert.match(page, /site-shop\.css\?v=([^"']+)/);
  assert.match(page, /site-shop\.js\?v=([^"']+)/);
  /* &d= is a cache-busting suffix, not part of the frozen version chain. */
  assert.equal(page.match(/site-shop\.css\?v=([^"'&]+)/)[1], version);
  assert.equal(page.match(/site-shop\.js\?v=([^"'&]+)/)[1], version);
  assert.match(page, /id="shop-root"/);
  assert.match(page, /site-chrome\.css/);
  assert.match(page, /site-account\.js/);
  assert.match(page, /legal-language\.js/);
  assert.match(page, /site-points\.js\?v=/, 'the shared wallet loads first');
  assert.ok(page.indexOf('site-points.js') < page.indexOf('site-shop.js'), 'wallet before catalogue');
});

test('the layout follows the reference: one six-up grid, rarity tags, dark cards, responsive', () => {
  assert.match(css, /\.shop-grid\{display:grid;grid-template-columns:repeat\(6,minmax\(0,1fr\)\);gap:9px\}/);
  assert.ok(!/repeat\(10,minmax\(0,1fr\)/.test(css), 'the old ten-column row is gone');
  assert.match(css, /\.shop-art\{[^}]*height:98px/, 'artwork height matches the canvas stages');
  assert.match(css, /\.shop-rarity/);
  assert.match(css, /\.shop-state\{[\s\S]{0,260}transform:rotate\(38deg\)/,
    'the restored 装配中 ribbon is a green diagonal corner mark');
  assert.match(css, /\.shop-art/);
  assert.match(css, /\.shop-buy\{/);
  assert.match(css, /\.shop-buy::backdrop/);
  assert.match(css, /@media\(max-width:1240px\)/);
  assert.match(css, /@media\(max-width:520px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test('the shop wallet carries no demo badge', () => {
  assert.ok(!/shop-wallet-demo|DEMO/.test(js), 'no badge next to the balance');
  assert.ok(!/\.shop-wallet-demo/.test(css), 'no orphan badge styling');
  assert.match(js, /Wallet: 10,000 '\+COIN\+' to start/);
  assert.match(js, /'\+COIN\+' 钱包初始 10,000/);
  assert.match(js, /\(s\.vip\?'<span class="shop-wallet-vip">VIP<\/span>':''\)/, 'VIP badge is unaffected');
});

test('the shop is cosmetic only and never touches scoring or rules', () => {
  assert.ok(!/dice|winRate|rollTo|gameRules|\bengine\./i.test(js));
  assert.match(js, /Real balances, deductions and VIP entitlement must be supplied by the server/);
  assert.match(js, /真实余额、扣减与 VIP 身份必须由服务端/);
  const scoring = read('backend/src/main/java/com/flightparty/stats/MatchScoring.java');
  assert.match(scoring, /classic-score-3-2-0-0-plane2/);
});
