import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {poolStart,poolBot} from '../dist/table/pool.js';
import {poolTargets,targetsFor,nineballTargets,settleNineBall,STATE_SIZE,PENALTY_VISIT,PENALTY_READY} from '../dist/table/pool-rules.js';
import {start,bot} from '../dist/table/grid-rules.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const base = () => poolStart('nineball').cells;

test('nine-ball keeps the 53-cell layout and racks exactly nine object balls in a diamond', () => {
  const s = poolStart('nineball');
  assert.equal(s.game, 'nineball');
  assert.equal(s.cells.length, STATE_SIZE);
  assert.equal(s.cells[2], 1, 'cue ball alive');
  const alive = [];
  for (let id = 1; id < 16; id++) if (s.cells[id * 3 + 2]) alive.push(id);
  assert.deepEqual(alive, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(s.cells[3], 6500, '1-ball apex x');
  assert.equal(s.cells[4], 2500, '1-ball apex y');
  assert.equal(s.cells[27], 7064, '9-ball centre x');
  assert.equal(s.cells[28], 2500, '9-ball centre y');
  for (const a of alive) for (const b of alive) if (a < b) {
    const dx = (s.cells[a * 3] - s.cells[b * 3]) / 10;
    const dy = (s.cells[a * 3 + 1] - s.cells[b * 3 + 1]) / 10;
    assert.ok(Math.hypot(dx, dy) >= 32, `${a}/${b} separated`);
  }
});

test('the eight-ball rack is untouched by the nine-ball branch', () => {
  const legacy = poolStart(), named = poolStart('pool');
  assert.equal(legacy.game, 'pool');
  assert.deepEqual(legacy.cells, named.cells);
  assert.equal(legacy.cells.length, STATE_SIZE);
  assert.equal(legacy.cells[24], 7064, 'existing golden fixture position');
  let count = 0;
  for (let id = 1; id < 16; id++) if (legacy.cells[id * 3 + 2]) count++;
  assert.equal(count, 15);
});

test('the lowest numbered ball is the only legal first contact', () => {
  const c = base();
  assert.deepEqual(nineballTargets(c), [1]);
  c[3 + 2] = 0;
  assert.deepEqual(nineballTargets(c), [2]);
  for (let id = 2; id <= 8; id++) c[id * 3 + 2] = 0;
  assert.deepEqual(nineballTargets(c), [9]);
  assert.deepEqual(targetsFor(c, 1, 'nineball'), [9]);
  assert.deepEqual(targetsFor(poolStart('pool').cells, 1, 'pool'), poolTargets(poolStart('pool').cells, 1));
});

test('a legal 9-ball wins, a 9 on a foul loses, and ordinary pots keep the turn', () => {
  const before = base(), win = before.slice();
  win[27 + 2] = 0;
  const won = settleNineBall(before, win, 1, [9], 1);
  assert.equal(won.foul, false);
  assert.equal(won.over, true);
  assert.equal(won.winner, 1);
  assert.equal(win[PENALTY_VISIT], 0);

  const scratch = settleNineBall(before, before.slice(), 1, [0, 9], 1);
  assert.equal(scratch.foul, true);
  assert.equal(scratch.over, true);
  assert.equal(scratch.winner, 2);

  const wrong = before.slice();
  const foul = settleNineBall(before, wrong, 1, [], 5);
  assert.equal(foul.foul, true);
  assert.equal(foul.over, false);
  assert.equal(foul.turn, 2);
  assert.equal(wrong[PENALTY_VISIT], PENALTY_READY);

  const keep = before.slice();
  keep[3 + 2] = 0;
  const potted = settleNineBall(before, keep, 1, [1], 1);
  assert.equal(potted.foul, false);
  assert.equal(potted.over, false);
  assert.equal(potted.turn, 1);
});

test('grid rules dispatch nine-ball to the shared billiard core and every bot level stays legal', () => {
  const s = start('nineball');
  assert.equal(s.game, 'nineball');
  assert.equal(s.cells.length, STATE_SIZE);
  for (const level of ['easy', 'normal', 'pro', 'hell']) {
    const command = bot(s, level, () => 0.5);
    assert.ok(Number.isInteger(command) && command >= 0, `${level} returns an integer command`);
    assert.ok(command < 9 * 363600, `${level} stays inside the shot encoding`);
  }
  assert.ok(Number.isInteger(poolBot(s, 'hell', () => 0.5)));
});

test('the Java authority mirrors the rack, the target rule and the room whitelist', () => {
  const pool = read('backend/src/main/java/com/flightparty/table/PoolRules.java');
  const grid = read('backend/src/main/java/com/flightparty/table/GridRules.java');
  const service = read('backend/src/main/java/com/flightparty/table/TableService.java');
  assert.match(pool, /int\[\]\[\] rack=\{\{1\},\{2,3\},\{4,9,5\},\{6,7\},\{8\}\}/);
  assert.match(pool, /nineballTargets\(/);
  assert.match(pool, /targetsFor\(s\.cells\(\),actor,s\.game\(\)\)/);
  assert.match(grid, /game\.equals\("nineball"\)/);
  assert.match(grid, /PoolRules\.start\(game\)/);
  assert.match(service, /"pool","nineball","bubbles","snooker"/);
  assert.match(service, /!r\.game\.equals\("nineball"\)/);
});

test('nine-ball is registered across the portal, native rail, SEO contract and cache chain', () => {
  assert.match(read('dist/portal/portal.js'), /\{id:'nineball'/);
  assert.match(read('dist/portal/index.html'), /\?game=nineball/);
  assert.match(read('dist/portal/native-table.html'), /data-native-link="nineball"/);
  assert.match(read('scripts/build-native-games.mjs'), /\['nineball','Nine-ball'/);
  assert.match(read('dist/seo-games.js'), /id: 'nineball', slug: 'nineball'/);
  assert.match(read('dist/sitemap.xml'), /\/games\/nineball\//);
  assert.match(read('dist/game-seo-meta.js'), /"nineball"/);
  assert.match(read('dist/bot-difficulty.js'), /'pool','nineball','snooker'/);
  assert.match(read('dist/table/table.js'), /const isPoolLike=game==='pool'\|\|game==='nineball'/);
  assert.match(read('dist/table/table.js'), /欢乐九球/);
  assert.equal((read('deploy/nginx.conf').match(/\^\(pool\|nineball\|/g) || []).length, 2);
  assert.match(read('dist/portal/native-table.html'), /&nine=20261120-nineball-cover2/);
  assert.ok(existsSync(new URL('../dist/assets/covers/nineball.jpg', import.meta.url)));
  const og = new URL('../dist/assets/og/nineball.png', import.meta.url);
  assert.ok(existsSync(og) && statSync(og).size > 10000);
});
