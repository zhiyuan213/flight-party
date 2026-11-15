import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const html = read('dist/table/index.html');
const boot = read('dist/table/intro-boot.js');
const gp = read('dist/game-points.js');
const tj = read('dist/table/table.js');
const locale = read('dist/table/table-locale.js');
const css = read('dist/table/table-home-clean.css');
const java = read('backend/src/main/java/com/flightparty/table/TableService.java');
const KEY = '20261115-winrate1';

/* The row builder is a plain function, so a tiny DOM mock is enough to check
   the exact strings the win-rate board paints. */
const node = () => ({
  children: [], className: '', textContent: '', dataset: {},
  append(...items) { this.children.push(...items); },
  setAttribute() {}
});
function rowBuilder() {
  const source = boot.match(/window\.__joyflockRankRow=function[\s\S]*?\n  \};/);
  assert.ok(source, 'rank-row builder is extractable');
  const doc = {createElement: () => node()};
  const window = {__joyflockAvatar: () => node()};
  const ctx = vm.createContext({window, document: doc});
  vm.runInContext(source[0] + '\nglobalThis.build = window.__joyflockRankRow;', ctx);
  return {build: ctx.build, doc};
}
function demoRows() {
  const start = boot.indexOf('var DEMO_PLAYERS=[');
  const end = boot.indexOf('/* First-paint seats');
  assert.ok(start > 0 && end > start, 'demo data block is extractable');
  const ctx = vm.createContext({window: {}});
  vm.runInContext(boot.slice(start, end) + '\nglobalThis.rows = window.__joyflockDemoRows;', ctx);
  return ctx.rows;
}
function rankRows() {
  const source = gp.match(/function rankRows\(rows,by\)\{[\s\S]*?\n \}/);
  assert.ok(source, 'rankRows is extractable');
  const ctx = vm.createContext({});
  vm.runInContext(source[0] + '\nglobalThis.sortRows = rankRows;', ctx);
  return ctx.sortRows;
}

test('the three period tabs stay a win-rate board; the left column is games only', () => {
  for (const label of ['月胜率榜', '周胜率榜', '日胜率榜']) {
    assert.ok(html.includes('>' + label + '</button>'), label + ' tab');
  }
  assert.ok(!html.includes('Joy Coins 榜'), 'no Joy Coins board label remains');
  assert.match(html,
    /<div class="ranking-columns"><span>玩家<\/span><span>局数<\/span><span>胜率<\/span><\/div>/);
  assert.ok(!html.includes('>胜/局<'), 'the old wins/games header is gone');
});

test('demo standings carry real win counts and a descending win rate', () => {
  assert.equal((boot.match(/wins:\[/g) || []).length, 10, 'ten demo players have win counts');
  const rows = demoRows();
  for (const period of ['month', 'week', 'day']) {
    const values = rows(period, 'pool');
    assert.equal(values.length, 10);
    values.forEach((r, i) => {
      assert.ok(r.wins >= 0 && r.wins <= r.games, `${period} row ${i}: wins within games`);
      assert.ok(Math.abs(r.winRate - (r.games ? r.wins / r.games * 100 : 0)) < 0.001,
        `${period} row ${i}: winRate derived from wins/games`);
      if (i) assert.ok(values[i - 1].winRate >= r.winRate, `${period} row ${i}: descending`);
    });
  }
  assert.match(css, /grid-template-columns:32px minmax\(0,1fr\) 60px 60px/);
  assert.match(css, /grid-template-columns:1fr 60px 60px/);
});

test('a row paints only the game count and a one-decimal win rate', () => {
  const {build, doc} = rowBuilder();
  const li = build(doc, {name: 'Test', wins: 2, games: 9, winRate: 22.2222}, 0);
  assert.equal(li.children[2].className, 'ranking-points');
  assert.equal(li.children[2].textContent, '9', 'only completed games, no "2/9"');
  assert.ok(!li.children[2].textContent.includes('/'), 'no wins/games slash');
  assert.equal(li.children[3].className, 'ranking-games');
  assert.equal(li.children[3].textContent, '22.2%', '2 wins in 9 games still reads 22.2%');
  const missing = build(doc, {name: 'Old server', points: 30, games: 9}, 0);
  assert.equal(missing.children[2].textContent, '9');
  assert.equal(missing.children[3].textContent, '0.0%');
  assert.doesNotMatch(boot, /wins\+'\/'\+total/, 'the old record string is gone');
});

test('rankRows sorts by win rate only on the detail board; home stays on Joy Coins', () => {
  const sort = rankRows();
  const rows = [
    {name: 'low', points: 900, games: 20, wins: 2, winRate: 10},
    {name: 'high', points: 100, games: 9, wins: 2, winRate: 22.2},
    {name: 'mid', points: 500, games: 10, wins: 2, winRate: 20}
  ];
  assert.deepEqual(sort(rows, 'winRate').map(r => r.name), ['high', 'mid', 'low']);
  assert.deepEqual(sort(rows).map(r => r.name), ['low', 'mid', 'high']);
  assert.match(gp, /wins:state\.wins,winRate:snapshot\(\)\.winRate/, 'self row carries wins');
  assert.match(gp, /rankRows\(rows,byRate\?'winRate':'points'\)/);
  assert.match(gp, /document\.querySelector\('\.home-ranking'\)/);
  assert.match(read('dist/social-ui.js'), /rankRows\?\.\(rows\)/, 'home board keeps the default call');
});

test('the async refresh derives win rate from server wins and asks for the rate ordering', () => {
  assert.match(tj, /const games=Number\(row\.games\)\|\|0,wins=Math\.max\(0,Math\.min\(games,Number\(row\.wins\)\|\|0\)\)/);
  assert.match(tj, /winRate:games\?wins\/games\*100:0/);
  assert.match(tj, /merged\.sort\(\(a,b\)=>rate\(b\)-rate\(a\)/);
  assert.match(tj, /rankRows\?\.\(merged,'winRate'\)/);
});

test('the server leaderboard actually returns wins and orders by win rate', () => {
  assert.match(java, /record Ranking\([^)]*long wins\)/);
  assert.match(java, /sum\(case when t\.rank=1 then 1 else 0 end\)/);
  assert.match(java, /::numeric\/nullif\(count\(\*\),0\) desc/);
  assert.match(java, /rs\.getLong\(5\)/);
});

test('English labels and the refreshed asset chain follow the new board', () => {
  assert.match(locale, /'月胜率榜':'Monthly win rate'/);
  assert.match(locale, /'周胜率榜':'Weekly win rate'/);
  assert.match(locale, /'日胜率榜':'Daily win rate'/);
  assert.match(locale, /'局数':'Games'/, 'the games-only header already has an English label');
  assert.match(locale, /'胜率':'Win rate'/);
  for (const ref of [
    'intro-boot.js?v=20261115-joincoin1&d=' + KEY,
    'table.js?v=20261115-joincoin1&d=' + KEY,
    'table-home-clean.css?v=20261115-joincoin1&d=20261115-medalspace1&t=' + KEY,
    'game-points.js?v=20261112-gamelanes1&d=20261115-joincoin1&r=20261115-nolossbonus1&s=20261115-selfrow1&w=' + KEY
  ]) assert.ok(html.includes(ref), html.includes(ref) ? '' : 'missing ' + ref);
  assert.match(html,
    /intro-boot\.js\?v=20261115-joincoin1&d=20261115-winrate1&g=20261115-gamesonly1/,
    'the rebuilt row builder is cache-busted');
  assert.match(tj, /table-locale\.js\?v=20261110-glove2&d=20261115-chatfs1&r=20261115-winrate1/);
  for (const page of ['dist/index.html', 'dist/portal/index.html']) {
    assert.ok(read(page).includes('&w=' + KEY), page + ' pulls the rebuilt scorer');
  }
});
