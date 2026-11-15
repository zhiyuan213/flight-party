/* 2026-11-15 14:33 — "为什么首页的背景跟详情页的背景不一样？"
   Since the 14:19 pass both pages paint the SAME nebula layer, but its drift
   phase came from a sessionStorage epoch that is private to each tab: two tabs
   opened seconds apart showed different frames of the 52s cycle, which read as
   two different backdrops. Derive the phase from the wall clock instead, so
   every tab, iframe and reload lands on the same frame at the same instant. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = p => readFileSync(path.join(ROOT, p), 'utf8');
const JS = read('dist/site-floating-dots.js');
const CSS = read('dist/ambient.css');
const REFRESH = '20261115-staticnebula1';

const htmlPages = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    if (statSync(abs).isDirectory()) htmlPages(abs, out);
    else if (name.endsWith('.html')) out.push(abs);
  }
  return out;
};

test('the nebula phase comes from the wall clock, not a per-tab epoch', () => {
  assert.match(JS, /var PERIOD = 52000;/);
  assert.match(JS, /var delay = '-' \+ \(\(Date\.now\(\) % PERIOD\) \/ 1000\)\.toFixed\(3\) \+ 's';/);
  assert.ok(!JS.includes('joyflock.nebula.epoch'),
    'the per-tab sessionStorage epoch is gone');
  assert.ok(!/now - saved < 3600000/.test(JS), 'no tab-local epoch fallback');
  assert.match(JS, /setProperty\('--nebula-delay', delay\)/,
    'the CSS variable is still written for ambient.css');
});

test('the nebula is pinned to one static, reload-safe frame', () => {
  const before = CSS.match(/body::before\{([\s\S]*?)\n\}/);
  assert.ok(before, 'body::before rule present');
  assert.match(before[1], /animation:none;/,
    'no per-document drift: every page and tab renders the same frame');
  assert.match(before[1], /transform:translate3d\(-4%,-2\.5%,0\) scale\(1\.12\)/,
    'the fixed frame is the same oversized one that cured the reload strip');
  assert.match(before[1], /animation-delay:var\(--nebula-delay,0s\)/,
    'the wall-clock hook stays available for a future opt-in drift');
  assert.match(CSS, /@keyframes ambient-drift\{[\s\S]{0,200}scale\(1\.12\)/,
    'both keyframes are kept so the coverage guards still apply');
});

test('both shell views still share one transparent backdrop', () => {
  const portal = read('dist/portal/portal.css');
  assert.match(portal, /\.game-stage iframe\{[^}]*background:transparent\}/);
  assert.match(CSS, /html\.embedded-game body\.table-home-theme:not\(\[data-screen="play"\]\)\{\s*background:transparent;\s*\}/);
  assert.match(CSS, /:root\{[\s\S]{0,120}--ambient-nebula-opacity:1/,
    'the lobby nebula stays at full strength');
});

test('every host pulls the phase-synchronised script without bumping its key', () => {
  const pages = htmlPages(path.join(ROOT, 'dist'))
    .map(p => [p, readFileSync(p, 'utf8')])
    .filter(([, html]) => html.includes('site-floating-dots.js'));
  assert.equal(pages.length, 19, `${pages.length} pages load the mote script`);
  for (const [p, html] of pages) {
    assert.match(html, /site-floating-dots\.js\?v=20261110-glove2&d=20261115-staticnebula1/, p);
    assert.ok(!html.includes('site-floating-dots.js?v=20261110-glove2"'), `${p}: no stale ref`);
  }
});
