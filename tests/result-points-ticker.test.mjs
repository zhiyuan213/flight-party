import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import {
  RESULT_POINTS_VERSION, formatPoints, pointsStepMs, pointsValueAt,
  awardFromSnapshot, createResultPointsTicker
} from '../dist/table/result-points.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const KEY = RESULT_POINTS_VERSION;

/* Deterministic clock: 16ms frames, real setTimeout for the reward delay, and
   a mini DOM whose text nodes are the values the dialog would paint. */
function harness({reduced = false, locale = 'zh'} = {}) {
  const listeners = {}, observers = [];
  const timers = new Map(), frames = new Map();
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
    window: {addEventListener(type, fn) {(listeners[type] ??= []).push(fn);}},
    matchMedia: () => ({matches: reduced}),
    setTimeout(fn, ms) {const id = ++timerId; timers.set(id, {fn, at: now + ms}); return id;},
    clearTimeout(id) {timers.delete(id);},
    requestAnimationFrame(fn) {const id = ++frameId; frames.set(id, fn); return id;},
    cancelAnimationFrame(id) {frames.delete(id);},
    MutationObserver: class {constructor(fn) {observers.push(fn);} observe() {}}
  };
  const ticker = createResultPointsTicker(doc, env);
  const api = {
    ticker, doc, env, observers,
    fire(detail) {(listeners['joyflock:game-points'] || []).forEach(fn => fn({detail}));},
    tick(ms) {
      const steps = Math.ceil(ms / 16);
      for (let i = 0; i < steps; i++) {
        now += 16;
        for (const [id, item] of [...timers]) if (item.at <= now) {timers.delete(id); item.fn();}
        const due = [...frames]; frames.clear();
        for (const [, fn] of due) fn(now);
      }
    },
    switchLocale(next) {
      documentElement.lang = next === 'en' ? 'en' : 'zh-CN';
      documentElement.setAttribute('data-locale', next);
      observers.forEach(fn => fn());
    },
    get frameCount() {return frames.size;}
  };
  return api;
}

test('the award comes only from the recorder snapshot, never from a plain render', () => {
  assert.deepEqual(awardFromSnapshot({points: 400, last: {points: 200}, signedIn: true}),
    {reward: 200, base: 0, bonus: 0, bonusPct: 0, before: 200, after: 400, signedIn: true});
  assert.equal(awardFromSnapshot({points: 400, last: null}), null);
  assert.equal(awardFromSnapshot(null), null);
  assert.equal(awardFromSnapshot({points: 400, last: {points: 0}}), null);
  assert.equal(awardFromSnapshot({points: 100250, last: {points: 250}, signedIn: false}).before, 100000);
  assert.equal(formatPoints(100250), '100,250');
  assert.equal(formatPoints(0), '0');
});

test('the counter visits every integer from the old total to the rewarded total', () => {
  assert.equal(pointsStepMs(200), 16);
  assert.equal(pointsStepMs(100), 18);
  assert.equal(pointsStepMs(50), 28);
  assert.equal(pointsValueAt(200, 400, 0), 200);
  assert.equal(pointsValueAt(200, 400, 16), 201);
  assert.equal(pointsValueAt(200, 400, 32), 202);
  assert.equal(pointsValueAt(200, 400, 3200), 400);
  assert.equal(pointsValueAt(200, 400, 99999), 400);

  const h = harness();
  h.fire({points: 400, last: {points: 200}, signedIn: true});
  assert.equal(h.ticker.panel.hidden, true, 'an award alone never reveals the panel');
  assert.equal(h.ticker.seq, 1);

  h.ticker.reveal();
  assert.equal(h.ticker.panel.hidden, false);
  assert.equal(h.ticker.panel.dataset.phase, 'reward');
  assert.equal(h.ticker.rewardLabel.textContent, '本局奖励');
  assert.equal(h.ticker.totalLabel.textContent, 'Joy Coins 余额');
  assert.equal(h.ticker.rewardValue.textContent, '+200 Joy Coins');
  assert.equal(h.ticker.totalValue.textContent, '200', 'the total starts at the pre-award score');
  assert.equal(h.ticker.panel.title, '');

  const early = [];
  for (let i = 0; i < 20; i++) {h.tick(16); early.push(h.ticker.totalValue.textContent);}
  assert.equal(h.ticker.panel.dataset.phase, 'reward', 'the reward badge leads the sequence');
  assert.ok(early.every(value => value === '200'), 'the total waits while the reward badge shows');
  const values = [];
  for (let i = 0; i < 240; i++) {h.tick(16); values.push(h.ticker.totalValue.textContent);}
  assert.equal(values[0], '200');
  assert.ok(values.includes('201'));
  assert.ok(values.includes('202'));
  assert.ok(values.includes('202'));
  assert.ok(values.includes('399'));
  assert.equal(values.at(-1), '400');
  assert.equal(h.ticker.panel.dataset.phase, 'done');
  for (let n = 200; n <= 400; n++) assert.ok(values.includes(String(n)), `missing ${n}`);
  assert.equal(h.ticker.totalValue.textContent, '400');
});

test('closing, reopening and a second result never replay or double count', () => {
  const h = harness();
  h.fire({points: 400, last: {points: 200}, signedIn: true});
  h.ticker.reveal();
  h.tick(600);
  h.ticker.finish();
  assert.equal(h.ticker.totalValue.textContent, '400', 'closing snaps to the final number');
  h.ticker.reveal();
  assert.equal(h.ticker.panel.dataset.phase, 'done');
  assert.equal(h.ticker.totalValue.textContent, '400');
  assert.equal(h.frameCount, 0, 'a reopen schedules no new frames');
  h.tick(4000);
  assert.equal(h.ticker.totalValue.textContent, '400');

  /* A render-only snapshot must not create a second award. */
  h.fire({points: 400, last: null});
  assert.equal(h.ticker.seq, 1);
  h.ticker.reveal();
  assert.equal(h.ticker.panel.dataset.phase, 'done');

  /* The next finished game gets its own animation from its own snapshot. */
  h.fire({points: 500, last: {points: 100}, signedIn: true});
  assert.deepEqual({...h.ticker.award}, {reward: 100, base: 0, bonus: 0, bonusPct: 0, before: 400, after: 500, signedIn: true});
  h.ticker.hide();
  h.ticker.reveal();
  assert.equal(h.ticker.panel.dataset.phase, 'reward');
  assert.equal(h.ticker.rewardValue.textContent, '+100 Joy Coins');
  assert.equal(h.ticker.totalValue.textContent, '400');
  h.tick(4000);
  assert.equal(h.ticker.totalValue.textContent, '500');
});

test('an award arriving after the dialog opened still animates (Pool ordering)', () => {
  const h = harness();
  h.ticker.panel.closest = () => ({open: true});
  /* Pool calls updateResult() before the recorder fires; other games the other
     way round. Both orders must end with the same count-up. */
  h.ticker.reveal();
  assert.equal(h.ticker.panel.hidden, true, 'a reveal without an award shows nothing');
  h.fire({points: 400, last: {points: 200}, signedIn: true});
  assert.equal(h.ticker.panel.hidden, false);
  assert.equal(h.ticker.panel.dataset.phase, 'reward');
  h.tick(4000);
  assert.equal(h.ticker.totalValue.textContent, '400');
  assert.equal(h.ticker.panel.dataset.phase, 'done');

  /* A closed dialog must never consume the animation in the background. */
  const closed = harness();
  closed.ticker.panel.closest = () => null;
  closed.fire({points: 400, last: {points: 200}, signedIn: true});
  assert.equal(closed.ticker.panel.hidden, true);
  assert.equal(closed.ticker.played, 0);
  closed.ticker.reveal();
  assert.equal(closed.ticker.panel.dataset.phase, 'reward');
});

test('English copy, guest caveat and reduced motion', () => {
  const h = harness({locale: 'en'});
  h.fire({points: 300, last: {points: 100}, signedIn: false});
  h.ticker.reveal();
  assert.equal(h.ticker.rewardLabel.textContent, 'Round reward');
  assert.equal(h.ticker.totalLabel.textContent, 'Joy Coins balance');
  assert.equal(h.ticker.rewardValue.textContent, '+100 Joy Coins');
  assert.equal(h.ticker.panel.title, 'Guest stats only, not saved');
  assert.match(h.ticker.panel.getAttribute('aria-label'), /Balance 300 Joy Coins/);
  h.switchLocale('zh');
  assert.equal(h.ticker.rewardLabel.textContent, '本局奖励');
  assert.equal(h.ticker.rewardValue.textContent, '+100 Joy Coins');
  assert.equal(h.ticker.panel.title, '匿名战绩仅显示，不保存');

  const still = harness({reduced: true});
  still.fire({points: 400, last: {points: 200}, signedIn: true});
  still.ticker.reveal();
  assert.equal(still.ticker.panel.dataset.phase, 'done');
  assert.equal(still.ticker.totalValue.textContent, '400', 'reduced motion shows the total at once');
  assert.equal(still.frameCount, 0);
});

test('the shared dialog owns the ticker and every asset uses the new key', () => {
  const shell = read('dist/table/pool-shell.js');
  const html = read('dist/table/index.html');
  const table = read('dist/table/table.js');
  const preview = read('dist/pool-result-preview.html');
  const css = read('dist/table/result-points.css');
  const points = read('dist/game-points.js');
  assert.match(shell, /import \{createResultPointsTicker\} from '\.\/result-points\.js\?v=/);
  assert.match(shell, /\? createResultPointsTicker\(document\)/);
  assert.match(shell, /typeof document !== 'undefined'/);
  assert.match(shell, /if\(pointsTicker\.panel\)cardKids\.push\(pointsTicker\.panel\)/);
  assert.match(shell, /card\.append\(\.\.\.cardKids\)/);
  assert.match(shell, /typeof document !== 'undefined'/);
  assert.match(shell, /showModal\(\);pointsTicker\.reveal\(\);/);
  assert.match(shell, /addEventListener\('close',\(\)=>\{pointsTicker\.finish\(\);/);
  assert.match(shell, /pointsTicker\.hide\(\);return;/);
  assert.match(shell, /pointsTicker\.hide\(\);\s*\n\s*\}/);
  assert.match(html, new RegExp('result-points\\.css\\?v=' + KEY));
  assert.match(html, new RegExp('table\\.js\\?v=' + KEY));
  assert.match(table, new RegExp('pool-shell\\.js\\?v=' + KEY));
  assert.match(preview, new RegExp('result-points\\.css\\?v=' + KEY));
  assert.match(preview, new RegExp('pool-shell\\.js\\?v=' + KEY));
  assert.match(css, /\.pool-result-points\[hidden\]\{display:none\}/);
  assert.match(css, /\.pool-result-description:has\(\+ \.pool-result-points:not\(\[hidden\]\)\)/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  /* The recorder remains the single award source: this feature adds no call. */
  assert.match(points, /window\.dispatchEvent\(new CustomEvent\('joyflock:game-points'/);
  const recordCalls = (read('dist/table/table.js').match(/__joyflockGamePoints\?\.record\(/g) || []).length;
  assert.equal(recordCalls, 1, 'no second award call was added to the table page');
});
