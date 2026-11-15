import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const shop = read('dist/site-shop.js');
const fx = read('dist/site-plane-fx.js');
const points = read('dist/site-points.js');
const page = read('dist/shop.html');
const version = fx.match(/var VERSION='([^']+)'/)?.[1];

/* Run the SHIPPED aircraft renderer against a tiny DOM. requestAnimationFrame
   is a stub, so no canvas drawing happens: refresh() is the logic under test. */
function sandbox(equipped) {
  const attrs = o => ({
    getAttribute(k) {return Object.prototype.hasOwnProperty.call(this._a, k) ? this._a[k] : null;},
    setAttribute(k, v) {this._a[k] = String(v);}
  });
  const host = a => Object.assign({_a: a, append() {}, isConnected: true}, attrs());
  const hero = host({'data-plane-showcase': 'obsidian2d', 'data-plane-style': 'obsidian2d'});
  const thumb = host({'data-plane-current': '', 'data-plane-style': 'classic'});
  const html = host({'data-shop-plane': equipped});
  const lists = {
    '[data-plane-style]': [hero, thumb],
    '[data-plane-current]': [thumb],
    '[data-plane-showcase]': [hero]
  };
  const canvas = () => ({className: '', width: 0, height: 0, setAttribute() {}, getContext() {return {};}});
  const doc = {
    readyState: 'complete', hidden: false, documentElement: html, body: host({}),
    createElement: canvas,
    querySelectorAll: sel => lists[sel] || [],
    addEventListener() {}
  };
  const g = {
    document: doc, matchMedia: () => ({matches: false}),
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    addEventListener() {},
    Image: function () {this.complete = true; this.naturalWidth = 1; this.src = '';}
  };
  g.window = g;
  runInNewContext(fx, g, {filename: 'site-plane-fx.js'});
  return {fx: g.window.__joyflockPlaneFX, hero, thumb, html};
}

test('the hangar poster is a display default, not a new owned product', () => {
  assert.match(shop, /shop-plane-stage--hero" data-plane-showcase="obsidian2d" data-plane-style="obsidian2d"/);
  const heroTag = shop.match(/<span class="shop-plane-stage shop-plane-stage--hero"[^>]*>/)?.[0] || '';
  assert.ok(!/data-plane-current/.test(heroTag), 'the poster no longer claims to be the equipped plane');
  assert.match(shop, /data-plane-current data-plane-style="'\+esc\(API\.planeStyle\(id\)\)/,
    'the small current-loadout thumbnail still shows the real equipped plane');
  assert.match(fx, /data-plane-showcase/);
  assert.match(fx, /var show=k==='classic'\?featured:k/, 'other equipped aircraft take over the poster');
  assert.match(points, /var DEFAULT_PLANE='plane-classic'/);
  assert.match(points, /'plane-obsidian2d':'legend'/);
  assert.match(points, /var LEGEND_PRICE=5000/);
  assert.match(points, /var EPIC_PRICE=3000/);
  assert.match(points, /legend:\{price:LEGEND_PRICE,perk:'annual'\}/,
    'the Obsidian Falcon still costs 5,000 as Legendary');
  assert.ok(!/data-plane-showcase/.test(points), 'the wallet knows nothing about a poster');
});

test('refresh(): Classic shows the Falcon, a purchase follows the plane, reset returns to the Falcon', () => {
  const s = sandbox('classic');
  assert.equal(s.fx.version, version);
  assert.ok(s.fx.styles.includes('obsidian2d'));
  assert.equal(s.hero.getAttribute('data-plane-style'), 'obsidian2d', 'poster shows the featured plane');
  assert.equal(s.thumb.getAttribute('data-plane-style'), 'classic', 'loadout thumbnail stays truthful');

  s.html.setAttribute('data-shop-plane', 'cloud2d');
  s.fx.refresh();
  assert.equal(s.fx.current(), 'cloud2d');
  assert.equal(s.hero.getAttribute('data-plane-style'), 'cloud2d', 'a bought plane takes over the poster');
  assert.equal(s.thumb.getAttribute('data-plane-style'), 'cloud2d');

  s.html.setAttribute('data-shop-plane', 'obsidian2d');
  s.fx.refresh();
  assert.equal(s.hero.getAttribute('data-plane-style'), 'obsidian2d');

  s.html.setAttribute('data-shop-plane', 'classic');
  s.fx.refresh();
  assert.equal(s.hero.getAttribute('data-plane-style'), 'obsidian2d', 'reset restores the poster default');
  assert.equal(s.thumb.getAttribute('data-plane-style'), 'classic');
});

test('every other plane style wins over the showcase, including an invalid key', () => {
  for (const k of ['gold2d', 'night2d', 'aurora2d']) {
    const s = sandbox(k);
    assert.equal(s.fx.current(), k);
    assert.equal(s.hero.getAttribute('data-plane-style'), k);
  }
  const unknown = sandbox('nonsense');
  assert.equal(unknown.fx.current(), 'classic');
  assert.equal(unknown.hero.getAttribute('data-plane-style'), 'obsidian2d');
});

test('the poster change ships on the same bumped cache key', () => {
  assert.equal(version, '20261112-gamelanes1');
  assert.match(page, new RegExp('site-plane-fx\\.js\\?v=' + version));
  assert.match(page, new RegExp('site-shop\\.js\\?v=' + version));
  assert.equal(points.match(/var VERSION='([^']+)'/)?.[1], version);
  assert.equal(shop.match(/var VERSION='([^']+)'/)?.[1], version);
  assert.ok(!/20261112-grid6/.test(page));
});
