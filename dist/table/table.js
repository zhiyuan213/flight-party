import {botLevelStore,BOT_BONUS,botLabel} from '../bot-difficulty.js?v=20261112-gamelanes1&nine=20261120-nineball1&power=20261120-poolpower30';
import {attachFourDrop} from './four-drop.js?v=20261113-fourfx1&skin=20261120-billiardskins1';
import {attachFourFeedback} from './four-feedback.js?v=20261113-fourfx1';
import {fourSeatPiece} from './four-seat-piece.js?v=20261113-gomokuseat1&skin=20261120-billiardskins1';
import {openThemePicker,getTheme,setTheme,instanceId as themeInstanceId} from './four-theme.js?v=20261110-glove2';
import {showMatchBox,hideMatchBox,updateMatchBox} from './match-box.js?v=20261110-glove2';
import {mountArcade} from './arcade-table.js?v=20261112-natural1&release=20261115-polishrelease1&ui=20261123-polish1';
import {mountSnookerShell} from './snooker-shell.js?v=20261111-targetballs1&release=20261115-polishrelease1';
import {renderChess} from './chess-view.js?v=20261110-glove2';
import {unlockPoolAudio} from './pool-audio.js?v=20261113-snookerrail1&release=20261115-polishrelease1&audio=20261115-levels1&power=20261120-poolpower30';
import {unlockBubblesAudio} from './bubbles-audio.js?v=20261113-bubbles2&audio=20261115-levels1';
import {cancelPoolCountdown,updatePoolCountdown,COUNTDOWN_TOTAL,COUNTDOWN_WINDOW} from './pool-countdown.js?release=20261115-polishrelease1';
import {updateFourResult,updateGridResult,updatePoolShell,updateTableChat,sendPoolChatEmoji,appendPoolChatReaction} from './pool-shell.js?v=20261115-joincoin1&d=20261115-chatfs1&r=20261115-fspill1&native=20261115-native1&c=20261116-fastcount1&g=20261116-gridhold1&nine=20261120-nineball1&power=20261120-poolpower30&score=20261120-score1&name=20261121-accountname1&ui=20261123-polish1';
import {CATALOG,coverFor,playerCard,screenForRoom} from './presentation.js?v=20261115-joincoin1&art=20261123-covers2';
import {renderPool} from './pool.js?v=20261113-pooldiff1&release=20261115-polishrelease1&nine=20261120-nineball1&fix=20261120-nineball-return1&power=20261120-poolpower30';
import {animatePoolOpponentShot,cancelPoolOpponentShot} from './pool-view.js?v=20261112-gamelanes1&release=20261115-polishrelease1&nine=20261120-nineball1&fix=20261120-nineball-return1&power=20261120-poolpower30';
import {renderCards} from './cards.js?v=20261112-gamelanes1&ui=20261123-polish1';
import {drawSketch,sketchNext} from './sketch.js?v=20261110-glove2';
import {start,move,bot,legal} from './grid-rules.js?v=20261112-gamelanes1&release=20261115-polishrelease1&nine=20261120-nineball1&power=20261120-poolpower30';
import {bubblesScore} from './bubbles-duel.js?v=20261112-gamelanes1';
import {renderGomoku} from './gomoku-view.js?v=20261112-natural1';
import {applyCosmetics,decoratePieces,localSelection,profiles} from './game-cosmetics.js?v=20261112-gamelanes1&nine=20261120-nineball1&skin=20261120-billiardskins1&power=20261120-poolpower30';
import {createRoomCosmeticSync} from './room-cosmetics.js';
/* ONLINE CUSTODY — the shared, per-game state machine. The server owns the
   authoritative copy; this shell only paints the 30s countdown, the hosted
   badge and the "no data / no points" notice. See docs/ONLINE-GAME-MANAGEMENT.md. */
import {custodyStorageKey,serverClock,seatCustody,shouldRecordResult,reconnectTarget,CUSTODY_LABELS,CUSTODY_GRACE,CUSTODY_HOSTED,turnClockVisible,needsPresenceSignal} from '../online-custody.js?v=20261115-joincoin1';
import {custodyBadge,updateCustodyBadges,noScoreNotice,ensureCustodyStyles} from '../online-custody-ui.js?v=20261115-joincoin1';
/* Cross-origin account nickname: the portal shell on joyflock.com owns the
   confirmed display name, while this iframe can be on flight.joyflock.com. */
import {cachedDisplayName,normalizeDisplayName,trustedParentOrigin} from '../account-name.js?v=20261121-accountname1';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),game=['gomoku','puzzle','chess','draw','cards','pool','nineball','xo','snooker','bubbles'].includes(params.get('game'))?params.get('game'):'four',title=game==='snooker'?'斯诺克':game==='bubbles'?'泡泡射击':game==='xo'?'井字棋':game==='four'?'四子连珠':game==='gomoku'?'五子棋':game==='chess'?'国际象棋':game==='draw'?'你画我猜':game==='cards'?'欢乐纸牌':game==='nineball'?'欢乐九球':game==='pool'?'欢乐台球':'趣味拼图';
/* Each table game remembers its own computer difficulty:
   localStorage['joyflock.bot.level.<game>'], with the legacy shared key only
   as a one-way migration fallback. */
const botLevels=botLevelStore(game);
let board=start(game),room=null,csrf=null,pending=false,computer=false,local=true,me=null,poll=null,generation=0,last=-1,rematchPending=false,puzzleSelection=null,screen='home',period='month',reactionCursor=0,reactionRoom=null,reactionBusy=false,settledRoom=null,autoReadyFor=null,mySeat=1;
/* Server-confirmed nickname mirrored from the parent shell. Display only:
   a missing backend session in this iframe never turns it into an account. */
let sharedAccountName=cachedDisplayName();
/* The authoritative clock is serverNow + local elapsed time, so a client with
   a wrong system clock still shows the correct 30s reconnect countdown. */
let roomReceivedAt=0,roomServerNow=0,custodyTimer=null,lastRoomHint='',hostedResult=false;
/* Manual ready: one server vote per seat, then a short 200ms "both ready"
   beat before the board is revealed. */
let readyBusy=false,playStartDelay=false,playStartTimer=null;
const currentServerNow=()=>roomServerNow?serverClock(roomServerNow,roomReceivedAt):Date.now();
const tableLang=()=>document.documentElement.lang==='en'?'en':'zh';
const roomHintKey=()=>custodyStorageKey(game);
/* Per-game isolation: only this game's key is ever read or written. */
function readRoomHint(){try{const raw=JSON.parse(localStorage.getItem(roomHintKey())||'null');return raw&&raw.game===game&&raw.roomId?raw:null;}catch{return null;}}
function writeRoomHint(id){const value=JSON.stringify(reconnectTarget(game,id));if(value===lastRoomHint)return;lastRoomHint=value;try{localStorage.setItem(roomHintKey(),value);}catch{}}
function clearRoomHint(){lastRoomHint='';try{localStorage.removeItem(roomHintKey());}catch{}}
function syncRoomUrl(id){try{const url=new URL(location.href);if(url.searchParams.get('room')!==String(id)){url.searchParams.set('room',String(id));history.replaceState(null,'',url);}}catch{}}
/* ONLINE PRESENCE — an explicit signal, never a polling side-effect.
   A fresh page load / re-selecting 在线对决 ("resume") or a real pointer, key,
   wheel or touch event ("pointer") reclaims this player's grace/hosted seat:
   the easy bot stops at once and the server hands back a fresh 30s turn.
   Plain GET polling deliberately does NOT signal presence, so an online but
   idle player is hosted when their own 30s turn countdown runs out.
   Pointer events are sent even while active (throttled to 5s) so that the
   FIRST mouse move after the server hosts the seat can never be missed; the
   server treats those as read-only. Hosted/grace seats report every 1.2s. */
let activityBusy=false,lastActivitySent=0;
async function reportActivity(reason){
 if(!room||room.phase!=='PLAYING'||room.managed===false||activityBusy)return;
 const state=Array.isArray(room.custody)?room.custody[Number(room.you)]:null;
 const gap=needsPresenceSignal(state)?1200:5000;
 if(reason!=='resume'&&Date.now()-lastActivitySent<gap)return;
 const id=room.id;lastActivitySent=Date.now();activityBusy=true;
 try{
  const next=await request('/api/table/rooms/'+id+'/activity',{reason});
  if(next&&room?.id===id&&next.version!==room.version)apply(next);
 }catch{}finally{activityBusy=false;}
}
for(const type of ['pointermove','pointerdown','keydown','wheel','touchstart'])
 document.addEventListener(type,()=>reportActivity('pointer'),{passive:true});
/* A 1s repaint keeps the countdown honest even between server polls. */
function startCustodyClock(){if(custodyTimer)return;ensureCustodyStyles(document);custodyTimer=setInterval(()=>{
 if(!room||!isCustodyVisible())return;
 const now=currentServerNow(),lang=tableLang();
 updateCustodyBadges(document,$('seats'),room,now,lang,'[data-seat-index]');
 updateCustodyBadges(document,$('waiting-seats'),room,now,lang,'[data-seat-index]');
},1000);}
function stopCustodyClock(){clearInterval(custodyTimer);custodyTimer=null;}
function isCustodyVisible(){return !!room&&(Array.isArray(room.custody)?room.custody.some(s=>s==='grace'||s==='hosted'):false);}
/* Two-human friends rooms start on MANUAL ready votes now. The server owns the
   votes (table_room_ready) and flips the room to PLAYING on the second one;
   this shell only paints the button, both seat tags and the 200ms hold. */
function roomIsFull(value){return !!value&&value.origin==='FRIENDS'&&Array.isArray(value.bots)&&value.bots.length>=2&&!value.bots.some(Boolean);}
function myReady(value){return !!value&&Number.isInteger(value.you)&&Array.isArray(value.ready)&&value.ready[value.you]===true;}
function clearPlayStartDelay(){if(playStartTimer){clearTimeout(playStartTimer);playStartTimer=null;}playStartDelay=false;}
function paintReadyButton(){
  const btn=$('ready-room');if(!btn)return;
  const lang=tableLang();
  const visible=!!room&&room.origin==='FRIENDS'&&(room.phase==='WAITING'||(room.phase==='PLAYING'&&playStartDelay));
  btn.hidden=!visible;
  if(!visible){btn.removeAttribute('data-ready');return;}
  const done=myReady(room)||room.phase==='PLAYING';
  const state=done?'done':roomIsFull(room)?'available':'waiting';
  btn.dataset.ready=state;
  btn.disabled=done||state!=='available'||readyBusy;
  btn.textContent=done?(lang==='en'?'Ready':'已准备'):(lang==='en'?'Ready up':'准备');
  btn.title=state==='waiting'?(lang==='en'?'Waiting for your friend to join':'等待好友加入后可准备'):'';
}
/* "本局以托管结束，不记录数据、不计 Joy Coins" — shown only when the *viewer's* seat
   finished hosted. A player who came back before the end scores normally. */
function paintNoScore(){
  const lang=tableLang();let note=document.querySelector('[data-custody-no-score]');
  if(!note){note=noScoreNotice(document,lang);if(note){note.hidden=true;($('arena')||document.body).append(note);}}
  if(!note)return;
  note.hidden=!(hostedResult&&screen==='play');
  note.textContent=CUSTODY_LABELS[lang].noScore;
}
$('title').textContent=title;if(!document.documentElement.hasAttribute('data-intro-ready')){$('game-name').textContent=title;document.title=title+' · JoyFlock';}if(!['bubbles','snooker'].includes(game))$('rules').textContent=game==='four'?'轮流选择一列落子，棋子落到该列最下方的空位。横、竖或斜向连成4颗即获胜。':'双方轮流落子，黑棋先行。横、竖或斜向连成5颗及以上获胜；当前为无禁手的自由五子棋。';document.body.classList.toggle('pool-game',game==='pool'||game==='nineball');document.body.classList.toggle('snooker-game',game==='snooker');document.body.classList.toggle('chess-game',game==='chess');$('board').classList.toggle('chess',game==='chess');/* Sweeping the pointer across 64 squares must not tick on every cell: the
   global hover sfx already honours [data-sfx="off"] via closest(), so mark the
   whole chess board once instead of bumping the shared script/version chain. */if(game==='chess')$('board').setAttribute('data-sfx','off');$('promotion-setting').hidden=game!=='chess';if(game==='chess')$('rules').textContent='白棋先行。点击自己的棋子，再点击目标格。支持王车易位、吃过路兵及升变；将死获胜，逼和、重复局面、50回合及子力不足判和。电脑为基础难度。';$('board').classList.toggle('gomoku',game==='gomoku');$('board').classList.toggle('puzzle',game==='puzzle');if(game==='puzzle'){$('score-note').textContent='两人对局：胜者 200 Joy Coins、败者 100 Joy Coins；匿名只显示不保存，登录账号自动累计。';$('rules').textContent='交换两块拼图，还原完整的飞行棋画面。点击两块图片交换位置，也可以拖动交换。联机时与好友轮流协作；完成后按胜负结算 200 / 100 Joy Coins。';$('computer').textContent='单机 · 电脑协作';}
async function request(path,body){const response=await fetch(path,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:{...(body===undefined?{}:{'content-type':'application/json'}),...(csrf?{[csrf.headerName]:csrf.token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});if(!response.ok){const error=Error('请求失败 ('+response.status+')');error.status=response.status;throw error;}const text=await response.text();return text?JSON.parse(text):null;}
async function init(){if(!csrf){csrf=await request('/api/csrf');await request('/api/session/guest',{});}me=await request('/api/me');paintMemberFacts();$('profile').textContent=(me.account?.displayName||'游客')+(me.appearance?.annualMember?' · YEAR VIP':me.appearance?.member?' · VIP':'');$('profile').classList.toggle('vip',!!me.appearance?.member);$('account-open').textContent=me.account?me.account.displayName:'登录 / 注册';await refreshStats();loadAllLeaderboards();render();}
/* All three period tabs are fetched together on entry (and once more after a
   completed online match), never on hover / click. Switching a tab only
   re-renders from boardCache, so sweeping the pointer over the tabs costs
   zero requests. A load token discards a stale batch if a settlement refresh
   overtakes the entry request. */
const PERIODS=['month','week','day'];
const boardCache=new Map();
let boardLoadToken=0;
async function loadAllLeaderboards(){
 const token=++boardLoadToken;
 const results=await Promise.all(PERIODS.map(async p=>{
  try{const response=await request('/api/table/leaderboards/'+game+'?period='+p);
   return Array.isArray(response)?response:[];}catch{return [];}
 }));
 if(token!==boardLoadToken)return;
 PERIODS.forEach((p,i)=>boardCache.set(p,results[i]));
 refreshLeaderboard();
 /* A very fast batch (local / cached) can land before the first-paint boot
    fills the standings with demo rows. Repaint once the document settles so
    the preloaded real rows are not lost. */
 if(typeof document!=='undefined'&&document.readyState!=='complete'&&typeof globalThis.addEventListener==='function')
  globalThis.addEventListener('load',()=>{if(token===boardLoadToken)refreshLeaderboard();},{once:true});
}
/* Real standings come first; demo rows fill the board up to ten seats so the
   panel keeps a fixed height on a fresh deployment with no online results.
   Ordering is by SCORE only; games is a reference column. */function refreshLeaderboard(){
 const scoreOf=r=>Number(r.points)||0;
 const rows=boardCache.get(period)||[];
 const real=rows.slice(0,10).filter(row=>row&&typeof row==='object').map(row=>{
  const games=Number(row.games)||0,wins=Math.max(0,Math.min(games,Number(row.wins)||0));
  return {name:row.name||row.displayName||'玩家',points:Number(row.points)||0,games,wins,
  winRate:games?wins/games*100:0,
  avatarUrl:row.avatarUrl,avatarId:row.avatarId,member:!!row.member,annualMember:!!row.annualMember,frame:row.frame};});
  const demo=globalThis.__joyflockDemoRows?globalThis.__joyflockDemoRows(period,game):[];
  const merged=real.slice();
  let usedDemo=false;
  for(const entry of demo){if(merged.length>=10)break;merged.push(entry);usedDemo=true;}
  /* The visitor's own finished-game points are dynamic data, not demo data. */  const self=globalThis.__joyflockGamePoints?.leaderboardRow?.();
  if(self)merged.push(self);
  merged.sort((a,b)=>scoreOf(b)-scoreOf(a)||(Number(b.games)||0)-(Number(a.games)||0));
  const row=globalThis.__joyflockRankRow;
 if(typeof row!=='function')return;
 const top=globalThis.__joyflockGamePoints?.rankRows?.(merged,'points')
  ||merged.sort((a,b)=>scoreOf(b)-scoreOf(a)||(Number(b.games)||0)-(Number(a.games)||0)).slice(0,10);
 $('leaderboard').replaceChildren(...top.map((entry,i)=>{
  const li=row(document,entry,i);
  /* The dynamic self row is tagged exactly like Flight Party's SocialUI row,
     so a reload (when only table.js refreshes the board) stays identifiable. */ if(entry&&entry.self===true)li.dataset.self='1';
  return li;
 }));
 /* The footnote's "示例数据" tag is honest only while demo rows are on the
    board. Once the server supplies every standing, hide it instead of
    labelling live results as samples. */
 const demoTag=document.querySelector('.ranking-footnote .demo-tag');
 if(demoTag)demoTag.hidden=!usedDemo;
}
/* The four "会员与计分 figures used to be hard-coded sample values
   (Annual VIP / 278 / 66 / 68%). They now describe the current account:
   tier from /api/me, points and completed games from /api/table/stats/<game>.
   Guests, offline mode and failed requests keep the neutral zeros written in
   the first frame. The backend has no win-rate field yet, so that cell stays
   at 0% instead of inventing a percentage. */let memberStats={points:0,completedGames:0,winRate:null};
function paintMemberFacts(){
 const box=document.querySelector('.member-facts');if(!box)return;
 /* Finished games are the single source for these figures when the points
    module has a live record; the server-only fallback below stays for hosts
    that have not loaded it. */const local=globalThis.__joyflockGamePoints?.get?.();
 if(local&&local.games)memberStats={points:local.points,completedGames:local.games,winRate:local.winRate};
 const en=document.documentElement.lang==='en';
 const tier=me===null?'—':me?.appearance?.annualMember?(en?'Annual VIP':'年度 VIP')
  :me?.appearance?.member?(en?'VIP':'会员'):(en?'Not a member':'未开通');
 const set=(key,text)=>{const node=box.querySelector('[data-member-fact="'+key+'"]');if(!node)return;node.textContent=text;node.dataset.systemEnglish=text;};
 set('tier',tier);
 set('points',String(Math.max(0,Number(memberStats.points)||0)));
 set('score',String(Math.max(0,Number(local&&local.score)||0)));
 set('games',String(Math.max(0,Number(memberStats.completedGames)||0)));
 set('winrate',memberStats.winRate==null?'0%':Math.round(Math.max(0,Math.min(100,Number(memberStats.winRate)||0)))+'%');
}
async function refreshStats(){
 const reset=()=>{memberStats={points:0,completedGames:0,winRate:null};paintMemberFacts();};
 const demo=()=>{$('stats').dataset.demo='1';$('stats').textContent=globalThis.__joyflockDemoStats?globalThis.__joyflockDemoStats():'我的积分：0 · 0 局';};
 if(!me?.account){demo();reset();return;}
 try{const stats=await request('/api/table/stats/'+game);delete $('stats').dataset.demo;const score=Math.max(0,Number(globalThis.__joyflockGamePoints?.get?.()?.score)||0);$('stats').textContent=document.documentElement.lang==='en'?'My score: '+score+' · '+stats.completedGames+' games':'我的积分：'+score+' · '+stats.completedGames+' 局';memberStats={points:Number(stats?.points)||0,completedGames:Number(stats?.completedGames)||0,winRate:null};paintMemberFacts();}
 catch{demo();reset();}
}
/* The viewer's own seat: /api/me wins when this origin has the session, then
   the parent-mirrored nickname, then the neutral guest label. */
const ownAccountName=()=>normalizeDisplayName(me?.account?.displayName)||sharedAccountName||'';
const selfIndex=()=>room?Number(room.you):(Number(mySeat)||1)-1;
const names=()=>{
  if(room?.names)return room.names;
  const human=ownAccountName()||tableLabel('你'),bot=tableLabel(computer?'电脑':'好友');
  return mySeat===2?[bot,human]:[human,bot];
};
/* Every game in this shell reports its finished board here, including the ones
   without the result dialog (Gomoku, Chess, Cards, Puzzles, Draw, Bubbles,
   Snooker). The sound module de-dupes this against the dialog's own cue, so a
   win or loss is heard exactly once, whenever the result becomes final. */function resultOutcome(options){
  const winner=Number(options?.board?.winner)||0,personal=!!options.room||!!options.computer,
    you=options.room?Number(options.room.you)+1:(Number(options.mySeat)||1);
  return !winner?'draw':personal&&winner!==you?'loss':'win';
}
function playResultSound(options){
  if(screen!=='play'||!options?.board?.over)return;
  const sfx=globalThis.__joyflockResultSfx;
  if(!sfx||typeof sfx.play!=='function')return;
  // Same key as pool-shell.js resultKey: the two call sites cannot double-play.
  const localKey=game==='four'?'local-four-'+options.generation:'local';
  sfx.play(resultOutcome(options),[options.room?.id||localKey,options.board.moves,options.board.winner].join(':'));
}
const usesOpening=game==='four'||game==='xo';
const isBubbles=game==='bubbles';
const isSnooker=game==='snooker';
const isPoolLike=game==='pool'||game==='nineball';
const isBilliards=isPoolLike||game==='snooker';
const NO_GUIDE_KEY='joyflock.billiards.noGuide';
const noGuideOn=()=>{try{return localStorage.getItem(NO_GUIDE_KEY)==='1';}catch{return false;}};
const setNoGuide=v=>{try{localStorage.setItem(NO_GUIDE_KEY,v?'1':'0');}catch{}};
const isCanvasGame=isBubbles||isSnooker;
const usesCountdown=usesOpening||isCanvasGame||game==='chess';
let arcadeStarted=false,arcadeStatus='';
/* Bubble Duel used to cram "玩家1 0 : 0 玩家2 · 回合 0/24 · 轮到 玩家1" into
   the shared <h2>. In the narrow sidebar that wrapped mid-word, used placeholder
   names that disagreed with the seats above, and repeated the round limit from
   the instructions. Render it as a compact scoreboard instead; every other game
   keeps the plain-text status path. */function bubbleStatusNode(state){
  const zh=document.documentElement.lang!=='en',seats=names(),you=room?room.you+1:mySeat;
  const node=document.createElement('span');node.className='bubble-status';
  const line=document.createElement('span');line.className='bubble-scoreline';
  const left=document.createElement('span');
  left.className='bubble-seat bubble-seat-1'+(state.turn===1&&!state.over?' is-active':'');
  left.textContent=seats[0]||(zh?'玩家1':'P1');
  const right=document.createElement('span');
  right.className='bubble-seat bubble-seat-2'+(state.turn===2&&!state.over?' is-active':'');
  right.textContent=seats[1]||(zh?'玩家2':'P2');
  const score=document.createElement('span');score.className='bubble-score';
  const a=document.createElement('b');a.textContent=String(state.score1);
  const colon=document.createElement('i');colon.textContent=':';
  const b=document.createElement('b');b.textContent=String(state.score2);
  score.append(a,colon,b);line.append(left,score,right);
  const meta=document.createElement('span');meta.className='bubble-meta';
  const round=document.createElement('span');round.className='bubble-round';
  const shown=Math.min(state.over?state.moves:state.moves+1,state.limit);
  round.textContent=zh?'第 '+shown+' / '+state.limit+' 回合':'Round '+shown+' / '+state.limit;
  const turn=document.createElement('span');turn.className='bubble-turn';
  if(state.over)turn.textContent=zh?'已结束':'Finished';
  else if(state.turn===you){turn.textContent=zh?'轮到你':'Your turn';turn.classList.add('is-you');}
  else turn.textContent=zh?'对手回合':'Opponent turn';
  meta.append(round,turn);node.append(line,meta);return node;
}
function renderStatus(value){
  const host=$('status');
  if(value&&typeof value==='object'&&value.kind==='bubbles'){
    host.classList.add('bubble-status-host');
    const key=[value.score1,value.score2,value.moves,value.limit,value.turn,value.over,room?.you,document.documentElement.lang].join('|');
    if(host.dataset.bubbleKey===key)return;
    host.dataset.bubbleKey=key;
    host.replaceChildren(bubbleStatusNode(value));
    return;
  }
  delete host.dataset.bubbleKey;
  host.classList.remove('bubble-status-host');
  const text=String(value??'');
  if(host.textContent!==text)host.textContent=text;
}
/* An illegal chess move used to be a tiny fixed toast pinned to the very
   bottom of the viewport, where it overlapped the board's file labels and was
   easy to miss. Pool shows the same class of message as a non-blocking caption
   over the table (.pool-turn-toast in pool-shell.css), so reuse that exact
   card: dark gold-rimmed surface, 2s fade in/out, pointer-events:none. */let chessNotice=null,chessNoticeTimer=0;
function showChessNotice(text){
  const panel=document.querySelector('.game-panel');
  if(!panel){$('message').textContent=text;return;}
  if(!chessNotice){
    chessNotice=document.createElement('div');
    chessNotice.className='pool-turn-toast chess-illegal-toast';
    chessNotice.setAttribute('role','status');
    chessNotice.hidden=true;
    panel.append(chessNotice);
  }
  chessNotice.textContent=text;
  chessNotice.hidden=false;
  chessNotice.style.animation='none';void chessNotice.offsetWidth;chessNotice.style.animation='';
  clearTimeout(chessNoticeTimer);
  chessNoticeTimer=setTimeout(()=>{if(chessNotice)chessNotice.hidden=true;},2000);
}
/* Canvas games (Bubble Duel + Snooker) use the exact same authoritative
   board / room pipeline as Pool and Tic-tac-toe. The renderer only reports an
   aim / shot command; all scoring and turn keeping happens in grid-rules / the API. */const canShoot=()=>screen==='play'&&!pending&&!board.over&&
  !(room&&(room.phase!=='PLAYING'||room.you+1!==board.turn))&&
  !(local&&computer&&board.turn===2)&&Date.now()>=fourOpening;
const arcade=isCanvasGame?mountArcade($('board'),game,text=>{
  arcadeStatus=text;
  if(!board.over)renderStatus(text);
},text=>{
  arcadeStatus=text;
  renderStatus(text);
},{onShoot:position=>commitMove(position),canPlay:canShoot,board:()=>board,
  selfLabel:()=>names()[selfIndex()]||'玩家 1',opponentLabel:()=>names()[1-selfIndex()]||'电脑'}):null;
if(isCanvasGame&&!$('rules').textContent)$('rules').textContent=CATALOG[game].instruction;
const updateFourDrop=game==='four'?attachFourDrop($('board'),$('board').parentElement):null;
const updateFourFeedback=game==='four'?attachFourFeedback($('board'),$('board').parentElement):null;
let fourEffectsMatch=null;
function paintFourEffects(allowed){
  if(!updateFourDrop)return;
  const key=room?.id||generation;
  if(fourEffectsMatch!==key){updateFourDrop.cancel();fourEffectsMatch=key;}
  updateFourDrop(board,allowed,screen==='play');
  updateFourFeedback(board,screen==='play',key);
}
if(updateFourDrop)document.body.classList.add('connect-four-game');
document.body.classList.toggle('board-countdown',usesCountdown);
document.body.classList.toggle('four-game',usesOpening);
if(game==='xo'){
  $('board').classList.add('xo');
  document.body.classList.add('xo-game');
  $('rules').textContent=CATALOG.xo.instruction;
}
if(game==='gomoku')document.body.classList.add('gomoku-game');
if(isCanvasGame&&!$('rules').textContent)$('rules').textContent=CATALOG[game].instruction;
const fourCountdown=usesCountdown?document.createElement('div'):null;
let fourOpening=0,fourReadyUntil=0,fourMatchKey=null;
if(fourCountdown){fourCountdown.className='pool-countdown';fourCountdown.hidden=true;fourCountdown.innerHTML='<b>3</b><span data-ready="准备开球" data-ready-en="Get ready">准备开球</span>';$('board').parentElement.append(fourCountdown);}
function render(){applyCosmetics({mySeat:room?Number(room.you)+1:mySeat,matchKey:room?.id||generation,seatProfiles:room?.profiles,network:!!room});if(game==='gomoku')$('board').dataset.turn=board.turn;if(isPoolLike&&screen!=='play'){cancelPoolCountdown($('board'));cancelPoolOpponentShot($('board'));}const waiting=room?.phase==='WAITING',can=!pending&&!board.over&&!waiting&&(!room||room.phase==='PLAYING'&&room.you+1===board.turn)&&!(local&&computer&&board.turn===3-mySeat);$('mode').textContent=room?'在线对局':game==='puzzle'?'单机 · 电脑协作':'单机 · 电脑对战';renderStatus(isCanvasGame?(board.over?(arcadeStatus||(board.winner?names()[board.winner-1]+' 获胜！':'本局平局。')):arcadeStatus):room?.phase==='SUSPENDED'?'对局已在另一个窗口恢复':room?.phase==='CLOSED'?'房间已关闭，请重新创建。':waiting?(room.deadline>0?'正在匹配，'+Math.max(0,Math.ceil((room.deadline-room.serverNow)/1000))+'秒后电脑补位':'等待好友加入'):board.over?(board.winner?(game==='puzzle'?'拼图完成，合作愉快！':names()[board.winner-1]+' 获胜！'):(game==='chess'?'本局和棋。':'本局平局。')):names()[board.turn-1]+' 的回合'+(room?' · 超时电脑代走':''));if(isPoolLike){$('board')._openingUntil=screen!=='play'?0:room?.playStartsAt||(!room?$('board')._localOpeningUntil||0:0);$('board')._poolCountdownReadyUntil=screen==='play'&&!room?($('board')._localReadyUntil||0):0;const poolCaption=$('board').querySelector('.pool-countdown span');if(poolCaption&&!poolCaption.dataset.ready){poolCaption.dataset.ready='准备开球';poolCaption.dataset.readyEn='Get ready';}renderPool($('board'),board,can,{opponentSeat:room?2-room.you:0});}else if(isCanvasGame){arcade.applyBoard(board);}else if(game==='cards')renderCards($('board'),board,room?room.you+1:computer?1:board.turn,can);else if(game==='draw'){drawSketch($('board'),board,{you:room?room.you+1:board.turn,network:!!room,practice:computer&&!room,send:sketchAction,next:()=>{board=sketchNext(board);if(computer&&!board.over)practiceDrawing();$('board')._passed=false;render();}});}else if(game==='chess')renderChess($('board'),board,{can,selected:puzzleSelection,seat:room?room.you+1:1,key:room?.id||generation,refresh:render});else if(game==='gomoku')renderGomoku($('board'),board,{can,turn:board.turn,last});else $('board').innerHTML=board.cells.map((v,i)=>game==='puzzle'?`<button class="cell puzzle-tile ${puzzleSelection===i?'chosen':''}" style="background-position:${((v-1)%4)*100/3}% ${Math.floor((v-1)/4)*100/3}%" data-position="${i}" draggable="true" aria-label="第${i+1}个位置，图片${v}" ${!can?'disabled':''}><small>${v}</small></button>`:`<button class="cell ${i===last?'last':''}" data-value="${v}" data-position="${game==='four'?i%7:i}" aria-label="${game==='four'?'第'+(i%7+1)+'行':'第'+(Math.floor(i/(game==='xo'?3:15))+1)+'行第'+(i%(game==='xo'?3:15)+1)+'列'}${v?'已有棋子':'空位'}" ${!can?'disabled':''}></button>`).join('');/* While a snooker shot is still rolling, keep the shooter's seat highlighted.
   Computed after arcade.applyBoard() above, which starts the replay. */ const seatTurn=isSnooker&&arcade?.animating?.()?(arcade.replayTurn?.()||board.turn):board.turn;
  const serverNow=currentServerNow(),lang=tableLang();
  const myCustody=room?seatCustody(room,Number(room.you),serverNow,lang):null;
  hostedResult=!!room&&!!board.over&&!!myCustody&&!shouldRecordResult(myCustody.state);
  const seats=[0,1].map(i=>{
    const self=room?room.you===i:i===mySeat-1;
    const profile={...(room?.profiles?.[i]||(self?me?.appearance:null)||{}),
      name:names()[i]||'等待加入',bot:room?!!room.bots[i]:computer&&i===2-mySeat,
      isSelf:self,signedIn:self?((me?.account||window.__joyflockMe?.account)?true:undefined):undefined};
    const card=playerCard(document,profile,i,!waiting&&seatTurn===i+1&&!board.over);
    /* 托管状态 sits right beside the player's name: the 30s reconnect
       countdown, or "托管中 · 简单电脑" once the easy bot has taken over. */
    card.dataset.seatIndex=String(i);
    /* "已准备" sits at the top-right of every voted seat, including the
       friend's: the server publishes all votes in View.ready on every poll. */
    if(room&&screen==='waiting'&&Array.isArray(room.ready)&&room.ready[i]===true){
      card.classList.add('is-ready');card.dataset.ready='true';
      const tag=document.createElement('span');tag.className='seat-ready-tag';
      tag.textContent=lang==='en'?'READY':'已准备';
      tag.setAttribute('role','img');tag.setAttribute('aria-label',tag.textContent);
      card.append(tag);
    }
    const info=room?seatCustody(room,i,serverNow,lang):null;
    if(info&&info.label){
      const badge=custodyBadge(document,info);
      const line=card.querySelector('.seat-name');
      if(line&&badge)line.append(badge);
      card.dataset.custody=info.state;
    }
    /* Show the computer's difficulty next to its name in local vs-computer play. */
    if(profile.bot&&!room){
      const diff=document.createElement('span');diff.className='bot-level';
      diff.textContent=botLabel(botLevels.get(),document.documentElement.lang==='en'?'en':'zh');
      const line=card.querySelector('.seat-name');
      if(line)line.append(diff);
    }
    /* These games show each seat's own piece style in the player card.
       Connect Four uses its coin; Tic-tac-toe uses the X / O silhouette (or the
       owner's equipped themed mark via --personal-mark); Gomoku shows each
       seat's stone (or the shop's themed stone via --personal-stone). The
       smiley avatars are kept: only their FRAME shape is owned by
       seat-frame-square.css. */   if((game==='four'||game==='xo'||game==='gomoku')&&profile.name!=='等待加入')card.append(fourSeatPiece(document,i+1,profile.name));
    return card;
  });$('seats').replaceChildren(...seats);$('waiting-seats').replaceChildren(...seats.map(node=>node.cloneNode(true)));if(isCustodyVisible())startCustodyClock();else stopCustodyClock();paintNoScore();decoratePieces($('board'));$('room-tools').hidden=!room;$('share').hidden=room?.origin!=='FRIENDS'||room?.phase!=='WAITING';$('again').hidden=!board.over;paintReadyButton();paintFourEffects(can&&Date.now()>=fourOpening);syncPresentation();}
function apply(value){if(room&&value.id!==room.id){rematchPending=false;autoReadyFor=null;clearPlayStartDelay();}const previous=room;if(value.game!==game)throw Error('游戏类型不匹配');if(!room||value.version!==room.version)puzzleSelection=null;room=value;
  roomReceivedAt=Date.now();roomServerNow=Number(value.serverNow)||roomReceivedAt;
  /* Both votes are in: hold the waiting dialog for 200ms so the two "已准备"
     tags are actually visible before the board replaces the room card. */
  const started=previous&&previous.id===value.id&&previous.phase==='WAITING'&&value.phase==='PLAYING'&&value.origin==='FRIENDS';
  if(started&&!playStartDelay){playStartDelay=true;playStartTimer=setTimeout(()=>{playStartTimer=null;playStartDelay=false;if(room?.id===value.id&&room.phase==='PLAYING'){screen='play';render();}},200);}
  /* Re-selecting 在线对决 re-enters this exact room. The key is per game, so a
     `four` room can never be used to resume `pool`. Finished rooms are dropped. */
  if(['OVER','CLOSED'].includes(value.phase))clearRoomHint();else{writeRoomHint(value.id);syncRoomUrl(value.id);}
  syncRoomCosmetics();$('board')._serverOffset=value.serverNow-Date.now();board=value.board;local=false;document.body.dataset.noGuide='';screen=playStartDelay?'waiting':screenForRoom(value);render();autoReadyFriendsRoom(value);if(board.over&&settledRoom!==room.id){settledRoom=room.id;refreshStats();loadAllLeaderboards();delete $('stats').dataset.demo;$('stats').textContent=me?.account?'已完成的联机结果由服务器保存；本游戏独立计分。':'游客成绩仅本次显示，刷新后不保留。';}}
/* Manual ready replaced the silent auto-vote: a friends room must NOT start
   until BOTH players click "准备". The symbol stays because legacy test
   harnesses slice apply(), which still calls it. */function autoReadyFriendsRoom(value){/* no-op: the waiting dialog casts the vote */}
function schedulePoll(){clearInterval(poll);let reading=false;const token=generation;poll=setInterval(async()=>{if(reading||!room||pending||document.hidden)return;reading=true;try{const next=await request('/api/table/rooms/'+room.id);if(token===generation){apply(next);pollReactions();pollRoomTheme();$('message').textContent='';}}catch(error){if([403,404].includes(error.status)){clearInterval(poll);if(room)room.phase=error.status===403?'SUSPENDED':'CLOSED';$('message').textContent=error.status===403?'当前对局已由其他窗口接管，或席位不可用。':'房间已不可用，请重新匹配。';render();}else $('message').textContent='连接中断，正在重新连接…';}finally{reading=false;}},game==='xo'?400:1000);}
/* ---------------------------- shared room skin ----------------------------
   The backend room state has no skin field, so a tiny invisible system note
   in the room's chat stream carries the choice across devices. The latest
   note wins; remote application is silent, so two players cannot ping-pong. */const ROOM_THEME_TAG=/^\[jft:([a-z0-9]+):([a-z]+)\]$/;
let themeCursor=0,themeRoomId=null,themeBusy=false,themeSendTimer=null;
const roomThemeNote=()=>'[jft:'+themeInstanceId+':'+getTheme()+']';
async function sendRoomTheme(){
  if(game!=='four'||!room||room.phase==='CLOSED')return;
  try{await request('/api/table/rooms/'+room.id+'/chat',{commandId:crypto.randomUUID(),text:roomThemeNote()});}
  catch(error){if(error.status===429){clearTimeout(themeSendTimer);themeSendTimer=setTimeout(sendRoomTheme,1400);}}
}
function queueRoomTheme(){if(game!=='four'||!room)return;clearTimeout(themeSendTimer);themeSendTimer=setTimeout(sendRoomTheme,300);}
window.addEventListener('joyflock:themechange',event=>{if(game==='four'&&!event.detail?.silent)queueRoomTheme();});
async function pollRoomTheme(){
  if(game!=='four'||!room||themeBusy)return;
  if(themeRoomId!==room.id){themeRoomId=room.id;themeCursor=0;}
  themeBusy=true;const id=room.id;
  try{
    const events=await request('/api/table/rooms/'+id+'/chat?after='+themeCursor);
    if(room?.id!==id)return;
    let latest=null;
    for(const event of Array.isArray(events)?events:[]){
      if(Number.isSafeInteger(event.id)&&event.id>themeCursor)themeCursor=event.id;
      const match=ROOM_THEME_TAG.exec(String(event.text||''));
      if(match&&match[1]!==themeInstanceId)latest=match[2];
    }
    if(latest&&latest!==getTheme())setTheme(latest,{silent:true});
  }catch{}finally{themeBusy=false;}
}
async function enter(mode,code){if(pending)return;pending=true;const token=++generation;clearInterval(poll);try{await init();
  /* Re-selecting 在线对决 reconnects to this game's existing room instead of
     creating a second match. The hint is stored under a per-game key, and the
     server still verifies the game/identity before returning anything. */
  let value=null;
  if(!code){const hint=readRoomHint();if(hint){try{const live=await request('/api/table/rooms/'+hint.roomId);if(live&&live.game===game&&['WAITING','PLAYING'].includes(live.phase))value=live;else clearRoomHint();}catch{clearRoomHint();}}}
  if(!value)value=code?await request('/api/table/rooms/'+code+'/join',{}):await request('/api/table/rooms',{game,mode});
  if(token!==generation)return;apply(value);syncRoomUrl(room.id);schedulePoll();reportActivity('resume');if(!code)queueRoomTheme();pollRoomTheme();$('message').textContent='';}catch(e){$('message').textContent=e.status===409?'房间已开始、已满，或同一账号已在房间中。':'未能进入，请重试。';}finally{pending=false;render();}}
function localStart(withBot){if(arcade){arcade.stop();arcadeStarted=false;arcadeStatus='';if(isCanvasGame)arcade.reset();}screen='play';generation++;clearInterval(poll);cosmeticSync.stop();room=null;clearPlayStartDelay();stopCustodyClock();clearRoomHint();roomServerNow=0;hostedResult=false;local=true;computer=withBot;document.body.dataset.noGuide=isBilliards&&withBot&&noGuideOn()?'1':'';board=start(game);if(isPoolLike){cancelPoolOpponentShot($('board'));cancelPoolCountdown($('board'));$('board')._returns=[];$('board')._painted=null;$('board')._scratchVisible=false;$('board')._animationToken=($('board')._animationToken||0)+1;$('board')._animating=false;$('board')._lastMove=0;$('board')._queued=null;$('board')._snapshot=null;$('board')._snapshotTurn=null;$('board')._snapshotMove=null;$('board')._striking=false;$('board')._localOpeningUntil=Date.now()+COUNTDOWN_TOTAL;$('board')._localReadyUntil=$('board')._localOpeningUntil-COUNTDOWN_WINDOW;$('board')._serverOffset=0;$('board')._locked=false;$('board')._pullStart=null;$('board')._power=0;$('board')._spin=0;}if(game==='draw'){$('board')._passed=false;computer&&practiceDrawing();}puzzleSelection=null;last=-1,rematchPending=false;pending=false;const url=new URL(location.href);url.searchParams.delete('room');history.replaceState(null,'',url);/* No opening toast: the "local games are not uploaded" note has been removed.
   #message stays reserved for real errors and room status updates. */$('message').textContent='';render();if(withBot&&!usesCountdown)openLocalBotTurn();}
$('board').addEventListener('click',async event=>{const button=event.target.closest('[data-position]');if(game==='draw'||!button||Date.now()<fourOpening||pending||board.over||isPoolLike&&$('board')._animating||game==='four'&&$('board')._fourDropAnimating)return;let position=Number(button.dataset.position);if(game==='chess'){const own=board.cells[position]&&(board.cells[position]<=6?1:2)===board.turn;if(puzzleSelection===null||own){if(!own)return;puzzleSelection=position;render();return;}let code=puzzleSelection*64+position;const pawn=board.cells[puzzleSelection]===1||board.cells[puzzleSelection]===7;if(pawn&&(Math.floor(position/8)===0||Math.floor(position/8)===7))code+=4096*Number($('promotion').value);if(!legal(board).includes(code)){showChessNotice(document.documentElement.lang==='en'?'Illegal move — choose another square.':'这步不合法，请选择其他目标。');return;}position=code;puzzleSelection=null;}if(game==='puzzle'){if(puzzleSelection===null){puzzleSelection=position;render();return;}if(puzzleSelection===position){puzzleSelection=null;render();return;}position=puzzleSelection*16+position;puzzleSelection=null;}commitMove(position);});
/* Shared commit path for grid clicks and Bubble Duel canvas shots. Local play
   advances the board with grid-rules; hosted play sends the same `position`
   (an aim code for bubbles) to the room API and applies the authoritative view. */async function commitMove(position){
  if(pending||board.over)return;
  const token=generation;pending=true;render();
  try{
    if(room){const next=await request('/api/table/rooms/'+room.id+'/move',{position,version:room.version,commandId:crypto.randomUUID()});if(token!==generation)return;apply(next);}
    else{
      board=move(board,board.turn,position);render();
      // Snooker: the opponent does not take the table until the replay, the
      // cue stroke and every pocket animation have actually finished.
      if(isSnooker&&arcade){await arcade.whenSettled();if(token!==generation)return;}
      await runLocalBot(token);
    }
  }catch(e){$('message').textContent=isBubbles?'发射失败，或状态已变化，请重试。':isSnooker?'击球失败，或状态已变化，请重试。':'此处不能落子，或状态已变化，请重试。';}
  finally{if(token===generation){pending=false;render();/* applyBoard() de-dupes the
    unchanged board, so re-arm the canvas shoot control explicitly here. */   if(isCanvasGame)arcade?.refresh?.();}}
}
/* The bot's local turn loop, shared by a human move (commitMove) and the
   "bot opens" case when the human picked the second seat (pink). */
async function runLocalBot(token){
  while(computer&&!board.over&&board.turn===3-mySeat){
    if(game==='four')await $('board')._fourDropDone;
    await new Promise(r=>setTimeout(r,isSnooker?320:isBubbles?900:isPoolLike?350:450));
    while(isPoolLike&&$('board')._animating&&token===generation)await new Promise(r=>setTimeout(r,100));
    if(token!==generation)return;
    const command=bot(board,botLevels.get());
    if(isPoolLike&&!await animatePoolOpponentShot($('board'),command,()=>token===generation&&screen==='play'&&!room))return;
    if(token!==generation)return;
    board=move(board,board.turn,command);render();
    if(isSnooker&&arcade){await arcade.whenSettled();if(token!==generation)return;}
  }
}
/* The second seat (pink) opens first in Connect Four, so after the countdown
   the computer has to make the opening move before the human can click. */
async function openLocalBotTurn(){
  if(!computer||room||board.over||pending||board.turn!==3-mySeat)return;
  const token=generation;pending=true;render();
  await runLocalBot(token);
  if(token===generation){pending=false;render();if(isCanvasGame)arcade?.refresh?.();}
}
/* Join-by-code was retired. A shared ?room= link enters the room
   automatically in the init() tail below, so no join form needs the
   pool audio unlock either. */if(isPoolLike||usesCountdown){for(const id of ['computer','quick','friends','again'])$(id)?.addEventListener('click',unlockPoolAudio,{capture:true});}
if(isBubbles){for(const id of ['computer','quick','friends','again'])$(id)?.addEventListener('click',unlockBubblesAudio,{capture:true});}
/* --------------------------------------------------------------------------
   Single-player setup dialog: piece colour (Connect Four only, shown as the
   equipped shop art) + computer difficulty (four levels with their point
   bonus). The intro screen no longer carries a separate difficulty control.
   -------------------------------------------------------------------------- */
let localGameDialog=null,localDialogSeat=1;
function equippedSeatIds(){
  let first='four-piece-default',second='four-pink-piece-default',label1='蓝色',label2='粉色',en1='Blue',en2='Pink';
  if(game==='gomoku'){first='gomoku-piece-default';second='gomoku-white-piece-default';label1='黑色';label2='白色';en1='Black';en2='White';}
  else if(game==='xo'){first='xo-piece-default';second='xo-o-piece-default';label1='X';label2='O';en1='X';en2='O';}
  try{
    const e=profiles(game)?.equip||{};
    if(game==='four'){first=e.fourPiece||first;second=e.fourPiecePink||second;}
    else if(game==='gomoku'){first=e.gomokuPiece||first;second=e.gomokuPieceWhite||second;}
    else if(game==='xo'){first=e.xoPiece||first;second=e.xoPieceO||second;}
  }catch(err){}
  return {first,second,label1,label2,en1,en2};
}
function openLocalGameDialog(){
  if(localGameDialog?.open)return;
  localDialogSeat=1;  /* Always default to the first seat (blue / black / X). */
  if(!localGameDialog){
    localGameDialog=document.createElement('dialog');
    localGameDialog.className='local-game-dialog';
    const style=document.createElement('style');
    style.textContent='.local-game-dialog{position:relative;color-scheme:dark;width:360px;max-width:calc(100vw - 24px);max-height:calc(100dvh - 32px);overflow-y:auto;margin:auto;transform:translateY(-8vh);padding:16px 18px 18px;border-radius:12px;border:1px solid #2c3a5e;background:#141b30;color:#eef2ff;box-shadow:0 18px 50px #0009;scrollbar-width:thin;scrollbar-color:#3b4d7a transparent}@media(max-height:520px){.local-game-dialog{transform:translateY(-4vh)}}.local-game-dialog::backdrop{background:#050a18b8;backdrop-filter:blur(4px)}.lg-close{position:absolute;top:12px;right:12px;display:grid;place-items:center;width:24px;height:24px;min-width:24px;min-height:24px;padding:0;margin:0;border:0;border-radius:50%;background:transparent;color:#9aa9cc;font-size:19px;line-height:1;box-shadow:none;cursor:pointer}.lg-close:hover{background:#26324f;color:#fff}.local-game-dialog h2{margin:0 0 4px;padding-right:28px;font-size:17px;line-height:1.35;letter-spacing:0;font-weight:700;color:#f2f5ff}.lg-colors{display:flex;gap:10px;margin:16px 0 14px}.lg-color{flex:1;position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 8px 12px;border-radius:9px;border:1px solid #33456e;background:#1b2540;color:#e7eeff;cursor:pointer;transition:background .16s ease,border-color .16s ease}.lg-color:hover{background:#27375d;border-color:#7f97ff}.lg-color img{width:72px;height:72px;border-radius:50%;object-fit:contain}.lg-color span{font-size:12px;font-weight:700}.lg-check{position:absolute;top:-7px;right:-7px;display:none;width:22px;height:22px;border-radius:50%;background:#7b93ff;color:#0b1020;font-style:normal;font-size:13px;font-weight:900;line-height:22px;text-align:center;box-shadow:0 1px 4px #000a}.lg-color[aria-pressed="true"]{border-color:#8fa6ff;background:linear-gradient(135deg,#3d5fc4,#6d4bd0)}.lg-color[aria-pressed="true"] .lg-check{display:block}.lg-diff{display:flex;flex-direction:column;gap:7px;margin:0 0 10px;font-size:11px;font-weight:700;color:#94a3c6}.lg-diff select{width:100%;height:36px;padding:0 10px;border-radius:8px;border:1px solid #3d4f7d;background:#1c2a4b;color:#dbe4ff;font-size:12px}.lg-note{margin:0 0 14px;font-size:10.5px;line-height:1.6;color:#94a3c6}.lg-actions{display:grid;grid-template-columns:minmax(0,1fr);gap:8px;margin:0}.local-game-dialog .lg-actions button{width:100%;min-height:34px;padding:7px 8px;border-radius:8px;border:1px solid #3d4f7d;background:#1c2a4b;color:#dbe4ff;box-shadow:none;font-size:12px;line-height:1.2}.local-game-dialog .lg-actions button:hover:not(:disabled){background:#27375d;border-color:#6f8bff}.local-game-dialog .lg-actions button:disabled{cursor:default;opacity:.6;box-shadow:none}';
    document.head.append(style);
    document.body.append(localGameDialog);
  }
  const zh=document.documentElement.lang!=='en';
  const ids=equippedSeatIds();
  const levels=[['easy','简单','Easy',0],['normal','一般','Normal',10],['pro','专业','Pro',20],['hell','地狱','Hell',50]];
  const current=botLevels.get();
  const colors=(game==='four'||game==='gomoku'||game==='xo')
    ?`<div class="lg-colors" role="group" aria-label="${zh?'选择棋色':'Choose your colour'}"><button type="button" class="lg-color" data-lg-seat="1" aria-pressed="${localDialogSeat===1}"><i class="lg-check" aria-hidden="true">✓</i><img src="/assets/shop/game-styles/${ids.first}.svg" alt=""><span>${zh?ids.label1:ids.en1}</span></button><button type="button" class="lg-color" data-lg-seat="2" aria-pressed="${localDialogSeat===2}"><i class="lg-check" aria-hidden="true">✓</i><img src="/assets/shop/game-styles/${ids.second}.svg" alt=""><span>${zh?ids.label2:ids.en2}</span></button></div>`
    :'';
  localGameDialog.innerHTML=`<button type="button" class="lg-close" data-lg-close aria-label="${zh?'关闭':'Close'}">×</button>
<h2>${zh?'单机 · 电脑对战':'Single player vs computer'}</h2>
${colors}
<label class="lg-diff"><span>${zh?'机器人难度':'Computer difficulty'}</span>
<select data-lg-level>${levels.map(l=>`<option value="${l[0]}"${l[0]===current?' selected':''}>${zh?l[1]:l[2]}（+${l[3]}%）</option>`).join('')}</select></label>
${isBilliards?`<label class="lg-diff" style="flex-direction:row;align-items:center;gap:9px;cursor:pointer"><input type="checkbox" data-lg-noguide style="width:16px;height:16px;accent-color:#7b93ff" ${noGuideOn()?'checked':''}><span>${zh?'不显示引导线（+20% Joy Coins）':'Hide aim guide (+20% Joy Coins)'}</span></label>`:''}
<div class="lg-actions"><button type="button" data-lg-start>${zh?'开始游戏':'Start'}</button></div>`;
  localGameDialog.querySelectorAll('[data-lg-seat]').forEach(btn=>{
    btn.onclick=()=>{localDialogSeat=Number(btn.dataset.lgSeat);localGameDialog.querySelectorAll('[data-lg-seat]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));};
  });
  localGameDialog.querySelector('[data-lg-close]').onclick=()=>localGameDialog.close();
  localGameDialog.querySelector('[data-lg-start]').onclick=()=>{
    if(isPoolLike||usesCountdown)unlockPoolAudio();
    botLevels.set(localGameDialog.querySelector('[data-lg-level]').value);
    const ng=localGameDialog.querySelector('[data-lg-noguide]');
    if(ng)setNoGuide(ng.checked);
    mySeat=(game==='four'||game==='gomoku'||game==='xo')?localDialogSeat:1;
    localGameDialog.close();
    localStart(true);
  };
  localGameDialog.addEventListener('click',e=>{if(e.target===localGameDialog)localGameDialog.close();});
  localGameDialog.showModal();
}
$('computer').onclick=()=>openLocalGameDialog();$('quick').onclick=()=>game==='four'?openThemePicker({onConfirm:()=>enter('QUICK'),confirmText:'开始匹配'}):enter('QUICK');$('friends').onclick=()=>game==='four'?openThemePicker({onConfirm:()=>enter('FRIENDS'),confirmText:'创建房间'}):enter('FRIENDS');
$('ready-room').onclick=async()=>{if(!room||readyBusy||!roomIsFull(room)||myReady(room))return;readyBusy=true;paintReadyButton();try{const next=await request('/api/table/rooms/'+room.id+'/ready',{});apply(next);}catch{$('message').textContent=tableLang()==='en'?'Could not ready up. Please retry.':'准备失败，请再试一次。';}finally{readyBusy=false;paintReadyButton();}};
$('share').textContent='邀请好友';$('share').onclick=async()=>{if(!room)return;const url=new URL(location.href);url.searchParams.set('room',String(room.id));url.searchParams.set('theme',getTheme());const link=url.href;try{await navigator.clipboard.writeText(link);$('message').textContent='邀请链接已复制，发给朋友即可。';}catch{const helper=document.createElement('textarea');helper.value=link;helper.setAttribute('readonly','');helper.style.cssText='position:fixed;left:-9999px;top:0;opacity:0';($('waiting')||document.body).append(helper);helper.select();let copied=false;try{copied=document.execCommand('copy');}catch{}helper.remove();$('message').textContent=copied?'邀请链接已复制，发给朋友即可。':'复制失败，请再点一次邀请好友。';}};
$('leave').onclick=async()=>{if(pending)return;if(['SUSPENDED','CLOSED'].includes(room?.phase)){localStart(false);screen='home';$('message').textContent='';render();return;}pending=true;try{await request('/api/table/rooms/'+room.id+'/leave',{});localStart(false);screen='home';$('message').textContent='';render();}catch{$('message').textContent='退出未成功，请重试。';}finally{pending=false;render();}};
/* "再来一次" re-runs the ORIGINAL mode's entry flow, it is NOT an in-place
   board reset:
     · computer -> a brand-new local match (no middle page).
     · QUICK    -> back to the intro (中间页), then re-queue for a new random
                   opponent through enter('QUICK').
     · FRIENDS  -> back to the intro, then /rematch joins the shared WAITING
                   successor room where both players press 准备 again and wait
                   for the friend, exactly like the first game.
   Both online branches pass through the SAME middle-page reset so no finished
   board, stale room hint, old URL or result dialog leaks into the next match. */
async function restartMatch(){
  if(!room){localStart(computer);return;}
  if(pending)return;
  const originId=room.id,quick=room.origin==='QUICK';
  /* 1. 返回中间页：丢掉终局棋盘/房间/重连提示，结算弹窗随之关闭。 */
  localStart(false);screen='home';$('message').textContent='';render();
  if(quick){/* 2a. 重新匹配在线玩家 */await enter('QUICK');return;}
  /* 2b. 重新加入好友房：后端 successor_id 保证双方落到同一个 WAITING 房。 */
  const token=++generation;pending=true;
  try{
    rematchPending=true;
    const next=await request('/api/table/rooms/'+originId+'/rematch',{});
    if(token!==generation)return;
    apply(next);syncRoomUrl(room.id);schedulePoll();reportActivity('resume');
    if(game==='four'){queueRoomTheme();pollRoomTheme();}
    $('message').textContent='';
  }catch(error){if(token===generation)$('message').textContent=error.status===409?'房间已不可用，请重新创建。':'重新开始失败，请重试。';}
  finally{if(token===generation){pending=false;render();}}
}
$('again').onclick=restartMatch;
$('account-open').onclick=()=>{if(window.parent!==window){window.parent.postMessage({type:'joyflock:auth-request',mode:'login'},location.origin);return;}const old=$('account-summary');if(old)old.remove();$('auth-form').hidden=!!me?.account;if(me?.account){const section=document.createElement('section');section.id='account-summary';section.innerHTML='<h2></h2><p></p><button type="button" id="signout">退出登录</button><button type="button" id="summary-close">关闭</button>';section.querySelector('h2').textContent=me.account.displayName;section.querySelector('p').textContent=(me.appearance?.annualMember?'YEAR VIP':me.appearance?.member?'VIP':'普通账号')+' · '+$('stats').textContent;$('auth').append(section);$('signout').onclick=async()=>{await request('/api/auth/logout',{});await init();$('auth').close();};$('summary-close').onclick=()=>$('auth').close();}$('auth').showModal();};$('auth-close').onclick=()=>$('auth').close();$('auth-form').onsubmit=async event=>{event.preventDefault();const form=event.target,values=Object.fromEntries(new FormData(form)),action=event.submitter.value;if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)){$('auth-error').textContent='请输入完整的邮箱地址。';return;}if(action==='register'&&values.password!==values.confirmation){$('auth-error').textContent='两次输入的密码不一致。';return;}if(action==='register'&&!values.displayName.trim()){$('auth-error').textContent='注册请填写昵称。';return;}for(const b of form.querySelectorAll('button'))b.disabled=true;try{await init();await request('/api/auth/'+action,values);await init();form.reset();$('auth').close();}catch(e){$('auth-error').textContent=e.status===409?'邮箱已被使用。':e.status===401?'邮箱或密码不正确。':'未成功，请检查邮箱和密码（至少8位）后重试。';}finally{for(const b of form.querySelectorAll('button'))b.disabled=false;}};
const cosmeticSync=createRoomCosmeticSync({request,onSeat:(id,seat,profile)=>{if(room?.id!==id)return;room.profiles=room.profiles.slice();room.profiles[seat]=profile;render();}});
function syncRoomCosmetics(){cosmeticSync.sync(room,game,localSelection(game,room?.profiles?.[room.you]));}
window.addEventListener('joyflock:cosmetics-changed',()=>{render();syncRoomCosmetics();});
render();init().then(()=>{if(params.get('room'))enter('FRIENDS',params.get('room'));}).catch(()=>{$('message').textContent='联机服务暂不可用，仍可单机游玩。';});

import {bindPortalControls} from '../portal-controls.js?v=20261110-fullzoom1&release=20261115-localefix1&native=20261115-native1';
import {bindTableLocale,tableLabel} from './table-locale.js?v=20261110-glove2&d=20261115-chatfs1&r=20261115-winrate1&release=20261115-firstpaint1&nine=20261120-nineball1&score=20261120-score1';
const applyTableLocale=bindTableLocale();
arcade?.refresh?.();
bindPortalControls({onLocale:locale=>{applyTableLocale(locale);paintMemberFacts();if($('stats').dataset.demo==='1')$('stats').textContent=globalThis.__joyflockDemoStats?globalThis.__joyflockDemoStats(locale):'';else refreshStats();arcade?.refresh?.();render();}});
// The shell owns the account dialogs now. When it signs in/out, refresh the
// embedded game's own session view so the profile stats stay in sync. The two
// hosts can differ (joyflock.com -> flight.joyflock.com), so validate the
// parent origin explicitly instead of requiring event.origin===location.origin.
function acceptAccountName(value){
 const next=normalizeDisplayName(value);
 if(next===sharedAccountName)return;
 sharedAccountName=next;
 render();
}
window.addEventListener('joyflock:account-changed',event=>acceptAccountName(event.detail?.name));
window.addEventListener('message',event=>{
 if(event.source!==window.parent||!trustedParentOrigin(event.origin))return;
 const data=event.data;
 if(data?.type==='joyflock:account-name'){acceptAccountName(data.name);return;}
 if(data?.type==='joyflock:auth-changed')init().catch(()=>{});
});
$('home-link').onclick=async event=>{event.preventDefault();if(arcade&&!room){arcade.stop();generation++;screen='home';render();return;}if(room&&['WAITING','PLAYING'].includes(room.phase)){if(!confirm('返回游戏首页？当前席位将由电脑托管。'))return;try{await request('/api/table/rooms/'+room.id+'/leave',{});}catch{$('message').textContent='退出未成功，请重试。';return;}}localStart(false);screen='home';$('message').textContent='';render();};
let draggedTile=null;$('board').addEventListener('dragstart',event=>{const tile=event.target.closest('[data-position]');if(game!=='puzzle'||!tile||tile.disabled){event.preventDefault();return;}draggedTile=Number(tile.dataset.position);});$('board').addEventListener('dragover',event=>{if(game==='puzzle')event.preventDefault();});$('board').addEventListener('drop',event=>{event.preventDefault();const tile=event.target.closest('[data-position]');if(tile&&draggedTile!==null&&!tile.disabled){puzzleSelection=draggedTile;tile.click();}draggedTile=null;});

/* No manual ready button: autoReadyFriendsRoom() votes once both seats are real. */async function sketchAction(action,text,points){if(pending||board.over)return;pending=true;try{if(room)apply(await request('/api/table/rooms/'+room.id+'/sketch',{commandId:crypto.randomUUID(),version:room.version,action,text,points}));else{if(action==='stroke')board={...board,history:[...board.history,points.join(',')]};if(action==='clear')board={...board,history:[]};if(action==='guess'&&text.trim()===board.fen){board=sketchNext(board,true);$('board')._passed=false;if(computer&&!board.over)practiceDrawing();}}}catch{$('message').textContent='猜题请间隔1秒，每题最多6次；或当前状态已变化，请重试。';}finally{pending=false;render();}}
function practiceDrawing(){const n=Math.floor(Math.random()*3);board.fen=['三角形','正方形','圆形'][n];const points=n===0?[500,180,220,780,780,780,500,180]:n===1?[250,250,750,250,750,750,250,750,250,250]:Array.from({length:49},(_,i)=>[Math.round(500+280*Math.cos(i*Math.PI/24)),Math.round(500+280*Math.sin(i*Math.PI/24))]).flat();board.history=[points.join(',')];}
if(game==='draw'){$('board').classList.add('sketch');$('rules').textContent='两人轮流画画与猜词，共6题。猜对者得2题分，画画者得1题分；每题最多猜6次，猜题间隔1秒；最终按题分排名结算。单机电脑出图为几何图形练习，不模拟真人猜词。';$('computer').textContent='单机 · 电脑出图';}

if(game==='draw')render();

if(game==='cards'){$('board').classList.add('cards');$('rules').textContent='颜色数字接龙：两人各7张，轮流打出与桌面同色或同数字的牌，也可摸一张并结束回合。先出完手牌获胜。没有功能牌、不下注；牌库耗尽时重洗弃牌。';render();}

if(isPoolLike){$('board').classList.add('pool');$('rules').textContent=game==='nineball'?'休闲九球：移动鼠标瞄准，按住左键锁定方向，向后拖动蓄力，松开击球。左上角白球可选择击球点。每杆必须先碰台面上号码最小的球，落袋任意球都可继续击球；合法打进9号球立即获胜，犯规打进9号球判负。未先碰最小号球或白球落袋均为犯规，对手获得额外一杆，白球落袋自动复位。最多200杆。此模式未实现推杆、指定袋与三连犯规等赛事规则。':'休闲台球：移动鼠标瞄准，按住左键锁定方向，向后拖动蓄力，松开击球。左上角白球可选择击球点。首次有效进球确定全色（1–7）或花色（9–15），打进本组球可继续击球；分组后先碰对方球、未先碰本组目标球，或白球落袋，均为犯规。犯规后对手获得额外一杆，白球落袋自动复位。清空本组后下一杆打进8号获胜，提前打进8号或同时白球落袋判负。最多200杆后按落袋数判定。此模式不是完整竞技八球规则。';render();}

const metadata=CATALOG[game];
// The synchronous intro-boot script already wrote the final copy and an inline
// cover into the first frame. Do not overwrite them (especially the data-URI
// cover, which would trigger a second 160KB image request and a visible swap).
if(!document.documentElement.hasAttribute('data-intro-ready')){
  $('hero-title').textContent=metadata.name;$('hero-kicker').textContent=metadata.en;$('hero-description').textContent=metadata.description;$('hero-image').src=coverFor(game);$('hero-image').alt=metadata.name+' 游戏插画';$('turn-instruction').textContent=metadata.instruction;
}
function syncPresentation(){document.body.dataset.screen=screen;$('intro').hidden=screen==='play';$('arena').hidden=screen!=='play';const quickWaiting=screen==='waiting'&&room?.origin==='QUICK';if(quickWaiting){showMatchBox({room,onCancel:()=>$('leave').click()});updateMatchBox(room);if($('waiting').open)$('waiting').close();}else{hideMatchBox();if(screen==='waiting'&&!$('waiting').open)$('waiting').showModal();}if((screen!=='waiting'||quickWaiting)&&$('waiting').open)$('waiting').close();$('waiting-status').textContent=playStartDelay?(tableLang()==='en'?'Both players ready · starting…':'双方已准备，即将开始…'):$('status').textContent;$('waiting-title').textContent=room?.origin==='QUICK'?'正在寻找你的游戏伙伴':'好友到齐，准备开玩';$('reaction-note').textContent=room?'表情会发送给房间内的其他玩家':'表情在本房间实时同步。';/* The server sends turnClockUntil=0 while the current turn is hosted (or a
   native bot): NO visible countdown, the easy bot plays at its own pace.
   Older backends omit the field, so derive the same decision from custody. */
const turnIndex=Number(board.turn)-1;
const clockUntil=room?.phase==='PLAYING'
 ? (Number.isFinite(room.turnClockUntil)?room.turnClockUntil
   :turnClockVisible(Array.isArray(room.custody)?room.custody[turnIndex]:null)?room.deadline:0)
 : 0;
$('turn-clock').textContent=clockUntil>room?.serverNow?Math.max(0,Math.ceil((clockUntil-room.serverNow)/1000))+'s':'';const options={room,me,board,local,computer,names:names(),selfName:ownAccountName(),request,generation,mySeat,
  scores:isBubbles&&board?.cells?bubblesScore(board.cells):null};if(isPoolLike)updatePoolShell(options);else{if(game!=='snooker')$('arena').classList.add('table-chat-layout');updateTableChat(options);if(game==='snooker')mountSnookerShell();}
if(usesCountdown){
  if(screen!=='play'){
    cancelPoolCountdown($('board'));fourMatchKey=null;fourOpening=0;fourReadyUntil=0;
  }else{
    const key=room?.id||generation;
    if(key!==fourMatchKey){fourMatchKey=key;fourOpening=!board.moves&&!board.over?Date.now()+COUNTDOWN_TOTAL:0;fourReadyUntil=fourOpening?fourOpening-COUNTDOWN_WINDOW:0;}
    updatePoolCountdown($('board'),fourCountdown,fourOpening,0,()=>{
      const phase=fourCountdown.dataset.phase;
      if(updateFourDrop&&(phase==='GO'||!phase))updateFourDrop(board,!pending&&!board.over&&(!room||room.you+1===board.turn)&&!(local&&computer&&board.turn===3-mySeat),true);
      if(phase==='GO')openLocalBotTurn();
      if(phase)fourCountdown.querySelector('span').textContent=tableLabel(phase==='GO'?'开始！':'准备开始');
      if(arcade&&!arcadeStarted&&(phase==='GO'||!phase)){
        arcadeStarted=true;
        arcade.start(computer);
      }
    },fourReadyUntil);
  }
}
/* One finished game = exactly one award. The key mirrors the result sound /
   dialog key, so replays, rerenders and the delayed confetti cannot double
   count. Every table game is a two-seat match: 200 for the win, 100 for a
   loss or a draw. Anonymous visitors still see the live figures, but the
   points module never persists them. *//* ONLINE CUSTODY: a game that ended while this seat was hosted writes no local
   points either. The server has already skipped its table_results row. */
if(board.over&&screen==='play'&&!hostedResult)globalThis.__joyflockGamePoints?.record({
 game:game,key:[room?.id||('local-'+generation),board.moves,board.winner].join(':'),
 players:2,winner:Number(board.winner)||0,seat:room?Number(room.you):mySeat-1,over:true,bonusPct:!room&&computer?(BOT_BONUS[botLevels.get()]||0)+(isBilliards&&noGuideOn()?20:0):0});
// Every game now ends in the very same result dialog. Pool and the opening
// games reach it through their own shell; the other seven open it here. The
// dialog owns the confetti reveal, while the sound cue is fired once per
// result key here (the sfx module de-dupes the dialog's own request).
if(!usesOpening&&game!=='pool'){
  /* Pool never uses this immediate cue: its shared result dialog waits for the
     shot replay / pocket animation to settle, then plays the jingle once.
     Snooker has a rolling replay too, so the authoritative board can already
     be `over` while the last ball is still travelling toward the pocket. Skip
     the render-time sound for canvas-replay games and let updateGridResult()
     own the same delayed cue; every other game keeps the instant cue. */ if(!isCanvasGame)playResultSound(options);
  updateGridResult(options);
}
if(usesOpening)updateFourResult(options);}
$('back-home').onclick=()=>$('home-link').click();$('leave-play').onclick=()=>room?$('leave').click():$('home-link').click();$('cancel-waiting').onclick=()=>$('leave').click();$('waiting').addEventListener('cancel',event=>{event.preventDefault();$('leave').click();});
/* Period tabs switch on hover as well as on click. Only #leaderboard is
   re-rendered (the tabs themselves never move), so pointerenter stays stable.
   selectPeriod() now reads the preloaded boardCache, so neither hovering nor
   clicking issues a request; the same-period guard just avoids a repaint.
   Click / keyboard still work, and touch / pen devices that cannot hover keep
   tap-to-switch. */const periodTabs=[...document.querySelectorAll('[data-period]')];
function selectPeriod(tab){
  if(!tab||period===tab.dataset.period)return;
  period=tab.dataset.period;
  for(const t of periodTabs)t.setAttribute('aria-pressed',String(t===tab));
  refreshLeaderboard();
}
const canHover=matchMedia('(hover:hover) and (pointer:fine)').matches;
for(const tab of periodTabs){
  tab.onclick=()=>selectPeriod(tab);
  if(canHover)tab.addEventListener('pointerenter',event=>{
    if(event.pointerType==='mouse')selectPeriod(tab);
  });
}
function showReaction(event){if(document.querySelector('.pool-chat-panel')){appendPoolChatReaction(event);return;}const bubble=document.createElement('div');bubble.className='reaction-bubble';const emoji=document.createElement('span'),name=document.createElement('small');emoji.textContent=event.emoji;name.textContent=event.name;bubble.append(emoji,name);$('reaction-stage').append(bubble);const line=document.createElement('p');line.textContent=event.name+' '+event.emoji;$('reaction-feed').prepend(line);while($('reaction-feed').children.length>3)$('reaction-feed').lastElementChild.remove();setTimeout(()=>bubble.remove(),3200);}
function acceptReactions(events){for(const event of events){if(event.id<=reactionCursor)continue;reactionCursor=event.id;showReaction(event);}}
async function pollReactions(){if(!room||reactionBusy)return;if(reactionRoom!==room.id){reactionRoom=room.id;reactionCursor=0;$('reaction-feed').replaceChildren();}reactionBusy=true;const roomId=room.id;try{const events=await request('/api/table/rooms/'+roomId+'/reactions?after='+reactionCursor);if(room?.id===roomId)acceptReactions(events);}catch{}finally{reactionBusy=false;}}
for(const button of document.querySelectorAll('[data-emoji]'))button.onclick=async()=>{if(button.disabled)return;button.disabled=true;try{if(document.querySelector('.pool-chat-panel')){await sendPoolChatEmoji(button.dataset.emoji);return;}if(room){if(reactionRoom!==room.id){reactionRoom=room.id;reactionCursor=0;}const roomId=room.id;const events=await request('/api/table/rooms/'+roomId+'/reactions',{commandId:crypto.randomUUID(),emoji:button.dataset.emoji});if(room?.id===roomId)acceptReactions(events);}else showReaction({name:ownAccountName()||tableLabel('你'),emoji:button.dataset.emoji});}catch{$('reaction-note').textContent='表情发送太快或连接中断，请稍后重试。';}finally{setTimeout(()=>button.disabled=false,1500);}};
render();
