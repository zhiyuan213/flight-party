import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync, statSync} from 'node:fs';
import vm from 'node:vm';
import {SITE, GAMES} from '../dist/seo-games.js';

const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const readBuf = p => readFileSync(new URL(p, import.meta.url));
const has = p => existsSync(new URL(p, import.meta.url));
const page = (g, lang) => read(`../dist/${lang === 'zh' ? 'games' : 'en/games'}/${g.slug}/index.html`);
const pagePath = (g, lang) => lang === 'zh' ? `/games/${g.slug}/` : `/en/games/${g.slug}/`;
const pageUrl = (g, lang) => SITE.origin + pagePath(g, lang);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const attr = (html, re) => (html.match(re) || [])[1] || '';
const tag = (html, name) => attr(html, new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
const ldBlocks = html => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(m => JSON.parse(m[1]));

test('the SEO contract is complete and matches the live game ids', () => {
  assert.equal(GAMES.length, 10, 'ten published games');
  assert.equal(new Set(GAMES.map(g => g.id)).size, GAMES.length);
  assert.equal(new Set(GAMES.map(g => g.slug)).size, GAMES.length);
  const portal = read('../dist/portal/portal.js');
  const liveIds = [...portal.matchAll(/\{id:'([a-z-]+)'/g)].map(m => m[1]);
  assert.deepEqual(liveIds.sort(), GAMES.map(g => g.id).sort(),
    'every ?game= value in the lobby maps to a landing page');
  for (const g of GAMES) {
    for (const key of ['name', 'title', 'description', 'keywords', 'lead', 'about', 'rules', 'features', 'players', 'modes', 'genre']) {
      assert.ok(g[key], `${g.id}: ${key} exists`);
    }
    for (const key of ['title', 'description', 'keywords', 'lead']) {
      assert.ok(g[key].zh?.trim() && g[key].en?.trim(), `${g.id}: ${key} has both locales`);
    }
    for (const key of ['about', 'rules', 'features']) {
      assert.ok(Array.isArray(g[key].zh) && g[key].zh.length && g[key].en.length,
        `${g.id}: ${key} has both locales`);
      assert.ok(g[key].zh.every(Boolean) && g[key].en.every(Boolean), `${g.id}: ${key} has no blank lines`);
    }
    assert.ok(g.description.zh.length >= 60 && g.description.en.length >= 90, `${g.id}: substantial description`);
    assert.ok(g.title.zh.length <= 60 && g.title.en.length <= 70, `${g.id}: title fits the SERP`);
    assert.ok(g.faq.length >= 3, `${g.id}: at least three FAQs`);
    assert.ok(g.rules.zh.length >= 3 && g.rules.en.length >= 3, `${g.id}: real rules in both locales`);
    assert.ok(g.features.zh.length === 3 && g.features.en.length === 3, `${g.id}: three feature chips`);
    assert.ok(g.players.min >= 2 && g.players.max >= g.players.min);
    assert.ok(g.cover.startsWith('/assets/'), `${g.id}: cover is an absolute site path`);
    assert.ok(has('../dist' + g.cover), `${g.id}: cover art actually exists`);
    for (const f of g.faq) assert.ok(f.q.zh && f.q.en && f.a.zh && f.a.en, `${g.id}: bilingual FAQ`);
  }
});

test('all landing and directory pages exist with the right html language', () => {
  assert.ok(has('../dist/games/index.html'));
  assert.ok(has('../dist/en/games/index.html'));
  for (const g of GAMES) for (const lang of ['zh', 'en']) {
    const html = page(g, lang);
    assert.ok(html.startsWith('<!doctype html>'), `${g.slug}/${lang}: doctype`);
    assert.match(html, new RegExp(`<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}"`));
    assert.match(html, new RegExp(`data-locale="${lang}"`));
  }
  assert.match(read('../dist/games/index.html'), /<html lang="zh-CN"/);
  assert.match(read('../dist/en/games/index.html'), /<html lang="en"/);
});

test('each landing page has complete, self-consistent search and share metadata', () => {
  for (const g of GAMES) for (const lang of ['zh', 'en']) {
    const html = page(g, lang);
    const where = `${g.slug}/${lang}`;
    assert.ok(tag(html, 'title').toLowerCase().includes(g.name[lang].toLowerCase()),
      `${where}: game name in title (allowing SERP-style capitalisation)`);
    assert.equal(tag(html, 'title'), esc(g.title[lang]), `${where}: exact title`);
    assert.equal(attr(html, /<meta name="description" content="([^"]*)"/), esc(g.description[lang]), `${where}: description`);
    assert.equal(attr(html, /<meta name="keywords" content="([^"]*)"/), esc(g.keywords[lang]), `${where}: keywords`);
    assert.match(html, /<meta name="robots" content="index,follow/);
    assert.equal(attr(html, /<link rel="canonical" href="([^"]*)"/), pageUrl(g, lang), `${where}: self canonical`);
    assert.equal(attr(html, /<link rel="alternate" hreflang="zh-CN" href="([^"]*)"/), pageUrl(g, 'zh'));
    assert.equal(attr(html, /<link rel="alternate" hreflang="en" href="([^"]*)"/), pageUrl(g, 'en'));
    assert.equal(attr(html, /<link rel="alternate" hreflang="x-default" href="([^"]*)"/), pageUrl(g, 'zh'));
    for (const prop of ['og:type', 'og:site_name', 'og:locale', 'og:title', 'og:description', 'og:url', 'og:image', 'og:image:width', 'og:image:height', 'og:image:alt']) {
      assert.ok(html.includes(`property="${prop}"`), `${where}: ${prop}`);
    }
    for (const name of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
      assert.ok(html.includes(`name="${name}"`), `${where}: ${name}`);
    }
    assert.equal(attr(html, /<meta property="og:image" content="([^"]*)"/), `${SITE.origin}/assets/og/${g.slug}.png`);
    assert.equal(attr(html, /<meta property="og:title" content="([^"]*)"/), esc(g.title[lang]));
    assert.match(html, new RegExp(`<link rel="stylesheet" href="/games/games\\.css\\?v=${SITE.cacheKey}"`));
  }
});

test('each landing page publishes valid VideoGame and BreadcrumbList structured data', () => {
  for (const g of GAMES) for (const lang of ['zh', 'en']) {
    const nodes = ldBlocks(page(g, lang));
    assert.equal(nodes.length, 2, `${g.slug}/${lang}: two JSON-LD blocks`);
    const game = nodes.find(n => n['@type'] === 'VideoGame');
    const crumbs = nodes.find(n => n['@type'] === 'BreadcrumbList');
    assert.ok(game && crumbs);
    assert.equal(game.name, g.name[lang]);
    assert.equal(game.description, g.description[lang]);
    assert.equal(game.url, pageUrl(g, lang));
    assert.equal(game.inLanguage, lang === 'zh' ? 'zh-CN' : 'en');
    assert.equal(game.offers.price, '0');
    assert.equal(game.isAccessibleForFree, true);
    assert.equal(game.numberOfPlayers.minValue, g.players.min);
    assert.equal(game.numberOfPlayers.maxValue, g.players.max);
    assert.ok(game.potentialAction.target.includes(`?game=${g.id}`));
    assert.equal(crumbs.itemListElement.length, 3);
    assert.equal(crumbs.itemListElement.at(-1).item, pageUrl(g, lang));
  }
});

test('landing pages have crawlable static content, one h1 and working in-site links', () => {
  for (const g of GAMES) for (const lang of ['zh', 'en']) {
    const html = page(g, lang);
    const where = `${g.slug}/${lang}`;
    assert.equal((html.match(/<h1/g) || []).length, 1, `${where}: exactly one h1`);
    assert.equal(tag(html, 'h1'), g.name[lang], `${where}: h1 is the game name`);
    assert.ok(html.includes(`href="/portal/index.html?game=${g.id}"`), `${where}: play CTA`);
    for (const line of g.about[lang]) assert.ok(html.includes(esc(line)), `${where}: about copy`);
    for (const line of g.rules[lang]) assert.ok(html.includes(esc(line)), `${where}: rules`);
    for (const f of g.faq) {
      assert.ok(html.includes(esc(f.q[lang])), `${where}: FAQ question`);
      assert.ok(html.includes(esc(f.a[lang])), `${where}: FAQ answer`);
    }
    assert.match(html, /<img class="hero-art"[^>]*alt="[^"]+"/, `${where}: descriptive cover alt`);
    assert.equal((html.match(/class="related"[\s\S]*?<\/section>/) || [''])[0].match(/<a href="\/games\/|<a href="\/en\/games\//g)?.length, GAMES.length - 1,
      `${where}: sibling game links`);
    assert.ok(html.includes(`href="${lang === 'zh' ? SITE.enPath + g.slug + '/' : '/games/' + g.slug + '/'}"`),
      `${where}: language switch to the paired page`);
    assert.ok(html.includes('<nav class="crumbs"'), `${where}: breadcrumb nav`);
  }
});

test('directory pages list all published games in both languages', () => {
  for (const lang of ['zh', 'en']) {
    const html = read(`../dist/${lang === 'zh' ? 'games' : 'en/games'}/index.html`);
    const nodes = ldBlocks(html);
    const collection = nodes.find(n => n['@type'] === 'CollectionPage');
    assert.equal(collection.mainEntity.itemListElement.length, GAMES.length);
    for (const g of GAMES) assert.ok(html.includes(`href="${pagePath(g, lang)}"`), `${lang}: ${g.slug} linked`);
    assert.equal(attr(html, /<link rel="canonical" href="([^"]*)"/), SITE.origin + (lang === 'zh' ? SITE.zhPath : SITE.enPath));
  }
});

test('sitemap covers every landing page with hreflang pairs and no junk URLs', () => {
  const xml = read('../dist/sitemap.xml');
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.equal(new Set(locs).size, locs.length, 'no duplicate URLs');
  for (const g of GAMES) for (const lang of ['zh', 'en'])
    assert.ok(locs.includes(pageUrl(g, lang)), `${g.slug}/${lang} in sitemap`);
  for (const u of [SITE.origin + '/', SITE.origin + '/portal/index.html', SITE.origin + SITE.zhPath, SITE.origin + SITE.enPath,
    SITE.origin + '/shop.html', SITE.origin + '/membership.html', SITE.origin + '/terms.html',
    SITE.origin + '/privacy.html', SITE.origin + '/contact.html'])
    assert.ok(locs.includes(u), `${u} in sitemap`);
  assert.ok(locs.every(u => !u.includes('?game=') && !u.includes('preview') && !u.includes('/api/')),
    'query / preview / API routes are never submitted');
  assert.equal((xml.match(/hreflang="zh-CN"/g) || []).length, 22);
  assert.equal((xml.match(/hreflang="en"/g) || []).length, 22);
  assert.equal((xml.match(/hreflang="x-default"/g) || []).length, 22);
  assert.equal((xml.match(new RegExp(`<lastmod>${SITE.lastmod}</lastmod>`, 'g')) || []).length, locs.length);
});

test('robots.txt admits the landing pages and points at the sitemap', () => {
  const robots = read('../dist/robots.txt');
  assert.match(robots, new RegExp(`Sitemap: ${SITE.origin}/sitemap\\.xml`));
  for (const rule of ['Allow: /', 'Allow: /games/', 'Allow: /en/games/', 'Disallow: /api/', 'Disallow: /ws',
    'Disallow: /*?*room=', 'Disallow: /*-preview.html']) assert.ok(robots.includes(rule), rule);
});

test('every OG image exists and is a real 1200x630 PNG', () => {
  for (const g of GAMES) {
    const p = `../dist/assets/og/${g.slug}.png`;
    assert.ok(has(p), `${g.slug}: og image`);
    const b = readBuf(p);
    assert.equal(b.subarray(1, 4).toString(), 'PNG');
    assert.equal(b.readUInt32BE(16), SITE.ogWidth);
    assert.equal(b.readUInt32BE(20), SITE.ogHeight);
    assert.ok(statSync(new URL(p, import.meta.url)).size > 10_000);
  }
  const site = readBuf('../dist/assets/og/joyflock.png');
  assert.equal(site.readUInt32BE(16), SITE.ogWidth);
});

/* A tiny CSS-selector aware DOM so the *generated* head updater can be run for
   real instead of being checked with string matching only. */
function metaHarness(search, locale) {
  const elements = [];
  class El {
    constructor(tag) {this.tagName = tag.toUpperCase(); this.attrs = {}; this.textContent = '';}
    setAttribute(k, v) {this.attrs[k] = String(v);}
    getAttribute(k) {return Object.hasOwn(this.attrs, k) ? this.attrs[k] : null;}
  }
  const parse = sel => {
    const m = /^([a-z]+)((?:\[[\w:-]+="[^"]*"\])+)$/.exec(sel);
    if (!m) return null;
    return {tag: m[1].toUpperCase(), pairs: [...m[2].matchAll(/\[([\w:-]+)="([^"]*)"\]/g)].map(x => [x[1], x[2]])};
  };
  const head = {
    querySelector(sel) {
      const q = parse(sel);
      if (!q) return null;
      return elements.find(e => e.tagName === q.tag && q.pairs.every(([k, v]) => e.getAttribute(k) === v)) || null;
    },
    appendChild(el) {elements.push(el); return el;}
  };
  const listeners = {};
  const doc = {
    head, readyState: 'loading', title: ' untouched ',
    documentElement: {getAttribute: k => k === 'data-locale' ? locale : null},
    createElement: tag => new El(tag),
    addEventListener: (type, fn) => {(listeners[type] ??= []).push(fn);}
  };
  const sandbox = {document: doc, location: {search}, URLSearchParams, JSON,
    window: {addEventListener() {}}};
  vm.runInNewContext(read('../dist/game-seo-meta.js'), sandbox);
  const find = (tag, pairs) => elements.find(e => e.tagName === tag && pairs.every(([k, v]) => e.getAttribute(k) === v));
  return {doc, listeners, elements, find};
}

test('the generated head updater rewrites ?game= pages onto their canonical landing page', () => {
  for (const g of GAMES) for (const locale of ['zh', 'en']) {
    const h = metaHarness(`?game=${g.id}`, locale);
    assert.equal(h.doc.title, g.title[locale], `${g.id}/${locale}: title`);
    assert.equal(h.find('META', [['name', 'description']])?.getAttribute('content'), g.description[locale]);
    assert.equal(h.find('LINK', [['rel', 'canonical']])?.getAttribute('href'), pageUrl(g, locale));
    assert.equal(h.find('LINK', [['rel', 'alternate'], ['hreflang', 'zh-CN']])?.getAttribute('href'), pageUrl(g, 'zh'));
    assert.equal(h.find('LINK', [['rel', 'alternate'], ['hreflang', 'en']])?.getAttribute('href'), pageUrl(g, 'en'));
    assert.equal(h.find('LINK', [['rel', 'alternate'], ['hreflang', 'x-default']])?.getAttribute('href'), pageUrl(g, 'zh'));
    assert.equal(h.find('META', [['property', 'og:image']])?.getAttribute('content'), `${SITE.origin}/assets/og/${g.slug}.png`);
    const ld = h.find('SCRIPT', [['data-seo', 'game']]);
    assert.equal(JSON.parse(ld.textContent)['@type'], 'VideoGame');
    assert.equal(JSON.parse(ld.textContent).name, g.name[locale]);
    assert.equal((h.elements.filter(e => e.tagName === 'LINK' && e.getAttribute('rel') === 'canonical')).length, 1,
      'never more than one canonical');
    /* Deferred module scripts rewrite the title while booting; the DOM ready
       pass must restore the SEO title exactly once. */
    assert.equal(h.listeners.DOMContentLoaded?.length, 1);
    h.doc.title = 'overwritten by portal.js';
    h.listeners.DOMContentLoaded[0]();
    assert.equal(h.doc.title, g.title[locale]);
  }
});

test('pages without a ?game= parameter keep their own static head', () => {
  const h = metaHarness('', 'zh');
  assert.equal(h.doc.title, ' untouched ');
  assert.equal(h.elements.length, 0);
  assert.equal(h.listeners.DOMContentLoaded?.length, 1);
});

test('the three existing shells carry SEO tags and load the head updater', () => {
  const shells = ['../dist/portal/index.html', '../dist/index.html', '../dist/table/index.html'];
  for (const p of shells) {
    const html = read(p);
    assert.match(html, /<meta name="description" content="[^"]{40,}"/, `${p}: description`);
    assert.match(html, /<meta name="keywords" content="/, `${p}: keywords`);
    assert.equal((html.match(/rel="canonical"/g) || []).length, 1, `${p}: one canonical`);
    assert.match(html, /property="og:image" content="https:\/\/flight\.joyflock\.com\/assets\/og\//, `${p}: absolute OG image`);
    assert.match(html, /name="twitter:card" content="summary_large_image"/, `${p}: twitter card`);
    for (const block of ldBlocks(html)) assert.equal(block['@context'], 'https://schema.org');
  }
  for (const p of ['../dist/portal/index.html', '../dist/table/index.html'])
    assert.match(read(p), new RegExp(`<script src="/game-seo-meta\\.js\\?v=${SITE.cacheKey}[^"]*"></script>`), `${p}: loads updater`);
  assert.equal(attr(read('../dist/portal/index.html'), /<link rel="canonical" href="([^"]*)"/), SITE.origin + '/portal/index.html');
  assert.equal(attr(read('../dist/table/index.html'), /<link rel="canonical" href="([^"]*)"/), SITE.origin + SITE.zhPath);
  assert.equal(attr(read('../dist/index.html'), /<link rel="canonical" href="([^"]*)"/), SITE.origin + '/');
});

test('no site shell has the removed footer game-guides link; the directory stays crawlable', () => {
  for (const p of ['../dist/portal/index.html', '../dist/membership.html', '../dist/terms.html',
    '../dist/privacy.html', '../dist/contact.html', '../dist/shop.html']) {
    const footer = tag(read(p), 'footer');
    assert.ok(!footer.includes('href="/games/"'), `${p}: footer game-guides link removed`);
    assert.ok(!/All game guides|全部游戏介绍/.test(footer), `${p}: no leftover label`);
  }
  // Removing a footer link must not remove the directory from the crawl path.
  assert.ok(has('../dist/games/index.html') && has('../dist/en/games/index.html'));
  const xml = read('../dist/sitemap.xml');
  assert.ok(xml.includes(SITE.origin + SITE.zhPath), 'zh directory still in sitemap');
  assert.ok(xml.includes(SITE.origin + SITE.enPath), 'en directory still in sitemap');
});
