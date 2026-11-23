import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const css=read('../dist/portal/portal-editorial.css');
const html=read('../dist/portal/index.html');
const veil=/#home \.cards \.card-art::after\{([\s\S]*?)\}/.exec(css);
const label=/#home \.cards \.card-label\{([\s\S]*?)\}/.exec(css);

test('the hover veil blurs the cover but not the play button',()=>{
  assert.ok(veil,'the .card-art::after veil rule exists');
  assert.ok(label,'the .card-label rule exists');
  assert.match(veil[1],/backdrop-filter:blur\(3px\)/,'3px blur on the veil');
  assert.match(veil[1],/-webkit-backdrop-filter:blur\(3px\)/,'webkit prefix for Safari');
  assert.match(veil[1],/z-index:1/,'veil sits above the artwork');
  assert.match(label[1],/z-index:2/,'play button sits above the veil, so it stays sharp');
  assert.match(label[1],/pointer-events:none/,'button never steals the hover');
  /* The pill keeps its OWN glassy backdrop-filter:blur(6px); what matters is
     that no plain filter:blur() is applied to the button element itself. */
  assert.ok(!/(?<!backdrop-)filter:blur\(/.test(label[1]),
    'no blur is applied to the button element itself');
  assert.match(label[1],/backdrop-filter:blur\(6px\)/,'its own glass texture survives');
});

test('the veil still fades in only on hover / keyboard focus',()=>{
  assert.match(veil[1],/opacity:0/,'hidden at rest');
  assert.match(veil[1],/transition:opacity \.24s ease/, 'soft fade at normal motion');
  assert.match(css,/#home \.cards \.game-card\.live:hover \.card-art::after,\s*#home \.cards \.game-card\.live:focus-visible \.card-art::after\{opacity:1\}/,
    'hover and focus-visible reveal it');
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{[\s\S]*?#home \.cards \.card-art::after,[\s\S]*?transition:none\}/,
    'reduced motion shows the result immediately, with no animation');
});

test('artwork hover zoom remains and the illustrated flight cover fills its card',()=>{
  assert.match(css,/#home \.cards \.game-card\.live:hover \.card-art img\{transform:scale\(1\.05\)\}/);
  assert.match(css,/#home \.cards \.game-card\.blue\.live:hover \.card-art img\{transform:scale\(1\.03\)\}/);
  const blue=/#home \.cards \.game-card\.blue \.card-art img\{([\s\S]*?)\}/.exec(css);
  assert.match(blue[1],/width:100%;height:100%;object-fit:cover;filter:none/,
    'full-bleed illustration has no transparent-plane inset or drop shadow');
  assert.ok(!/\.card-art img\{[^}]*filter:blur/.test(css),
    'the blur is on the veil, not directly on <img>');
});

test('the label is a child of .card-art and the stylesheet version is bumped',()=>{
  const art=/<div class="card-art">(.+?)<\/div>/.exec(html);
  assert.ok(art,'first card has a cover container');
  assert.ok(art[1].includes('<img')&&art[1].includes('class="card-label"'),
    'image and button are siblings inside .card-art');
  assert.equal((html.match(/portal-editorial\.css\?v=([\w-]+)/g)||[]).length,1);
  assert.match(html,/portal-editorial\.css\?v=20261114-cardart1/);
});
