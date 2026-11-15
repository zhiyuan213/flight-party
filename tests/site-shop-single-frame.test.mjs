/* Hover keeps the OUTER rim untouched and fades in ONE half-opacity gold
   inner frame. Regression guard for the "外边框不动，内边框的金色显示50%透明度"
   report: hover used to hide the 1px grade hairline, lift the whole card and
   swap out the blue halo, while the inner frame stayed fully opaque. */
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

test('the resting card still has its single 1px grade hairline', () => {
  assert.match(css, /\.shop-card\{[^}]*border:1px solid var\(--shop-rarity-edge\)/);
  assert.match(css, /\.shop-card\{[^}]*inset 0 1px 0 #ffffff0d/,
    'the resting highlight is unchanged');
});

test('hover and keyboard focus leave the outer rim exactly where it is', () => {
  assert.ok(!/\.shop-card:hover,\.shop-card:focus-visible\{/.test(css),
    'no shared hover rule overrides border colour or box-shadow');
  assert.ok(!/\.shop-card:hover\{transform:translateY/.test(css),
    'no lift moves the outer border');
  assert.ok(!/border-color:transparent/.test(css),
    'the grade hairline is never hidden on hover');
  assert.ok(!/0 10px 22px #0008/.test(css),
    'the blue grade halo is never swapped out on hover');
});

test('the yellow inner frame is a single stroke with no inner glow band', () => {
  const frame = css.match(/\.shop-card::after\{[^}]*\}/)?.[0] || '';
  assert.ok(frame, 'the ::after frame rule exists');
  assert.match(frame, /border:2px solid #ffd84d/);
  assert.match(frame, /inset:3px/);
  assert.ok(!/inset 0 0/.test(frame),
    'no inset shadow paints a soft green band along the inside of the border');
  assert.ok(!/#b9ff6377/.test(css), 'the green inset colour is gone entirely');
  assert.match(frame, /box-shadow:0 0 12px #ffd84d55/,
    'only a soft outward glow remains');
});

test('the gold inner frame shows at 50% opacity on hover and keyboard focus', () => {
  assert.match(css, /\.shop-card:hover::after,\.shop-card:focus-visible::after\{opacity:\.5\}/,
    'pointer AND keyboard focus share the same 50% reveal');
  assert.ok(!/\.shop-card:hover::after,\.shop-card:focus-visible::after\{opacity:1\}/.test(css),
    'the fully opaque frame is gone');
  const frame = css.match(/\.shop-card::after\{[^}]*\}/)?.[0] || '';
  assert.match(frame, /opacity:0/, 'the inner frame is hidden until hovered');
  assert.match(frame, /transition:opacity \.18s/, 'the fade is preserved');
});

test('hover does not drop the top highlight or the equipped glow', () => {
  assert.match(css, /\.shop-card\{[^}]*inset 0 1px 0 #ffffff0d/,
    'the resting highlight stays visible while hovered');
  const equipped = css.match(/\.shop-card\[data-equipped="1"\]\{[^}]*\}/)?.[0] || '';
  assert.match(equipped, /0 0 16px 0 var\(--shop-rarity-glow\)/,
    'an equipped card keeps its stronger glow while hovered');
  assert.ok(!/\.shop-card:hover\[data-equipped="1"\]/.test(css),
    'no hover override reintroduces or removes the equipped ring');
});

test('the shop page loads the shared CSS key (no bump for this visual-only fix)', () => {
  assert.equal(points.match(/var VERSION='([^']+)'/)?.[1], KEY);
  assert.match(page, new RegExp('site-shop\\.css\\?v=' + KEY));
  const stale = [...page.matchAll(/\?v=(20261112-[a-z0-9]+)/g)].map(m => m[1]).filter(k => k !== KEY);
  assert.deepEqual(stale, [], 'no stale 20261112 batch key remains on the page');
});
