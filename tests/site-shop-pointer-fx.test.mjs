/* The Joy Coin shop must keep the same cursor halo flourish (site-pointer-fx.js)
   as every other shell page. It was the ONLY shell missing the script, so the
   glowing halo + idle "breathing" never appeared on the shop while it did on
   the portal homepage and every legal page.

   Regression guard for the "为什么商城鼠标光晕没有了？" request. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const shop = read('dist/shop.html');
const KEY = '20261110-glove2';

test('the shop shell loads the shared pointer flourish', () => {
  const tag = `<script defer src="/site-pointer-fx.js?v=${KEY}"></script>`;
  assert.ok(shop.includes(tag), 'shop.html mounts the cursor halo with the shared key');
});

test('every shell page that mounts the flourish uses one shared cache key', () => {
  const refs = ['dist/portal/index.html', 'dist/shop.html', 'dist/membership.html',
    'dist/terms.html', 'dist/privacy.html', 'dist/contact.html']
    .map(p => ({p, key: read(p).match(/site-pointer-fx\.js\?v=([^"']+)/)?.[1]}));
  assert.ok(refs.every(r => r.key === KEY), 'no page carries a stale or divergent key');
  assert.ok(refs.every(r => r.key), 'every shell mounts the flourish');
});
