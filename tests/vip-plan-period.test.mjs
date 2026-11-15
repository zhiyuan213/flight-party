import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL(p,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const account=read('../dist/site-account.js');
const css=read('../dist/site-chrome.css');
const KEY='&p=20261116-nospace1';
const shellPages=['../dist/portal/index.html','../dist/membership.html','../dist/shop.html',
  '../dist/terms.html','../dist/privacy.html','../dist/contact.html'];
const nativePages=['../dist/portal/native-flight.html','../dist/portal/native-table.html'];

test('the billing period lives on the price line for both VIP plans',()=>{
  assert.match(account,
    /<small>USD<\/small><span class="vip-period">'\+\(plan==='MONTHLY'\?L\('\/month','\/月'\):L\('\/year','\/年'\)\)\+'<\/span><\/strong><em>/,
    'period span is inside <strong>, immediately before the CTA');
  assert.ok(!account.includes('<small>USD</small></strong><span>'),
    'the old standalone period row is gone');
  assert.ok(account.includes("data-vip-plan=\"'+plan+'\"") &&
    account.includes("['MONTHLY','ANNUAL']"),
    'both monthly and annual cards still share the same builder');
  assert.ok(account.includes("L('/month','/月')")&&account.includes("L('/year','/年')"),
    'compact bilingual period labels survive');
  assert.ok(!account.includes("L('/ month'")&&!account.includes("'/ 月'")&&
    !account.includes("L('/ year'")&&!account.includes("'/ 年'"),
    'no spaces remain around the slash');
});

test('the price line cannot wrap the period back onto its own row',()=>{
  assert.match(css,/\.chrome-vip-plans strong\{[^}]*white-space:nowrap\}/,
    'price line stays unwrapped');
  assert.match(css,/\.chrome-vip-plans \.vip-period\{vertical-align:baseline;white-space:nowrap\}/,
    'period is baseline-aligned, unwrapped and flush against USD');
  assert.ok(!/\.vip-period\{[^}]*margin/.test(css),
    'no CSS gap is inserted before the slash');
  assert.match(css,/\.chrome-vip-plans small,\.chrome-vip-plans span\{font-size:11px/,
    'period keeps the small muted type');
});

const CHAINS={
  'site-account.js':'v=20261112-gamelanes1',
  'site-chrome.css':'v=20261112-gamelanes1&d=20261115-topbar1&r=20261115-squareall1'
};
test('every host loads the bumped account script and chrome stylesheet',()=>{
  for(const p of shellPages){
    const html=read(p);
    for(const [asset,chain] of Object.entries(CHAINS))
      assert.ok(html.includes(asset+'?'+chain+KEY),
        `${p}: ${asset} keeps the shared v= chain and adds ${KEY}`);
  }
  for(const p of nativePages)
    assert.ok(read(p).includes('site-chrome.css?v=20261112-gamelanes1&d=20261115-topbar1&r=20261115-squareall1'+KEY),
      `${p}: generated chrome stylesheet is bumped`);
  assert.ok(read('../scripts/build-native-games.mjs').includes('site-chrome.css?v=20261112-gamelanes1&d=20261115-topbar1&r=20261115-squareall1'+KEY),
    'the native-page generator emits the same bumped URL');
});
