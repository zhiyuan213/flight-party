/* The computer-match dialog must use the same button family as the friends /
   invitation dialog. The computer dialog builds its own stylesheet inline in
   table.js, so these assertions keep the two copies of the visual contract in
   sync instead of letting the small right-aligned accent button drift back. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const table = read('dist/table/table.js');
const roomCss = read('dist/table/room-dialog.css');
const html = read('dist/table/index.html');

const inline = table.match(/style\.textContent='([^']*)'/)?.[1] || '';
const ruleIn = (cssText, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return cssText.match(new RegExp(escaped + '\\{([^}]*)\\}'))?.[1] || '';
};
const rule = selector => ruleIn(inline, selector);
const roomRule = selector => ruleIn(roomCss, selector);
const declarations = text => Object.fromEntries(text.split(';').map(part => {
  const i = part.indexOf(':');
  return i < 0 ? ['', ''] : [part.slice(0, i).trim(), part.slice(i + 1).trim()];
}).filter(([k]) => k));

const KEY = '20261115-joincoin1';

test('the computer dialog injects one stylesheet and keeps its start action', () => {
  assert.ok(inline.length > 1000, 'the inline stylesheet is still generated in table.js');
  assert.match(table, /<div class="lg-actions"><button type="button" data-lg-start>/);
  assert.match(table, /localGameDialog\.querySelector\('\[data-lg-start\]'\)\.onclick=/);
  assert.match(table, /localGameDialog\.querySelector\('\[data-lg-level\]'\)\.value/);
  assert.match(table, /data-lg-noguide/);
});

test('the start button is no longer the small right-aligned accent button', () => {
  assert.ok(!/<button[^>]*class="primary"[^>]*data-lg-start/.test(table),
    'dropping .primary avoids the home page accent rules overriding the dialog');
  assert.ok(!/\.lg-actions button\.primary/.test(inline));
  assert.ok(!/justify-content:flex-end/.test(rule('.lg-actions')));
  assert.ok(!/#3c54bd/.test(inline), 'the old bright blue fill is gone');
  const actions = declarations(rule('.lg-actions'));
  assert.equal(actions.display, 'grid');
  assert.equal(actions['grid-template-columns'], 'minmax(0,1fr)');
  assert.equal(actions.margin, '0');
});

test('the start button uses exactly the invitation dialog button contract', () => {
  const roomBtn = declarations(roomRule('body.table-home-theme dialog#waiting #room-tools button'));
  const localBtn = declarations(rule('.local-game-dialog .lg-actions button'));
  assert.ok(Object.keys(roomBtn).length >= 9, 'the reference rule was parsed');
  for (const property of ['width', 'min-height', 'padding', 'border-radius', 'border', 'background', 'color', 'box-shadow', 'font-size', 'line-height']) {
    assert.equal(localBtn[property], roomBtn[property], property + ' must match #room-tools button');
  }
  assert.match(inline, /\.local-game-dialog \.lg-actions button:hover:not\(:disabled\)\{background:#27375d;border-color:#6f8bff\}/);
  assert.match(roomCss, /#room-tools button:hover:not\(:disabled\)\{\s*background:#27375d;border-color:#6f8bff;/);
});

test('the dialog shell, heading, close button and backdrop match the invitation dialog', () => {
  const shell = declarations(rule('.local-game-dialog'));
  const room = declarations(roomRule('body.table-home-theme dialog#waiting'));
  for (const property of ['width', 'max-width', 'max-height', 'padding', 'border-radius', 'border', 'background', 'box-shadow']) {
    assert.equal(shell[property], room[property], property + ' must match dialog#waiting');
  }
  assert.equal(rule('.local-game-dialog::backdrop').trim(),
    roomRule('body.table-home-theme dialog#waiting::backdrop').trim());
  assert.match(inline, /@media\(max-height:520px\)\{\.local-game-dialog\{transform:translateY\(-4vh\)\}\}/);
  assert.equal(declarations(rule('.local-game-dialog h2'))['font-size'],
    declarations(roomRule('body.table-home-theme dialog#waiting h2'))['font-size']);
  const close = declarations(rule('.lg-close'));
  const roomClose = declarations(roomRule('body.table-home-theme dialog#waiting .close'));
  for (const property of ['top', 'right', 'width', 'height', 'font-size', 'border-radius']) {
    assert.equal(close[property], roomClose[property], 'close ' + property);
  }
});

test('form controls share the same surface palette without changing behaviour', () => {
  const select = declarations(rule('.lg-diff select'));
  assert.equal(select['border-radius'], '8px');
  assert.equal(select.background, '#1c2a4b');
  assert.equal(select.border, '1px solid #3d4f7d');
  assert.equal(select.width, '100%');
  assert.match(table, /\['easy','简单','Easy',0\],\['normal','一般','Normal',10\]/);
  assert.match(table, /localGameDialog\.showModal\(\)/);
});

test('the whole touched asset chain shares one freshly bumped cache key', () => {
  assert.match(html, new RegExp('src="table\\.js\\?v=' + KEY + '[^"]*"'));
  assert.match(html, new RegExp('room-dialog\\.css\\?v=' + KEY));
  assert.match(html, new RegExp('table-home-clean\\.css\\?v=' + KEY));
  assert.match(html, new RegExp('result-points\\.css\\?v=' + KEY));
  assert.match(table, new RegExp('pool-shell\\.js\\?v=' + KEY));
  assert.equal(read('dist/table/result-points.js').includes("RESULT_POINTS_VERSION = '" + KEY + "'"), true);
  assert.equal(read('dist/pool-result-preview.html').includes(KEY), true);
});
