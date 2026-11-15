import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const html = read('dist/table/index.html');
const js = read('dist/table/table.js');
const boot = read('dist/table/intro-boot.js');
const css = read('dist/table/table-home-clean.css');

const htmlFiles = [];
const walk = dir => {
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    const p = resolve(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.name.endsWith('.html')) htmlFiles.push(readFileSync(p, 'utf8'));
  }
};
walk(resolve(root, 'dist'));

test('the intro no longer renders a Join room button or join dialog', () => {
  for (const id of ['join-open', 'join-dialog', 'join', 'room-code', 'join-error', 'join-close', 'join-cancel']) {
    assert.ok(!html.includes(`id="${id}"`), `leftover #${id} in the markup`);
  }
  assert.ok(!html.includes('加入房间'), 'no visible Join room label');
  assert.ok(!/<dialog[^>]*class="join-dialog"/.test(html));
  // The three remaining launch buttons keep their original order.
  const order = ['id="quick"', 'id="friends"', 'id="computer"'].map(s => html.indexOf(s));
  assert.ok(order.every(n => n >= 0), 'quick / friends / computer still present');
  assert.ok(order[0] < order[1] && order[1] < order[2], 'button order unchanged');
  assert.ok(!html.includes('id="bot-difficulty"'), 'difficulty control moved into the single-player dialog');
});

test('shared-link auto join survives; manual join handlers are gone', () => {
  assert.match(js, /if\(params\.get\('room'\)\)enter\('FRIENDS',params\.get\('room'\)\)/,
    'a ?room= link must still enter the room automatically');
  assert.ok(js.includes("params.get('room')"), 'room param is still read');
  for (const dead of ['joinDialog', "$('join')", 'room-code', 'join-open', 'join-close', 'join-cancel', 'join-error']) {
    assert.ok(!js.includes(dead), `dead join handler: ${dead}`);
  }
  assert.match(js, /for\(const id of \['computer','quick','friends','again'\]\)/,
    'audio unlock still covers the remaining launch buttons');
});

test('first-frame boot and stylesheet no longer reference the join UI', () => {
  assert.ok(!boot.includes('join-open'));
  assert.ok(!css.includes('dialog#join-dialog'));
  assert.ok(!css.includes('.join-box'));
  assert.match(css, /Three stacked launch buttons: Quick play \/ Create room \/ Play computer/);
  assert.match(css, /\.launch-actions\{[^}]*grid-template-columns:minmax\(0,1fr\)/);
  // Previous rounds' standings layout must not regress.
  assert.match(css, /width:100%;max-width:520px;margin-left:auto;margin-right:auto/);
  assert.match(css, /--rank-row:34px/);
});

test('all three touched assets share one freshly bumped version tag', () => {
  const tags = [
    html.match(/src="table\.js\?v=([^"'&]+)/)?.[1],
    html.match(/intro-boot\.js\?v=([^"'&]+)/)?.[1],
    html.match(/table-home-clean\.css\?v=([^"'&]+)/)?.[1]
  ];
  assert.ok(tags.every(Boolean), 'each touched asset needs a version tag');
  assert.equal(new Set(tags).size, 1, 'the three assets must share one version');
  // Later passes may bump again; only "moved off the two old tags" matters.
  assert.notEqual(tags[0], '20261110-glove2');
  assert.notEqual(tags[0], '20261110-rankwidth1');
  const refs = htmlFiles.flatMap(s => [...s.matchAll(/table-home-clean\.css\?v=([^"'&]+)/g)].map(m => m[1]));
  assert.deepEqual([...new Set(refs)], [tags[0]]);
});
