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
const planeCss = read('dist/site-plane.css');
const page = read('dist/shop.html');
const version = points.match(/var VERSION='([^']+)'/)?.[1];

/* Run the SHIPPED wallet in a tiny DOM, so prices and membership perks are
   exercised as behaviour instead of being re-implemented by the test. */
function sandbox(initial) {
  const store = new Map(), styles = {}, attrs = {};
  if (initial) store.set('joyflock.shop.v1', JSON.stringify(initial));
  const docRoot = {
    getAttribute: () => null, hasAttribute: () => false,
    style: {setProperty: (k, v) => {styles[k] = v;}, removeProperty: k => {delete styles[k];}},
    setAttribute: (k, v) => {attrs[k] = v;}, removeAttribute: k => {delete attrs[k];}
  };
  const win = {addEventListener: () => {}, dispatchEvent: () => {}};
  runInNewContext(points, {
    window: win,
    document: {documentElement: docRoot, readyState: 'complete', querySelector: () => null},
    localStorage: {getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, v)},
    CustomEvent: function () {}, setTimeout, clearTimeout, console
  });
  return {shop: win.__joyflockShop, points: win.__joyflockPoints, styles, attrs};
}

const catalog = [...shop.matchAll(/\{id:'([A-Za-z0-9-]+)',kind:'([A-Za-z0-9-]+)'/g)].map(m => m[1]);
const rarities = [...points.matchAll(/'([a-z0-9-]+)':'(default|rare|epic|legend)'/g)]
  .reduce((acc, [, id, key]) => (acc[id] = key, acc), {});

test('three purchasable grades plus ONE free 默认 baseline (never sold)', () => {
  assert.match(points, /var RARITY=\{\s*default:\{price:0,perk:''\},\s*rare:\{price:PRICE,perk:''\},\s*epic:\{price:EPIC_PRICE,perk:'vip'\},\s*legend:\{price:LEGEND_PRICE,perk:'annual'\}\s*\}/);
  assert.equal(Object.keys(rarities).length, 121, 'every catalogue id has one grade');
  assert.deepEqual([...new Set(Object.values(rarities))].sort(), ['default', 'epic', 'legend', 'rare']);
  assert.equal(catalog.length, 110,
    '12 cursors + 16 avatars + 6 planes + 4 trails + 54 active game products + 18 billiard products');
  for (const id of catalog) assert.ok(rarities[id], `${id} is graded`);
  for (const [name, text] of [['shop', shop], ['points', points], ['css', css], ['plane css', planeCss], ['page', page]])
    assert.ok(!/tier:'default'|data-tier=|shop-tier/.test(text), `${name} has no legacy VIP/default tier badge`);
  assert.match(shop, /default:\{en:'Default',cn:'默认'\},\s*rare:\{en:'Rare',cn:'稀有'\},\s*epic:\{en:'Epic',cn:'史诗'\},\s*legend:\{en:'Legendary',cn:'传说'\}/);
  assert.match(css, /\[data-rarity="default"\]\{--shop-rarity:#9fb0cf/, 'baselines have a quiet neutral rim');
  assert.ok(!/除头像外|EXCEPT Avatars|Avatars[^\n]*NO default/.test(shop),
    'the shop no longer excludes avatars from the free baselines');
});

test('the free baselines are owned, equipped and free on the first visit', () => {
  const s = sandbox();
  const perGame = ['four', 'gomoku', 'chess', 'xo']
    .flatMap(g => [`${g}-piece-default`, `${g}-board-default`]);
  for (const id of ['cursor-star', 'avatar-starling', 'plane-classic', 'trail-none',
    'ball-default', 'cue-default', 'table-default', ...perGame]) {
    assert.equal(rarities[id], 'default', `${id} is a baseline`);
    assert.equal(s.points.get().owned[id], true, `${id} is owned`);
    assert.equal(s.shop.priceOf(id), 0, `${id} costs nothing`);
    assert.equal(s.shop.freeFor(id), false, `${id} is never a VIP perk`);
  }
  assert.equal(rarities['trail-star'], 'rare', 'Starlight stays a purchasable Rare effect');
  assert.equal(s.points.get().owned['trail-star'], true, 'nobody loses the old free starter');
  assert.equal(s.points.get().equipped.trail, 'trail-none', '默认 is no trail at all');
  assert.equal(s.points.get().equipped.avatar, 'avatar-starling', 'Happy Smile is the free initial avatar');
  assert.equal(s.shop.buy('cursor-star').already, true, 'the equipped baseline is a no-op');
  assert.equal(s.points.get().total, 10000);
  assert.match(shop, /rarityTag\(item\.id,'shop-rarity'\)/, 'baseline cards carry the same tag component');
});

test('list prices: Rare 1,000, Epic 3,000, Legendary 5,000', () => {
  assert.match(points, /var PRICE=1000;/);
  assert.match(points, /var EPIC_PRICE=3000;/);
  assert.match(points, /var LEGEND_PRICE=5000;/);
  const s = sandbox();
  for (const [id, key] of Object.entries(rarities)) {
    assert.equal(s.shop.rarityOf(id), key, id);
    assert.equal(s.shop.priceOf(id), key === 'legend' ? 5000 : key === 'epic' ? 3000 : key === 'default' ? 0 : 1000,
      `${id} (${key})`);
  }
  assert.match(shop, /mark\(\)\+fmt\(priceOf\(id\)\)/, 'cards show the rarity price');
  assert.match(shop, /var price=priceOf\(id\)/, 'the dialog uses the same price');
  assert.match(shop, /Redeem for '\+fmt\(price\)\+' '\+COIN/, 'prices are quoted in Joy Coin');
  assert.match(shop, /以 '\+fmt\(price\)\+' '\+COIN\+' 兑换并替换/, 'Chinese prices use the same name');
});

test('free perks: Epic for VIP (Annual included), Legendary for Annual VIP only', () => {
  const guest = sandbox();
  for (const id of Object.keys(rarities)) assert.equal(guest.shop.freeFor(id), false, `guest pays for ${id}`);

  const vip = sandbox();
  vip.points.set({vip: true, live: true});
  for (const [id, key] of Object.entries(rarities))
    assert.equal(vip.shop.freeFor(id), key === 'epic', `${id} (${key}) for VIP`);

  const annual = sandbox();
  annual.points.set({annualVip: true, live: true});
  assert.equal(annual.points.get().vip, true, 'Annual VIP includes VIP');
  for (const [id, key] of Object.entries(rarities))
    assert.equal(annual.shop.freeFor(id), key === 'epic' || key === 'legend', `${id} (${key}) for Annual VIP`);
});

test('buying charges the rarity price; members only skip the price of their perk', () => {
  const guest = sandbox();
  assert.equal(guest.shop.buy('cursor-ember').cost, 1000, 'Rare');
  assert.equal(guest.shop.buy('cursor-rainbow').cost, 3000, 'Epic');
  assert.equal(guest.shop.buy('avatar-crown').cost, 5000, 'Legendary');
  assert.equal(guest.points.get().total, 1000);
  assert.equal(guest.points.get().equipped.avatar, 'avatar-crown');
  assert.equal(guest.shop.buy('avatar-crown').already, true, 'an owned item is never charged twice');

  const poor = sandbox({points: 2000, owned: {}, equipped: {cursor: 'cursor-star', avatar: '', plane: 'plane-classic'}});
  const refused = poor.shop.buy('plane-obsidian2d');
  assert.deepEqual({ok: refused.ok, reason: refused.reason, short: refused.short},
    {ok: false, reason: 'insufficient', short: 3000}, '5,000-price shortfall is explained');
  assert.equal(poor.points.get().total, 2000);

  const vip = sandbox();
  vip.points.set({vip: true, live: true});
  assert.equal(vip.shop.buy('plane-gold2d').cost, 0, 'Epic is a VIP perk');
  assert.equal(vip.shop.buy('plane-aurora2d').cost, 5000, 'a plain VIP still pays for Legendary');
  assert.equal(vip.points.get().total, 5000);

  const annual = sandbox();
  annual.points.set({annualVip: true, live: true});
  assert.equal(annual.shop.buy('plane-aurora2d').cost, 0, 'Legendary is an Annual VIP perk');
  assert.equal(annual.shop.buy('avatar-crown').cost, 0);
  assert.equal(annual.points.get().total, 10000, 'membership never spends points');
  assert.equal(annual.points.get().owned['plane-aurora2d'], undefined);
});

test('the grade label text and card border read the SAME colour variable', () => {
  for (const key of ['default', 'rare', 'epic', 'legend'])
    assert.match(css, new RegExp('\\[data-rarity="' + key + '"\\]\\{--shop-rarity:#[0-9a-f]{6};'));
  assert.match(css, /\.shop-card\{[\s\S]*?border:1px solid var\(--shop-rarity-edge\)/,
    'the lit outline reads the same grade colour family as the label');
  assert.match(css, /--shop-rarity-edge:#[0-9a-f]{6}/,
    'each grade defines its own brighter outline tone');
  assert.match(css, /--shop-rarity-top:#[0-9a-f]{8}/,
    'the top gradient is derived from the same grade colour');
  assert.match(css, /\.shop-rarity\{[\s\S]*?color:var\(--shop-rarity\)/);
  assert.match(css, /\.shop-buy\{[\s\S]*?border:1px solid var\(--shop-rarity-line\)/,
    'the redeem dialog keeps the quieter grade tone');
  assert.match(shop, /data-rarity="'\+rarityOf\(item\.id\)\+'"|data-rarity="'\+rarityOf\(id\)\+'"|data-rarity="/,
    'every card publishes its grade');
  assert.match(shop, /dialog\.dataset\.rarity=rarityOf\(id\)/);
  assert.ok(!/\.shop-card\[data-equipped="1"\]\{border-color:#ffd479/.test(css),
    'equipping never repaints the border in a different colour');
  assert.ok(!/\.shop-card\[data-equipped="1"\]\{[\s\S]{0,220}box-shadow:0 0 0 1px/.test(css),
    'equipping does NOT add a sharp second ring next to the lit outline');
  assert.match(css, /\.shop-card\[data-equipped="1"\]\{[\s\S]{0,220}0 0 16px 0 var\(--shop-rarity-glow\)/,
    'equipping only strengthens the soft grade halo');
  assert.match(css, /\.shop-rarity--dialog\{/);
  assert.match(planeCss, /\.shop-hangar-current \.shop-rarity\{/);
});

test('copy explains the three grades in both languages, with no stale 1,000-only claim', () => {
  assert.match(shop, /Rare 1,000 · Epic 3,000 \(free for VIP\) · Legendary 5,000 \(free for Annual VIP\)/);
  assert.match(shop, /稀有 1,000 · 史诗 3,000（VIP 免费）· 传说 5,000（年VIP 免费）/);
  assert.match(shop, /Epic: VIP and Annual VIP equip for free/);
  assert.match(shop, /Legendary: Annual VIP equips for free/);
  assert.match(shop, /史诗：VIP 与年度 VIP 免费替换/);
  assert.match(shop, /传说：年度 VIP 免费替换/);
  assert.match(shop, /Only three grades: Rare 1,000 '\+COIN/);
  assert.match(shop, /只有三档：稀有 1,000 '\+COIN/);
  assert.ok(!/every plane can also be redeemed for 1,000 points|全部也可用 1,000 积分兑换/.test(shop));
  assert.match(shop, /Free 默认 baselines are already equipped/);
  assert.match(shop, /各分区另有免费默认款，已装配/);
  assert.match(shop, /装配中 ribbon marks the item currently in use/);
  assert.match(shop, /右上角「装配中」标出当前正在使用的道具/);
  assert.ok(!/data-shop-preview|shop-preview|预览/.test(shop), 'still no preview feature');
});

test('the frame follows the reference: dark gradient, thin edge, yellow hover inset', () => {
  assert.match(css, /\.shop-card\{[^}]*border-radius:16px/);
  assert.match(css, /\.shop-card\{[^}]*border:1px solid var\(--shop-rarity-edge\)/,
    'the outline is still ONE 1px stroke, just brighter');
  assert.match(css, /\.shop-card\{[^}]*linear-gradient\(180deg,var\(--shop-rarity-top\) 0,transparent 46px\)/,
    'the grade colour fades in from the TOP and stops inside the header strip');
  assert.match(css, /\.shop-card\{[^}]*linear-gradient\(150deg,#1a2750,#0e1734 72%\)/,
    'the card body now uses the hangar blue gradient');
  assert.match(css, /\.shop-card\{[^}]*0 -2px 18px -4px var\(--shop-rarity-glow\)/,
    'the reference halo is a blurred shadow, strongest above the top edge');
  assert.ok(!/\.shop-card\{[^}]*0 0 0 1px/.test(css),
    'no sharp 1px ring is stacked on the border');
  assert.match(css, /\.shop-card::after\{[^}]*border:2px solid #ffd84d/,
    'hover lights a warm yellow inner frame');
  assert.match(css, /\.shop-card::after\{[^}]*inset:3px/,
    'the inner frame sits inside the hairline border');
  assert.match(css, /\.shop-card:hover::after,\.shop-card:focus-visible::after\{opacity:\.5\}/,
    'pointer AND keyboard focus both reveal the inner frame at 50% opacity');
  assert.match(css, /\.shop-card::after\{[^}]*opacity:0/,
    'the yellow frame is hidden until hovered');
  assert.match(css, /\.shop-rarity\{[\s\S]{0,260}text-shadow:0 0 8px var\(--shop-rarity-glow\)/);
  assert.match(css, /\.shop-name\{[\s\S]{0,220}font-size:12\.5px/);
  assert.match(css, /\.shop-price-owned\{[\s\S]{0,260}border-radius:999px/,
    'owned items wear a filled pill instead of loose text');
  assert.match(css, /\.shop-price-owned::before\{content:'✦'/);
});

test('the grade ribbon has no divider line and matches the Owned pill size', () => {
  /* Extract the base rule only: the dialog / hangar badges are separate
     .shop-rarity variants and legitimately keep their own borders. */
  const rarityRule = css.match(/\n\.shop-rarity\{[^}]*\}/)?.[0] || '';
  const ownedRule = css.match(/\n\.shop-price-owned\{[^}]*\}/)?.[0] || '';
  assert.ok(rarityRule, 'the base grade label rule exists');
  assert.ok(!/border-bottom/.test(rarityRule),
    'the horizontal rule under the grade label is removed');
  assert.ok(!/background:/.test(rarityRule),
    'the grade label has its own bar no more; the gradient belongs to the card');
  assert.match(css, /\.shop-page\{[^}]*--shop-label-size:12px/);
  assert.match(rarityRule, /font-size:var\(--shop-label-size\)/);
  assert.match(ownedRule, /font-size:var\(--shop-label-size\)/,
    'grade label and "已拥有" pill are exactly the same size');
  assert.ok(!/font-size:9\.5px/.test(css), 'the old tiny owned text is gone');
  assert.ok(!/font-size:10px/.test(rarityRule),
    'the old tiny grade text is gone');
});

test('装配中 ribbon is BACK on equipped cards; 已拥有 stays in the bottom pill', () => {
  assert.match(css, /\.shop-page\{[^}]*--shop-owned:#2f9e6d/,
    'a single green token drives every owned marker');
  const ownedRule = css.match(/\n\.shop-price-owned\{[^}]*\}/)?.[0] || '';
  assert.ok(ownedRule, 'the bottom pill still exists');
  assert.match(ownedRule, /background:var\(--shop-owned\)/);
  assert.match(ownedRule, /font-size:var\(--shop-label-size\)/,
    'the pill still matches the grade label / 横梁 size');
  assert.ok(!/#2d6bd8|#d99a2b/.test(ownedRule), 'no blue or gold owned marker remains');
  /* The restored diagonal mark: same green, rotated, hidden when empty. */
  const ribbon = css.match(/\n\.shop-state\{[^}]*\}/)?.[0] || '';
  assert.ok(ribbon, 'the top-right ribbon rule exists again');
  assert.match(ribbon, /transform:rotate\(38deg\)/);
  assert.match(ribbon, /background:var\(--shop-owned\)/);
  assert.match(ribbon, /font-size:var\(--shop-label-size\)/);
  assert.match(css, /\.shop-state:empty\{display:none\}/, 'non-equipped cards show no ribbon');
  assert.match(shop, /<span class="shop-state" aria-hidden="true"><\/span>/);
  assert.match(shop, /ribbon\.textContent=equipped\?t\('Equipped','装配中'\):''/,
    'only the equipped card says 装配中 / Equipped');
  assert.ok(!/ribbon\.textContent=.*已拥有/.test(shop),
    'the ribbon never repeats the bottom 已拥有 pill');
  assert.match(shop, /card\.querySelector\('\.shop-price'\)\.innerHTML=free/,
    'card state is still painted into the bottom pill');
  assert.match(css, /\.shop-card\[data-equipped="1"\]\{/,
    'the equipped halo remains as the non-text equipped marker');
});

test('the whole site shares the bumped cache key', () => {
  assert.equal(version, '20261112-gamelanes1');
  for (const p of ['dist/shop.html', 'dist/site-shop.js', 'dist/site-points.js', 'dist/site-plane-fx.js',
    'dist/site-trail-fx.js', 'dist/app.js', 'dist/portal/index.html', 'dist/index.html', 'dist/table/index.html',
    'dist/table/arcade.html', 'dist/membership.html', 'dist/terms.html', 'dist/privacy.html', 'dist/contact.html'])
    assert.ok(read(p).includes('20261112-gamelanes1'), `${p} uses the new key`);
  for (const p of ['dist/site-shop.js', 'dist/site-points.js', 'dist/site-plane-fx.js', 'dist/site-trail-fx.js'])
    assert.equal(read(p).match(/var VERSION='([^']+)'/)?.[1], version);
  assert.ok(!/20261111-shopnav1|20261111-ownedequip1/.test(read('dist/shop.html')));
});
