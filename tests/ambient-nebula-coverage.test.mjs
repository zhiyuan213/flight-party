import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = p => readFileSync(path.join(ROOT, p), 'utf8');
const CSS = read('dist/ambient.css');
const KEY = '20261115-nebula1';

function htmlPages(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    if (statSync(abs).isDirectory()) htmlPages(abs, out);
    else if (name.endsWith('.html')) out.push(abs);
  }
  return out;
}
const rel = p => path.relative(ROOT, p).replace(/\\/g, '/');

/* The nebula layer is position:fixed;inset:0, i.e. exactly one viewport big.
   With transform-origin at its centre, a keyframe covers the viewport only if
     50% + scale*50% + translateX >= 100%   (right edge)
     50% - scale*50% + translateX <= 0%     (left edge)
   and the same for Y. A reload starts at `from`, before site-floating-dots.js
   rewinds the phase, so `from` used to leave a plain-colour strip on the right. */
const driftStart = CSS.indexOf('@keyframes ambient-drift');
const driftBlock = CSS.slice(driftStart, CSS.indexOf('@keyframes', driftStart + 10));
const frames = [...driftBlock.matchAll(/(from|to)\s*\{transform:translate3d\(([-\d.]+)%,\s*([-\d.]+)%,\s*0\)\s*scale\(([\d.]+)\)\}/g)]
  .map(f => ({name: f[1], x: Number(f[2]), y: Number(f[3]), scale: Number(f[4])}));

test('every nebula drift keyframe still covers the full viewport', () => {
  assert.equal(frames.length, 2, 'both from and to frames are present');
  for (const f of frames) {
    const right = 50 + f.scale * 50 + f.x;
    const left = 50 - f.scale * 50 + f.x;
    const bottom = 50 + f.scale * 50 + f.y;
    const top = 50 - f.scale * 50 + f.y;
    assert.ok(right >= 100, `${f.name}: right edge ${right.toFixed(1)}% must reach the viewport edge`);
    assert.ok(left <= 0, `${f.name}: left edge ${left.toFixed(1)}% must reach the viewport edge`);
    assert.ok(bottom >= 100, `${f.name}: bottom edge ${bottom.toFixed(1)}%`);
    assert.ok(top <= 0, `${f.name}: top edge ${top.toFixed(1)}%`);
  }
});

test('the first frame is the one that used to leak the plain body colour', () => {
  const from = frames.find(f => f.name === 'from');
  assert.ok(from.scale >= 1.08,
    'the -4% X shift needs at least scale(1.08) to keep the right edge covered');
  assert.match(CSS, /body::before,\s*body::after\{\s*content:'';position:fixed;inset:0/);
  assert.match(read('dist/site-floating-dots.js'), /setProperty\('--nebula-delay', delay\)/,
    'the phase rewind across reloads is preserved');
});

test('every page and the SEO generator load the bumped ambient stylesheet', () => {
  const pages = htmlPages(path.join(ROOT, 'dist'))
    .filter(p => readFileSync(p, 'utf8').includes('ambient.css'));
  assert.ok(pages.length >= 27, `ambient is used by ${pages.length} pages`);
  for (const p of pages) {
    const html = readFileSync(p, 'utf8');
    assert.match(html, new RegExp(`ambient\\.css\\?v=${KEY}`), `${rel(p)}: new key`);
    assert.ok(!html.includes('ambient.css?v=20261114-cosmic1'), `${rel(p)}: no stale key`);
  }
  assert.match(read('scripts/build-game-seo.mjs'), new RegExp(`ambient\\.css\\?v=${KEY}`),
    'regenerating the landing pages keeps the same key');
  assert.ok(!read('dist/ambient.css').includes('scale(1.05)'), 'no leftover under-scaled frame');
});
