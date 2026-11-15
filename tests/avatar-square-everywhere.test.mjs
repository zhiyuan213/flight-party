/* 2026-11-15 13:48 — "圆的头像框都去掉".
   The room "ready" dialog still showed two circular portraits even after the
   13:13 Flight Party fix: table.css declares a 50% .seat-avatar base and the
   square overrides only targeted the players panel / standings. This test
   guards the one shared soft-square rule and every cache-bust reference that
   has to ship with it, while proving circular non-portrait UI is untouched. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const rankCss = read('dist/rank-badges.css');
const roomCss = read('dist/table/room-dialog.css');
const chromeCss = read('dist/site-chrome.css');
const tableCss = read('dist/table/table.css');
const v2 = read('dist/visual-v2.css');
const tableHtml = read('dist/table/index.html');
const flightHtml = read('dist/index.html');
const SHELLS = ['dist/portal/index.html', 'dist/membership.html', 'dist/terms.html',
  'dist/privacy.html', 'dist/contact.html', 'dist/shop.html'];
const REFRESH = '20261115-squareall1';

test('one shared rule squares every remaining circular portrait', () => {
  const start = rankCss.search(/\.seat-avatar,\s*\.account-button-avatar,/);
  assert.ok(start >= 0, 'the shared soft-square rule is present');
  const block = rankCss.slice(start, rankCss.indexOf('}', start));
  for (const selector of ['.seat-avatar', '.account-button-avatar', '.account-dialog-avatar',
    '.room-seat-avatar', '.appearance-preview', '.result-avatar', '.victory-portrait',
    '.header-account-avatar', '.system-avatar-image', '.reaction-avatar',
    '.pool-matchup .seat-avatar', '.snooker-matchup .seat-avatar']) {
    assert.ok(block.includes(selector), `${selector}: covered by the shared rule`);
  }
  assert.match(block, /border-radius:22%/);
  assert.match(block, /background-color:#F3D2AD/, 'peach fill hides the transparent canvas corners');
  assert.ok(!/border-radius:\s*50%/.test(block));
});

test('the circular base rules stay in place but the override loads later', () => {
  // Existing frame tests rely on these bases; the shared square rule wins by
  // source order on both hosts (same specificity for .seat-avatar).
  assert.match(tableCss, /\.seat-avatar\{[^}]*border-radius:50%/);
  assert.match(v2, /\.player-avatar\{[^}]*border-radius:50%/);
  assert.ok(tableHtml.indexOf('rank-badges.css') > tableHtml.indexOf('table.css'),
    'table host: square override after the circular base');
  assert.ok(tableHtml.indexOf('rank-badges.css') > tableHtml.indexOf('room-dialog.css'),
    'table host: square override after the ready-dialog styles');
  assert.ok(tableHtml.indexOf('rank-badges.css') > tableHtml.indexOf('snooker-shell.css'),
    'table host: square override after the snooker 12px frame');
  assert.ok(flightHtml.indexOf('rank-badges.css') > flightHtml.indexOf('visual-v2.css'),
    'flight host: square override after the circular base');
  assert.ok(flightHtml.indexOf('rank-badges.css') > flightHtml.indexOf('reaction-preview.css'),
    'flight host: square override after the reaction preview');
});

test('the ready dialog placeholder is square, its close button stays round', () => {
  assert.match(roomCss, /display:grid;place-items:center;border:1px dashed #4a5c85;border-radius:22%/);
  assert.match(roomCss, /body\.table-home-theme dialog#waiting \.close\{[\s\S]{0,220}border-radius:50%/,
    'the × button is UI chrome, not a portrait frame');
});

test('the portal account dialog avatar is square too', () => {
  const start = chromeCss.indexOf('.chrome-auth-avatar{');
  assert.ok(start >= 0);
  assert.match(chromeCss.slice(start, start + 260), /border-radius:22%/);
  assert.ok(!/border-radius:50%/.test(chromeCss.slice(start, start + 260)));
});

test('VIP crest portraits keep the deliberate round exception', () => {
  assert.match(read('dist/table/seat-frame-square.css'),
    /\.players-panel \.seat:has\(\.avatar-frame\) \.seat-avatar\{\s*border-radius:50%;\s*\}/);
  assert.match(rankCss, /\.leaderboard-avatar\[data-frame="gold"\][\s\S]{0,180}border-radius:50%/);
  assert.match(rankCss, /#players \.player-avatar\[data-frame="gold"\][\s\S]{0,200}border-radius:50%/);
});

test('circular non-portrait UI is untouched', () => {
  assert.match(read('dist/table/four-seat-piece.css'), /border-radius:50%/);
  assert.match(rankCss, /\.podium \.leaderboard-rank,[\s\S]{0,500}border-radius:50%/);
  assert.match(read('dist/match-box.css'), /\.mb-spinner\{[\s\S]{0,160}border-radius:50%/);
});

test('both rank-badges hosts share the frozen key and pull the fresh sheet', () => {
  for (const html of [tableHtml, flightHtml]) {
    assert.match(html, /rank-badges\.css\?v=20261113-avatarframe1&d=20261115-squareall1/);
    assert.ok(!html.includes('&d=20261115-flightsquare1'), 'no stale refresh key');
  }
  assert.match(tableHtml, /room-dialog\.css\?v=20261115-joincoin1&d=20261115-squareall1/);
});

test('all six shell pages refresh the chrome avatar without bumping the frozen chain', () => {
  for (const p of SHELLS) {
    const html = read(p);
    assert.match(html,
      /site-chrome\.css\?v=20261112-gamelanes1&d=20261115-topbar1&r=20261115-squareall1/,
      `${p}: squared account avatar is served`);
  }
});
