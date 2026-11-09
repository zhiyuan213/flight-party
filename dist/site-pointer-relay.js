/* Pointer relay for embedded game pages.
   The portal owns a single decorative pointer layer (site-pointer-fx.js) that
   covers the whole viewport. Pointer events inside an iframe never bubble to
   the parent document, so without this relay the halo freezes at the frame
   edge. Only our own same-origin frames are targeted; the parent validates
   the source frame and origin before using the coordinates. */
(function () {
  'use strict';
  if (window.parent === window) return;
  if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;

  var HOT = 'a,button,select,summary,[role="button"],[data-control],.game-card,.rail-game';
  var pending = null, raf = 0;

  function flush() {
    raf = 0;
    if (!pending) return;
    try { window.parent.postMessage(pending, '*'); } catch (e) {}
    pending = null;
  }
  function send(kind, e, hot) {
    if (e.pointerType === 'touch') return;
    pending = { type: 'joyflock:pointer', kind: kind, x: e.clientX, y: e.clientY, hot: !!hot };
    if (!raf) raf = requestAnimationFrame(flush);   // one message per frame
  }

  window.addEventListener('pointermove', function (e) {
    send('move', e, !!(e.target && e.target.closest && e.target.closest(HOT)));
  }, { passive: true });
  window.addEventListener('pointerdown', function (e) { send('down', e, false); }, { passive: true });
  window.addEventListener('pointerleave', function (e) { send('leave', e, false); }, { passive: true });
})();
