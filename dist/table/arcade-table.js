import {createBubbles} from './bubbles.js?v=20261109-duel1';
import {createSnooker} from './snooker-view.js?v=20261109-snookerlive1';
import {updateSnookerShell} from './snooker-shell.js?v=20261109-snooker3';

const CONTROLS=snooker=>`<div class="arcade-controls">
      <label hidden><span></span> <select></select></label>
      <label ${snooker?'':'hidden'}><span></span> <input type="range" min="5" max="100" value="55"></label>
      <button type="button" disabled></button>
    </div>`;

export function mountArcade(host, game, onStatus, onFinish, handlers={}) {
  const snooker = game === 'snooker';
  host.classList.add('arcade-board', game);
  host.innerHTML = (snooker
    ? `<div class="snooker-stage"><div class="snooker-rail" aria-hidden="true"><i class="snooker-cue"></i></div><div class="snooker-table"><canvas tabindex="0"></canvas></div></div>`
    : `<canvas tabindex="0"></canvas>`) + CONTROLS(snooker);
  const canvas = host.querySelector('canvas');
  const action = host.querySelector('button');
  const label = (en, zh) => document.documentElement.lang === 'en' ? en : zh;
  const controller = (snooker ? createSnooker : createBubbles)({
    canvas, ctx: canvas.getContext('2d'), label, action,
    power: host.querySelector('input'), nomination: host.querySelector('select'),
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
    const fit = () => {
      const w = wrap.clientWidth, h = wrap.clientHeight, ratio = canvas.width / canvas.height;
      if (!w || !h || !ratio) return;
      const cw = Math.min(w, h * ratio), ch = cw / ratio;
      canvas.style.width = Math.floor(cw) + 'px';
      canvas.style.height = Math.floor(ch) + 'px';
    };
    new ResizeObserver(fit).observe(wrap);
    fit();
  }
  const api = {
    refresh() {
      const labels = host.querySelectorAll('label span');
      labels[0].textContent = label('Nominate colour', '指定彩球');
      labels[1].textContent = label('Power', '力度');
      action.textContent = snooker ? label('Shoot', '击球') : label('Fire', '发射');
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
    },
    applyBoard(next) { controller.applyBoard?.(next); },
    reset() { controller.reset?.(); },
    state() { return controller.state?.() || null; }
  };
  // The intro screen never renders the board, so labels would otherwise stay
  // blank until the first locale change or room transition.
  api.refresh();
  return api;
}
