/* 2026-11-13 15:13 feedback: "上面整体放大些，另外桌子整体往右移动，
   保证桌子的正中间是跟上面正中间对齐的".

   Geometry measured in real Chrome before the change (1378x802):
     matchup centre 539 | table/canvas centre 594 (+55 from the rail grid)
     cloth centre ~594-33 = 561, i.e. ~+22 from the bar.
   At 1920x1080 the canvas collector gutter cancels the rail offset and the
   two centres coincide (+2px). So moving ONLY the table cannot both "move
   right" and "stay aligned": the fix is ONE shared --snooker-axis-shift
   applied to BOTH the bar and the table. Narrow layouts reset it to zero
   because they have no spare right-hand room. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const css = read('dist/table/snooker-shell.css');
const html = read('dist/table/index.html');
const fitter = read('dist/table/arcade-table.js');

test('one shared axis shifts the enlarged bar and the table right together', () => {
  assert.match(css, /\.snooker-game\[data-screen="play"\]\{--snooker-axis-shift:20px\}/);
  assert.match(css, /\.snooker-matchup\{[\s\S]{0,260}transform:translateX\(var\(--snooker-axis-shift,0px\)\)/);
  assert.match(css, /\.snooker-table\{[\s\S]{0,220}transform:translateX\(calc\(var\(--snooker-axis-shift,0px\) \* 2\)\)/);
  assert.match(css, /\.snooker-stage\{[\s\S]{0,700}padding-right:calc\(var\(--snooker-axis-shift,0px\) \* 2\)/);
  // Bar, table and the stage reservation all derive from ONE variable.
  const uses = css.match(/var\(--snooker-axis-shift,0px\)/g) || [];
  assert.equal(uses.length, 3, 'one axis, three consumers');
});

test('narrow layouts reset the axis so nothing can overflow', () => {
  const narrow = css.indexOf('@media(max-width:860px)');
  assert.ok(narrow >= 0);
  const reset = css.indexOf('--snooker-axis-shift:0px', narrow);
  assert.ok(reset > narrow, 'the 860px breakpoint zeroes the axis');
  assert.doesNotMatch(css, /@media\(max-width:520px\)\{[\s\S]{0,400}--snooker-axis-shift:20px/);
});

test('the enlarged bar keeps every element in step, including the narrow passes', () => {
  assert.match(css, /height:104px;min-height:104px/);
  assert.match(css, /gap:210px/);
  assert.match(css, /width:58px;height:58px;flex:0 0 58px/);
  assert.match(css, /font-size:19px;max-width:220px/);
  assert.match(css, /width:166px;height:72px/);
  assert.match(css, /\.snooker-score\{font-size:28px/);
  assert.match(css, /\.snooker-target-ball\{width:25px;height:25px/);
  assert.match(css, /height:72px;min-height:72px\}/);
  assert.match(css, /gap:110px\}/);
  assert.match(css, /\.snooker-centre\{width:120px;height:56px\}/);
  assert.match(css, /gap:72px\}/);
  assert.match(css, /\.snooker-centre\{width:96px;height:48px\}/);
  assert.match(css, /\.snooker-score\{font-size:17px/);
});

test('the transform does not disturb the canvas fitter or the shared version chain', () => {
  // fitter reads clientWidth/clientHeight (layout box, unaffected by transform).
  assert.match(fitter, /const w = wrap\.clientWidth \|\| rect\.width, h = wrap\.clientHeight \|\| rect\.height/);
  assert.match(fitter, /new ResizeObserver\(fit\)\.observe\(wrap\)/);
  assert.match(html, /snooker-shell\.css\?v=20261113-hudbig2/);
  // The shared 20261112-gamelanes1 keys stay untouched.
  assert.match(html, /pool-shell\.css\?v=20261112-gamelanes1/);
  assert.match(html, /site-cosmetics\.css\?v=20261112-gamelanes1/);
});
