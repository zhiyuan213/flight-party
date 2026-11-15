/* Billiards cosmetics: twelve shop products (three free 默认 baselines +
   nine themed ones), the shared-cloth arbitration,
   per-ball styling, MY-only cue, and the Pool / Snooker canvas wiring.
   The rule module and the skin bridge are exercised as real code; the DOM
   surfaces are replaced by a tiny computed-style stub. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolveShared, resolveBoard, botOpponent, themeOf, THEMES}
  from '../dist/table/cosmetics-rules.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const points = read('dist/site-points.js');
const shop = read('dist/site-shop.js');
const css = read('dist/site-cosmetics.css');
const gameJs = read('dist/table/game-cosmetics.js');
const bridge = read('dist/table/billiard-cosmetics.js');
const poolView = read('dist/table/pool-view.js');
const snookerView = read('dist/table/snooker-view.js');
const ballPainter = read('dist/table/pool-ball.js');
const cuePainter = read('dist/table/pool-cue.js');
const poolTable = read('dist/table/pool-table.js');
const snookerTable = read('dist/table/snooker-table.js');
const KEY = '20261112-gamelanes1';

/* The shared rule is generic over the equipped field; board games keep their
   original resolveBoard() wrapper. */
test('shared arbitration: the table follows Annual VIP > VIP > normal > score > random', () => {
  const a = {annualVip: true, points: 0, table: 'table-neon'};
  const b = {vip: true, points: 9000, table: 'table-aurora'};
  assert.equal(resolveShared(a, b, 'table').id, 'table-neon');
  assert.equal(resolveShared(a, b, 'table').reason, 'tier');
  const p1 = {points: 800, table: 'table-jade'}, p2 = {points: 200, table: 'table-aurora'};
  assert.equal(resolveShared(p1, p2, 'table').id, 'table-jade');
  assert.equal(resolveShared(p1, p2, 'table').reason, 'points');
  const same = {vip: true, points: 400, table: 'table-neon'};
  const other = {vip: true, points: 400, table: 'table-jade'};
  assert.equal(resolveShared(same, other, 'table', () => 0).id, 'table-neon');
  assert.equal(resolveShared(same, other, 'table', () => .99).id, 'table-jade');
  assert.deepEqual(resolveShared({table: ''}, {table: ''}, 'table'),
    {id: '', winner: null, reason: 'none'});
  /* Backwards compatibility for the four board games. */
  assert.equal(resolveBoard({board: 'board-jade', points: 5}, {board: 'board-aurora', points: 1}).id,
    'board-jade');
});

test('the practice bot equips a table so the tie branches are reachable locally', () => {
  const bots = ['easy', 'normal', 'pro', 'hell'].map(botOpponent);
  assert.deepEqual(bots.map(b => themeOf(b.table)), ['neon', 'neon', 'jade', 'aurora']);
  assert.ok(bots.every(b => THEMES.includes(themeOf(b.table))));
  assert.equal(themeOf('table-aurora'), 'aurora');
  assert.equal(themeOf('ball-jade'), 'jade');
  assert.equal(themeOf('cue-neon'), 'neon');
});

test('shop: eighteen products, six per kind, one free baseline + five grades', () => {
  const products = [...shop.matchAll(/\{id:'((?:ball|cue|table)-[a-z]+)',kind:'(ball|cue|table)'/g)]
    .map(([, id, kind]) => ({id, kind}));
  assert.equal(products.length, 18);
  for (const kind of ['ball', 'cue', 'table']) {
    const ids = products.filter(p => p.kind === kind).map(p => p.id);
    assert.equal(ids.length, 6);
    assert.deepEqual(ids.map(themeOf), ['default', 'neon', 'crystal', 'jade', 'galaxy', 'aurora']);
    for (const id of ids) {
      assert.match(points, new RegExp(`'${id}':'(default|rare|epic|legend)'`), `${id} is graded`);
      assert.match(shop, new RegExp(`\\{id:'${id}',kind:'${kind}'`));
    }
  }
  for (const def of ['ball-default', 'cue-default', 'table-default'])
    assert.ok(points.includes("DEFAULT_" + def.split('-')[0].toUpperCase() + "='" + def + "'"),
      `${def} is the free baseline`);
  assert.match(shop, /section\('ball'\)\+section\('cue'\)\+section\('table'\)/);
  for (const label of ['成功替换台球', '成功替换球杆', '成功替换桌球台'])
    assert.ok(shop.includes(label), `${label} toast`);
  assert.ok(!/积分/.test(shop), 'the shop copy keeps the one-currency wording');
});

test('one shared colour table drives shop cards and both canvas games', () => {
  for (let i = 0; i < 16; i++)
    assert.match(css, new RegExp(`--ball-${i}:#[0-9a-f]{6}`), `ball ${i} has its own colour`);
  for (const theme of [...THEMES, 'default']) {
    assert.match(css, new RegExp(`\\[data-billiard-ball="${theme}"\\],\\[data-cosmetic-ball="${theme}"\\]`));
    assert.match(css, new RegExp(`\\[data-billiard-cue="${theme}"\\],\\[data-cosmetic-cue="${theme}"\\]`));
    assert.match(css, new RegExp(`\\[data-billiard-table="${theme}"\\],\\[data-cosmetic-table="${theme}"\\]`));
  }
  assert.match(css, /\.shop-billiard-art\{/);
  assert.match(css, /data-striped/);
  assert.match(shop, /data-billiard-ball=/, 'ball cards draw six individually numbered spheres');
  assert.match(shop, /style="--ball-body:var\(--ball-/, 'card spheres read the shared table');
});

test('game page retains the separate rack, cue and shared cloth path',()=>{
 const compact=gameJs.replace(/\s+/g,'');
 assert.ok(compact.includes("constBILLIARDS=['pool','snooker']"));
 assert.ok(compact.includes("resolveShared(me,opponent,'table')"));
 for(const kind of ['ball','cue','table'])assert.ok(compact.includes("setTheme(root,'data-cosmetic-"+kind+"',"+kind+"Theme)"));
 assert.ok(!/cosmetic-note|publishNote|caption\(/.test(gameJs));
});

test('canvas: every painter accepts a skin and keeps the un-themed path intact', () => {
  assert.match(ballPainter, /const plain=!!options\?\.plain,table=options\?\.palette\|\|palette,skin=options\?\.skin\|\|null/);
  assert.match(ballPainter, /skin\.colorFor/, 'each ball keeps its own colour');
  assert.match(ballPainter, /skin\.marks/, 'a per-id signature is drawn');
  assert.match(cuePainter, /export function drawCue\(ctx,c,angle,pull=0,skin=null\)/);
  assert.match(poolTable, /export function material\(snooker,skin\)/);
  assert.match(poolTable, /skin&&skin\.cloth\?skin\.cloth/, 'themed dye is applied inside material()');
  assert.match(poolTable, /makeTable\(ctx,options=\{\}\)/);
  assert.match(snookerTable, /snookerCloth\(options\.skin\|\|null\)/);
  assert.match(poolView, /billiard-cosmetics\.js\?v=/);
  assert.match(snookerView, /billiard-cosmetics\.js\?v=/);
  assert.match(poolView, /cue\(ctx,aim,opponent\.angle,opponent\.pull,null\)/,
    'the opponent keeps the original wooden cue');
  assert.match(poolView, /cue\(ctx,aim,host\._angle,pull\|\|host\._power\*\.8,myCue\)/,
    'only my own cue is themed');
  assert.match(snookerView, /cueSkin\(true\)/, 'my own snooker stroke wears the equipped cue');
  assert.match(poolView, /host\._tableKey!==undefined&&host\._tableKey!==tableKey/,
    'theme changes rebuild the cached cloth in BOTH directions, including back to 默认');
  assert.match(snookerView, /function ensureCloth\(\)/);
  assert.ok(bridge.includes(KEY), 'the bridge ships on the bumped key');
});

/* Real code: install a computed-style stub, then call the skin getters. */
function installDom(attributes) {
  const saved = {document: globalThis.document, getComputedStyle: globalThis.getComputedStyle};
  const element = {
    values: {...attributes},
    getAttribute(name) {return Object.hasOwn(this.values, name) ? this.values[name] : null;},
    setAttribute(name, value) {this.values[name] = value;}
  };
  const colours = {
    '--ball-0': '#f8faf6', '--ball-1': '#efc329', '--ball-2': '#2568d2',
    '--ball-3': '#c93639', '--ball-4': '#793caa', '--ball-5': '#e67920',
    '--ball-6': '#168669', '--ball-7': '#8d2d31', '--ball-8': '#141924',
    '--ball-9': '#efc329', '--ball-10': '#2568d2', '--ball-11': '#c93639',
    '--ball-12': '#793caa', '--ball-13': '#e67920', '--ball-14': '#168669',
    '--ball-15': '#8d2d31',
    '--ball-hi': '#eafff6', '--ball-lo': '#0d4432', '--ball-patch': '#f3fff8',
    '--ball-ink': '#0b3b2c', '--ball-ring': '#4be3a3', '--ball-glow': '#4be3a388',
    '--ball-stripe': '#f0fff6', '--ball-mark': '#d9b45c',
    '--cue-a': '#1a5138', '--cue-b': '#8ce6b8', '--cue-c': '#0d3325',
    '--cue-wrap': '#103e30', '--cue-wrap-hi': '#63d8a8', '--cue-ferrule': '#e8fff5',
    '--cue-butt': '#0b3527', '--cue-tip': '#7fe6bd',
    '--cloth': '#12452f', '--cloth-wood': '#2b5a3c', '--cloth-rim': '#d9b45c'
  };
  globalThis.document = {documentElement: element};
  globalThis.getComputedStyle = () => ({
    getPropertyValue: name => colours[name] || ''
  });
  return {
    element,
    cleanup() {
      globalThis.document = saved.document;
      globalThis.getComputedStyle = saved.getComputedStyle;
    }
  };
}

test('skin bridge: sixteen distinct balls, semantic snooker colours, MY-only cue', async () => {
  const env = installDom({
    'data-cosmetic-ball': 'jade', 'data-cosmetic-cue': 'jade',
    'data-cosmetic-table': 'jade', 'data-cosmetic-seat': '1'
  });
  try {
    const api = await import('../dist/table/billiard-cosmetics.js');
    const skin = api.ballSkin();
    assert.ok(skin);
    assert.equal(skin.theme, 'jade');
    assert.equal(skin.colorFor(3, false, '#000000'), '#c93639', 'ball 3 keeps its own colour');
    assert.equal(skin.colorFor(8, false, '#000000'), '#141924', 'the 8-ball stays black');
    assert.equal(skin.colorFor(1, true, '#ff0000'), '#ff0000',
      'snooker red / colour balls keep their semantic colour');
    assert.equal(skin.marks(3, false), 3);
    assert.equal(skin.marks(11, false), 11, 'ball 11 has a different signature from ball 3');
    assert.equal(skin.marks(0, true), 0, 'the plain cue ball has no ticks');
    assert.ok(api.cueSkin(true), 'my cue is themed');
    assert.equal(api.cueSkin(false), null, 'the opponent keeps the original wood');
    assert.deepEqual(api.tableSkin().cloth, [18, 69, 47], '#12452f jade baize');
    assert.equal(api.cosmeticKey(), 'jade|jade|jade|1');
    /* A theme change invalidates the cached canvases. */
    env.element.setAttribute('data-cosmetic-table', 'aurora');
    assert.equal(api.tableSkin().theme, 'aurora');
    assert.equal(api.cosmeticKey(), 'jade|jade|aurora|1');
  } finally {env.cleanup();}
});

test('skin bridge: with no attributes every painter falls back to the original', async () => {
  const env = installDom({});
  try {
    const api = await import('../dist/table/billiard-cosmetics.js');
    assert.equal(api.ballSkin(), null);
    assert.equal(api.cueSkin(true), null);
    assert.equal(api.tableSkin(), null);
  } finally {env.cleanup();}
});
