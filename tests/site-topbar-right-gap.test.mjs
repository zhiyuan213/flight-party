import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const chrome = read('dist/site-chrome.css');
const points = read('dist/site-points.css');
const fullscreen = read('dist/site-fullscreen.css');

/* 2026-11-15 11:59 · The right-hand header cluster used to leave a large
   empty tail: the desktop guest reservation (479px) still budgeted a register
   button that no longer exists in any shell HTML, and the topbar's 2.5vw right
   padding added ~47px on a 1920px screen. Both are retired here. The reserved
   width must equal the REAL content width at every breakpoint, otherwise the
   leftover shows up as dead space on the right instead of at the left where
   margin-left:auto is supposed to put it. */

/* Callers pass an already-escaped selector fragment. */
const width = (css, selector) => {
  const m = css.match(new RegExp(selector + '\\{width:(\\d+)px\\}'));
  assert.ok(m, `missing ${selector} reservation`);
  return Number(m[1]);
};

const desktop = points.slice(0, points.indexOf('@media(max-width:760px)'));
const bp = (max) => {
  const start = points.indexOf(`@media(max-width:${max}px)`);
  assert.ok(start > 0, `${max}px breakpoint exists`);
  return points.slice(start, points.indexOf('@media', start + 10) < 0 ? undefined : points.indexOf('@media', start + 10));
};

test('desktop right padding is 16px, smaller breakpoints stay 16/12/4', () => {
  assert.match(chrome, /body>\.topbar\{[\s\S]{0,320}?padding:0 16px 0 var\(--chrome-pad\);/,
    'only the RIGHT padding is tightened; the brand keeps its 2.5vw indent');
  assert.match(chrome, /@media\(max-width:920px\)\{[\s\S]{0,120}?body>\.topbar\{padding:0 16px;gap:18px\}/);
  assert.match(chrome, /@media\(max-width:600px\)\{[\s\S]{0,160}?body>\.topbar\{height:var\(--chrome-height\);padding:0 12px;gap:10px\}/);
  assert.match(chrome, /body>\.topbar\{gap:3px;padding:0 4px\}/);
  /* The shared variable still drives the left padding and the footer. */
  assert.match(chrome, /--chrome-pad:2\.5vw;/);
  assert.match(chrome, /body:not\(\.playing\)>footer\{[\s\S]{0,200}?padding:7px var\(--chrome-pad\)/);
});

test('every desktop cluster reservation equals its real content width', () => {
  const guest = width(desktop, '\\.topbar \\.top-actions');
  const signed = width(desktop, 'body\\.chrome-signed>\\.topbar \\.top-actions');
  assert.equal(guest, 75 + 88 + 96 + 92 + 3 * 10, 'language + account + points + fullscreen');
  assert.equal(signed, 75 + 112 + 96 + 92 + 3 * 10, 'wider nickname only');
  assert.equal(signed - guest, 24, 'the only difference is the 24px nickname slot');
  assert.ok(!points.includes('width:479px'), 'the retired register slot must never come back');
  assert.match(points, /guest  75 \+ 88 \+ 96 \+ 92 \+ 3\*10 = 381/);
});

test('narrow breakpoint reservations also match their content', () => {
  const at760 = bp(760), at600 = bp(600), at480 = bp(480);
  assert.equal(width(at760, '\\.topbar \\.top-actions'), 75 + 88 + 88 + 92 + 3 * 10);
  assert.equal(width(at760, 'body\\.chrome-signed>\\.topbar \\.top-actions'), 75 + 96 + 88 + 92 + 3 * 10);
  assert.equal(width(at600, '\\.topbar \\.top-actions'), 64 + 76 + 82 + 42 + 3 * 6);
  assert.equal(width(at600, 'body\\.chrome-signed>\\.topbar \\.top-actions'), 64 + 84 + 82 + 42 + 3 * 6);
  /* 480px: the fullscreen stylesheet overrides the guest budget to 218px;
     the signed-in budget must follow the same tightened pills, not the old 266. */
  assert.equal(width(at480, 'body\\.chrome-signed>\\.topbar \\.top-actions'), 44 + 62 + 62 + 38 + 3 * 4);
  assert.equal(width(at480, '\\.topbar \\.top-actions'), 218, 'guest uses the same 480px budget');
  assert.match(fullscreen, /body>header\.topbar \.top-actions\{gap:4px;width:218px\}/);
  assert.equal(218, 44 + 62 + 62 + 38 + 3 * 4, 'guest 480px budget');
});

test('no shell page still renders the removed register button', () => {
  for (const p of ['dist/portal/index.html', 'dist/membership.html', 'dist/terms.html',
    'dist/privacy.html', 'dist/contact.html', 'dist/shop.html']) {
    assert.ok(!read(p).includes('id="chrome-register"'), `${p}: no register button to reserve`);
  }
});

test('all three changed stylesheets are cache-busted without bumping their keys', () => {
  const files = ['dist/portal/index.html', 'dist/index.html', 'dist/table/index.html',
    'dist/table/arcade.html', 'dist/membership.html', 'dist/terms.html',
    'dist/privacy.html', 'dist/contact.html', 'dist/shop.html'];
  const names = ['site-chrome\\.css', 'site-points\\.css', 'portal-editorial\\.css'];
  let checked = 0;
  for (const f of files) {
    const text = read(f);
    for (const name of names) {
      const ref = text.match(new RegExp(name + '\\?v=[^"\'&]+'));
      if (!ref) continue;
      assert.match(text, new RegExp(name + '\\?v=[^"\'&]+&d=20261115-topbar1'),
        `${f}: ${name} pulls the rebuilt stylesheet`);
      checked++;
    }
  }
  assert.equal(checked, 16, 'the three frozen keys stay, only &d= changes');
});
