import {createBubbles} from './bubbles.js?v=20261110-glove2&theme=20261123-midnight1&ui=20261123-polish1';
import {createSnooker} from './snooker-view.js?v=20261113-humanring1&release=20261115-polishrelease1&power=20261120-poolpower30';
import {updateSnookerShell} from './snooker-shell.js?v=20261111-targetballs1&release=20261115-polishrelease1';
import {unlockPoolAudio,poolMuted,setPoolMuted} from './pool-audio.js?v=20261113-snookerrail1&release=20261115-polishrelease1&audio=20261115-levels1&power=20261120-poolpower30';
import {meterPower,spotCode} from './pool-input.js?v=20261110-glove2&power=20261120-poolpower30';

/* Snooker uses the same left-hand cue rail as Pool: a sound switch, the cue
   ball's hit point and the dark power track with its wooden cue. Pool removed
   its legacy .power-fill years ago and idles at 0% so the whole cue stays
   visible; mirroring that here keeps the two rails identical. The shoot button
   below is only the controller's fire relay, hidden by CSS like Pool's rail.
   The hidden inputs only carry values for the renderer and are never shown. */
const RAIL=`<div class="snooker-rail"><div class="pool-left-controls">
  <button class="pool-sound" type="button" aria-label="切换音效"></button>
  <div class="pool-hit"><canvas class="pool-spot" width="160" height="160" role="button" tabindex="0" aria-label="选择白球击球点"></canvas></div>
  <label class="snooker-nomination"><span></span><select aria-label="指定彩球"></select></label>
  <div class="pool-power-meter" role="meter" aria-label="击球力度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="power-cue"></div></div>
  <output class="pool-power-value">0%</output>
  <button class="snooker-shoot" type="button"></button>
</div></div>
<div class="snooker-table"><canvas tabindex="0" aria-label="斯诺克球桌，移动鼠标瞄准，按住左键后拉蓄力，松开击球"></canvas><div class="snooker-shot-card" hidden aria-live="polite"><b></b><span></span></div></div>`;
const CONTROLS=snooker=>snooker
  ? `<div class="arcade-controls" hidden aria-hidden="true"><input type="range" min="0" max="100" value="0"><button type="button" disabled></button></div>`
  : `<div class="arcade-controls"><label hidden><span></span><select></select></label><label hidden><span></span><input type="range" min="5" max="100" value="55"></label><button type="button" disabled></button></div>`;

export function mountArcade(host, game, onStatus, onFinish, handlers={}) {
  const snooker = game === 'snooker';
  host.classList.add('arcade-board', game);
  host.innerHTML = (snooker
    ? `<div class="snooker-stage">${RAIL}</div>`
    : `<canvas tabindex="0"></canvas>`) + CONTROLS(snooker);
  const canvas = snooker ? host.querySelector('.snooker-table canvas') : host.querySelector('canvas');
  const action = snooker ? host.querySelector('.snooker-shoot') : host.querySelector('button');
  const label = (en, zh) => document.documentElement.lang === 'en' ? en : zh;
  const power = host.querySelector('input');
  const nomination = snooker ? host.querySelector('.snooker-nomination select') : host.querySelector('select');
  const meter = host.querySelector('.pool-power-meter');
  const output = host.querySelector('.pool-power-value');
  const spot = host.querySelector('.pool-spot');
  const sound = host.querySelector('.pool-sound');
  const card = host.querySelector('.snooker-shot-card');
  let spin = 0, meterPointer = null, cardTimer = 0;

  const setPower = value => {
    const raw = Number(value);
    const n = Number.isFinite(raw) ? Math.round(Math.max(0, Math.min(100, raw))) : 0;
    power.value = String(n);
    if (meter) {
      meter.style.setProperty('--cue-pull', (n * .98) + '%');
      meter.setAttribute('aria-valuenow', String(n));
    }
    if (output) output.textContent = n + '%';
  };
  const paintSpot = () => {
    if (!spot) return;
    const c = spot.getContext('2d');
    c.clearRect(0, 0, 160, 160);
    const g = c.createRadialGradient(55, 45, 1, 80, 80, 68);
    g.addColorStop(0, '#fff'); g.addColorStop(.7, '#f2f2ee'); g.addColorStop(1, '#999da5');
    c.fillStyle = g; c.beginPath(); c.arc(80, 80, 65, 0, Math.PI * 2); c.fill();
    const theta = (spin - 1) * Math.PI / 4;
    c.fillStyle = '#df5048'; c.beginPath();
    c.arc(80 + (spin ? Math.sin(theta) * 40 : 0), 80 - (spin ? Math.cos(theta) * 40 : 0), 6, 0, Math.PI * 2); c.fill();
  };
  const syncSound = () => { if (sound) sound.textContent = poolMuted() ? label('Muted', '静音') : label('Sound', '声音'); };
  const showShot = info => {
    if (!card) return;
    const zh = document.documentElement.lang !== 'en';
    const shooter = (info.shooter === 2 ? handlers.opponentLabel?.() : handlers.selfLabel?.())
      || (info.shooter === 2 ? (zh ? '电脑' : 'Computer') : (zh ? '你' : 'You'));
    const score = info.scores.join(' : ');
    const gained = info.gained?.[info.shooter - 1] || 0;
    const b = card.querySelector('b'), s = card.querySelector('span');
    if (info.over) {
      b.textContent = label('Frame over', '本局结束');
      s.textContent = score + ' · ' + (zh ? '查看结算' : 'Final score');
      card.dataset.kind = 'end';
    } else if (info.penalty) {
      b.textContent = label('Foul', '犯规') + ' +' + info.penalty;
      s.textContent = shooter + (zh ? ' 犯规 · 对方加分 · ' : ' fouled · ') + score;
      card.dataset.kind = 'foul';
    } else if (gained > 0) {
      b.textContent = '+' + gained + (zh ? ' 分' : ' pts');
      s.textContent = shooter + ' · ' + (zh ? '单杆 ' : 'Break ') + info.breakScore +
        ' · ' + (info.turn === info.shooter ? (zh ? '继续击球' : 'shoot again') : (zh ? '换人' : 'turn passes')) + ' · ' + score;
      card.dataset.kind = 'score';
    } else {
      b.textContent = label('No pot', '未进球');
      s.textContent = score + ' · ' + (info.turn === info.shooter ? (zh ? '继续击球' : 'shoot again') : (zh ? '换对手击球' : "Opponent's turn"));
      card.dataset.kind = 'miss';
    }
    card.hidden = false;
    card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
    clearTimeout(cardTimer);
    cardTimer = setTimeout(() => { card.hidden = true; }, 1900);
  };

  const controller = (snooker ? createSnooker : createBubbles)({
    canvas, ctx: canvas.getContext('2d'), label, action, power, nomination,
    spin: () => spin,
    setPower,
    onSoundChange: syncSound,
    onShotResult: showShot,
    onAnimating(value) { host._animating = value; host._striking = value; },
    point(event) {
      const rect = canvas.getBoundingClientRect();
      return {x: (event.clientX - rect.left) * canvas.width / rect.width,
        y: (event.clientY - rect.top) * canvas.height / rect.height};
    },
    status: onStatus, finish: onFinish,
    state: value => { if (snooker) updateSnookerShell(value); },
    onShoot: handlers.onShoot || (() => {}),
    canPlay: handlers.canPlay || (() => false),
    board: handlers.board || (() => null)
  });
  let active = false;
  if (snooker) {
    const wrap = host.querySelector('.snooker-table');
    const rail = host.querySelector('.snooker-rail');
    const fit = () => {
      const rect = wrap.getBoundingClientRect();
      const w = wrap.clientWidth || rect.width, h = wrap.clientHeight || rect.height;
      const ratio = canvas.width / canvas.height;
      if (!w || !h || !ratio) return;
      const cw = Math.min(w, h * ratio), ch = cw / ratio;
      canvas.style.width = Math.floor(cw) + 'px';
      canvas.style.height = Math.floor(ch) + 'px';
      // Pool's left controls are as tall as its fitted table. Publish the
      // canvas height so the cue column can track it and the wooden cue gets
      // the full leftover height instead of a short fixed-size stub.
      rail?.style.setProperty('--snooker-canvas-height', Math.floor(ch) + 'px');
    };
    new ResizeObserver(fit).observe(wrap);
    fit();
    paintSpot(); syncSound(); setPower(Number(power.value));

    if (sound) sound.onclick = () => { unlockPoolAudio(); setPoolMuted(!poolMuted()); syncSound(); controller.repaint?.(); };
    const setSpin = value => { spin = value; paintSpot(); controller.repaint?.(); };
    if (spot) {
      spot.onpointerdown = event => {
        const r = spot.getBoundingClientRect();
        const x = (event.clientX - r.left) / r.width * 2 - 1, y = (event.clientY - r.top) / r.height * 2 - 1;
        if (Math.hypot(x, y) > .88) return;
        setSpin(spotCode(x, y));
      };
      spot.onkeydown = event => {
        const map = {ArrowUp: 1, ArrowRight: 3, ArrowDown: 5, ArrowLeft: 7, '0': 0};
        if (event.key in map) { event.preventDefault(); setSpin(map[event.key]); }
      };
    }
    if (meter) {
      const at = event => {
        const r = meter.getBoundingClientRect();
        return Math.round(Math.max(5, Math.min(100, meterPower(event.clientY, r.top + 10, r.height - 20))));
      };
      meter.onpointerdown = event => {
        event.preventDefault(); unlockPoolAudio();
        meterPointer = event.pointerId; meter.setPointerCapture?.(event.pointerId);
        controller.previewPower(at(event));
      };
      meter.onpointermove = event => { if (meterPointer === event.pointerId) controller.previewPower(at(event)); };
      const end = event => {
        if (meterPointer !== event.pointerId) return;
        meterPointer = null;
        const value = Number(power.value);
        controller.clearPreview();
        if (value >= 5) controller.shoot(value);
      };
      meter.onpointerup = end;
      meter.onpointercancel = () => { if (meterPointer !== null) { meterPointer = null; controller.clearPreview(); } };
    }
  }
  const api = {
    refresh() {
      if (snooker) {
        const nom = host.querySelector('.snooker-nomination span');
        if (nom) nom.textContent = label('Nominate', '指定彩球');
      } else {
        const labels = host.querySelectorAll('label span');
        labels[0].textContent = label('Nominate colour', '指定彩球');
        labels[1].textContent = label('Power', '力度');
      }
      action.textContent = snooker ? label('Shoot', '击球') : label('Fire', '发射');
      syncSound();
      if (active) controller.refresh?.();
    },
    start(computer) {
      active = true;
      action.disabled = false;
      controller.start(computer);
      canvas.focus();
    },
    stop() {
      active = false;
      controller.stop();
      action.disabled = true;
      if (card) { clearTimeout(cardTimer); card.hidden = true; }
    },
    applyBoard(next) { controller.applyBoard?.(next); },
    reset() { controller.reset?.(); },
    state() { return controller.state?.() || null; },
    whenSettled() { return controller.whenSettled?.() || Promise.resolve(); },
    animating() { return !!controller.animating?.(); },
    replayTurn() { return controller.replayTurn?.() || null; }
  };
  // The intro screen never renders the board, so labels would otherwise stay
  // blank until the first locale change or room transition.
  api.refresh();
  return api;
}
