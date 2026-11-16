import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const code = read('dist/game-points.js');
const KEY = 'joyflock.gamepoints.v1';
const VERSION = code.match(/var VERSION='([^']+)'/)?.[1];
const pages = ['dist/table/index.html', 'dist/index.html', 'dist/portal/index.html'];

/* A tiny but real DOM: the module writes the member facts, the stats line and
   the leaderboard, so the assertions below verify rendered values instead of
   only grepping the source. `store` is shared between reloads on purpose. */
function sandbox({locale = 'zh', store = new Map(), cookie = '', demo = null} = {}) {
  const listeners = {};
  const makeEl = (tag = 'div') => ({
    tagName: tag, id: '', className: '', textContent: '', dataset: {}, attributes: {},
    children: [], style: {setProperty() {}, removeProperty() {}}, isConnected: true,
    setAttribute(k, v) {this.attributes[k] = v;},
    getAttribute(k) {return Object.hasOwn(this.attributes, k) ? this.attributes[k] : null;},
    append(child) {this.children.push(child);},
    replaceChildren(...kids) {this.children = kids; return kids;},
    addEventListener(type, fn) {(this.listeners ??= {})[type] ??= []; this.listeners[type].push(fn);},
    querySelector(sel) {return this.lookups?.[sel] ?? null;},
    ownerDocument: null
  });
  const html = makeEl('html');
  html.lang = locale === 'en' ? 'en' : 'zh-CN';
  if (locale === 'zh') html.setAttribute('data-locale', 'zh');
  const body = makeEl('body'), head = makeEl('head');
  const facts = makeEl('div');
  facts.lookups = {
    '[data-member-fact="points"]': makeEl('span'),
    '[data-member-fact="games"]': makeEl('span'),
    '[data-member-fact="winrate"]': makeEl('span')
  };
  const stats = makeEl('p'), leaderboard = makeEl('ol');
  leaderboard.ownerDocument = {documentElement: html};
  const ids = {stats, leaderboard};
  const document = {
    documentElement: html, body, head, readyState: 'complete', cookie,
    createElement(tag) {return makeEl(tag);},
    getElementById(id) {return ids[id] ?? null;},
    querySelector(sel) {
      if (sel === '.member-facts') return facts;
      if (sel === '[data-period][aria-pressed="true"]') return null;
      return null;
    },
    addEventListener() {}
  };
  const win = {
    addEventListener(type, fn) {(listeners[type] ??= []).push(fn);},
    dispatchEvent(event) {(listeners[event.type] || []).forEach(fn => fn(event));},
    __joyflockDemoRows: demo || (() => [
      {name: 'Ada', points: 260, games: 3, winRate: 66, avatar: 0, avatarUrl: '', avatarFrame: 'none'},
      {name: 'Bo', points: 90, games: 2, winRate: 50, avatar: 0, avatarUrl: '', avatarFrame: 'none'}
    ]),
    __joyflockRankRow: (_doc, r, i) => {
      const li = makeEl('li');
      li.textContent = r.name;
      li.dataset.rank = String(i);
      return li;
    }
  };
  win.parent = win;                       // no postMessage in the isolated test
  const context = {
    window: win, document,
    localStorage: {
      getItem: k => store.has(k) ? store.get(k) : null,
      setItem: (k, v) => store.set(k, v),
      removeItem: k => store.delete(k)
    },
    CustomEvent: class {constructor(type, options) {this.type = type; this.detail = options?.detail;}},
    MutationObserver: class {observe() {}},
    URLSearchParams, location: {search: '?game=four', origin: 'http://localhost'},
    setTimeout: () => 0, clearTimeout() {}, console
  };
  runInNewContext(code, context);
  return {
    api: win.__joyflockGamePoints, store,
    facts, stats, leaderboard,
    toast: () => body.children.find(el => el.id === 'gp-toast') || null,
    fire(type, detail) {(listeners[type] || []).forEach(fn => fn({type, detail}));}
  };
}

test('one scoring table drives every game: 2 seats, 3 seats and 4 seats', () => {
  const s = sandbox();
  assert.deepEqual([...s.api.table(2)], [200, 100]);
  assert.deepEqual([...s.api.table(3)], [200, 100, 50]);
  assert.deepEqual([...s.api.table(4)], [200, 100, 50, 50]);
  assert.match(code, /var TABLE=\{2:\[200,100\],3:\[200,100,50\],4:\[200,100,50,50\]\}/);
  /* board.winner is 1-based; 0 is a draw. */
  assert.equal(s.api.pointsFor({players: 2, winner: 1, seat: 0}).points, 200);
  assert.equal(s.api.pointsFor({players: 2, winner: 1, seat: 1}).points, 100);
  assert.equal(s.api.pointsFor({players: 2, winner: 0, seat: 0}).points, 100);
  assert.equal(s.api.pointsFor({players: 2, winner: 0, seat: 1}).points, 100);
  /* Flight Party reports a ranking of 0-based seat ids. */
  const ranking = [2, 0, 3, 1];
  assert.deepEqual([0, 1, 2, 3].map(seat =>
    s.api.pointsFor({players: 4, ranking, seat}).points), [100, 50, 200, 50]);
  assert.equal(s.api.pointsFor({players: 3, ranking: [1, 0, 2], seat: 2}).points, 50);
  assert.equal(s.api.pointsFor({players: 4, ranking, seat: 9}).points, 50,
    'an unknown seat still gets the last place award');
});

test('an anonymous visitor sees live points but never reads or writes storage', () => {
  const store = new Map();
  store.set(KEY, JSON.stringify({games: 99, wins: 99, points: 99999, byGame: {}}));
  const s = sandbox({store});
  assert.equal(s.api.isSignedIn(), false);
  assert.equal(s.api.get().games, 0, 'a guest never inherits a signed-in record');
  assert.equal(s.api.record({game: 'pool', key: 'p1', players: 2, winner: 1, seat: 0, over: true}).points, 200);
  assert.equal(s.api.record({game: 'pool', key: 'p2', players: 2, winner: 2, seat: 0, over: true}).points, 100);
  const got = s.api.get();
  assert.equal(got.games, 2);
  assert.equal(got.points, 300);
  assert.equal(got.wins, 1);
  assert.equal(got.signedIn, false);
  assert.equal(store.get(KEY), JSON.stringify({games: 99, wins: 99, points: 99999, byGame: {}}),
    'the stored record is untouched');
  assert.equal(s.toast(), null, 'the result dialog owns the reward, no bottom toast');
  assert.match(s.stats.textContent, /300 Joy Coins · 2 局.*匿名战绩仅显示，不保存/);
  assert.equal(s.stats.dataset.gamePoints, '1');
  assert.equal(s.stats.dataset.demo, undefined);
  /* A reload is a clean guest session: no persistence, no replay. */
  assert.equal(sandbox({store}).api.get().games, 0);
});

test('a signed-in account persists the running totals and the per-game split', () => {
  const store = new Map([['joyflock.accountName', 'zhiyuanC']]);
  const s = sandbox({store});
  assert.equal(s.api.isSignedIn(), true);
  assert.equal(s.api.record({game: 'four', key: 'f1', players: 2, winner: 1, seat: 0, over: true}).points, 200);
  s.api.record({game: 'flight', key: 'f2', players: 4, ranking: [2, 0, 3, 1], seat: 0, over: true});
  const got = s.api.get();
  assert.equal(got.points, 300);
  assert.equal(got.games, 2);
  assert.equal(got.wins, 1);
  assert.equal(got.winRate, 50);
  assert.deepEqual({...got.byGame.four}, {games: 1, wins: 1, points: 200});
  assert.deepEqual({...got.byGame.flight}, {games: 1, wins: 0, points: 100});
  const saved = JSON.parse(store.get(KEY));
  assert.equal(saved.points, 300);
  assert.equal(saved.games, 2);
  const again = sandbox({store});
  assert.equal(again.api.get().points, 300, 'a reload restores the signed-in record');
  assert.equal(again.api.isSignedIn(), true);
  assert.equal(again.toast(), null, 'restoring a record does not replay a toast');
  /* The server-confirmed guest marker must never be mistaken for a nickname. */
  assert.equal(sandbox({store: new Map([['joyflock.accountName', '0']])}).api.isSignedIn(), false);
});

test('result keys de-duplicate, snapshots sync without a second award, and reset clears both', () => {
  const store = new Map([['joyflock.accountName', 'zhiyuanC']]);
  const s = sandbox({store});
  const result = {game: 'pool', key: 'dup', players: 2, winner: 1, seat: 0, over: true};
  assert.equal(s.api.record(result).points, 200);
  assert.equal(s.api.record(result), null);
  assert.equal(s.api.get().games, 1);
  assert.equal(s.api.record({...result, over: false}), null, 'an unfinished board never scores');
  s.api.sync({games: 4, wins: 2, points: 800, byGame: {}, last: null});
  assert.equal(s.api.get().points, 800, 'the parent shell mirrors the child state only');
  assert.equal(s.api.get().games, 4);
  assert.equal(s.api.leaderboardRow().self, true);
  assert.equal(s.api.leaderboardRow().points, 800);
  s.api.reset();
  assert.equal(s.api.get().games, 0);
  assert.equal(s.api.leaderboardRow(), null);
  assert.equal(JSON.parse(store.get(KEY)).points, 0);
});

test('the leaderboard and the member facts are rebuilt from the live figures', () => {
  const s = sandbox({locale: 'en'});
  assert.equal(s.api.leaderboardRow(), null, 'no games means no self row');
  assert.equal(s.leaderboard.children.length, 2, 'demo rows stay while there is no record');
  s.api.record({game: 'pool', key: 'r1', players: 2, winner: 2, seat: 0, over: true});
  assert.equal(s.api.get().points, 100);
  assert.equal(s.facts.lookups['[data-member-fact="points"]'].textContent, '100');
  assert.equal(s.facts.lookups['[data-member-fact="games"]'].textContent, '1');
  assert.equal(s.facts.lookups['[data-member-fact="winrate"]'].textContent, '0%');
  assert.match(s.stats.textContent, /My record: 100 Joy Coins · 1 games · guest stats not saved/);
  assert.equal(s.api.leaderboardRow().name, 'You');
  assert.equal(s.leaderboard.children.length, 3, 'the self row is inserted into the board');
  assert.equal(s.leaderboard.children[1].dataset.self, '1', '100 pts sorts between 260 and 90');
  assert.equal(s.leaderboard.children[1].textContent, 'You');
  assert.equal(s.toast(), null, 'the result dialog owns the reward, no bottom toast');
});

test('the self row is the signed-in account, not a 你 / You placeholder', () => {
  const signed = sandbox({locale: 'en', store: new Map([['joyflock.accountName', 'zhiyuanC']])});
  signed.api.sync({games: 4, wins: 2, points: 800, byGame: {}, last: null});
  const row = signed.api.leaderboardRow();
  assert.equal(row.name, 'zhiyuanC', 'the nickname replaces the placeholder');
  assert.equal(row.self, true);
  assert.equal(row.isSelf, true, 'avatar-display.resolve() can read the equipped portrait');
  assert.equal(row.signedIn, true);
  assert.equal(row.avatarUrl, '', 'the portrait is resolved from the shop, not hard-coded');

  const guest = sandbox({locale: 'en'});
  guest.api.sync({games: 1, wins: 0, points: 100, byGame: {}, last: null});
  const grow = guest.api.leaderboardRow();
  assert.equal(grow.name, 'You', 'guests keep the neutral label');
  assert.equal(grow.isSelf, true);
  assert.equal(grow.signedIn, false, 'guests must not borrow the account portrait');
});

test('all three hosts and the home module pull the account-aware self row', () => {
  for (const p of pages) {
    assert.match(read(p),
      /game-points\.js\?v=20261112-gamelanes1&d=20261115-joincoin1&r=20261115-nolossbonus1&s=20261115-selfrow1/,
      `${p}: fresh scorer`);
  }
  assert.match(read('dist/app.js'), /social-ui\.js\?v=20261112-gamelanes1&d=20261115-selfrow1/);
  assert.match(read('dist/index.html'), /app\.js\?v=20261112-gamelanes1&d=20261115-selfrow1/);
  assert.match(read('dist/social-ui.js'), /signedIn:row\.signedIn!==false/,
    'the flight board trusts the scorer verdict instead of its preview account');
});

test('both result pipelines call the single recorder, and the copy matches the new table', () => {
  const table = read('dist/table/table.js');
  const app = read('dist/app.js');
  const social = read('dist/social-ui.js');
  const results = read('dist/result-rankings.js');
  const intro = read('dist/table/intro-boot.js');
  const locale = read('dist/table/table-locale.js');
  assert.match(table, /__joyflockGamePoints\?\.record\(\{/);
  assert.match(table, /players:2,winner:Number\(board\.winner\)\|\|0/);
  assert.match(table, /leaderboardRow\?\.\(\)/);
  assert.match(table, /entry&&entry\.self===true\)li\.dataset\.self='1'/,
    'the async board refresh keeps the self-row marker after a reload');
  assert.match(app, /__joyflockGamePoints\?\.record\(\{/);
  assert.match(app, /ranking:game\.ranking\.slice\(\)/);
  assert.match(app, /social\.renderLeaderboard\?\.\(\)/);
  assert.match(social, /__joyflockGamePoints\?\.leaderboardRow\?\.\(\)/);
  assert.match(results, /pointsBySeat=null/);
  assert.match(intro, /200 \/ 100/);
  assert.match(locale, /200/);
  assert.match(read('dist/table/index.html'), /胜者 200 Joy Coins、败者 100 Joy Coins/);
  assert.ok(!/第一名\+3|第二名\+2/.test(intro + locale + table), 'the old +3/+2 score copy is gone');
});

test('the visitor keeps a leaderboard seat even below ten demo standings', () => {
  const demo = () => Array.from({length: 10}, (_unused, i) => ({
    name: 'Demo' + i, points: 500 - i * 10, games: 20,
    avatar: 0, avatarUrl: '', avatarFrame: 'none'
  }));
  const s = sandbox({demo});
  assert.equal(s.leaderboard.children.length, 10);
  assert.equal(s.leaderboard.children[9].textContent, 'Demo9');
  s.api.record({game: 'pool', key: 'low', players: 2, winner: 2, seat: 0, over: true});
  assert.equal(s.api.get().points, 100);
  assert.equal(s.leaderboard.children.length, 10, 'the board keeps its fixed height');
  assert.equal(s.leaderboard.children[9].dataset.self, '1', 'the weakest demo row gives up its seat');
  assert.equal(s.leaderboard.children[9].textContent, '你');
  const rows = s.api.rankRows(demo().concat([{name: '你', points: 100, games: 1, self: true}]));
  assert.equal([...rows].length, 10);
  assert.equal([...rows][9].name, '你');
  assert.match(read('dist/table/table.js'), /rankRows\?\.\(merged,'winRate'\)/);
  assert.match(read('dist/social-ui.js'), /rankRows\?\.\(merged,'winRate'\)/);
});

test('a login or logout in the same tab switches identity without adopting guest figures', () => {
  const store = new Map();
  const s = sandbox({store});
  s.api.record({game: 'pool', key: 'g1', players: 2, winner: 1, seat: 0, over: true});
  assert.equal(s.api.get().points, 200);
  assert.equal(s.api.isSignedIn(), false);
  s.fire('joyflock:account-changed', {name: 'zhiyuanC'});
  assert.equal(s.api.isSignedIn(), true);
  assert.equal(s.api.get().points, 0, 'guest points are display-only and never adopted');
  s.api.record({game: 'pool', key: 'a1', players: 2, winner: 1, seat: 0, over: true});
  assert.equal(s.api.get().points, 200);
  assert.equal(JSON.parse(store.get(KEY)).points, 200);
  s.fire('joyflock:account-changed', {name: null});
  assert.equal(s.api.isSignedIn(), false);
  assert.equal(s.api.get().points, 0, 'a sign-out never leaves the old account totals on screen');
  assert.equal(JSON.parse(store.get(KEY)).points, 200, 'the account record stays intact');
  assert.match(code, /joyflock:account-changed/);
});

test('ONE Joy Coins balance: the scorer credits and mirrors the wallet', () => {
  assert.match(code, /var WALLET_KEY='joyflock\.shop\.v1'/);
  assert.match(code, /function walletTotal\(\)/);
  assert.match(code, /function walletAdd\(amount\)/);
  assert.match(code, /state\.points=total===null\?state\.points\+credited:total/);
  assert.match(code, /joyflock:shop-changed/,
    'a shop purchase mirrors back into the leaderboard');
  assert.doesNotMatch(code, /Cosmetics \/ Joy Coin live in site-points\.js/,
    'the old two-currency boundary comment is gone');
  assert.equal(VERSION, read('dist/site-points.js').match(/var VERSION='([^']+)'/)?.[1]);
  for (const p of pages) assert.match(read(p), new RegExp('game-points\\.js\\?v=' + VERSION));
});

/* Both shipped scripts in ONE context: the header wallet, the scorer and the
   shop must all read and write the very same number. */
function combinedSandbox() {
  const store = new Map(), listeners = {}, events = [];
  const makeEl = () => ({
    style: {setProperty() {}, removeProperty() {}}, dataset: {}, attributes: {},
    children: [], textContent: '',
    setAttribute(k, v) {this.attributes[k] = v;},
    removeAttribute(k) {delete this.attributes[k];},
    getAttribute(k) {return Object.hasOwn(this.attributes, k) ? this.attributes[k] : null;},
    hasAttribute() {return false;},
    append(...kids) {this.children.push(...kids);},
    appendChild(k) {this.children.push(k); return k;},
    querySelector() {return null;}, querySelectorAll() {return [];},
    addEventListener() {}
  });
  const html = makeEl(); html.lang = 'zh-CN';
  const document = {
    documentElement: html, head: makeEl(), body: makeEl(), readyState: 'complete', cookie: '',
    createElement: makeEl, getElementById: () => null, querySelector: () => null,
    addEventListener() {}
  };
  const win = {
    addEventListener(type, fn) {(listeners[type] ??= []).push(fn);},
    dispatchEvent(e) {(listeners[e.type] || []).forEach(fn => fn(e)); events.push(e.type);},
    location: {pathname: '/table/index.html', search: '?game=pool', origin: 'http://localhost'}
  };
  win.parent = win;
  const context = {
    window: win, document, URLSearchParams,
    localStorage: {
      getItem: k => store.has(k) ? store.get(k) : null,
      setItem: (k, v) => store.set(k, v),
      removeItem: k => store.delete(k)
    },
    CustomEvent: class {constructor(type, options) {this.type = type; this.detail = options?.detail;}},
    MutationObserver: class {observe() {}},
    setTimeout: () => 0, clearTimeout() {}, console
  };
  runInNewContext(read('dist/site-points.js'), context);
  runInNewContext(code, context);
  return {wallet: win.__joyflockPoints, shop: win.__joyflockShop,
    scorer: win.__joyflockGamePoints, store, events};
}

test('a finished game and a shop purchase move the same balance in both directions', () => {
  const c = combinedSandbox();
  assert.equal(c.wallet.get().total, 10000, 'the local demo wallet starts at 10,000');
  assert.equal(c.scorer.get().points, 10000, 'the scorer starts from the wallet, not from zero');

  c.scorer.record({game: 'pool', key: 'join1', players: 2, winner: 1, seat: 0, over: true});
  assert.equal(c.wallet.get().total, 10200, 'the header pill gains the 200 award');
  assert.equal(c.scorer.get().points, 10200, 'the leaderboard shows the same balance');
  assert.equal(JSON.parse(c.store.get('joyflock.shop.v1')).points, 10200,
    'the award is persisted in the wallet, not a second store');

  const bought = c.shop.buy('avatar-cloudy');
  assert.equal(bought.ok, true);
  assert.equal(bought.cost, 1000);
  assert.equal(c.wallet.get().total, 9200, 'a shop purchase debits the same balance');
  assert.equal(c.scorer.get().points, 9200, 'the leaderboard follows the purchase');
  assert.equal(c.events.filter(t => t === 'joyflock:game-points').length, 1,
    'a purchase never re-triggers the result-dialog award animation');
});
