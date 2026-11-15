/* Regression for the frozen Pool match: a pocketed ball used to be painted
   with the skin object in the `light` slot, so drawPoolBall computed NaN
   coordinates and createRadialGradient threw. One exception killed the rAF
   loop -> the table froze and the cue never came back. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {drawPoolBall} from '../dist/table/pool-ball.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const KEY = '20261112-gamelanes1';
const OLD = '20261112-' + 'nonote1'; /* split so the bump script keeps it */
const poolView = read('dist/table/pool-view.js');
const snookerView = read('dist/table/snooker-view.js');
const ballJs = read('dist/table/pool-ball.js');

/* Canvas double that records every gradient argument. A non-finite value here
   is exactly what Chrome rejects with
   "Failed to execute 'createRadialGradient': The provided double value is
   non-finite." */
function makeCtx() {
  const gradients = [];
  const methods = {
    createRadialGradient(...args) {gradients.push(['radial', ...args]); return {addColorStop() {}};},
    createLinearGradient(...args) {gradients.push(['linear', ...args]); return {addColorStop() {}};}
  };
  const ctx = new Proxy(methods, {
    get: (target, key) => target[key] !== undefined ? target[key] : (() => {}),
    set: () => true
  });
  return {ctx, gradients};
}

const skin = {
  colorFor: (id, plain, original) => original,
  marks: () => 3,
  hi: '#ffffff', lo: '#000000', patch: '#fffbed', ink: '#111722',
  ring: '#4be3a3', stripe: '#f9f7ee', mark: '#d33f35'
};

test('pool-view passes light and options in separate slots', () => {
  assert.match(poolView,
    /drawPoolBall\(ctx,id,x,y,radius,roll\/16,heading,orientation,\{x:480,y:234\},\{skin\}\)/,
    'the rack balls keep the real light AND receive options.skin');
  assert.match(poolView,
    /drawPoolBall\(cc,id,x,y,r,angle,heading,orientation,null,\{skin:bSkin\}\)/,
    'a returning / pocketed ball has no light, so no NaN can be produced');
  assert.ok(!/\{x:480,y:234,skin\}/.test(poolView), 'the old broken light object is gone');
  assert.ok(!/orientation,\{skin:bSkin\}\)/.test(poolView));
  assert.match(snookerView,
    /\{\.\.\.SNOOKER_LIGHT,x:\(global\?PAD:0\)\+SNOOKER_LIGHT\.x,y:\(global\?PAD:0\)\+SNOOKER_LIGHT\.y\},\{plain:true,overhead:true,palette:colours,skin:ballSkin\(\)\}/,
    'snooker already used the correct 10-argument form');
});

test('the sphere painter normalises bad arguments instead of throwing', () => {
  assert.match(ballJs, /r=Number\.isFinite\(r\)&&r>0\?r:16/);
  assert.match(ballJs, /x=Number\.isFinite\(x\)\?x:0;y=Number\.isFinite\(y\)\?y:0/);
  assert.match(ballJs, /const lit=light&&Number\.isFinite\(light\.x\)&&Number\.isFinite\(light\.y\)\?light:null/);
  assert.match(ballJs, /const lx=direction\?direction\.x:lit\?.*ly=direction\?direction\.y:lit\?/);
});

test('real painter: normal call, old broken shape, NaN radius and NaN centre are all safe', () => {
  const cases = [
    ['normal themed ball', [3, 60, 60, 18, 0, 0, null, {x: 480, y: 234}, {skin}]],
    ['legacy skin-in-light shape', [3, 60, 60, 18, 0, 0, null, {skin: null}]],
    ['NaN radius and x', [3, NaN, 60, NaN, 0, 0, null, {skin: null}, {}]],
    ['NaN centre and light.y', [3, NaN, NaN, 18, 0, 0, null, {x: 1, y: NaN}, {skin}]],
    ['zero radius', [8, 40, 40, 0, 0, 0, null, {x: 10, y: 10}, {skin}]]
  ];
  for (const [name, args] of cases) {
    const {ctx, gradients} = makeCtx();
    assert.doesNotThrow(() => drawPoolBall(ctx, ...args), name);
    const radial = gradients.find(g => g[0] === 'radial');
    assert.ok(radial, `${name}: the sphere shading gradient is created`);
    assert.equal(radial.length, 7, `${name}: six numeric gradient arguments`);
    assert.ok(radial.slice(1).every(Number.isFinite), `${name}: every argument is finite`);
    assert.ok(gradients.every(g => g.slice(1).every(Number.isFinite)),
      `${name}: linear gradient stays finite too`);
  }
});

test('a themed rack still reaches the painter options (not only the attributes)', () => {
  const {ctx, gradients} = makeCtx();
  let colourAsked = 0;
  const spy = {...skin, colorFor: (id, plain, original) => {colourAsked++; return original;}};
  drawPoolBall(ctx, 11, 60, 60, 18, 0, 0, null, {x: 480, y: 234}, {skin: spy});
  assert.equal(colourAsked, 1, 'options.skin is used for the per-ball colour');
  assert.ok(gradients.some(g => g[0] === 'linear'), 'the themed tint gradient is drawn');
});

test('bumped cache key is consistent and the old one is gone', () => {
  for (const p of ['dist/table/pool-view.js', 'dist/table/snooker-view.js',
    'dist/table/billiard-cosmetics.js', 'dist/table/cosmetics-rules.js',
    'dist/table/index.html', 'dist/site-points.js'])
    assert.ok(read(p).includes(KEY), `${p} uses ${KEY}`);
  assert.ok(!poolView.includes(OLD) && !ballJs.includes(OLD), 'no stale cache key');
  assert.ok(!snookerView.includes(OLD));
});
