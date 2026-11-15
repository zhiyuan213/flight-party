import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(resolve(root, 'dist/table/table-home-clean.css'), 'utf8').replace(/\r\n/g, '\n');
const htmlFiles = [];
const walk = dir => {
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    const p = resolve(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.name.endsWith('.html')) htmlFiles.push(p);
  }
};
walk(resolve(root, 'dist'));

// Pull every declaration block for a selector. Several selectors are reused
// across the stylesheet (base, wide layout, late overrides), so callers pick
// the block that actually carries the declaration they care about.
const blocks = selector => {
  const out = [];
  let at = 0;
  while ((at = css.indexOf(selector + '{', at)) >= 0) {
    const start = at + selector.length + 1;
    out.push(css.slice(start, css.indexOf('}', start)));
    at = start;
  }
  assert.ok(out.length, `missing rule: ${selector}`);
  return out;
};
const block = selector => blocks(selector)[blocks(selector).length - 1];

const ROW = 'body.table-home-theme:not([data-screen="play"]) #leaderboard li';
const COLUMNS = 'body.table-home-theme:not([data-screen="play"]) .ranking-columns';
const TRACK = 'body.table-home-theme:not([data-screen="play"]) .ranking-columns,\nbody.table-home-theme:not([data-screen="play"]) #leaderboard';

test('standings list fills the panel instead of sitting on a narrow centred track', () => {
  assert.ok(!css.includes('width:min(84%,340px)'), 'the old fixed centred track must be gone');
  const track = block(TRACK);
  assert.match(track, /width:100%/, 'header and list should take the full panel content width');
  assert.match(track, /max-width:520px/, 'single-column fallback keeps a sane cap');
  assert.match(track, /margin-left:auto/, 'centred only when the cap actually applies');
  assert.match(track, /margin-right:auto/);
});

test('score columns are widened and separated, with header aligned to the rows', () => {
  const row = block(ROW);
  const cols = block(COLUMNS);
  assert.match(row, /grid-template-columns:32px minmax\(0,1fr\) 60px 60px/);
  assert.match(row, /column-gap:16px/);
  assert.match(cols, /grid-template-columns:1fr 60px 60px/);
  assert.match(cols, /column-gap:16px/);
  // The header's first 1fr column equals the row's 32px + gap + name column,
  // so the two fixed number columns land on exactly the same x positions.
  assert.match(css, /\.ranking-columns span:not\(:first-child\)\{\s*text-align:right/);
  assert.match(css, /#leaderboard \.ranking-points,\s*body\.table-home-theme:not\(\[data-screen="play"\]\) #leaderboard \.ranking-games\{[^}]*text-align:right/);
});

test('row heights and the ten-row layout are unchanged', () => {
  assert.match(css, /--rank-row:34px/);
  assert.match(css, /min-height:calc\(var\(--rank-row\)\*10\)/);
  assert.match(css, /font-size:12px;line-height:13px/, 'column-header line height still locks the old height');
  for (const h of ['min-height:760px', 'min-height:650px', 'min-height:520px', 'min-height:500px']) {
    assert.ok(css.includes(h), `panel breakpoint ${h} must be preserved`);
  }
});

test('the standings column and its shell both grow, so the left group is not squeezed', () => {
  assert.ok((css.match(/grid-template-columns:minmax\(0,1fr\) 460px/g) || []).length >= 2,
    'both the intro grid and the #intro grid give the panel 460px');
  assert.match(css, /column-gap:28px;row-gap:0;align-items:start/);
  assert.match(css, /max-width:min\(1160px,74vw\)/, 'the shell grows with the panel');
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) 390px/,
    'the 1201-1450px breakpoint also keeps a wider standings column');
  assert.doesNotMatch(css, /grid-template-columns:minmax\(0,1fr\) 360px/);
  assert.doesNotMatch(css, /grid-template-columns:minmax\(0,1fr\) 320px/);
});

test('the three period tabs split the row evenly instead of huddling left', () => {
  // `.period-tabs` is re-declared later for its margin; pick the layout block.
  const tabs = blocks('body.table-home-theme:not([data-screen="play"]) .period-tabs')
    .find(b => b.includes('gap:0'));
  const button = block('body.table-home-theme:not([data-screen="play"]) .period-tabs button');
  assert.match(tabs, /display:flex/);
  assert.match(tabs, /gap:0/, 'no leftover 16px gap between the three tabs');
  assert.match(button, /flex:1 1 0/, 'each tab owns one third of the full width');
  assert.match(button, /min-width:0/);
  assert.match(button, /text-align:center/);
  assert.match(button, /white-space:nowrap/, 'the Chinese tab labels never wrap');
  assert.doesNotMatch(button, /flex:0 0 auto/, 'the old left-huddled layout must be gone');
  assert.match(css, /\.period-tabs button\[aria-pressed="true"\]\{[^}]*border-bottom:2px solid #9caaff/,
    'the active underline still marks the selected period');
});

test('medal, portrait and name get real separation without changing the panel height', () => {
  assert.match(css, /#leaderboard \.seat\{gap:9px\}/);
  assert.match(css, /#leaderboard \.avatar-shell\{\s*width:30px;height:30px;flex:0 0 30px/,
    'the portrait shell keeps its approved size');
  assert.match(css, /#leaderboard \.rank-medal\{\s*width:28px;height:28px;font-size:12px/);
  assert.doesNotMatch(block(ROW), /column-gap:10px/);
  assert.doesNotMatch(block(COLUMNS), /column-gap:10px/);
  assert.match(css, /--rank-row:34px/, 'the ten-row height budget is unchanged');
});

test('stylesheet version is consistent across every HTML host', () => {
  const refs = htmlFiles.flatMap(p => {
    const text = readFileSync(p, 'utf8');
    return [...text.matchAll(/table-home-clean\.css\?v=([^"'&]+)/g)].map(m => m[1]);
  });
  assert.ok(refs.length >= 1, 'at least one page loads the standings stylesheet');
  const versions = [...new Set(refs)];
  assert.equal(versions.length, 1, `expected one shared version, got ${versions.join(', ')}`);
  // The tag itself is free to change on later passes; what matters is that
  // every host agrees with the intro page that actually loads the CSS.
  const intro = readFileSync(resolve(root, 'dist/table/index.html'), 'utf8');
  assert.ok(intro.includes(`table-home-clean.css?v=${versions[0]}`));
});
