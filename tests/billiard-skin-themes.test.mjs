import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, statSync} from 'node:fs';

const ROOT = new URL('../dist/', import.meta.url);
const text = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const KEY = 'skin=20261120-billiardskins1';

function files(dir = ROOT) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const url = new URL(entry, dir);
    const st = statSync(url);
    if (st.isDirectory()) out.push(...files(new URL(entry + '/', dir)));
    else if (/\.(html|js|mjs)$/.test(entry)) out.push(url);
  }
  return out;
}

test('billiard skins use the shop theme list, not the piece theme list', () => {
  const s = text('dist/table/game-cosmetics.js');
  assert.match(s, /const BILLIARD_SKIN_THEMES=\['default','neon','crystal','jade','galaxy','aurora'\];/);
  assert.match(s, /const skinTheme=\(id,billiards=false\)=>\{const t=themeOf\(id\);const list=billiards\?BILLIARD_SKIN_THEMES:ALL_PIECE_THEMES;/);
  assert.match(s, /const ballTheme=skinTheme\(equip\.ball,true\),cueTheme=skinTheme\(equip\.cue,true\),tableTheme=skinTheme\(lastDecision\.id,true\);/);
});

test('every shop cue theme is accepted by the billiard filter', () => {
  const shop = text('dist/site-shop.js');
  const ids = [...shop.matchAll(/\{id:'(cue-[a-z]+)',kind:'cue'/g)].map(m => m[1]);
  assert.ok(ids.length >= 6, 'all six cue products must exist');
  const themes = ids.map(id => id.replace(/^cue-/, ''));
  const allowed = ['default', 'neon', 'crystal', 'jade', 'galaxy', 'aurora'];
  for (const t of themes) assert.ok(allowed.includes(t), t + ' must be a valid billiard skin');
});

test('all edited module URLs carry the fresh skin cache key', () => {
  const pattern = /(?<![a-z0-9-])(?:game-cosmetics|four-drop|four-seat-piece|table)\.js\?[^"'\s<>]*/g;
  let hits = 0;
  for (const file of files()) {
    const s = readFileSync(file, 'utf8');
    for (const m of s.matchAll(pattern)) {
      assert.ok(m[0].includes(KEY), file.pathname + ' -> ' + m[0]);
      hits++;
    }
  }
  assert.ok(hits >= 10, 'the whole module chain must be bumped');
});
