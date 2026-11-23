import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const bytes = p => readFileSync(new URL('../' + p, import.meta.url));
const text = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const KEY = '20261120-nineball-cover2';

test('nine-ball cover art is not a copy of the eight-ball cover', () => {
  const pool = bytes('dist/assets/covers/pool.jpg');
  const nine = bytes('dist/assets/covers/nineball-3d-20261123.jpg');
  assert.ok(nine.length > 20000, 'cover must be a real raster image');
  assert.ok(!pool.equals(nine), 'the two game cards must show different artwork');
});

test('first-paint and full-size cover paths use the same new artwork',()=>{
 const boot=text('dist/table/intro-boot.js'),presentation=text('dist/table/presentation.js');
 const portal=text('dist/portal/portal.js'),native=text('dist/portal/native-table.html');
 for(const k of ['snooker','bubbles','nineball']){
  const file=k+'-3d-20261123.jpg';
  for(const source of [boot,presentation,portal,native])assert.ok(source.includes(file),k+' artwork must agree across views');
  assert.ok(bytes('dist/assets/covers/'+file).length>20000);
 }
});

test('changed artwork URLs carry a freshly bumped cache key', () => {
  const cover = new RegExp('covers/nineball-3d-20261123\\.jpg\\?v=' + KEY);
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
