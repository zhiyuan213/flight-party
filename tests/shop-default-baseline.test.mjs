/* Regression for the free 默认 baseline + 装配中 ribbon batch, extended for
   the per-game board-game split. Exercises the SHIPPED wallet through a tiny
   DOM double (state, prices, schema-3 migration, independent equip slots and
   live attribute publishing) and guards the shop / game / CSS wiring with
   source assertions. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const points = read('dist/site-points.js');
const shop = read('dist/site-shop.js');
const css = read('dist/site-shop.css');
const palettes = read('dist/site-cosmetics.css');
const trailCss = read('dist/site-trail.css');
const trailFx = read('dist/site-trail-fx.js');
const gameJs = read('dist/table/game-cosmetics.js');
const poolView = read('dist/table/pool-view.js');
const page = read('dist/shop.html');
const KEY = '20261112-gamelanes1';

const GAMES = ['four', 'gomoku', 'chess', 'xo'];
const BASELINES = {
  plane: 'plane-classic', cursor: 'cursor-star', avatar: 'avatar-starling', trail: 'trail-none',
  ball: 'ball-default', cue: 'cue-default', table: 'table-default'
};
for (const g of GAMES) {
  BASELINES[g + 'Piece'] = `${g}-piece-default`;
  BASELINES[g + 'Board'] = `${g}-board-default`;
}
const PUB = [
  'data-shop-ball', 'data-shop-cue', 'data-shop-table', 'data-shop-trail',
  ...GAMES.flatMap(g => [`data-shop-${g}-piece`, `data-shop-${g}-board`])
];

function wallet(initial) {
  const store = new Map(), attrs = {}, styles = {};
  if (initial) store.set('joyflock.shop.v1', JSON.stringify(initial));
  const docRoot = {
    getAttribute: k => Object.hasOwn(attrs, k) ? attrs[k] : null,
    hasAttribute: k => Object.hasOwn(attrs, k),
    style: {
      setProperty: (k, v) => {styles[k] = v;},
      removeProperty: k => {delete styles[k];}
    },
    setAttribute: (k, v) => {attrs[k] = String(v);},
    removeAttribute: k => {delete attrs[k];}
  };
  const listeners = {};
  const win = {addEventListener(type, fn) {(listeners[type] ??= []).push(fn);}, dispatchEvent() {}};
  runInNewContext(points, {
    window: win,
    document: {documentElement: docRoot, readyState: 'complete', querySelector: () => null},
    localStorage: {
      getItem: k => store.has(k) ? store.get(k) : null,
      setItem: (k, v) => store.set(k, v)
    },
    CustomEvent: function () {}, setTimeout: () => 0, clearTimeout() {}, console
  });
  return {shop: win.__joyflockShop, points: win.__joyflockPoints, attrs, styles, store,
    storage(next) {
      store.set('joyflock.shop.v1', JSON.stringify(next));
      for (const listener of listeners.storage || []) listener({key: 'joyflock.shop.v1'});
    }};
}

test('every free baseline is owned, equipped and priced 0; game baselines publish no skin', () => {
  const s = wallet();
  for (const [kind, id] of Object.entries(BASELINES)) {
    assert.equal(s.shop.rarityOf(id), 'default', `${id} is a baseline`);
    assert.equal(s.shop.priceOf(id), 0, `${id} costs nothing`);
    assert.equal(s.shop.freeFor(id), false, `${id} is never a VIP perk`);
    assert.equal(s.points.get().owned[id], true, `${id} is owned on the first visit`);
    assert.equal(s.points.get().equipped[kind], id, `${id} is the initial ${kind}`);
  }
  assert.equal(Object.keys(BASELINES).length, 15, '4 site + 3 billiards + 8 board-game baselines');
  assert.equal(s.shop.defaults.avatar, 'avatar-starling');
  assert.equal(s.attrs['data-shop-avatar'], '1');
  assert.match(s.styles['--shop-avatar'], /avatars-v4\/avatar-starling\.svg/,
    'the free face actually paints in the shared header');
  for (const name of PUB)
    assert.equal(s.attrs[name], undefined, `${name} is absent, not an empty string`);
  assert.equal(s.attrs['data-shop-plane'], 'classic', 'the blue aircraft still publishes its key');
  assert.equal(s.styles['--shop-cursor'], undefined, 'the built-in pointer is untouched');
});

test('empty, missing and invalid old avatar choices migrate without charging or losing receipts', () => {
  for (const v of [undefined, 2, 3]) {
    for (const avatar of [undefined, null, '', 'avatar-unknown', 'cursor-leaf']) {
      const initial = {v, points: 37, owned: {'avatar-starling': true, 'avatar-fox': true}, equipped: {avatar}};
      const s = wallet(initial), current = s.points.get();
      assert.equal(current.equipped.avatar, 'avatar-starling', `schema ${v}, old avatar ${avatar}`);
      assert.equal(current.total, 37);
      assert.equal(current.owned['avatar-starling'], true);
      assert.equal(current.owned['avatar-fox'], true);
      assert.match(s.styles['--shop-avatar'], /avatar-starling\.svg/);
    }
  }
});

test('existing valid avatar choices and their ownership survive the new default', () => {
  for (const avatar of ['avatar-cloudy', 'avatar-owl', 'avatar-bear', 'avatar-rocket',
    'avatar-luna', 'avatar-fox', 'avatar-bot', 'avatar-octo', 'avatar-crown',
    'avatar-bob', 'avatar-ponytail', 'avatar-buns', 'avatar-waves', 'avatar-blossom', 'avatar-beret']) {
    const s = wallet({v: 3, points: 1234, owned: {[avatar]: true}, equipped: {avatar}});
    assert.equal(s.points.get().equipped.avatar, avatar);
    assert.equal(s.points.get().owned[avatar], true);
    assert.equal(s.points.get().owned['avatar-starling'], true);
    assert.equal(s.points.get().total, 1234);
    assert.ok(s.styles['--shop-avatar'].includes(avatar + '.svg'));
  }
});

test('new hairstyle avatars use the existing accessory rarity prices and keep the free default', () => {
  for (const [avatar, rarity, price] of [
    ['avatar-bob', 'rare', 1000], ['avatar-ponytail', 'rare', 1000],
    ['avatar-buns', 'epic', 3000], ['avatar-waves', 'epic', 3000],
    ['avatar-blossom', 'legend', 5000], ['avatar-beret', 'legend', 5000]
  ]) {
    const s = wallet({v: 3, points: 5000, owned: {}, equipped: {}});
    assert.equal(s.shop.rarityOf(avatar), rarity);
    assert.equal(s.shop.priceOf(avatar), price);
    assert.equal(s.points.get().owned[avatar], undefined, 'new designs are not silently granted');
    assert.equal(s.shop.buy(avatar).cost, price);
    assert.equal(s.points.get().equipped.avatar, avatar);
    assert.equal(s.points.get().total, 5000 - price);
    assert.equal(s.shop.buy(avatar).already, true);
    assert.equal(s.points.get().total, 5000 - price, 're-equipping must not debit again');
    s.shop.reset('avatar');
    assert.equal(s.points.get().equipped.avatar, 'avatar-starling');
    assert.equal(s.points.get().owned[avatar], true, 'reset keeps the purchased design');
  }
});

test('switching and resetting back to Happy Smile stays free and persists the default', () => {
  const s = wallet({v: 3, points: 0, owned: {'avatar-fox': true}, equipped: {avatar: 'avatar-fox'}});
  const back = s.shop.buy('avatar-starling');
  assert.deepEqual({ok: back.ok, cost: back.cost}, {ok: true, cost: 0});
  assert.equal(s.points.get().total, 0);
  assert.equal(s.points.get().equipped.avatar, 'avatar-starling');
  assert.equal(s.shop.buy('avatar-starling').already, true);
  assert.equal(s.shop.buy('avatar-fox').cost, 0);
  s.shop.reset('avatar');
  assert.equal(s.points.get().equipped.avatar, 'avatar-starling');
  assert.equal(s.points.get().total, 0);
  assert.equal(s.points.get().owned['avatar-fox'], true);
  assert.match(s.styles['--shop-avatar'], /avatar-starling\.svg/);
  const reloaded = wallet(JSON.parse(s.store.get('joyflock.shop.v1')));
  assert.equal(reloaded.points.get().equipped.avatar, 'avatar-starling');
  assert.equal(reloaded.points.get().total, 0);
  s.points.set({vip: true, annualVip: true});
  assert.equal(s.shop.freeFor('avatar-starling'), false, 'the free baseline is not a membership perk');
});

test('cross-tab avatar updates preserve selected faces and normalise cleared old saves', () => {
  const s = wallet();
  s.storage({v: 3, points: 91, owned: {'avatar-crown': true}, equipped: {avatar: 'avatar-crown'}});
  assert.equal(s.points.get().equipped.avatar, 'avatar-crown');
  assert.match(s.styles['--shop-avatar'], /avatar-crown\.svg/);
  s.storage({v: 3, points: 91, owned: {'avatar-crown': true}, equipped: {avatar: ''}});
  assert.equal(s.points.get().equipped.avatar, 'avatar-starling');
  assert.equal(s.points.get().owned['avatar-crown'], true);
  assert.equal(s.points.get().total, 91);
  assert.match(s.styles['--shop-avatar'], /avatar-starling\.svg/);
});

test('a baseline resolves to an empty style, and equipping one really removes the skin', () => {
  const s = wallet();
  assert.equal(s.shop.cosmeticTheme('gomoku-piece-default'), '');
  assert.equal(s.shop.cosmeticTheme('four-board-aurora'), 'aurora');
  assert.equal(s.shop.cosmeticTheme('ball-jade'), 'jade');
  assert.equal(s.shop.trailStyle('trail-none'), '');
  assert.equal(s.shop.trailStyle('trail-star'), 'star');
  const bought = s.shop.buy('cue-jade');
  assert.deepEqual({ok: bought.ok, cost: bought.cost}, {ok: true, cost: 3000});
  assert.equal(s.attrs['data-shop-cue'], 'jade');
  const back = s.shop.buy('cue-default');
  assert.deepEqual({ok: back.ok, cost: back.cost}, {ok: true, cost: 0});
  assert.equal(s.attrs['data-shop-cue'], undefined, 'switching back restores the original cue');
  assert.equal(s.points.get().total, 7000, 'going back to a baseline never charges again');
  s.shop.buy('trail-cloud');
  assert.equal(s.attrs['data-shop-trail'], 'cloud');
  s.shop.reset('trail');
  assert.equal(s.attrs['data-shop-trail'], undefined, 'reset returns to no trail');
});

test('four board games NEVER share an equip slot or a published skin', () => {
  const s = wallet();
  assert.equal(s.shop.buy('gomoku-piece-jade').ok, true);
  const eq = s.points.get().equipped;
  assert.equal(eq.gomokuPiece, 'gomoku-piece-jade');
  for (const g of ['four', 'chess', 'xo'])
    assert.equal(eq[g + 'Piece'], `${g}-piece-default`, `${g} is untouched`);
  assert.equal(s.attrs['data-shop-gomoku-piece'], 'jade');
  for (const g of ['four', 'chess', 'xo'])
    assert.equal(s.attrs[`data-shop-${g}-piece`], undefined, `${g} publishes no skin`);
  s.shop.buy('chess-board-aurora');
  assert.equal(s.attrs['data-shop-chess-board'], 'aurora');
  assert.equal(s.attrs['data-shop-gomoku-board'], undefined);
  s.shop.reset('gomokuPiece');
  assert.equal(s.attrs['data-shop-gomoku-piece'], undefined);
  assert.equal(s.attrs['data-shop-chess-board'], 'aurora', 'resetting one game leaves the others alone');
  assert.equal(s.shop.gameKeys.length, 4);
  assert.equal(Object.keys(s.shop.gameIds).length, 11);
});

test('schema 3 splits legacy shared piece/board saves into eight independent slots', () => {
  const legacy = {
    points: 8000, owned: {},
    equipped: {
      cursor: 'cursor-star', avatar: 'avatar-fox', plane: 'plane-classic',
      trail: 'trail-star', piece: 'piece-neon', board: 'board-jade',
      ball: 'ball-neon', cue: 'cue-neon', table: 'table-aurora'
    }
  };
  const s = wallet(legacy), eq = s.points.get().equipped;
  assert.equal(eq.trail, 'trail-none');
  assert.equal(eq.ball, 'ball-default');
  assert.equal(eq.cue, 'cue-default');
  assert.equal(eq.table, 'table-aurora', 'an explicit choice survives');
  assert.equal(eq.avatar, 'avatar-fox');
  assert.equal(eq.piece, undefined, 'the old shared slot is gone');
  assert.equal(eq.board, undefined, 'the old shared slot is gone');
  /* `piece-neon` was the automatic starter: it becomes every game's baseline. */
  for (const g of GAMES) assert.equal(eq[g + 'Piece'], `${g}-piece-default`);
  /* `board-jade` was an explicit paid choice: it is replicated to all four
     games AND granted for free, so splitting a product never charges twice. */
  for (const g of GAMES) {
    assert.equal(eq[g + 'Board'], ['four','chess'].includes(g) ? `${g}-board-jade` : `${g}-board-default`);
    assert.equal(s.points.get().owned[`${g}-board-jade`], true);
  }
  assert.equal(s.points.get().total, 8000, 'the wallet balance is never touched');
  const marked = wallet({v: 3, equipped: {fourPiece: 'four-piece-aurora'}});
  assert.equal(marked.points.get().equipped.fourPiece, 'four-piece-aurora',
    'a save already on schema 3 is never re-migrated');
  marked.shop.buy('cursor-ember');
  assert.equal(JSON.parse(marked.store.get('joyflock.shop.v1')).v, 3);
});

test('装配中 ribbon: restored green corner mark, equipped cards only', () => {
  assert.match(shop, /<span class="shop-state" aria-hidden="true"><\/span>/);
  assert.match(shop, /ribbon\.textContent=equipped\?t\('Equipped','装配中'\):''/);
  assert.ok(!/shop-state[^>]*>\s*已拥有/.test(shop),
    'the ribbon never repeats the bottom 已拥有 pill');
  const rule = css.match(/\n\.shop-state\{[^}]*\}/)?.[0] || '';
  assert.match(rule, /transform:rotate\(38deg\)/);
  assert.match(rule, /background:var\(--shop-owned\)/);
  assert.match(rule, /font-size:var\(--shop-label-size\)/);
  assert.match(css, /\.shop-state:empty\{display:none\}/);
  assert.match(shop, /var GRADE_ORDER=\{default:-1,rare:0,epic:1,legend:2\}/,
    'every baseline leads its own section');
  assert.match(css, /\[data-rarity="default"\]\{--shop-rarity:#9fb0cf/);
});

test('default preview palettes exist for stones, board, balls, cue and cloth', () => {
  for (const selector of [
    '\\[data-cosmetic="default"\\],\\[data-cosmetic-piece="default"\\]',
    '\\[data-cosmetic-board="default"\\]',
    '\\[data-billiard-ball="default"\\],\\[data-cosmetic-ball="default"\\]',
    '\\[data-billiard-cue="default"\\],\\[data-cosmetic-cue="default"\\]',
    '\\[data-billiard-table="default"\\],\\[data-cosmetic-table="default"\\]'
  ]) assert.match(palettes, new RegExp(selector));
  assert.match(shop, /rarityOf\(item\.id\)==='default'\?'default'/,
    'default cards use the preview palette instead of publishing a skin');
  assert.match(shop, /data-trail-style="'\+esc\(API\.trailStyle\(id\)\|\|'none'\)\+'"/);
  assert.match(trailFx, /if\(style==='none'\)\{drawPlane\(c,w,h,px,py,now\);return;\}/);
  assert.match(trailCss, /\.shop-trail-stage\[data-trail-style="none"\]::after/);
  assert.match(trailCss, /\.shop-current-trail\[data-trail-dot=""\]/);
  for (const g of GAMES)
    assert.match(palettes, new RegExp(`\\.shop-cosmetic-art\\[data-cosmetic-game="${g}"\\]`),
      `${g} draws its own preview silhouette`);
});

test('retired cosmetic receipts survive while their equipped slots return to default',()=>{
 const initial={v:3,points:6543,owned:{'gomoku-board-jade':true,'chess-piece-aurora':true},equipped:{gomokuBoard:'gomoku-board-jade',chessPiece:'chess-piece-aurora',gomokuPiece:'gomoku-piece-jade'}};
 const s=wallet(initial),state=s.points.get();
 assert.equal(state.total,6543);assert.equal(state.owned['gomoku-board-jade'],true);assert.equal(state.owned['chess-piece-aurora'],true);
 assert.equal(state.equipped.gomokuBoard,'gomoku-board-default');assert.equal(state.equipped.chessPiece,'chess-piece-default');
 assert.equal(state.equipped.gomokuPiece,'gomoku-piece-jade');
 assert.equal(s.shop.buy('gomoku-board-jade').ok,false);assert.equal(s.shop.buy('chess-piece-aurora').ok,false);
 assert.equal(s.points.get().total,6543);
 assert.equal(s.attrs['data-shop-gomoku-board'],undefined);assert.equal(s.attrs['data-shop-chess-piece'],undefined);
});

test('restored Four boards retain paid receipts and equip independently without charging twice',()=>{
 const s=wallet({v:3,points:37,owned:{'four-board-jade':true},equipped:{fourBoard:'four-board-jade',fourPiece:'four-piece-aurora',chessBoard:'chess-board-neon'}});
 assert.equal(s.points.get().equipped.fourBoard,'four-board-jade');
 assert.equal(s.attrs['data-shop-four-board'],'jade');
 assert.equal(s.shop.buy('four-board-default').cost,0);
 assert.equal(s.attrs['data-shop-four-board'],undefined);
 assert.equal(s.shop.buy('four-board-jade').cost,0);
 assert.equal(s.points.get().total,37);
 assert.equal(s.points.get().equipped.fourPiece,'four-piece-aurora');
 assert.equal(s.points.get().equipped.chessBoard,'chess-board-neon');
 const reloaded=wallet(JSON.parse(s.store.get('joyflock.shop.v1')));
 assert.equal(reloaded.points.get().equipped.fourBoard,'four-board-jade');
 assert.equal(reloaded.points.get().owned['four-board-jade'],true);
});

test('new Four boards use existing rarity prices and default reset never costs coins',()=>{
 for(const [theme,price]of [['neon',1000],['jade',3000],['aurora',5000]]){
  const s=wallet(),id='four-board-'+theme;
  assert.equal(s.shop.buy(id).cost,price);
  assert.equal(s.points.get().equipped.fourBoard,id);
  assert.equal(s.points.get().total,10000-price);
  s.shop.reset('fourBoard');
  assert.equal(s.points.get().equipped.fourBoard,'four-board-default');
  assert.equal(s.shop.buy(id).cost,0);
  assert.equal(s.points.get().total,10000-price);
 }
});

test('the whole site ships the bumped cache key', () => {
  assert.equal(points.match(/var VERSION='([^']+)'/)?.[1], KEY);
  assert.equal(shop.match(/var VERSION='([^']+)'/)?.[1], KEY);
  for (const p of ['dist/shop.html', 'dist/site-trail-fx.js',
    'dist/table/game-cosmetics.js', 'dist/table/cosmetics-rules.js',
    'dist/table/index.html', 'dist/table/pool-view.js'])
    assert.ok(read(p).includes(KEY), `${p} uses ${KEY}`);
  for (const asset of ['site-shop.css', 'site-cosmetics.css', 'site-trail.css'])
    assert.match(page, new RegExp(asset + '\\?v=' + KEY), `${asset} loads on the bumped key`);
  assert.ok(!/20261112-poollight1/.test(page));
});
