/* JoyFlock meteor shower.
   Every now and then — or when the pointer first settles on an interactive
   element — a small shower of soft meteors streaks across the MIDDLE of the
   backdrop, then their afterglow slowly fades away. The shower belongs to the
   page background, never to the cursor: the pointer flourish in
   site-pointer-fx.js is a separate and much quieter effect.

   Like site-floating-dots.js, the layer is a direct child of the TOP-LEVEL
   document's body. Embedded game documents create no layer of their own, so
   there is exactly one shower on screen and switching from the lobby into a
   game never restarts the schedule. A sessionStorage "next due" timestamp
   keeps whole-page navigations from firing a fresh shower after every reload.
   While a game is actually being played the shower pauses (the arena owns the
   viewport) and resumes with a fresh wait when the player leaves it. */
(function () {
  'use strict';

  var doc = document, win = window;
  var reduced = win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var embedded = win.top !== win;
  if (reduced || embedded) return;

  var VERSION = '20261109-fxgame1';
  var KEY = 'joyflock.meteor.next';
  /* A quiet, occasional shower: calmer first appearance, then one every
     18-36s. Hovering a control can bring one forward, but never more than
     once per 20s, so sweeping the nav cannot turn into a permanent storm. */
  var FIRST_MIN = 7, FIRST_MAX = 15;
  var GAP_MIN = 18, GAP_MAX = 36;
  var BOOT_QUIET = 2500;
  var HOVER_COOLDOWN = 20000;
  var SHOWER_MIN = 3, SHOWER_MAX = 5;
  var STAGGER_MIN = 130, STAGGER_MAX = 300;
  var MAX_LIVE = 8;
  var HOT = 'a,button,select,summary,[role="button"],[data-control],.game-card,.rail-game';

  var style = doc.createElement('style');
  style.setAttribute('data-joyflock', 'meteor');
  style.textContent = [
    '.joymeteor-layer{position:fixed;inset:0;z-index:21474805;overflow:hidden;pointer-events:none}',
    /* rotate(-angle) points the element's +x end up-right, so its LEFT end
       is the down-left leading tip. Put the bright head there and let the
       tail stream back up-right, opposite the down-left flight path. */
    '.joymeteor{position:absolute;top:0;left:0;width:var(--tail);height:2px;',
    'border-radius:999px;transform-origin:0% 50%;pointer-events:none;',
    'background:linear-gradient(90deg,rgba(255,255,255,.9) 0%,rgba(205,225,255,.4) 28%,',
    'rgba(170,200,255,.08) 72%,rgba(180,205,255,0) 100%);',
    'box-shadow:0 0 9px 1px rgba(170,200,255,.28);will-change:transform,opacity;',
    'animation:joymeteor-fly var(--dur) linear forwards}',
    '.joymeteor::after{content:"";position:absolute;left:-2px;top:50%;width:5px;height:5px;',
    'transform:translateY(-50%);border-radius:50%;background:#fff;',
    'box-shadow:0 0 8px 2px rgba(215,232,255,.75),0 0 18px 6px rgba(130,170,255,.32)}',
    '@keyframes joymeteor-fly{',
    /* 0-38% is the streak, 38-100% is the slow afterglow. */
    '0%{transform:translate3d(var(--x0),var(--y0),0) rotate(var(--angle)) scaleX(.5);opacity:0}',
    '6%{opacity:var(--peak)}',
    '12%{transform:translate3d(var(--x1),var(--y1),0) rotate(var(--angle)) scaleX(.8);opacity:var(--peak)}',
    '38%{transform:translate3d(var(--x2),var(--y2),0) rotate(var(--angle)) scaleX(1);opacity:var(--peak)}',
    '100%{transform:translate3d(var(--x3),var(--y3),0) rotate(var(--angle)) scaleX(.28);opacity:0}}'
  ].join('');
  (doc.head || doc.documentElement).appendChild(style);

  var layer = doc.createElement('div');
  layer.className = 'joymeteor-layer';
  layer.setAttribute('aria-hidden', 'true');
  (doc.body || doc.documentElement).appendChild(layer);

  function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
  function readDue() {
    try { return +(sessionStorage.getItem(KEY) || 0); } catch (e) { return 0; }
  }
  function writeDue(t) {
    try { sessionStorage.setItem(KEY, String(t)); } catch (e) {}
  }
  function px(v) { return v.toFixed(1) + 'px'; }

  var timer = 0, nextAt = 0, bootAt = Date.now();
  var showers = 0, fired = 0, skipped = 0, lastAt = 0, lastReason = '';
  /* A game in progress owns the viewport: no meteors over the table / board.
     Suspending clears the pending timer and every live streak, and resuming
     starts a fresh quiet wait instead of "catching up" the time in-game. */
  var suspended = false, stagger = [];
  function clearStagger() {
    for (var i = 0; i < stagger.length; i++) win.clearTimeout(stagger[i]);
    stagger = [];
  }
  function inGame() {
    var b = doc.body;
    if (!b) return false;
    if (b.hasAttribute('data-screen')) return b.dataset.screen === 'play';
    if (doc.getElementById('game-frame')) return false;   // portal: iframe reports
    var stage = doc.getElementById('play');
    return !!stage && !stage.hidden && !stage.classList.contains('hidden');
  }
  function setSuspended(on) {
    on = !!on;
    if (on === suspended) return;
    suspended = on;
    if (on) {
      win.clearTimeout(timer); timer = 0;
      clearStagger();
      while (layer.firstChild) layer.removeChild(layer.firstChild);
      layer.style.display = 'none';
    } else {
      layer.style.display = '';
      lastAt = Date.now();                 // no hover shower right after a game
      schedule(false);
    }
  }
  function syncLocal() {
    if (!doc.getElementById('game-frame')) setSuspended(inGame());
  }

  /* One member of a shower. The seed keeps the whole group on a similar
     heading, while every meteor gets its own offset so the group reads as a
     small shower instead of five identical copies. The end point is aimed at
     the middle band (44%-68% of the viewport height), so the streak crosses
     the centre of the background rather than the header or the bottom edge. */
  function spawnOne(seed) {
    if (suspended) return null;
    if (layer.childElementCount >= MAX_LIVE) return null;
    if (doc.hidden) { skipped++; return null; }

    var w = win.innerWidth, h = win.innerHeight;
    var deg = seed.deg + rand(-2.5, 2.5);
    var rad = deg * Math.PI / 180;
    var y0 = Math.max(0, (seed.y0 + rand(-.03, .12)) * h);
    var wantedY = rand(.44, .68) * h;
    var dist = Math.min((wantedY - y0) / Math.tan(rad), .62 * w);
    if (dist < 60) dist = 60;
    var dy = dist * Math.tan(rad);
    var x0 = Math.min(1.06 * w, (seed.x0 + rand(-.09, .09)) * w);
    var x1 = x0 - dist * .08, y1 = y0 + dy * .08;
    var x2 = x0 - dist, y2 = y0 + dy;
    var x3 = x2 - dist * .06, y3 = y2 + dy * .06;

    var el = doc.createElement('i');
    el.className = 'joymeteor';
    el.style.setProperty('--x0', px(x0)); el.style.setProperty('--y0', px(y0));
    el.style.setProperty('--x1', px(x1)); el.style.setProperty('--y1', px(y1));
    el.style.setProperty('--x2', px(x2)); el.style.setProperty('--y2', px(y2));
    el.style.setProperty('--x3', px(x3)); el.style.setProperty('--y3', px(y3));
    el.style.setProperty('--angle', '-' + deg.toFixed(2) + 'deg');
    el.style.setProperty('--tail', rand(100, 175).toFixed(0) + 'px');
    el.style.setProperty('--peak', rand(.52, .72).toFixed(2));
    el.style.setProperty('--dur', rand(2.6, 3.4).toFixed(2) + 's');
    el.addEventListener('animationend', function (e) {
      if (e.animationName === 'joymeteor-fly' && el.parentNode) el.parentNode.removeChild(el);
    });
    layer.appendChild(el);
    fired++;
    return el;
  }

  function shower(reason) {
    if (suspended) return false;
    if (doc.hidden) { skipped++; return false; }
    if (layer.childElementCount) return false;          // never stack showers
    var n = SHOWER_MIN + Math.floor(Math.random() * (SHOWER_MAX - SHOWER_MIN + 1));
    var seed = { deg: rand(20, 29), x0: rand(.66, .96), y0: rand(.06, .20) };
    var at = 0;
    for (var i = 0; i < n; i++) {
      (function (delay) {
        var id = win.setTimeout(function () {
          var pos = stagger.indexOf(id);
          if (pos >= 0) stagger.splice(pos, 1);
          spawnOne(seed);
        }, delay);
        stagger.push(id);
      })(at);
      at += rand(STAGGER_MIN, STAGGER_MAX);
    }
    lastAt = Date.now(); lastReason = reason; showers++;
    return true;
  }

  function schedule(first) {
    if (suspended) return;
    var delay;
    if (first) {
      /* Resume a pending wait left by the previous document, but ignore
         stale / absurd timestamps (e.g. a tab reopened much later). */
      var due = readDue(), left = (due - Date.now()) / 1000;
      delay = (left > 0 && left < 60) ? left : rand(FIRST_MIN, FIRST_MAX);
    } else {
      delay = rand(GAP_MIN, GAP_MAX);
    }
    nextAt = Date.now() + delay * 1000;
    writeDue(nextAt);
    timer = win.setTimeout(function () {
      timer = 0;
      if (suspended) return;
      shower('timer');
      schedule(false);
    }, delay * 1000);
  }

  /* Hovering a link / button / card can bring a shower forward. Only the
     transition from a non-control into a control counts, so sliding across a
     wide card does not re-trigger on every child element. */
  function hoverShower() {
    if (suspended) return;
    var now = Date.now();
    if (now - bootAt < BOOT_QUIET) return;
    if (now - lastAt < HOVER_COOLDOWN) return;
    if (layer.childElementCount) return;
    if (!shower('hover')) return;
    win.clearTimeout(timer); timer = 0;
    schedule(false);                                   // re-arm from this shower
  }

  doc.addEventListener('pointerover', function (e) {
    if (e.pointerType === 'touch') return;
    var t = e.target;
    if (!t || !t.closest) return;
    var hot = t.closest(HOT);
    if (!hot) return;
    var from = e.relatedTarget;
    if (from && from.closest && from.closest(HOT) === hot) return;
    hoverShower();
  }, { passive: true });

  /* Game pages live in an iframe: their hover transitions arrive through the
     pointer relay, so a button in the embedded page can start a shower too.
     The same relay reports when the embedded document enters / leaves a game. */
  var relayHot = false;
  win.addEventListener('message', function (ev) {
    if (ev.origin !== location.origin) return;
    var d = ev.data;
    if (!d) return;
    var frame = doc.getElementById('game-frame');
    if (!frame || ev.source !== frame.contentWindow) return;
    if (d.type === 'joyflock:game-screen') { setSuspended(d.active); return; }
    if (d.type !== 'joyflock:pointer' || d.kind !== 'move') return;
    if (typeof d.screen === 'boolean') setSuspended(d.screen);
    if (suspended) return;
    if (d.hot && !relayHot) hoverShower();
    relayHot = !!d.hot;
  }, { passive: true });

  /* A tab that was hidden should not burn through its wait and fire the
     instant it comes back. Re-arm on visibility changes. */
  doc.addEventListener('visibilitychange', function () {
    if (suspended) return;
    if (doc.hidden) { win.clearTimeout(timer); timer = 0; }
    else if (!timer) schedule(false);
  });

  /* Standalone game pages (opened directly, no portal frame) watch their own
     screen. A portal takes its state from the iframe's messages instead. */
  if (win.MutationObserver && doc.body) {
    var localWatch = new MutationObserver(syncLocal);
    localWatch.observe(doc.body, { attributes: true, attributeFilter: ['data-screen'] });
    var localStage = doc.getElementById('play');
    if (localStage) localWatch.observe(localStage, { attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
  }
  syncLocal();
  schedule(true);

  win.__joyflockMeteor = {
    version: VERSION,
    embedded: embedded,
    reduced: reduced,
    layer: layer,
    config: { first: [FIRST_MIN, FIRST_MAX], gap: [GAP_MIN, GAP_MAX],
      perShower: [SHOWER_MIN, SHOWER_MAX], hoverCooldown: HOVER_COOLDOWN },
    trigger: shower,                 // manual fire, for verification only
    cancel: function () { win.clearTimeout(timer); timer = 0; },
    suspend: setSuspended,           // pause/resume, for verification only
    state: function () {
      var els = [].slice.call(layer.children);
      return {
        version: VERSION, suspended: suspended, showers: showers, fired: fired, skipped: skipped,
        lastAt: lastAt, lastReason: lastReason, nextAt: nextAt,
        waitS: Math.round((nextAt - Date.now()) / 100) / 10,
        live: els.length,
        members: els.map(function (el) {
          return {
            peak: el.style.getPropertyValue('--peak'),
            tail: el.style.getPropertyValue('--tail'),
            x0: el.style.getPropertyValue('--x0'), y0: el.style.getPropertyValue('--y0'),
            x2: el.style.getPropertyValue('--x2'), y2: el.style.getPropertyValue('--y2'),
            opacity: +getComputedStyle(el).opacity,
            anims: el.getAnimations().map(function (a) {
              return { name: a.animationName, dur: a.effect.getTiming().duration,
                time: Math.round(a.currentTime || 0) };
            })
          };
        })
      };
    }
  };
})();
