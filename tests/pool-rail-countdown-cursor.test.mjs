import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const shell = read('dist/table/pool-shell.css');
const cursor = read('dist/site-cursor.css');
const version = read('dist/site-points.js').match(/var VERSION='([^']+)'/)?.[1];
const cursorVersion = read('dist/site-points.js').match(/var CURSOR_VERSION='([^']+)'/)?.[1];
const cursorPages = ['dist/contact.html', 'dist/index.html', 'dist/membership.html',
  'dist/portal/index.html', 'dist/privacy.html', 'dist/shop.html',
  'dist/table/arcade.html', 'dist/table/index.html', 'dist/terms.html'];

test('the countdown scrim covers the left control rail, not only the table canvas', () => {
  assert.match(shell, /\.pool-game\[data-screen="play"\] \.pool-left-controls\{position:relative\}/);
  assert.match(shell,
    /\.pool-game\[data-screen="play"\] \.board\.pool:has\(\.pool-countdown:not\(\[hidden\]\)\) \.pool-left-controls::after\{/,
    'the scrim is driven by the [hidden] attribute that pool-countdown.js toggles');
  const block = shell.slice(shell.indexOf('.pool-left-controls::after'));
  assert.match(block, /content:'';position:absolute;inset:0;z-index:6;background:#020a17b8/);
  assert.match(block, /pointer-events:auto/, 'the rail must not stay clickable during 3 · 2 · 1');
  /* Same shade as the card itself — no double-dimmed strip and no bright seam. */
  assert.match(shell, /\.pool-countdown\{[^}]*background:#020a17b8/);
  assert.match(shell,
    /:has\(\.pool-countdown\[data-phase="GO"\]:not\(\[hidden\]\)\) \.pool-left-controls::after\{[\s\S]{0,140}background:#020a1750;pointer-events:none/,
    'the GO phase uses the lighter scrim and lets clicks through again');
  assert.ok(!/pool-left-controls\s*\{[^}]*display:none/.test(shell),
    'the spin / power controls are only dimmed, never removed from the game');
});

test('the spin-ball canvas keeps a plain crosshair instead of the shop hover cursor', () => {
  const hot = cursor.indexOf('[role="button"]');
  const fix = cursor.indexOf('canvas.pool-spot{cursor:crosshair!important}');
  assert.ok(hot > -1 && fix > hot, 'the override comes after the generic role selector');
  assert.match(cursor, /@media\(hover:hover\) and \(pointer:fine\)\{[\s\S]*canvas\.pool-spot\{cursor:crosshair!important\}[\s\S]*?\}/);
  /* Both games really do ship a role="button" canvas, so the override is needed. */
  assert.match(read('dist/table/pool-view.js'),
    /<canvas class="pool-spot"[^>]*role="button"/);
  assert.match(read('dist/table/arcade-table.js'),
    /<canvas class="pool-spot"[^>]*role="button"/);
  assert.match(read('dist/assets/cursor/plane-hover.svg'), /<circle/,
    'the hover cursor contains the gold ring that used to appear over the white ball');
  assert.ok(!/canvas\.pool-spot\{[^}]*var\(--joy-cursor-hover\)/.test(shell + cursor));
});

test('pool and cursor stylesheets ship on their matching published cache keys', () => {
  assert.ok(version, 'the wallet script publishes the shared key');
  assert.ok(cursorVersion, 'cursor assets publish their independent animation key');
  for (const p of cursorPages) {
    const text = read(p);
    assert.match(text, new RegExp('site-cursor\\.css\\?v=' + cursorVersion), `${p} cursor CSS`);
    assert.ok(!/site-cursor\.css\?v=20261108-(?:usa6|firstpaint1)/.test(text), `${p} has no stale key`);
  }
  for (const p of ['dist/table/index.html', 'dist/pool-result-preview.html']) {
    const text = read(p);
    assert.match(text, new RegExp('pool-shell\\.css\\?v=' + version), `${p} pool CSS`);
    assert.ok(!/pool-shell\.css\?v=20261110-backarrow1/.test(text), `${p} has no stale key`);
  }
  const tableVersion = read('dist/table/index.html').match(/pool-shell\.css\?v=([\w-]+)/)?.[1];
  const previewVersion = read('dist/pool-result-preview.html').match(/pool-shell\.css\?v=([\w-]+)/)?.[1];
  assert.equal(tableVersion, previewVersion, 'the game page and the preview never drift apart');
});
