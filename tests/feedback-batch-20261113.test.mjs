/* Regression for the 2026-11-13 14:00 feedback batch (six items):
   1) snooker matchup bar enlarged as a whole
   2) snooker win jingle deferred to the settled result dialog (Pool parity)
   3) red hit-point dot removed from the snooker cue ball
   4) chess board pointer movement no longer ticks the global hover sfx
   5) illegal chess move uses the Pool caption instead of the bottom toast
   6) Tic-tac-toe seat cards show each seat's own X / O piece style
   Source assertions are used because table.js is a browser ES module with a
   large DOM surface; the real-browser behaviour is covered by the CDP run. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const table = read('dist/table/table.js');
const html = read('dist/table/index.html');
const hud = read('dist/table/snooker-shell.css');
const view = read('dist/table/snooker-view.js');
const ball = read('dist/table/pool-ball.js');
const seatCss = read('dist/table/four-seat-piece.css');
const hover = read('dist/site-hover-sfx.js');
const poolCss = read('dist/table/pool-shell.css');
const shell = read('dist/table/pool-shell.js');

test('snooker matchup bar: every element grows together, not just the score', () => {
  assert.match(hud, /\.snooker-matchup\{[^}]*width:min\(900px,calc\(100% - 84px\)\);height:104px;min-height:104px/);
  assert.match(hud, /\.snooker-matchup #seats\{[^}]*gap:210px/);
  assert.match(hud, /\.snooker-matchup \.avatar-shell\{width:58px;height:58px;flex:0 0 58px\}/);
  assert.match(hud, /\.snooker-matchup \.seat-name strong\{font-size:19px;max-width:220px/);
  assert.match(hud, /\.snooker-matchup \.seat-status\{font-size:13px/);
  assert.match(hud, /width:166px;height:72px;border:1px solid #2b3d5a;border-radius:12px/);
  assert.match(hud, /\.snooker-score\{font-size:28px/);
  assert.match(hud, /\.snooker-target\{font-size:13px/);
  assert.match(hud, /\.snooker-target-ball\{width:25px;height:25px/);
  assert.match(hud, /\.snooker-targets-label\{font-size:12px/);
  assert.match(hud, /\.snooker-targets-note\{font-size:12px/);
});

test('snooker matchup bar: narrow breakpoints scale down without losing the gain', () => {
  assert.match(hud, /@media\(max-width:860px\)/);
  assert.match(hud, /\.snooker-matchup\{width:calc\(100% - 56px\);height:72px;min-height:72px\}/);
  assert.match(hud, /\.snooker-matchup #seats\{gap:110px\}/);
  assert.match(hud, /\.snooker-centre\{width:120px;height:56px\}/);
  assert.match(hud, /@media\(max-width:520px\)/);
  assert.match(hud, /\.snooker-matchup #seats\{gap:72px\}/);
  assert.match(hud, /\.snooker-centre\{width:96px;height:48px\}/);
  assert.match(html, /snooker-shell\.css\?v=20261113-hudbig2/);
});

test('snooker win jingle waits for the settled result dialog, exactly like Pool', () => {
  assert.match(table, /if\(!usesOpening&&game!=='pool'\)\{/);
  assert.match(table, /if\(!isCanvasGame\)playResultSound\(options\);/);
  assert.match(table, /updateGridResult\(options\);/);
  // The dialog still owns the exactly-once jingle after the replay settles.
  assert.match(shell, /if\(playSound\)resultSfx\(kind\)/);
  assert.match(shell, /celebrateResult\(outcome,celebrate\)/);
  assert.match(shell, /if\(\$\('board'\)\._animating\|\|\$\('board'\)\._striking\)/);
  // Non-canvas games keep the immediate cue.
  assert.match(table, /function playResultSound\(options\)\{/);
});

test('snooker cue ball: only the black rotation mark remains', () => {
  assert.doesNotMatch(view, /#e25046/);
  assert.doesNotMatch(view, /fillStyle='#e25046'/);
  assert.match(view, /No coloured hit-point dot on the cue ball/);
  // The cue tip still follows the hit-point selector; only the red dot is gone.
  assert.match(view, /const \[ox,oy\]=spinOffset\(\);/);
  assert.match(view, /drawCue\(ctx,\[c\[0\],c\[1\]\],angle\*1800\/Math\.PI,opts\.pull\|\|0,cueSkin\(true\)\)/);
  assert.match(ball, /if\(plain&&id===0\)for\(const side of \[1,-1\]\)/);
  assert.match(ball, /ctx\.fillStyle='#141414'/);
  // Pool's numbered cue ball keeps its own single red centre dot.
  assert.match(ball, /skin\?skin\.mark:'#d33f35'/);
});

test('chess pointer sweep is silent without touching the shared sfx version chain', () => {
  assert.match(table, /if\(game==='chess'\)\$\('board'\)\.setAttribute\('data-sfx','off'\);/);
  assert.match(hover, /\[data-sfx="off"\]/);
  assert.match(hover, /if\(!el\|\|el\.closest\(SKIP\)\|\|!el\.getClientRects\(\)\.length\)return null;/);
  assert.doesNotMatch(html, /site-hover-sfx\.js\?v=20261113/);
});

test('illegal chess move uses the Pool caption, not the bottom #message toast', () => {
  assert.match(table, /function showChessNotice\(text\)\{/);
  assert.match(table, /chessNotice\.className='pool-turn-toast chess-illegal-toast'/);
  assert.match(table, /panel\.append\(chessNotice\)/);
  assert.match(table, /chessNoticeTimer=setTimeout\(\(\)=>\{if\(chessNotice\)chessNotice\.hidden=true;\},2000\)/);
  assert.match(table, /showChessNotice\(document\.documentElement\.lang==='en'\?'Illegal move — choose another square\.':'这步不合法，请选择其他目标。'\)/);
  assert.doesNotMatch(table, /\$\('message'\)\.textContent='这步不合法/);
  // Same card as Pool: dark gold-rimmed surface, 2s fade, never blocks clicks.
  assert.match(poolCss, /\.pool-feedback,\.pool-turn-toast\{position:absolute;top:22%;left:50%;transform:translateX\(-50%\);pointer-events:none\}/);
  assert.match(poolCss, /\.pool-turn-toast\{z-index:6;[\s\S]{0,180}animation:pool-turn-pop 2s/);
});

test('Tic-tac-toe seat cards show each seat\'s own piece style', () => {
  assert.match(table, /document\.body\.classList\.add\('xo-game'\)/);
  assert.match(table, /if\(\(game==='four'\|\|game==='xo'\|\|game==='gomoku'\)&&profile\.name!=='等待加入'\)card\.append\(fourSeatPiece\(document,i\+1,profile\.name\)\)/);
  assert.match(seatCss, /body\.xo-game \.four-seat-piece\{[\s\S]{0,180}flex:0 0 42px;width:42px;height:42px/);
  assert.match(seatCss, /body\.xo-game \.four-seat-piece::before\{[\s\S]{0,220}clip-path:polygon\(/);
  assert.match(seatCss, /body\.xo-game \.four-seat-piece\[data-player="2"\]::before\{[\s\S]{0,220}mask:radial-gradient/);
  assert.match(seatCss, /body\.xo-game \.four-seat-piece\[data-cosmetic-piece\]::before\{[\s\S]{0,160}background:var\(--personal-mark\)/);
  assert.match(html, /four-seat-piece\.css\?v=20261113-gomokuseat1/);
  // Connect Four's coin badge is untouched.
  assert.match(seatCss, /body\.connect-four-game \.four-seat-piece\[data-player="1"\]\{background:var\(--four-one\)\}/);
});
