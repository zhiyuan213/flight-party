import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const snooker = read('../dist/table/snooker-shell.css');
const bubbles = read('../dist/table/bubbles-fine.css');
const KEY = '&m=20261116-mobileplay1';
const hosts = ['../dist/table/index.html', '../dist/portal/native-table.html', '../dist/table/arcade.html'];

test('mobile snooker gives the score plaque its own column instead of covering the avatars', () => {
  const block = snooker.slice(snooker.lastIndexOf('@media(max-width:860px)'));
  assert.ok(block.length > 200, 'the mobile media block exists');
  assert.match(block, /\.snooker-matchup\{display:flex;align-items:center;gap:6px;height:auto;min-height:0\}/,
    'the matchup bar becomes a three-column flex row');
  assert.match(block, /\.snooker-matchup #seats\{display:contents\}/,
    'the two seats become flex items of the bar');
  assert.match(block, /\.snooker-matchup \.snooker-centre\{position:static;left:auto;top:auto;transform:none;order:2;flex:0 0 auto\}/,
    'the plaque stops being an absolute overlay and becomes the middle column');
  assert.match(block, /\.snooker-matchup \.seat:first-child\{order:1\}/);
  assert.match(block, /\.snooker-matchup \.seat:nth-child\(2\)\{order:3\}/);
});

test('the desktop plaque, avatars and type sizes are unchanged', () => {
  assert.match(snooker, /\.snooker-centre\{\s*position:absolute;left:50%;top:50%;transform:translate\(-50%,-50%\)/,
    'desktop keeps the centred plaque');
  assert.match(snooker, /width:166px;height:72px/, 'desktop plaque size');
  assert.match(snooker, /\.snooker-score\{font-size:28px/, 'desktop score type');
  assert.match(snooker, /\.snooker-target-ball\{width:25px/, 'desktop target-ball size');
  /* The mobile pass must not silently shrink the faces or the score: no
     avatar-shell or score font-size override inside the new block. */
  const block = snooker.slice(snooker.lastIndexOf('@media(max-width:860px)'));
  assert.ok(!/avatar-shell\{[^}]*width:/.test(block), 'avatar width stays as authored');
  assert.ok(!/\.snooker-score\{[^}]*font-size/.test(block), 'score font stays as authored');
});

test('mobile bubbles gets a definite aspect-derived board height', () => {
  const block = bubbles.slice(bubbles.lastIndexOf('@media(max-width:760px)'));
  assert.ok(block.length > 80, 'the mobile media block exists');
  assert.match(block, /\.table-chat-layout \.game-panel>\.board\.arcade-board\.bubbles\{/,
    'only the bubble board in the table-chat layout is targeted');
  assert.match(block, /height:auto!important/,
    'the inline height:100% from bubbles.js must be outranked');
  assert.match(block, /flex:none/, 'the board stops stretching into an auto-height parent');
  assert.match(block, /aspect-ratio:1440\/765/,
    'WW=W*2=1440 and H=765 from bubbles-duel.js');
  assert.match(block, /\.table-chat-layout \.game-panel>\.board\.arcade-board\.bubbles\{[\s\S]{0,200}\}/,
    'all declarations live in one rule');
});

test('every host of the two stylesheets loads the new cache key', () => {
  for (const p of hosts) {
    const html = read(p);
    for (const asset of ['snooker-shell.css', 'bubbles-fine.css']) {
      if (!html.includes(asset)) continue;
      const url = html.match(new RegExp(asset.replace('.', '\\.') + '\\?[^"]*'));
      assert.ok(url, `${p}: ${asset} reference`);
      assert.ok(url[0].includes(KEY), `${p}: ${asset} needs ${KEY}`);
      assert.ok(/^v=2026\d{4}-/.test(url[0].split('?')[1]), `${p}: frozen v= key preserved`);
    }
  }
  for (const p of ['../dist/table/index.html', '../dist/portal/native-table.html']) {
    assert.ok(read(p).includes('snooker-shell.css?v=20261113-hudbig2' + KEY), `${p}: snooker key`);
  }
});

test('the native-page generator keeps the same stylesheet chain', () => {
  const generator = read('../scripts/build-native-games.mjs');
  assert.match(generator, /\['table','dist\/table\/index\.html'\]/,
    'native-table.html is composed from table/index.html');
  assert.doesNotMatch(generator, /snooker-shell\.css|bubbles-fine\.css/,
    'no duplicated hard-coded stylesheet URL can drift from the source');
});
