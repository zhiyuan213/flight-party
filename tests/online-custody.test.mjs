/* 2026-11-14 · Online custody state machine.
   Covers the shared pure contract (dist/online-custody.js) and its DOM renderer
   (dist/online-custody-ui.js). The Java twin is com.flightparty.online.CustodyPolicy.
   See docs/ONLINE-GAME-MANAGEMENT.md. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RECONNECT_GRACE_MS, HOST_BOT_LEVEL,
  CUSTODY_ACTIVE, CUSTODY_GRACE, CUSTODY_HOSTED, SEAT_BOT,
  CUSTODY_STORAGE_PREFIX, custodyStorageKey, managedHumanSeats,
  isManagedOnlineRoom, isComputerMatch, custodyState, graceSecondsLeft,
  serverClock, CUSTODY_LABELS, custodyLabel, seatCustody,
  shouldRecordResult, reconnectTarget, IDLE_TURN_MS, HOSTED_PACE_MS,
  turnClockVisible, hostOnIdle, needsPresenceSignal
} from '../dist/online-custody.js';
import {
  CUSTODY_UI_VERSION, ensureCustodyStyles, custodyBadge, custodyBadgeHTML,
  updateCustodyBadges, noScoreNotice
} from '../dist/online-custody-ui.js';

/* ------------------------------------------------------------ contract */
test('30s grace and an easy host bot are the only constants', () => {
  assert.equal(RECONNECT_GRACE_MS, 30000);
  assert.equal(HOST_BOT_LEVEL, 'easy');
  assert.equal(CUSTODY_STORAGE_PREFIX, 'joyflock.online.room.');
  assert.equal(CUSTODY_ACTIVE, 'active');
  assert.equal(CUSTODY_GRACE, 'grace');
  assert.equal(CUSTODY_HOSTED, 'hosted');
  assert.equal(SEAT_BOT, 'bot');
});

test('reconnect storage is isolated per game', () => {
  assert.equal(custodyStorageKey('four'), 'joyflock.online.room.four');
  assert.equal(custodyStorageKey('pool'), 'joyflock.online.room.pool');
  assert.equal(custodyStorageKey('flight'), 'joyflock.online.room.flight');
  assert.notEqual(custodyStorageKey('four'), custodyStorageKey('pool'));
  assert.equal(reconnectTarget('four', 'r-1').game, 'four');
  assert.equal(reconnectTarget('four', 'r-1').roomId, 'r-1');
  assert.equal(reconnectTarget('', '').game, 'flight');
});

test('two real human identities gate the managed flow', () => {
  assert.equal(managedHumanSeats(null), 0);
  assert.equal(managedHumanSeats([{principal: 'a'}, {principal: 'b', custody: CUSTODY_HOSTED}]), 2);
  assert.equal(isManagedOnlineRoom({phase: 'PLAYING', managed: true}), true);
  assert.equal(isManagedOnlineRoom({phase: 'PLAYING', managed: false}), false);
  assert.equal(isManagedOnlineRoom({phase: 'PLAYING', seats: [{principal: 'a'}, {principal: 'b'}]}), true);
  assert.equal(isManagedOnlineRoom({phase: 'PLAYING', seats: [{principal: 'a'}, {bot: true}]}), false);
  assert.equal(isManagedOnlineRoom({phase: 'WAITING', seats: [{principal: 'a'}, {principal: 'b'}]}), false);
  assert.equal(isComputerMatch({managed: false}), true);
  assert.equal(isComputerMatch({managed: true}), false);
});

test('grace resolves to hosted once its absolute server deadline passes', () => {
  const now = 1_700_000_000_000;
  assert.equal(custodyState({custody: CUSTODY_ACTIVE}, now), CUSTODY_ACTIVE);
  assert.equal(custodyState({custody: CUSTODY_GRACE, graceUntil: now + 20000}, now), CUSTODY_GRACE);
  assert.equal(custodyState({custody: CUSTODY_GRACE, graceUntil: now + 1}, now), CUSTODY_GRACE);
  assert.equal(custodyState({custody: CUSTODY_GRACE, graceUntil: now}, now), CUSTODY_HOSTED);
  assert.equal(custodyState({custody: CUSTODY_HOSTED}, now), CUSTODY_HOSTED);
  assert.equal(custodyState({bot: true, custody: SEAT_BOT}, now), SEAT_BOT);
  assert.equal(custodyState({bot: true}, now), SEAT_BOT);
  assert.equal(custodyState(null, now), CUSTODY_ACTIVE);
  // A hosted seat keeps human=true/identity; legacy shapes still work.
  assert.equal(custodyState({state: CUSTODY_HOSTED, bot: true, human: true}, now), CUSTODY_HOSTED);
  assert.equal(custodyState({hosted: true}, now), CUSTODY_HOSTED);
});

test('countdown uses the authoritative server clock, not the device clock', () => {
  const receivedAt = 5000, serverNow = 1_700_000_000_000, until = serverNow + 30000;
  assert.equal(serverClock(serverNow, receivedAt, 5000), serverNow);
  assert.equal(serverClock(serverNow, receivedAt, 15000), serverNow + 10000);
  assert.equal(graceSecondsLeft(until, serverClock(serverNow, receivedAt, 5000)), 30);
  assert.equal(graceSecondsLeft(until, serverClock(serverNow, receivedAt, 15000)), 20);
  assert.equal(graceSecondsLeft(until, serverClock(serverNow, receivedAt, 35000)), 0);
  assert.equal(graceSecondsLeft(0, serverNow), 0);
});

test('labels are bilingual and the grace label carries the live seconds', () => {
  assert.equal(custodyLabel(CUSTODY_GRACE, 'zh', 17), '等待重连 17s');
  assert.equal(custodyLabel(CUSTODY_HOSTED, 'zh'), '托管中 · 简单电脑');
  assert.equal(custodyLabel(CUSTODY_GRACE, 'en', 3), 'Reconnecting 3s');
  assert.equal(custodyLabel(CUSTODY_HOSTED, 'en'), 'Hosted · Easy bot');
  assert.equal(custodyLabel(CUSTODY_ACTIVE, 'zh'), '');
  assert.match(CUSTODY_LABELS.zh.noScore, /不记录数据、不计 Joy Coins/);
  assert.match(CUSTODY_LABELS.en.noScore, /no data, no Joy Coins/);
});

test('an idle turn is hosted directly and hosted turns have no clock', () => {
  const now = 1_700_000_000_000;
  assert.equal(IDLE_TURN_MS, 30000);
  assert.equal(HOSTED_PACE_MS, 1200);
  assert.equal(hostOnIdle(CUSTODY_ACTIVE, now - 1, now), true);
  assert.equal(hostOnIdle(CUSTODY_ACTIVE, now + 1, now), false);
  assert.equal(hostOnIdle(CUSTODY_ACTIVE, 0, now), false);
  assert.equal(hostOnIdle(CUSTODY_GRACE, now - 1, now), false);
  assert.equal(hostOnIdle(CUSTODY_HOSTED, now - 1, now), false);
  assert.equal(hostOnIdle(SEAT_BOT, now - 1, now), false);
  assert.equal(turnClockVisible(CUSTODY_ACTIVE), true);
  assert.equal(turnClockVisible(CUSTODY_GRACE), true);
  assert.equal(turnClockVisible(CUSTODY_HOSTED), false, 'the easy bot plays at its own pace');
  assert.equal(turnClockVisible(SEAT_BOT), false);
  assert.equal(needsPresenceSignal(CUSTODY_ACTIVE), false, 'polling an active seat is not presence');
  assert.equal(needsPresenceSignal(CUSTODY_GRACE), true);
  assert.equal(needsPresenceSignal(CUSTODY_HOSTED), true, 'a pointer event cancels hosted');
});

test('only active/bot seats may be scored', () => {
  assert.equal(shouldRecordResult(CUSTODY_ACTIVE), true);
  assert.equal(shouldRecordResult(SEAT_BOT), true);
  assert.equal(shouldRecordResult(CUSTODY_GRACE), false);
  assert.equal(shouldRecordResult(CUSTODY_HOSTED), false);
});

test('seatCustody reads both the table View arrays and the flight seat list', () => {
  const now = 1_700_000_000_000;
  const table = {managed: true, phase: 'PLAYING',
    custody: [CUSTODY_ACTIVE, CUSTODY_GRACE], graceUntil: [0, now + 12000], bots: [false, false]};
  const mine = seatCustody(table, 0, now, 'zh');
  assert.equal(mine.state, CUSTODY_ACTIVE);
  assert.equal(mine.label, '');
  assert.equal(mine.noScore, false);
  assert.equal(mine.managed, true);
  const away = seatCustody(table, 1, now, 'zh');
  assert.equal(away.state, CUSTODY_GRACE);
  assert.equal(away.seconds, 12);
  assert.equal(away.label, '等待重连 12s');
  assert.equal(away.noScore, true);
  assert.match(away.hint, /30 秒/);
  const flight = {managed: true, seats: [
    {custody: CUSTODY_ACTIVE, graceUntil: 0},
    {custody: CUSTODY_HOSTED, graceUntil: 0}
  ]};
  const hosted = seatCustody(flight, 1, now, 'en');
  assert.equal(hosted.state, CUSTODY_HOSTED);
  assert.equal(hosted.label, 'Hosted · Easy bot');
  assert.equal(hosted.noScore, true);
  assert.equal(seatCustody(null, 0, now, 'zh').state, CUSTODY_ACTIVE);
});

/* --------------------------------------------------------------- mini DOM */
class El {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.className = ''; this.dataset = {}; this.attrs = new Map();
    this.children = []; this.parent = null; this.textContent = '';
    this.hidden = false; this.title = '';
  }
  setAttribute(k, v) {this.attrs.set(k, String(v));}
  getAttribute(k) {return this.attrs.get(k) ?? null;}
  append(...nodes) {for (const n of nodes) {n.parent = this;this.children.push(n);}}
  appendChild(node) {this.append(node);}
  remove() {if (this.parent)this.parent.children = this.parent.children.filter(n => n !== this);}
  get classes() {return this.className.split(/\s+/).filter(Boolean);}
  querySelector(selector) {return this.querySelectorAll(selector)[0] || null;}
  querySelectorAll(selector) {
    const names = selector.replace(/^\[data-seat-index\]$/, '[data-seat-index]')
      .split(',').map(s => s.trim().replace(/^\./, '').replace(/^\[|\]$/g, ''));
    const out = [];
    const walk = node => {
      for (const child of node.children) {
        if (selector === '[data-seat-index]' && child.dataset.seatIndex !== undefined)out.push(child);
        else for (const name of names) {
          if (name.startsWith('data-seat-index') && child.dataset.seatIndex !== undefined)out.push(child);
          else if (child.classes.includes(name))out.push(child);
        }
        walk(child);
      }
    };
    walk(this);return out;
  }
  get outerHTML() {
    return `<${this.tagName.toLowerCase()} class="${this.className}">${this.children.map(c => c.outerHTML || c.textContent).join('')}</${this.tagName.toLowerCase()}>`;
  }
}
const makeDoc = () => {
  const doc = {createElement: tag => new El(tag), head: new El('head')};
  /* A real document indexes appended <style> nodes by id, so a second
     ensureCustodyStyles() returns the very same element. */
  doc.getElementById = id => doc['#' + id] || doc.head.children.find(node => node.id === id) || null;
  return doc;
};

/* --------------------------------------------------------------- renderer */
test('shared renderer installs one stylesheet and builds both badge variants', () => {
  assert.equal(CUSTODY_UI_VERSION, '20261115-joincoin1');
  const doc = makeDoc();
  const first = ensureCustodyStyles(doc);
  assert.ok(first);
  assert.equal(ensureCustodyStyles(doc), first);
  assert.match(first.textContent, /\.seat-custody/);
  assert.match(first.textContent, /\.custody-no-score\[hidden\]/);
  assert.match(first.textContent, /prefers-reduced-motion/);
  const now = 1_700_000_000_000;
  const grace = seatCustody({managed: true, custody: [CUSTODY_GRACE], graceUntil: [now + 9000]}, 0, now, 'zh');
  const badge = custodyBadge(doc, grace);
  assert.equal(badge.dataset.state, CUSTODY_GRACE);
  assert.equal(badge.querySelector('.custody-count').textContent, '9s');
  assert.match(badge.title, /30 秒/);
  const hosted = custodyBadge(doc, seatCustody({managed: true, custody: [CUSTODY_HOSTED]}, 0, now, 'en'), 'custody-badge');
  assert.equal(hosted.className, 'custody-badge');
  assert.equal(hosted.querySelector('.custody-text').textContent, 'Hosted · Easy bot');
  const html = custodyBadgeHTML(grace);
  assert.match(html, /data-state="grace"/);
  assert.match(html, /等待重连/);
  assert.match(html, /9s/);
  assert.doesNotMatch(html, /<script/i);
});

test('badge text is escaped so a server-supplied label cannot inject markup', () => {
  const html = custodyBadgeHTML({state: CUSTODY_HOSTED, label: '<img src=x>', hint: '" onmouseover="x',
    seconds: 0, lang: 'zh', noScore: true});
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img/);
  assert.doesNotMatch(html, /onmouseover="x"/);
});

test('updateCustodyBadges ticks the countdown and clears a reclaimed seat', () => {
  const doc = makeDoc();
  const root = new El('div'), row = new El('div'), line = new El('div');
  row.dataset.seatIndex = '1';line.className = 'seat-name';row.append(line);root.append(row);
  const now = 1_700_000_000_000;
  const room = until => ({managed: true, custody: [CUSTODY_ACTIVE, CUSTODY_GRACE], graceUntil: [0, until]});
  updateCustodyBadges(doc, root, room(now + 5000), now, 'zh', '[data-seat-index]');
  let badge = row.querySelector('.seat-custody');
  assert.ok(badge, 'a badge is created for a seat that becomes absent');
  assert.equal(badge.querySelector('.custody-count').textContent, '5s');
  assert.equal(row.dataset.custody, CUSTODY_GRACE);
  /* The server clock advanced 3s while the absolute deadline stayed fixed:
     5s remaining at t0 becomes 2s at t0+3000. */
  updateCustodyBadges(doc, root, room(now + 5000), now + 3000, 'zh', '[data-seat-index]');
  assert.equal(badge.querySelector('.custody-count').textContent, '2s');
  updateCustodyBadges(doc, root, {managed: true, custody: [CUSTODY_ACTIVE, CUSTODY_ACTIVE], graceUntil: [0, 0]}, now, 'zh', '[data-seat-index]');
  assert.equal(row.querySelector('.seat-custody'), null);
  assert.equal(row.dataset.custody, undefined);
});

test('no-score notice is hidden-by-default capable and bilingual', () => {
  const doc = makeDoc();
  const zh = noScoreNotice(doc, 'zh');
  assert.match(zh.textContent, /不记录数据、不计 Joy Coins/);
  assert.equal(zh.dataset.custodyNoScore, '1');
  zh.hidden = true;
  assert.equal(zh.hidden, true);
  assert.match(noScoreNotice(doc, 'en').textContent, /no data, no Joy Coins/);
});
