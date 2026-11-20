import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readdirSync, statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = p => readFileSync(path.join(ROOT, p), 'utf8');
const KEY = '20261115-joincoin1';
const REFRESH = '20261115-fspill1';
const CSS = read('dist/site-fullscreen.css');
const JS = read('dist/site-fullscreen.js');

function htmlPages(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const abs = path.join(dir, name);
    if (statSync(abs).isDirectory()) htmlPages(abs, out);
    else if (name.endsWith('.html')) out.push(abs);
  }
  return out;
}
const pages = htmlPages(path.join(ROOT, 'dist')).filter(p =>
  readFileSync(p, 'utf8').includes('<header class="topbar"'));
const rel = p => path.relative(ROOT, p).replace(/\\/g, '/');
const header = html => (html.match(/<header class="topbar"[\s\S]*?<\/header>/) || [''])[0];

test('every site header renders exactly one shared fullscreen button', () => {
  assert.equal(pages.length, 28, 'six shell pages + twenty-two game-guide pages');
  for (const p of pages) {
    const html = readFileSync(p, 'utf8');
    const name = rel(p);
    assert.equal((html.match(/id="fullscreen"/g) || []).length, 1, `${name}: one button`);
    assert.match(header(html), /<button[^>]*id="fullscreen"[^>]*>/, `${name}: button lives in the header`);
    assert.match(html, /class="site-fullscreen"[^>]*aria-pressed="false"/, `${name}: accessible pressed state`);
    assert.match(html, new RegExp(`site-fullscreen\\.css\\?v=${KEY}`), `${name}: shared stylesheet`);
    assert.match(html, new RegExp(`site-fullscreen\\.js\\?v=${KEY}`), `${name}: shared behaviour`);
  }
});

test('shell pages put the button INSIDE the shared right-hand cluster', () => {
  for (const name of ['dist/portal/index.html', 'dist/membership.html', 'dist/terms.html',
    'dist/privacy.html', 'dist/contact.html', 'dist/shop.html']) {
    const head = header(read(name));
    const actions = (head.match(/<div class="top-actions">([\s\S]*?)<\/div>/) || [,''])[1];
    assert.match(actions, /id="fullscreen"/, `${name}: inside .top-actions, inheriting its gap`);
    assert.ok(!/<\/div>\s*<button[^>]*id="fullscreen"/.test(head),
      `${name}: no legacy header-level button left outside the cluster`);
  }
  // Game guides have no .top-actions; their button follows the lang switch.
  for (const name of ['dist/games/index.html', 'dist/games/pool/index.html',
    'dist/en/games/index.html', 'dist/en/games/pool/index.html']) {
    const head = header(read(name));
    assert.ok(head.indexOf('class="lang-switch"') < head.indexOf('id="fullscreen"'),
      `${name}: button follows the language switch`);
  }
});

test('the iframe game pages do NOT get a second fullscreen button', () => {
  for (const name of ['dist/index.html', 'dist/table/index.html', 'dist/table/arcade.html']) {
    const html = read(name);
    assert.ok(!html.includes('id="fullscreen"'), `${name}: game frame keeps its own chrome`);
    assert.ok(!html.includes('site-fullscreen.js'), `${name}: no shared header script`);
  }
});

test('the SEO generator emits the same button and assets, so a rebuild cannot drop them', () => {
  const gen = read('scripts/build-game-seo.mjs');
  assert.match(gen, new RegExp(`const FULLSCREEN_KEY = '${KEY}'`));
  assert.match(gen, new RegExp(`const FULLSCREEN_REFRESH = '${REFRESH}'`));
  assert.match(gen, /href="\/site-fullscreen\.css\?v=\$\{FULLSCREEN_KEY\}&d=\$\{FULLSCREEN_REFRESH\}"/);
  assert.match(gen, /src="\/site-fullscreen\.js\?v=\$\{FULLSCREEN_KEY\}&d=\$\{FULLSCREEN_REFRESH\}"/);
  assert.match(gen, /id="fullscreen" class="site-fullscreen" aria-pressed="false"/);
  assert.match(gen, /\$\{zh \? '全屏' : 'Fullscreen'\}/, 'bilingual static label');
  assert.ok(gen.indexOf('FULLSCREEN_KEY') < gen.indexOf('function shell('), 'key declared before use');
});

test('the control wears the SAME gradient pill as its neighbours', () => {
  assert.match(CSS, /header\.topbar #fullscreen\{[\s\S]*?order:99/);
  // The fixed slot survives so 全屏 -> 退出全屏 never moves the cluster.
  assert.match(CSS, /width:92px;min-width:92px;max-width:92px/);
  assert.match(CSS, /height:28px;min-height:28px/);
  assert.match(CSS, /border:1px solid #ffffff24;border-radius:999px/);
  assert.match(CSS, /background:linear-gradient\(180deg,#1d2850,#141d3c\)/,
    'identical gradient to the Joy Coins pill in site-points.css');
  assert.match(CSS, /-webkit-appearance:none;appearance:none/, 'no native button chrome');
  assert.match(CSS, /color:#eaf0ff;font:600 12px\/1/);
  assert.match(CSS, /header\.topbar #fullscreen:hover\{[\s\S]{0,200}?border-color:#a8b8ff70;box-shadow:0 0 0 3px #a8b8ff14;transform:translateY\(-1px\)/,
    'hover copies the neighbouring pill halo, not a text underline');
  assert.ok(!/text-decoration:underline/.test(CSS), 'no text-only hover affordance left');
  assert.match(CSS, /header\.topbar #fullscreen\[aria-pressed="true"\]\{[\s\S]{0,180}?linear-gradient\(180deg,#2a3b76,#1b2a55\)/,
    'pressed state is a deeper pill, not white text');
  assert.match(CSS, /user-select:none;-webkit-user-select:none/, 'label cannot be selected into a pale block');
  assert.match(CSS, /@media\(max-width:600px\)\{[\s\S]*?width:42px;min-width:42px;max-width:42px/);
  assert.match(CSS, /content:"⛶"[^}]*color:inherit/, 'phones keep one character inside the pill');
  assert.match(CSS, /@media\(max-width:480px\)\{[\s\S]*?body>header\.topbar \.top-actions\{gap:4px;width:218px\}/,
    'ultra-narrow phones keep the ORIGINAL 218px cluster budget');
  assert.match(CSS, /\+ 3\*4 \(gaps\) = 218/, 'the tightened pill widths add up');
  assert.match(CSS, /header\.topbar #fullscreen\{width:38px;min-width:38px;max-width:38px\}/);
  assert.match(CSS, /prefers-reduced-motion:reduce/);
  assert.match(CSS, /header\.topbar #fullscreen/, 'still outranks portal.css visibility hooks');
});

test('neither fullscreen control paints a native title tooltip', () => {
  assert.match(JS, /button\.removeAttribute\('title'\)/);
  assert.ok(!/button\.title=/.test(JS), 'no title assignment in the shared script');
  assert.match(read('dist/portal/pool-fullscreen.js'), /button\.removeAttribute\('title'\)/);
  assert.match(read('dist/portal/portal.js'), /button\.removeAttribute\('title'\)/);
  assert.match(read('dist/table/pool-shell.js'), /button\.removeAttribute\('title'\)/);
  assert.match(JS, /setAttribute\('aria-label',t\[1\]\)/, 'the hint survives for screen readers');
});

test('portal.css no longer paints a second gradient pill in the playing view', () => {
  const portal = read('dist/portal/portal.css');
  assert.ok(!/body\.playing #fullscreen\{[^}]*(?:linear-gradient|border-radius|padding:3px)/.test(portal),
    'the legacy in-game pill is retired');
  assert.ok(!/body\.playing #fullscreen:hover\{[^}]*(?:border-color|transform)/.test(portal),
    'no stray hover transform or border colour');
  assert.match(portal, /body\.playing #fullscreen:hover\{color:#fff\}/,
    'the hover-section marker stays for the rail background guard');
});

test('all headers and the generator pull the rebuilt stylesheet without bumping v=', () => {
  for (const p of pages) {
    const name = rel(p);
    assert.match(read(name), new RegExp(`site-fullscreen\\.css\\?v=${KEY}&d=${REFRESH}`),
      `${name}: plain-text stylesheet`);
    assert.match(read(name), new RegExp(`site-fullscreen\\.js\\?v=${KEY}&d=${REFRESH}`),
      `${name}: behaviour pulls the rebuilt script`);
  }
  assert.equal(pages.length, 28);
  // portal.css lost its own legacy pill too, so its six shell refs need a
  // fresh URL as well (the frozen v= and the earlier &d= stay in place).
  for (const shell of ['dist/portal/index.html', 'dist/membership.html', 'dist/terms.html',
    'dist/privacy.html', 'dist/contact.html', 'dist/shop.html']) {
    assert.match(read(shell),
      /portal\.css\?v=20261115-railbg1&d=20261115-staticnebula1&r=20261115-fstext1/,
      `${shell}: cleaned portal stylesheet`);
  }
});

test('every reserved right-cluster width includes the fullscreen slot', () => {
  const chrome = read('dist/site-chrome.css');
  const points = read('dist/site-points.css');
  for (const [file, css, widths] of [
    ['site-chrome.css', chrome, ['width:373px', 'width:266px', 'width:275px', 'width:194px']],
    ['site-points.css', points,
      ['width:381px', 'width:405px', 'width:373px',
       'width:282px', 'width:290px', 'width:218px']]
  ]) {
    for (const w of widths) assert.ok(css.includes(w), `${file} reserves ${w}`);
  }
  for (const stale of ['width:479px', 'width:377px', 'width:303px', 'width:271px', 'width:279px',
    'width:234px', 'width:242px', 'width:173px', 'width:146px']) {
    assert.ok(!chrome.includes(stale) && !points.includes(stale),
      `${stale} is no longer a cluster reservation`);
  }
});

/* A tiny DOM harness runs the real shared script: the button is moved into the
   cluster, the bilingual label tracks fullscreen, the generic toggle calls the
   document element, and the portal's game view keeps its own state machine. */
function harness({locale = 'zh', saved = 'zh', playing = false, stage = true} = {}) {
  const listeners = {};
  const attrs = {};
  const button = {
    parentNode: null, textContent: '', title: '', attrs,
    setAttribute(k, v) {attrs[k] = String(v);},
    removeAttribute(k) {delete attrs[k]; if (k === 'title') this.title = '';},
    addEventListener(type, fn) {(listeners['button:' + type] ||= []).push(fn);}
  };
  const group = {appendChild(node) {button.parentNode = group; node.moved = true;}};
  const headerNode = {querySelector(sel) {return sel === '.top-actions' ? group : null;}};
  const root = {
    getAttribute(name) {return name === 'data-locale' ? locale : null;},
    lang: locale === 'zh' ? 'zh-CN' : 'en',
    requestFullscreen() {calls.push('enter'); return Promise.resolve();}
  };
  const calls = [];
  const doc = {
    documentElement: root, body: {classList: {contains: c => c === 'playing' && playing}},
    fullscreenElement: null,
    querySelector(sel) {
      if (sel === 'header.topbar') return headerNode;
      if (sel === '.game-stage') return stage ? {} : null;
      return null;
    },
    getElementById(id) {return id === 'fullscreen' ? button : null;},
    addEventListener(type, fn) {(listeners['doc:' + type] ||= []).push(fn);},
    exitFullscreen() {calls.push('exit'); doc.fullscreenElement = null; return Promise.resolve();}
  };
  const ctx = {
    document: doc, window: {addEventListener() {}},
    localStorage: {getItem(k) {return k === 'joyflock-portal-language' ? saved : null;}},
    MutationObserver: class {constructor(fn) {this.fn = fn;} observe() {}}
  };
  button.parentNode = headerNode;
  vm.runInNewContext(JS, ctx);
  const emit = (key, event = {}) => (listeners[key] || []).forEach(fn => fn(event));
  const click = () => emit('button:click', {stopImmediatePropagation() {calls.push('stop');}});
  return {button, group, doc, calls, click, attrs, emit};
}

test('shared script moves the button into the cluster and labels it in Chinese', () => {
  const h = harness();
  assert.equal(h.button.parentNode, h.group, 'legacy portal button joins .top-actions');
  assert.equal(h.button.textContent, '全屏');
  assert.equal(h.button.title, '', 'no native title tooltip');
  assert.equal(h.attrs['aria-label'], '进入全屏');
  assert.equal(h.attrs['aria-pressed'], 'false');
  assert.equal(h.attrs['aria-label'], '进入全屏');
});

test('generic fullscreen toggles the document element and tracks its state', () => {
  const h = harness({stage: false});
  h.click();
  assert.deepEqual(h.calls, ['enter']);
  h.doc.fullscreenElement = h.doc.documentElement;
  h.emit('doc:fullscreenchange');
  assert.equal(h.button.textContent, '退出全屏');
  assert.equal(h.attrs['aria-pressed'], 'true');
  h.click();
  assert.deepEqual(h.calls, ['enter', 'exit']);
  assert.equal(h.button.textContent, '退出全屏'); // label updates on the next change event
  h.emit('doc:fullscreenchange');
  assert.equal(h.button.textContent, '全屏');
});

test('English locale gets the English labels', () => {
  const h = harness({locale: 'en', saved: 'en', stage: false});
  assert.equal(h.button.textContent, 'Fullscreen');
  assert.equal(h.attrs['aria-label'], 'Enter fullscreen');
  h.doc.fullscreenElement = h.doc.documentElement;
  h.emit('doc:fullscreenchange');
  assert.equal(h.button.textContent, 'Exit fullscreen');
});

test('the portal game view hands the button to bindPoolFullscreen', () => {
  const h = harness({playing: true});
  assert.equal(h.button.textContent, '', 'no label overwrite while a game is open');
  h.click();
  assert.deepEqual(h.calls, [], 'generic toggle stays out of the game stage');
  const lobby = harness({playing: false});
  lobby.click();
  assert.deepEqual(lobby.calls, ['stop', 'enter'],
    'returning to the lobby blocks the stale pool handler before toggling');
});
