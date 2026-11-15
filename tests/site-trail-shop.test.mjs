import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import {activeTrailStyle, TRAIL_STYLES} from '../dist/shop-trail.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const exists = p => existsSync(resolve(root, p));

const points = read('dist/site-points.js');
const shop = read('dist/site-shop.js');
const fx = read('dist/site-trail-fx.js');
const planeFx = read('dist/site-plane-fx.js');
const css = read('dist/site-trail.css');
const page = read('dist/shop.html');
const scene = read('dist/scene.js');
const fallback = read('dist/fallback.js');
const resolver = read('dist/shop-trail.js');
const version = points.match(/var VERSION='([^']+)'/)?.[1];

/* Run the SHIPPED wallet so ownership, prices and the published trail key
   are exercised as behaviour rather than re-implemented by the test. */
function sandbox(initial) {
  const store = new Map(), attrs = {}, styles = {};
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
    CustomEvent: function () {}, setTimeout: () => 0, clearTimeout: () => {}, console
  });
  return {shop: win.__joyflockShop, points: win.__joyflockPoints, attrs, styles, store};
}

const trails = [...shop.matchAll(/\{id:'trail-([a-z]+)',kind:'trail',en:'([^']+)',cn:'([^']+)'/g)]
  .map(([, style, en, cn]) => ({style, en, cn}));

test('four trail products: free 默认 "no trail" + Starlight, Rainbow, Cloud', () => {
  assert.deepEqual(trails.map(t => t.style), ['none', 'star', 'rainbow', 'cloud']);
  assert.equal(trails[0].cn, '无拖尾');
  assert.equal(trails[1].cn, '星光尾迹');
  assert.equal(trails[2].cn, '彩虹尾迹');
  assert.equal(trails[3].cn, '云朵尾迹');
  assert.match(points, /'trail-none':'default','trail-star':'rare','trail-rainbow':'epic','trail-cloud':'legend'/);
  assert.match(shop, /section\('plane'\)\+section\('trail'\)\+section\('cursor'\)\+section\('avatar'\)/,
    'the trail row is separate from the aircraft row');
  assert.match(shop, /shop-grid--trails/);
  assert.match(shop, /trailStage\(/);
  assert.match(shop, /data-trail-style/);
  assert.match(shop, /Flight trails/);
  assert.match(shop, /飞行器拖尾/);
  assert.match(shop, /Trail replaced successfully/);
  assert.match(shop, /成功替换拖尾/);
  assert.match(shop, /Starlight \(Rare\), Rainbow \(Epic\) and Cloud \(Legendary\)/);
  assert.match(shop, /星光（稀有）、彩虹（史诗）、云朵（传说）/);
});

test('the wallet starts with NO trail, prices the three effects and publishes their keys', () => {
  const s = sandbox();
  assert.equal(s.shop.trailStyle('trail-none'), '', '默认 is no drawable style at all');
  assert.equal(s.shop.trailStyle('trail-star'), 'star');
  assert.equal(s.shop.trailStyle('trail-rainbow'), 'rainbow');
  assert.equal(s.shop.trailStyle('trail-cloud'), 'cloud');
  assert.equal(s.shop.trailStyle('cursor-star'), '');
  assert.equal(s.points.get().owned['trail-star'], true, 'the old free starter is kept');
  assert.equal(s.points.get().owned['trail-none'], true, 'the baseline is owned');
  assert.equal(s.points.get().equipped.trail, 'trail-none');
  assert.equal(s.attrs['data-shop-trail'], undefined, 'no trail is published for the baseline');
  assert.equal(s.shop.priceOf('trail-rainbow'), 3000);
  assert.equal(s.shop.priceOf('trail-cloud'), 5000);
  assert.equal(s.shop.freeFor('trail-rainbow'), false, 'a guest pays for Epic');

  const bought = s.shop.buy('trail-rainbow');
  assert.deepEqual({ok: bought.ok, cost: bought.cost}, {ok: true, cost: 3000});
  assert.equal(s.points.get().total, 7000);
  assert.equal(s.points.get().equipped.trail, 'trail-rainbow');
  assert.equal(s.attrs['data-shop-trail'], 'rainbow', 'the equipped trail really changes');
  assert.equal(s.shop.buy('trail-rainbow').already, true, 'an owned trail is never charged twice');

  const back = s.shop.buy('trail-star');
  assert.equal(back.cost, 0, 'switching back to the owned Starlight is free');
  assert.equal(s.attrs['data-shop-trail'], 'star');
  assert.equal(s.points.get().total, 7000);
  s.shop.reset('trail');
  assert.equal(s.points.get().equipped.trail, 'trail-none', 'restore default returns to NO trail');
  assert.equal(s.attrs['data-shop-trail'], undefined);
  const saved = JSON.parse(s.store.get('joyflock.shop.v1'));
  assert.equal(saved.equipped.trail, 'trail-none', 'the choice persists across reloads');
});

test('membership perks and Legendary pricing apply to trails too', () => {
  const guest = sandbox();
  assert.equal(guest.shop.buy('trail-cloud').cost, 5000);
  assert.equal(guest.points.get().total, 5000);

  const vip = sandbox();
  vip.points.set({vip: true, live: true});
  assert.equal(vip.shop.freeFor('trail-rainbow'), true);
  assert.equal(vip.shop.freeFor('trail-cloud'), false);
  assert.equal(vip.shop.buy('trail-rainbow').cost, 0, 'Epic is a VIP perk');
  assert.equal(vip.attrs['data-shop-trail'], 'rainbow');
  assert.equal(vip.points.get().total, 10000);

  const annual = sandbox();
  annual.points.set({annualVip: true, live: true});
  assert.equal(annual.shop.buy('trail-cloud').cost, 0, 'Legendary is an Annual VIP perk');
  assert.equal(annual.attrs['data-shop-trail'], 'cloud');
  assert.equal(annual.points.get().total, 10000);
});

test('the in-game renderer prefers a server appearance, then the equipped shop trail', () => {
  assert.deepEqual(TRAIL_STYLES, ['star', 'rainbow', 'cloud']);
  assert.equal(activeTrailStyle({member: true, flightTrail: 'rainbow'}), 'rainbow');
  assert.equal(activeTrailStyle({member: true, flightTrail: 'none'}), '',
    'a server "none" is not a drawable style');
  const previous = globalThis.document;
  globalThis.document = {documentElement: {getAttribute: k => k === 'data-shop-trail' ? 'cloud' : ''}};
  try {
    assert.equal(activeTrailStyle({member: true, flightTrail: 'rainbow'}), 'rainbow',
      'a verified appearance stays authoritative');
    assert.equal(activeTrailStyle({member: false, flightTrail: 'rainbow'}), 'cloud',
      'a local shop trail is used when the seat has no verified appearance');
    assert.equal(activeTrailStyle(null), 'cloud');
    globalThis.document = {documentElement: {getAttribute: () => 'bogus'}};
    assert.equal(activeTrailStyle(null), '', 'unknown styles are rejected');
  } finally {
    if (previous === undefined) delete globalThis.document;
    else globalThis.document = previous;
  }
  assert.match(resolver, /export function activeTrailStyle/);
  for (const source of [scene, fallback]) {
    assert.match(source, /import \{activeTrailStyle\} from '\.\/shop-trail\.js'/);
    assert.match(source, /activeTrailStyle\(owner\)/);
    assert.ok(!/owner\?\.member\)this\.cosmeticTrails\.emit/.test(source),
      'a locally equipped trail is no longer blocked by the member-only gate');
  }
});

test('trail cards have animated previews; aircraft cards and the hangar still have none', () => {
  assert.ok(exists('dist/site-trail-fx.js'));
  assert.ok(exists('dist/site-trail.css'));
  assert.match(fx, /var STYLES=\['star','rainbow','cloud'\]/);
  assert.match(fx, /if\(style==='none'\)\{drawPlane\(c,w,h,px,py,now\);return;\}/,
    'the 默认 "no trail" stage draws the plane but no effect');
  assert.match(css, /\.shop-trail-stage\[data-trail-style="none"\]::after/);
  assert.match(css, /\.shop-current-trail\[data-trail-dot=""\]/);
  assert.match(fx, /RAINBOW=\[/, 'the seven-colour ribbon');
  assert.match(fx, /drawTrail\(/);
  assert.match(fx, /requestAnimationFrame/);
  assert.match(fx, /prefers-reduced-motion/);
  assert.match(fx, /data-shop-plane/, 'the preview plane follows the equipped aircraft');
  assert.match(fx, /window\.__joyflockTrailFX=/);
  assert.ok(!/fetch\(|\/api\//.test(fx), 'no new network probe');
  assert.ok(!/dice|winRate|gameRules|\bengine\./i.test(fx), 'no gameplay rule is touched');
  assert.ok(!/grid-template-columns|max-width:760px/.test(css),
    'trail cards use the shared six-column grid, not a narrow three-card row');
  assert.match(css, /\.shop-card--trail \.shop-trail-stage\{height:98px;flex:none\}/);
  assert.match(css, /\.shop-trail-stage/);
  assert.match(css, /\.trail-fx-canvas/);
  assert.ok(!/drawTrail\(|trailPath\(|ribbon\(|data-trail-style/.test(planeFx),
    'the aircraft renderer still draws no trail');
  assert.match(planeFx, /No trail is drawn here/);
});

test('the shop page loads the trail renderer, and the whole site shares the cache key', () => {
  assert.equal(version, '20261112-gamelanes1');
  assert.equal(fx.match(/var VERSION='([^']+)'/)?.[1], version);
  assert.equal(shop.match(/var VERSION='([^']+)'/)?.[1], version);
  assert.match(page, /site-trail\.css\?v=20261112-gamelanes1/);
  assert.match(page, /site-trail-fx\.js\?v=20261112-gamelanes1/);
  assert.ok(page.indexOf('site-points.js') < page.indexOf('site-trail-fx.js'),
    'the wallet publishes the equipped trail before the previews start');
  assert.ok(page.indexOf('site-trail-fx.js') < page.indexOf('site-shop.js'),
    'the renderer is ready before the catalogue builds its cards');
  for (const p of ['dist/shop.html', 'dist/site-shop.js', 'dist/site-points.js', 'dist/site-trail-fx.js',
    'dist/site-plane-fx.js', 'dist/app.js', 'dist/portal/index.html', 'dist/index.html',
    'dist/table/index.html', 'dist/table/arcade.html', 'dist/membership.html',
    'dist/terms.html', 'dist/privacy.html', 'dist/contact.html'])
    assert.ok(read(p).includes('20261112-gamelanes1'), `${p} uses the new key`);
  assert.ok(!/20261111-ownedequip1/.test(page));
});
