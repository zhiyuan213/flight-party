import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const shell = readFileSync(new URL('../dist/table/pool-shell.css', import.meta.url), 'utf8');
const themes = readFileSync(new URL('../dist/table/four-theme.css', import.meta.url), 'utf8');
const table = readFileSync(new URL('../dist/table/table.css', import.meta.url), 'utf8');
const feedback = readFileSync(new URL('../dist/table/four-feedback.css', import.meta.url), 'utf8');
const page = readFileSync(new URL('../dist/table/index.html', import.meta.url), 'utf8');

/* A settled Connect Four counter and the held/dropping coin are two different
   DOM nodes. In the classic theme the settled counter has no generated
   ::before (table.css only generates it for .gomoku). The new recessed ring
   lives inside the shared background artwork, so neither the marker nor
   settled coin may add a different pseudo-element ring on top of it. */
test('classic theme shares one coin shadow between settled counters and the launch coin', () => {
  const variable = shell.match(/--four-coin-shadow:([^;]+);/);
  assert.ok(variable, 'one canonical coin shadow variable is declared');
  assert.match(variable[1], /inset 0 2px 3px/);
  assert.match(variable[1], /0 3px 7px/);

  const settled = [...shell.matchAll(/\.connect-four-game \.board \.cell\[data-value="[12]"\]\{([^}]*)\}/g)];
  assert.equal(settled.length, 2, 'player 1 and player 2 counters are styled');
  for (const [, declarations] of settled) {
    assert.match(declarations, /background:var\(--four-(one|two)\)/);
    assert.match(declarations, /box-shadow:var\(--four-coin-shadow\)/);
  }
});

test('classic launch coin drops the inner ring and inherits the settled shadow', () => {
  const scoped = shell.match(/body\.connect-four-game:not\(\.four-themed\) \.four-drop-marker i\{([^}]*)\}/);
  assert.ok(scoped, 'marker override is scoped to the classic theme');
  assert.match(scoped[1], /box-shadow:var\(--four-coin-shadow\)/);

  const ring = shell.match(/body\.connect-four-game:not\(\.four-themed\) \.four-drop-marker i::after\{([^}]*)\}/);
  assert.ok(ring, 'marker ring override is scoped to the classic theme');
  assert.match(ring[1], /content:none/);
});

test('themed skins keep their face artwork on both counters and the launch coin', () => {
  assert.match(themes, /body\.connect-four-game\.four-themed \.board \.cell\[data-value="1"\]::before,\s*body\.connect-four-game\.four-themed \.board \.cell\[data-value="2"\]::before\{\s*content:''/);
  assert.match(themes, /body\.four-themed \.four-drop-marker i::after\{/);
  assert.doesNotMatch(shell, /body\.four-themed \.four-drop-marker i::after\{content:none\}/);
});

test('only gomoku generates a .cell[data-value] ::before in the base sheet', () => {
  const generators = [...table.matchAll(/([^{}]*)\.cell\[data-value\]:before\{content:''/g)];
  assert.ok(generators.length > 0);
  for (const [match, prefix] of generators) {
    assert.match(prefix, /\.gomoku\b/, `unexpected generic generator: ${match.slice(0, 60)}`);
  }
});

test('reference glass uses the same two material variables in every counter state',()=>{
  const classic=feedback.match(/body\.connect-four-game:not\(\.four-themed\)\{([\s\S]*?)\n\}/)?.[1];
  assert.ok(classic,'the material override is limited to the classic theme');
  const materials=[...classic.matchAll(/--four-(one|two):url\("data:image\/svg\+xml,([^"\n]+)"\)/g)];
  assert.deepEqual(materials.map(m=>m[1]),['one','two']);
  for(const [,team,uri]of materials){
    const svg=decodeURIComponent(uri);
    assert.match(svg,/viewBox="0 0 100 100"/);
    assert.match(svg,/r="42" fill="url\(#recess\)"/,team+' has the same recessed-ring geometry');
    assert.match(svg,/r="33" fill="url\(#lens\)"/,team+' has the same central translucent lens');
    assert.match(svg,/fill-opacity="\.24"/,'lens reflection is translucent');
  }
  assert.match(feedback,/\.four-drop-marker i,\s*body\.connect-four-game:not\(\.four-themed\) \.four-drop-ghost\{\s*box-shadow:var\(--four-coin-shadow\)/);
  assert.doesNotMatch(feedback,/\.cell[^{}]*::before\s*\{/,'medallion pseudo-elements remain available');
  assert.ok(page.indexOf('four-feedback.css')>page.indexOf('game-cosmetics.css'),'the scoped material override is loaded last');
});

test('connection glow is limited to occupied chain cells and reduced motion stays static',()=>{
  const rules=[...feedback.matchAll(/([^{}]+)\{[^{}]*box-shadow:var\(--four-feedback-shadow\)[^{}]*\}/g)]
    .map(m=>m[1].trim()).filter(selector=>selector.includes('.cell'));
  assert.equal(rules.length,3,'there are exactly two-, three- and four-piece cell treatments');
  for(const selector of rules){
    assert.match(selector,/:is\(\[data-value="1"\],\[data-value="2"\]\)/,'empty holes cannot be lit by connection state');
    assert.match(selector,/:not\(\.four-drop-hidden\)/,'a hidden landing cell cannot glow before the coin arrives');
  }
  assert.match(feedback,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(feedback,/\.four-winning\{animation:none!important\}/);
  assert.match(feedback,/\.four-celebration\{display:none\}/);
});

test('shop Four previews embed the exact in-match glass material and preserve personal medallions',()=>{
  const uri=feedback.match(/--four-one:url\("data:image\/svg\+xml,([^"\n]+)"\)/)[1];
  const material=decodeURIComponent(uri).replace('<svg xmlns="http://www.w3.org/2000/svg"','<svg x="20" y="16" width="200" height="200"');
  for(const theme of ['default','neon','jade','aurora']){
    const art=readFileSync(new URL('../dist/assets/shop/game-styles/four-piece-'+theme+'.svg',import.meta.url),'utf8');
    assert.ok(art.includes(material),theme+' must use the same authored resin, ring and reflection');
    if(theme==='default')assert.doesNotMatch(art,/<svg x="64" y="60" width="112" height="112"/);
    else assert.match(art,/<svg x="64" y="60" width="112" height="112"/,'the personal centre emblem remains');
  }
});
