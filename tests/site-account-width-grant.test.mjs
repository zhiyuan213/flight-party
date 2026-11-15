import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const js = read('dist/site-points.js');
const pointsCss = read('dist/site-points.css');
const chromeCss = read('dist/site-chrome.css');
const hosts = [
  'dist/portal/index.html', 'dist/membership.html', 'dist/terms.html',
  'dist/privacy.html', 'dist/contact.html', 'dist/table/index.html',
  'dist/shop.html'
].map(p => ({p, text: read(p)}));

/* Run the shipped wallet script in a tiny DOM. The caller can preload the
   local save, the signed-in nickname (localStorage or cookie) and the
   idempotency marker, so the real grant path is exercised, not re-implemented. */
function sandbox({points, accountName, cookie = '', marker = false} = {}) {
  const store = new Map();
  if (points !== undefined) {
    store.set('joyflock.shop.v1', JSON.stringify({v: 3, points, owned: {}, equipped: {}}));
  }
  if (accountName !== undefined) store.set('joyflock.accountName', accountName);
  if (marker) store.set('joyflock.demoGrant.v1', '1');
  const docRoot = {
    getAttribute: () => null, hasAttribute: () => false,
    style: {setProperty() {}, removeProperty() {}},
    setAttribute() {}, removeAttribute() {}
  };
  const win = {addEventListener() {}, dispatchEvent() {}};
  const context = {
    window: win,
    document: {documentElement: docRoot, readyState: 'complete', querySelector: () => null, cookie},
    localStorage: {
      getItem: k => store.has(k) ? store.get(k) : null,
      setItem: (k, v) => store.set(k, v)
    },
    CustomEvent: function () {}, setTimeout, clearTimeout, console
  };
  runInNewContext(js, context);
  return {points: win.__joyflockPoints, shop: win.__joyflockShop, store};
}

function savedPoints(store) {
  return JSON.parse(store.get('joyflock.shop.v1') || '{}').points;
}

test('signed-in nickname slot is tight at every breakpoint, guest geometry unchanged', () => {
  assert.match(pointsCss, /body\.chrome-signed>\.topbar #chrome-account\{width:112px;min-width:112px\}/);
  assert.match(pointsCss, /body\.chrome-signed>\.topbar \.top-actions\{width:405px\}/);
  assert.match(pointsCss, /guest\s+75 \+ 88 \+ 96 \+ 92 \+ 3\*10 = 381/);
  assert.match(pointsCss, /\.topbar \.top-actions\{width:381px\}/, 'guest cluster stays 381px with the fullscreen slot');
  assert.match(chromeCss, /\.chrome-account\{[^}]*width:88px;min-width:88px/, 'guest buttons unchanged');

  for (const [width, cluster] of [[96, 381], [84, 290], [62, 218]]) {
    assert.ok(pointsCss.includes(`body.chrome-signed>.topbar #chrome-account{width:${width}px;min-width:${width}px}`),
      `${width}px signed nickname width`);
    assert.ok(pointsCss.includes(`body.chrome-signed>.topbar .top-actions{width:${cluster}px}`),
      `${cluster}px signed cluster width`);
  }
  assert.match(pointsCss, /@media\(max-width:480px\)\{[\s\S]*?width:218px/, '480px override comes last');
});

test('390px phone fits a seven-character balance without widening the cluster', () => {
  assert.match(chromeCss, /body>\.topbar \.top-actions \.jp-amount\{font-size:11px\}/,
    '100,000 needs smaller digits than the old 12px six-digit rule');
  assert.match(chromeCss, /body>\.topbar \.top-actions \.jp-mark\{width:15px;height:15px\}/);
  assert.match(chromeCss, /body>\.topbar \.top-actions \.jp-pill\{[^}]*gap:2px;padding:3px 5px/);
  assert.match(chromeCss, /@media\(max-width:480px\)\{[\s\S]*?body>\.topbar\{gap:3px;padding:0 4px\}/);
  assert.match(pointsCss, /@media\(max-width:480px\)\{[\s\S]*?width:218px/);
});

test('one-off grant is demo data, idempotent and server authority still wins', () => {
  assert.match(js, /var GRANT_KEY='joyflock\.demoGrant\.v1',GRANT_TOTAL=100000/);
  assert.match(js, /client-side demo data only/, 'explicitly labelled as local preview data');
  assert.match(js, /window\.__joyflockPoints\.set\(\{total, vip, annualVip, live:true\}\)/, 'server override documented');

  const fresh = sandbox();
  assert.equal(fresh.points.get().total, 10000, 'brand-new visitor keeps the normal starting wallet');
  assert.equal(fresh.store.get('joyflock.demoGrant.v1'), undefined, 'no grant without a signed-in identity');

  const granted = sandbox({points: 0, accountName: 'zhiyuan'});
  assert.equal(granted.points.get().total, 100000, 'signed-in demo wallet is topped up to 100,000');
  assert.equal(savedPoints(granted.store), 100000, 'the top-up is written back to the local save');
  assert.equal(granted.store.get('joyflock.demoGrant.v1'), '1', 'marker is set exactly once');

  const again = sandbox({points: 50, accountName: 'zhiyuan', marker: true});
  assert.equal(again.points.get().total, 50, 'a later purchase balance is never overwritten');

  const viaCookie = sandbox({points: 0, cookie: 'joyflock_account=zhiyuan2024'});
  assert.equal(viaCookie.points.get().total, 100000, 'cookie identity works when localStorage name is cleared');

  const anonymousSave = sandbox({points: 0});
  assert.equal(anonymousSave.points.get().total, 0, 'an anonymous save is not silently topped up');

  const server = sandbox({points: 0, accountName: 'zhiyuan'});
  server.points.set({total: 7, live: true});
  assert.equal(server.points.get().total, 7, 'a server summary overrides the demo value');
});

test('shared cache chain is untouched by the nickname / wallet change', () => {
  assert.match(js, /var VERSION='20261112-gamelanes1'/);
  for (const {p, text} of hosts) {
    assert.ok(text.includes('/site-points.js?v=20261112-gamelanes1'), `${p}: wallet script key`);
    assert.ok(text.includes('/site-points.css?v=20261112-gamelanes1'), `${p}: wallet stylesheet key`);
  }
});
