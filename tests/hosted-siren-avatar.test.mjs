/* 2026-11-14 · Hosted-seat siren + one avatar across the outer page / iframe.

   Two separate concerns share this file because both live in the shared
   rendering layer used by every game shell:
   1. a hosted seat gets a small rotating red beacon centred on its avatar;
   2. the same signed-in player must show the SAME portrait in the outer table
      header and inside the embedded game frame (both realms share localStorage,
      but only the outer one reliably has __joyflockShop at first paint). */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import {CUSTODY_UI_VERSION} from '../dist/online-custody-ui.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const ui = read('dist/online-custody-ui.js');
const avatarDisplay = read('dist/avatar-display.js');
const table = read('dist/table/table.js');
const html = read('dist/table/index.html');

/* ------------------------------------------------------------ siren styles */
test('the hosted avatar carries a standing domed warning beacon', () => {
  assert.match(ui, /\.seat\[data-custody="hosted"\] \.avatar-shell::after/);
  assert.match(ui, /\.player-row\[data-custody="hosted"\] \.player-avatar::after/);
  assert.match(ui, /left:50%;top:56%;transform:translate\(-50%,-50%\)/,
    'the beacon is centred on the avatar');
  assert.match(ui, /width:32%;height:44%;border-radius:46% 46% 22% 22%/,
    'a taller-than-wide domed lamp, drawn from the side');
  assert.match(ui, /radial-gradient\(ellipse 86% 58% at 50% 8%,\s*#ff6a3a/, 'a red dome');
  assert.match(ui, /linear-gradient\(#2c3346,\s*#101420\)/, 'a dark base under the dome');
  assert.match(ui, /animation:joyflock-custody-beacon 1\.6s ease-in-out infinite/,
    'a breathing glow, not a top-down spin');
  assert.doesNotMatch(ui, /conic-gradient/, 'no flat rotating lens');
  assert.match(ui, /@media \(prefers-reduced-motion:reduce\)\{[\s\S]*?\.player-avatar::after\{animation:none\}/);
  /* Grace is only a reconnect countdown, and native bots are never "hosted". */
  assert.doesNotMatch(ui, /\[data-custody="grace"\] \.avatar-shell::after/);
  assert.equal(CUSTODY_UI_VERSION, '20261115-joincoin1');
});

/* ------------------------------------------------------- avatar resolver */
function avatarSandbox({shop, stored} = {}) {
  const context = {};
  if (shop) context.__joyflockShop = {getState: () => ({equipped: {avatar: shop}})};
  if (stored !== undefined) {
    context.localStorage = {getItem: key => key === 'joyflock.shop.v1' ? stored : null};
  }
  runInNewContext(avatarDisplay, context);
  return context.__joyflockAvatarDisplay;
}

const STORED = JSON.stringify({v: 1, owned: [], equipped: {avatar: 'avatar-beret'}});

test('the iframe picks the equipped portrait from shared localStorage', () => {
  const api = avatarSandbox({stored: STORED});
  assert.match(api.resolve({isSelf: true, signedIn: true}), /avatar-beret\.svg/,
    'no __joyflockShop in that realm — localStorage is the shared source');
  assert.match(api.resolve({isSelf: true}), /avatar-beret\.svg/,
    'signedIn is still UNKNOWN during the synchronous first paint');
  assert.match(api.resolve({signedIn: true}), /avatar-starling\.svg/,
    'an opponent must never borrow local equipment');
  assert.match(api.resolve({isSelf: true, signedIn: false}), /avatar-starling\.svg/,
    'an explicit sign-out still wins');
});

test('the wallet API keeps priority, uploads stay authoritative, bad data is ignored', () => {
  const api = avatarSandbox({shop: 'avatar-crown', stored: STORED});
  assert.match(api.resolve({isSelf: true}), /avatar-crown\.svg/,
    'when the wallet IS published it remains the live source of truth');
  const uploaded = '/api/avatars/12345678-1234-1234-1234-123456789abc';
  assert.equal(api.resolve({isSelf: true, avatarUrl: uploaded}), uploaded);
  assert.match(api.resolve({avatarId: 'avatar-fox'}), /avatar-fox\.svg/);
  const broken = avatarSandbox({stored: '{not json'});
  assert.match(broken.resolve({isSelf: true}), /avatar-starling\.svg/);
  const none = avatarSandbox();
  assert.match(none.resolve({isSelf: true}), /avatar-starling\.svg/);
});

test('the table shell no longer mistakes "not loaded yet" for a sign-out', () => {
  assert.match(table, /signedIn:self\?\(\(me\?\.account\|\|window\.__joyflockMe\?\.account\)\?true:undefined\):undefined/);
  assert.doesNotMatch(table, /signedIn:self\?!!\(me\?\.account/);
  /* The resolver itself is loaded before the synchronous first paint. */
  assert.ok(html.indexOf('/avatar-display.js?') < html.indexOf('./intro-boot.js?'));
  assert.match(html, /avatar-display\.js\?v=20261114-avatar5/);
  assert.match(read('dist/avatar.js'), /avatar-display\.js\?v=20261114-avatar5/);
  assert.match(read('dist/site-points.js'), /var AVATAR_VERSION='20261114-avatar5'/);
});
