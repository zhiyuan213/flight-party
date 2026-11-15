/* The resting card outline should read like the supplied reference: a bright
   grade-coloured rim with a soft upward halo. Constraints carried over from
   earlier rounds:

   - it must stay ONE 1px stroke (the user already asked for a THINNER edge),
   - the halo must be blurred box-shadow, never a sharp second ring (a second
     ring was the "extra line inside the frame" complaint),
   - hover must leave the rim AND the blurred halo exactly as they are; only
     the 50%-opacity gold inner frame fades in,
   - the redeem dialog keeps the quieter --shop-rarity-line tone. */
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

test('all three grades define a brighter outline tone, derived from the grade colour', () => {
  const expected = {rare: '#7cc7ff', epic: '#d5b2ff', legend: '#ffd68a'};
  for (const [grade, edge] of Object.entries(expected)) {
    const rule = css.match(new RegExp('\\[data-rarity="' + grade + '"\\]\\{[^}]*\\}'))?.[0] || '';
    assert.match(rule, new RegExp('--shop-rarity-edge:' + edge), grade + ' has its lit rim colour');
    assert.match(rule, /--shop-rarity-line:#[0-9a-f]{8}/, grade + ' keeps the quieter dialog tone');
  }
});

test('the card rim is one 1px stroke with a blurred, upward-weighted halo', () => {
  assert.ok(card, 'the .shop-card rule exists');
  assert.match(card, /border:1px solid var\(--shop-rarity-edge\)/);
  assert.match(card, /0 -2px 18px -4px var\(--shop-rarity-glow\)/,
    'the halo is strongest above the top edge, like the reference');
  assert.match(card, /0 0 12px -1px var\(--shop-rarity-glow\)/,
    'a second, tighter blur lights the sides');
  assert.ok(!/0 0 0 1px|0 0 0 2px/.test(card),
    'no sharp ring is stacked on the border');
  assert.ok(!/border:2px|border:3px/.test(card), 'the rim never gets thicker');
});

test('hover keeps the blue halo and the grade rim completely unchanged', () => {
  assert.ok(!/\.shop-card:hover,\.shop-card:focus-visible\{/.test(css),
    'no shared hover rule swaps border colour or box-shadow');
  assert.ok(!/border-color:transparent/.test(css), 'the rim is never hidden');
  assert.ok(!/0 10px 22px #0008/.test(css), 'the halo is never replaced');
  assert.ok(!/\.shop-card:hover\{transform:translateY/.test(css), 'the card never lifts');
  assert.match(card, /0 -2px 18px -4px var\(--shop-rarity-glow\)/,
    'the upward-weighted halo survives hover');
  assert.match(card, /0 0 12px -1px var\(--shop-rarity-glow\)/,
    'the tighter side blur survives hover');
  assert.ok(!/\.shop-card:hover\[data-equipped="1"\]/.test(css),
    'equipped cards behave the same on hover');
});

test('equipped cards glow stronger instead of adding a second line', () => {
  const equipped = css.match(/\.shop-card\[data-equipped="1"\]\{[^}]*\}/)?.[0] || '';
  assert.match(equipped, /0 0 16px 0 var\(--shop-rarity-glow\)/);
  assert.ok(!/0 0 0 1px/.test(equipped), 'the sharp equipped ring is gone');
});

test('earlier visual fixes survive: 46px header strip, single yellow frame, dialog tone', () => {
  assert.match(card, /linear-gradient\(180deg,var\(--shop-rarity-top\) 0,transparent 46px\)/);
  assert.match(card, /radial-gradient\(ellipse 78% 46px at 50% 0%,#ffffff0a,transparent 100%\)/);
  const frame = css.match(/\.shop-card::after\{[^}]*\}/)?.[0] || '';
  assert.match(frame, /border:2px solid #ffd84d/);
  assert.ok(!/inset 0 0/.test(frame));
  assert.match(css, /\.shop-buy\{[\s\S]*?border:1px solid var\(--shop-rarity-line\)/);
});

test('the shop page loads the bumped CSS key', () => {
  assert.equal(points.match(/var VERSION='([^']+)'/)?.[1], KEY);
  assert.match(page, new RegExp('site-shop\\.css\\?v=' + KEY));
  const stale = [...page.matchAll(/\?v=(20261112-[a-z0-9]+)/g)].map(m => m[1]).filter(k => k !== KEY);
  assert.deepEqual(stale, [], 'no stale 20261112 batch key remains on the page');
});
