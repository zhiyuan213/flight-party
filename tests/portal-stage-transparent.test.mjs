/* 2026-11-15 14:19 — the "border" beside the in-game dock.
   The dock has no CSS border at all; what read as a coloured frame was the
   seam between the transparent dock (showing the lobby nebula) and the opaque
   #0b1020 iframe / embedded intro. Make the embedded table-game intro a
   transparent window so one nebula covers the entire viewport. The Flight
   Party iframe, the play screen and standalone pages are deliberately out of
   scope — they keep their own opaque surfaces and readable text. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = p => readFileSync(path.join(ROOT, p), 'utf8');
const PORTAL = read('dist/portal/portal.css');
const AMBIENT = read('dist/ambient.css');
const INTRO = read('dist/table/table-home-clean.css');
const KEY = '20261115-staticnebula1';

const htmlPages = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    if (statSync(abs).isDirectory()) htmlPages(abs, out);
    else if (name.endsWith('.html')) out.push(abs);
  }
  return out;
};
const pages = htmlPages(path.join(ROOT, 'dist'));

test('the game stage and its iframe no longer paint an opaque surface', () => {
  assert.match(PORTAL, /\.game-stage\{[^}]*background:transparent\}/);
  assert.match(PORTAL, /\.game-stage iframe\{[^}]*border:0;background:transparent\}/);
  assert.ok(!PORTAL.includes('.game-stage iframe{width:100%;flex:1;border:0;background:#0b1020}'),
    'the old opaque iframe rule is gone');
});

test('the embedded table-game intro is a transparent window', () => {
  assert.match(AMBIENT, /html\.embedded-game\{[\s\S]{0,200}background:transparent/);
  assert.match(AMBIENT,
    /html\.embedded-game body\.table-home-theme:not\(\[data-screen="play"\]\)\{\s*background:transparent;\s*\}/);
  assert.match(AMBIENT,
    /html\.embedded-game body\.table-home-theme::before,[\s\S]{0,220}display:none/,
    'no second nebula / star layer is painted inside the iframe');
  assert.match(AMBIENT, /html\.embedded-game body\.table-home-theme i\.joymote/,
    'the duplicate floating motes are hidden too');
  // The standalone intro keeps its solid backdrop, so /table/index.html on its
  // own still renders correctly.
  assert.match(INTRO, /body\.table-home-theme:not\(\[data-screen="play"\]\)\{\s*background:#0b1020;\s*\}/);
});

test('the play screen and the Flight Party iframe are out of scope', () => {
  assert.match(AMBIENT, /body\.table-home-theme\[data-screen="play"\]::before,[\s\S]{0,120}display:none/);
  assert.ok(!/html\.embedded-game body\{[^}]*background:transparent/.test(AMBIENT),
    'no blanket override that would wash out the light-themed Flight Party page');
});

test('the lobby nebula itself is untouched', () => {
  assert.match(AMBIENT, /:root\{[\s\S]{0,120}--ambient-nebula-opacity:1/);
  assert.match(AMBIENT, /@keyframes ambient-drift\{[\s\S]{0,200}scale\(1\.12\)/);
  assert.match(PORTAL, /body\.playing #play aside\.game-rail\{background:transparent;background-image:none\}/,
    'the 13:25 transparent dock is preserved');
});

test('every host pulls the fresh stylesheets without bumping frozen keys', () => {
  const portalRefs = pages.filter(p => readFileSync(p, 'utf8').includes('portal.css'));
  const ambientRefs = pages.filter(p => readFileSync(p, 'utf8').includes('ambient.css'));
  assert.equal(portalRefs.length, 6, 'six shell pages load portal.css');
  assert.ok(ambientRefs.length >= 27, `${ambientRefs.length} pages load ambient.css`);
  for (const p of portalRefs) {
    const html = readFileSync(p, 'utf8');
    assert.match(html, /portal\.css\?v=20261115-railbg1&d=20261115-staticnebula1/, p);
  }
  for (const p of ambientRefs) {
    const html = readFileSync(p, 'utf8');
    assert.match(html, /ambient\.css\?v=20261115-nebula1&d=20261115-staticnebula1/, p);
    assert.ok(!html.includes('ambient.css?v=20261114-cosmic1'), `${p}: no stale key`);
  }
  // The landing-page generator keeps the shared frozen key.
  assert.match(read('scripts/build-game-seo.mjs'), /ambient\.css\?v=20261115-nebula1/);
});
