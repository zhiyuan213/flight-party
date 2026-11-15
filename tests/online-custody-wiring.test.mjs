/* 2026-11-14 · Static + snippet wiring for the shared online custody contract.
   The pure contract is covered by online-custody.test.mjs; the Java rules have
   CustodyPolicyTest / RoomRulesCustodyTest / GridRulesEasyBotTest. This file
   guards the seams: per-game storage, both game shells, the no-score gates and
   the documentation the user asked for. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import {avatarStyle} from '../dist/avatar.js';
import {custodyBadgeHTML,seatCustody,CUSTODY_HOSTED,CUSTODY_GRACE} from '../dist/online-custody-ui.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const table=read('dist/table/table.js'),app=read('dist/app.js'),rooms=read('dist/live-room-ui.js');
const policy=read('backend/src/main/java/com/flightparty/online/CustodyPolicy.java');
const tableService=read('backend/src/main/java/com/flightparty/table/TableService.java');
const roomRules=read('backend/src/main/java/com/flightparty/room/RoomRules.java');
const settlement=read('backend/src/main/java/com/flightparty/stats/SettlementService.java');
const completion=read('backend/src/main/java/com/flightparty/stats/MatchCompletionWorker.java');
const migration='backend/src/main/resources/db/migration/V25__online_custody_no_score.sql';
const doc=read('docs/ONLINE-GAME-MANAGEMENT.md');

test('both shells store the reconnect target under a per-game key',()=>{
 assert.match(table,/const roomHintKey=\(\)=>custodyStorageKey\(game\)/);
 assert.match(table,/raw&&raw\.game===game&&raw\.roomId/,'a four hint cannot resume a pool room');
 assert.match(table,/reconnectTarget\(game,id\)/);
 assert.match(app,/const flightRoomKey=\(\)=>custodyStorageKey\('flight'\)/);
 assert.match(app,/reconnectTarget\('flight',message\.room\.roomId\)/);
 assert.match(table,/readRoomHint\(\)/);
 assert.match(table,/clearRoomHint\(\)/);
});

test('re-selecting online re-enters the existing room; explicit invite codes win',()=>{
 assert.match(table,/const live=await request\('\/api\/table\/rooms\/'\+hint\.roomId\)/);
 assert.match(table,/live\.game===game&&\['WAITING','PLAYING'\]\.includes\(live\.phase\)/);
 assert.match(table,/if\(!code\)\{const hint=readRoomHint\(\)/,'an explicit room code bypasses the hint');
 assert.match(read('backend/src/main/java/com/flightparty/room/RoomController.java'),
  /presence\.resume\(room,user,now\)/,'every authoritative read reclaims the seat');
 assert.match(read('backend/src/main/java/com/flightparty/table/TableService.java'),
  /r=tick\(bind\(r,p\)\)/,'table rooms resume through the same authoritative read');
});

test('computer matches are exempt and always start fresh',()=>{
 assert.match(table,/function localStart\(withBot\)\{[^]*?clearRoomHint\(\);[^]*?board=start\(game\)/);
 assert.match(app,/function start\(\)\{[^]*?localStorage\.removeItem\(flightRoomKey\(\)\)/);
 assert.match(roomRules,/if \(!managed\(room\)\) return new Room\(room\.id\(\),Phase\.CLOSED/);
 assert.match(policy,/public static boolean managed\(int humanSeats\) \{ return humanSeats >= 2; \}/);
 assert.match(doc,/打机器人|computer match/i);
});

test('hosted results never write analytics, local points or server results',()=>{
 assert.match(table,/board\.over&&screen==='play'&&!hostedResult\)globalThis\.__joyflockGamePoints\?\.record/);
 assert.match(app,/if\(!hostedResult&&onlineMode&&!measuredGames\.has\(onlineRoomId\)\)/);
 assert.match(app,/if\(!hostedResult\)globalThis\.__joyflockGamePoints\?\.record/);
 assert.match(tableService,/if\(!CustodyPolicy\.recordsScore\(s\.resolved\(now\)\)\)continue;/);
 assert.match(settlement,/if\(p\.hosted\(\)\)continue;/);
 assert.match(completion,/RoomRules\.noScoreSeats/);
 assert.ok(existsSync(new URL('../'+migration,import.meta.url)),'V25 migration records hosted_at_end');
 assert.match(read(migration),/hosted_at_end boolean NOT NULL DEFAULT false/);
});

test('the 30s clock is derived from the server snapshot, not the device clock',()=>{
 assert.match(table,/const currentServerNow=\(\)=>roomServerNow\?serverClock\(roomServerNow,roomReceivedAt\):Date\.now\(\)/);
 assert.match(app,/function flightServerNow\(\)\{[^]*?serverClock\(/);
 assert.match(policy,/GRACE_MS = 30_000L/);
 assert.match(table,/setInterval\(\(\)=>\{[\s\S]*?updateCustodyBadges/);
 assert.match(app,/setInterval\(\(\)=>\{[\s\S]*?updateCustodyBadges/);
});

test('both shells render the custody badge beside the player name',()=>{
 assert.match(table,/card\.dataset\.seatIndex=String\(i\)/);
 assert.match(table,/custodyBadge\(document,info\)/);
 assert.match(app,/data-seat-index="\$\{s\.color\}"/);
 assert.match(app,/custodyBadgeHTML\(custody\)/);
 assert.match(rooms,/room-seat-custody/);
});

test('flight seat cards show the hosted badge and its no-score state',()=>{
 const fn=app.slice(app.indexOf('function playerCard('),app.indexOf('function render(){'));
 const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const info=seatCustody({managed:true,custody:[CUSTODY_HOSTED],graceUntil:[0]},0,1_700_000_000_000,'zh');
 const context=vm.createContext({game:{turn:0},onlineMode:true,onlineSession:{identity:null,room:{yourSeat:0}},
  previewTakeoverColor:()=>-1,FINISH:57,PALETTE:[0x477eff],avatarStyle,esc,t:en=>en,
  social:{playerStats:()=>''},prefs:{lang:'zh'},flightCustody:()=>info,custodyBadgeHTML});
 vm.runInContext(fn,context);
 const html=context.playerCard({color:0,type:'human',name:'Hosted pilot',pieces:[-1,2],member:true});
 assert.match(html,/data-seat-index="0"/);
 assert.match(html,/data-custody="hosted"/);
 assert.match(html,/托管中 · 简单电脑/);
 assert.match(html,/custody-badge/);
});

test('the crew dialog labels grace and hosted seats with the shared labels',()=>{
 const grace=read('dist/online-custody.js');
 assert.match(rooms,/CUSTODY_LABELS/);
 assert.match(grace,/graceHint: '玩家已离开，30 秒内回来可继续本局'/);
 assert.match(grace,/noScore: '本局以托管结束，不记录数据、不计 Joy Coins'/);
});

test('the management document records the whole contract',()=>{
 for(const phrase of ['30 秒','简单机器人','双托管','游戏隔离','不记分','重连','在线对决'])
  assert.ok(doc.includes(phrase),'missing documented rule: '+phrase);
 assert.match(doc,/CustodyPolicy/);
 assert.match(doc,/V25__online_custody_no_score\.sql/);
});
