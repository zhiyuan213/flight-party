/* Regression: the arbitration caption above the board ("球组 星曜 · 球杆 翡翠
   · 台呢 霓虹（你的积分更高）" / "棋子 … · 棋盘 …") was removed on request.
   The cosmetics themselves, the arbitration rule and every published data-*
   attribute must survive. This test executes the real game-page module against
   a tiny DOM double and asserts that NOTHING is inserted above #board. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {resolve, dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolveBoard, resolveShared} from '../dist/table/cosmetics-rules.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const KEY = '20261112-gamelanes1';
const OLD = '20261112-' + 'glowborder1'; /* split so the bump script keeps it */
const gameJs = read('dist/table/game-cosmetics.js');
const gameCss = read('dist/table/game-cosmetics.css');
const tableJs = read('dist/table/table.js');
const tablePage = read('dist/table/index.html');

/* Minimal browser: if the old caption code came back it would have to call
   createElement('p') and board.parentNode.insertBefore(). */
function installDom(search, equipped) {
  /* The caption regression is exercised with REAL themed cosmetics; the free
     默认 baseline is covered by its own test below. The four board games own
     independent slots now, so every game needs its own themed board. */
  const savedEquip = equipped || {
    fourPiece: 'four-piece-neon', fourBoard: 'four-board-neon',
    gomokuPiece: 'gomoku-piece-neon', gomokuBoard: 'gomoku-board-neon',
    chessPiece: 'chess-piece-neon', chessBoard: 'chess-board-neon',
    xoPiece: 'xo-piece-neon', xoBoard: 'xo-board-neon',
    ball: 'ball-neon', cue: 'cue-neon', table: 'table-neon'
  };
  const savedShop = JSON.stringify({equipped: savedEquip});
  const attrs = new Map();
  const inserted = [], created = [];
  let noteLookups = 0;
  const rootEl = {
    getAttribute: name => attrs.has(name) ? attrs.get(name) : null,
    setAttribute: (name, value) => attrs.set(name, String(value)),
    removeAttribute: name => attrs.delete(name)
  };
  const boardEl = {
    values: {},
    setAttribute(name, value) {this.values[name] = String(value);},
    removeAttribute(name) {delete this.values[name];},
    parentNode: {insertBefore(node) {inserted.push(node);}}
  };
  const win = {
    addEventListener() {},
    __joyflockPoints: {get: () => ({})},
    __joyflockMe: {},
    __joyflockGamePoints: {get: () => ({points: 750})},
    __joyflockCosmeticsState: null
  };
  const saved = {
    window: globalThis.window, document: globalThis.document,
    location: globalThis.location, localStorage: globalThis.localStorage
  };
  globalThis.window = win;
  globalThis.document = {
    documentElement: rootEl,
    addEventListener() {},
    getElementById(id) {
      if (id === 'board') return boardEl;
      if (id === 'cosmetic-note') {noteLookups++; return null;}
      return null;
    },
    createElement(tag) {
      created.push(tag);
      return {id: '', className: '', textContent: ''};
    }
  };
  globalThis.location = {search};
  globalThis.localStorage = {
    getItem: k => k === 'joyflock.shop.v1' ? savedShop : null,
    setItem() {}, removeItem() {}
  };
  return {
    win, rootEl, boardEl,
    stats: () => ({inserted: inserted.length, created: [...created], noteLookups}),
    cleanup() {
      globalThis.window = saved.window; globalThis.document = saved.document;
      globalThis.location = saved.location; globalThis.localStorage = saved.localStorage;
    }
  };
}

test('source: neither the JS nor the CSS ships a caption element', () => {
  assert.ok(!/cosmetic-note|publishNote|caption\(/.test(gameJs),
    'game-cosmetics.js must not look up, build or write a caption');
  assert.ok(!/\.cosmetic-note\{|\.cosmetic-note\s/.test(gameCss),
    'game-cosmetics.css must not style a caption');
  assert.ok(!/球组 |棋子 |Balls |Pieces /.test(gameJs), 'no caption copy left behind');
  assert.match(gameJs,/__joyflockCosmeticsState/,'state remains available without a caption');
});

test('real module: a Pool match inserts no node above the board', async () => {
  const env = installDom('?game=pool');
  try {
    const api = await import('../dist/table/game-cosmetics.js?noteoff-pool');
    const st = env.stats();
    assert.deepEqual(st, {inserted: 0, created: [], noteLookups: 0});
    assert.equal(env.win.__joyflockCosmeticsState.game, 'pool');
    assert.equal(env.rootEl.getAttribute('data-cosmetic-ball'), 'neon');
    assert.equal(env.rootEl.getAttribute('data-cosmetic-cue'), 'neon');
    assert.ok(['neon', 'jade', 'aurora'].includes(env.rootEl.getAttribute('data-cosmetic-table')));
    assert.equal(env.rootEl.getAttribute('data-cosmetic-reason'), 'points',
      'my 750 points beat the normal bot\'s 200');
    assert.equal(env.rootEl.getAttribute('data-cosmetic-winner'), 'a');
    assert.equal(api.current().decision.reason, 'points');
  } finally {env.cleanup();}
});

test('real module: the free 默认 baseline publishes NO skin and stays clean', async () => {
  const env = installDom('?game=pool', {
    fourPiece: 'four-piece-default', fourBoard: 'four-board-default',
    gomokuPiece: 'gomoku-piece-default', gomokuBoard: 'gomoku-board-default',
    chessPiece: 'chess-piece-default', chessBoard: 'chess-board-default',
    xoPiece: 'xo-piece-default', xoBoard: 'xo-board-default',
    ball: 'ball-default', cue: 'cue-default', table: 'table-default'
  });
  try {
    const api = await import('../dist/table/game-cosmetics.js?noteoff-default');
    assert.deepEqual(env.stats(), {inserted: 0, created: [], noteLookups: 0});
    for (const name of ['data-cosmetic-ball', 'data-cosmetic-cue', 'data-cosmetic-table',
      'data-cosmetic-piece', 'data-cosmetic-board'])
      assert.equal(env.rootEl.getAttribute(name), null, `${name} is absent, not empty`);
    assert.equal(env.rootEl.getAttribute('data-cosmetic-reason'), 'none');
    assert.equal(env.rootEl.getAttribute('data-cosmetic-winner'), '');
    const st = api.current();
    assert.equal(st.ball, 'ball-default');
    assert.equal(st.ballTheme, '');
    assert.equal(st.cueTheme, '');
    assert.equal(st.tableTheme, '', 'the practice bot no longer forces a themed cloth');
    globalThis.location.search = '?game=gomoku';
    const boardState = api.applyCosmetics({mySeat: 1, matchKey: 'default-board'});
    assert.equal(boardState.pieceTheme, '');
    assert.equal(boardState.boardTheme, '');
    assert.equal(env.rootEl.getAttribute('data-cosmetic-piece'), null);
    assert.equal(env.boardEl.values['data-cosmetic-board'], undefined);
    assert.equal(env.stats().inserted, 0);
  } finally {env.cleanup();}
});

test('real module: board games, Snooker and non-cosmetic games also stay clean', async () => {
  const env = installDom('?game=four');
  try {
    const api = await import('../dist/table/game-cosmetics.js?noteoff-board');
    for (const [game, key] of [['four', 'four'], ['gomoku', 'gomoku'],
      ['chess', 'chess'], ['xo', 'xo'], ['snooker', 'snooker'], ['cards', 'cards']]) {
      globalThis.location.search = '?game=' + game;
      const state = api.applyCosmetics({mySeat: 1, matchKey: key});
      if (game === 'cards') {
        assert.equal(state, null, 'a non-cosmetic game clears the published attributes');
        assert.equal(env.rootEl.getAttribute('data-cosmetic-piece'), null);
      } else {
        assert.equal(state.game, game);
        assert.equal(env.rootEl.getAttribute('data-cosmetic-reason'), game==='four'?'single':game==='gomoku'?'none':'points');
        assert.equal(env.rootEl.getAttribute('data-cosmetic-winner'), game==='gomoku'?'':'a');
      }
      assert.equal(env.stats().inserted, 0, `${game} inserts no caption node`);
      assert.deepEqual(env.stats().created, [], `${game} creates no DOM element`);
    }
    assert.equal(env.stats().noteLookups, 0);
  } finally {env.cleanup();}
});

test('arbitration is unchanged: tier > points > random, still exported to rooms', async () => {
  const env = installDom('?game=pool');
  try {
    const api = await import('../dist/table/game-cosmetics.js?noteoff-api');
    assert.equal(api.profiles().me.points, 750);
    assert.equal(resolveBoard({annualVip: true, board: 'board-neon'},
      {vip: true, points: 9000, board: 'board-aurora'}).reason, 'tier');
    assert.equal(resolveShared({table: 'table-jade', points: 10},
      {table: 'table-aurora', points: 5}, 'table').id, 'table-jade');
    assert.equal(env.win.__joyflockCosmetics.version, KEY);
    assert.equal(typeof env.win.__joyflockCosmetics.setOpponent, 'function',
      'online rooms can still inject the verified second profile');
    assert.equal(typeof env.win.__joyflockCosmetics.resolveShared, 'function');
  } finally {env.cleanup();}
});

test('pages reference the new key and no 20261112 asset keeps the old key', () => {
  assert.match(tablePage, new RegExp(`\\./game-cosmetics\\.css\\?v=${KEY}`));
  assert.match(tableJs, new RegExp(`game-cosmetics\\.js\\?v=${KEY}`));
  const walk = dir => readdirSync(dir, {withFileTypes: true}).flatMap(e => {
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
  const stale = walk(resolve(root, 'dist'))
    .filter(f => /\.(js|css|html)$/.test(f) && readFileSync(f, 'utf8').includes(OLD));
  assert.deepEqual(stale.map(f => f.replace(root, '')), [], 'old cache key is gone');
});
