import test from 'node:test';
import assert from 'node:assert/strict';
import {Game, FINISH} from '../dist/engine.js';
import {CanvasBoard} from '../dist/fallback.js';

const seats = [
  {type: 'human', name: 'You'},
  {type: 'human', name: 'Alex'},
  {type: 'bot', name: 'Milo'},
  {type: 'bot', name: 'Coco'},
];

// Exercise real renderer state transitions without replacing Canvas or browser APIs.
// Construction/drawing are intentionally excluded; these tests cover animation state.
function boardFor(game, reduced = false) {
  const board = Object.create(CanvasBoard.prototype);
  Object.assign(board, {
    reduced, generation: 0, anims: [], planes: [], keys: [],
    effects: [], trails: [], shake: 0, scale: 1, cx: 0, cy: 0,
  });
  board.setGame(game);
  return board;
}

const tick = () => new Promise(resolve => setImmediate(resolve));

async function advanceAnimationFrame(board, observe = () => {}) {
  const jobs = board.anims.splice(0);
  for (const job of jobs) {
    for (const progress of [0, .5, 1]) {
      job.update(progress);
      observe(board);
    }
    job.resolve();
  }
  await tick();
}

async function completeAnimation(board, promise, observe) {
  let settled = false;
  promise.then(() => { settled = true; }, () => { settled = true; });
  for (let frame = 0; !settled && frame < 100; frame++) {
    await advanceAnimationFrame(board, observe);
  }
  assert.ok(settled, 'animation must complete instead of leaving a pending turn');
  await promise;
  assert.equal(board.anims.length, 0, 'completed movement leaves no pending tween');
}

function assertMatchesGame(board, game) {
  // Reconstructing a board from the resolved game must agree with animated landing.
  const expected = boardFor(game);
  assert.equal(board.planes.length, expected.planes.length);
  for (const p of board.planes) {
    const q = expected.planes.find(q => q.color === p.color && q.piece === p.piece);
    assert.ok(q, 'rendered piece belongs to an enabled seat');
    for (const axis of ['x', 'y', 'z']) {
      assert.ok(Number.isFinite(p[axis]));
      assert.ok(Math.abs(p[axis] - q[axis]) < 1e-9, `${p.color}:${p.piece} lands at its rule position (${axis})`);
    }
    assert.equal(p.spin, 0);
    assert.equal(p.squash, 0);
    assert.equal(p.air, 0);
    assert.equal(p.shock, 0);
  }
}

test('animated departure, home entry and finish agree with resolved game positions', async () => {
  for (const [from, die] of [[-1, 3], [50, 4], [56, 6]]) {
    const game = new Game(seats);
    game.current.pieces[0] = from;
    const board = boardFor(game);
    game.roll(die);
    const result = game.move(0);
    const authoritativeState = JSON.stringify(game);
    let bumped = 0;
    let sawFlight = false;
    board.setSelectable(['0:0']);
    const animation = board.move(result, () => { bumped++; });
    assert.deepEqual(board.keys, [], 'piece picking is locked during movement');
    await completeAnimation(board, animation, b => {
      sawFlight ||= b.planes.some(p => p.color === 0 && p.piece === 0 && p.air === 1);
    });
    assert.ok(sawFlight);
    assert.equal(bumped, 0);
    assert.equal(JSON.stringify(game), authoritativeState, 'renderer must never advance or modify rule state');
    assertMatchesGame(board, game);
    if (from === 56) assert.equal(game.current.pieces[0], FINISH);
  }
});

test('stacked capture animates both opponents home and triggers one synchronized impact', async () => {
  const game = new Game(seats);
  game.current.pieces = [4, -1];
  game.players[3].pieces = [21, 21];
  const board = boardFor(game);
  game.roll(4);
  const result = game.move(0);
  assert.equal(result.captured.length, 2);
  let impactCount = 0;
  const flyingVictims = new Set();
  const promise = board.move(result, point => {
    impactCount++;
    assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
    assert.ok(board.planes.filter(p => p.color === 3).every(p => p.shock === 1));
  });
  await completeAnimation(board, promise, b => {
    for (const p of b.planes) if (p.color === 3 && p.air && p.spin) flyingVictims.add(p.piece);
  });
  assert.equal(impactCount, 1, 'one collision event must not play duplicate impact audio');
  assert.deepEqual([...flyingVictims].sort(), [0, 1]);
  assert.equal(board.trails.length, 2, 'each captured plane has its own flight path');
  assert.ok(board.effects.some(e => e.kind === 'impact'));
  assert.ok(board.effects.some(e => e.kind === 'smoke'));
  assertMatchesGame(board, game);
});

test('reduced motion resolves a stacked capture immediately without particles or queued animation', async () => {
  const game = new Game(seats);
  game.current.pieces = [4, -1];
  game.players[3].pieces = [21, 21];
  const board = boardFor(game, true);
  game.roll(4);
  const result = game.move(0);
  let impactCount = 0;
  await board.move(result, () => { impactCount++; });
  assert.equal(impactCount, 1);
  assert.deepEqual(board.anims, []);
  assert.deepEqual(board.effects, []);
  assert.deepEqual(board.trails, []);
  assert.equal(board.shake, 0);
  assertMatchesGame(board, game);
});

test('replacing a match cancels an in-flight move without leaking old effects into the new match', async () => {
  const game = new Game(seats);
  const board = boardFor(game);
  game.roll(4);
  const result = game.move(0);
  let impactCount = 0;
  const staleMove = board.move(result, () => { impactCount++; });
  assert.ok(board.anims.length > 0);
  const replacement = new Game(seats.map((seat, i) => ({...seat, type: i < 2 ? 'human' : 'off'})));
  board.setGame(replacement);
  board.setSelectable(['0:1']);
  await staleMove;
  assert.equal(impactCount, 0);
  assert.equal(board.planes.length, 4);
  assert.deepEqual(board.keys, ['0:1'], 'stale continuation must not clear the new selection');
  assert.deepEqual(board.anims, []);
  assert.deepEqual(board.effects, []);
  assert.deepEqual(board.trails, []);
  assertMatchesGame(board, replacement);
});

test('replacing a match during parallel capture returns resolves all old tweens safely', async () => {
  const game = new Game(seats);
  game.current.pieces = [4, -1];
  game.players[3].pieces = [21, 21];
  const board = boardFor(game);
  game.roll(4);
  const staleMove = board.move(game.move(0));
  for (let frame = 0; board.trails.length === 0 && frame < 30; frame++) {
    await advanceAnimationFrame(board);
  }
  assert.equal(board.trails.length, 2, 'test must cancel while both return flights are active');
  assert.ok(board.anims.length >= 2);
  const replacement = new Game(seats);
  replacement.players[1].pieces[0] = 31;
  board.setGame(replacement);
  const currentPlanes = board.planes;
  await staleMove;
  assert.equal(board.planes, currentPlanes);
  assert.deepEqual(board.anims, []);
  assert.deepEqual(board.effects, []);
  assert.deepEqual(board.trails, []);
  assert.equal(board.shake, 0);
  assertMatchesGame(board, replacement);
});
