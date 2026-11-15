import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  GOMOKU_SIZE, GOMOKU_LINES, GOMOKU_INSET, GOMOKU_STEP,
  GOMOKU_HIT_LEFT, GOMOKU_HIT_SIZE, gomokuLayout
} from '../dist/table/gomoku-view.js';

const pct = value => Number((value * 100).toFixed(4));

test('17 lines enclose 16x16 complete squares, with 15x15 playable crossings', () => {
  assert.equal(GOMOKU_SIZE, 15);
  assert.equal(GOMOKU_LINES, 17);
  assert.equal(GOMOKU_LINES - 1, 16);
  assert.equal(GOMOKU_SIZE * GOMOKU_SIZE, 225);
  const L = gomokuLayout(1000);
  assert.equal(L.line(0), 1000 * GOMOKU_INSET);
  assert.equal(L.line(GOMOKU_LINES - 1), 1000 - 1000 * GOMOKU_INSET);
  assert.ok(Math.abs(L.line(GOMOKU_LINES - 1) - L.line(0) - 16 * L.step) < 1e-9);
  /* The first and last playable crossing are exactly one full square inside
     the closed boundary, so no edge square can be cut in half. */
  assert.ok(Math.abs(L.point(0, 0).x - L.line(0) - L.step) < 1e-9);
  assert.ok(Math.abs(L.line(16) - L.point(0, 14).x - L.step) < 1e-9);
  for (let row = 0; row < GOMOKU_SIZE; row++) {
    for (let col = 0; col < GOMOKU_SIZE; col++) {
      const p = L.point(row, col);
      assert.ok(Math.abs(p.x - L.line(col + 1)) < 1e-9);
      assert.ok(Math.abs(p.y - L.line(row + 1)) < 1e-9);
      assert.ok(p.x > L.line(0) && p.x < L.line(16));
    }
  }
});

test('hit layer margins are symmetric and match the CSS percentages', () => {
  assert.ok(Math.abs(1 - 2 * GOMOKU_HIT_LEFT - GOMOKU_HIT_SIZE) < 1e-12);
  const css = readFileSync(new URL('../dist/table/gomoku-board.css', import.meta.url), 'utf8');
  const hits = css.match(/\.board\.gomoku \.gomoku-hits\{([^}]*)\}/);
  assert.ok(hits, 'hit-layer rule is present');
  const left = hits[1].match(/left:([\d.]+)%/), size = hits[1].match(/width:([\d.]+)%/);
  assert.ok(left && size, 'hit-layer percentages are present');
  assert.equal(Number(left[1]), pct(GOMOKU_HIT_LEFT));
  assert.equal(Number(size[1]), pct(GOMOKU_HIT_SIZE));
  assert.match(css, /\.board\.gomoku\{[^}]*display:block/);
  assert.match(css, /background:transparent!important/);
  assert.ok(!css.includes('--gomoku-grid'), 'legacy per-cell gradient grid is gone');
});

test('table.js routes gomoku through the canvas renderer', () => {
  const source = readFileSync(new URL('../dist/table/table.js', import.meta.url), 'utf8');
  assert.match(source, /import \{renderGomoku\} from '\.\/gomoku-view\.js/);
  assert.match(source, /game==='gomoku'\)renderGomoku\(\$\('board'\),board,\{can,turn:board\.turn,last\}\)/);
});
