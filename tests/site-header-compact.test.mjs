import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const pages = [
  'dist/portal/index.html', 'dist/membership.html', 'dist/terms.html',
  'dist/privacy.html', 'dist/contact.html', 'dist/shop.html', 'dist/table/index.html'
];
const version = read('dist/site-points.js').match(/var VERSION='([^']+)'/)?.[1];

/* The signed-in header used to keep an invisible 88px "Sign up" slot, which
   read as a dark hole between the nickname and the points pill. These tests
   pin the compact geometry and the removal of every visible DEMO label. */

test('every shell loads one cache-busted chain for the compact header', () => {
  assert.ok(version, 'the wallet declares a cache key');
  for (const p of pages) {
    const text = read(p);
    const refs = [...text.matchAll(/(site-chrome\.css|site-account\.js|site-points\.css|site-points\.js)\?v=([^"'&]+)/g)];
    // /table/index.html has no shared account chrome, only the wallet pair.
    const expected = p === 'dist/table/index.html' ? 2 : 4;
    assert.equal(refs.length, expected, `${p} asset count`);
    for (const [, , v] of refs) assert.equal(v, version, `${p} uses the shipped version`);
    assert.ok(!/(?:site-chrome\.css|site-account\.js|site-points\.css|site-points\.js)\?v=(?:20261111-shop1|20261111-nodemo1|20261111-vipdirect1|20261111-aircraft1|20261111-defaultcursor1|20261111-cursorusable1|20261111-notrail1|20261110-footermembership1|20261111-accountstate1)/.test(text),
      `${p} has no stale cache key`);
  }
  assert.equal(read('dist/site-shop.js').match(/var VERSION='([^']+)'/)?.[1], version);
});

test('no DEMO label is rendered anywhere in the points or shop UI', () => {
  for (const p of [
    'dist/site-points.js', 'dist/site-points.css', 'dist/site-shop.js',
    'dist/site-shop.css', 'dist/shop.html'
  ]) {
    const text = read(p);
    assert.ok(!/DEMO|\(demo\)|（演示）|shop-wallet-demo|jp-flag/.test(text),
      `${p} still renders a demo badge`);
  }
});

test('the first frame marks a signed-in visitor and no duplicate sign-up entry', () => {
  for (const p of pages.filter(x => x !== 'dist/table/index.html')) {
    const text = read(p);
    assert.match(text, /classList\.add\("chrome-signed"\)/, `${p} sets the class synchronously`);
    assert.match(text, /id="chrome-account"/, `${p} keeps the single sign-in entry`);
    /* Sign up was a duplicate: registration already lives inside the dialog. */
    assert.doesNotMatch(text, /id="chrome-register"|chrome-account-gone/,
      `${p} has no separate Sign up button`);
  }
  assert.match(read('dist/site-account.js'), /data-auth-switch="register"/,
    'registration is still reachable from the sign-in dialog');
});
