import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import {bindPoolFullscreen} from '../dist/portal/pool-fullscreen.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const shell = read('dist/table/pool-shell.js');
const css = read('dist/table/pool-shell.css');
const outer = read('dist/portal/pool-fullscreen.js');
const locale = read('dist/table/table-locale.js');
const REFRESH = '20261115-chatfs1';

/* The helpers sit between the module's DOM utilities and createChat(), so a
   VM can execute them verbatim against a tiny DOM without importing the whole
   game renderer (which needs canvas, timers and a real document). */
const helperStart = shell.indexOf('/* The chat heading used to carry');
// poolSeatSummary() is exported and sits between the helpers and createChat();
// stop before it so the extracted block stays a plain script for vm.
const helperEnd = shell.indexOf('export function poolSeatSummary');
assert.ok(helperStart > 0 && helperEnd > helperStart, 'helper block is extractable');
const helpers = shell.slice(helperStart, helperEnd);

function chatHarness({lang = 'zh-CN', embedded = false, native = false, search = '?game=pool&embed=joyflock', started = false} = {}) {
  const button = {
    textContent: '', dataset: {}, title: '', attrs: {},
    setAttribute(k, v) { this.attrs[k] = v; },
    removeAttribute(k) { delete this.attrs[k]; if (k === 'title') this.title = ''; },
    addEventListener() {}
  };
  const calls = [];
  const document = {
    documentElement: {lang, hasAttribute:k=>native&&k==='data-native-game'},
    body: {dataset: {}},
    referrer: 'http://127.0.0.1:8080/portal/index.html',
    fullscreenElement: started ? {} : null,
    exitFullscreen() { calls.push('exitFullscreen'); document.fullscreenElement = null; },
    addEventListener() {}
  };
  document.documentElement.requestFullscreen = () => calls.push('requestFullscreen');
  const parent = {postMessage: (...args) => calls.push(['postMessage', ...args])};
  const window = {parent: embedded ? parent : null, addEventListener() {},dispatchEvent:event=>calls.push(['event',event.type])};
  window.parent = embedded ? parent : window;
  const location = {origin: 'http://127.0.0.1:8080', search};
  const context = vm.createContext({document, window, location, URL, URLSearchParams,CustomEvent:class{constructor(type){this.type=type;}},
    shell: {chatFullscreen: button}, console});
  vm.runInContext('var shell = globalThis.shell;\n' + helpers +
    '\nglobalThis.api = {syncChatFullscreen, toggleChatFullscreen, chatFullscreenCopy, chatEmbedded};', context);
  return {button, calls, document, window, parent,
    api: context.api,
    setLang(value) { document.documentElement.lang = value; }};
}

test('the chat heading is a real button, not the old visibility badge', () => {
  assert.doesNotMatch(shell, /同房间可见|pool-chat-count/);
  assert.doesNotMatch(locale, /同房间可见|Room only/);
  assert.match(shell, /element\('button','pool-chat-fullscreen','全屏'\)/);
  assert.match(shell, /fullscreen\.type='button'/);
  assert.match(shell, /fullscreen\.addEventListener\('click',toggleChatFullscreen\)/);
  assert.match(shell, /chatFullscreen:fullscreen/);
  assert.match(css, /\.pool-chat-fullscreen\{/);
  assert.match(css, /\.pool-chat-fullscreen\[aria-pressed="true"\]/);
  assert.doesNotMatch(css, /\.pool-chat-count/);
  // The generic dictionary walker must not fight a label that JS rewrites.
  assert.match(locale, /closest\('\.pool-chat-fullscreen'\)\)continue/);
});

test('the chat toggle is plain text and only appears while embedded fullscreen', () => {
  assert.match(css, /\.pool-chat-fullscreen\{[\s\S]{0,420}?background:transparent;background-image:none;border:0;border-radius:0;box-shadow:none;padding:0/);
  assert.ok(!/\.pool-chat-fullscreen\{[^}]*(?:#ffffff0d|border:1px solid|border-radius:7px|min-width:76px)/.test(css),
    'the old pill, border, radius and 76px slot are gone');
  /* 17:30: the pale #eaf2ff square in the screenshot came from table.css's
     global `button:hover:not(:disabled)`; the home themes add even stronger
     button:hover rules. The (0,5,0) panel-scoped override keeps resting,
     hover and active flat under every theme and load order. */
  assert.doesNotMatch(css, /\.pool-chat-fullscreen:hover\{/,
    'the old white-text + underline hover rule is gone');
  assert.match(css,
    /\.pool-chat-panel \.pool-chat-heading \.pool-chat-fullscreen:not\(:disabled\),\s*\.pool-chat-panel \.pool-chat-heading \.pool-chat-fullscreen:hover:not\(:disabled\),\s*\.pool-chat-panel \.pool-chat-heading \.pool-chat-fullscreen:active:not\(:disabled\)\{\s*background:transparent;background-image:none;\s*border:0;box-shadow:none;transform:none;text-decoration:none\}/,
    'resting, hover and active stay transparent, un-underlined and unmoved');
  assert.match(read('dist/table/table.css'),
    /button:hover:not\(:disabled\)\{background:#eaf2ff;transform:translateY\(-1px\)\}/,
    'the global pale hover fill is preserved and overridden locally, not edited');
  assert.match(css, /\.pool-chat-fullscreen\[aria-pressed="true"\]\{color:#fff\}/);
  // 15:37: the shell header control is now a gradient pill like its neighbours,
  // and no fullscreen control may paint a native tooltip / selectable label.
  assert.match(read('dist/site-fullscreen.css'),
    /header\.topbar #fullscreen\{[\s\S]*?background:linear-gradient\(180deg,#1d2850,#141d3c\)/);
  assert.match(css, /html\.embedded-game \.pool-chat-fullscreen\{display:none\}/,
    'non-fullscreen embedded view has no duplicate toggle');
  assert.match(css, /html\.embedded-game \.pool-chat-fullscreen\[aria-pressed="true"\]\{display:inline-block\}/,
    'fullscreen reveals the exit-only label');
  assert.match(css, /user-select:none;-webkit-user-select:none/,
    'the label cannot be double-clicked into a pale selection block');
  assert.ok(!/button\.title=/.test(shell), 'no native title tooltip is written');
});

test('the button labels, aria state and i18n hook follow the broadcast state', () => {
  const zh = chatHarness();
  zh.api.syncChatFullscreen(false);
  assert.equal(zh.button.textContent, '全屏');
  assert.equal(zh.button.dataset.systemEnglish, 'Fullscreen');
  assert.equal(zh.button.attrs['aria-pressed'], 'false');
  assert.equal(zh.button.title, '', 'no native tooltip');
  assert.equal(zh.button.attrs['aria-label'], '进入全屏');

  zh.api.syncChatFullscreen(true);
  assert.equal(zh.button.textContent, '退出全屏');
  assert.equal(zh.button.dataset.systemEnglish, 'Exit fullscreen');
  assert.equal(zh.button.attrs['aria-pressed'], 'true');
  assert.equal(zh.button.title, '', 'no native tooltip');
  assert.equal(zh.button.attrs['aria-label'], '退出全屏（Esc）');

  const en = chatHarness({lang: 'en'});
  en.api.syncChatFullscreen(false);
  assert.equal(en.button.textContent, 'Fullscreen');
  en.api.syncChatFullscreen(true);
  assert.equal(en.button.textContent, 'Exit fullscreen');
  assert.equal(en.button.title, '', 'no native tooltip');
  assert.equal(en.button.attrs['aria-label'], 'Exit fullscreen (Esc)');
});

test('embedded clicks forward ONE toggle message; standalone uses native fullscreen', () => {
  const embedded = chatHarness({embedded: true});
  embedded.api.toggleChatFullscreen();
  assert.equal(embedded.calls.length, 1);
  assert.equal(embedded.calls[0][0], 'postMessage');
  // The payload is created inside the VM realm, so compare its fields, not its prototype.
  assert.equal(embedded.calls[0][1].type, 'joyflock:toggle-fullscreen');
  assert.equal(embedded.calls[0][2], 'http://127.0.0.1:8080');

  const standalone = chatHarness({embedded: false, search: '?game=pool'});
  assert.equal(standalone.api.chatEmbedded(), false);
  standalone.api.toggleChatFullscreen();
  assert.deepEqual(standalone.calls, ['requestFullscreen']);
  standalone.document.fullscreenElement = {};
  standalone.api.toggleChatFullscreen();
  assert.deepEqual(standalone.calls, ['requestFullscreen', 'exitFullscreen']);
});

test('direct composition sends one in-document fullscreen event without postMessage',()=>{
 const direct=chatHarness({native:true,embedded:false});direct.api.toggleChatFullscreen();
 assert.deepEqual(direct.calls,[['event','joyflock:native-toggle-fullscreen']]);
});

test('every changed asset is cache-busted without forking the shared keys', () => {
  const hosts = ['dist/table/index.html', 'dist/table/table.js',
    'dist/pool-result-preview.html', 'dist/table/four-feedback-preview.html',
    'dist/portal/portal.js'];
  for (const p of hosts) {
    const text = read(p);
    assert.ok(text.includes(REFRESH), `${p} pulls the new ${REFRESH} assets`);
    for (const asset of ['pool-shell.js?v=20261115-joincoin1',
      'pool-shell.css?v=20261112-gamelanes1',
      'pool-fullscreen.js?v=20261110-fullzoom1',
      'table-locale.js?v=20261110-glove2']) {
      if (text.includes(asset)) {
        assert.ok(text.includes(asset + '&d=' + REFRESH), `${p}: ${asset} is refreshed`);
      }
    }
  }
  // 15:04: pool-shell.css was edited again for the plain-text chat toggle.
  // 15:37: exit-only visibility + no tooltip/selection effect.
  for (const p of ['dist/table/index.html', 'dist/pool-result-preview.html',
    'dist/table/four-feedback-preview.html']) {
    assert.match(read(p),
      /pool-shell\.css\?v=20261112-gamelanes1&d=20261115-chatfs1&r=20261115-chattext1&t=20261115-fspill1&h=20261115-nohover1/,
      `${p}: exit-only chat stylesheet with the flat-hover fix`);
  }
  for (const p of ['dist/table/table.js', 'dist/pool-result-preview.html']) {
    assert.match(read(p), /pool-shell\.js\?v=20261115-joincoin1&d=20261115-chatfs1&r=20261115-fspill1/,
      `${p}: rebuilt chat behaviour`);
  }
  assert.match(read('dist/portal/portal.js'),
    /pool-fullscreen\.js\?v=20261110-fullzoom1&d=20261115-chatfs1&r=20261115-fspill1/,
    'portal pulls the rebuilt state machine');
  assert.match(read('dist/portal/index.html'), /portal\.js\?v=20261112-gamelanes1&d=20261115-fspill1/,
    'portal shell pulls the rebuilt bootstrap');
  // The shared chain and the frozen standalone keys themselves are unchanged.
  for (const asset of ['pool-shell.js?v=20261115-joincoin1',
    'pool-shell.css?v=20261112-gamelanes1',
    'pool-fullscreen.js?v=20261110-fullzoom1']) {
    assert.ok(read('dist/table/index.html').includes(asset) ||
      read('dist/table/table.js').includes(asset) ||
      read('dist/portal/portal.js').includes(asset), `${asset} still referenced`);
  }
});

test('the portal owns the toggle: trusted child messages drive ONE state machine', async () => {
  const events = {}, classes = new Set(), sent = [];
  const frame = {contentWindow: {postMessage: (data, origin) => sent.push([data, origin])}};
  const button = {setAttribute() {}, removeAttribute() {}, addEventListener: (k, fn) => { events['button:' + k] = fn; }};
  let requests = 0, exits = 0;
  const document = {
    fullscreenElement: null, head: {append() {}}, createElement: () => ({}),
    addEventListener: (k, fn) => { events[k] = fn; },
    exitFullscreen: async () => { exits++; document.fullscreenElement = null; events.fullscreenchange(); }
  };
  const stage = {
    classList: {toggle: (name, on) => on ? classes.add(name) : classes.delete(name)},
    requestFullscreen: async () => { requests++; document.fullscreenElement = stage; events.fullscreenchange(); }
  };
  const window = {navigator: {userActivation: {isActive: true}}, addEventListener: (k, fn) => { events[k] = fn; }};
  bindPoolFullscreen({document, window, stage, button, frame, gameOrigin: 'https://flight.joyflock.com'});
  const child = (data, extra = {}) => events.message({
    origin: 'https://flight.joyflock.com', source: frame.contentWindow, data, ...extra
  });

  // bindPoolFullscreen() reports its initial state once during setup.
  assert.equal(sent.length, 1, 'initial state is broadcast on bind');
  const beforeQuery = sent.length;
  child({type: 'joyflock:fullscreen-query'});
  assert.equal(sent.length, beforeQuery + 1, 'query is answered with the current state');
  assert.deepEqual(sent.at(-1)[0], {type: 'joyflock:game-fullscreen', full: false});

  child({type: 'joyflock:toggle-fullscreen'});
  await Promise.resolve();
  assert.equal(requests, 1, 'trusted toggle enters fullscreen');
  assert.equal(button.textContent, '退出全屏');
  assert.ok(sent.some(([data]) => data.type === 'joyflock:game-fullscreen' && data.full === true),
    'the new state is broadcast back to the chat button');

  child({type: 'joyflock:toggle-fullscreen'});
  await Promise.resolve();
  assert.equal(exits, 1, 'second toggle exits');
  assert.equal(button.textContent, '全屏');

  const before = sent.length;
  child({type: 'joyflock:toggle-fullscreen'}, {origin: 'https://evil.test'});
  child({type: 'joyflock:toggle-fullscreen'}, {source: {}});
  assert.equal(sent.length, before, 'untrusted origins/sources cannot toggle');
  assert.equal(requests, 1, 'no extra native request');
});
