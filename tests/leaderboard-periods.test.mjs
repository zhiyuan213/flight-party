import {SocialUI} from '../dist/social-ui.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source = readFileSync(new URL('../dist/social-ui.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

/* A tiny DOM mock is enough: the row builder only uses createElement, append,
   textContent, className, dataset and setAttribute. */
function element() {
  return {
    children: [], className: '', textContent: '', dataset: {}, attrs: {}, style: {},
    append(...items) { this.children.push(...items); },
    setAttribute(key, value) { this.attrs[key] = value; },
    addEventListener() {},
    getAttribute(key) { return this.attrs[key]; },
    replaceChildren(...items) { this.children = items; }
  };
}

function panelFor(period, rows) {
  const list = element();
  const tag = element();
  const tabs = ['month', 'week', 'day'].map(key => {
    const button = element(); button.attrs['data-period'] = key; button.dataset.period = key; return button;
  });
  const panel = {
    innerHTML: '', ownerDocument: {createElement: () => element()},
    querySelector(selector) {
      if (selector === '#leaderboard') return list;
      if (selector === '.demo-tag') return tag;
      return null;
    },
    querySelectorAll(selector) { return selector === '[data-period]' ? tabs : []; },
    addEventListener() {}
  };
  const ui = new SocialUI({getLanguage: () => 'en'});
  ui.leaderboard = panel;
  ui.boardTab = period;
  ui.boardsLoaded = true;                 // skip the network batch
  ui.boardCache.set(period, rows);
  return {ui, panel, list, tag, tabs};
}

test('the three period tabs are a score board with games + score only', () => {
  const ui = new SocialUI();
  const html = ui.boardShell('zh');
  assert.equal((html.match(/data-period=/g) || []).length, 3);
  for (const label of ['月积分榜', '周积分榜', '日积分榜']) assert.ok(html.includes(label), label);
  assert.ok(html.includes('<span>玩家</span><span>局数</span><span>积分</span>'));
  assert.ok(!html.includes('Joy Coins 榜'), 'no Joy Coins board label remains');
  assert.ok(!html.includes('data-leaderboard-tab'), 'old tab attribute retired');
  assert.ok(html.includes('demo-tag'), 'sample rows are advertised');
  const en = ui.boardShell('en');
  assert.ok(en.includes('Standings') && en.includes('Score'));
});

test('real server rows win and the board prints games + score', () => {
  for (const period of ['month', 'week', 'day']) {
    const rows = [{name: 'Real <pilot>', games: 9, wins: 2, points: 200,
      member: true, annualMember: true, avatarUrl: '/api/avatars/system/1'}];
    const {ui, list, tag, tabs} = panelFor(period, rows);
    ui.renderLeaderboard();
    assert.equal(list.children.length, 10, period + ': ten rows');
    const nameOf = li => li.children[1].children[1].children[0].children[0].textContent;
    const real = list.children.find(li => nameOf(li) === 'Real <pilot>');
    assert.ok(real, period + ': the real server row is on the board');
    assert.equal(real.children[2].className, 'ranking-points');
    assert.equal(real.children[2].textContent, '9', period + ': games only, no wins/games');
    assert.equal(real.children[3].className, 'ranking-games');
    assert.equal(real.children[3].textContent, '200', period + ': the cumulative score');
    assert.equal(nameOf(real), 'Real <pilot>', period + ': name is text, never innerHTML');
    assert.equal(tag.hidden, false, period + ': demo rows are on the board');
    assert.equal(tabs.find(t => t.attrs['data-period'] === period).attrs['aria-pressed'], 'true');
  }
});

test('ten real rows suppress the sample rows and the demo tag', () => {
  const rows = Array.from({length: 10}, (_, i) => ({name: 'Pilot ' + i, games: 20 - i, wins: 10 - i, points: 100}));
  const {ui, list, tag} = panelFor('month', rows);
  ui.renderLeaderboard();
  assert.equal(list.children.length, 10);
  assert.equal(tag.hidden, true, 'live standings are never labelled as samples');
  assert.ok(!list.children.some(li => li.children[1].children[1].children[0].children[0].textContent.startsWith('Ava')));
});

test('switching periods only repaints from the cache, without a fetch', () => {
  const calls = [];
  class OfflineSocial extends SocialUI {}
  const ui = new OfflineSocial({getLanguage: () => 'en'});
  const list = element(), tag = element();
  const tabs = ['month', 'week', 'day'].map(key => { const b = element(); b.attrs['data-period'] = key; b.dataset.period = key; return b; });
  ui.leaderboard = {
    innerHTML: '', ownerDocument: {createElement: () => element()},
    querySelector: s => s === '#leaderboard' ? list : s === '.demo-tag' ? tag : null,
    querySelectorAll: s => s === '[data-period]' ? tabs : [],
    addEventListener() {}
  };
  ui.boardsLoaded = true;
  ui.boardCache.set('week', [{name: 'Week pilot', games: 4, wins: 1}]);
  globalThis.fetch = () => { calls.push('fetch'); return Promise.reject(new Error('offline')); };
  try {
    ui.boardTab = 'week'; ui.renderLeaderboard();
    ui.boardTab = 'day'; ui.renderLeaderboard();
    ui.boardTab = 'month'; ui.renderLeaderboard();
    assert.equal(calls.length, 0, 'three switches, zero requests');
    assert.equal(list.children.length, 10, 'every period keeps ten rows');
  } finally { delete globalThis.fetch; }
});

test('the batch fetches each period exactly once', async () => {
  const calls = [];
  const saved = globalThis.fetch;
  globalThis.fetch = url => {
    calls.push(String(url));
    return Promise.resolve(new Response('[]', {status: 200, headers: {'content-type': 'application/json'}}));
  };
  try {
    const ui = new SocialUI({getLanguage: () => 'en'});
    const list = element(), tag = element();
    ui.leaderboard = {
      innerHTML: '', ownerDocument: {createElement: () => element()},
      querySelector: s => s === '#leaderboard' ? list : s === '.demo-tag' ? tag : null,
      querySelectorAll: () => [], addEventListener() {}
    };
    ui.boardsLoaded = true;
    await ui.loadAllLeaderboards();
    assert.equal(calls.length, 3, 'month + week + day in one parallel batch');
    for (const period of ['month', 'week', 'day'])
      assert.equal(calls.filter(url => url.endsWith('period=' + period)).length, 1);
  } finally { globalThis.fetch = saved; }
});

test('the shared source keeps the tab contract free of the retired markup', () => {
  assert.doesNotMatch(source, /data-leaderboard-tab|leaderboard-list|lb-tab-/);
  assert.doesNotMatch(source, /Pilot leaderboard|Joy Coins 榜/);
  assert.match(source, /const PERIODS=\['month','week','day'\]/);
});
