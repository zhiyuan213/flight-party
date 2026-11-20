import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {poolStart} from '../dist/table/pool.js';

const ROOT = new URL('../dist/', import.meta.url);
const text = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const KEY = 'fix=20261120-nineball-return1';

function files(dir = ROOT) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const url = new URL(entry + (statSync(new URL(entry, dir)).isDirectory() ? '/' : ''), dir);
    if (statSync(url).isDirectory()) out.push(...files(url));
    else if (/\.(html|js|mjs)$/.test(entry)) out.push(url);
  }
  return out;
}

test('nine-ball racks only 1-9, so 10-15 must never be treated as pocketed', () => {
  const cells = poolStart('nineball').cells;
  for (let id = 1; id <= 9; id++) assert.equal(cells[id * 3 + 2], 1, id + ' must be live');
  for (let id = 10; id <= 15; id++) assert.equal(cells[id * 3 + 2], 0, id + ' must stay un-racked');
});

test('the return channel only tracks racked balls for nine-ball', () => {
  const s = text('dist/table/pool-view.js');
  assert.match(s, /const returnLimit=s\.game==='nineball'\?10:16;/);
  assert.match(s, /for\(let id=1;id<returnLimit;id\+\+\)/);
  assert.match(s, /if\(s\.game==='nineball'\)host\._returns=host\._returns\.filter\(e=>e\.scratch\|\|e\.id<=9\);/);
});

test('every edited view-module URL carries the fresh cache key', () => {
  const pattern = /(?<![a-z0-9-])(?:pool-view|pool|table)\.js\?[^"'\s<>]*/g;
  let hits = 0;
  for (const file of files()) {
    const s = readFileSync(file, 'utf8');
    for (const m of s.matchAll(pattern)) {
      assert.ok(m[0].includes(KEY), file.pathname + ' -> ' + m[0]);
      hits++;
    }
  }
  assert.ok(hits >= 15, 'all 18 module references must be bumped');
});
