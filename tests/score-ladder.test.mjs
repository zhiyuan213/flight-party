/* The independent SCORE ladder (2026-11-20).
   One test file guards the whole chain: scorer -> storage -> standings ->
   member facts -> result dialog -> cache keys. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const scorer = read('dist/game-points.js');
const social = read('dist/social-ui.js');
const table = read('dist/table/table.js');
const boot = read('dist/table/intro-boot.js');
const shell = read('dist/table/pool-shell.js');
const ticker = read('dist/table/result-points.js');
const css = read('dist/table/result-points.css');
const index = read('dist/index.html');
const tableHtml = read('dist/table/index.html');
const flightCss = read('dist/flight-detail-layout.css');
const homeCss = read('dist/table/table-home-clean.css');
const java = read('backend/src/main/java/com/flightparty/table/TableService.java');
const CACHE = '&score=20261120-score1';

/* A minimal DOM is enough: the module only paints when those nodes exist. */
function sandbox(store = new Map()) {
  const el = () => ({
    className: '', textContent: '', dataset: {}, children: [], attributes: {},
    setAttribute(k, v) {this.attributes[k] = v;},
    getAttribute(k) {return Object.hasOwn(this.attributes, k) ? this.attributes[k] : null;},
    append(...kids) {this.children.push(...kids);},
    replaceChildren(...kids) {this.children = kids;},
    querySelector() {return null;},
    addEventListener() {}
  });
  const html = el(); html.lang = 'zh-CN'; html.setAttribute('data-locale', 'zh');
  const document = {
    documentElement: html, readyState: 'complete', cookie: '',
    createElement: () => el(), getElementById: () => null,
    querySelector: () => null, addEventListener() {}
  };
  const win = {addEventListener() {}, dispatchEvent() {}};
  win.parent = win;
  const ctx = {
    window: win, document,
    localStorage: {
      getItem: k => store.has(k) ? store.get(k) : null,
      setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k)
    },
    CustomEvent: class {constructor(type, options) {this.type = type; this.detail = options?.detail;}},
    MutationObserver: class {observe() {}},
    URLSearchParams, location: {search: '?game=pool', origin: 'http://localhost'},
    setTimeout: () => 0, clearTimeout() {}, console
  };
  runInNewContext(scorer, ctx);
  return {api: win.__joyflockGamePoints, store};
}

test('the ladder pays 40 / 20 / 10 / 10 and keeps draws at 20', () => {
  const {api} = sandbox();
  assert.deepEqual([1, 2, 3, 4, 0].map(r => api.scoreFor(r)), [40, 20, 10, 10, 20]);
  assert.match(scorer, /var SCORE_KEY='joyflock\.score\.v1'/);
  assert.match(scorer, /function scoreFor\(rank\)\{return rank===1\?40:rank===2\|\|rank===0\?20:10;\}/);
});

test('two-seat games pay 40 for a win, 20 for a loss or a draw', () => {
  const s = sandbox();
  const win = r => s.api.record({game: 'pool', key: 'k' + r.k, players: 2,
    winner: r.winner, seat: 0, over: true});
  win({k: 1, winner: 1});
  assert.equal(s.api.get().score, 40);
  assert.equal(s.api.get().last.score, 40);
  win({k: 2, winner: 2});
  assert.equal(s.api.get().score, 60, '40 + 20');
  assert.equal(s.api.get().last.score, 20);
  win({k: 3, winner: 0});
  assert.equal(s.api.get().score, 80, 'a draw adds 20');
  assert.equal(s.api.get().last.score, 20);
});

test('four-seat games pay 40 / 20 / 10 / 10 by rank', () => {
  const ranking = [2, 0, 3, 1];
  const expected = new Map([[2, 40], [0, 20], [3, 10], [1, 10]]);
  for (const seat of [0, 1, 2, 3]) {
    const s = sandbox();
    s.api.record({game: 'flight', key: 'f' + seat, players: 4, ranking, seat, over: true});
    assert.equal(s.api.get().last.score, expected.get(seat), `seat ${seat}`);
    assert.equal(s.api.get().score, expected.get(seat));
  }
});

test('score is its own stored total: no cap, no wallet pollution, guest-safe', () => {
  const s = sandbox();
  for (let i = 0; i < 30; i++) {
    s.api.record({game: 'pool', key: 'c' + i, players: 2, winner: 1, seat: 0, over: true});
  }
  /* 30 x 40 = 1200 score; Joy Coins hit their 5000 daily cap after 25 wins. */
  assert.equal(s.api.get().score, 1200);
  assert.equal(Number(s.store.get('joyflock.score.v1')), 1200);
  assert.equal(s.api.get().points, 5000, 'the wallet still respects its own cap');
  assert.equal(s.api.get().daily.reached, true);
  assert.equal(s.store.has('joyflock.gamepoints.v1'), false, 'a guest never writes the game record');
  const restored = sandbox(s.store);
  assert.equal(restored.api.get().score, 1200, 'a reload restores the standalone total');
  assert.equal(restored.api.get().games, 0, 'the game record is still per-session');
  assert.match(scorer, /score:readScore\(\)/, 'load() restores the standalone total');
});

test('both standings are score boards with three unchanged periods', () => {
  for (const text of [social, table, boot])
    assert.match(text, /'month','week','day'/);
  assert.match(social, /\['month','Monthly score','月积分榜'\],\['week','Weekly score','周积分榜'\],\['day','Daily score','日积分榜'\]/);
  assert.match(social, /t\('Score','积分'\)/);
  assert.match(social, /rankRows\?\.\(merged,'points'\)/);
  assert.match(table, /rankRows\?\.\(merged,'points'\)/);
  assert.match(table, /const scoreOf=r=>Number\(r\.points\)\|\|0/);
  assert.match(social, /My score: 0 · 0 games|我的积分：0 · 0 局/);
  assert.match(tableHtml, /<span>积分<\/span>/);
  assert.match(boot, /score\.textContent=String\(Math\.max\(0,Number\(row\.points\)\|\|0\)\)/);
  assert.doesNotMatch(social, /'Win rate','胜率'/);
});

test('the server sums the same 40 / 20 / 10 ladder in every period', () => {
  assert.match(java, /Set\.of\("day","week","month"\)\.contains\(period\)/);
  assert.match(java, /date_trunc\(:period,now\(\) at time zone 'UTC'\) at time zone 'UTC'\)/);
  assert.match(java, /sum\(case when t\.rank=1 then 40 else 20 end\)/);
  assert.match(java, /sum\(case when r\.rank=1 then 40 when r\.rank=2 then 20 else 10 end\)/);
  assert.match(java, /order by 3 desc,count\(\*\) desc,a\.id limit 10/);
  assert.doesNotMatch(java, /::numeric\/nullif\(count\(\*\),0\) desc/);
});

test('the fifth membership fact and the flight result panel show the same total', () => {
  for (const html of [index, tableHtml])
    assert.match(html, /data-member-fact="score"/);
  assert.match(flightCss, /grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(homeCss, /grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(index, /id="result-score-panel"/);
  assert.match(index, /本局奖励积分/);
  assert.match(index, /总积分/);
  assert.match(scorer, /getElementById\('result-score-panel'\)/);
  assert.match(scorer, /set\('score',fmt\(s\.score\)\)/);
});

test('the shared result dialog mounts a matching score card ABOVE Joy Coins', () => {
  assert.match(ticker, /export function createResultScoreTicker/);
  assert.match(ticker, /pool-result-points pool-result-score/);
  assert.match(ticker, /snapshot\?\.last\?\.score/);
  assert.match(ticker, /en \? 'Round score' : '本局奖励积分'/);
  assert.match(shell, /if\(scoreTicker\.panel\)cardKids\.push\(scoreTicker\.panel\);\s*\n\s*if\(pointsTicker\.panel\)cardKids\.push\(pointsTicker\.panel\);/);
  assert.match(shell, /scoreTicker\.reveal\(\);pointsTicker\.reveal\(\)/);
  assert.match(css, /\.pool-result-points\.pool-result-score\{/);
  assert.match(css, /\.pool-result-points\.result-score-panel\{/);
});

test('every edited module is cache-busted with one shared release key', () => {
  const hosts = [index, tableHtml, read('dist/portal/index.html'),
    read('dist/portal/native-flight.html'), read('dist/portal/native-table.html'),
    read('dist/app.js'), table, shell, read('dist/table/locale-boot.js'),
    read('dist/pool-result-preview.html')];
  for (const p of hosts) {
    const urls = [...p.matchAll(/(?<![\w-])(?:game-points\.js|social-ui\.js|table\.js|intro-boot\.js|table-home-clean\.css|table-locale\.js|pool-shell\.js|result-points\.js|result-points\.css|flight-detail-layout\.css|app\.js)\?[^"'\s<>]*/g)];
    if (!urls.length) continue;
    for (const m of urls) assert.ok(m[0].includes(CACHE), 'missing key: ' + m[0]);
  }
});
