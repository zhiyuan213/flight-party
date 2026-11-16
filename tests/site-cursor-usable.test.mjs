import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const binary = p => readFileSync(resolve(root, p));
const exists = p => existsSync(resolve(root, p));
const js = read('dist/site-points.js');
const version = js.match(/var VERSION='([^']+)'/)?.[1];
const cursorVersion = js.match(/var CURSOR_VERSION='([^']+)'/)?.[1];
const IDS = [
  'cursor-star', 'cursor-ember', 'cursor-leaf', 'cursor-bubble', 'cursor-shell',
  'cursor-rainbow', 'cursor-frost', 'cursor-heart', 'cursor-butterfly',
  'cursor-amethyst', 'cursor-comet', 'cursor-nova'
];
const RETIRED=['cursor-candy','cursor-volt','cursor-blade'];

/* Every card artwork ships as a vector for the grid AND a 32x32 PNG for the
   real CSS pointer. The two are the same drawing, so what the visitor buys is
   exactly what follows the mouse. */
test('the eleven active cursors, default and owned legacy cursors retain usable PNG fallbacks', () => {
  for (const id of [...IDS,...RETIRED]) {
    assert.ok(exists(`dist/assets/shop/${id}.svg`), `${id} vector artwork`);
    assert.ok(exists(`dist/assets/shop/${id}.png`), `${id} pointer PNG`);
    const b = binary(`dist/assets/shop/${id}.png`);
    assert.equal(b.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${id} is a PNG`);
    assert.equal(b.readUInt32BE(16), 32, `${id} width`);
    assert.equal(b.readUInt32BE(20), 32, `${id} height`);
  }
  assert.match(js, /function cursorAssetUrl\(id\)\{return '\/assets\/shop\/'\+id\+'\.png\?v='\+CURSOR_VERSION;\}/);
  assert.match(js, /setProperty\('--shop-cursor'[^;]*cursorAssetUrl\(cursor\)[^;]*3 2, auto'/,
    'the equipped pointer uses the PNG, which every browser accepts');
  assert.match(js, /cursorAssetUrl:cursorAssetUrl/, 'the shop can resolve the pointer artwork');
  assert.match(js, /return '\/assets\/shop\/'\+id\+'\.svg\?v='\+VERSION/,
    'card artwork stays a crisp vector');
});

test('every accent sits at the lower right, matching the default pointer', () => {
  // The default pointer's gold star is drawn around x=24 / y=18.6.
  const star = read('dist/assets/shop/cursor-star.svg');
  assert.match(star, /M24 18\.6/, 'the default star is already lower-right');
  assert.equal(star, read('dist/assets/cursor/plane.svg'), 'the default IS the built-in pointer');
  assert.ok(!/translate\(0 17\)/.test(star), 'the default needed no repositioning');
  for (const id of IDS.slice(1)) {
    const svg = read(`dist/assets/shop/${id}.svg`);
    assert.match(svg, /transform="translate\(0 17\)"/, `${id} accent moved down`);
    assert.match(svg, /viewBox="0 0 32 32"/, `${id} keeps its 32x32 box`);
    assert.equal((svg.match(/translate\(0 17\)/g) || []).length, 1, `${id} moves only the accent`);
  }
});

/* A stand-alone game page has no header pill host. Cosmetics must still be
   applied there; previously mount() returned before applyEquipped(). */
test('cosmetics apply even when a page has no wallet pill host', () => {
  const mount = js.slice(js.indexOf('function mount()'), js.indexOf('if(document.readyState'));
  assert.ok(mount.indexOf('applyEquipped()') < mount.indexOf('var host='),
    'applyEquipped runs before the header lookup');
  assert.match(mount, /data-shop-no-pill/, 'game pages opt out of the legacy header fallback');
  assert.match(js, /function render\(\)\{\s*if\(!pill\)return;/, 'render is safe without a pill');
  assert.match(js, /if\(host&&!document\.getElementById\('jp-pill'\)\)buildPill\(host\)/);
});

test('the game homepage and arcade page load the shared cosmetics chain', () => {
  for (const p of ['dist/index.html', 'dist/table/arcade.html']) {
    const text = read(p);
    assert.match(text, /<html lang="en" data-shop-no-pill>/,
      `${p} keeps its own header free of a points pill (well-formed attribute)`);
    assert.match(text, /site-cursor\.css\?v=/, `${p} starts from the built-in pointer`);
    assert.ok(text.indexOf('site-cursor.css') < text.indexOf('site-points.css'),
      `${p} loads the wallet styles after the cursor theme`);
    assert.equal(text.match(/site-points\.css\?v=([^"'&]+)/)[1], version);
    assert.equal(text.match(/site-points\.js\?v=([^"'&]+)/)[1], version);
    assert.ok(text.indexOf('site-points.js') < text.indexOf('</head>'));
  }
  for (const p of ['dist/portal/index.html', 'dist/membership.html', 'dist/terms.html',
    'dist/privacy.html', 'dist/contact.html', 'dist/shop.html', 'dist/table/index.html']) {
    const text = read(p);
    assert.equal(text.match(/site-points\.js\?v=([^"'&]+)/)[1], version, `${p} version`);
    assert.ok(!/20261111-defaultcursor1|20261111-aircraft1|20261111-cursorusable1/.test(text), `${p} has no stale key`);
    assert.match(text, /site-points\.js\?v=[^"']*&z=20261117-guestzero1/, `${p} ships the guest-zero wallet`);
  }
});

function sandbox(saved=null) {
  const store = new Map(), styles = {}, attrs = {};
  if(saved)store.set('joyflock.shop.v1',JSON.stringify(saved));
  const docRoot = {
    getAttribute: () => null,
    hasAttribute: () => false,
    style: {setProperty: (k, v) => {styles[k] = v;}, removeProperty: k => {delete styles[k];}},
    setAttribute: (k, v) => {attrs[k] = v;},
    removeAttribute: k => {delete attrs[k];}
  };
  const win = {addEventListener: () => {}, dispatchEvent: () => {}};
  runInNewContext(js, {
    window: win,
    document: {documentElement: docRoot, readyState: 'complete', querySelector: () => null},
    localStorage: {getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, v)},
    CustomEvent: function () {}, setTimeout, clearTimeout, console
  });
  return {shop: win.__joyflockShop, points: win.__joyflockPoints, styles, attrs};
}

test('each of the eleven active designs equips its native fallback and restores the default', () => {
  const s = sandbox();
  // Annual VIP equips Epic + Legendary free; the four Rare cursors still
  // cost 1,000 each, so start with plenty of points for the whole sweep.
  s.points.set({total: 100000, annualVip: true, live: true});
  for (const id of IDS.slice(1)) {
    const r = s.shop.buy(id);
    assert.equal(r.ok, true, id);
    assert.equal(s.points.get().equipped.cursor, id);
    assert.match(s.styles['--shop-cursor'], new RegExp(id + '\\.png'), id + ' is the pointer');
    assert.equal(s.attrs['data-shop-cursor'], '1', id + ' is published');
    assert.equal(s.shop.cursorAssetUrl(id), `/assets/shop/${id}.png?v=${cursorVersion}`);
    assert.equal(s.shop.assetUrl(id), `/assets/shop/${id}.svg?v=${cursorVersion}`);
  }
  assert.equal(s.points.get().total, 96000, 'only the four Rare cursors were charged');
  const back = s.shop.buy('cursor-star');
  assert.equal(back.ok, true);
  assert.equal(s.styles['--shop-cursor'], undefined, 'the default restores the built-in pointer');
  assert.equal(s.attrs['data-shop-cursor'], undefined);
  s.shop.reset('cursor');
  assert.equal(s.points.get().equipped.cursor, 'cursor-star');
});

test('retired designs cannot be newly bought, while their previous owners can still equip them',()=>{
  const fresh=sandbox();fresh.points.set({total:100000,annualVip:true,live:true});
  for(const id of RETIRED){
    assert.equal(fresh.shop.buy(id).ok,false);
    assert.equal(fresh.points.get().equipped.cursor,'cursor-star');
  }
  const old=sandbox({owned:Object.fromEntries(RETIRED.map(id=>[id,true])),equipped:{cursor:'cursor-candy'}});
  for(const id of RETIRED){
    assert.equal(old.shop.buy(id).ok,true);
    assert.equal(old.points.get().equipped.cursor,id);
    assert.match(old.styles['--shop-cursor'],new RegExp(id+'\\.png'));
  }
});

test('rare arrows and badges are static; epic animates badges; legend also animates inside a fixed arrow',()=>{
  for(const id of IDS.slice(1)){
    const svg=read(`dist/assets/shop/${id}.svg`);
    if(['cursor-ember','cursor-leaf','cursor-bubble','cursor-shell'].includes(id)){
      assert.doesNotMatch(svg,/<style|<animate|linearGradient|radialGradient/,'rare art stays flat and entirely static');
      continue;
    }
    const overlay=read(`dist/assets/shop/${id}-effect.svg`),png=binary(`dist/assets/shop/${id}-pointer.png`);
    assert.equal(png.readUInt32BE(16),32);assert.equal(png.readUInt32BE(20),32);
    assert.match(svg,/\.badge-motion\{[^}]*animation:/);
    assert.match(overlay,/@media\(prefers-reduced-motion:reduce\)/);
    if(['cursor-rainbow','cursor-frost','cursor-heart','cursor-butterfly'].includes(id)){
      assert.doesNotMatch(overlay,/class="cursor-arrow"/,'epic overlay cannot animate the arrow');
      assert.doesNotMatch(svg,/\.arrow-shift\{animation:/);
    }else{
      assert.match(overlay,/class="cursor-arrow"/);
      assert.match(overlay,/\.arrow-shift\{animation:/);
      assert.match(overlay,/clip-path="url\(#arrowClip\)"/,'legend glints stay inside the stationary silhouette');
    }
  }
});
