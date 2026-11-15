/* 2026-11-13 15:18 correction.
   The 14:50 "replace the two smiley avatars with X / O" change was WRONG and
   has been reverted. What the user actually wanted: keep both smiley avatars
   and the right-hand X / O badge, and change the circular portrait FRAME to a
   soft square. This test proves both halves with source assertions plus a real
   playerCard() / seat-branch run in a mini DOM. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const table = read('dist/table/table.js');
const seatCss = read('dist/table/four-seat-piece.css');
const tableCss = read('dist/table/table.css');
const frameCss = read('dist/table/seat-frame-square.css');
const rankCss = read('dist/rank-badges.css');
const html = read('dist/table/index.html');
const flightHtml = read('dist/index.html');

/* ------------------------------------------------------------------ mini DOM */
class El {
  constructor(tag) {
    this.tag = tag; this.children = []; this.parent = null;
    this.className = ''; this.dataset = {}; this.attrs = new Map();
    this.textContent = '';
    this.style = {props: new Map(),
      setProperty: (k, v) => this.style.props.set(k, v),
      removeProperty: k => this.style.props.delete(k)};
    this.classList = {
      add: (...names) => {
        const set = new Set(this.className.split(/\s+/).filter(Boolean));
        names.forEach(n => set.add(n)); this.className = [...set].join(' ');
      },
      contains: name => this.className.split(/\s+/).includes(name)
    };
  }
  setAttribute(name, value) {this.attrs.set(name, String(value));}
  getAttribute(name) {return this.attrs.get(name) ?? null;}
  append(...nodes) {for (const n of nodes) {n.parent = this; this.children.push(n);}}
  querySelector(selector) {
    const cls = selector.replace(/^\./, '');
    const walk = node => {
      for (const child of node.children) {
        if (child.classList.contains(cls)) return child;
        const found = walk(child); if (found) return found;
      }
      return null;
    };
    return walk(this);
  }
  querySelectorAll(selector) {
    const cls = selector.replace(/^\./, ''); const out = [];
    const walk = node => {for (const child of node.children) {
      if (child.classList.contains(cls)) out.push(child);
      walk(child);
    }};
    walk(this); return out;
  }
}
const doc = {createElement: tag => new El(tag)};

const strip = src => src.replace(/^import[^\n]*\n/gm, '').replace(/^export\s+/gm, '');
const presentation = strip(read('dist/table/presentation.js'));
const seatModule = strip(read('dist/table/four-seat-piece.js'));
const createAvatar = d => {
  const n = d.createElement('span'); n.classList.add('seat-avatar'); return n;
};
const decoratePiece = (node, seat) => {
  if (seat === 1) {
    node.setAttribute('data-cosmetic-piece', 'aurora');
    node.style.setProperty('--personal-mark', 'url(/assets/xo/aurora-1.svg)');
  }
};
const load = (body, params, exports) =>
  new Function(...params, body + '\nreturn {' + exports.join(',') + '};');
const {playerCard} = load(presentation, ['createAvatar'], ['playerCard']) (createAvatar);
const {fourSeatPiece} = load(seatModule, ['decoratePiece'], ['fourSeatPiece']) (decoratePiece);

/* Extract the real seat-badge branch from table.js by brace matching. */
function seatBranch() {
  const start = table.indexOf("if((game==='four'||game==='xo'||game==='gomoku')&&profile.name!=='等待加入')");
  assert.ok(start >= 0, 'seat-badge branch exists in table.js');
  // After the revert this is a single braceless statement: if(cond)card.append(...);
  const end = table.indexOf(';', start);
  assert.ok(end > start, 'single-statement seat branch');
  return table.slice(start, end + 1);
}
const runBranch = new Function('document', 'fourSeatPiece', 'profile', 'game', 'i', 'card',
  seatBranch() + '\nreturn card;');
const build = (game, i, name = '你') => {
  const card = playerCard(doc, {name, isSelf: i === 0, bot: i === 1}, i, i === 0);
  return runBranch(doc, fourSeatPiece, {name}, game, i, card);
};

/* ------------------------------------------------- the SQUARE frame itself */
test('seat portrait frames are soft squares, not circles', () => {
  assert.match(frameCss, /body\.table-home-theme \.players-panel \.seat \.seat-avatar\{\s*border-radius:22%;\s*\}/);
  assert.match(frameCss, /body\.table-home-theme \.players-panel \.empty-seat \.avatar-shell\{\s*border-radius:22%;\s*\}/);
  assert.match(html, /seat-frame-square\.css\?v=20261113-squareframe1/);
  // Deliberate override: table.css keeps its circular base (the leaderboard
  // frame test relies on it), and the new sheet is loaded AFTER it.
  assert.match(tableCss, /\.seat-avatar\{[^}]*border-radius:50%/);
  assert.ok(html.indexOf('seat-frame-square.css') > html.indexOf('table.css'),
    'square override loads after the circular base');
  assert.ok(html.indexOf('seat-frame-square.css') > html.indexOf('rank-badges.css'),
    'square override loads after the leaderboard frame');
  // Same radius family as the leaderboard.
  assert.match(rankCss, /body\.table-home-theme #leaderboard \.seat-avatar,\s*\.leaderboard-avatar\{[^}]*border-radius:22%/);
});

test('VIP crest portriats stay round so the circular ornament still fits', () => {
  assert.match(frameCss, /body\.table-home-theme \.players-panel \.seat:has\(\.avatar-frame\) \.seat-avatar\{\s*border-radius:50%;\s*\}/);
  assert.match(rankCss, /\.leaderboard-avatar\[data-frame="gold"\][\s\S]{0,180}border-radius:50%/);
});

/* --------------------------------------------------------- the 14:50 revert */
test('the avatar-replacement change is fully reverted', () => {
  assert.match(table, /if\(\(game==='four'\|\|game==='xo'\|\|game==='gomoku'\)&&profile\.name!=='等待加入'\)card\.append\(fourSeatPiece\(document,i\+1,profile\.name\)\)/);
  assert.doesNotMatch(table, /shell\.replaceWith\(mark\)/);
  assert.doesNotMatch(table, /mark\.classList\.add\('avatar-shell'\)/);
  assert.doesNotMatch(table, /card\.querySelector\('\.avatar-shell'\)/);
  // Right-hand badge sizing is back.
  assert.match(seatCss, /body\.xo-game \.four-seat-piece\{[\s\S]{0,180}flex:0 0 42px;width:42px;height:42px;[\s\S]{0,80}margin-left:auto/);
  assert.match(seatCss, /@media\(max-width:520px\)\{\s*body\.xo-game \.four-seat-piece\{flex:0 0 34px;width:34px;height:34px\}/);
  assert.match(html, /four-seat-piece\.css\?v=20261113-gomokuseat1/);
  assert.doesNotMatch(html, /xoseat2/);
});

test('xo keeps the smiley avatar AND the right-hand X/O badge', () => {
  for (let i = 0; i < 2; i++) {
    const card = build('xo', i, i === 0 ? '你' : '电脑');
    assert.equal(card.children.length, 3, 'avatar + name + badge');
    const shell = card.children[0];
    assert.ok(shell.classList.contains('avatar-shell'), 'smiley avatar slot kept');
    assert.ok(shell.querySelector('.seat-avatar'), 'the portrait is still there');
    assert.ok(!shell.classList.contains('four-seat-piece'), 'not replaced by a mark');
    assert.ok(card.children[1].classList.contains('seat-copy'));
    const badge = card.children[2];
    assert.ok(badge.classList.contains('four-seat-piece'), 'X/O badge on the right');
    assert.equal(badge.dataset.player, String(i + 1));
  }
});

test('connect four is unchanged: avatar + name + coin on the right', () => {
  for (let i = 0; i < 2; i++) {
    const card = build('four', i);
    assert.equal(card.children.length, 3);
    assert.ok(card.children[0].classList.contains('avatar-shell'));
    assert.ok(card.children[2].classList.contains('four-seat-piece'));
    assert.equal(card.children[2].dataset.player, String(i + 1));
  }
});

test('empty seats never get a badge', () => {
  const card = playerCard(doc, {name: '等待加入'}, 1, false);
  const out = runBranch(doc, fourSeatPiece, {name: '等待加入'}, 'xo', 1, card);
  assert.equal(out.querySelectorAll('.four-seat-piece').length, 0);
  assert.ok(out.children[0].classList.contains('avatar-shell'));
});

/* The flight-party play screen uses .player-avatar; visual-v2.css still draws
   it as a circle. It belongs to the same portrait family, so the shared frame
   file corrects the shape here too (scoped by this page's own container IDs). */
test('flight-party play and lobby portraits use the same soft-square frame', () => {
  const block = rankCss.match(/#players \.player-avatar,\s*#seat-grid \.seat-avatar\{([^}]*)\}/);
  assert.ok(block, 'one shared rule covers the play screen and the lobby');
  assert.match(block[1], /border-radius:\s*22%/);
  assert.match(block[1], /background-color:\s*#F3D2AD/, 'no seat-colour crescents');
  assert.ok(!/border-radius:\s*50%/.test(block[1]));
  const exception = rankCss.slice(rankCss.indexOf('#players .player-avatar[data-frame="gold"]'));
  assert.match(exception, /border-radius:\s*50%/, 'circular VIP crests keep a round portrait');
  // The circular base still lives in visual-v2.css; the override must load later.
  const v2 = read('dist/visual-v2.css');
  assert.match(v2, /\.player-avatar\{[^}]*border-radius:50%/);
  assert.ok(flightHtml.indexOf('rank-badges.css') > flightHtml.indexOf('visual-v2.css'),
    'square override loads after the circular base');
  assert.match(flightHtml, /rank-badges\.css\?v=20261113-avatarframe1&d=20261115-squareall1/,
    'the flight page pulls the fresh stylesheet without forking the shared key');
});
