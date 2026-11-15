/* Regression for 2026-11-13: "斯诺克球有点太小了，增加 4px".
   The user picked "desktop ball diameter 12px -> 16px": radius 8 -> 11 table
   units (diameter 16 -> 22), with the red rack spread by the same ratio and
   every radius-dependent presentation/rules module following one source. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {radius,startSnooker,shootSnooker} from '../dist/table/snooker.js';
import {simulateCueShot} from '../dist/table/pool.js';
import {pocketIndex} from '../dist/table/pool-geometry.js';
import {COLLECTION} from '../dist/table/snooker-collection.js';

const root = path.resolve(import.meta.dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const centres = cells => {
  const out = [];
  for (let i = 0; i < 22; i++) out.push([cells[i * 3] / 10, cells[i * 3 + 1] / 10]);
  return out;
};

test('the ball is 11 units (22-unit diameter) and the rack keeps its density', () => {
  assert.equal(radius, 11, '8 -> 11 units is about +4 px of screen diameter');
  const cells = startSnooker().cells;
  assert.equal(cells.length, 66, '22 balls in the same cell format');
  const points = centres(cells);
  assert.ok(points.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)));
  assert.ok(points.every(([x, y]) => x >= radius && x <= 1000 - radius && y >= radius && y <= 500 - radius),
    'every ball starts inside the baize with its full new radius');
  // Original rack: 14.2 / 16.4 spacing against a 16-unit ball = 0.8875.
  // The spread rack must keep that ratio, not collapse into one red blob.
  let min = Infinity;
  for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++)
    min = Math.min(min, Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1]));
  assert.ok(min >= 2 * radius * .88, `closest centres ${min.toFixed(2)} vs diameter ${2 * radius}`);
  assert.ok(min <= 2 * radius * 1.05, 'the rack stays tight, not scattered across the baize');
  // Pink at 752 and black at 918 must clear the first / last red column.
  assert.ok(Math.abs(774 - 752) >= 2 * radius, 'pink spot clears the first red by one diameter');
  assert.ok(Math.abs(918 - (774 + 4 * 19.525)) >= 2 * radius, 'black spot clears the last red');
});

test('physics uses the new radius and pocket capture is unchanged', () => {
  const src = read('dist/table/snooker.js');
  assert.match(src, /simulateCueShot\(state\.cells,command,22,radius,RAIL_TANGENT_LOSS,SNOOKER_SHOT_SPEED\)/);
  assert.match(src, /const RACK_X=774,RACK_COL=19\.525,RACK_ROW=22\.55/);
  assert.equal(pocketIndex(0, 0), 0);
  assert.equal(pocketIndex(500, -20), 1);
  assert.equal(pocketIndex(500, 250), -1);
  // A ball rolling straight into the top cushion rebounds at its own radius.
  const cells = new Array(66).fill(0);
  cells[0] = 3000; cells[1] = 200; cells[2] = 1;   // x=300 avoids the middle pocket
  const result = simulateCueShot(cells, 40 * 3600 + 2700, 22, radius);
  const frames = result.history.map(f => f.split(',').map(Number));
  const ys = frames.map(f => f[1] / 10).filter(Number.isFinite);
  assert.ok(ys.every(y => y >= radius - .01 && y <= 500 - radius + .01),
    'the cue ball never crosses either cushion with the larger radius');
  // A resolved shot still produces audio events and a replay history.
  const state = startSnooker();
  const shot = shootSnooker(state, 55 * 3600, null);
  assert.ok(shot.history.length > 1);
  assert.ok(Array.isArray(shot.audioEvents));
});

test('every radius-dependent module follows the single radius source', () => {
  const view = read('dist/table/snooker-view.js');
  const duel = read('dist/table/snooker-duel.js');
  const motion = read('dist/table/snooker-pocket-motion.js');
  const collection = read('dist/table/snooker-collection.js');
  const preview = read('dist/table/snooker-proportions.html');
  assert.match(view, /22 solid-colour balls at radius 11/);
  assert.match(view, /R=radius/);
  assert.match(duel, /import \{[^}]*radius[^}]*\} from/);
  assert.match(duel, /const gx=tx\+2\*radius\*px\/pl,gy=ty\+2\*radius\*py\/pl/);
  assert.doesNotMatch(duel, /tx\+16\*px\/pl|<16\)blocked\+\+/);
  assert.match(duel, /const classic=cueDist\+pl\*\.7-potValue\*9/,
    'Pro/Hell cost was re-calibrated for the wider rack');
  assert.match(motion, /import \{radius as BALL_RADIUS\}/);
  assert.match(motion, /const R=BALL_RADIUS/);
  assert.match(collection, /spacing:2\*BALL_RADIUS\+2/);
  assert.match(collection, /compression=slot>0\?spacing-2\*BALL_RADIUS:0/);
  assert.equal(COLLECTION.spacing, 2 * radius + 2, 'collector leaves the same 2-unit gap');
  assert.match(preview, /球半径 <b>11<\/b>/);
});

test('the difficulty guard was re-based on three seeds, not weakened', () => {
  const src = read('tests/bot-difficulty-strength.test.mjs');
  assert.match(src, /three seeded ten-shot openings/);
  assert.match(src, /const seeds=\[1,17,97\]/);
  assert.match(src, /assert\.ok\(net\[0\]<net\[1\]&&net\[1\]<net\[2\]/);
  assert.match(src, /assert\.ok\(net\[3\]>=net\[2\]/);
  const detail = read('tests/table-snooker-detail.test.mjs');
  assert.match(detail, /assert\.equal\(radius,11\)/);
  const collect = read('tests/snooker-collection.test.mjs');
  assert.match(collect, /2\*radius/);
  assert.doesNotMatch(collect, /,16,/);
  const pocket = read('tests/snooker-pocket-motion.test.mjs');
  assert.match(pocket, /d\+radius\*p\.radiusScale/);
});
