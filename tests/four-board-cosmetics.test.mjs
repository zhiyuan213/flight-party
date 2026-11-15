import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('dist/table/four-board-cosmetics.css');
const themes=['default','neon','jade','aurora'];
const cards=Object.fromEntries(themes.map(t=>[t,read('dist/assets/shop/game-styles/four-board-'+t+'.svg')]));

test('all Four board cards show the same unobstructed seven-column six-row wells',()=>{
 let baseline;
 for(const [theme,svg]of Object.entries(cards)){
  const holes=[...svg.matchAll(/<g data-hole="(\d)-(\d)"><circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)].map(([,row,col,x,y,r])=>({row:+row,col:+col,x:+x,y:+y,r:+r}));
  assert.equal(holes.length,42,theme+' has 42 actual wells');
  assert.equal(new Set(holes.map(h=>h.col)).size,7);
  assert.equal(new Set(holes.map(h=>h.row)).size,6);
  for(const h of holes){
   assert.ok(h.r>10&&h.r<13,'the cell aperture stays readable');
   assert.ok(h.x-h.r>10&&h.x+h.r<230&&h.y-h.r>25&&h.y+h.r<215,'the frame does not clip a well');
  }
  if(baseline)assert.deepEqual(holes,baseline,theme+' cannot move or resize holes');else baseline=holes;
  assert.doesNotMatch(svg,/data-cosmetic-piece|personal-emblem/,'board products do not bundle a personal counter');
 }
});

test('purchased board previews share the shipped finish palettes and grain shapes',()=>{
 for(const theme of themes.slice(1)){
  const block=css.match(new RegExp(`\\[data-cosmetic-board="${theme}"\\]\\{([\\s\\S]*?)\\n\\}`))[1];
  const colours=[...block.matchAll(/--four-board-[a-z]+:(#[a-f0-9]+);/g)].map(m=>m[1]);
  assert.equal(colours.length,8);
  for(const colour of colours)assert.ok(cards[theme].includes(colour),theme+' preview uses '+colour);
  const grain=block.match(/url\("data:image\/svg\+xml,([^"\n]+)"\)/);
  if(grain){
   const inner=decodeURIComponent(grain[1]).replace(/^<svg[^>]+>|<\/svg>$/g,'');
   assert.ok(cards[theme].includes(inner),theme+' preview uses the actual grain paths');
  }
 }
 assert.equal(new Set(Object.values(cards)).size,4,'the four designs have different finishes');
});

test('board finishes are Classic-only and cannot recolour counters or alter the grid',()=>{
 const rules=[...css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/([^{}]+)\{([^{}]*)\}/g)];
 assert.ok(rules.length>=6);
 for(const [,selector,body]of rules){
  assert.match(selector.trim(),/^body\.connect-four-game:not\(\.four-themed\) #board/,'seasonal themes and other games are excluded');
  assert.match(selector,/data-cosmetic-board=/,'the default peachwood finish remains the baseline');
  assert.doesNotMatch(body,/(?:^|[;\n])\s*(?:width|height|padding|gap|grid[^:]*|transform|position|border-width)\s*:/,'cosmetics cannot change hit or layout geometry');
  assert.doesNotMatch(body,/--four-(?:one|two|coin-shadow|feedback-shadow)\s*:/,'held and settled pieces keep their shared material');
  if(selector.includes('.cell'))assert.match(selector,/data-value="0"|four-drop-hidden/,'only empty or temporarily hidden target wells get a finish');
 }
 assert.match(css,/\.four-landing\[data-value="0"\]/,'landing guidance stays visible');
 assert.match(css,/\.four-col-hover\[data-value="0"\]/,'column guidance stays visible');
});
