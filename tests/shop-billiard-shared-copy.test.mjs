import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const shop = read('dist/site-shop.js');
const html = read('dist/shop.html');

const CN = '欢乐台球与欢乐九球共用 · ';
const EN = 'Shared by Pool & Nine-ball · ';

test('all three billiard sections say the cosmetics are shared by Pool and Nine-ball', () => {
  const sections = [
    ["t('Billiard balls','台球用球')", 'Six sets'],
    ["t('Cues','球杆')", 'Six cues'],
    ["t('Billiard tables','桌球台')", 'Six tables'],
  ];
  for (const [head, enBody] of sections) {
    const at = shop.indexOf(head);
    assert.ok(at > 0, 'section head exists: ' + head);
    const tail = shop.slice(at, at + 500);
    assert.ok(tail.includes(EN + enBody), 'English shared note: ' + head);
    assert.ok(tail.includes(CN), 'Chinese shared note: ' + head);
  }
  assert.equal((shop.match(/Shared by Pool & Nine-ball · /g) || []).length, 3,
    'exactly the three billiard sections carry the note');
  assert.equal((shop.match(/欢乐台球与欢乐九球共用 · /g) || []).length, 3,
    'exactly three Chinese notes');
});

test('non-billiard shop sections keep their own copy', () => {
  for (const body of ['Six planes', 'Four options', 'Rare: static', 'expressions and hairstyles']) {
    const at = shop.indexOf(body);
    assert.ok(at > 0, body);
    assert.ok(!shop.slice(Math.max(0, at - 90), at).includes('Shared by Pool'),
      body + ' must not be labelled as billiard-shared');
  }
});

test('the shop page loads the updated script with a fresh cache key', () => {
  const refs = [...html.matchAll(/src="(\/site-shop\.js\?[^"]+)"/g)].map(m => m[1]);
  assert.equal(refs.length, 1, 'one shop script reference');
  assert.match(refs[0], /shared=20261120-poolnineball1/);
  assert.ok(!read('dist/site-shop.js').includes('shared=20261120-poolnineball1'),
    'the key lives in the page, not in the module');
});
