/* 2026-11-15 14:00 — "奖牌贴太近了，已经挤压在一起了，分开".
   In the game intro standings the gold / silver / bronze accent bar is an
   absolutely positioned ::before at left:0, while the podium coin started at
   the very same x — a measured 0px gap, so the bar looked squashed under the
   round coin. The flight-home board had a real gutter but only 15px to the
   bar and 16px to the portrait. Both boards now give the coins room, without
   touching row heights, column widths or the shared frozen cache keys. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const introCss = read('dist/table/table-home-clean.css');
const flightCss = read('dist/visual-v7.css');
const introHtml = read('dist/table/index.html');
const flightHtml = read('dist/index.html');
const KEY = '20261115-medalspace1';

const block = (css, selector) => {
  const at = css.lastIndexOf(selector);
  assert.ok(at >= 0, `${selector}: rule present`);
  return css.slice(at, css.indexOf('}', at));
};

test('intro rows and their header share one 14px medal gutter', () => {
  const row = block(introCss, 'body.table-home-theme:not([data-screen="play"]) #leaderboard li{');
  const cols = block(introCss, 'body.table-home-theme:not([data-screen="play"]) .ranking-columns{');
  assert.match(row, /padding:0 0 0 14px/);
  assert.match(cols, /padding:0 0 6px 14px/);
  // Both gutter values must match or the score / games columns drift apart.
  assert.equal(row.match(/padding:0 0 0 (\d+)px/)[1], cols.match(/padding:0 0 6px (\d+)px/)[1]);
  // Column geometry and row height stay exactly as the 12:57 layout pass left them.
  assert.match(row, /grid-template-columns:32px minmax\(0,1fr\) 60px 60px/);
  assert.match(row, /column-gap:16px/);
  assert.match(cols, /grid-template-columns:1fr 60px 60px/);
  assert.match(cols, /column-gap:16px/);
  assert.match(introCss, /--rank-row:34px/);
});

test('the podium accent bar stays at the row edge, clear of the coin', () => {
  assert.match(introCss, /li:has\(\.rank-medal\.rank-3\)::before\{content:"";position:absolute;left:0;top:22%;bottom:22%;width:3px/);
  assert.match(introCss, /li:has\(\.rank-medal\.rank-1\)::before\{background:#efbe45/);
  assert.match(introCss, /li:has\(\.rank-medal\.rank-2\)::before\{background:#b8c9d8/);
  assert.match(introCss, /li:has\(\.rank-medal\.rank-3\)::before\{background:#d49a63/);
});

test('flight-home coins get room on all three breakpoints', () => {
  const vars = text => {
    const m = text.match(/--lb-gap:(\d+)px;--lb-pad:(\d+)px/);
    assert.ok(m, 'breakpoint variables found');
    return {gap: +m[1], pad: +m[2]};
  };
  const base = vars(block(flightCss, '.leaderboard-shell{--lb-rank:35px;'));
  const small = vars(block(flightCss, '.leaderboard-shell{--lb-rank:28px;'));
  const tiny = vars(block(flightCss, '.leaderboard-shell{--lb-rank:24px;'));
  assert.deepEqual(base, {gap: 15, pad: 20});
  assert.deepEqual(small, {gap: 8, pad: 11});
  assert.deepEqual(tiny, {gap: 6, pad: 8});
  // Header and rows consume the same variables, so widening them cannot
  // desynchronise the Joy Coins / Games columns.
  assert.match(flightCss, /\.leaderboard-shell \.leaderboard-row,\.leaderboard-shell \.leaderboard-columns\{grid-template-columns:var\(--lb-rank\) var\(--lb-avatar\) minmax\(0,1fr\) var\(--lb-points\) var\(--lb-games\);column-gap:var\(--lb-gap\)/);
  assert.match(flightCss, /\.leaderboard-shell \.leaderboard-row\{padding-left:var\(--lb-pad\);padding-right:var\(--lb-pad\)/);
  assert.match(flightCss, /\.leaderboard-shell \.leaderboard-columns\{box-sizing:border-box;[^\n]*padding:13px calc\(var\(--lb-pad\) \+ 1px\)/);
});

test('both hosts pull the fresh sheets without bumping the frozen keys', () => {
  assert.match(introHtml, /table-home-clean\.css\?v=20261115-joincoin1&d=20261115-medalspace1/);
  assert.ok(!introHtml.includes('&d=20261115-ranklayout1'), 'no stale standings refresh');
  assert.match(flightHtml, /visual-v7\.css\?v=20261106-vip&d=20261115-medalspace1/);
  assert.match(flightHtml, /rank-badges\.css\?v=20261113-avatarframe1&d=20261115-squareall1/,
    'the 13:48 portrait-frame refresh is preserved');
});
