/* User feedback 2026-11-14: 「上面的列头样式不一样，修改下」
   Two screenshots of the same Connect Four room showed two different headers:
   - the friend opening the invitation link in a top-level tab saw the game's
     own LIGHT cloud-bank header (✦ JoyFlock + 「四子连珠」);
   - the host, inside the portal iframe, saw the shared DARK .topbar
     (✦ JoyFlock + 游戏 / 商城).
   The invitation URL is copied from inside the iframe, so it points at
   /table/index.html?...&embed=joyflock&room=<id>. In a top-level tab
   window.parent === window, html.embedded-game is never added and the
   `html.embedded-game body>header{display:none}` rule cannot hide the game's
   own header.

   Fix: tag precisely that case with html.invite-standalone and restyle the
   game's own header as the shared dark chrome. The intro screen, plain
   direct opens and embedded games are deliberately left untouched. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const page = read('dist/table/index.html');
const css = read('dist/table/header-invite.css');
const tableCss = read('dist/table/table.css');
const KEY = '20261114-inviteheader1';

test('only a top-level ?room= invitation is tagged', () => {
  assert.match(page, /window\.parent===window&&new URLSearchParams\(location\.search\)\.has\('room'\)/);
  assert.match(page, /document\.documentElement\.classList\.add\('invite-standalone'\)/);
  assert.doesNotMatch(page, /classList\.add\('invite-standalone'\).*embedded-game/s,
    'the embedded game keeps its own branch');
  assert.match(page, /window\.parent!==window&&new URLSearchParams\(location\.search\)\.get\('embed'\)==='joyflock'/);
});

test('the new stylesheet is loaded last, with its own version key', () => {
  assert.match(page, new RegExp(`<link rel="stylesheet" href="\\./header-invite\\.css\\?v=${KEY}"></head>`));
  const last = page.slice(0, page.indexOf('</head>')).lastIndexOf('<link rel="stylesheet"');
  assert.match(page.slice(last), /header-invite\.css/, 'last stylesheet wins over table.css');
});

test('the embedded game still hides its own header', () => {
  assert.match(page, /@media\(min-width:769px\)\{html\.embedded-game body>header\{display:none!important\}\}/);
});

test('the original light cloud-bank header survives for the intro screen', () => {
  assert.match(tableCss, /header\{[^}]*cloud-bank\.png[^}]*\}/);
  assert.match(tableCss, /header>a\{font-size:25px;color:#234080\}/);
  assert.doesNotMatch(css, /(?<!html\.invite-standalone )body>header\{[^}]*background:#0b1020/,
    'the dark rule is always scoped');
});

test('dark chrome uses the shared site values', () => {
  const rule = css.match(/html\.invite-standalone body\[data-screen\]>header\{[^}]*\}/)?.[0] || '';
  assert.match(rule, /height:38px/);
  assert.match(rule, /padding:0 2\.5vw/);
  assert.match(rule, /gap:30px/);
  assert.match(rule, /border-bottom:1px solid #ffffff0c/);
  assert.match(rule, /background:#0b1020/);
  assert.match(rule, /box-shadow:none/);
  assert.match(rule, /color:#eaf0ff/);
  assert.match(css, /html\.invite-standalone body\[data-screen\]>header>a\{[^}]*font-size:19px[^}]*letter-spacing:-1px/);
  assert.match(css, /\.brand-mark\{color:#a8b8ff/);
  const button = css.match(/html\.invite-standalone body\[data-screen\]>header button\{[^}]*\}/)?.[0] || '';
  assert.match(button, /height:24px/);
  assert.match(button, /min-height:24px/);
  assert.match(button, /box-shadow:none/);
  assert.match(button, /background:#1b254a/);
});

test('the breadcrumb is replaced by the same two navigation pills', () => {
  assert.match(page, /<span id="game-name"><\/span><nav class="invite-nav">/);
  assert.match(page, /href="\/portal\/index\.html" class="active"/);
  assert.match(page, /href="\/shop\.html" class="nav-shop"/);
  assert.match(page, />游戏<\/span>/);
  assert.match(page, />商城<\/span>/);
  assert.match(css, /html\.invite-standalone body\[data-screen\]>header #game-name\{display:none\}/);
  assert.match(css, /\.invite-nav\{display:none\}/, 'hidden on every other entry point');
  assert.match(css, /\.invite-nav a\.active\{color:#fff;background:#1b254a\}/);
  assert.match(css, /width:96px;height:24px;padding:0 12px;border-radius:12px/);
  assert.match(css, /html\[lang="en"\] \.invite-nav \.lang-en\{display:inline\}/);
});

test('responsive breakpoints follow the shared chrome', () => {
  assert.match(css, /@media\(max-width:920px\)\{[^}]*padding:0 16px/);
  assert.match(css, /@media\(max-width:600px\)\{[^}]*height:34px/);
});
