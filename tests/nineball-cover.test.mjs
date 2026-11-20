import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const bytes = p => readFileSync(new URL('../' + p, import.meta.url));
const text = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const KEY = '20261120-nineball-cover2';

test('nine-ball cover art is not a copy of the eight-ball cover', () => {
  const pool = bytes('dist/assets/covers/pool.jpg');
  const nine = bytes('dist/assets/covers/nineball.jpg');
  assert.ok(nine.length > 20000, 'cover must be a real raster image');
  assert.ok(!pool.equals(nine), 'the two game cards must show different artwork');
});

test('inline intro artwork is distinct per game', () => {
  const src = text('dist/table/intro-boot.js');
  const inline = key => {
    const m = src.match(new RegExp('"' + key + '":"data:image/webp;base64,([^"]+)"'));
    assert.ok(m, key + ' inline cover missing');
    return m[1];
  };
  assert.notEqual(inline('pool'), inline('nineball'));
  assert.ok(inline('nineball').length > 4000);
});

test('changed artwork URLs carry a freshly bumped cache key', () => {
  const cover = new RegExp('covers/nineball\\.jpg\\?v=' + KEY);
  assert.match(text('dist/portal/index.html'), cover);
  assert.match(text('dist/portal/portal.js'), cover);
  const intro = new RegExp('intro-boot\\.js\\?[^"]*&nine=' + KEY);
  assert.match(text('dist/table/index.html'), intro);
  assert.match(text('dist/portal/native-table.html'), intro);
});

test('the nine-ball OG share image differs from the pool one', () => {
  const pool = bytes('dist/assets/og/pool.png');
  const nine = bytes('dist/assets/og/nineball.png');
  assert.ok(!pool.equals(nine));
  assert.ok(nine.length > 10000);
});
