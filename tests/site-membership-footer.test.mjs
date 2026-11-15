import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
/* The five pages that share site-chrome.css: the portal home and the four
   info pages. Membership & support used to sit in their top nav. */
const shellPages=['../dist/portal/index.html','../dist/membership.html',
  '../dist/terms.html','../dist/privacy.html','../dist/contact.html'];
/* Shared header assets are cache-busted with one key declared by the wallet. */
const VERSION=read('../dist/site-points.js').match(/var VERSION='([^']+)'/)[1];
const footerLink=/<a href="\/membership\.html"[^>]*>\s*<span class="lang-en">Membership &amp; support<\/span>\s*<span class="lang-cn">会员与支持<\/span>\s*<\/a>/;
const part=(html,tag)=>{
  const m=new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`).exec(html);
  assert.ok(m,`missing <${tag}> element`);
  return m[1];
};

test('the Membership link is in the footer and gone from the nav; the nav holds Games + Shop',()=>{
  for(const file of shellPages){
    const html=read(file);
    const nav=part(html,'nav'),footer=part(html,'footer');
    assert.ok(!nav.includes('/membership.html'),`${file}: nav still links to membership`);
    assert.ok(nav.includes('/portal/index.html'),`${file}: the Games link survives`);
    assert.ok(nav.includes('/shop.html'),`${file}: the Shop link sits beside Games`);
    assert.equal((nav.match(/<a /g)||[]).length,2,`${file}: nav holds exactly two links`);
    assert.ok(footerLink.test(footer),`${file}: footer has the bilingual Membership & support link`);
    assert.ok(!footer.includes('href="/shop.html"'),`${file}: the footer shop link is removed`);
    assert.ok(footer.indexOf('href="/membership.html"')<footer.indexOf('href="/terms.html"'),
      `${file}: membership comes before the legal links`);
    for(const path of ['/terms.html','/privacy.html','/contact.html'])
      assert.ok(footer.includes(`href="${path}"`),`${file}: existing ${path} link survives`);
    assert.ok(!footer.includes('href="/games/"'),`${file}: the footer game-guides link is removed`);
    assert.ok(!footer.includes('All game guides')&&!footer.includes('全部游戏介绍'),
      `${file}: no leftover game-guides label`);
    assert.equal((footer.match(/<a /g)||[]).length,5,`${file}: footer has brand + 4 links`);
  }
});

test('the link still points at the same page and keeps the locale span pattern',()=>{
  for(const file of shellPages){
    const footer=part(read(file),'footer');
    const link=footerLink.exec(footer)[0];
    assert.ok(link.startsWith('<a href="/membership.html">'),`${file}: plain same-origin link`);
    assert.ok(link.includes('lang-en')&&link.includes('lang-cn'),`${file}: both locales present`);
  }
});

test('both nav links share equal widths and the oversized Membership slot is gone',()=>{
  const css=read('../dist/site-chrome.css');
  assert.ok(/body>\.topbar nav a\{width:96px\}/.test(css),'base Games width');
  assert.ok(/body>\.topbar nav a:nth-child\(2\)\{width:96px\}/.test(css),'Shop is equally wide');
  assert.ok(!/nav a:last-child\{width:/.test(css),'no bare last-child width remains');
  assert.ok(!/nth-child\(2\)\{width:(?:136|126|104)px\}/.test(css),'no legacy Membership slot');
  for(const size of ['88px','72px','60px'])
    assert.ok(css.includes(size),`responsive slot ${size} preserved`);
  assert.ok(css.includes('flex-wrap:wrap;justify-content:flex-end'),'footer link group can wrap');
});

test('all five shell pages load the same bumped chrome stylesheet',()=>{
  for(const file of shellPages)
    assert.ok(read(file).includes('site-chrome.css?v='+VERSION),
      `${file}: css version bumped`);
  const css=read('../dist/site-chrome.css');
  assert.ok(css.includes('Membership & support joins Terms / Privacy / Contact'),
    'stylesheet documents the new footer link');
});

test('out-of-scope membership links are untouched: flight home legal-links and the in-game header',()=>{
  const home=read('../dist/index.html');
  assert.ok(home.includes('<p class="local-note legal-links"><a href="/membership.html">Membership &amp; support</a>'),
    'flight home keeps its own legal-links membership entry');
  const table=read('../dist/table/index.html');
  assert.ok(table.includes('<a href="/membership.html" target="_blank" rel="noopener">会员</a>'),
    'the in-game toolbar keeps its membership shortcut (game pages hide the footer)');
  const i18n=read('../dist/static-i18n.js');
  assert.ok(i18n.includes("['.legal-links a[href=\"/membership.html\"]','Membership & support','会员与帮助']"),
    'static translation copy is unchanged');
});
