/* 2026-11-16 18:10 — "这三个，进来的时候一次过加载全部".
   The detail-page win-rate tabs used to fire one request per hover / click
   (pointerenter selects the tab too), so sweeping across three tabs cost three
   requests, and every pass cost three more. Now entry loads all three periods
   in parallel and switching only re-renders from boardCache. */
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const tj = read('dist/table/table.js');
const KEY = 'b=20261116-prefetch1';

test('entry fetches month / week / day together in one parallel pass', async () => {
  const source = tj.match(/\nasync function loadAllLeaderboards\(\)\{[\s\S]*?\n\}/);
  assert.ok(source, 'the batched loader is extractable');
  assert.match(source[0], /Promise\.all\(PERIODS\.map\(/);
  assert.match(tj, /const PERIODS=\['month','week','day'\];/);
  assert.match(tj, /await refreshStats\(\);loadAllLeaderboards\(\);render\(\);/,
    'init starts the batch without blocking the first frame');
  assert.match(tj, /refreshStats\(\);loadAllLeaderboards\(\);delete/,
    'a completed online match refreshes the whole batch once');

  const calls = [];
  let renders = 0;
  const ctx = vm.createContext({
    PERIODS: ['month', 'week', 'day'],
    boardCache: new Map(),
    boardLoadToken: 0,
    game: 'pool',
    request: async path => { calls.push(path); return []; },
    refreshLeaderboard: () => { renders++; },
    Promise, Map, Array
  });
  vm.runInContext(source[0] + '\nglobalThis.run = loadAllLeaderboards;', ctx);
  await ctx.run();
  assert.deepEqual(calls, [
    '/api/table/leaderboards/pool?period=month',
    '/api/table/leaderboards/pool?period=week',
    '/api/table/leaderboards/pool?period=day'
  ]);
  assert.equal(ctx.boardCache.size, 3, 'every period is cached');
  assert.equal(renders, 1, 'the board is painted once after the batch lands');
});

test('a stale batch cannot overwrite a newer settlement refresh', async () => {
  const source = tj.match(/\nasync function loadAllLeaderboards\(\)\{[\s\S]*?\n\}/)[0];
  assert.match(source, /if\(token!==boardLoadToken\)return;/);
  let renders = 0;
  const ctx = vm.createContext({
    PERIODS: ['month', 'week', 'day'], boardCache: new Map(), boardLoadToken: 0,
    game: 'pool', request: async () => [],
    refreshLeaderboard: () => { renders++; }, Promise, Map, Array
  });
  vm.runInContext(source + '\nglobalThis.run = loadAllLeaderboards;', ctx);
  await Promise.all([ctx.run(), ctx.run()]);
  assert.equal(renders, 1, 'only the newest batch paints the board');
});

test('a fast batch repaints after load so demo rows cannot cover real standings', async () => {
  const source = tj.match(/\nasync function loadAllLeaderboards\(\)\{[\s\S]*?\n\}/)[0];
  assert.match(source, /addEventListener\('load'/);
  assert.match(source, /if\(token===boardLoadToken\)refreshLeaderboard\(\)/);
  let renders = 0, loadHandler = null;
  const ctx = vm.createContext({
    PERIODS: ['month', 'week', 'day'], boardCache: new Map(), boardLoadToken: 0,
    game: 'pool', request: async () => [],
    refreshLeaderboard: () => { renders++; },
    document: {readyState: 'loading'},
    addEventListener: (type, fn) => { if (type === 'load') loadHandler = fn; },
    Promise, Map, Array
  });
  vm.runInContext(source + '\nglobalThis.run = loadAllLeaderboards;', ctx);
  await ctx.run();
  assert.equal(renders, 1, 'the batch paints immediately');
  assert.equal(typeof loadHandler, 'function', 'a load repaint is scheduled');
  loadHandler();
  assert.equal(renders, 2, 'the first-paint demo cannot hide the preloaded rows');
});

test('switching a tab is cache-only and never touches the network', () => {
  /* The declaration follows a block comment on the same line, so there is no
     leading newline to anchor on. */
  const render = tj.match(/function refreshLeaderboard\(\)\{[\s\S]*?\n\}/);
  assert.ok(render, 'the renderer is extractable');
  assert.match(render[0], /boardCache\.get\(period\)/);
  assert.doesNotMatch(render[0], /request\(|api\/table\/leaderboards/,
    'the renderer contains no network call');
  const select = tj.match(/function selectPeriod\(tab\)\{[\s\S]*?\n\}/);
  assert.ok(select, 'selectPeriod is extractable');
  assert.match(select[0], /refreshLeaderboard\(\)/);
  assert.doesNotMatch(select[0], /request\(|loadAllLeaderboards/,
    'hover / click only repaints from the cache');
  assert.match(tj, /if\(!tab\|\|period===tab\.dataset\.period\)return;/,
    'the same-period guard still avoids a pointless repaint');
  assert.doesNotMatch(tj, /'\?period='\+period/,
    'no remaining single-period request on the current tab');
});

test('both table hosts pull the prefetch-enabled script', () => {
  for (const p of ['dist/table/index.html', 'dist/portal/native-table.html']) {
    assert.match(read(p), new RegExp('table\\.js\\?v=20261115-joincoin1[^"\']*' + KEY),
      p + ': fresh table.js');
  }
  assert.match(read('scripts/build-native-games.mjs'), /composeNativeGame/,
    'native pages are still generated from the source host');
});
