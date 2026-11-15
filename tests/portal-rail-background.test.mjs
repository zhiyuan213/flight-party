import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const CSS = read('../dist/portal/portal.css');
const AMBIENT = read('../dist/ambient.css');
const EDITORIAL = read('../dist/portal/portal-editorial.css');
const KEY = '20261115-railbg1';
const REFRESH = '20261115-staticnebula1';
const SHELLS = ['../dist/portal/index.html', '../dist/membership.html', '../dist/terms.html',
  '../dist/privacy.html', '../dist/contact.html', '../dist/shop.html'];

test('the in-game left dock is transparent so it shows the lobby backdrop', () => {
  assert.match(CSS, /body\.playing #play aside\.game-rail\{background:transparent;background-image:none\}/,
    'the dock has no panel of its own in the playing view');
  assert.ok(CSS.indexOf('body.playing #play aside.game-rail') >
    CSS.indexOf('body.playing #fullscreen:hover'),
    'the rule is a base rule, outside the desktop hover media query');
  assert.match(CSS, /\.game-rail\{[^}]*background:transparent/,
    'the dock is still transparent outside the playing view');
  assert.ok(!/body\.playing #play aside\.game-rail\{[^}]*border/.test(CSS),
    'no divider is introduced at the seam');
});

test('the home backdrop is untouched: only the playing dock changed', () => {
  assert.match(AMBIENT, /:root\{[\s\S]{0,120}--ambient-nebula-opacity:1/,
    'the lobby keeps the full-strength nebula');
  assert.match(AMBIENT, /html\.embedded-game\{[\s\S]{0,140}--ambient-nebula-opacity:\.62/,
    'the embedded-game tuning variables are still declared');
  // The 14:19 pass stops painting that softer nebula inside the iframe: the
  // variables stay for the JS mote brightness, but the layer itself is hidden
  // so the lobby nebula is the single backdrop from edge to edge.
  assert.match(AMBIENT, /html\.embedded-game body\.table-home-theme::before,[\s\S]{0,220}display:none/,
    'no second nebula is painted inside the embedded table-game intro');
  assert.ok(!/--ambient-nebula-opacity\s*:/.test(EDITORIAL),
    'portal-editorial.css does not dim the home page');
  assert.doesNotMatch(CSS, /body\.playing #play aside\.game-rail\{[^}]*#0b1020/,
    'the old opaque #0b1020 dock is gone');
});

test('all six shell pages load the same freshly refreshed portal stylesheet', () => {
  for (const p of SHELLS) {
    const html = read(p);
    assert.match(html, new RegExp(`portal\\.css\\?v=${KEY}`), `${p}: shared key`);
    assert.match(html, new RegExp(`portal\\.css\\?v=${KEY}&d=${REFRESH}`), `${p}: fresh CSS`);
    assert.ok(!html.includes('portal.css?v=20261109-slim4'), `${p}: no stale key`);
  }
});
