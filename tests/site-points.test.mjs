import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const js = read('dist/site-points.js');
const css = read('dist/site-points.css');
const svg = read('dist/assets/points/star-point.svg');
const version = js.match(/var VERSION='([^']+)'/)?.[1];
const hosts = [
  'dist/portal/index.html', 'dist/membership.html', 'dist/terms.html',
  'dist/privacy.html', 'dist/contact.html', 'dist/table/index.html',
  'dist/shop.html'
].map(p => ({p, text: read(p)}));

/* Run the shipped state script in a tiny DOM so the real buy/equip code is
   exercised, not re-implemented by the test. */
function stateSandbox(points) {
  const store = new Map();
  if (points !== undefined) {
    store.set('joyflock.shop.v1', JSON.stringify({points, owned: {}, equipped: {cursor: '', avatar: ''}}));
  }
  const styles = {}, attrs = {};
  const docRoot = {
    getAttribute: () => null,
    hasAttribute: () => false,
    style: {
      setProperty: (k, v) => { styles[k] = v; },
      removeProperty: k => { delete styles[k]; }
    },
    setAttribute: (k, v) => { attrs[k] = v; },
    removeAttribute: k => { delete attrs[k]; }
  };
  const win = {addEventListener: () => {}, dispatchEvent: () => {}};
  const context = {
    window: win,
    document: {documentElement: docRoot, readyState: 'complete', querySelector: () => null},
    localStorage: {
      getItem: k => store.has(k) ? store.get(k) : null,
      setItem: (k, v) => store.set(k, v)
    },
    CustomEvent: function () {},
    setTimeout, clearTimeout, console
  };
  runInNewContext(js, context);
  return {shop: win.__joyflockShop, points: win.__joyflockPoints, store, styles, attrs};
}

test('one star mark, one currency, no second coin or gem', () => {
  assert.ok(existsSync(resolve(root, 'dist/assets/points/star-point.svg')));
  assert.match(svg, /viewBox="0 0 64 64"/);
  assert.match(svg, /M32 9 Q36\.2 27\.8 55 32/, 'four-point brand star path');
  assert.ok(!/<rect/.test(svg), 'the mark has no opaque background tile');
  assert.match(svg, /#ff9ec2|#ff8ab0/, 'pink halo from the supplied logo');
  assert.equal((js.match(/var VERSION=/g) || []).length, 1);
  assert.match(js, /var CURRENCY='Joy Coin'/, 'the star currency has ONE official name');
  const branded=js.replace(/Joy Coin/g,'').replace(/data-coin|dataset\.coin/g,'')
    .replace(/joycoin1/g,'');   /* the cache key is not a currency name */
  assert.ok(!/gem|coin|credit|balanceType|currency2/i.test(branded),
    'no second currency concept besides the Joy Coin brand name');
  assert.match(js, /var PRICE=1000/);
});

test('every shell loads the shared wallet with one version tag', () => {
  assert.ok(version, 'the script declares a cache key');
  for (const {p, text} of hosts) {
    assert.match(text, /site-points\.css\?v=([^"'&]+)/, `${p} needs the stylesheet`);
    assert.match(text, /site-points\.js\?v=([^"']+)/, `${p} needs the script`);
    const a = text.match(/site-points\.css\?v=([^"'&]+)/)[1];
    const b = text.match(/site-points\.js\?v=([^"']+)/)[1];
    assert.equal(a, b, `${p} must use one cache key`);
    assert.equal(a, version, `${p} must reference the shipped script version`);
  }
});

test('wallet never fetches a balance and shows no demo badge in the UI', () => {
  assert.match(js, /must be server-authoritative before launch|server-authoritative/);
  assert.ok(!/jp-flag|data-preview=|DEMO|\(demo\)|（演示）/.test(js), 'no demo badge is rendered');
  assert.ok(!/jp-flag|DEMO/.test(css), 'no orphan badge styling');
  assert.ok(!/\bfetch\(/.test(js), 'no client-side balance endpoint is invented');
  assert.match(js, /window\.__joyflockMe/, 'the existing identity request is reused, never duplicated');
  assert.match(js, /window\.__joyflockPoints=\{|set:function|get:function|refresh:render/,
    'a server-backed host must be able to supply real values later');
  assert.match(js, /var p=window\.__joyflockMe/);
  assert.match(js, /state\.live\?undefined:state\.total/, 'a server balance is never persisted locally');
});

test('a signed-in header keeps language, account and points side by side', () => {
  const chrome = read('dist/site-chrome.css');
  assert.match(chrome, /\.chrome-account\.chrome-account-gone\{display:none!important\}/,
    'the blank reserved registration slot is removed from the layout');
  assert.ok(!/chrome-account-gone\{visibility:hidden/.test(chrome));
  const account = read('dist/site-account.js');
  assert.match(account, /signup\.classList\.add\('chrome-account-gone'\)/);
  assert.match(account, /signup\.classList\.remove\('chrome-account-gone'\)/,
    'the button stays in the DOM so a later sign-out reveals it again');
  assert.match(css, /\.topbar \.top-actions\{width:381px\}/, 'guest cluster: 75+88+96+92+30');
  assert.match(css, /body\.chrome-signed>\.topbar \.top-actions\{width:405px\}/,
    'signed-in cluster: 75+112+96+92+30 (compact nickname slot)');
  assert.equal(405 - 381, 24,
    'the signed-in nickname is 24px wider; no retired register slot remains');
  assert.match(css, /body\.chrome-signed>\.topbar #chrome-account\{width:112px;min-width:112px\}/);
  assert.match(css, /@media\(max-width:760px\)[\s\S]*?body\.chrome-signed>\.topbar \.top-actions\{width:381px\}/);
  assert.match(css, /@media\(max-width:600px\)[\s\S]*?body\.chrome-signed>\.topbar \.top-actions\{width:290px\}/);
  assert.match(css, /@media\(max-width:480px\)[\s\S]*?body\.chrome-signed>\.topbar \.top-actions\{width:218px\}/);
});

test('the first cursor is the free 默认 baseline; prices follow the three grades', () => {
  const s = stateSandbox();
  assert.equal(s.shop.price, 1000);
  assert.equal(s.points.get().total, 10000, 'local demo wallet');
  assert.equal(s.points.get().equipped.cursor, 'cursor-star', 'the default is equipped from the first visit');
  assert.equal(s.points.get().owned['cursor-star'], true, 'the default is already owned');
  assert.equal(s.shop.rarityOf('cursor-star'), 'default', 'the built-in pointer is a free baseline');
  assert.equal(s.shop.priceOf('avatar-crown'), 5000, 'Legendary list price');
  assert.equal(s.shop.priceOf('cursor-rainbow'), 3000, 'Epic list price');
  assert.equal(s.attrs['data-shop-cursor'], undefined, 'the built-in / seasonal pointer is left alone');
  assert.equal(s.styles['--shop-cursor'], undefined);

  const owned = s.shop.buy('cursor-star');
  assert.equal(owned.already, true, 'clicking the equipped default is a no-op');
  assert.equal(s.points.get().total, 10000, 'the default never charges points');

  const first = s.shop.buy('cursor-rainbow');
  assert.deepEqual({ok: first.ok, cost: first.cost}, {ok: true, cost: 3000});
  assert.equal(s.points.get().total, 7000);
  assert.equal(s.points.get().owned['cursor-rainbow'], true);
  assert.equal(s.points.get().equipped.cursor, 'cursor-rainbow');
  assert.match(s.styles['--shop-cursor'], /cursor-rainbow\.png/, 'the live pointer uses the portable PNG');
  assert.equal(s.attrs['data-shop-cursor'], '1');

  const second = s.shop.buy('cursor-rainbow');
  assert.equal(second.already, true, 'equipping twice never charges again');
  assert.equal(s.points.get().total, 7000);

  s.shop.buy('avatar-crown'); // Legendary: 5,000 Joy Coins for a guest
  assert.equal(s.points.get().total, 2000);
  assert.match(s.styles['--shop-avatar'], /avatars-v4\/avatar-crown\.svg/);

  const saved = JSON.parse(s.store.get('joyflock.shop.v1'));
  assert.equal(saved.points, 2000);
  /* 7 site-wide slots + 9 INDEPENDENT per-game board-game slots. */
  assert.deepEqual(Object.keys(saved.equipped).sort(),
    ['avatar', 'ball', 'cue', 'cursor', 'plane', 'table', 'trail',
      'fourBoard', 'fourPiece', 'fourPiecePink', 'gomokuBoard', 'gomokuPiece', 'gomokuPieceWhite',
      'chessBoard', 'chessPiece', 'xoBoard', 'xoPiece', 'xoPieceO'].sort());
  assert.equal(saved.equipped.plane, 'plane-classic', 'the Classic aircraft is the default');

  const back = s.shop.buy('cursor-star');
  assert.equal(back.cost, 0, 'switching back to an owned default is free');
  assert.equal(s.points.get().total, 2000);
  assert.equal(s.attrs['data-shop-cursor'], undefined);

  s.shop.reset('cursor');
  assert.equal(s.points.get().equipped.cursor, 'cursor-star', 'restore default returns to the first card');
  assert.equal(s.attrs['data-shop-cursor'], undefined);
});

test('an old local save with an empty cursor is normalised to the owned default', () => {
  const s = stateSandbox(0); // legacy shape: equipped.cursor === ''
  assert.equal(s.points.get().equipped.cursor, 'cursor-star');
  assert.equal(s.points.get().owned['cursor-star'], true);
  assert.equal(s.shop.freeFor('cursor-star'), false, 'the default is never sold as a VIP perk');
  s.points.set({vip: true, annualVip: true, live: true});
  assert.equal(s.shop.freeFor('cursor-star'), false, 'even a member sees OWNED, not VIP FREE');
  assert.equal(s.shop.freeFor('cursor-rainbow'), true, 'the other cursors keep the VIP rule');
  assert.equal(s.shop.buy('cursor-star').already, true);
  assert.equal(s.points.get().total, 0);
});

test('insufficient balance is refused; Epic is a VIP perk, Legendary is Annual VIP only', () => {
  const poor = stateSandbox(500);
  const refused = poor.shop.buy('cursor-frost'); // Epic, 3,000
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, 'insufficient');
  assert.equal(refused.short, 2500);
  assert.equal(poor.points.get().total, 500);

  const shortLegend = stateSandbox(2000);
  assert.equal(shortLegend.shop.buy('avatar-octo').short, 3000, '5,000-price shortfall');

  const vip = stateSandbox(0);
  vip.points.set({vip: true, live: true});
  const free = vip.shop.buy('avatar-fox'); // Epic: free for VIP
  assert.equal(free.ok, true);
  assert.equal(free.free, true);
  assert.equal(free.cost, 0);
  assert.equal(vip.points.get().total, 0, 'VIP never spends points on Epic items');
  assert.equal(vip.points.get().equipped.avatar, 'avatar-fox');
  assert.equal(vip.points.get().owned['avatar-fox'], undefined, 'VIP does not need ownership');
  assert.equal(vip.shop.freeFor('avatar-octo'), false, 'a plain VIP still pays for Legendary');

  const annual = stateSandbox(0);
  annual.points.set({annualVip: true, live: true});
  assert.equal(annual.shop.buy('avatar-octo').cost, 0, 'Legendary is free for Annual VIP');
  assert.equal(annual.points.get().total, 0);
});

test('aircraft: Classic is owned; two Epic (VIP) and two Legendary (Annual VIP) planes', () => {
  const s = stateSandbox();
  assert.equal(s.points.get().equipped.plane, 'plane-classic');
  assert.equal(s.points.get().owned['plane-classic'], true, 'the default plane is already owned');

  const classic = s.shop.buy('plane-classic');
  assert.equal(classic.already, true, 'the equipped default never costs anything');
  assert.equal(s.points.get().total, 10000);

  const pointsOnly = s.shop.buy('plane-cloud2d');
  assert.equal(pointsOnly.cost, 1000, 'a points-only plane costs the same single price');
  assert.equal(s.points.get().total, 9000);
  assert.equal(s.attrs['data-shop-plane'], 'cloud2d');
  assert.equal(s.shop.buy('plane-gold2d').cost, 3000, 'a guest redeems a VIP plane with points');

  const vip = stateSandbox();
  vip.points.set({vip: true, live: true});
  assert.equal(vip.shop.freeFor('plane-gold2d'), true);
  assert.equal(vip.shop.freeFor('plane-night2d'), true);
  assert.equal(vip.shop.freeFor('plane-obsidian2d'), false, 'plain VIP is not Annual VIP');
  assert.equal(vip.shop.freeFor('plane-aurora2d'), false);
  assert.equal(vip.shop.freeFor('cursor-star'), false, 'the owned default is not a VIP perk');
  assert.equal(vip.shop.freeFor('cursor-rainbow'), true, 'other cursors keep the original VIP rule');
  const redeemedLegend = vip.shop.buy('plane-obsidian2d');
  assert.equal(redeemedLegend.cost, 5000, 'a plain VIP redeems a Legendary plane for 5,000');
  assert.equal(vip.points.get().total, 5000);

  const annual = stateSandbox();
  annual.points.set({annualVip: true, live: true});
  assert.equal(annual.points.get().vip, true, 'Annual VIP includes VIP');
  for (const id of ['plane-gold2d', 'plane-night2d', 'plane-obsidian2d', 'plane-aurora2d'])
    assert.equal(annual.shop.freeFor(id), true, id + ' is free for Annual VIP');
  const free = annual.shop.buy('plane-aurora2d');
  assert.deepEqual({ok: free.ok, cost: free.cost, free: free.free}, {ok: true, cost: 0, free: true});
  assert.equal(annual.points.get().total, 10000, 'no points are spent');
  assert.equal(annual.attrs['data-shop-plane'], 'aurora2d');
  assert.equal(annual.points.get().owned['plane-aurora2d'], undefined, 'membership does not need ownership');

  annual.shop.reset('plane');
  assert.equal(annual.points.get().equipped.plane, 'plane-classic');
  assert.equal(annual.attrs['data-shop-plane'], 'classic');
  assert.equal(annual.points.get().total, 10000);
});

test('no preview feature survives anywhere in the points layer', () => {
  assert.ok(!/data-jp-vip|Preview as VIP|以 VIP 身份预览/.test(js));
  assert.ok(!/预览|data-shop-preview/.test(js));
  assert.ok(!/jp-dialog|jp-items|jp-vip/.test(js), 'the old preview shop dialog is gone');
  assert.ok(!/jp-dialog\{|jp-items\{|jp-vip\{/.test(css), 'no orphan preview styling');
});

test('existing server-authoritative scoring stays untouched', () => {
  const scoring = read('backend/src/main/java/com/flightparty/stats/MatchScoring.java');
  assert.match(scoring, /classic-score-3-2-0-0-plane2/);
  const table = read('dist/table/table.js');
  assert.match(table, /\/api\/table\/leaderboards\/'\+game/, 'per-game leaderboards remain');
  assert.match(table, /\/api\/table\/stats\/'\+game/, 'per-game points remain server-owned');
  assert.ok(!/\bdice\b|winRate|gameRules|\bengine\./i.test(js), 'no gameplay rule is touched');
});

test('shared styling covers the pill, equipped cosmetics and small screens', () => {
  for (const selector of ['.jp-pill{', '.jp-toast{', 'html[data-shop-cursor]', 'html[data-shop-avatar]']) {
    assert.ok(css.includes(selector), selector);
  }
  assert.match(css, /--joy-cursor:var\(--shop-cursor\)/, 'feed the existing site cursor variables');
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.ok(!/table-host-theme/.test(css));
});

test('the leaderboard is still left alone', () => {
  assert.ok(!/jp-game-points|buildGameCard/.test(js), 'no card node is created');
  assert.ok(!/\.home-ranking|insertBefore\(card/.test(js), 'the script never touches the rank panel DOM');
  assert.ok(!/jp-game-points/.test(css), 'no orphan card styling');
  assert.match(js, /buildPill\(host\)/, 'the header pill still mounts on shell pages');
  assert.match(js, /applyEquipped\(\);consumeIdentity\(\);/, 'cosmetics mount even without a pill host');
});
