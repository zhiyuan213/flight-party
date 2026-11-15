/* User feedback 2026-11-13: 「下面提示语，下面完全看不到，放到我指定的位置」
   The red arrow in the screenshot points UP from the lower sections into the
   open area above the cards. The元素 is the wallet's short notice toast
   ("成功替换头像"), which site-points.js appends to <body> and pins to
   bottom:26px — easy to miss at the bottom of a long shop page.

   Fix is SCOPED TO THE SHOP PAGE ONLY: site-shop.css lifts .jp-toast into the
   upper 26% of the viewport. The shared site-points.css baseline stays
   byte-for-byte unchanged, so the other 14 pages keep their bottom notice. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const css = read('dist/site-shop.css');
const base = read('dist/site-points.css');
const page = read('dist/shop.html');
const points = read('dist/site-points.js');
const KEY = '20261112-gamelanes1';

test('the shared wallet notice keeps its bottom placement on the other pages', () => {
  const rule = base.match(/\.jp-toast\{[^}]*\}/)?.[0] || '';
  assert.ok(rule, 'the shared .jp-toast rule exists');
  assert.match(rule, /position:fixed;left:50%;bottom:26px/);
  assert.match(rule, /z-index:9999/);
  assert.match(base, /\.jp-toast\[data-show="1"\]\{opacity:1;transform:translateX\(-50%\)\}/);
  assert.ok(!/body:has/.test(base), 'no shop-specific rule leaked into the shared CSS');
});

test('the shop page lifts only its own notice into the upper area', () => {
  const rule = css.match(/body:has\(\.shop-page\) \.jp-toast\{[^}]*\}/)?.[0] || '';
  assert.ok(rule, 'the shop-scoped toast rule exists');
  assert.match(rule, /top:26%/, 'the notice sits in the upper quarter of the viewport');
  assert.match(rule, /bottom:auto/, 'the bottom pin is released');
  assert.match(rule, /transform:translateX\(-50%\) translateY\(-10px\)/,
    'the hidden state now slides in from above');
});

test('the shown state resets the vertical offset (scoped rule must beat [data-show])', () => {
  const shown = css.match(/body:has\(\.shop-page\) \.jp-toast\[data-show="1"\]\{[^}]*\}/)?.[0] || '';
  assert.ok(shown, 'a scoped [data-show="1"] override is required: the scoped base rule is more specific than the shared [data-show] rule');
  assert.match(shown, /transform:translateX\(-50%\)/);
  assert.ok(!/translateY/.test(shown), 'no residual -10px offset while visible');
});

test('the override is scoped, never a global .jp-toast rewrite', () => {
  assert.match(css, /body:has\(\.shop-page\)/);
  assert.ok(!/^\.jp-toast\{/m.test(css), 'no unscoped .jp-toast rule in the shop CSS');
  const iPoints = page.indexOf('site-points.css'), iShop = page.indexOf('site-shop.css');
  assert.ok(iPoints >= 0 && iShop > iPoints,
    'site-shop.css loads after site-points.css so the override wins');
});

test('the scope hook and the toast node match in the real DOM', () => {
  assert.match(page, /<main class="shop-page" id="shop-root">/, 'the shop page has the .shop-page hook');
  assert.match(points, /tag\('div','jp-toast'\)/);
  assert.match(points, /document\.body\.append\(toastNode\)/,
    'the toast is a body child, so body:has(.shop-page) can match it');
});

test('the shared cache key is unchanged (Ctrl+F5 delivers the new CSS)', () => {
  assert.equal(points.match(/var VERSION='([^']+)'/)?.[1], KEY);
  assert.match(page, new RegExp('site-shop\\.css\\?v=' + KEY));
  assert.match(page, new RegExp('site-points\\.css\\?v=' + KEY));
});
