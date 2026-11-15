/* First-paint boot for the "computer difficulty" trigger.
   Plain synchronous script, loaded right after #bot-difficulty during HTML
   parsing - long before the ES module graph. The trigger itself is already in
   the static HTML, so the launch area never grows after the page renders; this
   only aligns its label and current level with localStorage + locale on the
   very first frame. Mirrors bot-difficulty.js (BOT_LABELS / BOT_DIALOG_TITLE)
   and tests/bot-difficulty-first-frame.test.mjs guards the two against drift.

   The saved level lives in `joyflock.bot.level.<game>`, one key per game.
   `joyflock.bot.level` is the legacy shared key, read only as a migration
   fallback so an existing choice survives the switch to per-game storage. */
(function(){
  'use strict';
  var LABELS={
    easy:{zh:'简单',en:'Easy'},normal:{zh:'一般',en:'Normal'},
    pro:{zh:'专业',en:'Pro'},hell:{zh:'地狱',en:'Hell'}
  };
  var LEVELS=['easy','normal','pro','hell'];
  var TITLE={zh:'机器人难度',en:'Computer difficulty'};
  var KEY='joyflock.bot.level',PREFIX='joyflock.bot.level.';
  var GAMES=['flight','four','gomoku','xo','chess','puzzle','draw','cards','pool','snooker','bubbles'];

  /* Flight marks its slot explicitly; the arcade page carries the game in its
     query string (and defaults to Bubbles with no query). */
  function levelKey(host){
    var explicit=host&&host.getAttribute&&host.getAttribute('data-bot-game');
    if(GAMES.indexOf(explicit)>=0)return PREFIX+explicit;
    var fromQuery=null,arcade=false;
    try{
      fromQuery=new URLSearchParams(location.search).get('game');
      arcade=/arcade\.html/.test(location.pathname||'');
    }catch(e){}
    /* arcade.html only ever plays Snooker or Bubbles (see arcade.js); any
       other ?game= value falls back to Bubbles here too, so the first frame
       never briefly shows another game's saved level. */
    if(arcade)return PREFIX+(fromQuery==='snooker'?'snooker':'bubbles');
    if(GAMES.indexOf(fromQuery)>=0)return PREFIX+fromQuery;
    return PREFIX+'flight';
  }
  function currentLevel(host){
    try{
      var saved=globalThis.localStorage&&localStorage.getItem(levelKey(host));
      if(LEVELS.indexOf(saved)<0)saved=globalThis.localStorage&&localStorage.getItem(KEY);
      return LEVELS.indexOf(saved)>=0?saved:'easy';
    }catch(e){return 'easy';}
  }
  /* table/index.html sets data-locale in <head>; arcade.html reads the portal
     language key; the flight lobby stores its prefs under flight-party-prefs.
     All three default to English except the table intro, which defaults to zh. */
  function isEnglish(){
    var root=document.documentElement;
    var locale=root.getAttribute&&root.getAttribute('data-locale');
    if(locale==='en'||locale==='zh')return locale==='en';
    try{
      var query=new URLSearchParams(location.search).get('lang');
      if(query==='en'||query==='zh')return query==='en';
      var prefs=JSON.parse((globalThis.localStorage&&localStorage.getItem('flight-party-prefs'))||'null');
      if(prefs&&prefs.lang)return prefs.lang==='en';
      return localStorage.getItem('joyflock-portal-language')!=='zh';
    }catch(e){return true;}
  }

  var host=document.getElementById('bot-difficulty');
  if(!host||!host.querySelector)return;
  var trigger=host.querySelector('[data-bot-open]');
  if(!trigger||!trigger.querySelector)return;
  var en=isEnglish(),item=LABELS[currentLevel(host)],title=en?TITLE.en:TITLE.zh;
  var label=trigger.querySelector('.bd-trigger-label');
  var value=trigger.querySelector('.bd-trigger-value');
  if(label){
    label.textContent=title;
    label.setAttribute('data-system-english',TITLE.en);
  }
  if(value){
    value.textContent=en?item.en:item.zh;
    value.setAttribute('data-system-english',item.en);
  }
  trigger.setAttribute('title',title);
  host.setAttribute('role','group');
  host.setAttribute('aria-label',title);
  host.setAttribute('data-booted','1');
})();
