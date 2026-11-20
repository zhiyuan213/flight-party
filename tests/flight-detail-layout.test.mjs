import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const index = read('dist/index.html');
const native = read('dist/portal/native-flight.html');
const table = read('dist/portal/native-table.html');
const css = read('dist/flight-detail-layout.css');
const social = read('dist/social-ui.js');
const i18n = read('dist/static-i18n.js');
const app = read('dist/app.js');
const java = read('backend/src/main/java/com/flightparty/table/TableService.java');
const KEY = 'flight-detail-layout.css?v=20261116-poolshell1';

test('the flight welcome page uses the pool composition, not the old hero', () => {
  for (const p of ['dist/index.html', 'dist/portal/native-flight.html']) {
    const html = read(p);
    assert.match(html, /<section class="game-hero hero-copy">/, p + ': pool game-hero');
    assert.match(html, /<div class="intro-grid">/, p + ': intro-grid / display:contents');
    assert.match(html, /<section id="leaderboard-shell" class="leaderboard-shell home-ranking"/,
      p + ': flat standings panel');
    assert.match(html, /<div class="intro-bottom">/, p + ': bottom block');
    assert.match(html, /<section class="rules">/, p + ': rules');
    assert.match(html, /<section class="member-note">/, p + ': membership');
    assert.match(html, /<div class="member-facts">/, p + ': four membership figures');
    for (const label of ['怎么玩', 'How to play', '会员与支持', 'Membership &amp; support'])
      assert.ok(html.includes(label), p + ': ' + label);
    /* The jumbo CTA, the promo card and the trophy board are gone. */
    for (const gone of ['id="home-access"', 'id="social-preview-note"',
      'class="local-note legal-links"', 'leaderboard-trophy', 'class="primary jumbo"'])
      assert.ok(!html.includes(gone), p + ': retired ' + gone);
    /* The launch stack is exactly three buttons, like pool. */
    const actions = html.match(/<div class="launch-actions home-actions">([\s\S]*?)<\/div>/);
    assert.ok(actions, p + ': launch actions found');
    assert.equal((actions[1].match(/<button/g) || []).length, 3, p + ': three launch buttons');
    assert.ok(/<div class="hero-tags hero-notes">[\s\S]*?id="home-difficulty"[\s\S]*?<\/div>/.test(html),
      p + ': bot difficulty is a tag-row chip, not a fourth launch button');
  }
  assert.ok(table.includes('class="intro-bottom"'), 'native-table keeps its own intro-bottom');
  assert.ok(!table.includes('会员装扮可更换头像'), 'no flight rules leaked into the table page');
  assert.ok(!table.includes(KEY), 'no flight-only sheet on the table page');
});

test('the animated cover is sized and positioned exactly like the pool cover', () => {
  assert.match(css, /grid-template-columns:minmax\(0,194px\) minmax\(0,1fr\)/,
    '94% of 194px = 182px, the measured pool .hero-art size');
  assert.match(css, /width:94%!important;height:auto!important;max-height:none!important;aspect-ratio:1 \/ 1/,
    'square cover even when the legacy hero CSS supplies a height');
  assert.match(css, /left:6px;top:158px;width:182px/, 'caption inside the 182px cover');
  assert.match(css, /grid-template-columns:minmax\(0,1fr\) 460px/, 'same two-column shell');
  assert.match(css, /grid-row:1 \/ span 2/, 'standings span both rows');
  assert.match(css, /\.hero-plane-model canvas\{[\s\S]*?transform:scale\(\.82\) translateY\(-8%\)/,
    'aircraft stays lifted above the caption');
  assert.match(index, /<span class="lang-cn">好友已就位，欢乐即将起飞<\/span>/,
    'the supplied animation caption is reproduced');
  assert.ok(!index.includes('class="hero-art"'), 'no static cover image was introduced');
  assert.match(index, /avatar-display\.js\?v=/, 'shared portrait renderer is loaded');
});

test('the standings are the pool win-rate table with ten fixed rows', () => {
  for (const rule of [
    /\.ranking-columns\{[\s\S]*?grid-template-columns:1fr 60px 60px/,
    /#leaderboard li\{[\s\S]*?grid-template-columns:32px minmax\(0,1fr\) 60px 60px/,
    /--rank-row:44px/,
    /li:has\(\.rank-medal\.rank-1\)/,
    /\.member-label\{[\s\S]*?vip-laurel-v3\.png/,
    /grid-template-columns:26px minmax\(0,1fr\) 44px 52px/
  ]) assert.match(css, rule, rule.source);
  assert.ok(!/leaderboard-list|leaderboard-tabs|lb-tab-/.test(css),
    'no old Joy Coins board styles remain');
  assert.match(css, /@media\(max-width:900px\)[\s\S]*?grid-template-columns:minmax\(0,1fr\)/,
    'narrow screens collapse to one column');
  assert.match(css, /html:not\(\[data-native-game="flight"\]\) #welcome \.intro-bottom/,
    'plain /index.html keeps its original layout');
});

test('the board fetches all three periods once and repaints from cache', () => {
  assert.match(social, /const PERIODS=\['month','week','day'\]/);
  assert.match(social, /Promise\.all\(PERIODS\.map\(async period=>/);
  assert.match(social, /\/api\/table\/leaderboards\/flight\?period=/);
  assert.match(social, /this\.boardCache\.set\(period,results\[i\]\)/);
  assert.match(social, /const tab=PERIODS\.includes\(this\.boardTab\)\?this\.boardTab:'month'/);
  assert.match(social, /this\.boardCache\.get\(tab\)/);
  assert.match(social, /if\(!this\.boardsLoaded\)\{this\.boardsLoaded=true;this\.loadAllLeaderboards\(\);\}/,
    'only the first render triggers the batch');
  assert.match(social, /data-period=/, 'new tab attribute');
  assert.ok(!social.includes('data-leaderboard-tab'), 'old tab attribute retired');
  assert.match(social, /rankRows\?\.\(merged,'points'\)/, 'sorted by score');
  assert.match(social, /games\.textContent=String\(Math\.max\(0,Number\(row\.games\)\|\|0\)\)/,
    'left number is completed games only');
  assert.match(social, /score\.textContent=String\(Math\.max\(0,Number\(row\.points\)\|\|0\)\)/,
    'right number is the cumulative score');
  assert.match(social, /tag\.hidden=!usedDemo/, 'sample tag is honest');
});

test('the server exposes real flight wins through the shared ranking endpoint', () => {
  assert.match(java, /if\("flight"\.equals\(game\)\)return flightLeaderboard\(period\)/);
  assert.match(java, /from account_match_results r join matches m on m\.id=r\.match_id/);
  assert.match(java, /sum\(case when r\.rank=1 then 1 else 0 end\)/);
  assert.match(java, /m\.status='SETTLED'/);
  assert.match(java, /sum\(case when r\.rank=1 then 40 when r\.rank=2 then 20 else 10 end\)/);
  assert.match(java, /order by 3 desc,count\(\*\) desc,a\.id limit 10/);
  /* The table-game branch is untouched. */
  assert.match(java, /from table_results t join accounts a/);
});

test('app wiring, static copy and cache keys survive the reflow', () => {
  for (const id of ['quick-match-preview', 'create', 'practice', 'home-difficulty',
    'home-difficulty-label', 'home-difficulty-value', 'leaderboard-shell'])
    assert.ok(index.includes('id="' + id + '"'), id + ' still exists');
  assert.match(app, /Create room <span>↗<\/span>/, 'pool-style create button copy');
  assert.match(app, /单机 · 电脑对战/, 'pool-style computer button copy');
  assert.match(i18n, /\['#quick-match-preview'/);
  assert.match(i18n, /'2–4 位玩家'/);
  assert.match(i18n, /'浏览器直接玩'/);
  assert.match(i18n, /aria-label','Standings','玩家排行'/);
  /* Every edited in-place asset has a new query key (prod caches ?v= for a day). */
  assert.ok(index.includes(KEY), 'dist/index.html links the new sheet');
  assert.ok(native.includes(KEY), 'native-flight.html links the new sheet');
  assert.match(index, /rl=20261116-poolshell1/);
  assert.match(native, /rl=20261116-poolshell1/);
  assert.match(app, /static-i18n\.js\?[^']*&p=20261116-poolshell1/);
  assert.match(app, /social-ui\.js\?[^']*&p=20261116-poolshell1/);
  assert.ok(native.includes('data-native-game="flight"'), 'native page scope marker');
});
