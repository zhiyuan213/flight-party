import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const css = read('dist/table/table-home-clean.css');
const html = read('dist/table/index.html');
const REFRESH = '20261115-medalspace1';

const allCss = (() => {
  const out = [];
  const walk = dir => {
    for (const entry of readdirSync(resolve(root, dir), {withFileTypes: true})) {
      const rel = dir + '/' + entry.name;
      if (entry.isDirectory()) walk(rel);
      else if (entry.name.endsWith('.css')) out.push([rel, read(rel)]);
    }
  };
  walk('dist');
  return out;
})();

test('the top-three portrait rings are gone from the standings stylesheet', () => {
  assert.doesNotMatch(css, /:has\(\.rank-medal\.rank-[123]\) \.avatar-shell\{box-shadow/,
    'no rank-specific box-shadow on the portrait shell');
  assert.doesNotMatch(css, /\.avatar-shell\{box-shadow:0 0 0 2px/,
    'no 2px square ring on ANY leaderboard avatar');
  for (const metal of ['#efbe45', '#b8c9d8', '#d49a63']) {
    assert.ok(!new RegExp(metal + '\\}\\s*$', 'm').test(css.split('\n')
      .filter(l => l.includes('.avatar-shell')).join('\n')),
      `${metal} is no longer used to outline a portrait`);
  }
  assert.match(css, /NO coloured square frame: all ten rows show the same plain rounded-square/,
    'the intent is documented in place');
});

test('no stylesheet reintroduces a leaderboard portrait frame', () => {
  const offenders = allCss.filter(([, text]) =>
    /(?:leaderboard|rank-medal|podium)[^{}]*\.avatar-shell[^{}]*\{[^}]*box-shadow/.test(text) ||
    /\.avatar-shell\{box-shadow:0 0 0 [23]px/.test(text));
  assert.deepEqual(offenders.map(([p]) => p), [], 'no other file draws that ring');
});

test('the podium accents and the portraits themselves survive', () => {
  for (const rank of [1, 2, 3]) {
    assert.match(css, new RegExp(`rank-medal\\.rank-${rank}\\)\\{background:linear-gradient`),
      `row ${rank} keeps its metal wash`);
    assert.match(css, new RegExp(`rank-medal\\.rank-${rank}\\)::before\\{background:#`),
      `row ${rank} keeps its left accent bar`);
  }
  assert.match(css, /#leaderboard \.avatar-shell\{\s*width:30px;height:30px;flex:0 0 30px/,
    'portrait shell size is unchanged');
  assert.match(html, /id="leaderboard"/, 'the standings board still renders');
});

test('the edited stylesheet is cache-busted without forking the shared key', () => {
  assert.match(html, new RegExp('table-home-clean\\.css\\?v=20261115-joincoin1&d=' + REFRESH + '[^"]*"'),
    'the intro page pulls the new CSS');
  // The shared frozen key still matches the other touched assets.
  for (const asset of ['table.js', 'intro-boot.js']) {
    assert.match(html, new RegExp(asset + '\\?v=20261115-joincoin1'),
      `${asset} keeps the shared key`);
  }
  assert.equal((html.match(/table-home-clean\.css\?v=/g) || []).length, 1,
    'only one host loads the standings stylesheet');
});
