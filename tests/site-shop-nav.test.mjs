import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const exists = p => existsSync(resolve(root, p));

const shell = [
  'dist/portal/index.html', 'dist/membership.html', 'dist/terms.html',
  'dist/privacy.html', 'dist/contact.html', 'dist/shop.html'
];
const navOf = p => read(p).match(/<nav>([\s\S]*?)<\/nav>/)?.[1] || '';
const version = read('dist/site-points.js').match(/var VERSION='([^']+)'/)?.[1];

test('every shell page has a bilingual Shop link right after Games', () => {
  assert.ok(exists('dist/shop.html'), 'the destination page ships');
  for (const p of shell) {
    const nav = navOf(p);
    assert.equal((nav.match(/<a /g) || []).length, 2, `${p}: exactly two nav links`);
    assert.match(nav, /href="\/"[^>]*>[\s\S]*?lang-en">Games<[\s\S]*?lang-cn">游戏/, `${p}: Games first`);
    assert.match(nav, /<a href="\/shop\.html" class="nav-shop[^"]*"><span class="lang-en">Shop<\/span><span class="lang-cn">商城<\/span><\/a>/,
      `${p}: the second link opens the shop and is bilingual`);
    assert.ok(nav.indexOf('href="/"') < nav.indexOf('href="/shop.html"'),
      `${p}: Shop sits immediately to the right of Games`);
    assert.ok(!/href="\/shop\.html"[^>]*target=/.test(nav), `${p}: same-tab navigation`);
  }
});

test('the active pill follows the current section', () => {
  const portal = navOf('dist/portal/index.html');
  assert.match(portal, /href="\/" class="active"/, 'portal highlights Games');
  assert.ok(!/nav-shop active/.test(portal), 'Shop is not active on the portal');
  const shop = navOf('dist/shop.html');
  assert.match(shop, /class="nav-shop active"/, 'the shop highlights Shop');
  assert.equal((shop.match(/\bactive\b/g) || []).length, 1, 'only one active pill');
  for (const p of shell.slice(1, 5)) {
    assert.ok(!/class="active"/.test(navOf(p)), `${p}: info pages highlight neither entry`);
  }
});

test('nav geometry keeps both links the same width and stays narrow on phones', () => {
  const css = read('dist/site-chrome.css');
  assert.match(css, /body>\.topbar nav a\{width:96px\}/);
  assert.match(css, /body>\.topbar nav a:nth-child\(2\)\{width:96px\}/,
    'Shop is as wide as Games, not the old 136px Membership slot');
  assert.ok(!/nth-child\(2\)\{width:(?:136|126|104)px\}/.test(css), 'no oversized second slot survives');
  assert.match(css, /@media\(max-width:920px\)[\s\S]*?nth-child\(2\)\{width:88px\}/);
  assert.match(css, /@media\(max-width:600px\)[\s\S]*?body>\.topbar nav\{gap:2px\}/);
  assert.match(css, /@media\(max-width:600px\)[\s\S]*?nth-child\(2\)\{width:60px\}/);
  assert.match(css, /@media\(max-width:480px\)[\s\S]*?body>\.topbar \.brand\{font-size:0\}/,
    'very small phones drop only the wordmark, not the nav links');
  assert.match(css, /@media\(max-width:480px\)[\s\S]*?brand-mark\{font-size:19px/,
    'the logo stays visible and clickable');
  assert.match(css, /The nav has exactly two links/);
});

test('the shared cache key stays intact and the footer shop link is gone', () => {
  assert.ok(version);
  for (const p of shell) {
    const text = read(p);
    assert.match(text, new RegExp('site-chrome\\.css\\?v=' + version), `${p}: css key`);
    assert.match(text, /href="\/shop\.html"/, `${p}: shop is reachable from the top nav`);
    assert.ok(!/20261111-notrail1/.test(text), `${p}: no stale key`);
  }
  // The footer shop link was removed on request; the top-nav Shop link remains
  // the single route to /shop.html on the shell pages.
  const footer = read('dist/membership.html').match(/<footer[\s\S]*?<\/footer>/)?.[0] || '';
  assert.doesNotMatch(footer, /href="\/shop\.html"/, 'the footer shop link is gone');
  assert.match(footer, /href="\/membership\.html"/, 'the other footer links survive');
});
