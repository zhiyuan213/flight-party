import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const shell = readFileSync(new URL('../dist/table/pool-shell.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../dist/table/pool-shell.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../dist/table/index.html', import.meta.url), 'utf8');
const preview = readFileSync(new URL('../dist/pool-result-preview.html', import.meta.url), 'utf8');
const table = readFileSync(new URL('../dist/table/table.js', import.meta.url), 'utf8');

test('the result reopen button inherits the leave button class list', () => {
  /* "View result" is injected directly above "Leave game". Every table theme
     styles .quiet / .pool-leave on the leave button, so mirroring its classes
     is what keeps the pair identical in width, height, radius and colour. */
  assert.match(shell, /const reopen=element\('button','pool-result-open '\+\$\('leave-play'\)\.className/);
  assert.match(shell, /reopen\.type='button';reopen\.hidden=true/);
  assert.match(shell, /reopen\.onclick=\(\)=>openResult\(false\)/);
  assert.match(shell, /shell\.sidebar\.insertBefore\(reopen,\$\('leave-play'\)\)/);
  assert.match(shell, /leave\.classList\.add\('pool-leave'\)/);
});

test('no private size or colour skin remains for .pool-result-open', () => {
  assert.doesNotMatch(css, /\[data-screen="play"\] \.pool-result-open\{/);
  /* The golden keyboard focus ring is an a11y affordance, not a static skin. */
  assert.match(css, /\.pool-result-open:focus-visible/);
  /* Both buttons reach the same per-theme rules once the classes are shared. */
  assert.match(css, /\.table-chat-layout \.play-sidebar button/);
  assert.match(css, /\.pool-game\[data-screen="play"\] \.pool-leave/);
});

test('both HTML pages load the same CSS build and the JS import stays versioned', () => {
  const jsVersion = table.match(/pool-shell\.js\?v=([\w-]+)/)?.[1];
  const cssVersion = html.match(/pool-shell\.css\?v=([\w-]+)/)?.[1];
  const previewVersion = preview.match(/pool-shell\.css\?v=([\w-]+)/)?.[1];
  assert.ok(jsVersion && cssVersion && previewVersion, 'all three assets are versioned');
  /* The version token itself is shared with other concurrent edits; what
     matters is that the game page and the result preview never drift apart. */
  assert.equal(cssVersion, previewVersion);
});
