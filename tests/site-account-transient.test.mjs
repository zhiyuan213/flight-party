import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const account = read('dist/site-account.js');
const portal = read('dist/portal/portal.js');
/* The header cluster is cache-busted as one unit: the shared wallet script
   declares the key that site-chrome.css, site-account.js and the shell pages
   all reference. Deriving it avoids a stale hard-coded string on every bump. */
const VERSION = read('dist/site-points.js').match(/var VERSION='([^']+)'/)[1];
const hosts = [
  'dist/portal/index.html', 'dist/membership.html', 'dist/terms.html',
  'dist/privacy.html', 'dist/contact.html'
].map(p => ({p, text: read(p)}));

// Pull the literal regex out of the shipped source and exercise it, so the
// guard is tested as behaviour rather than as a comment.
const extract = (source, name) => {
  const m = source.match(new RegExp(name + '\\s*=\\s*(\\/[^\\n]+\\/[a-z]*);'));
  assert.ok(m, `${name} must be a regex literal`);
  return new Function('return ' + m[1])();
};

test('connection states are recognised in both the shell and the portal', () => {
  const a = extract(account, 'var TRANSIENT');
  const p = extract(portal, 'const TRANSIENT_ACCOUNT');
  for (const label of ['Restoring…', 'Restoring...', '恢复登录中…', 'Reconnect', '重新连接', 'Connecting…', '连接中…']) {
    assert.ok(a.test(label), `shell must reject ${label}`);
    assert.ok(p.test(label), `portal must reject ${label}`);
  }
  for (const name of ['zhiyuanC', 'Ava Mitchell', '小明', 'Cloud Captain']) {
    assert.ok(!a.test(name), `shell must keep real nickname ${name}`);
    assert.ok(!p.test(name), `portal must keep real nickname ${name}`);
  }
});

test('the shell ignores transient labels instead of faking a signed-in identity', () => {
  assert.match(account, /if\(TRANSIENT\.test\(name\)\)return;/);
  // The guard sits inside the controls bridge, before renderSigned.
  const bridge = account.slice(account.indexOf("type!=='joyflock:controls'"), account.indexOf('// Another tab signing in'));
  assert.ok(bridge.indexOf('TRANSIENT.test(name)') < bridge.indexOf('renderSigned(name)'));
  // A real nickname is still a display hint only: it never writes the cache.
  assert.ok(!/setLabel\(name\)/.test(bridge), 'iframe text must not become server-confirmed state');
  assert.match(account, /var meLookup=window\.__joyflockMe\|\|fetch\('\/api\/me'/, '/api/me remains authoritative');
});

test('the portal floating control falls back to the cached nickname', () => {
  assert.match(portal, /TRANSIENT_ACCOUNT\.test\(raw\)\?\(cachedAccount\(\)\|\|'登录'\):raw/);
  const bridge = portal.slice(portal.indexOf("event.data?.type!=='joyflock:controls'"));
  assert.ok(bridge.indexOf('TRANSIENT_ACCOUNT') >= 0);
});

test('every shell page loads the guarded account script with one cache key', () => {
  for (const {p, text} of hosts) {
    assert.match(text, new RegExp('site-account\\.js\\?v=' + VERSION), `${p} needs the new account script`);
    assert.ok(!/site-account\.js\?v=20261110-glove2/.test(text), `${p} must not keep the unguarded script`);
  }
  assert.match(hosts[0].text, new RegExp('portal/portal\\.js\\?v=' + VERSION));
  assert.ok(!/portal\/portal\.js\?v=20261110-fullzoom1/.test(hosts[0].text));
  // The unchanged fullscreen bridge keeps its own cache key.
  assert.match(portal, /pool-fullscreen\.js\?v=20261110-fullzoom1/);
});

test('the fix is display-only: no new endpoints, no gameplay rules', () => {
  assert.ok(!/fetch\('\/api\/(?!me\b)/.test(account.slice(account.indexOf('var TRANSIENT'))));
  assert.ok(!/renderGuest\(\)|setLabel\(/.test(
    account.slice(account.indexOf('if(TRANSIENT.test(name))return;'), account.indexOf('if(name&&!'))
  ), 'ignoring a status label must not change the current label');
});
