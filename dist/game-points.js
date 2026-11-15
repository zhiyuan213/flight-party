/* JoyFlock Joy Coins — ONE balance and ONE scoring table for the whole site.

   Two-player games (all nine table games): winner 200, loser 100; a draw is
   worth 100 for both. A computer-difficulty bonus is added ONLY to a win;
   a loss or a draw keeps the base consolation award. Four-player Flight Party:
   1st 200, 2nd 100, 3rd and 4th 50 (a three-seat flight uses 200 / 100 / 50).

   The finished-game award is the ONLY source of the dynamic figures in the
   leaderboard, the result dialog and the "会员与计分" block. There is NO
   second points total any more: the Joy Coin wallet in site-points.js owns
   the single balance, and record() credits the award straight into it. Shop
   purchases debit the very same balance; both directions are mirrored here
   through the wallet's existing events, so the header pill, the result
   dialog, the leaderboard and the shop always show one number.
   Signed-in visitors still get their game record persisted separately;
   anonymous visitors see the live figures but no game record is saved.

   Pages call window.__joyflockGamePoints.record({...}) once a result becomes
   final; the module de-duplicates by the caller's result key.

   A local-calendar-day cap of 5000 Joy Coins is applied HERE, the single
   scorer: record() credits only the allowance still left, and snapshot().daily
   carries {date, earned, cap, remaining, reached, pct} to the result dialog.
   The cap limits how much can be EARNED per day, never the wallet balance. */
(function(){
 'use strict';
 var VERSION='20261112-gamelanes1';
 var KEY='joyflock.gamepoints.v1';
 var WALLET_KEY='joyflock.shop.v1';
 var TABLE={2:[200,100],3:[200,100,50],4:[200,100,50,50]};
 /* DAILY CAP: at most 5000 Joy Coins can be EARNED per local calendar day.
    The counter lives in the persisted game record and rolls over at local
    midnight. Only the credited part joins the shared wallet balance; the
    result dialog still learns the original award through last.full / capped. */
 var DAILY_CAP=5000;
 var seen=Object.create(null);
 var state={games:0,wins:0,points:0,byGame:{},last:null,daily:null};
 var signedIn=false;

 function fmt(n){return String(Math.max(0,Number(n)||0)).replace(/\B(?=(\d{3})+(?!\d))/g,',');}
 function en(){return (document.documentElement.getAttribute('data-locale')||document.documentElement.lang||'zh')==='en';}
 function table(n){return TABLE[n]||TABLE[2];}
 /* Local (not UTC) calendar day, so the allowance resets at the visitor's own
    midnight. Pure apart from reading the clock; safe to call from snapshot(). */
 function dayKey(d){
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 }
 function dailyState(){
  var today=dayKey(new Date());
  if(!state.daily||state.daily.date!==today)state.daily={date:today,earned:0};
  state.daily={date:today,earned:Math.max(0,Math.min(DAILY_CAP,Number(state.daily.earned)||0))};
  return state.daily;
 }
 function dailyView(){
  var d=dailyState();
  return {date:d.date,earned:d.earned,cap:DAILY_CAP,remaining:DAILY_CAP-d.earned,
   reached:d.earned>=DAILY_CAP,pct:Math.round(d.earned*100/DAILY_CAP)};
 }
 function cookieName(){
  try{var m=document.cookie.match(/(?:^|;\s*)joyflock_account=([^;]*)/);if(m)return decodeURIComponent(m[1]);}catch(e){}
  return '';
 }
 function accountName(){
  var n='';
  try{n=localStorage.getItem('joyflock.accountName')||'';}catch(e){}
  if(!n)n=cookieName();
  /* "0" is the server-confirmed GUEST marker, never a nickname. */
  return n&&n!=='0'?String(n):'';
 }
 function isSignedIn(){return !!accountName();}
 function load(forced){
  signedIn=forced===undefined?isSignedIn():!!forced;
  /* Always start from a clean record. A guest who signs in mid-page must not
     carry the un-saved guest figures into somebody's account, and a sign-out
     must not leave the former account's totals on screen. */
  /* The balance always starts from the shared wallet, NOT from a second
     accumulated total. Games / wins / the daily allowance are still a clean
     per-session record. */
  state={games:0,wins:0,points:walletTotal()||0,byGame:{},last:null,daily:null};
  /* Anonymous sessions never read a stored game record either. */
  if(!signedIn)return;
  try{
   var raw=JSON.parse(localStorage.getItem(KEY)||'null');
   if(!raw||typeof raw!=='object')return;
   state.games=Math.max(0,Number(raw.games)||0);
   state.wins=Math.max(0,Number(raw.wins)||0);
   /* Legacy records still carry a `points` field. With a real wallet present
      it is ignored (the wallet is the only balance); in a wallet-less harness
      it still restores the local total so the scorer works on its own. */
   if(walletTotal()===null)state.points=Math.max(0,Number(raw.points)||0);
   state.byGame=raw.byGame&&typeof raw.byGame==='object'?raw.byGame:{};
   /* Old records have no daily field; dailyState() starts a fresh day. */
   if(raw.daily&&typeof raw.daily==='object')state.daily={
    date:String(raw.daily.date||''),earned:Math.max(0,Number(raw.daily.earned)||0)};
  }catch(e){}
 }
 function persist(){
  if(!signedIn)return;
  try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}
 }
 /* ONE BALANCE. site-points.js owns the Joy Coin wallet; this scorer never
    keeps a competing total. Every shell loads the wallet BEFORE this script,
    but the localStorage fallback keeps the scorer usable on its own (and in
    the isolated VM tests where no wallet exists). */
 function walletTotal(){
  try{
   var p=window.__joyflockPoints;
   if(p&&typeof p.get==='function'){
    var t=Number(p.get().total);
    if(Number.isFinite(t))return Math.max(0,t);
   }
  }catch(e){}
  try{
   var raw=JSON.parse(localStorage.getItem(WALLET_KEY)||'null');
   if(raw&&Number.isFinite(Number(raw.points)))return Math.max(0,Number(raw.points));
  }catch(e){}
  return null;
 }
 /* Add the credited award to the wallet. set() repaints the header pill and
    broadcasts `joyflock:shop-changed`, which our own listener uses to mirror
    the new balance into the leaderboard. Writing the same value back to the
    wallet's own storage keeps reloads and other tabs in sync. */
 function walletAdd(amount){
  var total=walletTotal();
  if(total===null)return null;
  var next=Math.max(0,total+amount);
  try{
   var raw=JSON.parse(localStorage.getItem(WALLET_KEY)||'null')||{};
   raw.points=next;
   localStorage.setItem(WALLET_KEY,JSON.stringify(raw));
  }catch(e){}
  try{
   var p=window.__joyflockPoints;
   if(p&&typeof p.set==='function')p.set({total:next});
  }catch(e){}
  return next;
 }

 /* rank 0 means a draw. `seat` is always 0-based; table games report a
    1-based board.winner, while Flight Party reports a ranking of seat ids. */
 function rankOf(r){
  var seat=Math.max(0,Number(r.seat)||0);
  if(Array.isArray(r.ranking)&&r.ranking.length){
   var i=r.ranking.map(Number).indexOf(seat);
   return i<0?r.ranking.length+1:i+1;
  }
  var winner=Number(r.winner)||0;
  return winner===0?0:(winner===seat+1?1:2);
 }
 function pointsFor(r){
  r=r||{};
  var players=Math.max(2,Math.min(4,Number(r.players)||2)),t=table(players),rank=rankOf(r);
  var base=rank===0?t[t.length-1]:t[Math.min(rank-1,t.length-1)];
  /* Difficulty bonus rewards BEATING a stronger computer (0/10/20/50%).
     A loss or a draw has rank > 1 / 0, so its bonus is zero. */
  var bonusPct=rank===1?Math.max(0,Number(r.bonusPct)||0):0;
  var bonus=Math.round(base*bonusPct/100);
  return {rank:rank,players:players,base:base,bonus:bonus,bonusPct:bonusPct,points:base+bonus};
 }

 function snapshot(){
  return {games:state.games,wins:state.wins,points:state.points,winRate:state.games?state.wins/state.games*100:0,
   byGame:JSON.parse(JSON.stringify(state.byGame)),last:state.last?Object.assign({},state.last):null,
   daily:dailyView(),signedIn:signedIn};
 }
 function leaderboardRow(){
  if(!state.games)return null;
  /* The visitor's own row is the ACCOUNT, not a placeholder: use the
     signed-in nickname instead of 你 / You, and tag the row as its own seat
     so avatar-display.resolve() picks the same equipped shop portrait that
     the header account button shows. The game iframe has a separate JS realm
     but shares localStorage, which resolve() already falls back to. Guests
     keep the neutral label, signedIn:false and therefore the default face. */
  var name=accountName();
  return {name:name||(en()?'You':'你'),points:state.points,games:state.games,wins:state.wins,winRate:snapshot().winRate,
   avatar:0,avatarUrl:'',avatarFrame:'none',member:false,annualMember:false,
   self:true,isSelf:true,signedIn:!!name};
 }
 /* All three boards share this rule: the visitor's own row must stay visible.
    A fresh account with 100 points would otherwise be cut by the ten demo
    standings, making the "dynamic data" invisible. The weakest demo row gives
    up its seat; the self row keeps its honest points order at rank 10. */
 /* by==='winRate' powers the table-game win-rate board; the default keeps
   the home page's Joy Coins ordering untouched. Ties go to more games (a
   larger sample), then to more points. */
 function rankRows(rows,by){
  var all=(rows||[]).filter(Boolean).slice();
  var rate=function(r){return Number(r.winRate)||0;};
  all.sort(by==='winRate'
   ? function(a,b){return rate(b)-rate(a)||(Number(b.games)||0)-(Number(a.games)||0)||(Number(b.points)||0)-(Number(a.points)||0);}
   : function(a,b){return (Number(b.points)||0)-(Number(a.points)||0)||(Number(b.games)||0)-(Number(a.games)||0);});
  var top=all.slice(0,10),mine=null;
  for(var i=0;i<all.length;i++)if(all[i].self===true){mine=all[i];break;}
  if(mine&&top.indexOf(mine)<0)top=all.slice(0,9).concat([mine]);
  return top;
 }

 function record(r){
  if(!r||r.over===false)return null;
  var key=String(r.key||'');
  if(key&&seen[key])return null;
  if(key)seen[key]=true;
  var p=pointsFor(r);
  var g=String(r.game||'game');
  /* Only the part still allowed today is credited. After 5000 points the game
     still counts as played (games / wins / per-game split), but adds 0 points.
     `last.full` keeps the theoretical award so the dialog can explain the cap. */
  var day=dailyState();
  var credited=Math.min(p.points,Math.max(0,DAILY_CAP-day.earned));
  day.earned+=credited;
  /* Credit the SAME wallet the header pill and the shop spend from. When no
     wallet is present (isolated VM harness) fall back to the old local total
     so a single module still scores correctly. */
  var total=walletAdd(credited);
  state.points=total===null?state.points+credited:total;
  state.games++;if(p.rank===1)state.wins++;
  var b=state.byGame[g]||{games:0,wins:0,points:0};
  b.games++;b.points+=credited;if(p.rank===1)b.wins++;
  state.byGame[g]=b;
  state.last={game:g,rank:p.rank,points:credited,full:p.points,capped:credited<p.points,
   base:p.base,bonus:p.bonus,bonusPct:p.bonusPct,players:p.players,at:Date.now()};
  persist();render(p);
  try{window.dispatchEvent(new CustomEvent('joyflock:game-points',{detail:snapshot()}));}catch(e){}
  try{if(window.parent!==window)window.parent.postMessage(
   {type:'joyflock:game-points',version:VERSION,state:snapshot()},location.origin);}catch(e){}
  return {rank:p.rank,players:p.players,base:p.base,bonus:p.bonus,bonusPct:p.bonusPct,
   points:credited,full:p.points,capped:credited<p.points};
 }

 function render(p){
  if(typeof document==='undefined')return;
  var s=snapshot(),zh=!en();
  var box=document.querySelector('.member-facts');
  if(box){
   var set=function(k,v){var n=box.querySelector('[data-member-fact="'+k+'"]');if(n){n.textContent=v;n.dataset.systemEnglish=v;}};
   set('points',fmt(s.points));set('games',fmt(s.games));set('winrate',Math.round(s.winRate)+'%');
  }
  var stats=document.getElementById('stats');
  if(stats){
   stats.dataset.gamePoints='1';delete stats.dataset.demo;
   stats.textContent=zh
    ?'我的战绩：'+fmt(s.points)+' Joy Coins · '+fmt(s.games)+' 局'+(signedIn?'':' · 匿名战绩仅显示，不保存')
    :'My record: '+fmt(s.points)+' Joy Coins · '+fmt(s.games)+' games'+(signedIn?'':' · guest stats not saved');
  }
  renderBoard();
 }
 function renderBoard(){
  var lb=document.getElementById('leaderboard');
  if(!lb||typeof window.__joyflockRankRow!=='function')return;
  var period='month',active=document.querySelector('[data-period][aria-pressed="true"]');
  if(active&&active.dataset.period)period=active.dataset.period;
  var game=new URLSearchParams(location.search).get('game')||'four';
  var rows=window.__joyflockDemoRows?window.__joyflockDemoRows(period,game).slice():[];
  var self=leaderboardRow();
  if(self)rows.push(self);
  /* Only the table-game detail page owns #leaderboard inside .home-ranking;
     the home Pilot board keeps its Joy Coins ordering. */
  var byRate=!!document.querySelector('.home-ranking');
  rows=rankRows(rows,byRate?'winRate':'points');
  var doc=lb.ownerDocument;
  lb.replaceChildren.apply(lb,rows.map(function(r,i){
   var li=window.__joyflockRankRow(doc,r,i);
   if(r.self)li.dataset.self='1';
   return li;
  }));
 }

 /* A parent shell can mirror a result from an embedded game without counting
    it twice: only the state snapshot is copied, never another award. */
 function sync(next){
  if(!next||typeof next!=='object')return;
  state.games=Math.max(0,Number(next.games)||0);
  state.wins=Math.max(0,Number(next.wins)||0);
  state.points=Math.max(0,Number(next.points)||0);
  state.byGame=next.byGame&&typeof next.byGame==='object'?next.byGame:{};
  state.last=next.last||null;
  /* The parent shell mirrors the child's daily allowance too, so a reload or a
     second tab never reopens a fresh 5000-point budget for the same account. */
  state.daily=next.daily&&typeof next.daily==='object'
   ?{date:String(next.daily.date||''),earned:Math.max(0,Number(next.daily.earned)||0)}:null;
  render(null);
 }
/* A record reset must NOT reset the daily allowance or the shared balance:
   otherwise clearing the visible stats would lift the cap or empty the wallet. */
 function reset(){var day=state.daily,balance=walletTotal();state={games:0,wins:0,points:balance===null?0:balance,byGame:{},last:null,daily:day};seen=Object.create(null);persist();render(null);}

 window.__joyflockGamePoints={
  version:VERSION,key:KEY,table:table,pointsFor:pointsFor,record:record,get:snapshot,
  leaderboardRow:leaderboardRow,rankRows:rankRows,render:render,reset:reset,sync:sync,
  dailyCap:DAILY_CAP,daily:dailyView,
  isSignedIn:function(){return signedIn;}
 };

 /* The identity probe started in <head> is authoritative when available. It
    never adds a network request; a 404 simply keeps the guest session. */
 try{
  if(window.__joyflockMe&&typeof window.__joyflockMe.then==='function'){
   window.__joyflockMe.then(function(me){
    var ok=!!(me&&me.account&&me.account.displayName);
    if(ok===signedIn)return;
    /* The server verdict wins over a possibly stale cached nickname. Do not
       call load() here: it would re-read that same stale cache. */
    signedIn=ok;
    /* Dropping a guest's game record must not empty the shared wallet. */
    if(!ok){state={games:0,wins:0,points:walletTotal()||0,byGame:{},last:null,daily:null};}
    render(null);
   }).catch(function(){});
  }
 }catch(e){}

 /* Re-apply our figures after a language switch or an async server refresh. */
 if(typeof MutationObserver!=='undefined'&&document.documentElement){
  new MutationObserver(function(){render(null);}).observe(document.documentElement,
   {attributes:true,attributeFilter:['data-locale','lang']});
 }
 /* Shop purchases and the header wallet both write joyflock.shop.v1. Mirror
    every change into the leaderboard WITHOUT starting a result animation:
    only `joyflock:game-points` carries an award snapshot. */
 window.addEventListener('joyflock:shop-changed',function(){
  var t=walletTotal();
  if(t===null||t===state.points)return;
  state.points=t;render(null);
 });
 window.addEventListener('storage',function(e){
  if(e.key===WALLET_KEY){
   var t=walletTotal();
   if(t!==null&&t!==state.points){state.points=t;render(null);}
   return;
  }
  if(e.key===KEY||e.key==='joyflock.accountName'){load();render(null);}
 });
 /* site-account.js broadcasts the authoritative nickname after a login or
    logout in THIS document (the storage event never fires for the same tab).
    Switching identity re-reads that account's own record; guest figures are
    display-only and are deliberately dropped instead of being adopted. */
 window.addEventListener('joyflock:account-changed',function(e){
  var name=e&&e.detail?String(e.detail.name||''):'';
  load(!!name&&name!=='0');
  render(null);
 });
 window.addEventListener('message',function(e){
  if(e.origin!==location.origin||e.data?.type!=='joyflock:game-points')return;
  if(e.data.version===VERSION)sync(e.data.state);
 });
 window.addEventListener('joyflock:game-points',function(){render(null);});

 load();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){render(null);},{once:true});
 else render(null);

})();
