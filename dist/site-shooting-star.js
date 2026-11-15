/* JoyFlock meteor shower.
   Every now and then a small shower of soft meteors streaks across the MIDDLE
   of the backdrop, then their afterglow slowly fades away. Those showers are
   TIMED and RANDOM: pointer movement can never bring one forward, so sweeping
   the nav or the game grid does not turn into a storm. The shower belongs to
   the page background, never to the cursor: the pointer flourish in
   site-pointer-fx.js is a separate and much quieter effect.

   The ONE exception is the top-left JoyFlock mark. Hovering that brand holds
   a continuous meteor shower for as long as the pointer stays on it. New
   meteors are emitted one by one at a steady rate, capped so the streak never
   becomes a solid wall of light. Leaving the mark stops new emissions;
   meteors already in flight finish their own animation.

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

  var VERSION = '20261110-brandonly1';
  var KEY = 'joyflock.meteor.next';
  /* A quiet, occasional shower: calmer first appearance, then one every
     18-36s. These are the ONLY showers apart from the brand hold below; a
     hover on any other element is deliberately inert. */
  var FIRST_MIN = 7, FIRST_MAX = 15;
  var GAP_MIN = 18, GAP_MAX = 36;
  var SHOWER_MIN = 3, SHOWER_MAX = 5;
  var STAGGER_MIN = 130, STAGGER_MAX = 300;
  var MAX_LIVE = 8;
  /* Continuous "hold" mode: ONLY the top-left brand. Game covers, nav links,
     buttons and the embedded game's pointer relay must never start a shower;
     anything the user sees elsewhere comes from the timed schedule alone. */
  var HOLD_HOT = '.topbar .brand';
  var HOLD_FIRST = 40;                  // ms before the first held meteor
  var HOLD_RATE_MIN = 200, HOLD_RATE_MAX = 360;   // ms between held meteors
  var HOLD_MAX_LIVE = 10;               // concurrent streaks while holding
  var HOLD_SEED_SPAN = 7;               // refresh the heading every N meteors

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

  var timer = 0, nextAt = 0;
  var showers = 0, fired = 0, skipped = 0, lastAt = 0, lastReason = '';
  /* A game in progress owns the viewport: no meteors over the table / board.
     Suspending clears the pending timer and every live streak, and resuming
     starts a fresh quiet wait instead of "catching up" the time in-game. */
  var suspended = false, stagger = [];
  /* `held` is the icon currently under the pointer, or null when the
     continuous stream is off. Its own timer is separate from the ordinary
     schedule, so a long hold never stacks up one-off showers. */
  var held = null, holdTimer = 0, holdFired = 0, holdSeed = null, holdSeedCount = 0;
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
      stopHold();
      win.clearTimeout(timer); timer = 0;
      clearStagger();
      while (layer.firstChild) layer.removeChild(layer.firstChild);
      layer.style.display = 'none';
    } else {
      layer.style.display = '';
      lastAt = Date.now();                 // fresh quiet wait after a game
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
  function spawnOne(seed, cap) {
    if (suspended) return null;
    if (layer.childElementCount >= (cap || MAX_LIVE)) return null;
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

  /* Continuous shower while an icon is hovered. Each meteor is its own
     spawnOne() call (not a stacked 3-5 member shower), so the stream has no
     hard beginning or end. A shared heading seed keeps a handful of meteors
     on one diagonal, then rotates to a fresh angle for the next handful. */
  function nextHoldSeed() {
    if (!holdSeed || holdSeedCount >= HOLD_SEED_SPAN) {
      holdSeed = { deg: rand(20, 29), x0: rand(.66, .96), y0: rand(.06, .20) };
      holdSeedCount = 0;
    }
    holdSeedCount++;
    return holdSeed;
  }
  function holdTick() {
    if (!held || suspended) return;
    if (doc.hidden) {                       // paused tab: wait, do not spawn
      holdTimer = win.setTimeout(holdTick, 500);
      return;
    }
    if (spawnOne(nextHoldSeed(), HOLD_MAX_LIVE)) holdFired++;
    holdTimer = win.setTimeout(holdTick, rand(HOLD_RATE_MIN, HOLD_RATE_MAX));
  }
  function startHold(icon) {
    if (suspended || doc.hidden) return;
    held = icon || true;
    holdFired = 0; holdSeed = null; holdSeedCount = 0;
    lastAt = Date.now();
    win.clearTimeout(timer); timer = 0;     // ordinary one-off showers wait
    win.clearTimeout(holdTimer);
    holdTimer = win.setTimeout(holdTick, HOLD_FIRST);
  }
  function stopHold() {
    if (!held) return;
    held = null;
    win.clearTimeout(holdTimer); holdTimer = 0;
    lastAt = Date.now();                    // leaving the brand emits nothing
    schedule(false);                        // re-arm the quiet background wait
  }

  function schedule(first) {
    if (suspended) return;
    win.clearTimeout(timer); timer = 0;      // never leave two pending waits
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

  /* ONLY the top-left brand starts a shower on hover. Everything else —
     game cover, nav link, button, select, in-game control — is deliberately
     inert, so the meteors seen anywhere else are always the timed random
     showers from schedule(). */
  doc.addEventListener('pointerover', function (e) {
    if (e.pointerType === 'touch') return;
    var t = e.target;
    if (!t || !t.closest) return;
    var brand = t.closest(HOLD_HOT);
    if (brand) {
      /* Moving between descendants of the mark (e.g. the ✦ glyph) keeps the
         stream running instead of restarting it. */
      if (!held) startHold(brand); else held = brand;
    } else if (held) {
      stopHold();
    }
  }, { passive: true });

  /* pointerover alone cannot report the pointer leaving the document (or
     entering an iframe), so pointerout / blur close the hold as well. */
  doc.addEventListener('pointerout', function (e) {
    if (!held) return;
    var to = e.relatedTarget;
    if (to && to.closest && to.closest(HOLD_HOT)) return;   // still on the brand
    stopHold();
  }, { passive: true });
  win.addEventListener('blur', function () { if (held) stopHold(); });

  /* Game pages live in an iframe: the pointer relay is used ONLY to learn
     whether the embedded document entered / left a game. A hover inside the
     iframe never triggers a shower (d.hot is intentionally ignored). */
  win.addEventListener('message', function (ev) {
    if (ev.origin !== location.origin) return;
    var d = ev.data;
    if (!d) return;
    var frame = doc.getElementById('game-frame');
    if (!frame || ev.source !== frame.contentWindow) return;
    if (d.type === 'joyflock:game-screen') { setSuspended(d.active); return; }
    if (d.type !== 'joyflock:pointer' || d.kind !== 'move') return;
    if (typeof d.screen === 'boolean') setSuspended(d.screen);
  }, { passive: true });

  /* A tab that was hidden should not burn through its wait and fire the
     instant it comes back. Re-arm on visibility changes. */
  doc.addEventListener('visibilitychange', function () {
    if (suspended) return;
    if (doc.hidden) {
      if (held) stopHold();                 // a hidden tab cannot hover
      win.clearTimeout(timer); timer = 0;
    } else if (!timer && !held) schedule(false);
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
      perShower: [SHOWER_MIN, SHOWER_MAX],
      hold: { selector: HOLD_HOT, rate: [HOLD_RATE_MIN, HOLD_RATE_MAX],
        maxLive: HOLD_MAX_LIVE, seedSpan: HOLD_SEED_SPAN } },
    trigger: shower,                 // manual fire, for verification only
    cancel: function () { win.clearTimeout(timer); timer = 0; },
    hold: function (on) {            // start/stop the hover stream, for verification only
      if (on === false) stopHold(); else startHold(on && on.closest ? on : true);
    },
    suspend: setSuspended,           // pause/resume, for verification only
    state: function () {
      var els = [].slice.call(layer.children);
      return {
        version: VERSION, suspended: suspended, showers: showers, fired: fired, skipped: skipped,
        held: !!held, holdFired: holdFired,
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
