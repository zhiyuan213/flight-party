import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(resolve(root, p), 'utf8').replace(/\r\n/g, '\n');
const html = read('dist/table/index.html');
const table = read('dist/table/table.js');
const boot = read('dist/table/intro-boot.js');

const facts = html.match(/<div class="member-facts">([\s\S]*?)<\/div><\/div>/)?.[1] ?? '';

/* Exercise the real paintMemberFacts() in a tiny DOM stand-in. The function is
   module-scoped, so slice it out together with its memberStats declaration. */
function loadPainter(me, lang = 'zh') {
  const start = table.indexOf('let memberStats={points:0');
  const end = table.indexOf('async function refreshStats()', start);
  assert.ok(start >= 0 && end > start, 'member-facts painter is present in table.js');
  const source = table.slice(start, end);
  const nodes = {};
  for (const key of ['tier', 'points', 'games', 'winrate']) {
    nodes[key] = {textContent: '', dataset: {}};
  }
  const box = {
    querySelector(sel) {
      const m = sel.match(/\[data-member-fact="([^"]+)"\]/);
      return m ? nodes[m[1]] : null;
    }
  };
  const document = {
    documentElement: {lang},
    querySelector: sel => sel === '.member-facts' ? box : null
  };
  const api = new Function('document', 'me',
    source + '\nreturn {paint:paintMemberFacts,set:v=>{memberStats=v;}};')(document, me);
  return {api, nodes};
}

test('the first frame no longer ships sample account figures', () => {
  assert.ok(facts, 'member-facts block must exist');
  for (const key of ['tier', 'points', 'games', 'winrate']) {
    assert.match(facts, new RegExp(`data-member-fact="${key}"`), `${key} must be addressable`);
  }
  assert.match(facts, /data-member-fact="tier"[^>]*>未开通</);
  assert.match(facts, /data-member-fact="points"[^>]*>0</);
  assert.match(facts, /data-member-fact="games"[^>]*>0</);
  assert.match(facts, /data-member-fact="winrate"[^>]*>0%</);
  for (const stale of ['278', '68%', 'Annual VIP', '>66<', '年度 VIP']) {
    assert.ok(!facts.includes(stale), `sample value ${stale} must be gone`);
  }
});

test('the painter defaults to zeros for a guest with no session', () => {
  const {api, nodes} = loadPainter(null);
  api.paint();
  assert.equal(nodes.tier.textContent, '未开通');
  assert.equal(nodes.points.textContent, '0');
  assert.equal(nodes.games.textContent, '0');
  assert.equal(nodes.winrate.textContent, '0%');
  assert.equal(nodes.tier.dataset.systemEnglish, '未开通');
});

test('a signed-in annual member sees the real per-game statistics', () => {
  const {api, nodes} = loadPainter({appearance: {annualMember: true, member: true}});
  api.set({points: 42, completedGames: 7, winRate: null});
  api.paint();
  assert.equal(nodes.tier.textContent, '年度 VIP');
  assert.equal(nodes.points.textContent, '42');
  assert.equal(nodes.games.textContent, '7');
  // No backend field exists for win rate: never fabricate 68%.
  assert.equal(nodes.winrate.textContent, '0%');
});

test('tier and numbers follow the active language and clamp invalid values', () => {
  const plain = loadPainter({appearance: {member: true}}, 'en');
  plain.api.set({points: -5, completedGames: Number.NaN, winRate: 130});
  plain.api.paint();
  assert.equal(plain.nodes.tier.textContent, 'VIP');
  assert.equal(plain.nodes.points.textContent, '0');
  assert.equal(plain.nodes.games.textContent, '0');
  assert.equal(plain.nodes.winrate.textContent, '100%');

  const guest = loadPainter({appearance: {member: false}}, 'en');
  guest.api.paint();
  assert.equal(guest.nodes.tier.textContent, 'Not a member');
});

test('real data comes from the current session and per-game stats endpoint', () => {
  assert.match(table, /request\('\/api\/table\/stats\/'\+game\)/);
  assert.match(table, /memberStats=\{points:Number\(stats\?\.points\)\|\|0,completedGames:Number\(stats\?\.completedGames\)\|\|0/);
  assert.match(table, /me=await request\('\/api\/me'\);paintMemberFacts\(\)/);
  assert.match(table, /applyTableLocale\(locale\);paintMemberFacts\(\)/, 'language switch repaints the tier');
  // Guests and failed requests must fall back to zeros, not sample data.
  assert.match(table, /if\(!me\?\.account\)\{demo\(\);reset\(\);return;\}/);
  assert.match(table, /catch\{demo\(\);reset\(\);\}/);
});

test('the other "my record" placeholder also starts at zero', () => {
  assert.match(boot, /'My record: 0 Joy Coins · 0 games'/);
  assert.match(boot, /'我的战绩：0 Joy Coins · 0 局'/);
  assert.ok(!/278|68%|\+36/.test(boot.match(/window\.__joyflockDemoStats=function[\s\S]*?\n  \};/)?.[0] ?? ''));
  assert.match(table, /'我的战绩：0 Joy Coins · 0 局'/);
  assert.ok(!table.includes('278 Joy Coins'), 'table.js fallback must not resurrect the sample record');
});

test('touched assets keep one shared cache key', () => {
  const tags = [
    html.match(/src="table\.js\?v=([^"'&]+)/)?.[1],
    html.match(/intro-boot\.js\?v=([^"'&]+)/)?.[1],
    html.match(/table-home-clean\.css\?v=([^"'&]+)/)?.[1],
    table.match(/presentation\.js\?v=([^"']+)/)?.[1]
  ];
  assert.ok(tags.every(Boolean), 'each touched asset needs a version tag');
  assert.equal(new Set(tags).size, 1, 'the assets must share one version');
  assert.notEqual(tags[0], '20261111-avatarfallback1', 'cache key must be bumped');
});
