/* JoyFlock floating motes.
   Ten dim pinpoints rise in a straight line from the bottom edge, slowly
   fading in and out on the way. When one leaves the top it is recycled with
   a fresh random x / size / brightness, so the count stays at ten.

   The layer is a direct child of the top-level document's body, outside
   #home / #play, and above the game iframe. Switching from the lobby to a
   game therefore never removes, hides or restarts a mote: they keep their
   exact animation progress. A sessionStorage snapshot also carries the same
   motes across a reload of the same tab. Embedded game documents deliberately
   create no layer of their own (the parent's fixed layer covers them), but
   they do switch off their old static CSS star field. */
(function () {
  'use strict';

  var doc = document, win = window;
  var reduced = win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;                       // keep the original still star field
  var embedded = win.top !== win;

  var style = doc.createElement('style');
  style.setAttribute('data-joyflock', 'motes');
  style.textContent = [
    /* The old pinpoints were painted into body::after. Retire that layer on
       every document so there is exactly one set of ten motes on screen. */
    'body::after{display:none!important}',
    '.joymote-layer{position:fixed;inset:0;z-index:21474810;overflow:hidden;pointer-events:none}',
    '.joymote{position:absolute;top:0;left:0;border-radius:50%;pointer-events:none;',
    'background:radial-gradient(circle at 50% 50%,#ffffff 0%,#c9d8ff 46%,rgba(150,180,255,0) 76%);',
    'box-shadow:0 0 8px 1.5px rgba(160,190,255,.34);will-change:transform,opacity;',
    'animation:joymote-rise var(--dur) linear var(--delay) infinite}',
    '@keyframes joymote-rise{',
    '0%{transform:translate3d(0,108vh,0);opacity:0}',
    '12%{opacity:calc(var(--a) * .70)}',
    '27%{opacity:var(--a)}',
    '45%{opacity:calc(var(--a) * .30)}',
    '63%{opacity:calc(var(--a) * .90)}',
    '80%{opacity:calc(var(--a) * .40)}',
    '93%{opacity:calc(var(--a) * .18)}',
    '100%{transform:translate3d(0,-12vh,0);opacity:0}}'
  ].join('');
  (doc.head || doc.documentElement).appendChild(style);

  if (embedded) return;                      // parent layer already spans the iframe

  var COUNT = 10, KEY = 'joyflock.motes.v1.' + location.pathname;
  var recycled = 0;

  function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
  function fresh() {
    /* Half speed: one trip now takes 54-108s instead of 27-54s. Keeping the
       range a 1:2 spread preserves the same staggered, non-synchronised look;
       the opacity keyframes are percentage-based so their twinkle slows by
       the same 50% automatically. */
    var dur = rand(54, 108);
    return {p: rand(.03, .97), size: rand(2, 4), a: rand(.38, .78),
      dur: dur, delay: -rand(0, dur)};
  }

  /* Restore the very same motes (and how far they had travelled) after a
     reload. CSS animations restart at page load, so a negative delay is
     used to put each mote back at its previous point on the path. */
  function restore() {
    try {
      var raw = sessionStorage.getItem(KEY);
      if (!raw) return null;
      var saved = JSON.parse(raw);
      if (!saved || !Array.isArray(saved.pts) || saved.pts.length !== COUNT) return null;
      var elapsed = Math.max(0, (Date.now() - saved.t) / 1000);
      if (elapsed > 3600) return null;
      return saved.pts.map(function (p) {
        /* Snapshots written by v1 carry a 27-54s duration. Migrate them to
           the new half-speed duration and keep the SAME relative progress,
           so reloading after the change does not teleport any mote. */
        var oldDur = p.dur > 0 ? p.dur : 54;
        var dur = oldDur < 54 ? oldDur * 2 : oldDur;
        var progress = ((-p.delay + elapsed) % oldDur + oldDur) % oldDur;
        if (dur !== oldDur) progress = progress / oldDur * dur;
        return {p: p.p, size: p.size, a: p.a, dur: dur, delay: -progress};
      });
    } catch (e) { return null; }
  }

  var layer = doc.createElement('div');
  layer.className = 'joymote-layer';
  layer.setAttribute('aria-hidden', 'true');
  var names = (restore() || []);
  var motes = [];

  function paint(el, m) {
    el.style.setProperty('--dur', m.dur.toFixed(2) + 's');
    el.style.setProperty('--delay', m.delay.toFixed(2) + 's');
    el.style.setProperty('--a', m.a.toFixed(3));
    el.style.width = el.style.height = m.size.toFixed(2) + 'px';
    el.style.left = (m.p * win.innerWidth).toFixed(1) + 'px';
  }
  function respawn(m) {
    m.p = rand(.03, .97);
    m.size = rand(2, 4);
    m.a = rand(.38, .78);
  }

  for (var i = 0; i < COUNT; i++) {
    var m = names[i] || fresh();
    var el = doc.createElement('i');
    el.className = 'joymote';
    el.dataset.index = String(i);
    paint(el, m);
    (function (node, state) {
      node.addEventListener('animationiteration', function () {
        /* Only x / size / brightness change here. Touching duration or delay
           would restart the animation and make the mote jump mid-flight. */
        respawn(state);
        node.style.left = (state.p * win.innerWidth).toFixed(1) + 'px';
        node.style.width = node.style.height = state.size.toFixed(2) + 'px';
        node.style.setProperty('--a', state.a.toFixed(3));
        recycled++;
      });
    })(el, m);
    layer.appendChild(el);
    motes.push({el: el, m: m});
  }
  (doc.body || doc.documentElement).appendChild(layer);

  /* A CSS animation's currentTime does not include its (negative) delay:
     the effect's real progress is currentTime - delay. Forgetting this term
     would push every mote back to the bottom edge after a navigation. */
  function progressOf(o) {
    var anim = o.el.getAnimations()[0];
    var seconds = anim ? (anim.currentTime || 0) / 1000 - o.m.delay : -o.m.delay;
    return ((seconds % o.m.dur) + o.m.dur) % o.m.dur;
  }

  function save() {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({t: Date.now(),
        pts: motes.map(function (o) {
          return {p: o.m.p, size: o.m.size, a: o.m.a, dur: o.m.dur,
            delay: -progressOf(o)};
        })}));
    } catch (e) {}
  }
  win.addEventListener('pagehide', save);
  doc.addEventListener('visibilitychange', function () { if (doc.hidden) save(); });
  win.setInterval(save, 8000);

  /* Keeping the horizontal position proportional means a window resize does
     not bunch all ten motes into one corner or push them off screen. */
  win.addEventListener('resize', function () {
    motes.forEach(function (o) { o.el.style.left = (o.m.p * win.innerWidth).toFixed(1) + 'px'; });
  }, {passive: true});

  win.__joyflockMotes = {
    version: '20261109-motes2',
    count: COUNT,
    embedded: embedded,
    layer: layer,
    recycled: function () { return recycled; },
    state: function () {
      return motes.map(function (o) {
        var box = o.el.getBoundingClientRect();
        return {index: +o.el.dataset.index, x: Math.round(box.left * 10) / 10,
          y: Math.round(box.top * 10) / 10, alpha: +getComputedStyle(o.el).opacity,
          dur: o.m.dur, delay: o.m.delay,
          progress: Math.round(progressOf(o) * 100) / 100};
      });
    },
    save: save
  };
})();
