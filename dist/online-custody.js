/* JoyFlock online-room custody — the single shared contract for how a real
   player's online seat behaves after someone leaves.

   Scope (see docs/ONLINE-GAME-MANAGEMENT.md):
   * Applies ONLY to managed online rooms: at least two real human identities.
     "Play computer" / a room whose opponents are server bots is NOT managed:
     leaving ends it and entering again starts a fresh game.
   * active -> (leave / disconnect) -> grace (30s visible countdown) -> hosted
     (an EASY bot plays). An online but idle active seat goes straight to
     hosted when its own 30s turn clock expires. Reconnecting, or any real
     pointer/key activity, returns the same seat to active.
   * A hosted turn has NO visible countdown: the easy bot plays at its own
     short pace. Only a real human turn keeps the 30s clock on screen.
   * Every seat may be hosted at once; the game still runs to completion.
   * A seat that ends in grace/hosted writes no data and receives no points.
   * Rooms, custody, reconnection targets and score ledgers are isolated per
     game. `custodyStorageKey(game)` is the only cross-page storage contract.

   This module is pure: no DOM, no storage, no network. The Java services keep
   the authoritative copy (com.flightparty.online.CustodyPolicy); the browser
   only renders what the server sends. */

export const RECONNECT_GRACE_MS = 30000;
/** Visible turn countdown for an online (but idle) real player. */
export const IDLE_TURN_MS = 30000;
/** Hosted turns are not clocked: the easy bot moves at this short pace. */
export const HOSTED_PACE_MS = 1200;
export const HOST_BOT_LEVEL = 'easy';

export const CUSTODY_ACTIVE = 'active';
export const CUSTODY_GRACE = 'grace';
export const CUSTODY_HOSTED = 'hosted';
export const SEAT_BOT = 'bot';

export const CUSTODY_STORAGE_PREFIX = 'joyflock.online.room.';

/* Per-game isolation: a room id remembered for `four` can never be used to
   re-enter `pool`, and custody in one game never touches another. */
export function custodyStorageKey(game){
  return CUSTODY_STORAGE_PREFIX + String(game || 'flight');
}

/* Two real human identities are required for the managed online flow. Public
   snapshots never expose a principal, so the server also sends `managed`. */
export function managedHumanSeats(seats){
  if(!Array.isArray(seats))return 0;
  return seats.filter(s=>s && (s.principal != null || s.human === true || (!s.bot && s.displayName))).length;
}
export function isManagedOnlineRoom(room){
  if(!room)return false;
  if(typeof room.managed === 'boolean')return room.managed;
  return room.phase === 'PLAYING' && managedHumanSeats(room.seats) >= 2;
}

/* A room whose opponents are computers: no grace, no custody, no reconnect. */
export function isComputerMatch(room){
  if(!room)return false;
  if(typeof room.managed === 'boolean')return !room.managed;
  return managedHumanSeats(room.seats) < 2;
}

/* Accept the server's `custody` string plus legacy/alternate shapes, so a
   rolling deploy cannot show the wrong badge. */
function normalized(seat){
  const raw = seat.custody ?? seat.state;
  if(raw === CUSTODY_ACTIVE || raw === CUSTODY_GRACE || raw === CUSTODY_HOSTED || raw === SEAT_BOT)return raw;
  if(seat.hosted === true)return CUSTODY_HOSTED;
  if(seat.bot === true && seat.human !== true)return SEAT_BOT;
  return CUSTODY_ACTIVE;
}

/* `serverNow` is the caller's best estimate of the authoritative clock. The
   page computes it from `room.serverNow` plus the local elapsed time, so the
   countdown never depends on the client's absolute clock. */
export function custodyState(seat, serverNow = Date.now()){
  if(!seat)return CUSTODY_ACTIVE;
  const state = normalized(seat);
  if(state === SEAT_BOT)return SEAT_BOT;
  if(state === CUSTODY_HOSTED)return CUSTODY_HOSTED;
  if(state === CUSTODY_GRACE){
    const until = Number(seat.graceUntil || 0);
    if(until > 0 && until <= serverNow)return CUSTODY_HOSTED;
    return CUSTODY_GRACE;
  }
  return CUSTODY_ACTIVE;
}

export function graceSecondsLeft(graceUntil, serverNow = Date.now()){
  return Math.max(0, Math.ceil((Number(graceUntil || 0) - serverNow) / 1000));
}

/* Derive the authoritative clock from a snapshot received at `receivedAt`. */
export function serverClock(serverNow, receivedAt, now = Date.now()){
  return Number(serverNow || 0) + (now - Number(receivedAt || 0));
}

export const CUSTODY_LABELS = {
  zh: {
    grace: '等待重连',
    hosted: '托管中 · 简单电脑',
    graceHint: '玩家已离开，30 秒内回来可继续本局',
    hostedHint: '由简单电脑代走，重新进入或动一下鼠标即可接管原席位',
    noScore: '本局以托管结束，不记录数据、不计 Joy Coins',
    seconds: 's'
  },
  en: {
    grace: 'Reconnecting',
    hosted: 'Hosted · Easy bot',
    graceHint: 'Player left — 30s to return to this match',
    hostedHint: 'An easy bot is playing; re-enter or move the mouse to take over your seat',
    noScore: 'Finished while hosted — no data, no Joy Coins',
    seconds: 's'
  }
};

export function custodyLabel(state, lang = 'zh', seconds = 0){
  const l = CUSTODY_LABELS[lang === 'en' ? 'en' : 'zh'];
  if(state === CUSTODY_GRACE)return l.grace + ' ' + seconds + l.seconds;
  if(state === CUSTODY_HOSTED)return l.hosted;
  return '';
}

/* Build everything a seat card needs, in one place, for every game. */
export function seatCustody(room, index, serverNow = Date.now(), lang = 'zh'){
  if(!room)return {state: CUSTODY_ACTIVE, label: '', hint: '', seconds: 0, managed: false, noScore: false};
  const list = Array.isArray(room.seats) ? room.seats : null;
  const seat = list ? list[index] : {
    custody: Array.isArray(room.custody) ? room.custody[index] : CUSTODY_ACTIVE,
    graceUntil: Array.isArray(room.graceUntil) ? room.graceUntil[index] : 0,
    bot: Array.isArray(room.bots) ? room.bots[index] : false
  };
  const state = custodyState(seat, serverNow);
  const seconds = graceSecondsLeft(seat && seat.graceUntil, serverNow);
  const l = CUSTODY_LABELS[lang === 'en' ? 'en' : 'zh'];
  return {
    state,
    lang,
    seconds,
    label: custodyLabel(state, lang, seconds),
    hint: state === CUSTODY_GRACE ? l.graceHint : state === CUSTODY_HOSTED ? l.hostedHint : '',
    managed: isManagedOnlineRoom(room),
    noScore: !shouldRecordResult(state)
  };
}

/* Hosted seats are excluded from every score/statistics write, on the server
   and in the browser's local points display. A player who came back before the
   game ended is `active` again and scores normally. */
export function shouldRecordResult(state){
  return state !== CUSTODY_HOSTED && state !== CUSTODY_GRACE;
}

/* The 30s turn clock belongs to a real human turn only. A hosted seat (or a
   native bot) has no countdown: the easy bot simply plays at its own pace. */
export function turnClockVisible(state){
  return state !== CUSTODY_HOSTED && state !== SEAT_BOT;
}

/* An online-but-idle ACTIVE seat is hosted by the server when its turn clock
   runs out. The browser uses the same predicate to decide whether a pointer
   event must be reported as fresh presence (only grace/hosted seats are). */
export function hostOnIdle(state, turnDeadline, serverNow = Date.now()){
  return state === CUSTODY_ACTIVE && Number(turnDeadline || 0) > 0
    && Number(turnDeadline) <= serverNow;
}

/* A pointer/key event or a fresh page load is real presence. Plain polling
   snapshots are deliberately NOT presence, otherwise an idle-but-online seat
   would keep cancelling its own custody state. */
export function needsPresenceSignal(state){
  return state === CUSTODY_GRACE || state === CUSTODY_HOSTED;
}

/* Reconnecting is just re-entering the same game's existing room. */
export function reconnectTarget(game, roomId){
  return {game: String(game || 'flight'), roomId: String(roomId || '')};
}
