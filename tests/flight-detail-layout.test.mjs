import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const index = read('dist/index.html');
const native = read('dist/portal/native-flight.html');
const table = read('dist/portal/native-table.html');
const css = read('dist/flight-detail-layout.css');
const KEY = 'flight-detail-layout.css?v=20261116-flightdetail1';

test('the flight welcome page gains pool-style rules and membership blocks', () => {
  for (const p of ['dist/index.html', 'dist/portal/native-flight.html']) {
    const html = read(p);
    assert.match(html, /<div class="intro-bottom">/, p + ': bottom grid');
    assert.match(html, /<section class="rules">/, p + ': rules section');
    assert.match(html, /<section class="member-note">/, p + ': membership section');
    /* Both languages are authored inline; site-chrome.css hides the other one. */
    for (const label of ['怎么玩', 'How to play', '会员与支持', 'Membership &amp; support'])
      assert.ok(html.includes(label), p + ': ' + label);
    assert.ok(!read(p).includes('class="intro-bottom"><div class="intro-bottom"'),
      p + ': exactly one bottom block');
  }
  /* The table detail page has its OWN intro-bottom (pool rules). It must not
     pick up the flight copy or the flight-only stylesheet. */
  assert.ok(table.includes('class="intro-bottom"'), 'native-table keeps its own intro-bottom');
  assert.ok(!table.includes('会员装扮可更换头像'), 'no flight rules leaked into the table page');
  assert.ok(!table.includes(KEY), 'no flight-only sheet on the table page');
});

test('the cover is the existing HeroPlane animation at the pool cover size', () => {
  assert.match(css, /width:158px;height:158px/, '158px square, same as pool .hero-art');
  assert.match(css, /grid-template-columns:165px minmax\(0,1fr\)/,
    'cover column matches pool .game-hero');
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) 460px/,
    'two-column shell matches pool .intro-grid');
  assert.match(css, /\.hero-plane-model canvas\{[\s\S]*?transform:scale\(\.78\) translateY\(-9%\)/,
    'aircraft is lifted above the caption');
  assert.match(css, /\.hero-plane-model::before,[\s\S]*?inset:0/,
    'wind layers fill the square instead of bleeding out');
  assert.match(css, /\.flight-hero-caption\{[\s\S]*?top:138px/,
    'caption stays inside the 158px cover');
  assert.match(index, /class="flight-hero-caption"/, 'caption node exists');
  assert.match(index, /<span class="lang-cn">好友已就位，欢乐即将起飞<\/span>/,
    'the supplied animation caption is reproduced');
  /* No still cover image was introduced. */
  assert.ok(!index.includes('class="hero-art"'), 'no pool-style static cover element');
});

test('the standings keep their own data but gain room for full player names', () => {
  assert.match(css, /--lb-rank:30px;--lb-avatar:45px;--lb-points:50px;--lb-games:50px/);
  assert.match(css, /--lb-gap:10px;--lb-pad:14px/);
  assert.match(css, /b\[data-annual-member="true"\]::after\{[\s\S]*?width:40px;height:18px/,
    'member badge no longer squeezes the name to an ellipsis');
  assert.match(css, /grid-column:2;grid-row:1 \/ span 2/, 'standings span both rows');
});

test('existing app wiring and narrow-screen fallback survive the reflow', () => {
  for (const id of ['quick-match-preview', 'create', 'practice', 'home-difficulty',
    'home-access', 'social-preview-note', 'leaderboard-shell'])
    assert.ok(index.includes('id="' + id + '"'), id + ' still exists for app.js / social-ui.js');
  assert.match(index, /class="local-note legal-links"/, 'static-i18n legal links unchanged');
  assert.match(css, /html:not\(\[data-native-game="flight"\]\) #welcome > \.intro-bottom/,
    'plain /index.html keeps its original layout');
  assert.match(css, /@media\(max-width:900px\)[\s\S]*?grid-template-columns:minmax\(0,1fr\)/,
    'narrow screens collapse to one column');
});

test('both generated hosts load the new stylesheet, table host does not', () => {
  assert.ok(index.includes(KEY), 'dist/index.html links the new sheet');
  assert.ok(native.includes(KEY), 'native-flight.html links the new sheet');
  assert.ok(!table.includes(KEY), 'native-table.html is unaffected');
  assert.ok(native.includes('data-native-game="flight"'), 'native page scope marker');
});
