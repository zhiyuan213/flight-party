/* JoyFlock pointer flourish.
   A glowing halo tracks the cursor, a soft aurora follows a beat behind it,
   starlight sprinkles along the path, a ripple blooms on click, and the
   header wordmark tilts toward the pointer. Purely decorative: the whole
   layer is fixed + pointer-events:none, so it can never change layout,
   shift the header or swallow a click. */
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
    '.joyfx-cursor{position:absolute;left:0;top:0;width:30px;height:30px;',
      'border-radius:50%;border:1.5px solid hsla(var(--h),100%,88%,.62);',
      'box-shadow:0 0 12px hsla(var(--h),100%,72%,.45),',
      'inset 0 0 8px hsla(var(--h),100%,72%,.22);',
      'opacity:0;will-change:transform;',
      'transition:opacity .3s ease,width .22s ease,height .22s ease,',
      'border-color .22s ease,box-shadow .22s ease}',
    '.joyfx-cursor::after{content:"";position:absolute;left:50%;top:50%;',
      'width:3px;height:3px;border-radius:50%;',
      'transform:translate(-50%,-50%);background:#fff;box-shadow:0 0 8px #fff}',
    '.joyfx-cursor.is-hot{width:46px;height:46px;',
      'border-color:hsla(var(--h),100%,92%,.95);',
      'box-shadow:0 0 20px hsla(var(--h),100%,76%,.7),',
      'inset 0 0 12px hsla(var(--h),100%,76%,.35)}',
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
       Both lights start at their normal brightness (0% = opacity 1), dim
       slowly, then swell back; the small cursor ring keeps a softer range so
       the pointer never looks like it disappeared. */
    '@keyframes joyfx-breath{0%,100%{opacity:1}50%{opacity:.42}}',
    '@keyframes joyfx-breath-soft{0%,100%{opacity:1}50%{opacity:.72}}',
    '.joyfx-glow.is-breathing{animation:joyfx-breath 3.2s ease-in-out infinite;transition:none}',
    '.joyfx-cursor.is-breathing{animation:joyfx-breath-soft 3.2s ease-in-out infinite;',
      'transition:width .22s ease,height .22s ease,border-color .22s ease,box-shadow .22s ease}'
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
  var cursor = doc.createElement('i');
  cursor.className = 'joyfx-cursor';
  layer.appendChild(cursor);
  doc.body.appendChild(layer);

  var brand = doc.querySelector('body>.topbar .brand');
  var mark = brand && brand.querySelector('.brand-mark');
  var brandRect = null;
  function measureBrand() { brandRect = brand ? brand.getBoundingClientRect() : null; }
  measureBrand();
  window.addEventListener('resize', measureBrand, { passive: true });

  var tx = innerWidth / 2, ty = innerHeight / 2, cx = tx, cy = ty, hx = tx, hy = ty;
  var lastX = tx, lastY = ty, speed = 0, trail = 0, raf = 0, hue = 258;
  var MAX_NODES = 27;   // halo + aurora + up to ~25 live particles
  var HOT = 'a,button,select,summary,[role="button"],[data-control],.game-card,.rail-game';
  /* The breathing is driven by a CSS animation plus one short idle timer, not
     a permanent rAF loop: a pointer at rest should cost (almost) nothing. */
  var IDLE_DELAY = 220, idleTimer = 0, breathing = false, visible = false;
  glow.style.transform = 'translate3d(' + (tx - 140) + 'px,' + (ty - 140) + 'px,0)';
  cursor.style.transform = 'translate3d(' + tx + 'px,' + ty + 'px,0) translate(-50%,-50%)';

  function star(x, y, h, opts) {
    if (layer.childElementCount >= MAX_NODES) return;
    var size = 7 + Math.random() * 9;
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
    hx += (tx - hx) * .36;
    hy += (ty - hy) * .36;
    glow.style.transform = 'translate3d(' + (cx - 140).toFixed(1) + 'px,' +
      (cy - 140).toFixed(1) + 'px,0) scale(' + (1 + speed * .2).toFixed(3) + ')';
    cursor.style.transform = 'translate3d(' + hx.toFixed(1) + 'px,' +
      hy.toFixed(1) + 'px,0) translate(-50%,-50%)';
    speed *= .93;
    if (Math.abs(dx) + Math.abs(dy) + Math.abs(tx - hx) + Math.abs(ty - hy) > .5 || speed > .02) {
      raf = requestAnimationFrame(tick);
    } else {
      cx = hx = tx; cy = hy = ty; raf = 0;
    }
  }

  function stopBreath() {
    if (!breathing) return;
    breathing = false;
    // Freeze the animation's current value inline, then let the normal opacity
    // transition glide back to full brightness on the next frame. Just removing
    // the class can snap from the dimmed value straight to 1.
    var g = getComputedStyle(glow).opacity, c = getComputedStyle(cursor).opacity;
    glow.classList.remove('is-breathing');
    cursor.classList.remove('is-breathing');
    glow.style.opacity = g;
    cursor.style.opacity = c;
    requestAnimationFrame(function () {
      if (breathing || !visible) return;
      glow.style.opacity = '1';
      cursor.style.opacity = '1';
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
    cursor.classList.add('is-breathing');
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
    if (e.pointerType === 'touch') return;
    visible = true;
    cancelBreath();
    tx = e.clientX; ty = e.clientY;
    var d = Math.hypot(tx - lastX, ty - lastY);
    speed = Math.min(1, d / 34);
    hue = 232 + (tx / Math.max(1, innerWidth)) * 68 + Math.sin(performance.now() / 1100) * 7;
    glow.style.setProperty('--h', hue.toFixed(0));
    cursor.style.setProperty('--h', hue.toFixed(0));
    glow.style.opacity = '1';
    cursor.style.opacity = '1';
    var target = e.target;
    cursor.classList.toggle('is-hot', !!(target && target.closest && target.closest(HOT)));
    trail += d;
    var stride = 32 - speed * 10;
    while (trail >= stride && layer.childElementCount < MAX_NODES) {
      trail -= stride;
      star(tx, ty, hue, null);
    }
    if (trail > stride * 4) trail = 0;
    lastX = tx; lastY = ty;
    if (!raf) raf = requestAnimationFrame(tick);
    tilt(tx, ty);
    scheduleBreath();
  }

  function click(e) {
    if (e.pointerType === 'touch') return;
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
    visible = false;
    cancelBreath();
    glow.style.opacity = '0';
    cursor.style.opacity = '0';
    cursor.classList.remove('is-hot');
    if (brand) brand.style.transform = '';
    if (mark) {
      mark.style.transform = '';
      mark.style.color = '';
      mark.style.textShadow = '';
    }
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  doc.addEventListener('pointermove', move, { passive: true });
  doc.addEventListener('pointerdown', click, { passive: true });
  doc.addEventListener('pointerleave', leave, { passive: true });
  doc.addEventListener('visibilitychange', function () {
    if (doc.hidden) {
      visible = false;
      cancelBreath();
      glow.style.opacity = '0';
      cursor.style.opacity = '0';
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }
  });

  /* Game pages live in an iframe, so pointer events inside it never reach
     this document and the halo used to freeze at the frame edge. The child
     frame relays its coordinates; we feed them through the same renderer so
     there is still exactly one flourish covering the whole viewport. */
  window.addEventListener('message', function (ev) {
    if (ev.origin !== location.origin) return;
    var d = ev.data;
    if (!d || d.type !== 'joyflock:pointer') return;
    var frame = doc.getElementById('game-frame');
    if (!frame || ev.source !== frame.contentWindow) return;
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
})();
