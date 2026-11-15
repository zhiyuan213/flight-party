/* Pool's aim guides must look exactly like Snooker's: one solid pure-white
   stroke with a dark outline, not the old faint blue dashed line / warm yellow
   object-ball line. Presentation only: geometry, physics and rules untouched. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const poolView = read('dist/table/pool-view.js');
const snookerView = read('dist/table/snooker-view.js');
const poolTable = read('dist/table/pool-table.js');

const AIM = /const AIM_COLOUR='([^']+)',AIM_WIDTH=([\d.]+),AIM_OUTLINE='([^']+)'/;

test('pool declares the very same white aim constants as snooker', () => {
  const s = snookerView.match(AIM);
  const p = poolView.match(AIM);
  assert.ok(s, 'snooker still declares AIM_COLOUR/AIM_WIDTH/AIM_OUTLINE');
  assert.ok(p, 'pool now declares AIM_COLOUR/AIM_WIDTH/AIM_OUTLINE');
  assert.equal(s[1], '#ffffff', 'snooker aim is pure white');
  assert.deepEqual([p[1], p[2], p[3]], [s[1], s[2], s[3]]);
});

test('the old blue dashed guide, blue ghost ring and yellow object line are gone', () => {
  for (const old of ['#e6faff9c', '#effcffbb', '#fff5a780']) {
    assert.ok(!poolView.includes(old), old + ' must not survive in pool-view.js');
  }
  assert.ok(!poolView.includes('setLineDash'), 'the rolling dashed aim phase is gone');
  assert.ok(!poolView.includes('lineDashOffset'));
  assert.match(poolView, /AIM_COLOUR='#ffffff'/);
  assert.match(poolView, /const lineEnd=Math\.max\(0,length-radius-AIM_WIDTH\*\.5\)/,
    'the solid stroke stops at the near rim of the ghost ball');
  assert.match(poolView, /ctx\.fillStyle='#ffffff33';ctx\.fill\(\);strokeAim\(ctx\)/,
    'the ghost disc uses snooker\'s translucent white fill');
});

/* Execute the real functions from the shipped source against a canvas double.
   The slices deliberately exclude the ESM imports/exports, so the code that
   runs here is the same code the browser runs. */
function runGuides() {
  const strokeAim = poolView.slice(poolView.indexOf('function strokeAim('), poolView.indexOf('function drawTargetRings('));
  const rings = poolView.slice(poolView.indexOf('function drawTargetRings('), poolView.indexOf('// Preserve server positions'));
  const guide = poolView.slice(poolView.indexOf('function guide('), poolView.indexOf('\nexport function cancelPoolOpponentShot'));
  assert.ok(strokeAim.includes('AIM_COLOUR') && rings.includes('strokeAim') && guide.includes('strokeAim'));

  const calls = [];
  const state = {strokeStyle: '', fillStyle: '', lineWidth: 1, globalAlpha: 1,
    lineCap: 'butt', lineJoin: 'miter', lineDashOffset: 0, dash: [], path: []};
  const stack = [];
  const methods = {
    save() {stack.push({...state, dash: state.dash.slice(), path: state.path.slice()});},
    restore() {const s = stack.pop(); if (s) Object.assign(state, s);},
    beginPath() {state.path = [];},
    moveTo(x, y) {state.path.push(['M', x, y]);},
    lineTo(x, y) {state.path.push(['L', x, y]);},
    arc(x, y, r) {state.path.push(['A', x, y, r]);},
    setLineDash(d) {state.dash = d.slice(); calls.push({kind: 'dash', dash: d.slice()});},
    stroke() {calls.push({kind: 'stroke', color: state.strokeStyle, width: state.lineWidth,
      alpha: state.globalAlpha, cap: state.lineCap, join: state.lineJoin,
      path: state.path.slice(), dash: state.dash.slice()});},
    fill() {calls.push({kind: 'fill', color: state.fillStyle, alpha: state.globalAlpha,
      path: state.path.slice()});}
  };
  const ctx = new Proxy({}, {
    get: (_t, k) => k in methods ? methods[k] : state[k],
    set: (_t, k, v) => {state[k] = v; return true;}
  });

  // 16 balls: cue ball at (250,250), one live object ball at (500,250).
  const cells = Array(48).fill(0);
  cells[0] = 2500; cells[1] = 2500; cells[2] = 1;
  cells[3] = 5000; cells[4] = 2500; cells[5] = 1;

  const context = vm.createContext({ctx, calls, cells,
    AIM_COLOUR: '#ffffff', AIM_WIDTH: 2.4, AIM_OUTLINE: '#102015', R: 16});
  new vm.Script(strokeAim + rings + guide + `
    guide(ctx, cells, 0, 16, 1000);
    drawTargetRings(ctx, cells, [1], 16, .8);
  `).runInContext(context);
  return calls;
}

test('live guide paint: solid pure white with a dark under-stroke, no dashes', () => {
  const calls = runGuides();
  assert.equal(calls.filter(c => c.kind === 'dash').length, 0, 'no dashed line is drawn');
  const strokes = calls.filter(c => c.kind === 'stroke');
  assert.ok(strokes.length >= 8, 'guide, ghost, object line and target ring all stroke');

  const colours = new Set(strokes.map(s => s.color));
  assert.deepEqual([...colours].sort(), ['#102015', '#ffffff'],
    'every stroke is either the dark outline or pure white');
  const whites = strokes.filter(s => s.color === '#ffffff');
  assert.ok(whites.length >= 4);
  for (const s of whites) {
    assert.equal(s.width, 2.4, 'snooker line width');
    assert.equal(s.cap, 'round');
    assert.equal(s.join, 'round');
    assert.deepEqual(s.dash, [], 'solid, never dashed');
  }
  const outlines = strokes.filter(s => s.color === '#102015');
  assert.ok(outlines.length >= 4);
  for (const s of outlines) assert.equal(s.width, 3.8);
});

test('live guide paint: near-rim stop, white ghost disc and white object line', () => {
  const calls = runGuides();
  const lineStrokes = calls.filter(c => c.kind === 'stroke' && c.color === '#ffffff' && c.path.some(p => p[0] === 'L'));
  assert.ok(lineStrokes.length >= 2, 'incoming guide plus object-ball line');

  const incoming = lineStrokes[0].path;
  assert.equal(incoming[0][0], 'M');
  assert.equal(incoming[0][1], 250);
  assert.equal(incoming[0][2], 250);
  // hit at 500-32=468 units from the cue ball -> length 218; stop 16+1.2 short.
  assert.ok(Math.abs(incoming[1][1] - (250 + 218 - 16 - 1.2)) < 1e-6,
    'the white line stops at the ghost ball near rim');

  const outgoing = lineStrokes[1].path;
  assert.equal(outgoing[0][1], 500, 'object-ball line starts at the struck ball');
  assert.equal(outgoing[1][1], 572, 'and keeps the original 72-unit length');

  const fills = calls.filter(c => c.kind === 'fill');
  assert.ok(fills.some(f => f.color === '#ffffff33'), 'ghost disc is translucent white');
  assert.ok(fills.some(f => /^rgba\(255,255,255,/.test(f.color)), 'target ring is translucent white');
});

test('pool table markings are white while snooker markings stay untouched', () => {
  assert.match(poolTable, /ctx\.strokeStyle='#ffffff8a';ctx\.lineWidth=1\.35;/);
  assert.match(poolTable, /ctx\.fillStyle='#ffffff7a'/);
  assert.ok(!poolTable.includes('#d5eeff24') && !poolTable.includes('#c7e9fc44'),
    'the almost-invisible blue head string and spots are gone');
  assert.match(poolTable, /ctx\.strokeStyle='#e8f3d45e'/, 'snooker baulk line unchanged');
  assert.match(poolTable, /J O Y F L O C K/, 'no extra table decoration was added');
});

test('aim geometry, physics and shared cache keys are unchanged', () => {
  for (const fragment of [
    'export function samplePoolFrame',
    'export function poolAim',
    'if(wallY<=wallX&&Number.isFinite(wallY)){const hx=x+nx*wallY;if(hx>466&&hx<526)wall=wallY+140;}',
    "import {makeTable,TABLE_WIDTH,TABLE_HEIGHT,TABLE_PAD} from './pool-table.js?v=20261112-gamelanes1';"
  ]) assert.ok(poolView.includes(fragment), fragment);
  assert.equal(poolView.includes('AIM_COLOUR'), true);
});
