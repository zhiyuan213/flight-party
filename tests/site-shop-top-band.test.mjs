/* The grade gradient belongs ONLY to the small header strip behind the
   rarity label. The user marked that ~46px band with a red rectangle and
   asked for the rest of the card to stay flat.

   Before this fix the linear tint faded out at 46% of the card height and a
   radial white glow reached 72%, so the artwork, name and Owned pill all sat
   on a blue wash. Both layers are now bounded in absolute pixels, which keeps
   the band the same size on tall desktop cards and short mobile cards.

   Later the flat near-black body (#080e22) was replaced by the SAME blue
   gradient as the hangar banner above (site-plane.css .shop-hangar). That is
   a third background layer, but it is the card BODY, not another header wash:
   the two bounded 46px layers above it are unchanged. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const css = read('dist/site-shop.css');
const page = read('dist/shop.html');
const points = read('dist/site-points.js');
const KEY = '20261112-gamelanes1';
const card = css.match(/\n\.shop-card\{[^}]*\}/)?.[0] || '';

test('the linear grade tint stops inside the ~46px header strip', () => {
  assert.ok(card, 'the .shop-card rule exists');
  assert.match(card, /linear-gradient\(180deg,var\(--shop-rarity-top\) 0,transparent 46px\)/,
    'the tint fades to nothing by 46px, not 46% of the card');
  assert.ok(!/transparent 46%/.test(card), 'no card-height-relative fade remains');
  const tint = card.match(/linear-gradient\(180deg,var\(--shop-rarity-top\)[^)]*\)/g) || [];
  assert.equal(tint.length, 1, 'exactly one linear grade tint layer');
  assert.ok(!/transparent \d+%/.test(tint[0]),
    'no grade tint reaches down into the artwork area');
  const linear = card.match(/linear-gradient\([^)]*\)/g) || [];
  assert.equal(linear.length, 2, 'one bounded grade tint + one blue body gradient');
});

test('the soft top glow is bounded by the same strip', () => {
  assert.match(card, /radial-gradient\(ellipse 78% 46px at 50% 0%,#ffffff0a,transparent 100%\)/,
    'the radial highlight has a 46px vertical radius');
  assert.ok(!/transparent 72%/.test(card), 'the old full-card radial wash is gone');
});

test('the card body is the hangar blue gradient, with only two bounded header layers', () => {
  assert.match(card, /background:[\s\S]*?linear-gradient\(150deg,#1a2750,#0e1734 72%\);/,
    'the last background layer is the hangar blue gradient');
  assert.ok(!/#080e22/.test(card), 'the old near-black body is gone');
  const layers = (card.match(/background:([\s\S]*?);/) || [])[1] || '';
  assert.equal((layers.match(/-gradient\(/g) || []).length, 3,
    'two 46px-bounded header layers + one blue body gradient');
  assert.match(css, /--shop-rarity-top:#[0-9a-f]{8}/,
    'the strip still reads the grade colour family');
});

test('the 50% yellow hover frame and the thin resting hairline are untouched', () => {
  assert.match(card, /border:1px solid var\(--shop-rarity-edge\)/);
  assert.match(card, /border-radius:16px/);
  const frame = css.match(/\.shop-card::after\{[^}]*\}/)?.[0] || '';
  assert.match(frame, /border:2px solid #ffd84d/);
  assert.ok(!/inset 0 0/.test(frame));
  assert.match(css, /\.shop-card:hover::after,\.shop-card:focus-visible::after\{opacity:\.5\}/);
  assert.ok(!/\.shop-card:hover,\.shop-card:focus-visible\{/.test(css),
    'the outer hairline is never hidden on hover');
});

test('the shop page loads the bumped CSS key', () => {
  assert.equal(points.match(/var VERSION='([^']+)'/)?.[1], KEY);
  assert.match(page, new RegExp('site-shop\\.css\\?v=' + KEY));
  const stale = [...page.matchAll(/\?v=(20261112-[a-z0-9]+)/g)].map(m => m[1]).filter(k => k !== KEY);
  assert.deepEqual(stale, [], 'no stale 20261112 batch key remains on the page');
});
