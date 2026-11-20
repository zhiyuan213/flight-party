/* Personal game decorations. Four/Gomoku/XO each dress a seat's own pieces;
 * Four and Chess can dress their shared board. Seasonal Four themes own
 * their complete appearance. Room profiles are public visual
 * selections, not evidence of purchases or server-verified entitlements. */
import {VERSION,resolveBoard,resolveShared,tierOf,pointsOf,themeOf,botOpponent}
  from './cosmetics-rules.js?v=20261112-gamelanes1';
import {getBotLevel,BOT_LEVEL_KEY,BOT_LEVEL_KEY_PREFIX,BOT_GAME_IDS}
  from '../bot-difficulty.js?v=20261112-gamelanes1&nine=20261120-nineball1&power=20261120-poolpower30';
import {emblemUrl,markUrl} from './personal-piece-art.js';

const SHOP_KEY='joyflock.shop.v1';
const GAME_KEYS=['four','gomoku','chess','xo'],PERSONAL=['four','gomoku','xo'];
const SHARED_BOARDS=['four','chess','xo'];
const BILLIARDS=['pool','nineball','snooker'];
const DEFAULT_BALL='ball-default',DEFAULT_CUE='cue-default',DEFAULT_TABLE='table-default';
const BASELINE='default';
const isBaseline=id=>themeOf(id)===BASELINE;
const PERSONAL_THEMES=['default','neon','jade','aurora','coral','pearl'];
/* Four-only pink counters for seat 2: their own new badge set, on the pink
   team base (--four-two). They never apply to Gomoku stones or XO marks. */
const PINK_THEMES=['default','blossom','heart','bow','diamond','candy'];
const ALL_PIECE_THEMES=[...PERSONAL_THEMES,...PINK_THEMES.filter(t=>t!=='default')];
const BILLIARD_SKIN_THEMES=['default','neon','crystal','jade','galaxy','aurora'];
const skinTheme=(id,billiards=false)=>{const t=themeOf(id);const list=billiards?BILLIARD_SKIN_THEMES:ALL_PIECE_THEMES;return list.includes(t)&&t!=='default'?t:'';};
const validId=(id,game,role)=>PERSONAL_THEMES.some(t=>id===game+'-'+role+'-'+t);
const validPinkId=(id,game)=>PINK_THEMES.some(t=>id===game+'-pink-piece-'+t);
const selected=(id,game,role)=>validId(id,game,role)?id:game+'-'+role+'-default';
const selectedPink=(id,game)=>validPinkId(id,game)?id:game+'-pink-piece-default';
const validWhiteId=(id,game)=>PERSONAL_THEMES.some(t=>id===game+'-white-piece-'+t);
const selectedWhite=(id,game)=>validWhiteId(id,game)?id:game+'-white-piece-default';
const validOId=(id,game)=>PERSONAL_THEMES.some(t=>id===game+'-o-piece-'+t);
const selectedO=(id,game)=>validOId(id,game)?id:game+'-o-piece-default';
let opponentOverride=null,lastMatchKey=null,lastDecision=null,lastState=null,lastOptions={};

function savedEquipped(){
  let saved={};try{saved=JSON.parse(localStorage.getItem(SHOP_KEY)||'{}')||{};}catch{}
  return saved.equipped&&typeof saved.equipped==='object'?saved.equipped:{};
}
function readEquipped(){
  const e=savedEquipped();
  const pick=(id,base)=>['default','neon','crystal','jade','galaxy','aurora'].some(t=>id===base.replace('default',t))?id:base;
  const out={ball:pick(e.ball,DEFAULT_BALL),cue:pick(e.cue,DEFAULT_CUE),table:pick(e.table,DEFAULT_TABLE)};
  for(const game of GAME_KEYS){
    out[game+'Piece']=PERSONAL.includes(game)?selected(e[game+'Piece'],game,'piece'):game+'-piece-default';
    out[game+'Board']=SHARED_BOARDS.includes(game)?selected(e[game+'Board'],game,'board'):game+'-board-default';
  }
  out['fourPiecePink']=selectedPink(e['fourPiecePink'],'four');
  out['gomokuPieceWhite']=selectedWhite(e['gomokuPieceWhite'],'gomoku');
  out['xoPieceO']=selectedO(e['xoPieceO'],'xo');
  return out;
}
/* The practice opponent's tier must follow THIS game's saved difficulty, so
   the seat card agrees with the level the local bot actually plays at. An
   unset or invalid value falls back to Easy (never silently to Normal). */
function practiceGame(){
  try{
    const raw=new URLSearchParams(globalThis.location?.search||'').get('game');
    return BOT_GAME_IDS.includes(raw)?raw:'four';
  }catch{return 'four';}
}
function botLevel(){return getBotLevel(undefined,practiceGame());}
function myProfile(equip,game){
  const wallet=window.__joyflockPoints?.get?.()||{},appearance=window.__joyflockMe?.appearance||{};
  const gamePoints=window.__joyflockGamePoints?.get?.()||{},board=SHARED_BOARDS.includes(game)?equip[game+'Board']:'';
  return {vip:!!wallet.vip||!!appearance.member,annualVip:!!wallet.annualVip||!!appearance.annualMember,
    points:pointsOf(gamePoints),piece:PERSONAL.includes(game)?equip[game+'Piece']:'',
    board:isBaseline(board)?'':board,table:isBaseline(equip.table)?'':equip.table,bot:false};
}
function publicProfile(profile,game){
  const p=profile||{};
  const board=p.bot&&/^board-(neon|jade|aurora)$/.test(p.board)?game+'-'+p.board:p.board;
  return {...p,piece:PERSONAL.includes(game)?selected(p.piece??p.equipped?.[game+'Piece'],game,'piece'):'',
    board:SHARED_BOARDS.includes(game)&&validId(board,game,'board')&&!isBaseline(board)?board:''};
}
function setTheme(el,name,value){if(value)el.setAttribute(name,value);else el.removeAttribute(name);}
export function setOpponent(profile){opponentOverride=profile||null;lastMatchKey=null;}
export function profiles(game='four',options={}){
  const key=GAME_KEYS.includes(game)?game:'four',equip=readEquipped();
  let me=myProfile(equip,key),opponent;
  const seat=Number(options.mySeat)===2?2:1;
  if(options.network&&GAME_KEYS.includes(game)){
    const own=options.seatProfiles?.[seat-1];
    // Online arbitration uses the same public facts at both clients. Local
    // wallet points/membership must never make each visitor win their board.
    me=publicProfile(own,key);
    // During the first request the room may not yet contain its selection.
    if(!own?.piece)me.piece=PERSONAL.includes(key)?equip[key+'Piece']:'';
    // A shared board must use the same public snapshot at both clients.
    // Until the seat selection is acknowledged, keep the public default.
    opponent=publicProfile(options.seatProfiles?.[2-seat],key);
  }else{
    opponent=publicProfile(opponentOverride||botOpponent(botLevel()),key);
    if(!opponentOverride){
      // Local practice: the human's chosen seat takes their own equip slot
      // and the bot always keeps the FREE baseline for the other seat — a
      // bot cannot buy skins, so it must never wear the human's cosmetics.
      // Four splits blue (fourPiece) / pink (fourPiecePink); Gomoku splits
      // black (gomokuPiece) / white (gomokuPieceWhite); XO splits X / O.
      if(key==='four'){
        me.piece=seat===1?equip['fourPiece']:equip['fourPiecePink'];
        opponent.piece=seat===1?'four-pink-piece-default':'four-piece-default';
      }else if(key==='gomoku'){
        me.piece=seat===1?equip['gomokuPiece']:equip['gomokuPieceWhite'];
        opponent.piece=seat===1?'gomoku-white-piece-default':'gomoku-piece-default';
      }else if(key==='xo'){
        me.piece=seat===1?equip['xoPiece']:equip['xoPieceO'];
        opponent.piece=seat===1?'xo-o-piece-default':'xo-piece-default';
      }else{
        opponent.piece='';
      }
      // Practice bots keep the default Four board, just like their pieces.
      if(key==='four'||isBaseline(equip[key+'Board']))opponent.board='';
      if(isBaseline(equip.table))opponent.table='';
    }
  }
  return {equip,me,opponent,tier:tierOf(me),opponentTier:tierOf(opponent)};
}
const ATTRS=['data-cosmetic-piece','data-cosmetic-piece-1','data-cosmetic-piece-2','data-cosmetic-board',
  'data-cosmetic-seat','data-cosmetic-reason','data-cosmetic-winner',
  'data-cosmetic-ball','data-cosmetic-cue','data-cosmetic-table'];
function activeGame(){const raw=new URLSearchParams(location.search).get('game')??'four';return GAME_KEYS.includes(raw)||BILLIARDS.includes(raw)?raw:null;}
function clearAttributes(el){if(el)for(const name of ATTRS)el.removeAttribute(name);}
function roomCoin(key){let h=2166136261;for(const c of key)h=Math.imul(h^c.charCodeAt(0),16777619);return(h>>>0)/4294967296;}
export function localSelection(game=activeGame(),roomProfile=null){
  const equip=savedEquipped();
  const choose=(role)=>{
    const slot=game+(role==='piece'?'Piece':'Board');
    // A missing browser save is not a request to reset a recovered seat.
    // An explicitly saved default remains an intentional reset and is sent.
    const id=Object.hasOwn(equip,slot)&&validId(equip[slot],game,role)?equip[slot]:roomProfile?.[role];
    return selected(id,game,role);
  };
  return {pieceId:PERSONAL.includes(game)?choose('piece'):'',boardId:SHARED_BOARDS.includes(game)?choose('board'):''};
}
export function applyCosmetics(options={}){
  lastOptions={...options};const game=activeGame(),root=document.documentElement,board=document.getElementById('board');
  if(!game){clearAttributes(root);clearAttributes(board);lastState=null;window.__joyflockCosmeticsState=null;return null;}
  const {equip,me,opponent}=profiles(game,options),mySeat=Number(options.mySeat)===2?2:1;
  const matchKey=String(options.matchKey??'local'),billiards=BILLIARDS.includes(game);
  const themedFour=game==='four'&&document.body?.classList?.contains('four-themed');
  const seats=mySeat===1?[me,opponent]:[opponent,me];
  const shared=billiards?'table':'board';
  const contenders=options.network?seats:[me,opponent];
  const decisionKey=JSON.stringify([game,matchKey,options.network,themedFour,contenders.map(p=>[p[shared],tierOf(p),pointsOf(p)])]);
  if(decisionKey!==lastMatchKey||!lastDecision){
    lastMatchKey=decisionKey;
    lastDecision=themedFour?{id:'',winner:null,reason:'theme'}:billiards?resolveShared(me,opponent,'table'):SHARED_BOARDS.includes(game)
      ?resolveBoard(...contenders,options.network?()=>roomCoin(game+':'+matchKey):Math.random)
      :{id:'',winner:null,reason:'none'};
  }
  clearAttributes(root);clearAttributes(board);
  root.setAttribute('data-cosmetic-seat',String(mySeat));
  root.setAttribute('data-cosmetic-reason',lastDecision.reason);
  root.setAttribute('data-cosmetic-winner',lastDecision.winner||'');
  if(billiards){
    const ballTheme=skinTheme(equip.ball,true),cueTheme=skinTheme(equip.cue,true),tableTheme=skinTheme(lastDecision.id,true);
    setTheme(root,'data-cosmetic-ball',ballTheme);setTheme(root,'data-cosmetic-cue',cueTheme);setTheme(root,'data-cosmetic-table',tableTheme);
    lastState={game,ball:equip.ball,cue:equip.cue,table:equip.table,ballTheme,cueTheme,tableTheme,mySeat,decision:lastDecision,me,opponent,matchKey};
  }else{
    const pieceThemes=PERSONAL.includes(game)&&!themedFour?seats.map(p=>skinTheme(p.piece)):['',''];
    const pieceTheme=pieceThemes[mySeat-1],boardTheme=SHARED_BOARDS.includes(game)&&!themedFour?skinTheme(lastDecision.id):'';
    for(const el of [root,board].filter(Boolean)){
      setTheme(el,'data-cosmetic-piece',pieceTheme);setTheme(el,'data-cosmetic-board',boardTheme);
      pieceThemes.forEach((theme,i)=>setTheme(el,'data-cosmetic-piece-'+(i+1),theme));
      el.setAttribute('data-cosmetic-seat',String(mySeat));
    }
    lastState={game,piece:equip[game+'Piece'],board:equip[game+'Board'],pieceTheme,boardTheme,pieceThemes,
      mySeat,decision:lastDecision,me,opponent,matchKey,themedFour:!!themedFour};
  }
  window.__joyflockCosmeticsState=lastState;
  decoratePieces(board);return lastState;
}
export function current(){return lastState;}
export function pieceThemeForSeat(seat){return lastState?.pieceThemes?.[Number(seat)-1]||'';}
export function decoratePiece(node,seat){
  if(!node)return;const theme=pieceThemeForSeat(seat);setTheme(node,'data-cosmetic-piece',theme);
  if(theme)node.style?.setProperty('--personal-emblem',emblemUrl(theme));
  else node.style?.removeProperty('--personal-emblem');
  if(theme&&lastState?.game==='xo')node.style?.setProperty('--personal-mark',markUrl(theme,seat));
  else node.style?.removeProperty('--personal-mark');
}
export function decoratePieces(host=document.getElementById('board')){
  if(!host||!['four','xo'].includes(lastState?.game))return;
  for(const node of host.querySelectorAll?.('.cell[data-value]')||[])decoratePiece(node,node.dataset.value);
}
export function cosmeticKey(){return ATTRS.map(name=>document.documentElement.getAttribute(name)).join('|');}
if(typeof window!=='undefined'){
  window.__joyflockCosmetics={version:VERSION,apply:applyCosmetics,current,profiles,setOpponent,localSelection,
    resolveBoard,resolveShared,tierOf,themeOf,botOpponent,cosmeticKey,decoratePieces,pieceThemeForSeat};
  const refresh=()=>{applyCosmetics(lastOptions);window.dispatchEvent(new CustomEvent('joyflock:cosmetics-changed'));};
  window.addEventListener('storage',e=>{
    const key=String(e?.key??'');
    /* Any game's difficulty change (or the legacy key) can affect this page. */
    if([SHOP_KEY,BOT_LEVEL_KEY,'joyflock.gamepoints.v1'].includes(key)||key.startsWith(BOT_LEVEL_KEY_PREFIX))refresh();
  });
  window.addEventListener('joyflock:shop-changed',refresh);window.addEventListener('joyflock:bot-level-changed',refresh);
  window.addEventListener('joyflock:theme-applied',refresh);
  applyCosmetics();
}

