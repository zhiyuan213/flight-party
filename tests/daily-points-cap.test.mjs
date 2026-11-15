/* 2026-11-15 · Daily 5000-point allowance + equal result-dialog row spacing.

   The cap lives in ONE place (dist/game-points.js, the only scorer). The
   shared result dialog (dist/table/result-points.js) merely renders the
   snapshot's `daily` numbers as one caption-free row ABOVE 当前积分, and both
   figures count up in READING ORDER (upper row first, lower row second).
   Both halves are executed here in tiny VM / mini-DOM harnesses; the rest
   guards the wiring and the shared cache chain so a rolling deploy cannot
   silently drop the new row / order. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import {
  RESULT_POINTS_VERSION, formatPoints, awardFromSnapshot, dailyFromSnapshot,
  createResultPointsTicker
} from '../dist/table/result-points.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const scorer = read('dist/game-points.js');
const ticker = read('dist/table/result-points.js');
const css = read('dist/table/result-points.css');
const KEY = 'joyflock.gamepoints.v1';
const chain = [
  'dist/app.js', 'dist/live-room-ui.js', 'dist/online-custody-ui.js',
  'dist/pool-result-preview.html', 'dist/table/index.html',
  'dist/table/pool-shell.js', 'dist/table/result-points.js', 'dist/table/table.js'
];

/* --------------------------------------------------------- scorer harness */
function scorerSandbox({store = new Map(), signedIn = false} = {}) {
  const listeners = {};
  if (signedIn) store.set('joyflock.accountName', 'zhiyuanC');
  const html = {lang: 'zh-CN', getAttribute: k => k === 'data-locale' ? 'zh' : null};
  const document = {
    documentElement: html, cookie: '', readyState: 'complete',
    querySelector: () => null, getElementById: () => null,
    createElement: () => ({}), addEventListener() {}
  };
  const win = {
    addEventListener(type, fn) {(listeners[type] ??= []).push(fn);},
    dispatchEvent(event) {(listeners[event.type] || []).forEach(fn => fn(event));}
  };
  win.parent = win; // no postMessage in the isolated test
  const context = {
    window: win, document,
    localStorage: {
      getItem: k => store.has(k) ? store.get(k) : null,
      setItem: (k, v) => store.set(k, v),
      removeItem: k => store.delete(k)
    },
    CustomEvent: class {constructor(type, options) {this.type = type; this.detail = options?.detail;}},
    MutationObserver: class {observate() {} observe() {}},
    URLSearchParams, location: {origin: 'http://localhost', search: '?game=four'},
    setTimeout: () => 0, clearTimeout() {}, console
  };
  runInNewContext(scorer, context);
  return {
    api: win.__joyflockGamePoints, store,
    fire(type, detail) {(listeners[type] || []).forEach(fn => fn({type, detail}));}
  };
}
const PLAY = {game: 'pool', players: 2, winner: 1, seat: 0, over: true};

/* --------------------------------------------------------- ticker harness */
function tickerHarness({locale = 'zh', reduced = false} = {}) {
  const listeners = {}, observers = [], timers = new Map(), frames = new Map();
  const coins = [];
  let now = 0, timerId = 0, frameId = 0;
  const make = (tag = 'div') => ({
    tagName: tag.toUpperCase(), className: '', textContent: '', hidden: false,
    dataset: {}, attributes: {}, children: [], isConnected: true, parent: null,
    setAttribute(k, v) {this.attributes[k] = v;},
    getAttribute(k) {return Object.hasOwn(this.attributes, k) ? this.attributes[k] : null;},
    append(...kids) {for (const k of kids) {k.parent = this; this.children.push(k);}},
    closest() {return null;}
  });
  const documentElement = make('html');
  documentElement.lang = locale === 'en' ? 'en' : 'zh-CN';
  documentElement.setAttribute('data-locale', locale);
  const doc = {documentElement, createElement: make};
  const env = {
    window: {
      addEventListener(type, fn) {(listeners[type] ??= []).push(fn);},
      __joyflockResultSfx: {coinTick(final) {coins.push({final: !!final, at: now}); return true;}}
    },
    matchMedia: () => ({matches: reduced}),
    setTimeout(fn, ms) {const id = ++timerId; timers.set(id, {fn, at: now + ms}); return id;},
    clearTimeout(id) {timers.delete(id);},
    requestAnimationFrame(fn) {const id = ++frameId; frames.set(id, fn); return id;},
    cancelAnimationFrame(id) {frames.delete(id);},
    MutationObserver: class {constructor(fn) {observers.push(fn);} observe() {}}
  };
  const t = createResultPointsTicker(doc, env);
  return {
    t, coins,
    fire(detail) {(listeners['joyflock:game-points'] || []).forEach(fn => fn({detail}));},
    switchLocale(next) {
      documentElement.lang = next === 'en' ? 'en' : 'zh-CN';
      documentElement.setAttribute('data-locale', next);
      observers.forEach(fn => fn());
    },
    /* One virtual 16ms frame per step, exactly like the module's own clock. */
    tick(ms, sample) {
      const steps = Math.ceil(ms / 16);
      for (let i = 0; i < steps; i++) {
        now += 16;
        for (const [id, item] of [...timers]) if (item.at <= now) {timers.delete(id); item.fn();}
        const due = [...frames]; frames.clear();
        for (const [, fn] of due) fn(now);
        if (sample) sample();
      }
    }
  };
}

/* ------------------------------------------------------------ pure helpers */
test('dailyFromSnapshot clamps malformed values and never draws a broken bar', () => {
  assert.equal(dailyFromSnapshot(null), null);
  assert.equal(dailyFromSnapshot({}), null);
  assert.equal(dailyFromSnapshot({daily: {cap: 0}}), null);
  assert.deepEqual(dailyFromSnapshot({daily: {date: '2026-11-14', cap: 2000, earned: 1240}}), {
    date: '2026-11-14', cap: 2000, earned: 1240, remaining: 760, reached: false, pct: 62
  });
  assert.deepEqual(dailyFromSnapshot({daily: {date: 'x', cap: 2000, earned: 9999}}), {
    date: 'x', cap: 2000, earned: 2000, remaining: 0, reached: true, pct: 100
  });
  assert.equal(dailyFromSnapshot({daily: {cap: 2000, earned: -50}}).earned, 0);
  assert.equal(formatPoints(2000), '2,000');
});

test('a fully capped day still produces a visible result panel', () => {
  assert.equal(awardFromSnapshot({points: 400, last: {points: 0}}), null,
    'a plain render-only snapshot is not an award');
  assert.deepEqual(
    awardFromSnapshot({points: 3550, last: {points: 0, capped: true, full: 200}, signedIn: true}),
    {reward: 0, base: 0, bonus: 0, bonusPct: 0, before: 3550, after: 3550, signedIn: true});
  assert.deepEqual(
    awardFromSnapshot({points: 400, last: {points: 200}, signedIn: true}),
    {reward: 200, base: 0, bonus: 0, bonusPct: 0, before: 200, after: 400, signedIn: true},
    'the classic award shape is unchanged');
});

/* -------------------------------------------------------------- the cap */
test('a fresh day starts at 0 / 5000 and credits the whole award', () => {
  const s = scorerSandbox({signedIn: true});
  assert.equal(s.api.dailyCap, 5000);
  const d0 = s.api.get().daily;
  assert.match(d0.date, /^\d{4}-\d{2}-\d{2}$/, 'local calendar day, not UTC');
  assert.deepEqual({cap: d0.cap, earned: d0.earned, remaining: d0.remaining,
    reached: d0.reached, pct: d0.pct}, {cap: 5000, earned: 0, remaining: 5000, reached: false, pct: 0});

  const r = s.api.record({...PLAY, key: 'a1'});
  assert.deepEqual({points: r.points, full: r.full, capped: r.capped}, {points: 200, full: 200, capped: false});
  assert.equal(s.api.get().points, 200);
  assert.equal(s.api.get().daily.earned, 200);
  assert.equal(s.api.get().daily.remaining, 4800);
  assert.equal(s.api.get().daily.pct, 4);
  assert.equal(s.api.get().last.capped, false);
});

test('an award crossing 5000 is clipped to the remaining allowance', () => {
  const s = scorerSandbox({signedIn: true});
  const today = s.api.get().daily.date;
  s.api.sync({games: 5, wins: 2, points: 3450, byGame: {}, last: null,
    daily: {date: today, earned: 4900, cap: 5000}});
  /* rank 1 = 200 base, +20% difficulty bonus = 240, only 100 still allowed. */
  const r = s.api.record({...PLAY, key: 'clip', bonusPct: 20});
  assert.equal(r.points, 100);
  assert.equal(r.full, 240);
  assert.equal(r.capped, true);
  assert.equal(s.api.get().points, 3550, 'only the credited 100 joins the total');
  assert.equal(s.api.get().games, 6, 'the game still counts as played');
  assert.deepEqual({earned: s.api.get().daily.earned, remaining: s.api.get().daily.remaining,
    reached: s.api.get().daily.reached, pct: s.api.get().daily.pct},
    {earned: 5000, remaining: 0, reached: true, pct: 100});
  assert.equal(s.api.get().last.points, 100);
  assert.equal(s.api.get().last.full, 240);
  assert.equal(s.api.get().last.capped, true);
});

test('after the cap every further game adds 0 points but keeps its stats', () => {
  const s = scorerSandbox({signedIn: true});
  const today = s.api.get().daily.date;
  s.api.sync({games: 9, wins: 9, points: 9000, byGame: {}, last: null,
    daily: {date: today, earned: 5000, cap: 5000}});
  const r = s.api.record({...PLAY, key: 'capped'});
  assert.equal(r.points, 0);
  assert.equal(r.full, 200);
  assert.equal(r.capped, true);
  assert.equal(s.api.get().points, 9000, 'the total must not grow past the cap');
  assert.equal(s.api.get().games, 10);
  assert.equal(s.api.get().daily.earned, 5000);
});

test('the allowance rolls over at local midnight and survives reloads', () => {
  const s = scorerSandbox({signedIn: true});
  s.api.record({...PLAY, key: 'yesterday'});
  assert.equal(s.api.get().daily.earned, 200);
  const saved = JSON.parse(s.store.get(KEY));
  assert.equal(saved.daily.earned, 200, 'the counter is part of the persisted record');
  const again = scorerSandbox({store: s.store, signedIn: true});
  assert.equal(again.api.get().daily.earned, 200, 'a reload does not reopen the budget');

  s.api.sync({games: 0, wins: 0, points: 0, byGame: {}, last: null,
    daily: {date: '2000-01-01', earned: 4950, cap: 5000}});
  const r = s.api.record({...PLAY, key: 'new-day'});
  assert.equal(r.points, 200, 'a stale date grants a fresh 5000');
  assert.equal(s.api.get().daily.earned, 200);
  assert.notEqual(s.api.get().daily.date, '2000-01-01');
});

test('reset() and sign-out cannot lift the daily cap; guests never persist', () => {
  const s = scorerSandbox({signedIn: true});
  s.api.record({...PLAY, key: 'keep'});
  s.api.reset();
  assert.equal(s.api.get().points, 0);
  assert.equal(s.api.get().daily.earned, 200, 'clearing stats must not clear the allowance');

  const guest = scorerSandbox();
  assert.equal(guest.api.isSignedIn(), false);
  guest.api.record({...PLAY, key: 'guest'});
  assert.equal(guest.api.get().daily.earned, 200, 'a guest still sees the live bar');
  assert.equal(guest.store.has(KEY), false, 'a guest writes nothing to storage');
});

/* A difficulty bonus rewards BEATING a stronger computer; a loss or a draw
   keeps only the consolation base. Regression for the "本局失利 +50%" dialog. */
test('a loss or a draw never earns the difficulty bonus', () => {
  const s = scorerSandbox({signedIn: true});
  const loss = s.api.record({...PLAY, winner: 2, seat: 0, key: 'loss', bonusPct: 50});
  assert.deepEqual(
    {points: loss.points, full: loss.full, bonus: loss.bonus, bonusPct: loss.bonusPct},
    {points: 100, full: 100, bonus: 0, bonusPct: 0});
  assert.deepEqual(
    {base: s.api.get().last.base, bonus: s.api.get().last.bonus}, {base: 100, bonus: 0});

  const draw = s.api.record({...PLAY, winner: 0, seat: 0, key: 'draw', bonusPct: 50});
  assert.deepEqual(
    {points: draw.points, full: draw.full, bonus: draw.bonus, bonusPct: draw.bonusPct},
    {points: 100, full: 100, bonus: 0, bonusPct: 0});

  const win = s.api.record({...PLAY, key: 'win', bonusPct: 50});
  assert.deepEqual(
    {points: win.points, full: win.full, bonus: win.bonus, bonusPct: win.bonusPct},
    {points: 300, full: 300, bonus: 100, bonusPct: 50});
  assert.equal(s.api.get().daily.earned, 500, '100 + 100 + 300');
  assert.equal(s.api.get().wins, 1, 'only the win counts as a win');
});

test('a lost round hides the difficulty-bonus breakdown in the dialog', () => {
  const h = tickerHarness();
  h.fire(ROUND('loss', 200,
    {points: 100, base: 100, bonus: 0, bonusPct: 0, full: 100, capped: false}, 100));
  assert.equal(h.t.rewardValue.textContent, '+100 Joy Coins');
  assert.equal(h.t.breakdownRow.hidden, true, 'no "100 + 50（+50%）" row after a loss');
});

test('all three hosts load the win-only scorer without forking the shared key', () => {
  for (const page of ['dist/index.html', 'dist/table/index.html', 'dist/portal/index.html']) {
    assert.match(read(page),
      /game-points\.js\?v=20261112-gamelanes1&d=20261115-joincoin1&r=20261115-nolossbonus1/,
      `${page}: fresh scorer URL`);
  }
});

/* ------------------------------------------------------- dialog rendering */
const ROUND = (key, points, last, earned) => ({points, signedIn: true, last,
  daily: {date: '2026-11-14', cap: 2000, earned}});

test('the daily row sits ABOVE 当前积分 with NO caption text (zh / en)', () => {
  const h = tickerHarness();
  h.fire(ROUND('a', 7870,
    {points: 120, base: 100, bonus: 20, bonusPct: 20, full: 120, capped: false}, 1240));
  assert.equal(h.t.dailyWrap.hidden, false);
  assert.equal(h.t.dailyLabel.textContent, '每日 Joy Coins 上限');
  assert.equal(h.t.dailyWrap.children.length, 1, 'only the labelled row — no progress bar');
  assert.doesNotMatch(ticker, /dailyNote|dailyCaption|capDone/);
  assert.doesNotMatch(css, /pool-result-daily-note/);
  assert.equal(h.t.dailyValue.textContent, '1,120 / 2,000',
    'the daily figure starts at the pre-award value so it can count up');
  assert.equal(h.t.dailyWrap.dataset.reached, 'false');
  assert.match(h.t.panel.getAttribute('aria-label'), /今日已获得 1,240 \/ 2,000 Joy Coins/);
  assert.equal(h.t.breakdownRow.hidden, false, 'an uncapped round keeps its bonus breakdown');
  const order = h.t.panel.children;
  assert.equal(order.indexOf(h.t.dailyWrap), 2, 'the daily block is the third row');
  assert.equal(order.at(-1), h.t.totalRow, '当前积分 is now the last row');
  assert.ok(order.indexOf(h.t.dailyWrap) < order.indexOf(h.t.totalRow),
    'the daily allowance is displayed ABOVE 当前积分');

  h.switchLocale('en');
  assert.equal(h.t.dailyLabel.textContent, 'Daily Joy Coins cap');
  assert.equal(h.t.dailyWrap.children.length, 1, 'still no bar in English either');
});

test('the UPPER row counts up first, then 当前积分 BELOW it, both with coin ticks', () => {
  const h = tickerHarness();
  h.fire(ROUND('b', 7870,
    {points: 120, base: 100, bonus: 20, bonusPct: 20, full: 120, capped: false}, 1240));
  h.t.reveal();
  assert.equal(h.t.panel.dataset.phase, 'reward');
  const samples = [];
  h.tick(5200, () => samples.push({
    phase: h.t.panel.dataset.phase,
    total: h.t.totalValue.textContent,
    daily: h.t.dailyValue.textContent,
    coins: h.coins.length
  }));
  assert.equal(h.t.panel.dataset.phase, 'done');
  assert.equal(h.t.totalValue.textContent, '7,870');
  assert.equal(h.t.dailyValue.textContent, '1,240 / 2,000');

  assert.deepEqual([...new Set(samples.map(s => s.phase))],
    ['reward', 'daily', 'counting', 'done'], 'the two stages follow the display order');
  const dailyDone = samples.findIndex(s => s.daily === '1,240 / 2,000' && s.phase !== 'reward');
  const totalStarts = samples.findIndex(s => s.total !== '7,750');
  assert.ok(dailyDone >= 0 && totalStarts > dailyDone,
    'the upper daily figure must land BEFORE the lower total starts growing');
  assert.equal(samples[totalStarts].phase, 'counting');
  const dailyFrames = samples.filter(s => s.phase === 'daily');
  assert.ok(dailyFrames.every(s => s.total === '7,750'),
    'the lower total waits at its pre-award value while the upper row counts');
  const dailyValues = [...new Set(samples.map(s => s.daily))];
  assert.ok(dailyValues.length > 50, 'the upper figure prints every integer, not a single jump');
  assert.ok(dailyValues.includes('1,180 / 2,000'));
  assert.ok(dailyFrames.at(-1).coins > dailyFrames[0].coins,
    'coin ticks keep firing during the upper count-up');
  const totalFrames = samples.filter(s => s.phase === 'counting');
  assert.ok(totalFrames.at(-1).coins > totalFrames[0].coins,
    'coin ticks keep firing during the lower count-up too');
  assert.equal(h.coins.filter(c => c.final).length, 1, 'one closing coin, at the very end');
  assert.equal(h.t.dailyWrap.children.length, 1, 'still no bar after the animation');
});

test('a capped round explains the clipped award only in the aria label', () => {
  const h = tickerHarness();
  h.fire(ROUND('c', 3550,
    {points: 0, base: 100, bonus: 20, bonusPct: 20, full: 240, capped: true}, 2000));
  h.t.reveal();
  h.tick(1200);
  assert.equal(h.t.rewardValue.textContent, '+0 Joy Coins');
  assert.equal(h.t.breakdownRow.hidden, true, '100 + 20 would contradict the 0 credit');
  assert.equal(h.t.dailyValue.textContent, '2,000 / 2,000');
  assert.equal(h.t.dailyWrap.dataset.reached, 'true');
  assert.equal(h.t.award.reward, 0, 'the capped snapshot is a real award, not a render');
  assert.match(h.t.panel.getAttribute('aria-label'), /今日已达上限，本局原 \+240 Joy Coins/);
  assert.equal(h.t.dailyWrap.children.length, 1, 'no bar even when capped');
  assert.equal(h.t.panel.dataset.phase, 'done', 'a 0-point round skips the daily stage');

  h.switchLocale('en');
  assert.match(h.t.panel.getAttribute('aria-label'), /Daily cap reached, this round was \+240/);
});

test('reduced motion snaps both figures to their final values', () => {
  const h = tickerHarness({reduced: true});
  h.fire(ROUND('d', 7870,
    {points: 120, base: 100, bonus: 20, bonusPct: 20, full: 120, capped: false}, 1240));
  h.t.reveal();
  assert.equal(h.t.panel.dataset.phase, 'done');
  assert.equal(h.t.totalValue.textContent, '7,870');
  assert.equal(h.t.dailyValue.textContent, '1,240 / 2,000');
  assert.equal(h.coins.length, 0, 'no coin cascade when motion is reduced');
});

test('a legacy snapshot without daily keeps the original three-row panel', () => {
  const h = tickerHarness();
  h.fire({points: 400, last: {points: 200}, signedIn: true});
  assert.equal(h.t.dailyWrap.hidden, true);
  assert.equal(h.t.dailyValue.textContent, '');
  assert.equal(h.t.totalValue.textContent, '');
  assert.doesNotMatch(h.t.panel.getAttribute('aria-label') || '', /今日/);
});

/* ------------------------------------------------------------- wiring */
test('the scorer owns the cap, the CSS equalises four rows and the chain is bumped', () => {
  assert.match(scorer, /var DAILY_CAP=5000;/);
  assert.match(scorer, /credited=Math\.min\(p\.points,Math\.max\(0,DAILY_CAP-day\.earned\)\)/);
  assert.match(scorer, /daily:dailyView\(\),signedIn:signedIn/);
  assert.match(ticker, /panel\.append\(rewardRow, breakdownRow, dailyWrap, totalRow\)/);
  /* The stage order must follow the DOM order: upper 'daily' first, then the
     lower 'counting' stage. A swap back to the old order fails this guard. */
  assert.match(ticker, /panel\.dataset\.phase = daily && dailyEndValue\(\) > dailyStartValue\(\) \? 'daily' : 'counting'/);
  assert.match(ticker, /if \(award\.after > award\.before\) \{\s*\n\s*panel\.dataset\.phase = 'counting';/);
  assert.match(ticker, /coinSfx\(\); dailyElapsed \+= dailyStepSize/);
  assert.match(ticker, /dailyStepSize = pointsStepMs\(dailyEndValue\(\) - dailyStartValue\(\)\)/);
  assert.doesNotMatch(ticker, /dailyNote|dailyCaption/);
  assert.match(css, /\.pool-result-points\{[^}]*gap:14px/);
  assert.match(css, /\.pool-result-points-row\{[^}]*align-items:center[^}]*min-height:22px/s);
  assert.doesNotMatch(css, /pool-result-daily-track|pool-result-daily-fill/);
  assert.doesNotMatch(ticker, /dailyTrack|dailyFill|progressbar/);
  assert.match(css, /\.pool-result-daily\[hidden\]\{display:none\}/);
  assert.match(css, /\.pool-result-daily\{[^}]*position:relative/);
  assert.match(css, /\[data-phase="daily"\] \.pool-result-points-row/);
  assert.match(css, /\[data-phase="daily"\] \.pool-result-daily-value\{color:var\(--result-accent\)\}/);
  assert.match(css, /\[data-phase="counting"\] \.pool-result-daily-value\{animation:pool-points-pop/);
  assert.doesNotMatch(css, /pool-result-daily-note/);
  assert.equal(RESULT_POINTS_VERSION, '20261115-joincoin1');
  for (const file of chain) {
    const text = read(file);
    assert.ok(text.includes('20261115-joincoin1'), `${file} uses the bumped key`);
    assert.ok(!text.includes('20261114-rematch1'), `${file} has no stale key`);
    assert.ok(!text.includes('20261114-hosted1'), `${file} has no stale key`);
    assert.ok(!text.includes('20261114-dailycap1'), `${file} has no stale key`);
    assert.ok(!text.includes('20261114-dailycap2'), `${file} has no stale key`);
    assert.ok(!text.includes('20261114-dailycap3'), `${file} has no stale key`);
    assert.ok(!text.includes('20261114-dailycap4'), `${file} has no stale key`);
    assert.ok(!text.includes('20261114-dailycap5'), `${file} has no stale key`);
    assert.ok(!text.includes('20261114-cardstable1'), `${file} has no stale key`);
  }
  /* game-points.js keeps its frozen VERSION (tied to the wallet chain), so the
     three hosts get a separate cache-bust parameter instead. */
  assert.match(scorer, /var VERSION='20261112-gamelanes1'/);
  for (const page of ['dist/index.html', 'dist/table/index.html', 'dist/portal/index.html']) {
    assert.match(read(page), /game-points\.js\?v=20261112-gamelanes1&d=20261115-joincoin1/);
  }
});
