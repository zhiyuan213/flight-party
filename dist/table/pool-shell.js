import {drawPoolBall} from './pool-ball.js?v=20261112-gamelanes1';
import {targetsFor,isNineBall,PENALTY_VISIT,PENALTY_ACTIVE,PENALTY_READY} from './pool-rules.js?v=20261110-glove2&nine=20261120-nineball1';
import {playPocketChime} from './pool-pocket-sfx.js?v=20261110-glove2&audio=20261115-levels1';
import {createResultPointsTicker,createResultScoreTicker} from './result-points.js?v=20261115-joincoin1&c=20261116-fastcount1&score=20261120-score1&ui=20261123-polish1';
// Pool-only presentation. Existing account, turn and reaction nodes keep their handlers.
/* One ticker per document: it listens for the scorer's award event from module
   evaluation time, so a result that settles before createResult() still has its
   reward payload when the dialog finally opens. Node-side unit tests import
   poolSeatSummary() from this module without a DOM, so keep the top level safe. */
const scoreTicker = typeof document !== 'undefined' && document?.createElement
  ? createResultScoreTicker(document)
  : {panel: null, reveal() {}, finish() {}, hide() {}};
const pointsTicker = typeof document !== 'undefined' && document?.createElement
  ? createResultPointsTicker(document,globalThis,{after:scoreTicker})
  : {panel: null, reveal() {}, finish() {}, hide() {}};
let shell, current = null, roomId, chatKey, cursor = 0, polling = false, timer = null, sending = false, localId = 0;
// Live room chat: server rooms keep their REST history, while a same-origin
// BroadcastChannel delivers every new message to all windows in the room
// immediately (no waiting for the next poll). Local games use a device-wide
// room keyed by game instead of a fake "local only" log.
let channel=null,roomKey=null,seen=new Set(),clientSeq=0;
const clientId=globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)+Date.now().toString(36);
const CHAT_POLL_MS=250;
let resultKey = null, resultFrame = 0, resultShown = false, confettiTimer = null, rematchBusy = false;
/* An online room keeps publishing snapshots after the match is final (an easy
   bot may still be finishing its paced move, reconnect grace can expire, etc).
   Rebuilding the player cards on each snapshot restarts result-art-in and makes
   both trophies pulse. Build them once per result state instead. */
let resultPlayersKey = null;
/* The seven games without their own result dialog (Gomoku, Chess, Cards,
   Puzzle, Draw, Bubble Duel, Snooker) now open this very same dialog. They
   behave like Connect Four: SVG emblem, no pool ball counts, no 3-second
   pocket-animation preview, and the reveal fires on the final frame. */
let gridResult = false, gridGame = '';
const element = (tag, className, text) => {const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
const $ = id => document.getElementById(id);

/* The chat heading used to carry a static "Room only" badge. The user asked
   for a fullscreen toggle there instead. The portal owns the real fullscreen
   state machine (bindPoolFullscreen), so this button only forwards a request
   and mirrors the state the parent broadcasts back. Standalone pages use
   their own native fullscreen. */
let chatFullscreenState = false;
function chatEnglish(){return typeof document!=='undefined'&&document.documentElement.lang.toLowerCase().indexOf('en')===0;}
/* Own seat is room.you in an online match, otherwise the local mySeat. The
   parent shell forwards the signed-in nickname as options.selfName, so the
   chat / feedback / result cards never fall back to 你 / You for an account. */
function viewerIndex(options){
 return options?.room?Number(options.room.you):Math.max(0,(Number(options?.mySeat)||1)-1);
}
function viewerName(options){
 return options?.selfName||options?.me?.account?.displayName||
  options?.names?.[viewerIndex(options)]||(chatEnglish()?'You':'你');
}
function feedbackNames(options){
 if(options?.room?.names)return [options.room.names,options.room.names];
 const ownIndex=viewerIndex(options);
 const own=options?.selfName||options?.me?.account?.displayName||'';
 const ownZh=own||'你',ownEn=own||'You';
 const botZh=options?.computer?'电脑':'好友',botEn=options?.computer?'Computer':'Friend';
 return ownIndex===0?[[ownZh,botZh],[ownEn,botEn]]:[[botZh,ownZh],[botEn,ownEn]];
}
function chatFullscreenCopy(full){
  const en=chatEnglish();
  return full
    ? {label:en?'Exit fullscreen':'退出全屏', english:'Exit fullscreen', title:en?'Exit fullscreen (Esc)':'退出全屏（Esc）'}
    : {label:en?'Fullscreen':'全屏', english:'Fullscreen', title:en?'Enter fullscreen':'进入全屏'};
}
function syncChatFullscreen(full){
  chatFullscreenState=Boolean(full);
  const button=shell&&shell.chatFullscreen;
  if(!button)return;
  const copy=chatFullscreenCopy(chatFullscreenState);
  button.textContent=copy.label;
  button.dataset.systemEnglish=copy.english;
  button.setAttribute('aria-label',copy.title);
  button.removeAttribute('title');
  button.setAttribute('aria-pressed',String(chatFullscreenState));
}
function chatParentOrigin(){
  try{return new URL(document.referrer).origin;}catch(error){return location.origin;}
}
function chatEmbedded(){
  return window.parent!==window&&new URLSearchParams(location.search).get('embed')==='joyflock';
}
function toggleChatFullscreen(){
  if(document.documentElement.hasAttribute?.('data-native-game')){
    window.dispatchEvent(new CustomEvent('joyflock:native-toggle-fullscreen'));
    return;
  }
  if(chatEmbedded()){
    try{window.parent.postMessage({type:'joyflock:toggle-fullscreen'},chatParentOrigin());}catch(error){}
    return;
  }
  const doc=document;
  if(doc.fullscreenElement){try{doc.exitFullscreen?.();}catch(error){}}
  else if(doc.documentElement.requestFullscreen){try{doc.documentElement.requestFullscreen();}catch(error){}}
}


// Presentation reads archived scores without converting or rewriting room state.
export function poolSeatSummary(board,seat){
  const cells=board?.cells||[],legacy=cells.length>0&&cells.length<48,group=legacy?0:cells[49+seat]||0;
  return {legacy,group,score:Number(cells[(legacy?26:47)+seat]||0),targets:!legacy&&(group||isNineBall(board?.game))?targetsFor(cells,seat,board?.game):[]};
}

function createChat() {
  const arena=$('arena'),sidebar=arena.querySelector('.play-sidebar');
  shell={sidebar};
  const chat=element('section','pool-chat-panel'),head=element('div','pool-chat-heading'),title=element('h2','','房间聊天'),fullscreen=element('button','pool-chat-fullscreen','全屏');
  fullscreen.type='button';fullscreen.setAttribute('aria-pressed','false');
  fullscreen.addEventListener('click',toggleChatFullscreen);
  head.append(title,fullscreen);
  const log=element('div','pool-chat-log');log.setAttribute('role','log');log.setAttribute('aria-live','polite');log.setAttribute('aria-relevant','additions');log.setAttribute('aria-label','场内聊天消息');
  const empty=element('p','pool-chat-empty','和同房间的朋友聊两句吧。');log.append(empty);
  const note=element('p','pool-chat-notice'),form=element('form','pool-chat-form'),input=element('input'),send=element('button','','发送');
  input.type='text';input.maxLength=200;input.autocomplete='off';input.placeholder='发送消息…';input.setAttribute('aria-label','聊天消息');send.type='submit';form.append(input,send);
  const reactions=arena.querySelector('.reactions-panel');
  chat.append(head,log,note,reactions,form);if(arena.classList.contains('table-chat-layout'))arena.append(chat);else sidebar.prepend(chat);
  const leave=$('leave-play');leave.classList.add('pool-leave');
  form.onsubmit=sendMessage;
  Object.assign(shell,{chat,log,empty,note,input,send,chatFullscreen:fullscreen});
  /* Ask the parent for its current fullscreen state, mirror every broadcast,
     and redraw the label when the page language changes. */
  window.addEventListener('message',function(event){
    if(event.source!==window.parent)return;
    if(event.origin!==chatParentOrigin()&&event.origin!==location.origin)return;
    if(event.data?.type==='joyflock:game-fullscreen')syncChatFullscreen(Boolean(event.data.full));
    else if(event.data?.type==='joyflock:locale')syncChatFullscreen(chatFullscreenState);
  });
  document.addEventListener('fullscreenchange',function(){
    if(!chatEmbedded())syncChatFullscreen(Boolean(document.fullscreenElement));
  });
  window.addEventListener('joyflock:native-fullscreen',event=>syncChatFullscreen(event.detail===true));
  if(typeof MutationObserver!=='undefined'){
    new MutationObserver(function(){syncChatFullscreen(chatFullscreenState);})
      .observe(document.documentElement,{attributes:true,attributeFilter:['lang','data-locale']});
  }
  if(chatEmbedded()){
    try{window.parent.postMessage({type:'joyflock:fullscreen-query'},chatParentOrigin());}catch(error){}
  }
  syncChatFullscreen(Boolean(document.body.dataset.gameFullscreen));
}

function createShell() {
  const arena=$('arena'),panel=arena.querySelector('.game-panel'),sidebar=arena.querySelector('.play-sidebar');
  const top=element('div','pool-matchup'),players=$('seats'),clock=element('div','pool-match-clock');
  clock.append(element('span','pool-clock-label','回合'),$('turn-clock'));
  top.append(players,clock);panel.insertBefore(top,$('board'));
  const strip=element('div','pool-round-strip');strip.append($('status'),$('again'));panel.insertBefore(strip,$('board'));
  Object.assign(shell,{arena,panel,sidebar,top,strip});
  const feedback=element('div','pool-feedback');
  feedback.setAttribute('aria-hidden','true');panel.append(feedback);shell.feedback=feedback;
  /* A short, non-blocking caption over the table for every change of shooter.
     It lives in the panel (not inside #board) because renderPool() rewrites the
     board's innerHTML when it first builds the canvas. */
  const turnToast=element('div','pool-turn-toast');
  turnToast.setAttribute('aria-hidden','true');turnToast.hidden=true;
  turnToast.append(element('span','pool-turn-label'));
  panel.append(turnToast);shell.turnToast=turnToast;
  createResult();
  return shell;
}

// A result badge with an obvious meaning, instead of four unlabelled dots.
const RESULT_ICONS={
  win:`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M19 11h26v13a13 13 0 0 1-26 0V11Z" fill="currentColor" fill-opacity=".18"/>
    <path d="M19 16h-6v4a9 9 0 0 0 9 9M45 16h6v4a9 9 0 0 1-9 9"/>
    <path d="M32 37v8M24 51h16M27 45h10v6H27z"/>
  </svg>`,
  loss:`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M51 25A20 20 0 1 0 53 37"/><path d="M51 13v12H39"/>
    <path d="M32 23v11l8 5"/>
  </svg>`,
  draw:`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" aria-hidden="true">
    <path d="M15 25h34M15 39h34"/>
  </svg>`
};
const RESULT_EMBLEM_LABEL={win:'获胜',loss:'失利',draw:'平局'};
function setResultEmblem(kind){
  const emblem=shell.resultEmblem;
  if(!emblem||shell.resultIsPool||emblem.dataset.outcome===kind)return;
  emblem.dataset.outcome=kind;
  emblem.innerHTML=RESULT_ICONS[kind]||RESULT_ICONS.draw;
  emblem.setAttribute('aria-label',RESULT_EMBLEM_LABEL[kind]||'本局结束');
}
function createResult() {
  const dialog=element('dialog','pool-result-overlay'),card=element('section','pool-result-card');
  dialog.id='pool-result';dialog.setAttribute('aria-labelledby','pool-result-title');dialog.setAttribute('aria-describedby','pool-result-description');
  const confetti=element('div','pool-result-confetti');confetti.setAttribute('aria-hidden','true');
  const close=element('button','pool-result-close','×');close.type='button';close.setAttribute('aria-label','关闭结算');
  const label=element('p','pool-result-label','本局结束'),emblem=element('div','pool-result-emblem'),isFour=document.body.classList.contains('four-game')||gridResult;
  if(isFour)emblem.setAttribute('role','img');
  else {const ball=document.createElement('canvas');ball.width=160;ball.height=160;ball.setAttribute('aria-hidden','true');drawPoolBall(ball.getContext('2d'),8,80,76,53);emblem.append(ball);}
  const title=element('h2'),description=element('p','pool-result-description'),players=element('div','pool-result-players'),note=element('p','pool-result-note');
  title.id='pool-result-title';description.id='pool-result-description';note.setAttribute('role','status');note.hidden=true;
  const actions=element('div','pool-result-actions'),again=$('again');
  const nav=element('div','pool-result-nav'),toGame=element('button','pool-result-to-game','返回游戏页'),toHome=element('button','pool-result-to-home','返回首页');
  toGame.type='button';toHome.type='button';nav.append(toGame,toHome);
  again.textContent='再玩一局';again.type='button';actions.append(again,nav);
  const cardKids=[close,label,emblem,title,description,players];
  if(scoreTicker.panel)cardKids.push(scoreTicker.panel);
  if(pointsTicker.panel)cardKids.push(pointsTicker.panel);
  cardKids.push(actions,note);
  card.append(...cardKids);dialog.append(confetti,card);document.body.append(dialog);
  /* This button sits directly above "Leave game" in the sidebar. Mirror that
     button's classes instead of giving it a private skin: every game theme
     (generic / pool / snooker / four) styles .quiet + .pool-leave on the leave
     button, so the pair stays identical in width, height, radius and colour
     without duplicating per-theme CSS. */
  const reopen=element('button','pool-result-open '+$('leave-play').className,'查看本局结算');reopen.type='button';reopen.hidden=true;
  shell.sidebar.insertBefore(reopen,$('leave-play'));
  Object.assign(shell,{resultDialog:dialog,resultTitle:title,resultDescription:description,resultPlayers:players,resultNote:note,resultReopen:reopen,confetti,resultEmblem:emblem,resultIsPool:!isFour});
  /* Only the newly shared dialog follows the page locale. Pool / Connect Four
     keep their original fixed wording so this change cannot alter them. */
  if(gridResult&&document.documentElement.lang.toLowerCase().indexOf('en')===0){
    label.textContent='MATCH OVER';close.setAttribute('aria-label','Close result');
    again.textContent='Play again';reopen.textContent='View result';
    toGame.textContent='Back to game';toHome.textContent='Home';
  }
  close.onclick=()=>dialog.close();reopen.onclick=()=>openResult(false);
  toGame.onclick=()=>{dialog.close();$('home-link')?.click();};
  toHome.onclick=()=>{window.top.location.assign('/portal/index.html');};
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  dialog.addEventListener('close',()=>{scoreTicker.finish();pointsTicker.finish();clearConfetti();if(current?.board?.over&&document.body.dataset.screen==='play'){reopen.hidden=false;reopen.focus({preventScroll:true});}});
}

function clearConfetti() {
  clearTimeout(confettiTimer);confettiTimer=null;shell.confetti.replaceChildren();
  if(shell.confetti.parentNode!==shell.resultDialog)shell.resultDialog.prepend(shell.confetti);
}
function resultSfx(kind,key){
  const api=globalThis.__joyflockResultSfx;
  // resultKey is the same string the table shell uses, so render(), the dialog
  // and the confetti reveal can all ask for a sound without doubling it.
  if(api&&typeof api.play==='function')return api.play(kind,key||resultKey);
  return false;
}
function celebrateResult(kind,playSound) {
  clearConfetti();
  shell.confetti.dataset.outcome=kind;
  // The old pool-only arpeggio played on a win and never on a loss. All games
  // now share one celebration / defeat jingle, fired when the result appears.
  if(playSound)resultSfx(kind);
  if(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  const palette=kind==='win'?['#f5d584','#fff1be','#63d7cf','#89abff','#d1a2f0']:kind==='loss'?['#767676','#9b9b9b','#bdbdbd','#d8d8d8']:['#75d7d0','#afc5ff','#f1d899'];
  const count=kind==='win'?76:44,looping=kind!=='draw';
  for(let i=0;i<count;i++){
    const piece=element('i'),duration=1.8+Math.random()*1.1;
    // Win/loss confetti loops forever. All pieces used to start within 0.55s of
    // each other, so the first pass was one synchronized wave that fell off the
    // bottom together and left an empty screen until the differing durations
    // spread their phases out. Stratified negative delays put each piece at a
    // different point of its own cycle from frame 0: a continuous stream with
    // no initial wave and no lull. Draw confetti is a single finite burst, so
    // it keeps a small positive stagger.
    const phase=(i+Math.random())/count;
    const delay=looping?-(0.05+phase*(duration-0.05)):Math.random()*.55;
    piece.style.setProperty('--x',(Math.random()*100).toFixed(2)+'%');piece.style.setProperty('--drift',(Math.random()*32-16).toFixed(2)+'vw');
    piece.style.setProperty('--delay',delay.toFixed(2)+'s');piece.style.setProperty('--duration',duration.toFixed(2)+'s');
    piece.style.setProperty('--spin',(Math.random()*900-450).toFixed(0)+'deg');piece.style.setProperty('--color',palette[i%palette.length]);piece.style.setProperty('--width',(5+Math.random()*5).toFixed(1)+'px');
    shell.confetti.append(piece);
  }
  if(kind==='draw')confettiTimer=setTimeout(clearConfetti,3600);
}
function openResult(celebrate,carryConfetti=false) {
  if(!current?.board?.over||document.body.dataset.screen!=='play'||shell.resultDialog.open)return;
  shell.resultDialog.showModal();scoreTicker.reveal();pointsTicker.reveal();$('again').focus({preventScroll:true});
  const outcome=shell.resultDialog.dataset.outcome;
  if(carryConfetti){
    const {resultDialog,confetti}=shell;
    // moveBefore keeps CSS animation state. The fallback prepend detaches the
    // node, which restarts every animation; restore their currentTime so the
    // stream keeps falling instead of jumping back to a synchronized start.
    const times=resultDialog.moveBefore?null:Array.from(confetti.children,piece=>piece.getAnimations()[0]?.currentTime??null);
    if(resultDialog.moveBefore)resultDialog.moveBefore(confetti,resultDialog.firstChild);
    else resultDialog.prepend(confetti);
    if(times)Array.from(confetti.children,(piece,i)=>{
      const anim=piece.getAnimations()[0];
      if(anim&&typeof times[i]==='number')anim.currentTime=times[i];
    });
  }else if(celebrate||outcome==='win'||outcome==='loss'){
    celebrateResult(outcome,celebrate);
    // Archived rooms have no 3-second preview, so the reveal itself is the
    // first moment the player sees the result. Reopening a finished game is
    // swallowed by the once-per-game de-dupe in the sound module.
    if(!celebrate)resultSfx(outcome);
  }
}
function resultDetails(options) {
  const winner=Number(options.board.winner)||0,personal=!!options.room||!!options.computer,you=options.room?Number(options.room.you)+1:(Number(options.mySeat)||1);
  const name=options.names?.[winner-1]||'玩家',kind=!winner?'draw':personal&&winner!==you?'loss':'win';
  return {winner,kind,title:!winner?'本局平局':kind==='loss'?'本局失利':personal||name==='你'?'你获胜了！':name+' 获胜！',description:!winner?'势均力敌，再来一局。':kind==='loss'?name+' 赢得了这一局。':personal?'这一局，胜利属于你。':'精彩对局，感谢两位玩家。'};
}
function updateResult(options) {
  const ended=Boolean(options.board?.over)&&document.body.dataset.screen==='play';
  // The turn caption stays available to the shared UI, but no result row occupies the table header.
  if(shell.strip)shell.strip.hidden=true;
  if(!ended){
    if(resultFrame)cancelAnimationFrame(resultFrame);resultFrame=0;resultKey=null;resultShown=false;resultPlayersKey=null;
    if(shell.resultDialog.open)shell.resultDialog.close();clearConfetti();shell.resultReopen.hidden=true;shell.resultNote.hidden=true;
    scoreTicker.hide();pointsTicker.hide();return;
  }
  const localKey=document.body.classList.contains('connect-four-game')?'local-four-'+options.generation:'local';
  const key=[options.room?.id||localKey,options.board.moves,options.board.winner].join(':'),details=resultDetails(options);
  if(gridResult){
    const en=document.documentElement.lang.toLowerCase().indexOf('en')===0;
    if(!details.winner){
      /* Puzzle / Draw are co-op or free-play: a zero winner is a completed
         round, not a draw. */
      if(gridGame==='puzzle'){details.title=en?'Puzzle solved!':'拼图完成！';details.description=en?'Nice teamwork. Play another round.':'合作愉快，再来一局。';}
      else if(gridGame==='draw'){details.title=en?'Round over':'本轮结束';details.description=en?'Pencils down — take a look at the drawings.':'画笔放下，看看大家的作品。';}
      else if(en){details.title='Draw';details.description='Evenly matched. Play another round.';}
    }else if(en){
      details.title=details.kind==='loss'?'You lost this one':'You won!';
      details.description=details.kind==='loss'?(options.names?.[details.winner-1]||'Opponent')+' won this round.':'The win is yours.';
    }
  }
  if(resultKey!==key){
    if(resultFrame)cancelAnimationFrame(resultFrame);resultFrame=0;resultKey=key;resultShown=false;resultPlayersKey=null;
    if(shell.resultDialog.open)shell.resultDialog.close();clearConfetti();shell.resultNote.hidden=true;
    scoreTicker.hide();pointsTicker.hide();
  }
  shell.resultDialog.dataset.outcome=details.kind;setResultEmblem(details.kind);shell.resultTitle.textContent=details.title;shell.resultDescription.textContent=details.description;
  const isFour=document.body.classList.contains('four-game')||gridResult;
  const isPool=!isFour;   // only Pool has pocketed-ball counts / legacy boards
  const archived=isPool&&poolSeatSummary(options.board,1).legacy;
  if(archived)shell.resultDescription.textContent='这是升级前的共用目标对局，下一局将使用全色／花色分组玩法。';
  /* Only rebuild when the DISPLAYED result actually changes. `key` already
     covers room id + moves + winner, so repeated online snapshots of one
     finished match produce the same signature and never restart the trophy
     entrance animation. Locale / names / scores / archived state are included
     because they change what the cards print. */
  const playersKey=[key,document.documentElement.lang,isFour?1:0,archived?1:0,
    (options.names||[]).join('|'),Array.isArray(options.scores)?options.scores.join(','):''].join('~');
  if(resultPlayersKey!==playersKey){
    resultPlayersKey=playersKey;
    shell.resultPlayers.replaceChildren(...[0,1].map(i=>{
      const won=details.winner===i+1;
      /* The artwork follows the RESULT, never the seat: the winner gets the gold
         trophy, the other player the cool "next time" cup, and a draw gives both
         the neutral badge. All three SVGs share the same trophy silhouette. */
      const artKind=!details.winner?'draw':won?'winner':'loser';
      const row=element('div','pool-result-player'),copy=element('div','pool-result-player-copy');
      const name=element('strong','',options.names?.[i]||'玩家 '+(i+1)),score=element('span','','落袋 '+poolSeatSummary(options.board,i+1).score+' 颗');
      row.classList.toggle('winner',won);row.dataset.outcome=artKind;name.title=name.textContent;copy.append(name);
      if(isPool)copy.append(score);
      /* Bubble Duel is scored in points rather than pocketed balls. Its canvas
         result card used to print the two totals; the shared dialog now carries
         them so removing that card loses no information. */
      else if(Array.isArray(options.scores)){
        const en=document.documentElement.lang.toLowerCase().indexOf('en')===0;
        copy.append(element('span','',Number(options.scores[i]||0)+(en?' pts':' 分')));
      }
      const art=element('img','pool-result-player-art');
      art.src='/assets/result/'+artKind+'.svg?v=20261115-joincoin1';art.alt='';art.decoding='async';
      art.setAttribute('aria-hidden','true');
      /* A late rebuild (e.g. locale switch) must not replay the entrance
         animation on an already visible dialog. */
      if(resultShown)art.style.animation='none';
      row.append(copy,art);
      if(won)row.append(element('b','pool-result-winner',document.documentElement.lang.toLowerCase().indexOf('en')===0&&gridResult?'Winner':'胜方'));return row;
    }));
  }
  const again=$('again');again.hidden=false;
  // Move the original action, then wrap its existing local/online handler only once.
  if(!again._poolResultAction&&typeof again.onclick==='function'){
    const restart=again.onclick;again._poolResultAction=true;
    again.onclick=async event=>{
      if(rematchBusy)return;const key=resultKey;rematchBusy=true;again.disabled=true;again.textContent='正在准备…';shell.resultNote.hidden=true;
      try{await restart.call(again,event);}finally{
        rematchBusy=false;again.disabled=false;again.textContent='再玩一局';
        if(current?.board?.over&&resultKey===key){const message=$('message')?.textContent||'';shell.resultNote.textContent=message;shell.resultNote.hidden=!message;}
      }
    };
  }
  if(resultShown||resultFrame)return;
  const connectFour=document.body.classList.contains('connect-four-game');
  const preview=(isPool&&!archived||connectFour)&&details.kind!=='draw';
  // Let the landing, connected counters and win jingle finish on the board.
  const previewDuration=connectFour?1600:3000;
  /* Grid games (gomoku, chess, ...) reach updateResult() straight from
     render(): updateGridResult() is synchronous, gridResult makes isFour
     true and isPool false, and none of the canvas/drop animation guards
     below apply. The dialog therefore covered the board on the very next
     frame (~16ms), before the winning stone or five-in-a-row could be seen.
     Hold the finished board for 900ms on a win or a loss. Pool keeps its
     3000ms preview, Connect Four its 1600ms drop, and a draw stays instant. */
  const gridHoldMs=gridResult&&!connectFour&&details.kind!=='draw'?900:0;
  let celebrationStartedAt=null,holdStartedAt=null;
  const reveal=now=>{
    resultFrame=0;if(resultKey!==key||!current?.board?.over||document.body.dataset.screen!=='play')return;
    // Let the winning shot, pocket movement and return-channel rebound finish before covering the table.
    if($('board')._fourDropAnimating||$('board').querySelector('.four-drop-hidden')||$('board')._animating||$('board')._striking||document.hidden||document.querySelector('dialog[open]:not(.pool-result-overlay)')){resultFrame=requestAnimationFrame(reveal);return;}
    if(preview&&celebrationStartedAt===null){
      celebrateResult(details.kind,true);
      document.body.append(shell.confetti);
      celebrationStartedAt=now;
    }
    if(preview&&now-celebrationStartedAt<previewDuration){resultFrame=requestAnimationFrame(reveal);return;}
    if(gridHoldMs){
      if(holdStartedAt===null)holdStartedAt=now;
      if(now-holdStartedAt<gridHoldMs){resultFrame=requestAnimationFrame(reveal);return;}
    }
    resultShown=true;shell.resultReopen.hidden=false;openResult(!archived,preview);
  };
  resultFrame=requestAnimationFrame(reveal);
}

function chatRoomKey(options){
  // A server room is shared by its id. A local game has no server room, so
  // every window playing the same game on this device shares one live room.
  if(options.room?.id)return 'room:'+options.room.id;
  return 'local:'+(new URLSearchParams(location.search).get('game')||'four');
}
function openChannel(key){
  if(channel){try{channel.close();}catch(error){}channel=null;}
  roomKey=key;
  if(typeof BroadcastChannel==='undefined')return;
  try{
   channel=new BroadcastChannel('joyflock:room-chat:'+key);
   channel.onmessage=event=>{
    const data=event.data;
    if(!data||data.type!=='chat'||data.key!==roomKey||data.from===clientId)return;
    acceptMessages(data.events);
   };
  }catch(error){channel=null;}
}
function broadcast(events){
  if(!channel||!Array.isArray(events)||!events.length)return;
  try{channel.postMessage({type:'chat',key:roomKey,from:clientId,events});}catch(error){}
}
function clearMessages() {
  shell.log.replaceChildren(shell.empty);shell.empty.hidden=false;cursor=0;localId=0;
  seen=new Set();
}
function appendMessage(event) {
  const nearBottom=shell.log.scrollHeight-shell.log.scrollTop-shell.log.clientHeight<65;
  const text=String(event.text||'').slice(0,200),row=element('div','pool-chat-message'),line=element('p','pool-chat-line'),name=element('strong','',(event.system?'系统':'['+String(event.name||'玩家').slice(0,64)+']')+'：'),time=element('time'),body=element('span','pool-chat-body',text);
  if(event.system){
    row.classList.add('pool-chat-system');
    row.dataset.kind=event.kind||'normal';
    name.dataset.systemEnglish='System: ';
    body.dataset.systemEnglish=event.english;
  }
  row.classList.toggle('pool-chat-emoji',['😂','👋','🎉','😮','❤️','👍'].includes(text));
  const when=new Date(event.time||Date.now());time.textContent=when.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});time.dateTime=when.toISOString();
  line.append(name,body);
  for(const id of event.potted||[]){
    const ball=element('canvas','pool-chat-ball');
    ball.width=54;ball.height=54;
    ball.setAttribute('role','img');ball.setAttribute('aria-label',String(id));
    drawPoolBall(ball.getContext('2d'),id,27,26,21);
    line.append(ball);
  }
  row.append(line,time);shell.empty.hidden=true;shell.log.append(row);
  while(shell.log.querySelectorAll('.pool-chat-message').length>80)shell.log.querySelector('.pool-chat-message').remove();
  if(nearBottom)shell.log.scrollTop=shell.log.scrollHeight;
}
function acceptMessages(events,fromPoll) {
  for(const event of Array.isArray(events)?events:[]) {
    if(!event)continue;
    // Server messages are keyed by their id; locally originated ones carry a
    // clientId. Both dedupe against the REST poll and the live channel.
    const key=event.clientId?'c:'+event.clientId:'s:'+event.id;
    if(seen.has(key))continue;
    seen.add(key);
    // Only server ids advance the REST cursor. Locally generated ids are
    // negative and must never make the next poll skip server history.
    if(fromPoll&&Number.isSafeInteger(event.id)&&event.id>0&&event.id>cursor)cursor=event.id;
    // Room-skin relay notes are transport, not chat; keep them out of the log.
    if(/^\[jft:[a-z0-9]+:[a-z]+\]$/.test(String(event.text||'')))continue;
    appendMessage(event);
  }
}
async function pollChat() {
  if(polling||!current?.room||document.hidden||document.body.dataset.screen!=='play')return;
  const id=current.room.id;polling=true;
  try {
    const events=await current.request('/api/table/rooms/'+id+'/chat?after='+cursor);
    if(roomId===id)acceptMessages(events,true);
  } catch(error) {
    if(roomId===id&&![403,404].includes(error.status))shell.note.textContent='聊天暂时断开，正在重连…';
  } finally {polling=false;}
}
// Catch up the moment a backgrounded tab comes back, instead of waiting for
// the next interval tick.
if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(!document.hidden)pollChat();},{passive:true});
async function sendMessage(event) {
  event.preventDefault();const text=shell.input.value.trim();
  if(await sendChatText(text)&&shell.input.value.trim()===text)shell.input.value='';
}
async function sendChatText(text) {
  if(!text||sending||!current)return false;
  if(Array.from(text).length>200){shell.note.textContent='每条消息最多200个字符。';return false;}
  sending=true;shell.send.disabled=true;const id=current.room?.id;
  try {
    if(id) {
      const events=await current.request('/api/table/rooms/'+id+'/chat',{commandId:crypto.randomUUID(),text});
      if(roomId!==id)return false;
      acceptMessages(events);broadcast(events);
    } else {
      // A local game has no server room: publish to the shared device room so
      // every open window sees the line at once, deduped by clientId.
      const event={id:-(Date.now()*1000+(++clientSeq%1000)),clientId:clientId+':'+clientSeq,
        name:viewerName(current),text,time:Date.now()};
      acceptMessages([event]);broadcast([event]);
    }
    shell.note.textContent='消息在本房间实时同步。';
    return true;
  } catch(error) {
    shell.note.textContent=error.status===429?'发送太快，请稍后再试。':[403,404,409].includes(error.status)?'当前房间不可发送，请重新进入对局。':'发送失败，内容已保留，请重试。';
    return false;
  } finally {setTimeout(()=>{sending=false;shell.send.disabled=false;},1000);}
}

// Pool emoji buttons use the same authenticated chat stream as typed messages.
export async function sendPoolChatEmoji(emoji){
  if(!['😂','👋','🎉','😮','❤️','👍'].includes(emoji))return false;
  return sendChatText(emoji);
}
// Keep reactions from an older connected client visible without floating over the table.
export function appendPoolChatReaction(event){
  if(!shell||!current)return;
  appendMessage({name:event.name,text:event.emoji,time:event.time});
}

let feedbackTimer, feedbackKey, lastPoolBoard, feedbackFrame=0, feedbackPromptUntil=0;
let pendingFeedback=[];
function updatePoolFeedback(options) {
  const {board,room,computer}=options;
  if(feedbackKey!==chatKey||document.body.dataset.screen!=='play'){
    feedbackKey=chatKey;
    clearTimeout(feedbackTimer);shell.feedback?.replaceChildren();
    lastPoolBoard=null;
    pendingFeedback=[];
    feedbackPromptUntil=0;
    cancelAnimationFrame(feedbackFrame);
    feedbackFrame=0;
  }
  if(document.body.dataset.screen!=='play'||board.cells.length<48)return;
  if(lastPoolBoard?.moves===board.moves)return;
  const previous=lastPoolBoard;
  lastPoolBoard=board;
  const tell=(text,english,kind,seat)=>pendingFeedback.push({system:true,text,english,kind,seat});
  const [zh,en]=feedbackNames(options);
  const player=seat=>[zh[seat],en[seat]].map(value=>value?'['+value+']':'');
  const [next,nextEn]=player(board.turn-1);
  if(board.moves===0){
    tell('对局开始，'+next+'开球。','Game started. '+nextEn+' breaks.');
  }else{
    const result=board.fen||'';
    const previousShot=previous?.moves===board.moves-1?previous:null;
    const before=previousShot?.cells??board.history?.[0]?.split(',').map(Number);
    const potted=[];
    for(let id=1;id<=15;id++)if(before?.[id*3+2]===1&&board.cells[id*3+2]===0)potted.push(id);
    if(potted.length){
      const [shooter,shooterEn]=player((previousShot?.turn??0)-1);
      const shot=board.moves;
      const text=(shooter?shooter+'的第 '+shot+' 杆，':'第 '+shot+' 杆，')+'本杆落袋 ';
      const english=(shooterEn?shooterEn+' · ':'')+'Shot '+shot+' · Pocketed: ';
      pendingFeedback.push({system:true,text,english,potted,shot:board.moves,over:!!board.over});
    }
    if(result.startsWith('犯规：')){
      const offenderSeat=previous?.turn??(3-board.turn);
      const [offender,offenderEn]=player(offenderSeat-1);
      const reason=result.slice(3);
      const englishReason={'白球落袋':'Cue ball pocketed','白球未碰到目标球':'No legal ball hit','白球先碰到非目标球':'Wrong ball hit first'}[reason]||'Illegal shot';
      tell(offender+'犯规：'+reason+'。',offenderEn+' fouled: '+englishReason+'.','foul',offenderSeat);
      if(!board.over&&board.cells[PENALTY_VISIT]===PENALTY_READY){
        tell(next+'获得奖励：额外一杆。',nextEn+' earned an extra shot.','reward');
      }
    }
    if(previous&&!previous.cells[50]&&board.cells[50]){
      const solidsSeat=board.cells[50]===1?1:2;
      const [solid,solidEn]=player(solidsSeat-1);
      const [stripe,stripeEn]=player(2-solidsSeat);
      pendingFeedback.push({
        system:true,solidsSeat,
        text:solid+'打全色球，'+stripe+'打花色球。',
        english:solidEn+' plays solids. '+stripeEn+' plays stripes.'
      });
    }
    if(!board.over&&board.cells[PENALTY_VISIT]===PENALTY_ACTIVE){
      tell(next+'现在可以打奖励杆。',nextEn+' can now take the extra shot.','reward',board.turn);
    }else if(!board.over&&previous?.turn!==board.turn){
      tell('轮到'+next+'。','Next turn: '+nextEn+'.');
    }
    if(board.over){
      const [winner,winnerEn]=player(board.winner-1);
      const nine=isNineBall(board.game);
      const decisivePotted=potted.includes(nine?9:8)||result===(nine?'9号球落袋':'8号球落袋');
      const foul=result.startsWith('犯规：');
      const shooter=previousShot?.turn??(foul&&board.winner?3-board.winner:0);
      if(decisivePotted&&shooter&&board.winner&&shooter!==board.winner){
        const [loser,loserEn]=player(shooter-1);
        const [reason,reasonEn]=result==='犯规：白球落袋'
          ?(nine?['9号球和白球同杆落袋','pocketed the 9-ball and cue ball on the same shot']:['黑球和白球同杆落袋','pocketed the 8-ball and cue ball on the same shot'])
          :foul
            ?(nine?['犯规时打进9号球','pocketed the 9-ball on a foul']:['犯规时打进黑球','pocketed the 8-ball on a foul'])
            :(nine?['提前打进9号球','pocketed the 9-ball too early']:['提前打进黑球','pocketed the 8-ball too early']);
        tell(loser+reason+'，判负。'+winner+'获胜。',loserEn+' '+reasonEn+' and loses. '+winnerEn+' wins.','foul');
      }else tell(winner?winner+'获胜。':'本局平局。',winnerEn?winnerEn+' wins.':'The game ended in a draw.');
    }
  }
  if(feedbackFrame||!pendingFeedback.length)return;
  const reveal=()=>{
    if($('board')._animating||$('board')._striking){
      feedbackFrame=requestAnimationFrame(reveal);
      return;
    }
    feedbackFrame=0;
    for(const message of pendingFeedback)appendMessage(message);
    /* One chime per shot, at the same moment the "落袋" system line appears —
       i.e. after the pocket/return animation has finished. The match-ending
       8-ball already gets the win/lose fanfare, so don't stack the two. */
    const scored=pendingFeedback.find(message=>Array.isArray(message.potted)&&message.potted.length);
    if(scored&&!scored.over)playPocketChime(scored.potted.length,'m'+scored.shot);
    const viewer=room?Number(room.you)+1:computer?1:null;
    const kinds=new Set(pendingFeedback
      .filter(message=>message.seat&&(message.kind==='reward'||viewer===null||message.seat===viewer))
      .map(message=>message.kind==='reward'&&viewer!==null&&message.seat!==viewer?'opponent-reward':message.kind));
    const assignment=pendingFeedback.find(message=>message.solidsSeat);
    if(kinds.size||assignment){
      const labels=Array.from(kinds,kind=>{
        const [text,english]={
          foul:['犯规','Foul'],
          reward:['奖励一杆','Extra shot'],
          'opponent-reward':['对方奖励一杆','Opponent gets an extra shot']
        }[kind];
        const label=element('span','',text);
        label.dataset.kind=kind;
        label.dataset.systemEnglish=english;
        return label;
      });
      if(assignment){
        const [text,english]=viewer===null
          ?[assignment.text,assignment.english]
          :viewer===assignment.solidsSeat
            ?['你打全色球','You play solids']
            :['你打花色球','You play stripes'];
        const label=element('span','',text);
        label.dataset.kind='groups';
        label.dataset.systemEnglish=english;
        labels.push(label);
      }
      shell.feedback.replaceChildren(...labels);
      clearTimeout(feedbackTimer);
      const hold=assignment?2400:1700;
      feedbackTimer=setTimeout(()=>shell.feedback.replaceChildren(),hold);
      /* Feedback owns the first slot over the cloth. The turn caption waits
         until this card has faded, and a still-visible caption is dismissed
         so the two never stack. A seat change then re-queues the turn text. */
      feedbackPromptUntil=Date.now()+hold;
      const toast=shell.turnToast;
      if(toast&&!toast.hidden){toast.hidden=true;clearTimeout(turnPromptTimer);turnPromptTimer=0;}
    }
    pendingFeedback=[];
  };
  feedbackFrame=requestAnimationFrame(reveal);
}

/* Turn announcement follows the VISIBLE turn, not the server's turn field.
   The server switches `board.turn` as soon as a shot is accepted, while the
   client is still replaying that shot: balls are rolling, the shoot button is
   disabled and the player cannot move yet. Announcing "your turn" at that
   point feels premature. Wait for the replay / cue animation to settle and —
   for the local player — for the shoot control to actually be armed, then
   announce whoever really holds the table. Seat changes are de-duped by seat
   (not by move count), so potting several balls in a row stays one caption,
   while an A -> B -> A exchange is announced again. */
let turnPromptSeat=null,turnPromptChat=null,turnPromptPending=null,turnPromptBoard=null;
let turnPromptFrame=0,turnPromptTimer=0;
function resetTurnPrompt(){
  cancelAnimationFrame(turnPromptFrame);turnPromptFrame=0;
  clearTimeout(turnPromptTimer);turnPromptTimer=0;
  turnPromptSeat=null;turnPromptChat=null;turnPromptPending=null;turnPromptBoard=null;
  if(shell?.turnToast)shell.turnToast.hidden=true;
}
function showTurnPrompt(text,english,kind){
  const toast=shell.turnToast;if(!toast)return;
  const label=toast.querySelector('.pool-turn-label');
  label.textContent=text;label.dataset.systemEnglish=english;
  toast.dataset.kind=kind;toast.hidden=false;
  // Restart the one-shot animation even when the previous caption is still up.
  toast.style.animation='none';void toast.offsetWidth;toast.style.animation='';
  clearTimeout(turnPromptTimer);
  turnPromptTimer=setTimeout(()=>{toast.hidden=true;turnPromptTimer=0;},2050);
}
function updatePoolTurnPrompt({board,room,computer,names}){
  if(document.body.dataset.screen!=='play'||board.over||board.cells.length<48){resetTurnPrompt();return;}
  const seat=board.turn,you=room?Number(room.you)+1:computer?1:0;
  const mine=you>0&&you===seat;
  const seatName=(names||[])[seat-1]||'';
  turnPromptBoard=board;
  // A new room / fresh game restarts the sequence even when the same seat breaks.
  if(turnPromptChat!==chatKey){turnPromptChat=chatKey;turnPromptSeat=null;turnPromptPending=null;}
  if(seat!==turnPromptSeat){
    turnPromptSeat=seat;
    turnPromptPending={seat,mine,
      text:mine?'该你击球':you?'对方击球':'轮到'+seatName+'击球',
      english:mine?'Your turn':you?"Opponent's turn":seatName+' to shoot',
      kind:mine?'you':'opponent'};
  }
  if(!turnPromptPending||turnPromptFrame)return;
  const reveal=()=>{
    turnPromptFrame=0;
    const pending=turnPromptPending,latest=turnPromptBoard,host=$('board');
    if(!pending||!latest||!host||turnPromptChat!==chatKey||
       document.body.dataset.screen!=='play'||latest.over)return;
    /* Feedback first, turn announcement second. Wait while a foul / reward /
       group card is queued or on screen, so "对方击球" never appears above or
       at the same time as "犯规". */
    if(pendingFeedback.length||feedbackFrame||Date.now()<feedbackPromptUntil){
      turnPromptFrame=requestAnimationFrame(reveal);return;
    }
    const countdown=host.querySelector('.pool-countdown');
    const beforeBreak=(countdown&&!countdown.hidden)||
      Date.now()+(host._serverOffset||0)<(host._openingUntil||0);
    // Balls still rolling, a cue still swinging or another replay queued: the
    // next shooter has not actually taken the table yet.
    const rolling=host._animating||host._striking||host._queued;
    const cue=host._opponentCue||host._cancelOpponentCue;
    let settled;
    if(pending.mine){
      // "确实到我了": the shoot button must really be armed. _ready() also
      // covers a pending request, the room phase, the break clock and game over.
      settled=!rolling&&!cue&&typeof host._ready==='function'&&host._ready();
    }else{
      // The opponent's turn begins as soon as the previous shot has settled;
      // their cue / replay may already be visible by then.
      settled=!rolling;
    }
    if(beforeBreak||!settled){turnPromptFrame=requestAnimationFrame(reveal);return;}
    turnPromptPending=null;
    showTurnPrompt(pending.text,pending.english,pending.kind);
  };
  turnPromptFrame=requestAnimationFrame(reveal);
}

let turnHighlightFrame=0;
function updatePoolTurnHighlight(board){
  cancelAnimationFrame(turnHighlightFrame);
  const host=$('board');
  const sync=()=>{
    const replaying=host._animating;
    const turn=replaying?host._replayTurn:board.over?0:board.turn;
    Array.from($('seats').children).forEach((seat,i)=>seat.classList.toggle('active',turn===i+1));
    if(replaying&&document.body.dataset.screen==='play')turnHighlightFrame=requestAnimationFrame(sync);
  };
  sync();
}

export function updatePoolShell(options) {
  updateTableChat(options);
  if(!shell.top)createShell();
  updatePoolFeedback(options);
  updatePoolTurnPrompt(options);
  updateResult(options);
  updatePoolTurnHighlight(options.board);
  const seats=$('seats').children;
  for(let i=0;i<seats.length;i++) {
    const seat=seats[i];
    const copy=seat.querySelector('.seat-copy')||seat;
    let balls=copy.querySelector('.pool-pocketed');
    if(!balls){balls=element('div','pool-pocketed');copy.append(balls);}
    const summary=poolSeatSummary(options.board,i+1),group=summary.group;
    // Show only the balls that are actually still on the table. Pocketed targets
    // disappear instead of leaving a fixed empty recess, so the row stays compact.
    const ids=(summary.targets||[]).filter(id=>Number.isInteger(id)&&id>0);
    balls.setAttribute('aria-label',summary.legacy?'旧版对局':isNineBall(options.board?.game)?'当前最小号目标球':group===1?'全色目标球':group===2?'花色目标球':'首次有效进球后分组');
    balls.replaceChildren(...ids.map(id=>{
      const b=document.createElement('canvas');b.width=108;b.height=108;b.className='pool-target-ball';b.setAttribute('aria-label',id+'号目标球');drawPoolBall(b.getContext('2d'),id,54,51,40.5);return b;
    }));
  }
}

export function updateFourResult(options){
  if(!shell.resultDialog)createResult();
  updateResult(options);
}

/* Shared result dialog for every game that used to show the win only in the
   sidebar. updateTableChat() has already created the sidebar shell by the
   time syncPresentation() reaches here. */
export function updateGridResult(options){
  gridResult=true;
  gridGame=new URLSearchParams(location.search).get('game')||'';
  if(!shell)createChat();
  if(!shell.resultDialog)createResult();
  updateResult(options);
}

export function updateTableChat(options){
  if(!shell)createChat();
  current=options;
  const nextId=options.room?.id||null;
  const nextChatKey=nextId||'local:'+options.generation;
  const nextRoomKey=chatRoomKey(options);
  // The live channel follows the room, not the individual game: a rematch or
  // a new local round keeps the same room and the same connected windows.
  if(nextRoomKey!==roomKey){
    openChannel(nextRoomKey);
    shell.note.textContent='消息在本房间实时同步。';
  }
  if(nextChatKey!==chatKey){chatKey=nextChatKey;roomId=nextId;clearMessages();}
  const playing=document.body.dataset.screen==='play';
  if(options.room&&playing){if(!timer)timer=setInterval(pollChat,CHAT_POLL_MS);pollChat();}
  else if(timer){clearInterval(timer);timer=null;}
}
