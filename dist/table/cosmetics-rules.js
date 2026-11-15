/* Pure rules for the shared board-game cosmetics. No DOM, no storage: this
   module is imported by game-cosmetics.js AND by the Node test suite, so the
   arbitration order can be asserted without a browser.

   The FOUR board games arbitrate INDEPENDENTLY: game-cosmetics.js feeds this
   module the equipped board of the CURRENT game only, so a Connect Four board
   can never win Gomoku's arbitration. The rule itself is identical for every
   game (and still drives the shared billiard cloth).

   Rule (user spec): the board is PUBLIC. When BOTH sides equipped a special
   board, the winner is decided by
     1. membership tier: Annual VIP > VIP > normal
     2. higher cumulative GAME points (joyflock.gamepoints.v1)
     3. identical tier AND points -> a coin flip
   When only one side equipped a board, that board simply wins. */

export const VERSION = '20261112-gamelanes1';
export const THEMES = ['neon', 'crystal', 'jade', 'galaxy', 'aurora'];
export const TIER = {normal: 0, vip: 1, annual: 2};

/* A local match has no second account, so the computer opponent gets a
   deterministic practice profile derived from the chosen bot difficulty.
   Its tier is always `normal`: membership is a real-account property, and
   giving a bot VIP would make the tier branch untestable for a human VIP.
   An unset / invalid level falls back to EASY, matching the shared
   DEFAULT_BOT_LEVEL used by every computer-vs-player game. */
const BOT_POINTS = {easy: 0, normal: 200, pro: 600, hell: 1200};
const BOT_BOARD = {
  easy: 'board-neon', normal: 'board-neon',
  pro: 'board-jade', hell: 'board-aurora'
};
/* The same practice profile also equips a SHARED billiard table, so the
   arbitration branches can be exercised in a local Pool / Snooker match. */
const BOT_TABLE = {
  easy: 'table-neon', normal: 'table-neon',
  pro: 'table-jade', hell: 'table-aurora'
};

export function botOpponent(level) {
  const key = BOT_POINTS[level] === undefined ? 'easy' : level;
  return {
    tier: TIER.normal, points: BOT_POINTS[key], board: BOT_BOARD[key],
    table: BOT_TABLE[key], bot: true, level: key
  };
}

/* Accept several shapes because membership may come from the wallet API,
   /api/me appearance, or a room profile. */
export function tierOf(profile) {
  const p = profile || {};
  if (p.annualVip || p.annualMember || p.tier === 'annual' || p.tier === TIER.annual) return TIER.annual;
  if (p.vip || p.member || p.tier === 'vip' || p.tier === TIER.vip) return TIER.vip;
  return TIER.normal;
}

export function pointsOf(profile) {
  const n = Number(profile && profile.points);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/* `default` is the free baseline, not a theme. Callers turn it into an empty
   style (see game-cosmetics.js skinTheme) and publish no attribute at all.
   Both the old shared ids (`board-jade`) and the per-game ids
   (`gomoku-board-jade`) collapse to the same theme suffix; the game page
   decides which family an id belongs to before this is called. */
export function themeOf(id) {
  return String(id || '').replace(/^(?:(?:four|gomoku|chess|xo)-)?(?:pink-|white-|o-)?(?:piece|board|ball|cue|table)-/, '');
}

/* The SAME public-item rule drives a board-game board and a billiard cloth.
   `field` selects which equipped id is arbitrated, so a room can inject one
   profile per seat and both games share one implementation. */
export function resolveShared(me, opponent, field = 'board', rng = Math.random) {
  const A = me || {}, B = opponent || {};
  const mine = A[field] || '', theirs = B[field] || '';
  if (!mine && !theirs) return {id: '', winner: null, reason: 'none'};
  if (!mine) return {id: theirs, winner: 'b', reason: 'single'};
  if (!theirs) return {id: mine, winner: 'a', reason: 'single'};
  const ta = tierOf(A), tb = tierOf(B);
  if (ta !== tb) return ta > tb
    ? {id: mine, winner: 'a', reason: 'tier'}
    : {id: theirs, winner: 'b', reason: 'tier'};
  const pa = pointsOf(A), pb = pointsOf(B);
  if (pa !== pb) return pa > pb
    ? {id: mine, winner: 'a', reason: 'points'}
    : {id: theirs, winner: 'b', reason: 'points'};
  const pick = rng() < .5 ? 'a' : 'b';
  return {id: pick === 'a' ? mine : theirs, winner: pick, reason: 'random'};
}

/* Backwards-compatible entry point used by every existing board-game test. */
export function resolveBoard(me, opponent, rng = Math.random) {
  return resolveShared(me, opponent, 'board', rng);
}
