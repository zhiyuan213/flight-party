import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const css = read('../dist/site-language.css');
const chromeCss = read('../dist/site-chrome.css');
const script = read('../dist/portal-language-ui.js');
const chainVersion = '20261112-gamelanes1';
const version = '20261114-noarrow1';
const hosts = [
  '../dist/portal/index.html', '../dist/shop.html', '../dist/membership.html',
  '../dist/terms.html', '../dist/privacy.html', '../dist/contact.html'
].map(path => ({path, html: read(path)}));

/* Chrome paints native <select> options in an OS popup where CSS text-align
   is ignored. The site now mounts an in-page menu, keeping the original
   select as the state source so both language handlers stay untouched. */
test('every shell page loads the picker assets without bumping the chrome chain', () => {
  assert.match(version, /^2026\d{4}-[a-z0-9]+$/, 'cache keys use one dated slug');
  for (const {path, html} of hosts) {
    assert.ok(html.includes(`/site-language.css?v=${version}`), `${path}: picker stylesheet`);
    assert.ok(html.includes(`/portal-language-ui.js?v=${version}`), `${path}: picker script`);
    assert.ok(html.includes(`/site-chrome.css?v=${chainVersion}`),
      `${path}: the wallet / account / points chain keeps its shared key`);
    assert.ok(html.indexOf('/site-chrome.css') < html.indexOf('/site-language.css'),
      `${path}: picker styles load after the shared chrome`);
    assert.ok(html.indexOf('/site-language.css') < html.indexOf('/portal-language-ui.js'),
      `${path}: styles are parsed before the script mounts`);
    assert.ok(html.includes('id="portal-language"'), `${path}: native select still generated`);
  }
  assert.ok(!/centred language picker|\.lang-picker\{/.test(chromeCss),
    'the picker rules live in their own file, not in the shared chrome bundle');
});

test('trigger label and both menu options are centred', () => {
  const trigger = /\.lang-picker \.lang-trigger\{([^}]*)\}/.exec(css);
  const label = /\.lang-picker \.lang-trigger-label\{([^}]*)\}/.exec(css);
  const option = /\.lang-picker \.lang-option\{([^}]*)\}/.exec(css);
  assert.ok(trigger && label && option, 'all three alignment rules exist');
  for (const [name, block] of [['trigger', trigger[1]], ['label', label[1]], ['option', option[1]]]) {
    assert.match(block, /text-align:\s*center/, `${name}: horizontally centred`);
    assert.match(block, /text-align-last:\s*center/, `${name}: Firefox / last-line fallback`);
  }
  assert.match(css, /\.lang-picker \.lang-menu\[hidden\]\{display:none!important\}/,
    'the closed menu is really removed from the layout');
  assert.ok(!/lang-trigger-chevron/.test(css), 'no arrow glyph is styled');
  assert.ok(!/lang-trigger-chevron/.test(script), 'no arrow glyph is mounted');
});

test('the trigger shows only the label: no arrow, still fully clickable', () => {
  const h = harness('zh');
  assert.equal(h.trigger.querySelector('.lang-trigger-label').textContent, '中文');
  assert.equal(h.trigger.querySelectorAll('.lang-trigger-chevron').length, 0,
    'no chevron span is mounted inside the trigger');
  assert.equal(h.trigger.getAttribute('aria-haspopup'), 'listbox',
    'the label still advertises the dropdown');
  h.trigger.click();
  assert.equal(h.menu.hidden, false, 'clicking the bare label opens the language menu');
  assert.equal(h.trigger.getAttribute('aria-expanded'), 'true');
});

test('the picker keeps the header geometry at all three breakpoints', () => {
  assert.match(css, /\.lang-picker\{[^}]*width:75px;height:24px/, 'desktop matches the old 75px select');
  assert.match(css, /@media\(max-width:600px\)\{\s*\.lang-picker\{width:64px;height:22px\}/);
  assert.match(css, /@media\(max-width:480px\)\{\s*\.lang-picker\{width:58px\}/);
  assert.match(css, /\.lang-picker>\.portal-language-native\{[^}]*opacity:0!important/,
    'the hidden native select takes no layout space');
});

test('progressive enhancement: the native select is hidden only after mount', () => {
  assert.match(script, /select\.classList\.add\('portal-language-native'\)/);
  assert.match(css, /\.lang-picker>\.portal-language-native\{/);
  for (const sheet of [css, chromeCss]) {
    assert.ok(!/\.portal-language\{[^}]*display:\s*none/.test(sheet),
      'CSS must not hide the original control when JS is missing');
  }
  assert.ok(!/select\.remove\(\)/.test(script), 'the select stays in the DOM');
  assert.match(script, /select\.dispatchEvent\(new Event\('change',\s*\{bubbles:\s*true\}\)\)/,
    'existing legal-language.js / portal.js change handlers still fire');
});

test('both labels, aria state and external locale updates stay in sync', () => {
  assert.match(script, /var LABELS = \{en: 'English', zh: '中文'\}/);
  assert.match(script, /aria-haspopup.*listbox|setAttribute\('aria-haspopup', 'listbox'\)/);
  assert.match(script, /setAttribute\('aria-selected', String\(on\)\)/);
  assert.match(script, /new MutationObserver\(sync\)\.observe\(document\.documentElement/,
    'iframe locale messages and the head bootstrap also update the label');
  assert.match(script, /select\.addEventListener\('change', sync\)/);
  assert.match(script, /document\.addEventListener\('click'/);
  assert.match(script, /event\.key === 'Escape'/);
});

/* Small DOM stand-in, enough to run the shipped IIFE exactly as a browser
   would: mount, open, pick, close and the bubbling change event. */
function harness(language = 'zh') {
  class FakeEvent {
    constructor(type, options = {}) {this.type = type; this.bubbles = !!options.bubbles; this.target = null; this._stopped = false;}
    preventDefault() {this.defaultPrevented = true;}
    stopPropagation() {this._stopped = true;}
  }
  const make = tag => {
    const el = {
      tagName: tag, children: [], parentNode: null, attrs: {}, _classes: new Set(),
      listeners: {}, hidden: false, tabIndex: 0, _text: '',
      get className() {return [...this._classes].join(' ');},
      set className(value) {this._classes = new Set(String(value).split(/\s+/).filter(Boolean));},
      setAttribute(k, v) {this.attrs[k] = String(v);},
      getAttribute(k) {return k in this.attrs ? this.attrs[k] : null;},
      appendChild(child) {
        if (child.parentNode) {
          const i = child.parentNode.children.indexOf(child);
          if (i >= 0) child.parentNode.children.splice(i, 1);
        }
        child.parentNode = this; this.children.push(child); return child;
      },
      insertBefore(child, ref) {
        const i = this.children.indexOf(ref);
        child.parentNode = this;
        this.children.splice(i < 0 ? this.children.length : i, 0, child);
        return child;
      },
      addEventListener(type, fn) {(this.listeners[type] ||= []).push(fn);},
      dispatchEvent(event) {
        event.target ??= this;
        let node = this;
        while (node) {
          (node.listeners[event.type] || []).slice().forEach(fn => fn(event));
          if (event._stopped) break;
          node = node.parentNode;
        }
        return true;
      },
      click() {return this.dispatchEvent(new FakeEvent('click'));},
      key(key) {return this.dispatchEvent(Object.assign(new FakeEvent('keydown'), {key}));},
      focus() {document.activeElement = this;},
      contains(node) {
        if (node === this) return true;
        return this.children.some(child => child.contains(node));
      },
      closest(selector) {
        let node = this;
        while (node) {
          if (selector === '[data-lang]' && node.attrs['data-lang']) return node;
          node = node.parentNode;
        }
        return null;
      },
      descendants() {return this.children.flatMap(child => [child, ...child.descendants()]);},
      querySelector(selector) {
        const all = this.descendants();
        if (selector.startsWith('.')) return all.find(n => n._classes.has(selector.slice(1))) || null;
        if (selector === '[data-lang]') return all.find(n => n.attrs['data-lang']) || null;
        return null;
      },
      querySelectorAll(selector) {
        const all = this.descendants();
        if (selector === '[data-lang]') return all.filter(n => n.attrs['data-lang']);
        if (selector.startsWith('.')) return all.filter(n => n._classes.has(selector.slice(1)));
        return [];
      },
      classList: null,
      get textContent() {return this._text;},
      set textContent(value) {this._text = String(value);},
      set innerHTML(value) {
        this._html = value;
        if (value.includes('lang-trigger-label')) {
          const span = make('span'); span._classes.add('lang-trigger-label'); this.appendChild(span);
        }
      },
      get innerHTML() {return this._html || '';}
    };
    el.classList = {
      add: c => el._classes.add(c), remove: c => el._classes.delete(c),
      contains: c => el._classes.has(c),
      toggle: (c, on) => {const next = on === undefined ? !el._classes.has(c) : !!on; next ? el._classes.add(c) : el._classes.delete(c); return next;}
    };
    return el;
  };
  const documentElement = make('html');
  documentElement.setAttribute('data-locale', language);
  const root = make('div');
  const body = make('body');
  const select = make('select');
  select.value = language;
  select.setAttribute('class', 'portal-language');
  root.appendChild(select);
  root.parentNode = documentElement;
  body.parentNode = documentElement;
  const changes = [];
  select.addEventListener('change', () => changes.push(select.value));
  const document = {
    documentElement, body, activeElement: null, listeners: {},
    getElementById: id => id === 'portal-language' ? select : null,
    createElement: make,
    addEventListener(type, fn) {(this.listeners[type] ||= []).push(fn);}
  };
  documentElement.listeners = document.listeners;
  class MutationObserver {constructor(fn) {this.fn = fn;} observe() {this.observed = true;}}
  runInNewContext(script, {document, Event: FakeEvent, MutationObserver, console});
  const wrap = root.children[0];
  return {document, documentElement, root, body, select, wrap, changes,
    trigger: wrap.querySelector('.lang-trigger'),
    menu: wrap.children.find(c => c._classes.has('lang-menu')),
    options: wrap.querySelectorAll('[data-lang]')};
}

test('mounted picker opens, centres and dispatches a real change event', () => {
  const h = harness('zh');
  assert.ok(h.wrap._classes.has('lang-picker'), 'wrapper is mounted');
  assert.ok(h.select._classes.has('portal-language-native'), 'native select is hidden after mount');
  assert.equal(h.select.getAttribute('data-lang-picker'), '1');
  assert.equal(h.trigger.querySelector('.lang-trigger-label').textContent, '中文');
  assert.equal(h.options.length, 2);
  assert.deepEqual(h.options.map(o => o.textContent), ['English', '中文']);
  assert.equal(h.options[1].getAttribute('aria-selected'), 'true');

  h.trigger.click();
  assert.equal(h.menu.hidden, false, 'click opens the menu');
  assert.equal(h.trigger.getAttribute('aria-expanded'), 'true');

  h.options[0].click();
  assert.equal(h.select.value, 'en', 'the native select remains the state source');
  assert.deepEqual(h.changes, ['en'], 'one bubbling change reaches the locale handlers');
  assert.equal(h.trigger.querySelector('.lang-trigger-label').textContent, 'English');
  assert.equal(h.options[0].getAttribute('aria-selected'), 'true');
  assert.equal(h.menu.hidden, true, 'picking closes the menu');

  h.trigger.click();
  assert.equal(h.menu.hidden, false);
  h.body.click();
  assert.equal(h.menu.hidden, true, 'outside click closes the menu');
  h.trigger.click();
  h.menu.key('Escape');
  assert.equal(h.menu.hidden, true, 'Escape closes the menu');
});

test('the picker is idempotent and mirrors external locale changes', () => {
  const h = harness('en');
  assert.equal(h.trigger.querySelector('.lang-trigger-label').textContent, 'English');
  assert.equal(h.wrap.querySelectorAll('[data-lang]').length, 2, 'no duplicate options');
  h.select.value = 'zh';
  h.documentElement.setAttribute('data-locale', 'zh');
  h.select.dispatchEvent({type: 'change', target: h.select, _stopped: false});
  assert.equal(h.trigger.querySelector('.lang-trigger-label').textContent, '中文',
    'a locale change from other code refreshes the label');
});
