/* User feedback 2026-11-13: 「这个效果错了，鼠标移动上去，外边框不动，
   内边框的金色显示50%透明度」.

   Two independent requirements, both different from the earlier 20:02
   "hover501" experiment (which only dimmed the inner frame but STILL hid and
   lifted the outer rim) and from its 20:11 "frameback1" revert:

     1. the OUTER 1px grade rim, its blurred halo, its top highlight and the
        card's position must be byte-for-byte the same before and after hover;
     2. the gold INNER frame (::after) fades in at 50% opacity.

   Nothing else in the shop — grades, equipped glow, dialog, prices — changes. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const css = read('dist/site-shop.css');
const page = read('dist/shop.html');
const points = read('dist/site-points.js');
const KEY = '20261112-gamelanes1';
const card = css.match(/\n\.shop-card\{[^}]*\}/)?.[0] || '';
const frame = css.match(/\.shop-card::after\{[^}]*\}/)?.[0] || '';

test('the outer rim is a static 1px grade stroke with its blurred halo', () => {
  assert.ok(card, 'the .shop-card base rule exists');
  assert.match(card, /border:1px solid var\(--shop-rarity-edge\)/);
  assert.match(card, /0 -2px 18px -4px var\(--shop-rarity-glow\)/);
  assert.match(card, /0 0 12px -1px var\(--shop-rarity-glow\)/);
  assert.match(card, /inset 0 1px 0 #ffffff0d/);
  assert.ok(!/transform:/.test(card), 'the resting card has no transform');
});

test('NO hover or focus rule changes the outer border, its shadow or its position', () => {
  assert.ok(!/\.shop-card:hover,\.shop-card:focus-visible\{/.test(css),
    'the shared hover/focus override that used to hide the rim is gone');
  assert.ok(!/\.shop-card:hover\{/.test(css),
    'no standalone hover rule remains');
  assert.ok(!/\.shop-card:hover\[data-equipped/.test(css),
    'no equipped hover override remains');
  assert.ok(!/border-color:transparent/.test(css),
    'the grade hairline never turns transparent');
  assert.ok(!/0 10px 22px #0008/.test(css),
    'the blue halo is never swapped for a plain black shadow');
  assert.ok(!/translateY\(-2px\)/.test(css),
    'the card never lifts on hover');
});

test('the gold inner frame is the ONLY thing that changes, at 50% opacity', () => {
  assert.ok(frame, 'the ::after frame rule exists');
  assert.match(frame, /opacity:0/, 'hidden until hovered');
  assert.match(frame, /transition:opacity \.18s/, 'the fade is preserved');
  assert.match(frame, /inset:3px/, 'still inset from the outer rim');
  assert.match(frame, /border:2px solid #ffd84d/, 'the gold stroke itself is unchanged');
  assert.match(frame, /box-shadow:0 0 12px #ffd84d55/, 'the soft glow is unchanged');
  assert.ok(!/inset 0 0/.test(frame), 'no extra inner band');
  assert.match(css, /\.shop-card:hover::after,\.shop-card:focus-visible::after\{opacity:\.5\}/,
    'pointer AND keyboard focus share one 50% reveal');
  assert.ok(!/\.shop-card:hover::after,\.shop-card:focus-visible::after\{opacity:1\}/.test(css),
    'the fully opaque reveal is gone');
});

test('keyboard focus keeps its accessible outline without moving the rim', () => {
  const focus = css.match(/\.shop-card:focus-visible\{[^}]*\}/)?.[0] || '';
  assert.ok(focus, 'the focus rule exists');
  assert.match(focus, /outline:2px solid var\(--shop-rarity\)/);
  assert.ok(!/border-color|transform|box-shadow/.test(focus),
    'focus changes only the outside outline');
});

test('equipped and reduced-motion behaviour is untouched', () => {
  const equipped = css.match(/\.shop-card\[data-equipped="1"\]\{[^}]*\}/)?.[0] || '';
  assert.match(equipped, /0 0 16px 0 var\(--shop-rarity-glow\)/);
  assert.match(css, /\.shop-card,\.shop-card::after\{transition:none\}/);
});

test('no other stylesheet overrides the shop card hover rim', () => {
  const files = readdirSync(resolve(root, 'dist')).filter(f => f.endsWith('.css') && f !== 'site-shop.css');
  const offenders = files.filter(f => /\.shop-card:hover/.test(read('dist/' + f)));
  assert.deepEqual(offenders, [], 'site-shop.css is the single source of truth');
});

test('the shared cache key is unchanged (Ctrl+F5 delivers the new CSS)', () => {
  assert.equal(points.match(/var VERSION='([^']+)'/)?.[1], KEY);
  assert.match(page, new RegExp('site-shop\\.css\\?v=' + KEY));
});
