/* The Joy Coin shop must sound like the home page when the pointer moves over
   a product card: the SHARED zoom/grow voice, not the button tick. The shop
   shell previously did not load site-hover-sfx.js at all, so it was silent.
   Regression guard for the "跟首页一样的音效" request. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve, join} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const sfx = read('dist/site-hover-sfx.js');
const shop = read('dist/shop.html');
const points = read('dist/site-points.js');
const KEY = '20261112-gamelanes1';

function htmlFiles(dir = 'dist') {
  return readdirSync(resolve(root, dir), {withFileTypes: true}).flatMap(e => {
    const p = join(dir, e.name);
    return e.isDirectory() ? htmlFiles(p) : /\.html$/.test(e.name) ? [p] : [];
  });
}

test('the shop shell loads the shared hover-sound module with the current key', () => {
  assert.match(shop, new RegExp('<script defer src="/site-hover-sfx\\.js\\?v=' + KEY + '"></script>'));
  assert.equal(points.match(/var VERSION='([^']+)'/)?.[1], KEY);
  const refs = htmlFiles().flatMap(p => [...read(p).matchAll(/site-hover-sfx\.js\?v=([^"']+)/g)].map(m => m[1]));
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

test('the denser shop grid gets a softer grow and a tighter throttle', () => {
  assert.match(sfx, /var SHOP_ZOOM_GAP=150/, 'shop throttles harder than the 110ms home gap');
  const gap = Number(sfx.match(/var ZOOM_GAP=(\d+)/)?.[1]);
  const shopGap = Number(sfx.match(/var SHOP_ZOOM_GAP=(\d+)/)?.[1]);
  assert.ok(shopGap > gap);
  assert.match(sfx, /var level=dock\?\.68:shop\?\.82:1,duration=dock\?\.18:shop\?\.19:\.22/,
    'shop cards keep the same timbre but sit lower in the mix');
  assert.match(sfx, /zoom\.classList\.contains\('shop-card'\)\?SHOP_ZOOM_GAP:ZOOM_GAP/,
    'the pointerover throttle actually uses the shop gap');
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
