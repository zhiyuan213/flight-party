/* Result-dialog points reward — one award per finished game, shown as a
   "+N" badge first and then as a digit-by-digit count-up of the running total.

   The shared result dialog (pool-shell.js) covers all nine table games, so the
   reward cannot be hardcoded per game. game-points.js is the ONLY scorer: its
   record() broadcasts a `joyflock:game-points` snapshot right after the award,
   and this module derives both ends of the animation from that single snapshot:

       before = snapshot.points - snapshot.last.points
       after  = snapshot.points
       reward = snapshot.last.points

   Nothing here calls record(), so re-renders, dialog reopens, confetti reveals
   and the "查看本局结算" button can never add a second award. The badge is
   revealed immediately; the total row follows ~380ms later and ticks up one
   integer per frame until it reaches the post-award score.

   The scorer (game-points.js) also sends `daily` = {date, earned, cap, ...}.
   "今日 Joy Coins 上限" is displayed ABOVE "当前 Joy Coins". Both figures use the SAME
   one-coin-per-integer animation and sound, and they count up in READING
   ORDER: the UPPER row lands first (phase daily), then the LOWER row lands
   (phase counting -> done). This is deliberately a foreground effect:
   receive()/reveal() only play while the dialog is actually open.
   No caption text and no progress bar; the numbers tell the whole story.
   This module never computes or enforces the 5000-point cap itself. */
export const RESULT_POINTS_VERSION = '20261115-joincoin1';

const REWARD_DELAY = 380;

/* No caption and no progress bar: the `earned / cap` figure alone is enough.
   The clipped-award explanation survives only in the screen-reader label,
   so the dialog stays visually clean. */
/* ONE currency everywhere: the result dialog shows the SAME Joy Coins
   balance as the header pill and the shop. "Total points" was a second,
   unrelated counter — it is gone. */
const LABELS = {
  zh: {
    reward: '本局奖励', total: 'Joy Coins 余额', unit: 'Joy Coins', breakdown: '基础分 + 难度加成',
    daily: '每日 Joy Coins 上限',
    guest: '匿名战绩仅显示，不保存',
    aria: (reward, after) => `本局奖励 ${reward} Joy Coins，余额 ${after} Joy Coins`,
    dailyAria: (earned, cap) => `今日已获得 ${earned} / ${cap} Joy Coins`,
    cappedAria: full => `今日已达上限，本局原 +${full} Joy Coins`
  },
  en: {
    reward: 'Round reward', total: 'Joy Coins balance', unit: 'Joy Coins', breakdown: 'Base + difficulty bonus',
    daily: 'Daily Joy Coins cap',
    guest: 'Guest stats only, not saved',
    aria: (reward, after) => `Round reward +${reward} Joy Coins. Balance ${after} Joy Coins.`,
    dailyAria: (earned, cap) => `Daily Joy Coins ${earned} of ${cap}`,
    cappedAria: full => `Daily cap reached, this round was +${full} Joy Coins`
  }
};

export const formatPoints = n =>
  String(Math.max(0, Math.round(Number(n) || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/* ~16ms per integer keeps every value visible on a 60Hz display (200 steps
   ≈ 3.2s for a win). Smaller awards are stretched so the count-up still
   reads as a sequence instead of a single jump. */
export function pointsStepMs(delta) {
  if (!(delta > 0)) return 16;
  return Math.max(16, Math.min(28, 1800 / delta));
}
export function pointsValueAt(before, after, elapsed, stepMs = pointsStepMs(after - before)) {
  const delta = Math.max(0, after - before);
  if (!delta) return after;
  return Math.min(after, before + Math.floor(Math.max(0, elapsed) / stepMs));
}

/* Read the award straight out of the recorder's snapshot. `last` is set only
   by record(), so a plain render() / sync() snapshot never starts an award. */
export function awardFromSnapshot(snapshot) {
  const reward = Math.max(0, Number(snapshot?.last?.points) || 0);
  /* A fully capped day still produces an award snapshot with 0 credited points.
     Keep the panel visible so the player sees WHY nothing was added. Plain
     render-only snapshots (last=null or points=0 without the cap flag) are
     still ignored, so re-renders can never start a second animation. */
  const capped = snapshot?.last?.capped === true;
  if (!reward && !capped) return null;
  const base = Math.max(0, Number(snapshot?.last?.base) || 0);
  const bonus = Math.max(0, Number(snapshot?.last?.bonus) || 0);
  const bonusPct = Math.max(0, Number(snapshot?.last?.bonusPct) || 0);
  const after = Math.max(0, Number(snapshot?.points) || 0);
  return {reward, base, bonus, bonusPct, before: Math.max(0, after - reward), after, signedIn: !!snapshot?.signedIn};
}

/* The scorer owns the 2000-point rule; this panel only normalises the numbers
   it is given so a malformed / legacy snapshot can never draw a broken bar. */
export function dailyFromSnapshot(snapshot) {
  const raw = snapshot?.daily;
  const cap = Math.round(Number(raw?.cap) || 0);
  if (!(cap > 0)) return null;
  const earned = Math.max(0, Math.min(cap, Math.round(Number(raw?.earned) || 0)));
  return {
    date: String(raw?.date || ''), cap, earned,
    remaining: cap - earned,
    reached: earned >= cap,
    pct: Math.round(earned * 100 / cap)
  };
}

export function createResultPointsTicker(doc = document, env = globalThis) {
  const win = env.window || env;
  /* Coin "deposit" sound while the total counts up. The shared result-jingle
     module owns the AudioContext, the mute switches and a per-coin throttle,
     so this module only asks for a tick on each increment. */
  const coinSfx = final => { try { win.__joyflockResultSfx?.coinTick?.(final); } catch (e) {} };
  const make = (tag, className) => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    return node;
  };
  const panel = make('div', 'pool-result-points');
  panel.hidden = true;
  panel.setAttribute('role', 'group');
  const rewardRow = make('div', 'pool-result-points-row pool-result-reward-row');
  const rewardLabel = make('span', 'pool-result-points-label');
  const rewardValue = make('b', 'pool-result-reward');
  rewardRow.append(rewardLabel, rewardValue);
  const breakdownRow = make('div', 'pool-result-points-row pool-result-breakdown-row');
  const breakdownLabel = make('span', 'pool-result-points-label');
  const breakdownValue = make('b', 'pool-result-breakdown');
  breakdownRow.append(breakdownLabel, breakdownValue);
  const totalRow = make('div', 'pool-result-points-row pool-result-total-row');
  const totalLabel = make('span', 'pool-result-points-label');
  const totalValue = make('strong', 'pool-result-total');
  totalRow.append(totalLabel, totalValue);
  /* Daily cap: a single labelled row directly ABOVE "当前 Joy Coins", with no bar.
     Its figure counts up FIRST because it is the upper row; the total BELOW
     it follows once the daily figure has fully landed. `dailyWrap.hidden`
     keeps the old three-row layout for legacy snapshots with no `daily`. */
  const dailyWrap = make('div', 'pool-result-daily');
  dailyWrap.hidden = true;
  const dailyRow = make('div', 'pool-result-points-row pool-result-daily-row');
  const dailyLabel = make('span', 'pool-result-points-label');
  const dailyValue = make('b', 'pool-result-daily-value');
  dailyRow.append(dailyLabel, dailyValue);
  dailyWrap.append(dailyRow);
  /* Display order: 本局奖励 / 基础分 + 难度加成 / 今日 Joy Coins 上限 / 当前 Joy Coins.
     The count-up stages follow this exact order: upper row first, lower row
     second, so the eye never has to jump backwards while the points arrive. */
  panel.append(rewardRow, breakdownRow, dailyWrap, totalRow);

  let award = null, daily = null, capInfo = null, seq = 0, played = 0, frame = 0, timer = 0;
  /* A virtual clock rather than wall time: a real rAF cadence is 16.7ms (and
     can stall), so floor(elapsed / 16) would skip 201, 204, ... Advancing the
     virtual clock by exactly one step per frame prints EVERY integer from the
     old total to the rewarded total, which is the whole point of the effect.
     BOTH stages use the same virtual clock; the wall-clock guard is per stage
     (two sequential count-ups need roughly twice the budget of one). */
  let elapsed = 0, stepSize = 16, dailyElapsed = 0, dailyStepSize = 16, wallStart = 0;
  const WALL_CAP = 20000;
  const reduced = () => !!env.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const raf = fn => env.requestAnimationFrame
    ? env.requestAnimationFrame(fn)
    : env.setTimeout(() => fn(Date.now()), 16);
  const cancelFrame = id => {
    if (!id) return;
    env.cancelAnimationFrame ? env.cancelAnimationFrame(id) : env.clearTimeout(id);
  };
  const later = (fn, ms) => env.setTimeout ? env.setTimeout(fn, ms) : setTimeout(fn, ms);
  const cancelLater = id => {
    if (!id) return;
    env.clearTimeout ? env.clearTimeout(id) : clearTimeout(id);
  };
  const locale = () => {
    const root = doc.documentElement;
    const value = String(root?.getAttribute?.('data-locale') || root?.lang || 'zh').toLowerCase();
    return value.indexOf('en') === 0 ? 'en' : 'zh';
  };
  const L = () => LABELS[locale()];

  /* paint() owns the STATIC copy only. The two animated figures (total and
     daily) are driven by their own per-frame writers, so a locale switch or a
     MutationObserver repaint can never snap a running count-up to its end. */
  function paint() {
    const text = L();
    rewardLabel.textContent = text.reward;
    breakdownLabel.textContent = text.breakdown;
    totalLabel.textContent = text.total;
    dailyLabel.textContent = text.daily;
    if (!award) return;
    rewardValue.textContent = '+' + formatPoints(award.reward) + ' ' + text.unit;
    /* When the daily cap clipped this round, "100 + 20" would contradict a
       smaller credit: hide the breakdown (the aria label still explains it). */
    if (!capInfo?.capped && award.bonus > 0) {
      breakdownRow.hidden = false;
      breakdownValue.textContent = formatPoints(award.base) + ' + ' + formatPoints(award.bonus) + '（+' + Math.round(award.bonusPct) + '%）';
    } else {
      breakdownRow.hidden = true;
    }
    panel.title = award.signedIn ? '' : text.guest;
    let aria = text.aria(formatPoints(award.reward), formatPoints(award.after));
    if (daily) aria += ' ' + text.dailyAria(formatPoints(daily.earned), formatPoints(daily.cap));
    if (capInfo?.capped) aria += ' ' + text.cappedAria(formatPoints(capInfo.full));
    panel.setAttribute('aria-label', aria);
    if (!daily) { dailyWrap.hidden = true; return; }
    dailyWrap.hidden = false;
    dailyRow.setAttribute('aria-label', text.dailyAria(formatPoints(daily.earned), formatPoints(daily.cap)));
    dailyWrap.dataset.reached = String(daily.reached);
  }
  /* The daily figure starts where it was BEFORE this round and ends at the
     snapshot's `earned`. A capped round credits 0, so it has nothing to add. */
  const dailyStartValue = () => daily ? Math.max(0, daily.earned - award.reward) : 0;
  const dailyEndValue = () => daily ? daily.earned : 0;
  function paintDailyValue(value) {
    if (!daily) { dailyValue.textContent = ''; return; }
    const earned = Math.max(0, Math.min(daily.cap, Math.round(Number(value) || 0)));
    dailyValue.textContent = formatPoints(earned) + ' / ' + formatPoints(daily.cap);
  }
  function cancel() {
    cancelFrame(frame); frame = 0;
    cancelLater(timer); timer = 0;
    elapsed = 0; dailyElapsed = 0; wallStart = 0;
  }
  function showFinal() {
    cancel();
    if (!award) return;
    panel.dataset.phase = 'done';
    totalValue.textContent = formatPoints(award.after);
    paintDailyValue(dailyEndValue());
  }
  function complete() {
    frame = 0;
    panel.dataset.phase = 'done';
    coinSfx(true);
    totalValue.textContent = formatPoints(award.after);
    paintDailyValue(dailyEndValue());
    paint();
  }
  /* STAGE 1 "daily": add the round reward to TODAY'S allowance — the row
     ABOVE. STAGE 2 "counting": only AFTER that lands, add the same reward to
     the running total — the row BELOW. Both print every integer and fire one
     coin tick per integer, so the two figures arrive in reading order. */
  function step(now) {
    if (!award) return;
    if (!wallStart) wallStart = now;
    if (now - wallStart > WALL_CAP) { showFinal(); paint(); return; }
    if (panel.dataset.phase === 'daily') {
      const from = dailyStartValue(), to = dailyEndValue();
      const value = pointsValueAt(from, to, dailyElapsed, dailyStepSize);
      paintDailyValue(value);
      if (value < to) { coinSfx(); dailyElapsed += dailyStepSize; frame = raf(step); return; }
      /* The upper figure has landed — now the total BELOW it starts adding. */
      if (award.after > award.before) {
        panel.dataset.phase = 'counting';
        elapsed = 0; wallStart = 0;
        frame = raf(step); return;
      }
      complete(); return;
    }
    const value = pointsValueAt(award.before, award.after, elapsed, stepSize);
    totalValue.textContent = formatPoints(value);
    if (value < award.after) { coinSfx(); elapsed += stepSize; frame = raf(step); return; }
    complete();
  }
  function play() {
    if (!award) return;
    if (played === seq) { showFinal(); return; }
    played = seq;
    cancel();
    paint();
    stepSize = pointsStepMs(award.after - award.before);
    dailyStepSize = pointsStepMs(dailyEndValue() - dailyStartValue());
    panel.hidden = false;
    panel.dataset.phase = 'reward';
    totalValue.textContent = formatPoints(award.before);
    paintDailyValue(dailyStartValue());
    if (reduced()) { showFinal(); return; }
    timer = later(() => {
      timer = 0; elapsed = 0; dailyElapsed = 0; wallStart = 0;
      if (panel.hidden || !panel.isConnected) { showFinal(); return; }
      /* Read top-to-bottom: 今日 Joy Coins 上限 sits ABOVE 当前 Joy Coins, so it is the
         first stage. Legacy / capped snapshots with no daily increment go
         straight to the total stage (the old single count-up). */
      panel.dataset.phase = daily && dailyEndValue() > dailyStartValue() ? 'daily' : 'counting';
      frame = raf(step);
    }, REWARD_DELAY);
  }
  /* Only the dialog's own showModal() starts the reveal. A closed dialog must
     never burn the animation in the background and then reopen on the final
     number, which is why receive() does not auto-play on a hidden panel. */
  function reveal() {
    if (award && panel.isConnected) play();
  }
  function finish() {
    if (!award) return;
    cancel();
    panel.dataset.phase = 'done';
    totalValue.textContent = formatPoints(award.after);
    paintDailyValue(dailyEndValue());
  }
  function hide() {
    cancel();
    panel.hidden = true;
    delete panel.dataset.phase;
  }
  function receive(snapshot) {
    const next = awardFromSnapshot(snapshot);
    if (!next) return;
    award = next; seq++;
    daily = dailyFromSnapshot(snapshot);
    capInfo = {capped: snapshot?.last?.capped === true,
      full: Math.max(0, Number(snapshot?.last?.full ?? snapshot?.last?.points) || 0)};
    paint();
    paintDailyValue(dailyStartValue());
    /* Defensive path only: if an award arrives while the dialog is already
       open (Pool calls updateResult() before record(), other games after),
       animate at once instead of waiting for a reveal that already happened.
       A closed dialog never matches `dialog[open]`, so no animation is burnt
       off-screen. */
    if (played < seq && panel.isConnected && panel.closest?.('dialog[open]')) play();
  }

  win.addEventListener?.('joyflock:game-points', event => receive(event?.detail));
  const Observer = env.MutationObserver || (typeof MutationObserver !== 'undefined' ? MutationObserver : null);
  if (Observer && doc.documentElement) {
    new Observer(() => { if (award) paint(); }).observe(doc.documentElement,
      {attributes: true, attributeFilter: ['lang', 'data-locale']});
  }
  /* Safety net: some games open the result dialog through a delayed reveal
     (Pool waits for the shot replay, Snooker for the rolling balls). If a
     finished game's award arrived before the dialog opened, the first `open`
     attribute change on the dialog must still start the reveal even when the
     openResult() path is reached through a different code branch. */
  if (Observer && doc.body) {
    new Observer(() => {
      if (!award || played >= seq) return;
      const dialog = typeof panel.closest === 'function' ? panel.closest('dialog') : null;
      if (dialog && dialog.open) play();
    }).observe(doc.body, {subtree: true, attributes: true, attributeFilter: ['open']});
  }
  paint();
  return {
    panel, rewardLabel, rewardValue, breakdownRow, breakdownValue, totalRow, totalLabel, totalValue,
    dailyWrap, dailyRow, dailyLabel, dailyValue,
    receive, reveal, finish, hide, play,
    get award() { return award; },
    get daily() { return daily; },
    get seq() { return seq; },
    get played() { return played; }
  };
}
