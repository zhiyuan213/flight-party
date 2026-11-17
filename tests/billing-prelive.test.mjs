/* Guards for the prerequisites that must exist BEFORE live Creem billing is
   enabled: a working cancellation control in the shared account dialog,
   non-misleading sandbox copy, and a switch script that refuses to combine a
   live flag with sandbox credentials. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';

const read = p => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const account = read('dist/site-account.js');
const chrome = read('dist/site-chrome.css');
const switcher = read('deploy/switch-to-live.sh');
const generator = read('scripts/build-native-games.mjs');
const KEY = '&pre=20261117-prelive1';

function htmlFiles(dir = 'dist') {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...htmlFiles(p));
    else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

test('the shared account dialog exposes a real cancel-auto-renewal control', () => {
  assert.match(account, /cancel\.className='chrome-vip-cancel'/);
  assert.match(account, /cancel\.dataset\.cancelSubscription=active\.id/);
  assert.match(account, /cancel\.disabled=billingBusy\|\|!!active\.cancelScheduled/);
  assert.match(account, /closest\('\[data-cancel-subscription\]'\)/);
  assert.match(account, /\/api\/billing\/subscriptions\/'\+encodeURIComponent\(cancel\.dataset\.cancelSubscription\)\+'\/cancel/);
  assert.match(account, /billingState=me\.recording;billingBusy=false;renderBilling\(d\)/,
    'the panel re-renders from a fresh /api/me after cancellation');
});

test('a sandbox entitlement never claims real automatic renewal', () => {
  assert.match(account, /r\.testMode\?t\('Sandbox test subscription\. No real charge or automatic renewal\.'/);
  assert.match(account, /沙盒测试订阅，不产生真实扣费，也不会自动续费。/);
  assert.match(account, /t\('Auto-renewal is on\. Do not purchase another subscription\.'/,
    'live mode still states the recurring rule');
  assert.match(account, /active\.cancelScheduled\?t\('Auto-renewal canceled/,
    'a scheduled cancellation keeps its own copy');
  assert.match(account, /cancel any time in Account/);
  assert.match(account, /可随时在账号中取消/);
});

test('the cancel control is styled, and every edited asset has a fresh cache key', () => {
  assert.match(chrome, /\.chrome-vip-cancel\{align-self:flex-start/);
  assert.match(chrome, /\.chrome-vip-cancel:disabled\{opacity:\.55/);
  for (const p of [...htmlFiles(), 'scripts/build-native-games.mjs']) {
    const s = p.endsWith('.mjs') ? generator : read(p);
    for (const m of s.matchAll(/(?:src|href)="[^"]*(site-account\.js|site-chrome\.css)\?[^"]*"/g)) {
      assert.ok(m[0].includes(KEY), `${p}: ${m[0]} must carry the new cache key`);
    }
  }
  assert.ok(generator.includes('site-account.js?v='), 'the generator still emits the account script');
});

test('the live switch refuses sandbox credentials and verifies live products', () => {
  assert.match(switcher, /--confirm-merchant-approved/, 'human merchant approval is required');
  assert.match(switcher, /--dry-run/, 'a no-op verification pass is available');
  assert.match(switcher, /the supplied API key is a sandbox key/);
  assert.match(switcher, /monthly product ID is still the sandbox product/);
  assert.match(switcher, /annual product ID is still the sandbox product/);
  assert.match(switcher, /live webhook secret equals the sandbox secret/);
  assert.match(switcher, /unexpected key in \.env\.live/, 'only the four billing keys may be merged');
  assert.match(switcher, /str\(mode\)\.lower\(\) != 'live'/, 'provider-side live mode is proved');
  assert.match(switcher, /currency != 'USD'/);
  assert.match(switcher, /int\(actual_price\) != price/);
  assert.match(switcher, /every-month/);
  assert.match(switcher, /every-year/);
  assert.match(switcher, /repl\['CREEM_LIVE'\] = 'true'/);
  assert.match(switcher, /env\.before/, 'the previous env is backed up');
  assert.match(switcher, /joyflock-backend:before-live-/, 'a rollback image tag is kept');
  assert.match(switcher, /up -d --no-deps --force-recreate backend/,
    'only the backend container is recreated');
  assert.match(switcher, /com\.docker\.compose\.project\.config_files/,
    'the running compose file set is reused');
  assert.match(switcher, /ROLLBACK:/);
});
