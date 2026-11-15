/* Billiards cosmetics — the ONLY bridge between the published data-cosmetic-*
   attributes (see game-cosmetics.js), the colour table in site-cosmetics.css
   and the Pool / Snooker canvas painters.

   DOM access is fully guarded: in Node / VM tests there is no computed style,
   every skin getter returns null and the painters keep their ORIGINAL artwork
   byte-for-byte. Results are cached by theme, so a repaint never calls
   getComputedStyle() once per sphere on every animation frame.

   A ball theme never paints the rack one flat shade: `colorFor` keeps each
   numbered ball's own colour from the shared --ball-N table, while `marks`
   gives every id its own signature ring around the number patch. */
export const VERSION = '20261112-gamelanes1';
import {BILLIARD_MATERIALS} from './billiard-materials.js?v=20261113-materials1';

const DEFAULT_CLOTH = [22, 60, 106];
let cacheKey = null;
let cache = {ball: null, cue: null, table: null};

function attrs() {
  try {
    const r = document.documentElement;
    return {
      ball: r.getAttribute('data-cosmetic-ball') || '',
      cue: r.getAttribute('data-cosmetic-cue') || '',
      table: r.getAttribute('data-cosmetic-table') || '',
      seat: r.getAttribute('data-cosmetic-seat') || '1'
    };
  } catch {
    return {ball: '', cue: '', table: '', seat: '1'};
  }
}

function css(name, fallback) {
  try {
    if (typeof document === 'undefined' || !document.documentElement) return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  } catch {return fallback;}
}

function rgb(hex, fallback) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return fallback;
  const h = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function shade(hex, factor) {
  const c = rgb(hex, [30, 48, 70]);
  const part = v => Math.max(0, Math.min(255, Math.round(v * factor)))
    .toString(16).padStart(2, '0');
  return '#' + part(c[0]) + part(c[1]) + part(c[2]);
}

function buildBall(theme) {
  const base = [];
  for (let i = 0; i < 16; i++) base.push(css('--ball-' + i, ''));
  return {
    theme, base,
    hi: css('--ball-hi', '#ffffff'), lo: css('--ball-lo', '#000000'),
    patch: css('--ball-patch', '#fffbed'), ink: css('--ball-ink', '#111722'),
    ring: css('--ball-ring', '#ffffff'), glow: css('--ball-glow', '#00000000'),
    stripe: css('--ball-stripe', '#f9f7ee'), mark: css('--ball-mark', '#d33f35'),
    ...BILLIARD_MATERIALS[theme],
    /* Snooker keeps its semantic colours (white / red / yellow / green ...);
       Pool uses the SAME per-ball table the shop cards render. */
    colorFor(id, plain, original) {
      if (plain) return original;
      return /^#/.test(base[id] || '') ? base[id] : original;
    },
    /* Per-ball signature: N tiny ticks on the themed rim. */
    marks(id, plain) {
      if (plain) return id === 0 ? 0 : Math.min(14, id * 2);
      return Math.min(12, Math.max(0, id));
    }
  };
}

function buildCue(theme) {
  const material=BILLIARD_MATERIALS[theme];
  if(material){
    const stops=colours=>colours.map((colour,i)=>[i/(colours.length-1),colour]);
    return {...material,theme,wrapHi:material.inlay,shaft:stops(material.shaft),
      ferrule:stops(material.metal),tip:[[0,'#273f49'],[.4,'#a5c6cb'],[1,'#3d535b']],
      butt:stops(material.grip),ring:stops(material.metal),cap:stops(material.grip)};
  }
  const a = css('--cue-a', '#70502f'), b = css('--cue-b', '#d4a566'),
    c = css('--cue-c', '#654022'), wrap = css('--cue-wrap', '#122c4a'),
    wrapHi = css('--cue-wrap-hi', '#69dcff'), ferrule = css('--cue-ferrule', '#fff8dd'),
    butt = css('--cue-butt', '#071d33'), tip = css('--cue-tip', '#4de2ff');
  return {
    theme, wrapHi,
    shaft: [[0, c], [.24, b], [.45, b], [.7, a], [1, c]],
    ferrule: [[0, wrap], [.38, ferrule], [.7, ferrule], [1, wrap]],
    tip: [[0, c], [.35, tip], [.7, a], [1, butt]],
    butt: [[0, butt], [.36, wrap], [.58, a], [1, butt]],
    ring: [[0, a], [.4, ferrule], [.7, b], [1, a]],
    cap: [[0, butt], [.4, wrapHi], [1, butt]]
  };
}

function buildTable(theme) {
  const material=BILLIARD_MATERIALS[theme];
  if(material)return {...material,theme,cloth:rgb(material.cloth,DEFAULT_CLOTH),snookerWood:material.frame};
  const wood = css('--cloth-wood', '#1b2c4e');
  return {
    theme, wood,
    cloth: rgb(css('--cloth', ''), DEFAULT_CLOTH),
    rim: css('--cloth-rim', '#ffffff'),
    frame: [shade(wood, 1.45), shade(wood, 1.02), shade(wood, .98), shade(wood, .78)],
    snookerWood: [shade(wood, 1.55), shade(wood, 1.32), shade(wood, 1.08), shade(wood, 1.2)]
  };
}

function refresh() {
  const a = attrs();
  const key = [a.ball, a.cue, a.table, a.seat].join('|');
  if (key === cacheKey) return;
  cacheKey = key;
  cache = {
    ball: a.ball ? buildBall(a.ball) : null,
    cue: a.cue ? buildCue(a.cue) : null,
    table: a.table ? buildTable(a.table) : null
  };
}

/* Cheap stable key for the cached table canvases: a theme change must
   invalidate them even when the position did not. */
export function cosmeticKey() {refresh(); return cacheKey;}
export function ballSkin() {refresh(); return cache.ball;}
export function tableSkin() {refresh(); return cache.table;}
/* The opponent's cue keeps the ORIGINAL wood: only my own shots use the
   equipped cue. `myTurn` is decided by each view before painting. */
export function cueSkin(myTurn = true) {refresh(); return myTurn ? cache.cue : null;}

if (typeof window !== 'undefined') {
  window.__joyflockBilliardCosmetics = {
    version: VERSION, cosmeticKey, ballSkin, cueSkin, tableSkin
  };
}
