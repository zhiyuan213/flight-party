// Shared robot difficulty helpers for every local computer opponent.
// Pure data + helpers: safe to import in Node (tests) and in every game page.
// The four levels are deliberately monotone - each one must be measurably
// stronger than the previous one, see tests/bot-difficulty.test.mjs.
//
// The chosen level is remembered PER GAME: `joyflock.bot.level.<gameId>`.
// `joyflock.bot.level` is the legacy shared key; it is only read as a
// migration fallback so an existing choice is not lost, and is never written
// again. Callers without a game id (tests, the preview page) keep using the
// legacy key, which preserves the original API.

export const BOT_LEVELS=['easy','normal','pro','hell'];
export const DEFAULT_BOT_LEVEL='easy';
export const BOT_LEVEL_KEY='joyflock.bot.level';
export const BOT_LEVEL_KEY_PREFIX='joyflock.bot.level.';
/* Every playable game with a local computer opponent. Flight lives on the
   portal home page; the ten table games pass their `?game=` id. */
export const BOT_GAME_IDS=['flight','four','gomoku','xo','chess','puzzle','draw','cards','pool','nineball','snooker','bubbles'];
/** Storage key for one game. Unknown/absent ids fall back to the legacy key. */
export function botLevelKey(game){
  return BOT_GAME_IDS.includes(game)?BOT_LEVEL_KEY_PREFIX+game:BOT_LEVEL_KEY;
}
/* Local single-player point bonus per difficulty (percentage of the base). */
export const BOT_BONUS={easy:0,normal:10,pro:20,hell:50};

export const BOT_LABELS={
  easy:{zh:'简单',en:'Easy'},
  normal:{zh:'一般',en:'Normal'},
  pro:{zh:'专业',en:'Pro'},
  hell:{zh:'地狱',en:'Hell'}
};
export const BOT_HINTS={
  easy:{zh:'会失误，容易赢',en:'Makes mistakes'},
  normal:{zh:'原版的稳健对手',en:'The classic opponent'},
  pro:{zh:'会算两步，很少失误',en:'Looks ahead, rarely slips'},
  hell:{zh:'全力搜索，几乎不失误',en:'Full search, almost flawless'}
};
export const BOT_GROUP_LABEL={zh:'机器人难度',en:'COMPUTER DIFFICULTY'};
export const BOT_NOTE={zh:'默认简单 · 每个游戏单独记住你的选择',en:'Default Easy · your choice is saved separately for each game'};

export function normalizeBotLevel(value){
  return BOT_LEVELS.includes(value)?value:DEFAULT_BOT_LEVEL;
}
export function botLabel(level,lang='zh'){
  return (BOT_LABELS[normalizeBotLevel(level)]||BOT_LABELS.easy)[lang==='en'?'en':'zh'];
}
const store=fallback=>{
  if(fallback)return fallback;
  try{return globalThis.localStorage||null;}catch{return null;}
};
/**
 * Read the level for `game`. A missing/invalid per-game value falls back to
 * the legacy shared key (migration) and finally to Easy. Omitting `game`
 * keeps the original single-key behaviour for embedders and Node tests.
 */
export function getBotLevel(storage,game){
  try{
    const source=store(storage),key=botLevelKey(game);
    let raw=source?.getItem(key);
    if(key!==BOT_LEVEL_KEY&&!BOT_LEVELS.includes(raw))raw=source?.getItem(BOT_LEVEL_KEY);
    return normalizeBotLevel(raw);
  }catch{return DEFAULT_BOT_LEVEL;}
}
export function setBotLevel(value,storage,game){
  const level=normalizeBotLevel(value);
  try{store(storage)?.setItem(botLevelKey(game),level);}catch{}
  return level;
}
/** Bind the level API to one game so callers never repeat the key. */
export function botLevelStore(game,storage){
  return {key:botLevelKey(game),
    get:()=>getBotLevel(storage,game),
    set:value=>setBotLevel(value,storage,game)};
}

/**
 * One place to tune strength. `null` is the legacy code path (used by old
 * golden fixtures that call bot(s) without a level). `normal` is intentionally
 * identical to that legacy behaviour; easy weakens it, pro/hell strengthen it.
 *
 * blunder  - chance of playing a random legal move
 * win/block- look for an immediate win / block an opponent's immediate win
 * aimDeg   - cue-sports aiming error in degrees (3600 = one full turn)
 * power    - cue-sports power error (0-100 scale)
 * depth    - extra search plies for board games / chess
 * noise    - evaluation jitter for board games
 * scan     - bubble-shooter aim sampling step (smaller = more precise)
 * dieBias  - flight dice weighting: -1 favours low pips, +1 high pips
 * cue      - cue-sports geometry: 0 classic, 1 full shot search, 2 full shot
 *            search + cut-angle feasibility + blocked-path penalties
 */
export function botTuning(level){
  if(level===undefined||level===null)return null;
  switch(normalizeBotLevel(level)){
    case 'easy':  return {level:'easy',blunder:.58,win:false,block:false,aimDeg:9,power:18,depth:0,noise:16,scan:15,dieBias:-1,searchWidth:0,cue:0};
    case 'pro':   return {level:'pro',  blunder:0,win:true, block:true, aimDeg:0, power:0, depth:2,noise:0,scan:4, dieBias:.5,searchWidth:6,cue:1};
    case 'hell':  return {level:'hell', blunder:0,win:true, block:true, aimDeg:0, power:0, depth:3,noise:0,scan:2, dieBias:1, searchWidth:8,cue:2};
    default:      return {level:'normal',blunder:0, win:true, block:true, aimDeg:0, power:0, depth:0,noise:0,scan:6, dieBias:0, searchWidth:0,cue:0};
  }
}

/** Deterministic-friendly weighted dice roll for flight bots (never for humans). */
export function botDie(level,rng=Math.random){
  const bias=botTuning(level)?.dieBias||0;
  if(!bias)return 1+Math.floor(Math.max(0,Math.min(.999999,rng()))*6);
  const weights=Array.from({length:6},(_,i)=>Math.max(.2,1+bias*(i-2.5)/5));
  const total=weights.reduce((a,b)=>a+b,0);
  let roll=Math.max(0,Math.min(.999999,rng()))*total;
  for(let i=0;i<6;i++){roll-=weights[i];if(roll<0)return i+1;}
  return 6;
}

/** Symmetric jitter in [-amount, amount]. */
export function jitter(amount,rng=Math.random){
  return amount?(rng()*2-1)*amount:0;
}
/** Pick a random element without throwing on an empty list. */
export function pick(list,rng=Math.random){
  return list.length?list[Math.floor(Math.max(0,Math.min(.999999,rng()))*list.length)]:undefined;
}

/* ------------------------------------------------------------------ *
 * Shared UI. Each host page supplies its own language; the table shell
 * translates through data-system-english, arcade/flight call setLanguage.
 * ------------------------------------------------------------------ */
export function botDifficultyMarkup(level=DEFAULT_BOT_LEVEL,lang='zh'){
  const en=lang==='en',current=normalizeBotLevel(level);
  const text=(zh,english)=>en?english:zh;
  return `<span class="bot-difficulty-label" data-system-english="${BOT_GROUP_LABEL.en}">${text(BOT_GROUP_LABEL.zh,BOT_GROUP_LABEL.en)}</span>
    <div class="bot-difficulty-options" role="group">${BOT_LEVELS.map(key=>{
      const item=BOT_LABELS[key],hint=BOT_HINTS[key];
      return `<button type="button" data-bot-level="${key}" data-system-english="${item.en}" aria-pressed="${key===current}" title="${en?hint.en:hint.zh}">${en?item.en:item.zh}</button>`;
    }).join('')}</div>
    <small class="bot-difficulty-note" data-system-english="${BOT_NOTE.en}">${text(BOT_NOTE.zh,BOT_NOTE.en)}</small>`;
}

/** Mount the four-button control into `host`; returns {get,set,refresh,language}. */
export function bindBotDifficulty(host,{storage,onChange,lang='zh',note,game}={}){
  if(!host||typeof host.querySelector!=='function')return null;
  const levels=botLevelStore(game,storage);
  let language=lang,level=levels.get();
  const paint=()=>{
    host.innerHTML=botDifficultyMarkup(level,language);
    if(note){
      const line=host.querySelector('.bot-difficulty-note');
      if(line){line.textContent=language==='en'?note.en:note.zh;line.dataset.systemEnglish=note.en;}
    }
    host.setAttribute('role','group');
    host.setAttribute('aria-label',language==='en'?BOT_GROUP_LABEL.en:BOT_GROUP_LABEL.zh);
  };
  host.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-bot-level]');
    if(!button||!host.contains(button))return;
    level=levels.set(button.dataset.botLevel);
    for(const node of host.querySelectorAll('[data-bot-level]'))
      node.setAttribute('aria-pressed',String(node.dataset.botLevel===level));
    onChange?.(level);
  });
  paint();
  return {
    get:()=>level,
    set:value=>{level=levels.set(value);paint();return level;},
    refresh:()=>{level=levels.get();paint();return level;},
    language:value=>{language=value;paint();}
  };
}

/* ------------------------------------------------------------------ *
 * Modal variant. The intro pages show one compact trigger button; the
 * four levels live in a native <dialog> so the launch area stays clean.
 * The inline variant above is kept for embedders/tests that still call it.
 * ------------------------------------------------------------------ */
export const BOT_DIALOG_TITLE={zh:'机器人难度',en:'Computer difficulty'};
export const BOT_DIALOG_SUBTITLE={
  zh:'选择电脑对手的强度，随时可以改，选择会记住。',
  en:'Choose how strong the computer plays. Change it any time - your choice is saved.'
};
export const BOT_DIALOG_DONE={zh:'完成',en:'Done'};
export const BOT_DIALOG_CLOSE={zh:'关闭',en:'Close'};

/** The single button left in the launch area. */
export function botDifficultyTriggerMarkup(level=DEFAULT_BOT_LEVEL,lang='zh'){
  const en=lang==='en',current=BOT_LABELS[normalizeBotLevel(level)];
  return `<button type="button" class="bot-difficulty-trigger" data-bot-open aria-haspopup="dialog" aria-expanded="false" title="${en?BOT_DIALOG_TITLE.en:BOT_DIALOG_TITLE.zh}">
    <span class="bd-trigger-label" data-system-english="${BOT_DIALOG_TITLE.en}">${en?BOT_DIALOG_TITLE.en:BOT_DIALOG_TITLE.zh}</span>
    <span class="bd-trigger-current"><span class="bd-trigger-value" data-system-english="${current.en}">${en?current.en:current.zh}</span><span class="bd-trigger-chevron" aria-hidden="true">›</span></span>
  </button>`;
}

/** Contents of the dialog (not the <dialog> element itself). */
export function botDifficultyDialogMarkup(level=DEFAULT_BOT_LEVEL,lang='zh',note=null){
  const en=lang==='en',current=normalizeBotLevel(level),text=(zh,english)=>en?english:zh;
  const noteText=note?(en?note.en:note.zh):(en?BOT_NOTE.en:BOT_NOTE.zh);
  const noteEn=note?note.en:BOT_NOTE.en;
  return `<button type="button" class="bd-close" data-bot-close aria-label="${en?BOT_DIALOG_CLOSE.en:BOT_DIALOG_CLOSE.zh}">×</button>
  <span class="bd-eyebrow" data-system-english="${BOT_GROUP_LABEL.en}">${text(BOT_GROUP_LABEL.zh,BOT_GROUP_LABEL.en)}</span>
  <h2 class="bd-title" data-system-english="${BOT_DIALOG_TITLE.en}">${text(BOT_DIALOG_TITLE.zh,BOT_DIALOG_TITLE.en)}</h2>
  <p class="bd-sub" data-system-english="${BOT_DIALOG_SUBTITLE.en}">${text(BOT_DIALOG_SUBTITLE.zh,BOT_DIALOG_SUBTITLE.en)}</p>
  <div class="bd-options" role="group">${BOT_LEVELS.map(key=>{
    const item=BOT_LABELS[key],hint=BOT_HINTS[key];
    return `<button type="button" class="bd-option" data-bot-level="${key}" aria-pressed="${key===current}">
      <span class="bd-option-text"><b data-system-english="${item.en}">${en?item.en:item.zh}</b><small data-system-english="${hint.en}">${en?hint.en:hint.zh}</small></span>
      <span class="bd-check" aria-hidden="true">✓</span></button>`;
  }).join('')}</div>
  <p class="bd-note" data-system-english="${noteEn}">${noteText}</p>
  <div class="bd-actions"><button type="button" class="primary" data-bot-close data-system-english="${BOT_DIALOG_DONE.en}">${text(BOT_DIALOG_DONE.zh,BOT_DIALOG_DONE.en)}</button></div>`;
}

/**
 * Mount the trigger + dialog. Returns the same {get,set,refresh,language} API
 * as bindBotDifficulty, plus open/close/isOpen for automated checks.
 * `document`/`window` can be injected so Node tests need no DOM library.
 */
export function bindBotDifficultyDialog(host,{storage,onChange,lang='zh',note=null,document:doc,window:win,game}={}){
  if(!host||typeof host.querySelector!=='function'||typeof host.addEventListener!=='function')return null;
  const d=doc||globalThis.document,w=win||globalThis;
  if(!d?.createElement)return null;
  const dialog=d.createElement('dialog');
  dialog.className='bot-difficulty-dialog';
  const levels=botLevelStore(game,storage);
  let language=lang,level=levels.get();
  const syncTrigger=()=>{
    const trigger=host.querySelector?.('[data-bot-open]');
    if(trigger?.setAttribute)trigger.setAttribute('aria-expanded',String(!!dialog.open));
  };
  /* The trigger already exists in the HTML on the very first frame (see
     bot-difficulty-boot.js). Reuse that node: replacing host.innerHTML once
     the module graph finishes is exactly the late pop-in we want to avoid.
     Only its two text nodes change when the level or language changes. */
  const paintTrigger=()=>{
    const trigger=host.querySelector?.('[data-bot-open]');
    if(!trigger||typeof trigger.querySelector!=='function'){
      host.innerHTML=botDifficultyTriggerMarkup(level,language);   // embedders with no static markup
    }else{
      const en=language==='en',item=BOT_LABELS[normalizeBotLevel(level)];
      const title=en?BOT_DIALOG_TITLE.en:BOT_DIALOG_TITLE.zh;
      const label=trigger.querySelector('.bd-trigger-label');
      const value=trigger.querySelector('.bd-trigger-value');
      if(label&&label.textContent!==undefined){
        label.textContent=title;
        if(label.dataset)label.dataset.systemEnglish=BOT_DIALOG_TITLE.en;
      }
      if(value&&value.textContent!==undefined){
        value.textContent=en?item.en:item.zh;
        if(value.dataset)value.dataset.systemEnglish=item.en;
      }
      trigger.setAttribute?.('title',title);
      host.setAttribute?.('role','group');
      host.setAttribute?.('aria-label',title);
    }
    syncTrigger();
  };
  const paint=()=>{
    paintTrigger();
    dialog.innerHTML=botDifficultyDialogMarkup(level,language,note);
    dialog.setAttribute?.('aria-label',language==='en'?BOT_DIALOG_TITLE.en:BOT_DIALOG_TITLE.zh);
  };
  const open=()=>{
    if(dialog.open)return;
    if(typeof dialog.showModal==='function')dialog.showModal();
    else dialog.setAttribute?.('open','');
    syncTrigger();
  };
  const close=()=>{
    if(typeof dialog.close==='function'&&dialog.open)dialog.close();
    else{dialog.open=false;dialog.removeAttribute?.('open');}
    syncTrigger();
  };
  host.addEventListener('click',event=>{
    if(event.target?.closest?.('[data-bot-open]'))open();
  });
  dialog.addEventListener?.('click',event=>{
    if(event.target===dialog){close();return;}          // backdrop
    if(event.target?.closest?.('[data-bot-close]')){close();return;}
    const option=event.target?.closest?.('[data-bot-level]');
    if(!option||dialog.contains?.(option)===false)return;
    level=levels.set(option.dataset.botLevel);
    for(const node of dialog.querySelectorAll?.('[data-bot-level]')||[])
      node.setAttribute?.('aria-pressed',String(node.dataset.botLevel===level));
    paint();
    onChange?.(level);
    close();
  });
  dialog.addEventListener?.('close',syncTrigger);
  w?.addEventListener?.('storage',event=>{
    /* A sibling tab may write this game's key or (legacy) the shared key. */
    if(event&&event.key&&event.key!==levels.key&&event.key!==BOT_LEVEL_KEY)return;
    level=levels.get();paint();
  });
  (d.body||host).appendChild?.(dialog);
  paint();
  return {
    get:()=>level,
    set:value=>{level=levels.set(value);paint();return level;},
    refresh:()=>{level=levels.get();paint();return level;},
    language:value=>{language=value;paint();},
    open,close,isOpen:()=>!!dialog.open,dialog
  };
}
