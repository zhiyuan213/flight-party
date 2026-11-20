import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const html = read('dist/table/index.html');
const memberNote = html.match(/<section class="member-note">[\s\S]*?<\/section>/)?.[0] || '';

/* 2026-11-15 · The "会员说明 ↗" outbound link under the Membership & support
   card on the shared table home is gone. Only that one link was removed: the
   card, its four live facts and every other route to /membership.html stay.
   These guards also sweep the dead CSS rules and the unused locale entry so
   the deletion cannot silently regress on a later rebuild. */

test('the membership card has no outbound link and keeps all five facts', () => {
  assert.ok(memberNote, 'the Membership & support section still exists');
  assert.ok(!/<a\b/i.test(memberNote), 'no anchor inside the card');
  assert.ok(!/会员说明|Membership details|↗/.test(memberNote), 'no link label or arrow glyph');
  assert.ok(!/href="\/membership\.html"/.test(memberNote), 'no membership.html target');
  for (const fact of ['tier', 'points', 'score', 'games', 'winrate']) {
    assert.ok(memberNote.includes(`data-member-fact="${fact}"`), `${fact} fact survives`);
  }
  assert.ok((memberNote.match(/data-member-fact=/g) || []).length === 5, 'exactly five facts');
  assert.match(memberNote, /<h2>会员与支持<\/h2>/, 'heading unchanged');
  assert.match(memberNote, /会员装饰可改变头像/, 'explanatory paragraph unchanged');
  /* Only the card link was removed — the header 会员 entry is a different
     navigation item and must stay reachable. */
  assert.match(html, /<header[\s\S]*?<a href="\/membership\.html"[^>]*>会员<\/a>/,
    'header membership entry survives');
  assert.equal((html.match(/href="\/membership\.html"/g) || []).length, 1,
    'exactly one membership.html link remains on the home page');
});

test('the removed wording is gone from the whole shipped site, not just one page', () => {
  const files = [];
  const walk = dir => {
    for (const entry of readdirSync(dir, {withFileTypes: true})) {
      const p = resolve(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(html|js|css)$/.test(entry.name)) files.push(p);
    }
  };
  walk(resolve(root, 'dist'));
  for (const p of files) {
    const text = readFileSync(p, 'utf8');
    assert.ok(!text.includes('会员说明') && !text.includes('Membership details'),
      `${p}: no leftover link wording`);
  }
  assert.ok(files.length > 20, 'the sweep really covered the site');
});

test('no runtime script re-inserts the link', () => {
  for (const p of ['dist/table/table.js', 'dist/table/intro-boot.js',
    'dist/table/pool-shell.js', 'dist/portal/portal.js']) {
    const js = read(p);
    assert.ok(!js.includes('/membership.html') && !js.includes('会员说明'),
      `${p}: no dynamic membership link`);
  }
});

test('the link-specific CSS rules and locale entry were cleaned up', () => {
  const cssFiles = readdirSync(resolve(root, 'dist/table'))
    .filter(n => n.endsWith('.css'));
  for (const name of cssFiles) {
    const css = read(`dist/table/${name}`);
    assert.ok(!/\.member-note\s+a\s*\{/.test(css), `${name}: no dead link selector`);
  }
  assert.match(read('dist/table/table-home-clean.css'), /\.member-note>\.member-label/,
    'unrelated member-label rule is preserved');
  assert.ok(!read('dist/table/table-locale.js').includes('会员说明 ↗'),
    'the unused translation entry is gone');
});

test('membership.html is still reachable from every shared footer', () => {
  for (const p of ['dist/portal/index.html', 'dist/membership.html', 'dist/terms.html',
    'dist/privacy.html', 'dist/contact.html', 'dist/shop.html']) {
    const footer = read(p).match(/<footer>[\s\S]*?<\/footer>/)?.[0] || '';
    assert.match(footer, /href="\/membership\.html"/, `${p}: footer entry survives`);
  }
});
