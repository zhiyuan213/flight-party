import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const css = read('dist/rank-badges.css');
const homeHtml = read('dist/index.html');
const tableHtml = read('dist/table/index.html');
const version = '20261113-avatarframe1';

/* The shipped portraits are rounded SQUARE illustrations on a transparent
   canvas. Circular rings used to show four dark crescents around the face on
   both standings. The shared badge stylesheet now defines the frame for both
   boards so they cannot drift apart again. */
test('both leaderboards use one rounded-square portrait frame', () => {
  const block = css.match(/body\.table-home-theme #leaderboard \.seat-avatar,\s*\.leaderboard-avatar\{([^}]*)\}/);
  assert.ok(block, 'one shared rule must cover the intro board and the home board');
  assert.match(block[1], /border-radius:\s*22%/, 'the frame follows the square artwork');
  assert.match(block[1], /background-color:\s*#F3D2AD/, 'transparent corners are filled with the artwork peach');
  assert.ok(!/border-radius:\s*50%/.test(block[1]), 'the shared frame must not stay circular');
});

test('the intro selector outranks the old circular seat rules', () => {
  assert.match(css, /body\.table-home-theme #leaderboard \.seat-avatar/);
  /* table.css declares .seat-avatar and .seat.member .seat-avatar with a 50%
     radius; the id-qualified selector must win for standings rows. */
  const tableCss = read('dist/table/table.css');
  assert.match(tableCss, /\.seat-avatar\{[^}]*border-radius:50%/);
  const introRule = css.indexOf('body.table-home-theme #leaderboard .seat-avatar,');
  const tableRule = tableCss.indexOf('.seat-avatar{');
  assert.ok(introRule >= 0 && tableRule >= 0);
});

test('circular VIP crest portraits keep their round inner portrait', () => {
  for (const frame of ['gold', 'cloud', 'night']) {
    assert.match(css, new RegExp(`\\.leaderboard-avatar\\[data-frame="${frame}"\\]`));
  }
  const exception = css.slice(css.indexOf('.leaderboard-avatar[data-frame="gold"]'));
  assert.match(exception, /border-radius:\s*50%/, 'the circular crest still needs a round portrait');
  assert.ok(!/body\.table-home-theme #leaderboard \.seat-avatar/.test(exception),
    'the VIP exception must not re-round the intro standings');
});

test('both HTML hosts load the same freshly bumped stylesheet', () => {
  for (const html of [homeHtml, tableHtml]) {
    assert.ok(html.includes(`rank-badges.css?v=${version}`), 'cache key must be current');
  }
  assert.match(version, /^20261113-[a-z0-9]+$/, 'cache keys must not contain a hyphen after the date');
  assert.ok(!/rank-badges\.css\?v=20261109-yearvip1/.test(homeHtml + tableHtml));
});

test('the square illustration itself is untouched', () => {
  const dir = resolve(root, 'dist/assets/shop/avatars-v4');
  const faces = readdirSync(dir).filter(name => /^avatar-[a-z]+\.svg$/.test(name));
  assert.equal(faces.length, 16);
  for (const name of faces) {
    const svg = read(`dist/assets/shop/avatars-v4/${name}`);
    assert.match(svg, /<rect x="16" y="16" width="224" height="224" rx="27" fill="#F3D2AD"\/>/,
      `${name} keeps the rounded-square peach face`);
  }
});
