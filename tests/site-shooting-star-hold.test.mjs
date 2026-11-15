import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

/* site-shooting-star.js is a deferred browser script. Run it in a VM with a
   tiny DOM plus controllable timers so the brand-only hover stream can be
   checked without a real browser (the same technique as quick-match.test.mjs). */
const source = readFileSync(new URL('../dist/site-shooting-star.js', import.meta.url), 'utf8');

function node(kind = 'plain') {
  const props = {}, listeners = {};
  return {
    className: '', children: [], parentNode: null, listeners,
    style: {
      display: '',
      setProperty(k, v) { props[k] = String(v); },
      getPropertyValue(k) { return props[k] || ''; }
    },
    setAttribute() {},
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    appendChild(child) { this.children.push(child); child.parentNode = this; return child; },
    removeChild(child) {
      const i = this.children.indexOf(child);
      if (i >= 0) this.children.splice(i, 1);
      child.parentNode = null;
    },
    get childElementCount() { return this.children.length; },
    get firstChild() { return this.children[0] || null; },
    getAnimations() { return []; },
    closest(sel) {
      /* HOLD_HOT now contains ONLY '.topbar .brand'. A game cover ('card')
         and an ordinary control both fail that match. */
      if (sel.includes('.topbar .brand')) return kind === 'icon' ? this : null;
      return kind === 'plain' ? null : this;
    },
    end() {
      for (const fn of listeners.animationend || []) fn({ animationName: 'joymeteor-fly' });
    }
  };
}

function setup({ reduced = false, embedded = false, withFrame = false } = {}) {
  const docListeners = {}, winListeners = {}, timers = new Map();
  let clock = 0, seq = 1, meteors = 0;
  const base = 1800000000000;
  const frame = withFrame ? { contentWindow: {} } : null;
  const doc = {
    head: node(), body: node(), hidden: false,
    createElement(tag) {
      const n = node();
      n.tag = tag;
      if (tag === 'i') meteors++;
      return n;
    },
    addEventListener(type, fn) { docListeners[type] = fn; },
    getElementById(id) { return id === 'game-frame' ? frame : null; }
  };
  doc.body.hasAttribute = () => false;
  const win = {
    innerWidth: 1280, innerHeight: 900,
    matchMedia: () => ({ matches: reduced }),
    addEventListener(type, fn) { winListeners[type] = fn; },
    setTimeout(fn, ms) { const id = seq++; timers.set(id, { fn, at: clock + ms }); return id; },
    clearTimeout(id) { timers.delete(id); }
  };
  win.top = embedded ? {} : win;
  const fakeMath = Object.create(Math);
  fakeMath.random = () => .5;                 // deterministic midpoints
  const context = vm.createContext({
    document: doc, window: win, location: { origin: 'http://localhost' },
    sessionStorage: { getItem: () => '0', setItem() {} },
    getComputedStyle: () => ({ opacity: 1 }),
    Date: { now: () => base + clock }, Math: fakeMath
  });
  vm.runInContext(source, context);
  const api = win.__joyflockMeteor;

  function advance(ms) {
    const end = clock + ms;
    for (let guard = 0; guard < 10000; guard++) {
      let next = null, nextId = null;
      for (const [id, t] of timers) {
        if (t.at <= end && (!next || t.at < next.at)) { next = t; nextId = id; }
      }
      if (!next) break;
      clock = next.at;
      timers.delete(nextId);
      next.fn();
    }
    clock = end;
  }
  function endAll() {
    const layer = api && api.layer;
    if (!layer) return;
    for (const child of layer.children.slice()) child.end();
  }
  function over(kind = 'icon', from = null) {
    docListeners.pointerover({ target: node(kind), relatedTarget: from, pointerType: 'mouse' });
  }
  return { doc, win, api, advance, endAll, over, docListeners, winListeners,
    frame, created: () => meteors, timers };
}

function hoverStream(s, seconds) {
  for (let i = 0; i < seconds * 4; i++) { s.advance(250); s.endAll(); }
}

test('hovering ONLY the top-left brand keeps emitting meteors until the pointer leaves', () => {
  const s = setup();
  assert.equal(s.api.version, '20261110-brandonly1');
  assert.equal(s.api.config.hold.selector, '.topbar .brand', 'no game-cover selector remains');
  assert.equal(s.api.state().held, false);

  s.over('icon');
  assert.equal(s.api.state().held, true, 'the brand starts the hold');
  hoverStream(s, 6);
  const streamed = s.api.state().holdFired;
  assert.ok(streamed >= 15, `6s of hovering should stream meteors, got ${streamed}`);
  assert.equal(s.api.state().showers, 0, 'timed showers stay paused during a hold');
  assert.ok(s.created() >= 15, 'each held emission creates a real meteor node');

  s.docListeners.pointerout({ relatedTarget: node('plain') });
  assert.equal(s.api.state().held, false);
  const after = s.api.state().holdFired;
  s.advance(4000);
  assert.equal(s.api.state().holdFired, after, 'no new meteor after leaving the brand');
});

test('sliding within the brand keeps one stream and the live cap is respected', () => {
  const s = setup();
  s.over('icon');
  s.advance(1000);
  const before = s.api.state().holdFired;
  s.over('icon');                         // e.g. moving from "JoyFlock" to the ✦ glyph
  assert.equal(s.api.state().held, true, 'no restart inside the brand');
  s.advance(6000);                       // deliberately do NOT end animations
  assert.ok(s.api.state().holdFired > before, 'the stream continues');
  assert.equal(s.api.state().showers, 0);
  assert.ok(s.api.layer.childElementCount <= s.api.config.hold.maxLive,
    `live meteors must stay under the cap, got ${s.api.layer.childElementCount}`);
});

test('game covers, nav links, buttons and plain areas trigger NO shower at all', () => {
  const s = setup();
  s.advance(3000);                        // still before the first timed shower
  for (let i = 0; i < 6; i++) s.over('card');
  for (let i = 0; i < 6; i++) s.over('control');
  s.over('plain');
  s.advance(3000);
  const st = s.api.state();
  assert.equal(st.held, false);
  assert.equal(st.holdFired, 0, 'no continuous stream outside the brand');
  assert.equal(st.showers, 0, 'no one-off hover shower');
  assert.equal(s.created(), 0, 'no meteor node was created by a hover');
  assert.notEqual(st.lastReason, 'hover', 'the hover reason is gone');
});

test('moving from the brand onto a game cover stops the stream immediately', () => {
  const s = setup();
  s.over('icon');
  hoverStream(s, 1);
  s.over('card');
  assert.equal(s.api.state().held, false);
  const after = s.api.state().holdFired;
  s.advance(4000);
  assert.equal(s.api.state().holdFired, after);
});

test('the timed random shower is still the only other source of meteors', () => {
  const s = setup();
  s.over('control');                      // inert hover must not consume the schedule
  s.advance(16000);                      // past FIRST_MAX (7-15s)
  const st = s.api.state();
  assert.ok(st.showers >= 1, 'the scheduled shower still fires');
  assert.equal(st.lastReason, 'timer');
  assert.ok(s.created() >= 3, 'a timed shower is a small group of meteors');
  assert.equal(st.held, false);
  assert.equal(st.holdFired, 0);
});

test('the embedded game pointer relay no longer starts a shower', () => {
  const s = setup({ withFrame: true });
  s.advance(3000);
  for (let i = 0; i < 4; i++) {
    s.winListeners.message({ origin: 'http://localhost', source: s.frame.contentWindow,
      data: { type: 'joyflock:pointer', kind: 'move', hot: true, screen: false } });
  }
  assert.equal(s.api.state().showers, 0);
  assert.equal(s.api.state().holdFired, 0);
  assert.equal(s.created(), 0);
  // the relay must still be able to suspend the layer for an in-game screen
  s.winListeners.message({ origin: 'http://localhost', source: s.frame.contentWindow,
    data: { type: 'joyflock:game-screen', active: true } });
  assert.equal(s.api.state().suspended, true);
});

test('entering a game suspends the stream; it only restarts on a fresh hover', () => {
  const s = setup();
  s.over('icon');
  hoverStream(s, 1);
  s.api.suspend(true);
  assert.equal(s.api.state().suspended, true);
  assert.equal(s.api.state().held, false);
  assert.equal(s.api.layer.childElementCount, 0, 'in-flight meteors are cleared');
  const fired = s.api.state().holdFired;
  s.advance(5000);
  assert.equal(s.api.state().holdFired, fired, 'no emission while a game owns the viewport');
  s.api.suspend(false);
  s.advance(2000);
  assert.equal(s.api.state().held, false, 'resuming does not silently resume a hold');
  s.over('icon');
  assert.equal(s.api.state().held, true);
});

test('reduced motion and embedded game documents never create a shower layer', () => {
  assert.equal(setup({ reduced: true }).api, undefined);
  assert.equal(setup({ embedded: true }).api, undefined);
});
