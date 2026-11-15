/* 2026-11-14 · Result-dialog player artwork.

   The two result cards used to be text-only. Each now carries a trophy
   illustration on its right; the artwork follows the RESULT (winner / loser /
   draw), not the seat. The SVG set shares one silhouette so the pair reads as
   a group. Styles live in result-points.css because pool-shell.css has a cache
   key tied to the site-points wallet chain and must never be bumped. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import {RESULT_POINTS_VERSION} from '../dist/table/result-points.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const shell = read('dist/table/pool-shell.js');
const css = read('dist/table/result-points.css');
const poolCss = read('dist/table/pool-shell.css');
const html = read('dist/table/index.html');
const preview = read('dist/pool-result-preview.html');

const ART_DIR = 'dist/assets/result/';
const CHAIN = [
  'dist/app.js', 'dist/live-room-ui.js', 'dist/online-custody-ui.js',
  'dist/pool-result-preview.html', 'dist/table/index.html',
  'dist/table/pool-shell.js', 'dist/table/result-points.js', 'dist/table/table.js'
];

/* ------------------------------------------------------------- artwork files */
test('all three outcome illustrations exist and share one trophy silhouette', () => {
  const cup = 'M24 7h52l-3 34Q70 63 54 68v17l15 7H31l15-7V68Q30 63 27 41Z';
  const base = 'M28 91h44l6 20H22Z';
  for (const name of ['winner', 'loser', 'draw']) {
    const path = ART_DIR + name + '.svg';
    assert.ok(existsSync(resolve(root, path)), `${path} exists`);
    const svg = read(path);
    assert.match(svg, /<svg[^>]*viewBox="0 0 100 120"/, `${name} uses the shared viewBox`);
    assert.match(svg, /linearGradient id="g"/, `${name} has a metal gradient`);
    assert.ok(svg.includes(cup) && svg.includes(base), `${name} keeps the same trophy outline`);
    assert.match(svg, /<title>[^<]+<\/title>/, `${name} is labelled`);
  }
  assert.match(read(ART_DIR + 'winner.svg'), /#ffdd6a/, 'the winner is gold');
  assert.match(read(ART_DIR + 'loser.svg'), /rotate\(-11 50 62\)/, 'the loser cup is tilted');
  assert.match(read(ART_DIR + 'loser.svg'), /#8fb4e3/, 'the loser is cool blue');
  assert.match(read(ART_DIR + 'draw.svg'), /#8ad6cf/, 'a draw is neutral teal');
  assert.doesNotMatch(read(ART_DIR + 'draw.svg'), /rotate\(/, 'the draw cup stays upright');
});

/* ------------------------------------------------------ outcome → image map */
test('the artwork follows the winner, never the seat index', () => {
  const expression = shell.match(/const artKind=([^;]+);/)?.[1];
  assert.ok(expression, 'the outcome expression is present in the production shell');
  const artFor = (winner, i) => runInNewContext(expression,
    {details: {winner}, won: winner === i + 1});

  assert.deepEqual([artFor(1, 0), artFor(1, 1)], ['winner', 'loser']);
  assert.deepEqual([artFor(2, 0), artFor(2, 1)], ['loser', 'winner']);
  assert.deepEqual([artFor(0, 0), artFor(0, 1)], ['draw', 'draw']);

  assert.match(shell, /const won=details\.winner===i\+1/);
  assert.match(shell, /row\.classList\.toggle\('winner',won\)/);
  assert.match(shell, /row\.dataset\.outcome=artKind/);
  assert.match(shell, /if\(won\)row\.append\(element\('b','pool-result-winner'/);
});

test('each card groups its text on the left and puts a real <img> on the right', () => {
  assert.match(shell, /copy=element\('div','pool-result-player-copy'\)/);
  assert.match(shell, /copy\.append\(name\)/);
  assert.match(shell, /if\(isPool\)copy\.append\(score\)/);
  assert.match(shell, /copy\.append\(element\('span','',Number\(options\.scores\[i\]/);
  assert.match(shell, /row\.append\(copy,art\)/);
  assert.match(shell, /const art=element\('img','pool-result-player-art'\)/);
  assert.match(shell, /art\.src='\/assets\/result\/'\+artKind\+'\.svg\?v=20261115-joincoin1'/);
  assert.match(shell, /art\.alt='';art\.decoding='async'/);
  assert.match(shell, /art\.setAttribute\('aria-hidden','true'\)/, 'decorative, not a duplicate label');
  assert.match(shell, /name\.title=name\.textContent/, 'long player names are still readable');
});

/* -------------------------------------------------------------- layout / CSS */
test('the cards become a two-column row without touching the wallet CSS key', () => {
  assert.match(css, /\.pool-result-player\{[^}]*flex-direction:row[^}]*justify-content:space-between/s);
  assert.match(css, /\.pool-result-player-copy\{[^}]*min-width:0/);
  assert.match(css, /\.pool-result-player-copy>span\{color:#91a9c2;font-size:11px\}/);
  assert.match(css, /\.pool-result-player-art\{[^}]*object-fit:contain/s);
  assert.match(css, /\.pool-result-player\.winner \.pool-result-player-art/);
  assert.match(css, /\[data-outcome="loser"\] \.pool-result-player-art/);
  assert.match(css, /@keyframes result-art-in/);
  assert.match(css, /\.pool-result-player-art\{flex-basis:42px;width:42px;height:50px\}/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{[\s\S]*?\.pool-result-player-art\{animation:none\}/);
  /* pool-shell.css still owns the base card and is deliberately NOT edited. */
  assert.match(poolCss, /\.pool-result-player\{position:relative;min-width:0;display:flex;flex-direction:column/);
  assert.doesNotMatch(poolCss, /pool-result-player-art/);
  assert.match(html, /pool-shell\.css\?v=20261112-gamelanes1/);
  assert.match(preview, /pool-shell\.css\?v=20261112-gamelanes1/);
  assert.equal(html.match(/pool-shell\.css\?v=([\w-]+)/)?.[1],
    preview.match(/pool-shell\.css\?v=([\w-]+)/)?.[1], 'game page and preview never drift');
  /* result-points.css is loaded AFTER pool-shell.css so the row override wins. */
  assert.ok(html.indexOf('pool-shell.css') < html.indexOf('result-points.css'));
});

test('the shared cache chain is bumped and the scorer VERSION stays frozen', () => {
  assert.equal(RESULT_POINTS_VERSION, '20261115-joincoin1');
  for (const file of CHAIN) {
    const text = read(file);
    assert.ok(text.includes('20261115-joincoin1'), `${file} uses the bumped key`);
    assert.ok(!text.includes('20261114-dailycap3'), `${file} has no stale key`);
    assert.ok(!text.includes('20261114-dailycap2'), `${file} has no stale key`);
  }
  assert.match(read('dist/game-points.js'), /var VERSION='20261112-gamelanes1'/);
  for (const page of ['dist/index.html', 'dist/table/index.html', 'dist/portal/index.html']) {
    assert.match(read(page), /game-points\.js\?v=20261112-gamelanes1&d=20261115-joincoin1/);
  }
});
