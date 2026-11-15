import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const exists = p => existsSync(resolve(root, p));

const shop = read('dist/site-shop.js');
const points = read('dist/site-points.js');
const fx = read('dist/site-plane-fx.js');
const css = read('dist/site-plane.css');
const page = read('dist/shop.html');
const portal = read('dist/portal/index.html');
const app = read('dist/app.js');
const hangar = read('dist/hangar.js');
const version = points.match(/var VERSION='([^']+)'/)?.[1];

const planes = [...shop.matchAll(/\{id:'(plane-[a-z0-9]+)',kind:'plane',([^\n]*)\}/g)]
  .map(([, id, rest]) => ({id, rest}));
const grades = [...points.matchAll(/'(plane-[a-z0-9]+)':'(default|rare|epic|legend)'/g)]
  .reduce((acc, [, id, key]) => (acc[id] = key, acc), {});

test('six aircraft: one free 默认, one Rare, two Epic (VIP) and two Legendary (Annual VIP)', () => {
  assert.equal(planes.length, 6, 'six aircraft in the catalogue');
  assert.equal(new Set(planes.map(p => p.id)).size, 6, 'ids are unique');
  const counts = Object.values(grades).reduce((acc, key) => (acc[key] = (acc[key] || 0) + 1, acc), {});
  assert.deepEqual(counts, {default: 1, rare: 1, epic: 2, legend: 2});
  assert.equal(grades['plane-classic'], 'default', 'the blue Classic is the free baseline');
  assert.equal(grades['plane-gold2d'], 'epic');
  assert.equal(grades['plane-obsidian2d'], 'legend');
  assert.equal(planes[0].id, 'plane-classic', 'Classic leads the row');
  for (const p of planes) {
    assert.match(p.rest, /en:'[^']+',cn:'[^']+'/, p.id + ' is bilingual');
    assert.match(p.rest, /de:'[^']+',dc:'[^']+'/, p.id + ' has a description in both languages');
    const key = p.id.replace(/^plane-/, '');
    assert.ok(exists(`dist/assets/shop/planes/${key}.png`), `${key}.png ships`);
    assert.ok(fx.includes(key + ':'), `${key} has an animated style definition`);
    assert.ok(read('dist/plane-skin.js').includes(`['${key}'`), `${key} matches the in-game hangar style`);
  }
  assert.match(shop, /section\('plane'\)\+section\('trail'\)\+section\('cursor'\)\+section\('avatar'\)/,
    'the standalone trail section sits between aircraft and cursors');
  assert.ok(shop.indexOf("section('plane')") < shop.indexOf("section('cursor')"),
    'aircraft lead the catalogue');
});

test('grade prices and the Classic card saying it is already owned', () => {
  assert.match(points, /var PRICE=1000/);
  assert.match(points, /var EPIC_PRICE=3000/);
  assert.match(points, /var LEGEND_PRICE=5000/);
  assert.match(shop, /priceOf\(id\)/);
  assert.ok(!/price:[0-9]/i.test(shop), 'no per-product price in the catalogue script');
  assert.match(shop, /shop-price-owned/, 'the Classic card is marked owned in its bottom pill');
  assert.match(shop, /<span class="shop-state" aria-hidden="true"><\/span>/,
    'the restored top-right ribbon is rendered');
  assert.match(shop, /ribbon\.textContent=equipped\?t\('Equipped','装配中'\):''/,
    'the ribbon says 装配中 ONLY on the equipped card, never 已拥有');
  assert.match(shop, /ANNUAL VIP FREE|年VIP 免费/);
  assert.match(shop, /VIP FREE/);
  assert.match(shop, /annualVip/, 'the wallet shows the Annual VIP tier');
  assert.match(shop, /data-rarity="'\+rarityOf\(item\.id\)\+'"/, 'every card publishes its grade');
  assert.ok(!/shop-tier|data-tier=|tier:'vip'|tier:'annual'/.test(shop), 'no default/VIP tier badges');
});

test('aircraft stages show a propeller and a glow, but never a bundled flight trail', () => {
  assert.match(fx, /now\*\.005/, 'the propeller angle advances with time');
  assert.match(fx, /drawPropeller\(/, 'a three-blade propeller is drawn');
  assert.ok(!/drawTrail\(|trailPath\(|ribbon\(|trail:\s*\[/.test(fx),
    'trails are a separate product, not part of an aircraft preview');
  assert.match(fx, /drawGlow\(/, 'membership planes have a glow');
  assert.match(fx, /requestAnimationFrame/, 'one shared animation loop');
  assert.match(fx, /propellerAngle:function/, 'the live propeller angle is observable for verification');
  assert.match(fx, /prefers-reduced-motion: reduce/, 'reduced motion freezes the propeller');
  assert.match(fx, /data-plane-current/, 'the hangar stage follows the equipped plane');
  assert.ok(!/data-shop-plane-cover/.test(fx), 'the portal game cover stays a static authored illustration');
  assert.match(fx, /CanvasRenderingContext2D|\.getContext\('2d'\)/, 'canvas rendering');
  assert.ok(!/fetch\(|\/api\//.test(fx), 'no new network probe is added');
  assert.ok(!/dice|winRate|gameRules|\bengine\./i.test(fx), 'no gameplay rule is touched');
  assert.equal(fx.match(/var VERSION='([^']+)'/)[1], version);
});

test('the hangar panel, shared six-column grid and responsive stages are styled', () => {
  assert.match(css, /\.shop-hangar\{/);
  assert.match(css, /\.shop-plane-stage--hero\{/);
  assert.ok(!/\.shop-grid[^{]*\{[^}]*grid-template-columns/.test(css),
    'aircraft cards use the one shared six-column grid from site-shop.css');
  assert.match(css, /\.shop-card--plane \.shop-plane-stage\{height:98px;flex:none\}/,
    'the plane artwork matches the 98px cursor / avatar artwork box');
  assert.match(css, /@media\(max-width:520px\)/);
  assert.match(css, /\.shop-hangar-current \.shop-rarity\{/, 'the hangar badge follows the grade colour');
  assert.match(css, /\.shop-card--plane\{padding:30px 6px 10px\}/, 'plane cards keep the grade ribbon at the top');
  assert.ok(!/\.shop-tier/.test(css), 'no leftover tier badge styling');
  assert.match(css, /\.shop-current-plane\{/);
});

test('the shop and portal load the aircraft renderer before the catalogue', () => {
  assert.match(page, /site-plane\.css\?v=([^"']+)/);
  assert.match(page, /site-plane-fx\.js\?v=([^"']+)/);
  assert.equal(page.match(/site-plane\.css\?v=([^"']+)/)[1], version);
  assert.equal(page.match(/site-plane-fx\.js\?v=([^"']+)/)[1], version);
  assert.ok(page.indexOf('site-plane-fx.js') < page.indexOf('site-shop.js'),
    'the renderer is ready before the shop builds its cards');
  assert.ok(page.indexOf('site-points.js') < page.indexOf('site-plane-fx.js'),
    'the equipped plane is published before the renderer starts');
  assert.match(shop, /data-plane-current/, 'the hangar stage follows the equipped plane');
  assert.match(shop, /shop-hangar/);
  assert.match(portal, /site-plane-fx\.js\?v=/);
  assert.ok(!/data-shop-plane-cover/.test(portal), 'the portal cover never swaps to the equipped plane');
});

test('buying a plane really replaces the homepage aircraft but never the game covers', () => {
  assert.match(points, /data-shop-plane/, 'the equipped key is published on <html>');
  assert.match(points, /joyflock:plane-changed/, 'the change is announced');
  assert.match(app, /joyflock\.shop\.v1/, 'the game homepage reads the same wallet');
  assert.match(app, /style:shopPlaneStyle\|\|'classic'/, 'the hero uses the equipped style');
  assert.match(hangar, /joyflock:plane-changed/, 'the hangar keeps the hero in sync');
  assert.match(hangar, /typeof window!=='undefined'/, 'the hook is safe in a non-browser sandbox');
  assert.ok(!/kind:'frame'|shop-frame|data-shop-frame/.test(shop),
    'avatar frames are deliberately not sold here');
  assert.match(shop, /Avatar frames are not part of this shop/);
  assert.match(shop, /人物头像框暂不开放/);
});

test('no preview feature is introduced for aircraft', () => {
  assert.ok(!/预览|data-shop-preview|shop-preview|Preview as VIP/.test(shop));
  assert.ok(!/预览/.test(points));
  assert.ok(!/预览/.test(page));
  assert.match(shop, /scanFX\(/, 'the animated stage shows the equipped / selected plane, not a preview toggle');
});
