/* Board-game cosmetics: shop products, pure arbitration rule and the four
   game renderers. The rule module has no DOM, so it is exercised as real code. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {resolveBoard, tierOf, pointsOf, themeOf, botOpponent, THEMES, TIER}
  from '../dist/table/cosmetics-rules.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const points = read('dist/site-points.js');
const shop = read('dist/site-shop.js');
const sharedCss = read('dist/site-cosmetics.css');
const gameCss = read('dist/table/game-cosmetics.css');
const gameJs = read('dist/table/game-cosmetics.js');
const table = read('dist/table/table.js');
const gomoku = read('dist/table/gomoku-view.js');
const tablePage = read('dist/table/index.html');
const shopPage = read('dist/shop.html');
const KEY = '20261112-gamelanes1';

test('arbitration: only one side picked a board -> that board wins', () => {
  assert.deepEqual(resolveBoard({board: 'board-jade', points: 0}, {board: '', points: 9999}),
    {id: 'board-jade', winner: 'a', reason: 'single'});
  assert.deepEqual(resolveBoard({board: '', points: 9999}, {board: 'board-aurora', points: 0}),
    {id: 'board-aurora', winner: 'b', reason: 'single'});
  assert.deepEqual(resolveBoard({board: ''}, {board: ''}), {id: '', winner: null, reason: 'none'});
});

test('arbitration: Annual VIP > VIP > normal, regardless of points', () => {
  const a = {annualVip: true, points: 0, board: 'board-neon'};
  const b = {vip: true, points: 5000, board: 'board-aurora'};
  assert.equal(resolveBoard(a, b).id, 'board-neon');
  assert.equal(resolveBoard(a, b).reason, 'tier');
  const vip = {vip: true, points: 0, board: 'board-jade'};
  const normal = {points: 9000, board: 'board-aurora'};
  assert.equal(resolveBoard(vip, normal).id, 'board-jade');
  assert.equal(resolveBoard(normal, vip).id, 'board-jade', 'order of the two seats is irrelevant');
  assert.equal(tierOf({annualMember: true}), TIER.annual);
  assert.equal(tierOf({member: true}), TIER.vip);
  assert.equal(tierOf({}), TIER.normal);
});

test('arbitration: equal tier -> higher cumulative game points wins', () => {
  const a = {points: 800, board: 'board-jade'};
  const b = {points: 200, board: 'board-aurora'};
  const win = resolveBoard(a, b);
  assert.equal(win.id, 'board-jade');
  assert.equal(win.reason, 'points');
  assert.equal(resolveBoard(b, a).id, 'board-jade');
  assert.equal(pointsOf({points: -5}), 0, 'negative or missing scores floor at zero');
});

test('arbitration: identical tier AND points -> a real coin flip', () => {
  const a = {vip: true, points: 400, board: 'board-neon'};
  const b = {vip: true, points: 400, board: 'board-jade'};
  const low = resolveBoard(a, b, () => 0), high = resolveBoard(a, b, () => .99);
  assert.equal(low.id, 'board-neon');
  assert.equal(high.id, 'board-jade');
  assert.equal(low.reason, 'random');
  assert.equal(high.reason, 'random');
});

test('local bot opponent is a normal-tier practice profile keyed by difficulty', () => {
  const levels = ['easy', 'normal', 'pro', 'hell'];
  const bots = levels.map(botOpponent);
  assert.deepEqual(bots.map(b => b.points), [0, 200, 600, 1200]);
  assert.ok(bots.every(b => b.tier === TIER.normal && b.bot === true));
  assert.ok(bots.every(b => THEMES.includes(themeOf(b.board))));
  assert.equal(botOpponent('unknown').points, 0, 'unknown level falls back to Easy');
  assert.equal(botOpponent('unknown').level, 'easy');
  assert.equal(botOpponent().level, 'easy', 'no stored choice defaults to Easy');
  assert.equal(botOpponent().points, 0);
  assert.equal(themeOf('piece-aurora'), 'aurora');
  assert.equal(themeOf('board-jade'), 'jade');
  assert.equal(themeOf('four-piece-jade'), 'jade', 'per-game piece ids resolve too');
  assert.equal(themeOf('gomoku-board-aurora'), 'aurora', 'per-game board ids resolve too');
  assert.equal(themeOf('xo-piece-default'), 'default');
});

test('shop exposes three personal families and independent Four / Chess / XO boards',()=>{
 const products=[...shop.matchAll(/\{id:'((?:four|gomoku|chess|xo)-(?:piece|board)-[a-z]+)',kind:'((?:four|gomoku|chess|xo)(?:Piece|Board))'/g)].map(([,id,kind])=>({id,kind}));
 assert.equal(products.length,36);
 for(const [game,role]of [['four','piece'],['four','board'],['gomoku','piece'],['xo','piece'],['chess','board'],['xo','board']]){
  const ids=products.filter(p=>p.kind===game+(role==='piece'?'Piece':'Board')).map(p=>p.id);
  assert.deepEqual(ids,['default','neon','coral','jade','pearl','aurora'].map(t=>game+'-'+role+'-'+t));
 }
 assert.match(shop,/cosmeticArt\(item\)/);
});
test('game render wiring uses per-seat decorations and only Chess board overrides',()=>{
 assert.match(table,/seatProfiles:room\?\.profiles,network:!!room/);
 assert.match(table,/decoratePieces\(\$\('board'\)\)/);
 assert.match(gameJs,/pieceThemes/);assert.match(gameJs,/decisionKey!==lastMatchKey/);
 assert.match(gameCss,/#board\.chess\[data-cosmetic-board\]/);
 assert.doesNotMatch(gameCss,/--piece-fill|--four-one:|#board\.gomoku\[data-cosmetic-board\]/);
 assert.match(gomoku,/data-cosmetic-piece-1/);assert.match(gomoku,/data-cosmetic-piece-2/);
 assert.match(gomoku,/drawStoneFinish\(ctx,theme/);
 assert.match(gomoku,/body\.addColorStop\(0, '#555653'\)/);
 assert.match(gomoku,/body\.addColorStop\(0, '#ffffff'\)/);
});
