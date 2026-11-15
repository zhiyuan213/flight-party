/* JoyFlock — pocket chime for Pool.
 *
 * A short, bright "point scored" confirmation, played once a shot's balls
 * have actually dropped. It is deliberately NOT part of pool-audio.js:
 * table.js, pool-view.js, snooker-view.js and the preview pages import that
 * file under several different ?v= URLs, which makes several separate module
 * singletons with separate AudioContexts. This module owns one context.
 *
 * The physical pocket sounds in pool-audio.js (rubber guard, wooden drop,
 * return-channel rattle) stay exactly as they are — those are the impact;
 * this is the reward. It is much shorter and quieter than the victory
 * fanfare because it fires on every successful pot.
 *
 * Browser autoplay policy: a context created at load time starts suspended.
 * Every real gesture retries resume(), and if the very first pot happens
 * while it is still resolving we replay once on the next task, so no pot is
 * silently lost.
 */
let ctx = null, lastAt = 0, lastKey = '', pending = 0;
const stats = {played: 0, blocked: 0, throttled: 0};

function muted() {
  if(globalThis.__joyflockAudio)return globalThis.__joyflockAudio.muted||document.hidden;
  try {
    if (localStorage.getItem('joyflock.pool.muted') === '1') return true;
    const prefs = JSON.parse(localStorage.getItem('flight-party-prefs') || 'null');
    if (prefs && prefs.sound === false) return true;
  } catch (e) {}
  return document.hidden;
}
function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { ctx = new AC(); } catch (e) { return null; }
  return ctx;
}
function resume() {
  const c = ensure();
  if (c && c.state !== 'running') { try { c.resume().catch(() => {}); } catch (e) {} }
  return c;
}
function unlock() { resume(); }

/* In the portal the whole game runs inside a same-origin iframe: the button
   that starts a match is clicked in the PARENT document, so this frame may
   never see a gesture of its own. Borrow the parent's already-running hover
   context in that case; an AudioContext can be used from any same-origin
   frame, and the sound still reaches the same output device. */
function activeContext() {
  const c = resume();
  if (c && c.state === 'running') return c;
  try {
    const top = window.top;
    if (top && top !== window) {
      const api = top.__joyflockHoverSfx;
      if (api && api.context && api.context.state === 'running') return api.context;
    }
  } catch (e) {}
  return c;
}

if (typeof document !== 'undefined') {
  ['pointerdown', 'mousedown', 'touchend', 'keydown', 'click'].forEach(function (type) {
    document.addEventListener(type, unlock, {capture: true, passive: true});
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) resume(); }, {passive: true});
  ensure();
}

/* Two bell partials plus a soft rising confirm note. Multi-ball pots ring a
   touch higher (capped) instead of getting louder, so a break never booms. */
function chime(c, count) {
  const balls = Math.max(1, Math.min(6, Number(count) || 1));
  const lift = 1 + (Math.min(balls, 4) - 1) * .045;
  const rate = c.sampleRate, duration = .40;
  const data = new Float32Array(Math.ceil(duration * rate));
  for (const [at, freq, len, level] of [
    [0, 1046.5 * lift, .26, .095],
    [0, 2093 * lift, .14, .026],
    [.072, 1567.98 * lift, .29, .062]
  ]) {
    const start = Math.round(at * rate), length = Math.round(len * rate);
    for (let i = 0; i < length && start + i < data.length; i++) {
      const t = i / rate, u = i / (length - 1);
      const env = Math.min(1, t / .003) * Math.pow(1 - u, 2.3);
      data[start + i] += level * env * (Math.sin(2 * Math.PI * freq * t) + .16 * Math.sin(4 * Math.PI * freq * t));
    }
  }
  data[data.length - 1] = 0;
  const buffer = c.createBuffer(1, data.length, rate);
  buffer.getChannelData(0).set(data);
  const src = c.createBufferSource();
  src.buffer = buffer;
  src.connect(globalThis.__joyflockAudio?globalThis.__joyflockAudio.output(c,'pocket'):c.destination);
  const at = c.currentTime;
  src.start(at); src.stop(at + duration);
  src.onended = function () { try { src.disconnect(); } catch (e) {} };
}

export function playPocketChime(count = 1, key = '') {
  if (muted()) { stats.blocked++; return false; }
  const now = performance.now(), k = String(key || '');
  if ((k && k === lastKey && now - lastAt < 1500) || now - lastAt < 260) { stats.throttled++; return false; }
  const c = activeContext();
  if (!c || c.state !== 'running') {
    // Chrome often resolves resume() just after the gesture handler returns.
    // Schedule one retry so the first pot of a freshly loaded tab is audible.
    if (!pending) {
      pending = setTimeout(function () {
        pending = 0;
        const cc = activeContext();
        if (cc && cc.state === 'running' && !muted()) {
          chime(cc, count); stats.played++;
          lastAt = performance.now(); lastKey = k;
        }
      }, 90);
    }
    stats.blocked++;
    return false;
  }
  chime(c, count);
  stats.played++; lastAt = now; lastKey = k;
  return true;
}

export function pocketSfxDiagnose() {
  return {version: '20261109-pocketscore2', state: ctx ? ctx.state : 'none', muted: muted(), stats: Object.assign({}, stats)};
}

// globalThis keeps the module importable under `node --test` (no window),
// while remaining the same object in a browser.
try {
  Object.defineProperty(globalThis, '__joyflockPocketSfx', {
    value: {play: playPocketChime, diagnose: pocketSfxDiagnose}, configurable: false
  });
} catch (e) { globalThis.__joyflockPocketSfx = {play: playPocketChime, diagnose: pocketSfxDiagnose}; }
