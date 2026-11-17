/* Regression guard: legacy light-theme sheets give every <aside> a white
   2px border-left (visual-v2/v3). The dark native game rail must reset it,
   otherwise a white line appears at x=0 on desktop-width viewports and a
   white rule appears above the rail on narrow viewports. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = p => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const css = read('dist/portal/native-game.css');
const generator = read('scripts/build-native-games.mjs');
const flight = read('dist/portal/native-flight.html');
const table = read('dist/portal/native-table.html');
const KEY = '&nl=20261117-noline1';

test('the legacy white side border is still the source of the line', () => {
  const v2 = read('dist/visual-v2.css');
  const v3 = read('dist/visual-v3.css');
  assert.match(v2, /aside\{[^}]*border-left:2px solid white/);
  assert.match(v3, /aside\{[^}]*border-left:2px solid #fff/);
  assert.match(v2, /@media\(max-width:700px\)[\s\S]*?aside\{[^}]*border-left:0;border-top:2px solid white/);
});

test('the dark rail explicitly resets all borders and the light-theme shadow', () => {
  const rule = css.match(/\.native-rail\{[^}]*\}/);
  assert.ok(rule, 'the .native-rail base rule exists');
  assert.match(rule[0], /border:0/);
  assert.match(rule[0], /box-shadow:none/);
  assert.match(rule[0], /background:transparent/);
  assert.match(css, /html\[data-native-game\] aside\{border-left:0;border-top:0\}/,
    'the hidden in-game <aside> is covered too');
  assert.match(css, /\.native-rail::-webkit-scrollbar\{display:none/);
  // The class selector (0,1,0) outranks the legacy `aside` selector (0,0,1),
  // including inside the legacy narrow-screen media queries.
  assert.ok(css.indexOf('.native-rail{') < css.indexOf('@media(max-width:600px)'));
});

test('every shipped entry loads the reset with a fresh cache key', () => {
  for (const [name, html] of [['flight', flight], ['table', table]]) {
    const m = html.match(/native-game\.css\?[^"]*/);
    assert.ok(m, `${name} loads native-game.css`);
    assert.ok(m[0].includes(KEY), `${name}: ${m[0]} must carry the new cache key`);
  }
  assert.ok(generator.includes(`native-game.css?v=20261115-restore1${KEY}`),
    'the generator emits the same versioned URL');
  assert.ok(!/native-game\.css\?v=20261115-restore1"/.test(generator),
    'no stale unversioned-by-nl reference remains');
});
