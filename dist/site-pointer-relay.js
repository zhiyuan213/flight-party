/* Pointer relay for embedded game pages.
   The portal owns a single decorative pointer layer (site-pointer-fx.js) that
   covers the whole viewport. Pointer events inside an iframe never bubble to
   the parent document, so without this relay the halo freezes at the frame
   edge. Only our own same-origin frames are targeted; the parent validates
   the source frame and origin before using the coordinates.

   The same channel reports whether the embedded document is actually IN a
   game. The portal's halo and meteor shower belong to the surrounding site,
   so they must be suspended while the arena fills the viewport. */
(function () {
  'use strict';

  var parent = window.parent, embedded = parent !== window;
  var HOT = 'a,button,select,summary,[role="button"],[data-control],.game-card,.rail-game';

  /* data-screen is set by table.js on every screen change. Flight Party now
     publishes its own screen name on the body; results counts as in-match too,
     so the portal's halo does not reappear over the victory board. */
  function inGame() {
    var b = document.body;
    if (!b) return false;
    if (b.dataset.flightScreen) return b.dataset.flightScreen==='play'||b.dataset.flightScreen==='results';
    if (b.hasAttribute('data-screen')) return b.dataset.screen === 'play';
    var stage = document.getElementById('play');
    return !!stage && !stage.hidden && !stage.classList.contains('hidden');
  }
  function report(active) {
    if (!embedded) return;
    try {
      parent.postMessage({ type: 'joyflock:game-screen',
        active: active === undefined ? inGame() : !!active }, '*');
    } catch (e) {}
  }
  if (embedded) {
    report();
    if (window.MutationObserver && document.body) {
      var watcher = new MutationObserver(function () { report(); });
      watcher.observe(document.body, { attributes: true, attributeFilter: ['data-screen','data-flight-screen'] });
      var stage = document.getElementById('play');
      if (stage) watcher.observe(stage, { attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
    }
    /* A frame that navigates away (switch game / back to lobby) must not leave
       the parent suspended. The next document reports its own state on load. */
    window.addEventListener('pagehide', function () { report(false); }, { passive: true });
  }

  if (!embedded) return;
  if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;

  var pending = null, raf = 0;

  function flush() {
    raf = 0;
    if (!pending) return;
    try { window.parent.postMessage(pending, '*'); } catch (e) {}
    pending = null;
  }
  function send(kind, e, hot) {
    if (e.pointerType === 'touch') return;
    /* screen is a backup for the explicit game-screen message: any pointer
       movement re-syncs the parent even if a state message was missed. */
    pending = { type: 'joyflock:pointer', kind: kind, x: e.clientX, y: e.clientY,
      hot: !!hot, screen: inGame() };
    if (!raf) raf = requestAnimationFrame(flush);   // one message per frame
  }

  window.addEventListener('pointermove', function (e) {
    send('move', e, !!(e.target && e.target.closest && e.target.closest(HOT)));
  }, { passive: true });
  window.addEventListener('pointerdown', function (e) { send('down', e, false); }, { passive: true });
  window.addEventListener('pointerleave', function (e) { send('leave', e, false); }, { passive: true });
})();
