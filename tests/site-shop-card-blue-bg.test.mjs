/* The shop cards now share the hangar banner's blue gradient.
   The user pointed from the blue "Ready for your next flight" banner above
   down to a card body and asked for that body to use the blue above, for
   ALL cards in every section (aircraft, trails, cursors, avatars, the four
   board games, billiards etc.).

   The blue must be the SAME gradient as .shop-hangar, not a lookalike, and
   the earlier visual fixes (46px grade strip, lit rim, half-opacity yellow
   hover frame, six-up grid) must survive. The shared cache key is deliberately
   NOT bumped: bumping it would break three other tests and ~20 hard-coded
   asset URLs, so the user gets the new CSS with Ctrl+F5. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const shopCss = read('dist/site-shop.css');
const planeCss = read('dist/site-plane.css');
const shopJs = read('dist/site-shop.js');
const page = read('dist/shop.html');
const points = read('dist/site-points.js');
const KEY = '20261112-gamelanes1';

const card = shopCss.match(/\n\.shop-card\{[^}]*\}/)?.[0] || '';
const hangar = planeCss.match(/\n\.shop-hangar\{[^}]*\}/)?.[0] || '';
const HANGAR_BLUE = 'linear-gradient(150deg,#1a2750,#0e1734 72%)';

function backgroundLayers(rule) {
  return (rule.match(/background:([\s\S]*?);/) || [])[1] || '';
}

test('the hangar banner really is the blue gradient we copy', () => {
  assert.ok(hangar, '.shop-hangar exists in site-plane.css');
  assert.ok(hangar.includes('background:' + HANGAR_BLUE + ';'),
    'the reference blue gradient is unchanged');
});

test('every card body uses exactly that blue, not a lookalike or the old near-black', () => {
  assert.ok(card, '.shop-card exists in site-shop.css');
  const layers = backgroundLayers(card);
  assert.ok(layers.trimEnd().endsWith(HANGAR_BLUE),
    'the LAST (bottom) background layer is the hangar blue gradient');
  assert.ok(!/#080e22/.test(card), 'the old near-black #080e22 body is gone');
  assert.ok(!/#[0-9a-f]{6};/.test(layers),
    'the card background has no solid colour layer left');
  assert.ok(!/style="[^"]*background/i.test(shopJs),
    'no inline per-card background can override the shared blue');
});

test('all sections share one .shop-card rule, so all 59 cards change together', () => {
  assert.equal((shopCss.match(/\n\.shop-card\{/g) || []).length, 1,
    'a single .shop-card base rule, no per-section background overrides');
  const start = shopJs.indexOf('function cardHtml');
  const end = shopJs.indexOf('function gridHtml', start);
  const cardHtml = start >= 0 ? shopJs.slice(start, end > start ? end : start + 1400) : '';
  assert.ok(cardHtml.includes('class="shop-card'), 'every card uses the shared class');
  assert.ok(!/background/.test(cardHtml), 'card template carries no background of its own');
  assert.match(shopCss, /\.shop-grid\{display:grid;grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/,
    'the six-up grid is unchanged');
});

test('the earlier header-strip, rim and hover-frame fixes survive', () => {
  assert.match(card, /linear-gradient\(180deg,var\(--shop-rarity-top\) 0,transparent 46px\)/);
  assert.match(card, /radial-gradient\(ellipse 78% 46px at 50% 0%,#ffffff0a,transparent 100%\)/);
  assert.match(card, /border:1px solid var\(--shop-rarity-edge\)/);
  assert.match(card, /border-radius:16px/);
  assert.match(card, /color:var\(--jp-ink\)/,
    'light card text is kept for contrast on the blue body');
  const frame = shopCss.match(/\.shop-card::after\{[^}]*\}/)?.[0] || '';
  assert.match(frame, /border:2px solid #ffd84d/);
  assert.match(shopCss, /\.shop-card:hover::after,\.shop-card:focus-visible::after\{opacity:\.5\}/,
    'the hover frame is half opaque');
  assert.equal((backgroundLayers(card).match(/-gradient\(/g) || []).length, 3,
    'two bounded 46px header layers + one blue body gradient');
});

test('the shared cache key is NOT bumped by this visual-only change', () => {
  assert.equal(points.match(/var VERSION='([^']+)'/)?.[1], KEY);
  assert.match(page, new RegExp('site-shop\\.css\\?v=' + KEY));
  assert.match(page, new RegExp('site-plane\\.css\\?v=' + KEY));
  const stale = [...page.matchAll(/\?v=(20261112-[a-z0-9]+)/g)].map(m => m[1]).filter(k => k !== KEY);
  assert.deepEqual(stale, [], 'no stale 20261112 batch key remains on the shop page');
});

test('the blue is visibly lighter than the retired near-black body', () => {
  const lum = hex => {
    const n = parseInt(hex.slice(1), 16);
    return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  };
  assert.ok(lum('#1a2750') > lum('#080e22') + 20,
    'the new body is meaningfully brighter, i.e. actually blue');
  assert.ok(lum('#0e1734') > lum('#080e22'),
    'even the dark end of the gradient is brighter than the old body');
});
