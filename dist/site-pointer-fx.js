/* JoyFlock pointer flourish.
   A glowing halo tracks the cursor, starlight sprinkles along the path,
   a ripple blooms on click, and the header wordmark tilts toward the
   pointer. No ring/dot cursor is drawn: the halo alone marks the pointer. Purely decorative: the whole layer is
   fixed + pointer-events:none, so it can never change layout, shift the
   header or swallow a click. */
(function () {
  'use strict';

  if (window.top !== window.self) return;              // games live in iframes
  if (!window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var doc = document;
  var css = [
    '.joyfx-layer{position:fixed;inset:0;z-index:21474820;overflow:hidden;',
      'pointer-events:none;mix-blend-mode:screen}',
    '.joyfx-glow{position:absolute;left:0;top:0;width:280px;height:280px;',
      'border-radius:50%;opacity:0;will-change:transform;',
      'background:radial-gradient(circle,hsla(var(--h),100%,80%,.3) 0%,',
      'hsla(var(--h),100%,68%,.12) 38%,hsla(var(--h),100%,60%,0) 70%);',
      'transition:opacity .45s ease}',
    '.joyfx-star{position:absolute;left:0;top:0;display:block;',
      'background:hsl(var(--h),100%,76%);',
      'clip-path:polygon(50% 0%,58% 38%,100% 50%,58% 62%,50% 100%,',
      '42% 62%,0% 50%,42% 38%);',
      'filter:drop-shadow(0 0 8px hsla(var(--h),100%,74%,.95));',
      'animation:joyfx-star 900ms cubic-bezier(.2,.7,.3,1) forwards}',
    '.joyfx-ring{position:absolute;width:28px;height:28px;border-radius:50%;',
      'border:2px solid hsl(var(--h),100%,86%);',
      'box-shadow:0 0 20px hsla(var(--h),100%,74%,.85);',
      'animation:joyfx-ring 640ms cubic-bezier(.15,.7,.3,1) forwards}',
    '@keyframes joyfx-star{',
      '0%{opacity:.95;transform:translate3d(0,0,0) rotate(0) scale(.8)}',
      '30%{opacity:1}',
      '100%{opacity:0;transform:translate3d(var(--dx),var(--dy),0) rotate(145deg) scale(.2)}}',
    '@keyframes joyfx-ring{',
      'from{opacity:.9;transform:translate(-50%,-50%) scale(.5)}',
      'to{opacity:0;transform:translate(-50%,-50%) scale(4.8)}}',
    /* Idle "breathing": only added while the pointer is completely still.
       The halo starts at its normal brightness (0% = opacity 1), dims
       slowly, then swells back. */
    '@keyframes joyfx-breath{0%,100%{opacity:1}50%{opacity:.42}}',
    '.joyfx-glow.is-breathing{animation:joyfx-breath 3.2s ease-in-out infinite;transition:none}'
  ].join('');

  var style = doc.createElement('style');
  style.textContent = css;
  doc.head.appendChild(style);

  var layer = doc.createElement('div');
  layer.className = 'joyfx-layer';
  layer.setAttribute('aria-hidden', 'true');
  var glow = doc.createElement('i');
  glow.className = 'joyfx-glow';
  layer.appendChild(glow);
  doc.body.appendChild(layer);

  var brand = doc.querySelector('body>.topbar .brand');
  var mark = brand && brand.querySelector('.brand-mark');
  var brandRect = null;
  function measureBrand() { brandRect = brand ? brand.getBoundingClientRect() : null; }
  measureBrand();
  window.addEventListener('resize', measureBrand, { passive: true });

  var tx = innerWidth / 2, ty = innerHeight / 2, cx = tx, cy = ty;
  var lastX = tx, lastY = ty, speed = 0, trail = 0, raf = 0, hue = 258;
  /* Halo + a handful of live particles. The background meteor shower is a
     separate effect (site-shooting-star.js) anchored to the middle of the
     page; along the cursor we only want a quiet sprinkle, not a second
     "meteor shower" that follows the mouse. */
  var MAX_NODES = 10;
  /* The breathing is driven by a CSS animation plus one short idle timer, not
     a permanent rAF loop: a pointer at rest should cost (almost) nothing. */
  var IDLE_DELAY = 220, idleTimer = 0, breathing = false, visible = false;
  glow.style.transform = 'translate3d(' + (tx - 140) + 'px,' + (ty - 140) + 'px,0)';

  function star(x, y, h, opts) {
    if (layer.childElementCount >= MAX_NODES) return;
    var size = 5 + Math.random() * 6;
    var dx = opts ? opts.dx : (Math.random() - .5) * 26;
    var dy = opts ? opts.dy : -18 - Math.random() * 22;
    var jitter = opts ? 2 : 11;
    var s = doc.createElement('i');
    s.className = 'joyfx-star';
    s.style.cssText = 'left:' + (x + (Math.random() - .5) * jitter * 2).toFixed(1) + 'px;' +
      'top:' + (y + (Math.random() - .5) * jitter * 2).toFixed(1) + 'px;' +
      'width:' + size.toFixed(1) + 'px;height:' + size.toFixed(1) + 'px;' +
      '--h:' + (h + (Math.random() - .5) * 44).toFixed(0) + ';' +
      '--dx:' + dx.toFixed(1) + 'px;--dy:' + dy.toFixed(1) + 'px;' +
      'animation-duration:' + (700 + Math.random() * 430).toFixed(0) + 'ms';
    s.addEventListener('animationend', function () { s.remove(); }, { once: true });
    layer.appendChild(s);
  }

  function tick() {
    var dx = tx - cx, dy = ty - cy;
    cx += dx * .17;
    cy += dy * .17;
    glow.style.transform = 'translate3d(' + (cx - 140).toFixed(1) + 'px,' +
      (cy - 140).toFixed(1) + 'px,0) scale(' + (1 + speed * .2).toFixed(3) + ')';
    speed *= .93;
    if (Math.abs(dx) + Math.abs(dy) > .5 || speed > .02) {
      raf = requestAnimationFrame(tick);
    } else {
      cx = tx; cy = ty; raf = 0;
    }
  }

  function stopBreath() {
    if (!breathing) return;
    breathing = false;
    // Freeze the animation's current value inline, then let the normal opacity
    // transition glide back to full brightness on the next frame. Just removing
    // the class can snap from the dimmed value straight to 1.
    var g = getComputedStyle(glow).opacity;
    glow.classList.remove('is-breathing');
    glow.style.opacity = g;
    requestAnimationFrame(function () {
      if (breathing || !visible) return;
      glow.style.opacity = '1';
    });
  }
  function startBreath() {
    idleTimer = 0;
    if (!visible || doc.hidden) return;
    // The halo fades in over .45s on its very first appearance. Wait for that
    // fade, otherwise the first cycle would jump from a half-faded value to 1
    // instead of starting from the brightness the pointer actually had.
    if (parseFloat(getComputedStyle(glow).opacity) < .98) {
      idleTimer = setTimeout(startBreath, 120);
      return;
    }
    breathing = true;
    glow.classList.add('is-breathing');
  }
  function scheduleBreath() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(startBreath, IDLE_DELAY);
  }
  function cancelBreath() {
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = 0; }
    stopBreath();
  }

  function tilt(x, y) {
    if (!brand || !brandRect) return;
    var dx = (x - (brandRect.left + brandRect.width / 2)) / Math.max(90, brandRect.width * .8);
    var dy = (y - (brandRect.top + brandRect.height / 2)) / Math.max(30, brandRect.height);
    var near = Math.abs(dx) < 1.9 && Math.abs(dy) < 2.4;
    brand.style.transform = near
      ? 'perspective(260px) rotateY(' + (dx * 4).toFixed(2) + 'deg) rotateX(' + (-dy * 3).toFixed(2) + 'deg)'
      : '';
    if (mark) {
      mark.style.transform = near
        ? 'rotate(' + (dx * 36).toFixed(1) + 'deg) scale(' + (1 + Math.min(.18, Math.abs(dx) * .09)).toFixed(2) + ')'
        : '';
      mark.style.color = near ? '#dbe4ff' : '';
      mark.style.textShadow = near ? '0 0 14px #9db0ff,0 0 26px #6f86ff' : '';
    }
  }

  function move(e) {
    if (suspended || e.pointerType === 'touch') return;
    visible = true;
    cancelBreath();
    tx = e.clientX; ty = e.clientY;
    var d = Math.hypot(tx - lastX, ty - lastY);
    speed = Math.min(1, d / 34);
    hue = 232 + (tx / Math.max(1, innerWidth)) * 68 + Math.sin(performance.now() / 1100) * 7;
    glow.style.setProperty('--h', hue.toFixed(0));
    glow.style.opacity = '1';
    trail += d;
    var stride = 46 - speed * 8;
    /* A single long jump (re-entering the window, a fast flick onto a cover)
       used to emit every "missed" particle at the new pointer position in one
       frame: up to 20+ stars stacked inside the same ±11px, which reads as a
       bright burst instead of a trail. Keep only the last two steps and place
       them along the path actually travelled, so a fast move stays a soft
       sprinkle no matter how large the jump was. */
    if (trail > stride * 2) trail = stride * 2;
    while (trail >= stride && layer.childElementCount < MAX_NODES) {
      trail -= stride;
      var f = d > 0 ? 1 - trail / d : 1;
      if (f < 0) f = 0;
      star(lastX + (tx - lastX) * f, lastY + (ty - lastY) * f, hue, null);
    }
    lastX = tx; lastY = ty;
    if (!raf) raf = requestAnimationFrame(tick);
    tilt(tx, ty);
    scheduleBreath();
  }

  function click(e) {
    if (suspended || e.pointerType === 'touch') return;
    cancelBreath();
    scheduleBreath();
    var x = e.clientX, y = e.clientY, h = 252 + Math.random() * 46;
    var ring = doc.createElement('i');
    ring.className = 'joyfx-ring';
    ring.style.cssText = 'left:' + x + 'px;top:' + y + 'px;--h:' + h.toFixed(0);
    ring.addEventListener('animationend', function () { ring.remove(); }, { once: true });
    layer.appendChild(ring);
    for (var i = 0; i < 9; i++) {
      var a = (Math.PI * 2 * i) / 9 + Math.random() * .3;
      var r = 34 + Math.random() * 30;
      star(x, y, h, { dx: Math.cos(a) * r, dy: Math.sin(a) * r - 8 });
    }
  }

  function leave() {
    if (suspended) return;
    visible = false;
    cancelBreath();
    glow.style.opacity = '0';
    if (brand) brand.style.transform = '';
    if (mark) {
      mark.style.transform = '';
      mark.style.color = '';
      mark.style.textShadow = '';
    }
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  /* Suspend the flourish while a game is actually being played. The portal
     renders this layer above its game iframe, so the halo and star trail would
     otherwise sit right on top of the table / board. Every other screen —
     lobby, game intro, membership, legal pages — keeps the effect. */
  var suspended = false;
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
      stopBreath();
      if (idleTimer) { clearTimeout(idleTimer); idleTimer = 0; }
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      visible = false;
      glow.style.opacity = '0';
      var nodes = layer.querySelectorAll('.joyfx-star,.joyfx-ring');
      for (var i = 0; i < nodes.length; i++) nodes[i].remove();
      layer.style.display = 'none';
      if (brand) brand.style.transform = '';
      if (mark) { mark.style.transform = ''; mark.style.color = ''; mark.style.textShadow = ''; }
    } else {
      layer.style.display = '';
      // Resume from the current pointer; don't replay the distance travelled
      // while the game was open as one burst of stars.
      lastX = tx; lastY = ty; trail = 0; speed = 0;
    }
  }
  function syncLocal() {
    // A portal owns #game-frame and takes its state from the iframe messages.
    if (!doc.getElementById('game-frame')) setSuspended(inGame());
  }

  doc.addEventListener('pointermove', move, { passive: true });
  doc.addEventListener('pointerdown', click, { passive: true });
  doc.addEventListener('pointerleave', leave, { passive: true });
  doc.addEventListener('visibilitychange', function () {
    if (suspended || !doc.hidden) return;
    visible = false;
    cancelBreath();
    glow.style.opacity = '0';
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  });

  /* Game pages live in an iframe, so pointer events inside it never reach
     this document and the halo used to freeze at the frame edge. The child
     frame relays its coordinates; we feed them through the same renderer so
     there is still exactly one flourish covering the whole viewport. */
  window.addEventListener('message', function (ev) {
    if (ev.origin !== location.origin) return;
    var d = ev.data;
    if (!d) return;
    var frame = doc.getElementById('game-frame');
    if (!frame || ev.source !== frame.contentWindow) return;
    if (d.type === 'joyflock:game-screen') { setSuspended(d.active); return; }
    if (d.type !== 'joyflock:pointer') return;
    if (typeof d.screen === 'boolean') setSuspended(d.screen);
    if (suspended) return;
    var box = frame.getBoundingClientRect();
    var e = {
      clientX: box.left + d.x,
      clientY: box.top + d.y,
      pointerType: 'mouse',
      target: { closest: function () { return d.hot ? {} : null; } }
    };
    if (d.kind === 'down') click(e);
    else if (d.kind === 'leave') leave();
    else move(e);
  }, { passive: true });

  if (window.MutationObserver && doc.body) {
    var localWatch = new MutationObserver(syncLocal);
    localWatch.observe(doc.body, { attributes: true, attributeFilter: ['data-screen'] });
    var localStage = doc.getElementById('play');
    if (localStage) localWatch.observe(localStage, { attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
  }
  syncLocal();
})();
