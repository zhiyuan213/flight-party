/* 2026-11-16 17:30 — "把现有头像框架都去掉" (all avatar frames removed).
   The shipped look keeps the historical frame rules in rank-badges.css but
   overrides them with a single no-frame block: no gold/cloud/night crest, no
   injected .avatar-frame image, no white ring, no podium outline, no 22%
   soft square and no peach #F3D2AD backing. Portraits show only the artwork,
   transparent, at their existing sizes. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const rankCss = read('dist/rank-badges.css');
const chromeCss = read('dist/site-chrome.css');
const account = read('dist/live-account-ui.js');
const app = read('dist/app.js');
const generator = read('scripts/build-native-games.mjs');
const KEY = 'f=20261116-noframe1';
const RANK_HOSTS = ['dist/index.html', 'dist/portal/native-flight.html',
  'dist/portal/native-table.html', 'dist/table/index.html'];
const SHELL_HOSTS = ['dist/contact.html', 'dist/membership.html', 'dist/portal/index.html',
  'dist/privacy.html', 'dist/shop.html', 'dist/terms.html',
  'dist/portal/native-flight.html', 'dist/portal/native-table.html'];

const block = rankCss.slice(rankCss.indexOf('NO portrait frames at all'));

test('the no-frame override is the last word in the shared portrait sheet', () => {
  assert.ok(block.length > 400, 'a real override block is appended');
  assert.ok(rankCss.indexOf('NO portrait frames at all') >
    rankCss.lastIndexOf('background-color:#F3D2AD'),
    'the override loads after every historical peach / square frame rule');
});

test('member crests and injected frame artwork are gone', () => {
  for (const frame of ['gold', 'cloud', 'night'])
    assert.match(block, new RegExp('\\[data-frame="' + frame + '"\\]::after'));
  assert.match(block, /content:none!important;background-image:none!important/);
  assert.match(block, /\.avatar-frame\{display:none!important\}/);
});

test('every portrait loses border, shadow, peach backing and radius', () => {
  const shared = block.slice(block.indexOf('.leaderboard-avatar,'),
    block.indexOf('}', block.indexOf('.leaderboard-avatar,')));
  for (const selector of ['.leaderboard-avatar', '.seat-avatar', '.player-avatar',
    '.account-button-avatar', '.account-dialog-avatar', '.room-seat-avatar',
    '.appearance-preview', '.result-avatar', '.victory-portrait',
    '.header-account-avatar', '.system-avatar-image', '.reaction-avatar',
    '.pool-matchup .seat-avatar', '.snooker-matchup .seat-avatar',
    'body.table-home-theme #leaderboard .seat-avatar', '#players .player-avatar'])
    assert.ok(shared.includes(selector), selector + ': covered');
  assert.match(shared, /border:0!important/);
  assert.match(shared, /box-shadow:none!important/);
  assert.match(shared, /background-color:transparent!important/);
  assert.match(shared, /border-radius:0!important/);
});

test('the play-state !important radius is outranked, the seat marker survives', () => {
  assert.match(block,
    /html body\.table-home-theme\[data-screen="play"\] #seats \.seat-avatar\{\s*border-radius:0!important;\s*\}/);
  assert.match(block,
    /\.room-seat-avatar\.empty-seat-avatar\{\s*border:1px dashed #b3d2eb!important/);
});

test('the account dialog no longer offers frame choices or frame copy', () => {
  assert.ok(!account.includes('data-appearance="${key}"'), 'no frame buttons');
  assert.ok(!account.includes('Preview any frame'), 'no old frame copy');
  assert.match(account, /Portrait frames are no longer displayed/);
  assert.match(account, /头像框已停用/);
  assert.match(account, /#account-panel-style|\['style',looks\]/,
    'the style tab still has its panel');
});

test('the shell account portrait is frameless but keeps its inline image', () => {
  const tail = chromeCss.slice(chromeCss.indexOf('NO portrait frames at all'));
  const start = tail.indexOf('.chrome-auth-avatar{');
  const avatarBlock = tail.slice(start, tail.indexOf('}', start));
  assert.match(avatarBlock, /border:0!important/);
  assert.match(avatarBlock, /border-radius:0!important/);
  assert.ok(!/background-image:none/.test(avatarBlock),
    'never hide the uploaded avatar background image');
  /* The shell hosts do not load rank-badges.css, so they disable the crest
     artwork and injected frame images here as well. */
  assert.match(tail, /\[data-frame="gold"\]::after[\s\S]*content:none!important/);
  assert.match(tail, /\.avatar-frame\{display:none!important\}/);
});

test('every host pulls the fresh sheet / module without changing frozen keys', () => {
  for (const p of RANK_HOSTS) {
    const html = read(p);
    assert.match(html, /rank-badges\.css\?v=20261113-avatarframe1&d=20261115-squareall1&f=20261116-noframe1/,
      p + ': fresh shared portrait sheet');
  }
  for (const p of SHELL_HOSTS) {
    const html = read(p);
    assert.match(html,
      /site-chrome\.css\?v=20261112-gamelanes1&d=20261115-topbar1&r=20261115-squareall1&p=20261116-nospace1&f=20261116-noframe1/,
      p + ': fresh shell sheet');
  }
  assert.match(read('dist/index.html'),
    /app\.js\?v=20261112-gamelanes1&d=20261115-selfrow1&release=20261115-localefix1&f=20261116-noframe1/);
  assert.match(app, /live-account-ui\.js\?v=20261110-glove2&f=20261116-noframe1/);
  assert.ok(generator.includes(KEY), 'the native-game generator emits the fresh key');
});
