/* The Joy Coin shop must keep the same ten floating white pinpoints as every
   other shell page. It was the ONLY shell that never loaded
   site-floating-dots.js: ambient.css hides body::after's static star field
   for visitors who allow motion, and .shop-page has an opaque background, so
   the shop ended up with literally zero white light dots.

   Regression guard for the "为什么商城的白色光点，没有了？" request. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve, join} from 'node:path';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const shop = read('dist/shop.html');
const dots = read('dist/site-floating-dots.js');
const ambient = read('dist/ambient.css');
const shopCss = read('dist/site-shop.css');
const KEY = '20261110-glove2';
/* The phase-sync pass appends a refresh tag after the frozen v= key. Keep the
   v= extraction narrow so every host still agrees on ONE shared version. */
const REFRESH = '20261115-staticnebula1';

function htmlFiles(dir = 'dist') {
  return readdirSync(resolve(root, dir), {withFileTypes: true}).flatMap(e => {
    const p = join(dir, e.name);
    return e.isDirectory() ? htmlFiles(p) : /\.html$/.test(e.name) ? [p] : [];
  });
}

test('the shop shell loads the shared floating-dots module before the meteor script', () => {
  const tag = '<script defer src="/site-floating-dots.js?v=' + KEY + '&d=' + REFRESH + '"></script>';
  assert.ok(shop.includes(tag), 'shop.html mounts the motes with the shared key');
  assert.ok(shop.indexOf(tag) < shop.indexOf('/site-shooting-star.js'),
    'motes are mounted before the meteor layer, like every other shell');
  assert.ok(shop.includes('/ambient.css'), 'the ambient backdrop stays loaded');
});

test('every page that mounts the motes uses one shared cache key', () => {
  const refs = htmlFiles().flatMap(p =>
    [...read(p).matchAll(/site-floating-dots\.js\?v=([^"'&]+)([^"']*)/g)]
      .map(m => ({p, key: m[1], rest: m[2]})));
  assert.ok(refs.find(r => r.p.replace(/\\/g, '/') === 'dist/shop.html'),
    'the shop is now among the mote pages');
  assert.ok(refs.length >= 14, 'the original 14 shells are untouched');
  assert.ok(refs.every(r => r.key === KEY), 'no page carries a stale or divergent key');
  assert.ok(refs.every(r => r.rest.includes('&d=' + REFRESH)),
    'every host pulls the phase-synchronised script without bumping the shared key');
});

test('the dots are ten white pinpoints on a fixed, click-through layer', () => {
  assert.match(dots, /var COUNT = 10/);
  assert.match(dots, /#ffffff 0%,#c9d8ff 46%/);
  assert.match(dots, /\.joymote-layer\{position:fixed;inset:0;z-index:21474810;overflow:hidden;pointer-events:none\}/);
  assert.match(dots, /body::after\{display:none!important\}/,
    'one set of motes only: the old static field is retired');
  assert.match(dots, /prefers-reduced-motion: reduce/, 'reduced-motion visitors keep the still star field');
  assert.match(ambient, /@media\(prefers-reduced-motion:no-preference\)\{\s*body::after\{display:none\}\s*\}/);
  assert.doesNotMatch(shopCss, /\.shop-page\{[\s\S]*?#090d1c/,
    'the shop main is transparent so the shared cosmic nebula shows through');
});

/* Actually execute the browser script in a VM with a tiny DOM: a top-level
   shop document must get exactly one layer with ten white motes, while an
   embedded document and a reduced-motion visitor must create no layer. */
function run({reduced = false, embedded = false} = {}) {
  const injected = [];
  function node(tag) {
    const props = {}, listeners = {};
    return {
      tag, className: '', textContent: '', dataset: {}, children: [], parentNode: null,
      style: {
        setProperty(k, v) { props[k] = String(v); },
        getPropertyValue(k) { return props[k] || ''; }
      },
      listeners,
      setAttribute() {},
      addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
      appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
      getAnimations() { return []; },
      getBoundingClientRect() { return {left: 0, top: 0}; }
    };
  }
  const doc = {head: node('head'), body: node('body'), hidden: false};
  doc.documentElement = doc.body;
  doc.createElement = tag => {
    const n = node(tag);
    if (tag === 'style') injected.push(n);
    return n;
  };
  doc.addEventListener = () => {};
  const win = {
    innerWidth: 1400, innerHeight: 900,
    matchMedia: q => ({matches: reduced && /reduce/.test(q)}),
    addEventListener: () => {},
    setInterval: () => 0
  };
  win.top = embedded ? {} : win;
  const context = vm.createContext({
    document: doc, window: win, location: {pathname: '/shop.html', origin: 'http://127.0.0.1:8080'},
    sessionStorage: {getItem: () => null, setItem() {}},
    getComputedStyle: () => ({opacity: '1'}),
    Date, Math, JSON
  });
  vm.runInContext(dots, context);
  return {doc, win, injected, api: win.__joyflockMotes};
}

test('VM: a top-level shop document gets one layer with ten motes', () => {
  const {doc, win, injected, api} = run();
  assert.equal(doc.body.children.length, 1);
  const layer = doc.body.children[0];
  assert.equal(layer.className, 'joymote-layer');
  assert.equal(layer.children.length, 10);
  assert.ok(layer.children.every(n => n.className === 'joymote'));
  assert.equal(api.count, 10);
  assert.equal(api.version, '20261109-motes2');
  assert.equal(injected.length, 1, 'exactly one style block');
  assert.ok(injected[0].textContent.includes('#ffffff 0%,#c9d8ff 46%'),
    'the white pinpoint paint is actually injected');
  assert.equal(api.state().length, 10);
  assert.ok(win.__joyflockMotes.layer === layer);
});

test('VM: embedded documents and reduced-motion visitors create no duplicate layer', () => {
  for (const opts of [{embedded: true}, {reduced: true}]) {
    const {doc, injected} = run(opts);
    assert.equal(doc.body.children.length, 0, JSON.stringify(opts) + ' must not add a layer');
    if (opts.embedded)
      assert.ok(injected[0].textContent.includes('body::after{display:none!important}'),
        'an embedded document still retires its own static star field');
    else
      assert.equal(injected.length, 0, 'reduced motion keeps ambient.css static stars, no script style');
  }
});

test('the shared wallet / shop version chain is not bumped by this fix', () => {
  for (const asset of ['site-chrome.css', 'site-points.css', 'site-points.js',
    'site-shop.css', 'site-shop.js', 'site-hover-sfx.js'])
    assert.ok(shop.includes('/' + asset + '?v=20261112-gamelanes1'),
      asset + ' keeps the one shared cache key');
});
