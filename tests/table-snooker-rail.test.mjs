import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const arcade=readFileSync(new URL('../dist/table/arcade-table.js',import.meta.url),'utf8');
const view=readFileSync(new URL('../dist/table/snooker-view.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../dist/table/snooker-shell.css',import.meta.url),'utf8');
const pool=readFileSync(new URL('../dist/table/pool-view.js',import.meta.url),'utf8');
const poolCss=readFileSync(new URL('../dist/table/pool-shell.css',import.meta.url),'utf8');

test('the snooker left rail uses the same cue-control markup as Pool',()=>{
  assert.match(arcade,/<button class="pool-sound"/);
  assert.match(arcade,/<canvas class="pool-spot"/);
  assert.match(arcade,/<div class="pool-power-meter"[^>]*><div class="power-cue"><\/div><\/div>/,
    'the meter carries only the wooden cue, like Pool');
  assert.doesNotMatch(arcade,/<div class="power-fill">/,'the legacy gold fill is removed');
  assert.match(arcade,/aria-valuenow="0"/);
  assert.match(arcade,/<output class="pool-power-value">0%<\/output>/);
  assert.match(arcade,/type="range" min="0" max="100" value="0"/,'hidden power carrier starts at zero');
  assert.match(pool,/aria-valuenow="0"><div class="power-cue"><\/div><\/div><output class="pool-power-value">0%/,
    'Pool still idles its cue at zero power');
});

test('power zero is a valid idle value, not silently replaced by a minimum shot',()=>{
  assert.match(arcade,/Number\.isFinite\(raw\)\s*\?\s*Math\.round\(Math\.max\(0,/);
  assert.doesNotMatch(arcade,/Math\.max\(5, Math\.min\(100, Number\(value\) \|\| 5\)\)/);
  assert.match(arcade,/setPower\(Number\(power\.value\)\)/,'mount does not restore 55%');
  assert.match(arcade,/meter\.style\.setProperty\('--cue-pull', \(n \* \.98\) \+ '%'\)/);
  assert.doesNotMatch(arcade,/setProperty\('--pull'/,'no orphaned fill variable');
  assert.match(view,/setPower\(Number\(ui\.power\.value\)\)/,'reset keeps the host power');
  assert.doesNotMatch(view,/setPower\(Number\(ui\.power\.value\)\|\|55\)/);
  assert.match(view,/setPower\(0\);/,'every shot consumes the pull and restores the full cue');
});

test('the framed rail and extra shoot button are gone',()=>{
  assert.match(css,/\.snooker-rail\{[^}]*border:0;border-radius:0;background:none;overflow:visible/);
  assert.match(css,/\.snooker-rail\{[^}]*display:flex;align-items:center;justify-content:center/);
  assert.doesNotMatch(css,/1px solid #24374f/,'no visible rail border');
  assert.match(css,/\.snooker-shoot\{display:none!important\}/);
});

test('the control column is top-aligned to the fitted canvas and the cue grows with it',()=>{
  assert.match(css,/height:var\(--snooker-canvas-height,100%\);max-height:100%/,
    'the column matches the canvas height and still fills the rail before the fitter runs');
  assert.match(css,/\.snooker-rail \.pool-left-controls\{[^}]*align-self:center/);
  assert.match(css,/\.snooker-rail \.pool-left-controls\{[^}]*justify-content:flex-start/,
    'controls start at the canvas top edge instead of sitting in the middle');
  assert.doesNotMatch(css,/\.snooker-rail \.pool-left-controls\{[^}]*justify-content:center/);
  assert.match(arcade,/rail\?\.style\.setProperty\('--snooker-canvas-height', Math\.floor\(ch\) \+ 'px'\)/,
    'the fitter publishes the real canvas height');
  assert.match(arcade,/wrap\.getBoundingClientRect\(\)/,'the fitter has a layout fallback');
  assert.match(css,/\.snooker-rail \.pool-power-meter\{[^}]*flex:1 1 auto/,
    'the meter takes the leftover height, like Pool');
  assert.match(css,/\.snooker-rail \.pool-power-meter\{[^}]*max-height:600px/,
    'the cue keeps Pool ceiling on very tall screens');
  assert.doesNotMatch(css,/height:clamp\(170px,29dvh,520px\)/,'no fixed short stub');
  assert.match(poolCss,/\.pool-power-meter\{[^}]*flex:1;[^}]*max-height:480px/,'Pool meters are flexible');
  assert.match(poolCss,/\.pool-power-meter\{width:42px;max-height:600px\}/,'Pool ceiling is 600px');
  assert.match(css,/\.snooker-rail \.pool-power-meter\{flex:0 0 auto;height:clamp\(140px,24dvh,260px\)/,
    'narrow screens keep the compact meter so nothing overflows');
});

test('sound, hit point, meter, cue and percentage share Pool control scale',()=>{
  assert.match(css,/--snooker-rail-scale:\.64/);
  assert.match(css,/@media\(min-width:761px\)\{\.snooker-game\[data-screen="play"\]\{--snooker-rail-scale:1\.12\}\}/);
  assert.match(css,/@media\(min-width:1001px\)\{\.snooker-game\[data-screen="play"\]\{--snooker-rail-scale:1\.25\}\}/);
  assert.match(css,/grid-template-columns:calc\(80px \* var\(--snooker-rail-scale\)\)/);
  assert.match(css,/width:calc\(76px \* var\(--snooker-rail-scale\)\)/);
  assert.match(css,/width:calc\(78px \* var\(--snooker-rail-scale\)\)/);
  assert.match(css,/width:calc\(42px \* var\(--snooker-rail-scale\)\)/);
  assert.match(css,/width:calc\(18px \* var\(--snooker-rail-scale\)\)/);
  assert.match(css,/font-size:clamp\(10px,calc\(12px \* var\(--snooker-rail-scale\)\),15px\)/);
});
