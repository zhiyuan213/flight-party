import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const agents = read('AGENTS.md');
const contract = read('docs/V07-CONTRACT.md');
const social = read('dist/social-ui.js');
const tableJs = read('dist/table/table.js');
const tableHtml = read('dist/table/index.html');
const homeHtml = read('dist/index.html');

/* The 2026-10-31 preview scope is historical. Without an explicit supersede
   marker, a later reader (or agent) treats "Remove wins/win-rate UI" and
   "No payment/deployment work" as live constraints and blocks a release. */
test('AGENTS.md states the shipped scope and marks the preview section superseded', () => {
  assert.match(agents, /## Current scope \(2026-11-15; supersedes the 2026-10-31 preview section below\)/);
  assert.match(agents, /bindLiveRooms/, 'the live overrides are documented');
  assert.match(agents, /match_participants\.hosted_at_end/, 'the V25 migration is documented');
  assert.match(agents, /Deployment is in scope/, 'deployment is no longer forbidden');
  assert.match(agents, /## Historical UI scope and future functionality \(2026-10-31 — superseded/);
  assert.ok(agents.indexOf('## Current scope') < agents.indexOf('## Historical UI scope'),
    'the current scope is stated before the historical one');
});

test('V07-CONTRACT.md carries the same status note at its top', () => {
  assert.ok(contract.startsWith('> **状态说明（2026-11-15）**'));
  assert.match(contract, /AGENTS\.md/);
  assert.match(contract, /降级预览路径/);
});

test('fallback preview markup is labelled, not mistaken for shipped behaviour', () => {
  assert.match(social, /Fallback presentation layer/);
  assert.match(social, /bindLiveRooms/);
  assert.ok(!social.includes('No network, account storage, password storage, or real quotas'),
    'the old "no network" claim is gone: loadLeaderboard does fetch /api/leaderboards');
  assert.match(social, /UI PREVIEW/, 'the fallback string stays honest for the degraded path');
  assert.match(social, /fetch\(`\/api\/leaderboards/, 'the real leaderboard fetch remains');
  assert.ok(!homeHtml.includes('Account interface preview'),
    'the homepage account button no longer describes a live account as a preview');
});

test('the demo footnote only shows while sample rows are actually on the board', () => {
  assert.match(tableJs, /let usedDemo=false;/);
  assert.match(tableJs, /merged\.push\(entry\);usedDemo=true;/);
  assert.match(tableJs, /demoTag\.hidden=!usedDemo/);
  assert.match(tableHtml, /ranking-footnote[^<]*<span class="demo-tag"/);
  assert.match(tableHtml, /table\.js\?v=20261115-joincoin1&d=20261115-winrate1&u=20261115-scope1/,
    'the rebuilt refresh logic is cache-busted');
  assert.match(tableHtml, /月胜率榜/, 'the win-rate board itself is unchanged');
});

/* 18:36 review of 7b06ed8: three stale statements were still able to make a
   reader block a release (UI preview scope, daily-first-game recording, and
   "SSH key still locked"). Guard the corrected wording. */
test('the 18:36 corrections remove the last stale scope claims', () => {
  assert.ok(!agents.includes('The current v0.7.2 scope is UI preview'));
  assert.match(agents, /Historical visual baseline \(v0\.7\.2\)/);
  assert.match(agents, /Historical score-recording override/);
  assert.match(agents, /no "first game per day" limit/);
  assert.match(contract, /当前计分规则（2026-11-15/);
  assert.match(contract, /SettlementService\.java/);
  const handoff = read('docs/HANDOFF.md');
  assert.ok(!handoff.includes('SSH 私钥仍需解锁'));
  assert.match(handoff, /ubuntu` 账号 \+ 现有密钥直连/);
  assert.match(handoff, /sudo` 可用/);
});
