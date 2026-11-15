/* The Joy Coin shop must sound like the home page when the pointer moves over
   a product card: the SHARED zoom/grow voice, not the button tick. The shop
   shell previously did not load site-hover-sfx.js at all, so it was silent.
   Regression guard for the "跟首页一样的音效" request. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve, join} from 'node:path';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const sfx = read('dist/site-hover-sfx.js');
const shop = read('dist/shop.html');
const points = read('dist/site-points.js');
const KEY = '20261112-gamelanes1';

for(const kind of ['game-card','shop-card','rail-game','button'])test('fast '+kind+' entries all sound while child transitions stay deduplicated',()=>{
 const handler=sfx.slice(sfx.indexOf(" document.addEventListener('pointerover'"),sfx.indexOf(" document.addEventListener('pointerleave'"));
 let listener,now=0;const played=[];
 const card=()=>({classList:{contains:c=>c===kind}}),a=card(),b=card();
 const scope=vm.createContext({document:{addEventListener:(_type,fn)=>{listener=fn;}},performance:{now:()=>now},
  zoomTarget:n=>kind==='button'?null:n,find:n=>n,current:null,currentZoom:false,lastZoomAt:0,lastAt:0,lastEl:null,
  stats:{hover:0,played:0,zoom:0,throttled:0},ZOOM_DOCK_GAP:170,SHOP_ZOOM_GAP:150,ZOOM_GAP:110,ZOOM_SAME_GAP:420,
  zoomAt:new WeakMap(),play:el=>{played.push(el);return true;},playZoom:el=>{played.push(el);return true;}});
 vm.runInContext(handler,scope);
 for(const [t,node] of [[1,a],[2,a],[3,b],[4,a]]){now=t;listener({target:node,pointerType:'mouse'});}
 assert.deepEqual(played,[a,b,a]);assert.equal(scope.stats.throttled,0);
});

function htmlFiles(dir = 'dist') {
  return readdirSync(resolve(root, dir), {withFileTypes: true}).flatMap(e => {
    const p = join(dir, e.name);
    return e.isDirectory() ? htmlFiles(p) : /\.html$/.test(e.name) ? [p] : [];
  });
}

test('the shop shell loads the shared hover-sound module with the current key', () => {
  assert.match(shop, new RegExp('<script defer src="/site-hover-sfx\\.js\\?v=' + KEY + '(?:&[^"]*)?"></script>'));
  assert.equal(points.match(/var VERSION='([^']+)'/)?.[1], KEY);
  const refs = htmlFiles().flatMap(p => [...read(p).matchAll(/site-hover-sfx\.js\?v=([^"'&]+)/g)].map(m => m[1]));
  assert.ok(refs.length >= 9, 'every existing shell plus the shop loads the module');
  assert.ok(refs.every(k => k === KEY), 'no page keeps the old 20261110-glove2 key');
  assert.equal(sfx.match(/version:'([^']+)'/)?.[1], KEY, 'the module declares the same key');
});

test('shop cards use the home-cover grow voice, never the button tick', () => {
  const muted = sfx.match(/var MUTED_ZONES='([^']+)'/)?.[1] || '';
  const zoom = sfx.match(/var ZOOM_ZONES='([^']+)'/)?.[1] || '';
  assert.ok(muted.split(',').includes('.shop-card'), 'product cards are excluded from the tick voice');
  assert.ok(zoom.split(',').includes('.shop-card'), 'product cards opt into the zoom voice');
  // The home page must keep behaving exactly as before.
  for (const zone of ['.topbar', '.game-card', '.game-rail', '.rail-game'])
    assert.ok(muted.split(',').includes(zone), `${zone} stays muted`);
  for (const zone of ['.game-card.live', '.rail-game'])
    assert.ok(zoom.split(',').includes(zone), `${zone} keeps its grow`);
});

test('shop cards retain their softer voice without dropping fast entries',()=>{
 assert.match(sfx,/var level=dock\?\.68:shop\?\.82:1,duration=dock\?\.18:shop\?\.19:\.22/);
 assert.ok(!sfx.includes('stats.throttled++'));
});
test('portal declares a real autoplay allow attribute outside the iframe title',()=>{
 const portal=read('dist/portal/index.html');
 assert.match(portal, /title="Flight Party 在线飞行棋" allow="autoplay; fullscreen; web-share; clipboard-write"/);
});

test('all four mute switches still apply on the shop page', () => {
  for (const key of ['joyflock.hoverSfx', 'joyflock.pool.muted', 'flight-party-prefs'])
    assert.ok(sfx.includes(key), `${key} mute switch is intact`);
  assert.match(sfx, /\[data-control="sound"\]/);
  assert.match(sfx, /get muted\(\)\{return muted\(\);\}/);
});

test('the module stays self-contained and gesture-gated', () => {
  assert.ok(!/\.mp3|\.wav|\.ogg|fetch\(|XMLHttpRequest/.test(sfx), 'no audio files or network calls');
  assert.match(sfx, /window\.__joyflockHoverSfx/, 'the shared API is published for CDP / iframes');
  assert.match(sfx, /pointerdown','mousedown'/);
});
