/* Gomoku player cards use the same right-hand seat badge as Connect Four.
   Default shows each seat's stone (black / white); an equipped themed piece
   replaces the whole stone body with the shop's themed stone (--personal-stone),
   exactly the finish drawStoneFinish() paints on the Canvas board. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const table = read('dist/table/table.js');
const seatCss = read('dist/table/four-seat-piece.css');
const seatJs = read('dist/table/four-seat-piece.js');
const html = read('dist/table/index.html');

test('gomoku seats render a stone badge and swap in the shop themed stone', () => {
  assert.match(table, /document\.body\.classList\.add\('gomoku-game'\)/);
  assert.match(table, /if\(\(game==='four'\|\|game==='xo'\|\|game==='gomoku'\)&&profile\.name!=='等待加入'\)card\.append\(fourSeatPiece\(document,i\+1,profile\.name\)\)/);
  assert.match(seatCss, /body\.gomoku-game \.four-seat-piece\{[\s\S]{0,160}flex:0 0 42px;width:42px;height:42px/);
  assert.match(seatCss, /body\.gomoku-game \.four-seat-piece\[data-player="1"\]\{[\s\S]{0,120}radial-gradient\(circle at 32% 27%,#555653/);
  assert.match(seatCss, /body\.gomoku-game \.four-seat-piece\[data-player="2"\]\{[\s\S]{0,120}radial-gradient\(circle at 32% 27%,#ffffff/);
  assert.match(seatCss, /body\.gomoku-game \.four-seat-piece\[data-cosmetic-piece\]\{[\s\S]{0,120}background-image:var\(--personal-stone\)/);
  assert.match(seatJs, /--personal-stone/);
  assert.match(seatJs, /stoneUrl\(themed,seat\)/);
  assert.match(html, /four-seat-piece\.css\?v=20261113-gomokuseat1/);
});
