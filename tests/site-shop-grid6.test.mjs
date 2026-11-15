import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const shop = read('dist/site-shop.js');
const css = read('dist/site-shop.css');
const planeCss = read('dist/site-plane.css');
const trailCss = read('dist/site-trail.css');
const page = read('dist/shop.html');
const version = shop.match(/var VERSION='([^']+)'/)?.[1];
const COLUMNS = 6;

const ids = [...shop.matchAll(/\{id:'([A-Za-z0-9-]+)',kind:'([A-Za-z0-9-]+)'/g)];
const counts = ids.reduce((acc, [, , kind]) => (acc[kind] = (acc[kind] || 0) + 1, acc), {});
const GAME_KINDS = ['fourPiece', 'fourBoard', 'gomokuPiece', 'gomokuBoard',
  'chessPiece', 'chessBoard', 'xoPiece', 'xoBoard'];

test('every section uses the ONE six-column grid', () => {
  assert.match(css, /\.shop-grid\{display:grid;grid-template-columns:repeat\(6,minmax\(0,1fr\)\);gap:9px\}/);
  assert.ok(!/repeat\(10|repeat\(5/.test(css),
    'no leftover ten- / five-column catalogue rules');
  assert.equal((css.match(/repeat\(3,minmax\(0,1fr\)/g) || []).length, 1,
    'three columns only appear as the narrow-screen breakpoint');
  for (const [name, text] of [['plane css', planeCss], ['trail css', trailCss]]) {
    assert.ok(!/\.shop-grid[^{]*\{[^}]*grid-template-columns/.test(text),
      `${name} must not override the shared grid (the hangar's own grid is fine)`);
    assert.ok(!/\.shop-grid[^{]*\{[^}]*max-width/.test(text), `${name} must not narrow its own row`);
  }
  assert.match(shop, /<div class="shop-grid'/);
  assert.match(shop, /shop-grid--planes/);
  assert.match(shop, /shop-grid--trails/);
  assert.equal((shop.match(/section\('(?:plane|trail|cursor|avatar|ball|cue|table)'\)/g) || []).length, 7,
    'seven ordinary sections');
  assert.match(shop, /GAME_KEYS\.map\(gameSection\)\.join\(''\)\+/,
    'plus FOUR per-game sections = eleven in total');
  assert.match(shop, /var GAME_KEYS=\['four','gomoku','chess','xo'\];/);
});

test('more than six cards wrap: twelve cursors and sixteen avatars share the same six-column grid', () => {
  const expected = {cursor: 12, avatar: 16, plane: 6, trail: 4,
    fourPiece: 6, fourPiecePink: 6, fourBoard: 6, gomokuPiece: 6, gomokuPieceWhite: 6, chessBoard: 6, xoPiece: 6, xoPieceO: 6, xoBoard: 6,
    ball: 6, cue: 6, table: 6};
  assert.deepEqual(counts, expected, 'each active category keeps one free baseline');
  assert.equal(ids.length, 110, 'site + billiard + active game products');
  for (const g of ['four', 'gomoku', 'chess', 'xo']) {
    const n = (shop.match(new RegExp(`kind:'${g}(?:Piece|Board)'`, 'g')) || []).length;
    assert.equal(n, {four: 12, gomoku: 6, chess: 6, xo: 12}[g], `${g} section holds its active categories`);
    assert.equal(Math.ceil(n / COLUMNS), {four: 2, gomoku: 1, chess: 1, xo: 2}[g], `${g} wraps naturally`);
  }
  assert.equal(Math.ceil(counts.cursor / COLUMNS), 2);
  assert.equal(Math.ceil(counts.avatar / COLUMNS), 3);
  assert.equal(Math.ceil(counts.plane / COLUMNS), 1);
  assert.equal(Math.ceil(counts.trail / COLUMNS), 1, 'no trail + three effects fill four cells');
  assert.ok(!/grid-column|grid-auto-flow|nth-child/.test(css + planeCss + trailCss),
    'wrapping is the grid doing its job, not a per-card placement hack');
});

test('aircraft, trail, cursor and avatar cards have the SAME box', () => {
  assert.match(css, /\.shop-card\{[\s\S]{0,260}padding:30px 6px 10px/);
  assert.match(planeCss, /\.shop-card--plane\{padding:30px 6px 10px\}/);
  assert.match(trailCss, /\.shop-card--trail\{padding:30px 6px 10px\}/);
  assert.match(css, /\.shop-art\{[\s\S]{0,160}height:98px/);
  assert.match(planeCss, /\.shop-card--plane \.shop-plane-stage\{height:98px;flex:none\}/);
  assert.match(trailCss, /\.shop-card--trail \.shop-trail-stage\{height:98px;flex:none\}/);
  /* On the narrowest screens every artwork shrinks together as well. */
  assert.match(css, /@media\(max-width:520px\)\{[\s\S]{0,120}\.shop-art\{height:84px\}/);
  assert.match(planeCss, /\.shop-card--plane \.shop-plane-stage\{height:84px\}/);
  assert.match(trailCss, /\.shop-card--trail \.shop-trail-stage\{height:84px\}/);
});

test('responsive breakpoints are defined once and apply to all sections', () => {
  assert.match(css, /@media\(max-width:1240px\)\{\.shop-grid\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)\}\}/);
  assert.match(css, /@media\(max-width:760px\)\{\s*\.shop-grid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}/);
  assert.match(css, /@media\(max-width:520px\)\{\s*\.shop-grid\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
  assert.equal((css.match(/grid-template-columns:repeat\(/g) || []).length, 4,
    'desktop 6 + three breakpoints, nothing else');
});

test('all three stylesheets ship on the same bumped cache key', () => {
  assert.equal(version, '20261112-gamelanes1');
  assert.match(page, new RegExp('site-shop\\.css\\?v=' + version));
  assert.match(page, new RegExp('site-plane\\.css\\?v=' + version));
  assert.match(page, new RegExp('site-trail\\.css\\?v=' + version));
  assert.ok(page.indexOf('site-shop.css') < page.indexOf('site-plane.css') &&
    page.indexOf('site-plane.css') < page.indexOf('site-trail.css'),
    'the shared grid loads before the section-specific artwork styles');
  assert.ok(!/20261112-trailshop1/.test(page));
});
