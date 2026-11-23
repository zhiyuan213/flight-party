/* ==========================================================================
   Gomoku board, painted entirely with Canvas 2D.

   Why this exists
   ---------------
   The old board was 225 DOM cells with a CSS gradient line through the middle
   of each cell. A line through the cell centre necessarily leaves HALF a cell
   between the outermost line and the wooden frame on all four sides; there was
   no closing boundary, so the edge squares could never look complete. The
   2026-11-09 fix only moved the stones back onto the line crossings, it did
   not (and could not) remove that half cell.

   The cover artwork instead has a carved frame around a fully closed grid.
   Here we draw 17 x 17 straight lines forming 16 x 16 COMPLETE squares. The
   two outermost lines are the closed boundary of the grid, and the playable
   15 x 15 intersections are the inner lines, so every visible square is
   closed and stones still sit exactly on line crossings. All 225 DOM buttons
   remain as transparent hit / keyboard targets over the canvas, so the
   existing click delegation, rules, room protocol and accessibility labels
   stay untouched.
   ========================================================================== */

import {PIECE_PALETTES,drawStoneFinish} from './personal-piece-art.js';
export const GOMOKU_SIZE = 15;
export const GOMOKU_LINES = GOMOKU_SIZE + 2;  // 17 lines -> 16 x 16 closed cells
export const GOMOKU_INSET = 0.082;            // wooden frame, fraction of a side
export const GOMOKU_STEP = (1 - 2 * GOMOKU_INSET) / (GOMOKU_LINES - 1);
/* Percentages used by .gomoku-hits in gomoku-board.css. Keep them in sync. */
export const GOMOKU_HIT_LEFT = GOMOKU_INSET + GOMOKU_STEP / 2;
export const GOMOKU_HIT_SIZE = GOMOKU_STEP * GOMOKU_SIZE;

const STAR_POINTS = [[3, 3], [3, 11], [7, 7], [11, 3], [11, 11]];
const CELLS = GOMOKU_SIZE * GOMOKU_SIZE;

/* Per-seat decoration shares artwork with the shop. The wooden board and
   black/white stone bodies are never replaced by a personal purchase. */
let paletteCache = null;
function cosmeticKey() {
  const r = document.documentElement;
  return [r.getAttribute('data-cosmetic-piece-1'),r.getAttribute('data-cosmetic-piece-2')].join('|');
}
function palette() {
  const key = cosmeticKey();
  if (paletteCache && paletteCache.key === key) return paletteCache;
  const root = document.documentElement;
  paletteCache = {
    key,hasBoard:false,rim:null,line:'rgba(82,46,18,.88)',
    wood:['#dfc99f','#dac196','#d2b789','#c5a575','#826344'],
    themes:[root.getAttribute('data-cosmetic-piece-1'),root.getAttribute('data-cosmetic-piece-2')]
  };
  return paletteCache;
}

export function gomokuLayout(size) {
  const inset = size * GOMOKU_INSET;
  const step = (size - 2 * inset) / (GOMOKU_LINES - 1);
  return {
    size, inset, step,
    line: i => inset + i * step,
    point: (row, col) => ({x: inset + (col + 1) * step, y: inset + (row + 1) * step}),
    hitLeft: inset + step / 2,
    hitSize: step * GOMOKU_SIZE
  };
}

/* Deterministic PRNG: the wood grain must not flicker on every server poll. */
function seeded(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function roundPath(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function segment(ctx, x1, y1, x2, y2, colour, width) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/* A quiet teal/gold ambience behind the board, echoing the silk ribbons in
   the game cover without competing with the dark play surface. */
function ambience(ctx, S) {
  ctx.save();
  const glow = ctx.createRadialGradient(S * .18, S * .12, 0, S * .5, S * .5, S * .82);
  glow.addColorStop(0, 'rgba(20,150,112,.26)');
  glow.addColorStop(.45, 'rgba(12,96,88,.10)');
  glow.addColorStop(1, 'rgba(8,40,52,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, S, S);
  ctx.lineCap = 'round';
  segment(ctx, -S * .08, S * .16, S * .30, -S * .06, 'rgba(28,178,132,.22)', S * .012);
  segment(ctx, -S * .08, S * .18, S * .30, -S * .04, 'rgba(224,180,92,.20)', S * .0022);
  segment(ctx, S * .74, S * 1.06, S * 1.08, S * .82, 'rgba(24,164,126,.20)', S * .012);
  segment(ctx, S * .74, S * 1.08, S * 1.08, S * .84, 'rgba(224,180,92,.18)', S * .0022);
  ctx.restore();
}

function wood(ctx, S) {
  const rng = seeded(20261110);
  const P = palette();
  /* Cast shadow, drawn before the board so the four rounded corners read as
     a raised wooden object. */
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.58)';
  ctx.shadowBlur = S * .035;
  ctx.shadowOffsetY = S * .018;
  ctx.fillStyle = P.wood[4];
  roundPath(ctx, 0, 0, S, S, S * .018);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundPath(ctx, 0, 0, S, S, S * .018);
  ctx.clip();
  const base = ctx.createLinearGradient(0, 0, S * .35, S);
  base.addColorStop(0, P.wood[0]);
  base.addColorStop(.34, P.wood[1]);
  base.addColorStop(.68, P.wood[2]);
  base.addColorStop(1, P.wood[3]);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);

  /* Long vertical grain with a gentle wave, plus a few pale horizontal
     streaks. Every parameter comes from the fixed seed. */
  ctx.lineCap = 'round';
  for (let i = 0; i < 420; i++) {
    const x = rng() * S, amp = (.6 + rng() * 2.5) * S / 900;
    const width = (.3 + rng() * .95) * S / 900;
    const phase = i * 1.73, freq = 2.5 + rng() * 6;
    ctx.beginPath();
    for (let k = 0; k <= 20; k++) {
      const y = k * S / 20;
      const xx = x + Math.sin(y / S * freq + phase) * amp;
      if (k) ctx.lineTo(xx, y); else ctx.moveTo(xx, y);
    }
    ctx.strokeStyle = `rgba(112,64,22,${(.014 + rng() * .042).toFixed(3)})`;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  const vignette = ctx.createRadialGradient(S * .38, S * .28, S * .05, S * .5, S * .5, S * .78);
  vignette.addColorStop(0, 'rgba(255,242,205,.16)');
  vignette.addColorStop(.6, 'rgba(120,70,25,0)');
  vignette.addColorStop(1, 'rgba(72,38,12,.08)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, S, S);
  ctx.restore();

  /* Bevelled outer rim and the rounded groove that frames the grid. A themed
     board replaces the warm wooden rim with its own metallic edge colour. */
  const rim = P.rim;
  ctx.save();
  roundPath(ctx, 0, 0, S, S, S * .018);
  ctx.strokeStyle = rim || 'rgba(86,46,17,.90)';
  ctx.lineWidth = Math.max(2, S * .008);
  ctx.stroke();
  roundPath(ctx, S * .009, S * .009, S - S * .018, S - S * .018, S * .014);
  ctx.strokeStyle = rim || 'rgba(255,229,172,.55)';
  ctx.lineWidth = Math.max(1, S * .0026);
  ctx.stroke();
  ctx.restore();
}

function grid(ctx, S) {
  const P = palette();
  const L = gomokuLayout(S);
  const edge0 = L.inset, edge1 = S - L.inset;
  ctx.save();
  ctx.beginPath();
  ctx.rect(edge0, edge0, edge1 - edge0, edge1 - edge0);
  ctx.clip();

  const thin = Math.max(.65, S * .00095);
  const thick = Math.max(.9, S * .00135);
  for (let i = 0; i < GOMOKU_LINES; i++) {
    const p = L.line(i);
    const boundary = i === 0 || i === GOMOKU_LINES - 1;
    const colour = P.hasBoard ? P.line : boundary ? 'rgba(62,34,12,.98)' : 'rgba(82,46,18,.88)';
    const width = boundary ? thick : thin;
    segment(ctx, p, edge0, p, edge1, colour, width);
    segment(ctx, edge0, p, edge1, p, colour, width);
  }

  /* Standard 15x15 star points, on playable crossings. */
  for (const [row, col] of STAR_POINTS) {
    const p = L.point(row, col);
    const r = Math.max(2, L.step * .085);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = P.hasBoard ? P.line : 'rgba(66,38,15,.88)';
    ctx.fill();

  }
  ctx.restore();
  return L;
}

function stone(ctx, x, y, r, side, {ghost = false, last = false} = {}) {
  const black = side === 'black';
  const P = palette();
  const theme=P.themes[black?0:1],trim=PIECE_PALETTES[theme];
  ctx.save();
  if (ghost) ctx.globalAlpha *= .48;

  if (!ghost) {
    const shadow = ctx.createRadialGradient(x, y + r * .3, r * .1, x, y + r * .3, r * 1.3);
    shadow.addColorStop(0, 'rgba(34,16,4,.56)');
    shadow.addColorStop(.55, 'rgba(34,16,4,.22)');
    shadow.addColorStop(1, 'rgba(34,16,4,0)');
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(x, y + r * .34, r * 1.18, r * .74, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const body = ctx.createRadialGradient(x - r * .34, y - r * .42, r * .04, x, y, r * 1.14);
  if (black) {
    body.addColorStop(0, '#555653');
    body.addColorStop(.20, '#30312f');
    body.addColorStop(.58, '#171918');
    body.addColorStop(.86, '#0c0e0d');
    body.addColorStop(1, '#070908');
  } else {
    body.addColorStop(0, '#ffffff');
    body.addColorStop(.42, '#f8f4ea');
    body.addColorStop(.76, '#e4dbc9');
    body.addColorStop(1, '#b7ab96');
  }
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.strokeStyle = black ? 'rgba(255,255,255,.12)' : 'rgba(120,102,78,.55)';
  ctx.lineWidth = Math.max(1, r * .055);
  ctx.stroke();

  // Broad reflection on a gently domed stone, with no sharp glass catchlight.
  ctx.save();
  ctx.translate(x - r * .28, y - r * .34);
  ctx.scale(1, .68);
  const shine = ctx.createRadialGradient(0, 0, 0, 0, 0, r * .7);
  shine.addColorStop(0, black ? 'rgba(255,255,245,.20)' : 'rgba(255,255,255,.65)');
  shine.addColorStop(.55, black ? 'rgba(255,255,245,.07)' : 'rgba(255,255,255,.22)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = shine;
  ctx.beginPath(); ctx.arc(0, 0, r * .7, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  if(trim){
    drawStoneFinish(ctx,theme,x,y,r,black);
  }
  if (last && !ghost) {
    ctx.beginPath();
    ctx.arc(x, y, r * .17, 0, Math.PI * 2);
    ctx.strokeStyle = black ? '#d9c9a1' : '#77674b';
    ctx.lineWidth = Math.max(1, r * .06);
    ctx.stroke();
  }
  ctx.restore();
}

function draw(ctx, S, view) {

  wood(ctx, S);
  const L = grid(ctx, S);
  const state = view.state;
  const cells = state?.cells || [];
  const r = L.step * .468;
  for (let i = 0; i < CELLS; i++) {
    const value = cells[i];
    if (!value) continue;
    const p = L.point(Math.floor(i / GOMOKU_SIZE), i % GOMOKU_SIZE);
    stone(ctx, p.x, p.y, r, value === 1 ? 'black' : 'white', {last: i === view.last});
  }
  /* Keyboard focus ring, under the hover ghost. */
  if (view.focus >= 0 && view.focus < CELLS) {
    const p = L.point(Math.floor(view.focus / GOMOKU_SIZE), view.focus % GOMOKU_SIZE);
    ctx.beginPath();
    ctx.arc(p.x, p.y, L.step * .49, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,214,132,.95)';
    ctx.lineWidth = Math.max(1.5, S * .0022);
    ctx.setLineDash([S * .006, S * .005]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  const hover = view.hover;
  if (view.can && !state?.over && hover >= 0 && hover < CELLS && !cells[hover]) {
    const p = L.point(Math.floor(hover / GOMOKU_SIZE), hover % GOMOKU_SIZE);
    stone(ctx, p.x, p.y, r, view.turn === 2 ? 'white' : 'black', {ghost: true});
  }
}

function hitFromEvent(view, event) {
  const rect = view.canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return -1;
  const S = Math.min(rect.width, rect.height);
  const ox = (rect.width - S) / 2, oy = (rect.height - S) / 2;
  const u = (event.clientX - rect.left - ox) / S;
  const v = (event.clientY - rect.top - oy) / S;
  const col = Math.round((u - GOMOKU_INSET) / GOMOKU_STEP - 1);
  const row = Math.round((v - GOMOKU_INSET) / GOMOKU_STEP - 1);
  if (col < 0 || col >= GOMOKU_SIZE || row < 0 || row >= GOMOKU_SIZE) return -1;
  const px = GOMOKU_INSET + (col + 1) * GOMOKU_STEP;
  const py = GOMOKU_INSET + (row + 1) * GOMOKU_STEP;
  if (Math.abs(u - px) > GOMOKU_STEP / 2 || Math.abs(v - py) > GOMOKU_STEP / 2) return -1;
  return row * GOMOKU_SIZE + col;
}

function labelFor(index, value, zh) {
  const row = Math.floor(index / GOMOKU_SIZE) + 1;
  const col = index % GOMOKU_SIZE + 1;
  if (zh) return `第${row}行第${col}列，${value ? '已有棋子' : '空位'}`;
  return `Row ${row}, column ${col}, ${value ? 'occupied' : 'empty'}`;
}

function paint(view) {
  const canvas = view.canvas, ctx = view.ctx;
  if (!canvas || !ctx || !canvas.isConnected) return;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  const key = [w, h, dpr, signature(view)].join('|');
  if (view.paintKey === key) return;
  view.paintKey = key;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const S = Math.min(w, h);
  ctx.save();
  ctx.translate((w - S) / 2, (h - S) / 2);
  draw(ctx, S, view);
  ctx.restore();
}

function signature(view) {
  return [
    view.state?.cells?.join('') || '', view.turn, view.can,
    view.last, view.hover, view.focus, cosmeticKey()
  ].join('|');
}

function invalidate(view) {
  /* Only the cached key is dropped. The signature itself describes the live
     view and must stay intact, otherwise a state change would be compared
     against an empty signature and the repaint would be skipped. */
  view.paintKey = '';
  if (view.frame) return;
  view.frame = requestAnimationFrame(() => {
    view.frame = 0;
    paint(view);
  });
}

function createView(host) {
  const canvas = document.createElement('canvas');
  canvas.className = 'gomoku-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const hits = document.createElement('div');
  hits.className = 'gomoku-hits';
  hits.setAttribute('role', 'group');
  const zh = (document.documentElement.lang || '').toLowerCase().startsWith('zh');
  const buttons = [];
  for (let i = 0; i < CELLS; i++) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cell';
    button.dataset.position = String(i);
    button.dataset.value = '0';
    button.setAttribute('aria-label', labelFor(i, 0, zh));
    hits.append(button);
    buttons.push(button);
  }
  host.replaceChildren(canvas, hits);
  const view = {
    canvas, ctx: canvas.getContext('2d'), hits, buttons,
    state: null, turn: 1, can: false, last: -1, prevCells: null,
    hover: -1, focus: -1, paintKey: '', frame: 0
  };
  host._gomokuView = view;
  host.addEventListener('pointermove', event => {
    const index = hitFromEvent(view, event);
    if (index !== view.hover) {
      view.hover = index;
      invalidate(view);
    }
  });
  host.addEventListener('pointerleave', () => {
    if (view.hover !== -1) { view.hover = -1; invalidate(view); }
  });
  hits.addEventListener('focusin', event => {
    const button = event.target.closest?.('[data-position]');
    const index = button ? Number(button.dataset.position) : -1;
    if (index !== view.focus) { view.focus = index; invalidate(view); }
  });
  hits.addEventListener('focusout', () => {
    if (view.focus !== -1) { view.focus = -1; invalidate(view); }
  });
  if (typeof ResizeObserver === 'function') {
    view.observer = new ResizeObserver(() => invalidate(view));
    view.observer.observe(host);
  }
  window.addEventListener('joyflock:cosmetics-changed',()=>{if(canvas.isConnected)invalidate(view);});
  return view;
}

/* Called from table.js render() in place of the old innerHTML grid. */
export function renderGomoku(host, state, options = {}) {
  if (!host || !state || !Array.isArray(state.cells) || state.cells.length !== CELLS) return;
  const view = host._gomokuView?.canvas?.isConnected ? host._gomokuView : createView(host);
  const cells = state.cells;
  const can = !!options.can;
  const turn = Number(state.turn) === 2 ? 2 : 1;

  /* Derive the latest stone from the authoritative board diff: grid-rules has
     no "last move" field, and the old `last` variable was never maintained. */
  let last = Number.isInteger(options.last) && options.last >= 0 ? options.last : -1;
  const prev = view.prevCells;
  /* An explicit last move (preview pages) wins. Otherwise derive it from the
     authoritative board diff, because grid-rules carries no last-move field
     and the shell's legacy `last` variable is never maintained. */
  if (last < 0 && prev && prev.length === CELLS) {
    const added = [];
    for (let i = 0; i < CELLS; i++) if (!prev[i] && cells[i]) added.push(i);
    if (added.length === 1) last = added[0];
    else if (!added.length && view.last >= 0 && cells[view.last]) last = view.last;
    else last = -1;
  }
  view.last = last;
  view.prevCells = cells.slice();
  view.state = state;
  updateWinningLine(host, view, state, last);
  view.can = can;
  view.turn = turn;
  if (!can && view.hover !== -1) view.hover = -1;

  const zh = (document.documentElement.lang || '').toLowerCase().startsWith('zh');
  for (let i = 0; i < CELLS; i++) {
    const button = view.buttons[i];
    const value = cells[i] || 0;
    const text = String(value);
    if (button.dataset.value !== text) button.dataset.value = text;
    if (button.disabled === can) button.disabled = !can;
    const label = labelFor(i, value, zh);
    if (button.getAttribute('aria-label') !== label) button.setAttribute('aria-label', label);
    if (button.classList.contains('last')) button.classList.remove('last');
  }
  if (last >= 0) view.buttons[last].classList.add('last');
  invalidate(view);
}
export function gomokuWinningFive(cells, winner, last) {
  if (winner !== 1 && winner !== 2) return null;
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  let first = null;
  for (let index = 0; index < CELLS; index++) {
    if (cells[index] !== winner) continue;
    const row = Math.floor(index / GOMOKU_SIZE), col = index % GOMOKU_SIZE;
    for (const [dr, dc] of directions) {
      const endRow = row + 4 * dr, endCol = col + 4 * dc;
      if (endRow >= GOMOKU_SIZE || endCol < 0 || endCol >= GOMOKU_SIZE) continue;
      const line = Array.from({length: 5}, (_, step) => index + step * (dr * GOMOKU_SIZE + dc));
      if (!line.every(i => cells[i] === winner)) continue;
      if (line.includes(last)) return line;
      first ??= line;
    }
  }
  return first;
}

function updateWinningLine(host, view, state, last) {
  const win = state.over ? gomokuWinningFive(state.cells, state.winner, last) : null;
  const key = win?.join(',') || '';
  if (key === view.winKey) return;
  view.winKey = key;
  view.winOverlay?.remove();
  if (!win) return;
  const layout = gomokuLayout(100);
  const point = index => layout.point(Math.floor(index / GOMOKU_SIZE), index % GOMOKU_SIZE);
  const from = point(win[0]), to = point(win[4]);
  const svg = host.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'four-win-line gomoku-win-line');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<line pathLength="1" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"/>`;
  host.append(svg);
  view.winOverlay = svg;
}
