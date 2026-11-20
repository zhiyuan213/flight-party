import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as accountName from '../dist/account-name.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const SUFFIX = '&name=20261121-accountname1';

test('normalizeDisplayName keeps real nicknames and rejects every transient label', () => {
  assert.equal(accountName.normalizeDisplayName('  zhiyuanC  '), 'zhiyuanC');
  assert.equal(accountName.normalizeDisplayName('大卫'), '大卫');
  for (const label of ['0', '你', 'You', 'Restoring…', '恢复登录中…', 'Reconnect',
    '重新连接', '登录', '登录 / 注册', '账号', 'Account', 'Sign in', 'Sign in / Register', '游客', 'Guest']) {
    assert.equal(accountName.normalizeDisplayName(label), '', `${label} is not a nickname`);
  }
  assert.equal(accountName.normalizeDisplayName(null), '');
  assert.equal(accountName.normalizeDisplayName('x'.repeat(100)).length, 64);
});

test('cachedDisplayName reads localStorage, the parent-domain cookie, then the legacy cookie', () => {
  const savedStorage = globalThis.localStorage, savedDocument = globalThis.document;
  try {
    const store = new Map([['joyflock.accountName', 'zhiyuanC']]);
    globalThis.localStorage = {getItem: key => store.get(key) ?? null};
    globalThis.document = {cookie: 'joyflock.displayName=CookieName; joyflock_account=Legacy'};
    assert.equal(accountName.cachedDisplayName(), 'zhiyuanC', 'same-document cache wins');
    store.clear();
    assert.equal(accountName.cachedDisplayName(), 'CookieName', 'parent-domain cookie reaches the iframe');
    globalThis.document = {cookie: 'joyflock_account=Legacy'};
    assert.equal(accountName.cachedDisplayName(), 'Legacy', 'host-only legacy cookie is still read');
    globalThis.document = {cookie: 'joyflock.displayName=0; joyflock_account=0'};
    assert.equal(accountName.cachedDisplayName(), '', 'guest marker is never a nickname');
  } finally {
    globalThis.localStorage = savedStorage;
    globalThis.document = savedDocument;
  }
});

test('trustedParentOrigin accepts only JoyFlock hosts and local previews', () => {
  const current = 'https://flight.joyflock.com';
  for (const origin of ['https://flight.joyflock.com', 'https://joyflock.com',
    'https://www.joyflock.com', 'http://localhost:8080', 'http://127.0.0.1:8080']) {
    assert.equal(accountName.trustedParentOrigin(origin, current), true, origin);
  }
  for (const origin of ['https://eviljoyflock.com', 'https://joyflock.com.evil.test',
    'https://example.com', 'not a URL']) {
    assert.equal(accountName.trustedParentOrigin(origin, current), false, origin);
  }
});

test('site-account mirrors the nickname into a parent-domain cookie and notifies the iframe', () => {
  const site = read('dist/site-account.js');
  assert.ok(site.includes("'joyflock.displayName='"), 'display cookie is written');
  assert.ok(site.includes("'; Domain=joyflock.com'"), 'production cookie is parent-domain scoped');
  assert.ok(site.includes('function setLabel(name){cache(name);renderSigned(name);announce(name);notifyGame();}'),
    'the initial /api/me reconciliation also reaches the game');

  const cache = site.slice(site.indexOf('function cache(name){'), site.indexOf('function renderSigned(name){'));
  const writes = [];
  const context = vm.createContext({
    localStorage: {setItem: (key, value) => writes.push(['storage', key, value])},
    location: {hostname: 'joyflock.com'},
    document: {set cookie(value) { writes.push(['cookie', value]); }, get cookie() { return ''; }},
    encodeURIComponent
  });
  vm.runInContext(cache + '\ncache("zhi yuan C");cache("");', context);
  assert.ok(writes.some(w => w[0] === 'cookie' && w[1].includes('joyflock.displayName=zhi%20yuan%20C') && w[1].includes('Domain=joyflock.com')));
  assert.ok(writes.some(w => w[0] === 'cookie' && w[1].includes('joyflock.displayName=0') && w[1].includes('Domain=joyflock.com')));
  context.location.hostname = 'localhost';
  writes.length = 0;
  vm.runInContext('cache("zhiyuanC");', context);
  assert.ok(writes.some(w => w[0] === 'cookie' && w[1].includes('joyflock.displayName=zhiyuanC') && !w[1].includes('Domain=')),
    'localhost keeps a host-only cookie');

  const notify = site.slice(site.indexOf('function notifyGame(){'), site.indexOf('var PLACEHOLDERS='));
  const calls = [];
  const frame = {
    src: 'https://flight.joyflock.com/table/index.html?game=pool&embed=joyflock',
    contentWindow: {postMessage: (data, target) => calls.push([data, target])}
  };
  const host = vm.createContext({
    document: {getElementById: id => id === 'game-frame' ? frame : null},
    location: {origin: 'https://joyflock.com', href: 'https://joyflock.com/?game=pool'},
    localStorage: {getItem: () => 'zhiyuanC'},
    CACHE_KEY: 'joyflock.accountName',
    URL
  });
  vm.runInContext(notify + '\nnotifyGame();', host);
  assert.equal(calls.length, 2, 'auth refresh and nickname are both posted');
  assert.equal(calls[0][1], 'https://flight.joyflock.com', 'targetOrigin is the frame, not the parent');
  assert.equal(calls[1][0].type, 'joyflock:account-name');
  assert.equal(calls[1][0].name, 'zhiyuanC');
});

test('the portal forwards the cached nickname on load and after a sign-in/out', () => {
  const portal = read('dist/portal/portal.js');
  assert.ok(portal.includes("type:'joyflock:account-name'"));
  const hello = portal.slice(portal.indexOf('const hello=()=>'), portal.indexOf('\n', portal.indexOf('const hello=()=>')));
  assert.ok(hello.includes('sendAccountName()'), 'initial iframe load receives the nickname');
  assert.ok(hello.includes("frame.addEventListener('load',hello)"), 'the forward runs on every game load');
  assert.ok(portal.includes('const syncAccountLabel=name=>{accountLabel=name||\'登录\';updateLanguage();sendAccountName();}'),
    'account changes are forwarded');
});

test('table games use the account name for seats, result cards, chat and reactions', () => {
  const table = read('dist/table/table.js');
  const pool = read('dist/table/pool-shell.js');
  assert.ok(table.includes("from '../account-name.js?v=20261121-accountname1'"));
  assert.ok(table.includes("const ownAccountName=()=>normalizeDisplayName(me?.account?.displayName)||sharedAccountName||''"));
  assert.ok(table.includes("const human=ownAccountName()||tableLabel('你')"));
  assert.ok(table.includes('selfName:ownAccountName()'));
  assert.ok(table.includes("name:ownAccountName()||tableLabel('你')"));
  assert.ok(table.includes("if(data?.type==='joyflock:account-name'){acceptAccountName(data.name);return;}"));
  assert.ok(table.includes('selfLabel:()=>names()[selfIndex()]||\'玩家 1\''));
  assert.ok(pool.includes('name:viewerName(current)'), 'local chat no longer prints 你');
  assert.ok(pool.includes('const [zh,en]=feedbackNames(options)'), 'system feedback uses the shared names');

  const block = pool.slice(pool.indexOf('function viewerIndex(options){'), pool.indexOf('function chatFullscreenCopy('));
  const context = vm.createContext({});
  vm.runInContext(block, context);
  const signed = context.feedbackNames({selfName: 'zhiyuanC', computer: true, mySeat: 1});
  assert.deepEqual(Array.from(signed[0]), ['zhiyuanC', '电脑']);
  assert.deepEqual(Array.from(signed[1]), ['zhiyuanC', 'Computer']);
  const guest = context.feedbackNames({computer: false, mySeat: 2});
  assert.deepEqual(Array.from(guest[0]), ['好友', '你']);
  assert.deepEqual(Array.from(guest[1]), ['Friend', 'You']);
  const online = context.feedbackNames({room: {names: ['zhiyuanC', 'Mia']}, computer: false, mySeat: 1});
  assert.deepEqual(Array.from(online[0]), ['zhiyuanC', 'Mia'], 'server room names stay authoritative');
});

test('flight and room dialogs use the nickname and stay import-strip safe', () => {
  const app = read('dist/app.js');
  const rooms = read('dist/live-room-ui.js');
  assert.ok(app.includes("from './account-name.js?v=20261121-accountname1'"));
  assert.ok(app.includes("let sharedAccountName=cachedDisplayName()"));
  assert.ok(app.includes("name:sharedAccountName||'You'"));
  assert.ok(app.includes("if(event.data?.type==='joyflock:account-name')adoptAccountName(event.data.name);"));
  assert.ok(app.includes("function safeOwnName(){return typeof ownDisplayName==='function'?ownDisplayName()||'You':'You';}"));
  assert.ok(app.includes("const own=typeof ownDisplayName==='function'?ownDisplayName():String(social.viewer?.name||'').trim();"));
  assert.ok(rooms.includes("ownSeatLabel(t('You','你'))"));
  assert.ok(rooms.includes("typeof cachedDisplayName==='function'"));
});

test('every changed script URL and generated native page carries the new cache key', () => {
  const pages = [
    'dist/contact.html', 'dist/membership.html', 'dist/privacy.html', 'dist/shop.html',
    'dist/terms.html', 'dist/index.html', 'dist/table/index.html', 'dist/portal/index.html',
    'dist/portal/native-flight.html', 'dist/portal/native-table.html',
    'dist/pool-result-preview.html', 'scripts/build-native-games.mjs'
  ];
  for (const page of pages) assert.ok(read(page).includes(SUFFIX), `${page}: cache key`);
  assert.ok(read('dist/table/table.js').includes('pool-shell.js?') &&
    read('dist/table/table.js').includes('&name=20261121-accountname1'), 'pool-shell import is versioned');
  assert.ok(read('dist/app.js').includes("live-room-ui.js?v=20261116-roomleave1&name=20261121-accountname1"));
  assert.ok(read('dist/account-name.js').includes('export function cachedDisplayName'));
});
