import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const text = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const ORDER = ['pool', 'flight', 'four', 'gomoku', 'chess', 'xo', 'cards', 'snooker', 'bubbles', 'nineball'];
const SLUGS = ['pool', 'flight-party', 'connect-four', 'gomoku', 'chess', 'tic-tac-toe', 'cards', 'snooker', 'bubble-shooter', 'nineball'];

test('portal cards list nine-ball last', () => {
  const ids = [...text('dist/portal/index.html').matchAll(/href="\?game=([a-z]+)"/g)].map(m => m[1]);
  assert.deepEqual(ids, ORDER);
});

test('portal.js game catalogue lists nine-ball last', () => {
  const src = text('dist/portal/portal.js');
  const body = src.slice(src.indexOf('const games=['), src.indexOf('];', src.indexOf('const games=[')));
  const ids = [...body.matchAll(/\{id:'([a-z]+)'/g)].map(m => m[1]);
  assert.deepEqual(ids, ORDER);
});

test('native rail generator and generated page list nine-ball last', () => {
  const generator = text('scripts/build-native-games.mjs');
  const decl = generator.slice(generator.indexOf('const games=['), generator.indexOf('];', generator.indexOf('const games=[')));
  assert.deepEqual([...decl.matchAll(/\['([a-z]+)'/g)].map(m => m[1]), ORDER);
  for (const page of ['dist/portal/native-table.html', 'dist/portal/native-flight.html']) {
    const ids = [...text(page).matchAll(/data-native-link="([a-z]+)"/g)].map(m => m[1]);
    assert.deepEqual(ids, ORDER, page);
  }
});

test('SEO contract, directory pages and sitemap list nine-ball last', () => {
  const contract = text('dist/seo-games.js');
  const body = contract.slice(contract.indexOf('export const GAMES'), contract.indexOf('\n];', contract.indexOf('export const GAMES')));
  assert.deepEqual([...body.matchAll(/id: '([a-z]+)'/g)].map(m => m[1]), ORDER);
  for (const [page, prefix] of [['dist/games/index.html', '/games/'], ['dist/en/games/index.html', '/en/games/']]) {
    const links = [...text(page).matchAll(new RegExp('href="' + prefix + '([a-z-]+)/"', 'g'))].map(m => m[1]);
    assert.deepEqual(links, SLUGS, page);
  }
  const sitemap = text('dist/sitemap.xml');
  const zh = [...sitemap.matchAll(/<loc>https:\/\/flight\.joyflock\.com\/games\/([a-z-]+)\/<\/loc>/g)].map(m => m[1]);
  assert.deepEqual(zh, SLUGS);
});

test('changed runtime URLs carry a fresh order cache key', () => {
  const key = '&order=20261120-nineball-last1';
  for (const page of ['dist/portal/index.html', 'dist/table/index.html', 'dist/portal/native-table.html']) {
    assert.match(text(page), /game-seo-meta\.js\?[^"']*order=20261120-nineball-last1/, page);
  }
  assert.match(text('dist/portal/index.html'), /portal\/portal\.js\?[^"']*order=20261120-nineball-last1/);
  assert.ok(key);
});
