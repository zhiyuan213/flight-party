import {attachFourDrop} from './four-drop.js?v=20261108-four-hint2';
import {openThemePicker,themeParam,getTheme,setTheme,instanceId as themeInstanceId} from './four-theme.js?v=20261109-notext2';
import {showMatchBox,hideMatchBox,updateMatchBox} from './match-box.js?v=20261108-topmatch1';
import {mountArcade} from './arcade-table.js?v=20261109-snookerlive1';
import {mountSnookerShell} from './snooker-shell.js?v=20261109-snooker3';
import {renderChess} from './chess-view.js?v=20261106-chess';
import {unlockPoolAudio} from './pool-audio.js?v=20261106-ui2';
import {cancelPoolCountdown,updatePoolCountdown,COUNTDOWN_TOTAL,COUNTDOWN_WINDOW} from './pool-countdown.js';
import {updateFourResult,updatePoolShell,updateTableChat,sendPoolChatEmoji,appendPoolChatReaction} from './pool-shell.js?v=20261109-result1';
import {CATALOG,coverFor,playerCard,screenForRoom} from './presentation.js?v=20261109-snookerlive1';
import {renderPool} from './pool.js?v=20261107-power-50';
import {animatePoolOpponentShot,cancelPoolOpponentShot} from './pool-view.js?v=20261107-power-50';
import {renderCards} from './cards.js?v=20261104-lobby2';
import {drawSketch,sketchNext} from './sketch.js?v=20261104-lobby2';
import {start,move,bot,legal} from './grid-rules.js?v=20261109-snookerlive1';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search),game=['gomoku','puzzle','chess','draw','cards','pool','xo','snooker','bubbles'].includes(params.get('game'))?params.get('game'):'four',title=game==='snooker'?'斯诺克':game==='bubbles'?'泡泡射击':game==='xo'?'井字棋':game==='four'?'四子连珠':game==='gomoku'?'五子棋':game==='chess'?'国际象棋':game==='draw'?'你画我猜':game==='cards'?'欢乐纸牌':game==='pool'?'欢乐台球':'趣味拼图';
let board=start(game),room=null,csrf=null,pending=false,computer=false,local=true,me=null,poll=null,generation=0,last=-1,rematchPending=false,puzzleSelection=null,screen='home',period='month',reactionCursor=0,reactionRoom=null,reactionBusy=false,settledRoom=null;
$('title').textContent=title;if(!document.documentElement.hasAttribute('data-intro-ready')){$('game-name').textContent=title;document.title=title+' · JoyFlock';}if(!['bubbles','snooker'].includes(game))$('rules').textContent=game==='four'?'轮流选择一列落子，棋子落到该列最下方的空位。横、竖或斜向连成4颗即获胜。':'双方轮流落子，黑棋先行。横、竖或斜向连成5颗及以上获胜；当前为无禁手的自由五子棋。';document.body.classList.toggle('pool-game',game==='pool');document.body.classList.toggle('snooker-game',game==='snooker');document.body.classList.toggle('chess-game',game==='chess');$('board').classList.toggle('chess',game==='chess');$('promotion-setting').hidden=game!=='chess';if(game==='chess')$('rules').textContent='白棋先行。点击自己的棋子，再点击目标格。支持王车易位、吃过路兵及升变；将死获胜，逼和、重复局面、50回合及子力不足判和。电脑为基础难度。';$('board').classList.toggle('gomoku',game==='gomoku');$('board').classList.toggle('puzzle',game==='puzzle');if(game==='puzzle'){$('score-note').textContent='登录账号的联机合作成果自动保存，每位参与者各+3分；单机和游客对局不累计。';$('rules').textContent='交换两块拼图，还原完整的飞行棋画面。点击两块图片交换位置，也可以拖动交换。联机时与好友轮流协作；完成后两人各+3分。';$('computer').textContent='单机 · 电脑协作';$('local').textContent='单机 · 双人协作';}
async function request(path,body){const response=await fetch(path,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:{...(body===undefined?{}:{'content-type':'application/json'}),...(csrf?{[csrf.headerName]:csrf.token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});if(!response.ok){const error=Error('请求失败 ('+response.status+')');error.status=response.status;throw error;}const text=await response.text();return text?JSON.parse(text):null;}
async function init(){if(!csrf){csrf=await request('/api/csrf');await request('/api/session/guest',{});}me=await request('/api/me');$('profile').textContent=(me.account?.displayName||'游客')+(me.appearance?.annualMember?' · YEAR VIP':me.appearance?.member?' · VIP':'');$('profile').classList.toggle('vip',!!me.appearance?.member);$('account-open').textContent=me.account?me.account.displayName:'登录 / 注册';await refreshStats();refreshLeaderboard();}
/* Real standings come first; demo rows fill the board up to ten seats so the
   panel keeps a fixed height on a fresh deployment with no online results. */
async function refreshLeaderboard(){
 const selected=period;
 let rows=[];
 try{const response=await request('/api/table/leaderboards/'+game+'?period='+period);if(Array.isArray(response))rows=response;}catch{}
 if(selected!==period)return;
 const real=rows.slice(0,10).filter(row=>row&&typeof row==='object').map(row=>({
  name:row.name||row.displayName||'玩家',points:Number(row.points)||0,games:Number(row.games)||0,
  avatarUrl:row.avatarUrl,member:!!row.member,frame:row.frame}));
 const demo=globalThis.__joyflockDemoRows?globalThis.__joyflockDemoRows(period,game):[];
 const merged=real.slice();
 for(const entry of demo){if(merged.length>=10)break;merged.push(entry);}
 const row=globalThis.__joyflockRankRow;
 if(typeof row!=='function')return;
 $('leaderboard').replaceChildren(...merged.slice(0,10).map((entry,i)=>row(document,entry,i)));
}
async function refreshStats(){
 const demo=()=>{$('stats').dataset.demo='1';$('stats').textContent=globalThis.__joyflockDemoStats?globalThis.__joyflockDemoStats():'我的战绩：278 积分 · 66 局 · 本月 +36 分';};
 if(!me?.account){demo();return;}
 try{const stats=await request('/api/table/stats/'+game);delete $('stats').dataset.demo;$('stats').textContent=document.documentElement.lang==='en'?'Your points: '+stats.points+' · '+stats.completedGames+' games':'本游戏累计：'+stats.points+' 积分 · '+stats.completedGames+' 局';}catch{demo();}
}
const names=()=>room?.names||[me?.account?.displayName||tableLabel('你'),tableLabel(computer?'电脑':'好友')];
/* Every game in this shell reports its finished board here, including the ones
   without the result dialog (Gomoku, Chess, Cards, Puzzles, Draw, Bubbles,
   Snooker). The sound module de-dupes this against the dialog's own cue, so a
   win or loss is heard exactly once, whenever the result becomes final. */
function resultOutcome(options){
  const winner=Number(options?.board?.winner)||0,personal=!!options.room||!!options.computer,
    you=options.room?Number(options.room.you)+1:1;
  return !winner?'draw':personal&&winner!==you?'loss':'win';
}
function playResultSound(options){
  if(screen!=='play'||!options?.board?.over)return;
  const sfx=globalThis.__joyflockResultSfx;
  if(!sfx||typeof sfx.play!=='function')return;
  // Same key as pool-shell.js resultKey: the two call sites cannot double-play.
  sfx.play(resultOutcome(options),[options.room?.id||'local',options.board.moves,options.board.winner].join(':'));
}
const usesOpening=game==='four'||game==='xo';
const isBubbles=game==='bubbles';
const isSnooker=game==='snooker';
const isCanvasGame=isBubbles||isSnooker;
const usesCountdown=usesOpening||isCanvasGame||game==='chess';
let arcadeStarted=false,arcadeStatus='';
/* Canvas games (Bubble Duel + Snooker) use the exact same authoritative
   board / room pipeline as Pool and Tic-tac-toe. The renderer only reports an
   aim / shot command; all scoring and turn keeping happens in grid-rules / the API. */
const canShoot=()=>screen==='play'&&!pending&&!board.over&&
  !(room&&(room.phase!=='PLAYING'||room.you+1!==board.turn))&&
  !(local&&computer&&board.turn===2)&&Date.now()>=fourOpening;
const arcade=isCanvasGame?mountArcade($('board'),game,text=>{
  arcadeStatus=text;
  if(!board.over&&$('status').textContent!==text)$('status').textContent=text;
},text=>{
  arcadeStatus=text;
  if($('status').textContent!==text)$('status').textContent=text;
},{onShoot:position=>commitMove(position),canPlay:canShoot,board:()=>board}):null;
if(isCanvasGame&&!$('rules').textContent)$('rules').textContent=CATALOG[game].instruction;
const updateFourDrop=game==='four'?attachFourDrop($('board'),$('board').parentElement):null;
if(updateFourDrop)document.body.classList.add('connect-four-game');
document.body.classList.toggle('board-countdown',usesCountdown);
document.body.classList.toggle('four-game',usesOpening);
if(game==='xo'){
  $('board').classList.add('xo');
  $('rules').textContent=CATALOG.xo.instruction;
}
if(isCanvasGame&&!$('rules').textContent)$('rules').textContent=CATALOG[game].instruction;
const fourCountdown=usesCountdown?document.createElement('div'):null;
let fourOpening=0,fourReadyUntil=0,fourMatchKey=null;
if(fourCountdown){fourCountdown.className='pool-countdown';fourCountdown.hidden=true;fourCountdown.innerHTML='<b>3</b><span data-ready="准备开始" data-ready-en="Get ready">准备开始</span>';$('board').parentElement.append(fourCountdown);}
function render(){if(game==='gomoku')$('board').dataset.turn=board.turn;if(game==='pool'&&screen!=='play'){cancelPoolCountdown($('board'));cancelPoolOpponentShot($('board'));}const waiting=room?.phase==='WAITING',can=!pending&&!board.over&&!waiting&&(!room||room.phase==='PLAYING'&&room.you+1===board.turn)&&!(local&&computer&&board.turn===2);$('mode').textContent=room?'在线对局':game==='puzzle'?(computer?'单机 · 电脑协作':'单机 · 双人协作'):computer?'单机 · 电脑对战':'单机 · 双人同屏';$('status').textContent=isCanvasGame?(board.over?(arcadeStatus||(board.winner?names()[board.winner-1]+' 获胜！':'本局平局。')):arcadeStatus):room?.phase==='SUSPENDED'?'对局已在另一个窗口恢复':room?.phase==='CLOSED'?'房间已关闭，请重新创建。':waiting?(room.deadline>0?'正在匹配，'+Math.max(0,Math.ceil((room.deadline-room.serverNow)/1000))+'秒后电脑补位':'等待好友加入并准备'):board.over?(board.winner?(game==='puzzle'?'拼图完成，合作愉快！':names()[board.winner-1]+' 获胜！'):(game==='chess'?'本局和棋。':'本局平局。')):names()[board.turn-1]+' 的回合'+(room?' · 超时电脑代走':'');if(game==='pool'){$('board')._openingUntil=screen!=='play'?0:room?.playStartsAt||(!room?$('board')._localOpeningUntil||0:0);$('board')._poolCountdownReadyUntil=screen==='play'&&!room?($('board')._localReadyUntil||0):0;const poolCaption=$('board').querySelector('.pool-countdown span');if(poolCaption&&!poolCaption.dataset.ready){poolCaption.dataset.ready='准备开球';poolCaption.dataset.readyEn='Get ready';}renderPool($('board'),board,can,{opponentSeat:room?2-room.you:0});}else if(isCanvasGame){arcade.applyBoard(board);}else if(game==='cards')renderCards($('board'),board,room?room.you+1:computer?1:board.turn,can);else if(game==='draw'){drawSketch($('board'),board,{you:room?room.you+1:board.turn,network:!!room,practice:computer&&!room,send:sketchAction,next:()=>{board=sketchNext(board);if(computer&&!board.over)practiceDrawing();$('board')._passed=false;render();}});}else if(game==='chess')renderChess($('board'),board,{can,selected:puzzleSelection,seat:room?room.you+1:1,key:room?.id||generation,refresh:render});else $('board').innerHTML=board.cells.map((v,i)=>game==='puzzle'?`<button class="cell puzzle-tile ${puzzleSelection===i?'chosen':''}" style="background-position:${((v-1)%4)*100/3}% ${Math.floor((v-1)/4)*100/3}%" data-position="${i}" draggable="true" aria-label="第${i+1}个位置，图片${v}" ${!can?'disabled':''}><small>${v}</small></button>`:`<button class="cell ${i===last?'last':''}" data-value="${v}" data-position="${game==='four'?i%7:i}" aria-label="${game==='four'?'第'+(i%7+1)+'列':'第'+(Math.floor(i/(game==='xo'?3:15))+1)+'行第'+(i%(game==='xo'?3:15)+1)+'列'}，${v?'已有棋子':'空位'}" ${!can?'disabled':''}></button>`).join('');const seats=[0,1].map(i=>playerCard(document,{...(room?.profiles?.[i]||(!i?me?.appearance:null)||{}),name:names()[i]||'等待加入',bot:room?!!room.bots[i]:computer&&i===1},i,!waiting&&board.turn===i+1&&!board.over));if(game==='chess')for(const [index,seat] of seats.entries()){
 const image=seat.querySelector('.seat-avatar');
 if(!image)continue;
 const fallback=()=>{
  const avatar=image.parentElement;
  if(!avatar)return;
  image.remove();
  avatar.prepend(index===0?'白':'黑');
 };
 if(!room&&!me)fallback();else image.addEventListener('error',fallback,{once:true});
}$('seats').replaceChildren(...seats);$('waiting-seats').replaceChildren(...seats.map(node=>node.cloneNode(true)));$('room-tools').hidden=!room;$('ready').hidden=!room||room.origin!=='FRIENDS'||room.phase!=='WAITING'||room.deadline>0;$('share').hidden=room?.origin!=='FRIENDS'||room?.phase!=='WAITING';$('room-status').textContent=room?'房间 '+room.id:'';$('again').hidden=!board.over;updateFourDrop?.(board,can&&Date.now()>=fourOpening,screen==='play');syncPresentation();}
function apply(value){if(room&&value.id!==room.id)rematchPending=false;if(value.game!==game)throw Error('游戏类型不匹配');if(!room||value.version!==room.version)puzzleSelection=null;room=value;$('board')._serverOffset=value.serverNow-Date.now();board=value.board;local=false;screen=screenForRoom(value);render();if(board.over&&settledRoom!==room.id){settledRoom=room.id;refreshStats();refreshLeaderboard();delete $('stats').dataset.demo;$('stats').textContent=me?.account?'已完成的联机结果由服务器保存；本游戏独立计分。':'游客对局不累计积分。';}}
function schedulePoll(){clearInterval(poll);let reading=false;const token=generation;poll=setInterval(async()=>{if(reading||!room||pending||document.hidden)return;reading=true;try{const next=await request('/api/table/rooms/'+room.id);if(token===generation){apply(next);pollReactions();pollRoomTheme();$('message').textContent='';}}catch(error){if([403,404].includes(error.status)){clearInterval(poll);if(room)room.phase=error.status===403?'SUSPENDED':'CLOSED';$('message').textContent=error.status===403?'当前对局已由其他窗口接管，或席位不可用。':'房间已不可用，请重新匹配。';render();}else $('message').textContent='连接中断，正在重新连接…';}finally{reading=false;}},game==='xo'?400:1000);}
/* ---------------------------- shared room skin ----------------------------
   The backend room state has no skin field, so a tiny invisible system note
   in the room's chat stream carries the choice across devices. The latest
   note wins; remote application is silent, so two players cannot ping-pong. */
const ROOM_THEME_TAG=/^\[jft:([a-z0-9]+):([a-z]+)\]$/;
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
async function enter(mode,code){if(pending)return;pending=true;const token=++generation;clearInterval(poll);try{await init();const value=code?await request('/api/table/rooms/'+code+'/join',{}):await request('/api/table/rooms',{game,mode});if(token!==generation)return;apply(value);const url=new URL(location.href);url.searchParams.set('room',room.id);history.replaceState(null,'',url);schedulePoll();if(!code)queueRoomTheme();pollRoomTheme();$('message').textContent='';}catch(e){$('message').textContent=e.status===409?'房间已开始、已满，或同一账号已在房间中。':'未能进入，请重试。';}finally{pending=false;render();}}
function localStart(withBot){if(arcade){arcade.stop();arcadeStarted=false;arcadeStatus='';if(isCanvasGame)arcade.reset();}screen='play';generation++;clearInterval(poll);room=null;local=true;computer=withBot;board=start(game);if(game==='pool'){cancelPoolOpponentShot($('board'));cancelPoolCountdown($('board'));$('board')._returns=[];$('board')._painted=null;$('board')._scratchVisible=false;$('board')._animationToken=($('board')._animationToken||0)+1;$('board')._animating=false;$('board')._lastMove=0;$('board')._queued=null;$('board')._snapshot=null;$('board')._snapshotTurn=null;$('board')._snapshotMove=null;$('board')._striking=false;$('board')._localOpeningUntil=Date.now()+COUNTDOWN_TOTAL;$('board')._localReadyUntil=$('board')._localOpeningUntil-COUNTDOWN_WINDOW;$('board')._serverOffset=0;$('board')._locked=false;$('board')._pullStart=null;$('board')._power=0;$('board')._spin=0;}if(game==='draw'){$('board')._passed=false;computer&&practiceDrawing();}puzzleSelection=null;last=-1,rematchPending=false;pending=false;const url=new URL(location.href);url.searchParams.delete('room');history.replaceState(null,'',url);/* No opening toast: the "local games are not uploaded" note has been removed.
   #message stays reserved for real errors and room status updates. */
$('message').textContent='';render();}
$('board').addEventListener('click',async event=>{const button=event.target.closest('[data-position]');if(game==='draw'||!button||Date.now()<fourOpening||pending||board.over||game==='pool'&&$('board')._animating)return;let position=Number(button.dataset.position);if(game==='chess'){const own=board.cells[position]&&(board.cells[position]<=6?1:2)===board.turn;if(puzzleSelection===null||own){if(!own)return;puzzleSelection=position;render();return;}let code=puzzleSelection*64+position;const pawn=board.cells[puzzleSelection]===1||board.cells[puzzleSelection]===7;if(pawn&&(Math.floor(position/8)===0||Math.floor(position/8)===7))code+=4096*Number($('promotion').value);if(!legal(board).includes(code)){$('message').textContent='这步不合法，请选择其他目标。';return;}position=code;puzzleSelection=null;}if(game==='puzzle'){if(puzzleSelection===null){puzzleSelection=position;render();return;}if(puzzleSelection===position){puzzleSelection=null;render();return;}position=puzzleSelection*16+position;puzzleSelection=null;}commitMove(position);});
/* Shared commit path for grid clicks and Bubble Duel canvas shots. Local play
   advances the board with grid-rules; hosted play sends the same `position`
   (an aim code for bubbles) to the room API and applies the authoritative view. */
async function commitMove(position){
  if(pending||board.over)return;
  const token=generation;pending=true;render();
  try{
    if(room){const next=await request('/api/table/rooms/'+room.id+'/move',{position,version:room.version,commandId:crypto.randomUUID()});if(token!==generation)return;apply(next);}
    else{
      board=move(board,board.turn,position);render();
      while(computer&&!board.over&&board.turn===2){
        if(game==='four')await $('board')._fourDropDone;
        await new Promise(r=>setTimeout(r,isSnooker?Math.min(6500,((board.history?.length||0)*16)+300):isBubbles?900:game==='pool'?350:450));
        while(game==='pool'&&$('board')._animating&&token===generation)await new Promise(r=>setTimeout(r,100));
        if(token!==generation)return;
        const command=bot(board);
        if(game==='pool'&&!await animatePoolOpponentShot($('board'),command,()=>token===generation&&screen==='play'&&!room))return;
        if(token!==generation)return;
        board=move(board,board.turn,command);render();
      }
    }
  }catch(e){$('message').textContent=isBubbles?'发射失败，或状态已变化，请重试。':isSnooker?'击球失败，或状态已变化，请重试。':'此处不能落子，或状态已变化，请重试。';}
  finally{if(token===generation){pending=false;render();}}
}
if(game==='pool'||usesCountdown){for(const id of ['computer','local','quick','friends','again'])$(id).addEventListener('click',unlockPoolAudio,{capture:true});$('join').addEventListener('submit',unlockPoolAudio,{capture:true});}
$('computer').onclick=()=>game==='four'?openThemePicker({onConfirm:()=>localStart(true)}):localStart(true);$('local').onclick=()=>game==='four'?openThemePicker({onConfirm:()=>localStart(false)}):localStart(false);$('quick').onclick=()=>game==='four'?openThemePicker({onConfirm:()=>enter('QUICK'),confirmText:'开始匹配'}):enter('QUICK');$('friends').onclick=()=>game==='four'?openThemePicker({onConfirm:()=>enter('FRIENDS'),confirmText:'创建房间'}):enter('FRIENDS');$('join').onsubmit=event=>{event.preventDefault();let code=$('room-code').value.trim();try{if(code.includes('://'))code=new URL(code).searchParams.get('room');if(!/^[0-9a-f-]{36}$/i.test(code||''))throw Error();enter('FRIENDS',code);}catch{$('message').textContent='请填写有效的房间码或邀请链接。';}};
$('share').textContent='邀请好友';$('share').onclick=async()=>{const url=new URL(location.href);url.searchParams.set('room',room.id);url.searchParams.set('theme',themeParam());if(/MicroMessenger/i.test(navigator.userAgent)){$('message').textContent='请点微信右上角“…” → “发送给朋友”，邀请好友加入。';return;}if(navigator.share&&matchMedia('(max-width:760px)').matches){try{await navigator.share({title:title+' · JoyFlock',text:'一起玩'+title+'，打开链接加入我的房间。',url:url.href});return;}catch(error){if(error.name==='AbortError')return;}}try{await navigator.clipboard.writeText(url.href);$('message').textContent='邀请链接已复制，发给朋友即可。';}catch{$('room-code').value=url.href;$('message').textContent='请复制输入框中的邀请链接。';}};
$('leave').onclick=async()=>{if(pending)return;if(['SUSPENDED','CLOSED'].includes(room?.phase)){localStart(false);screen='home';$('message').textContent='';render();return;}pending=true;try{await request('/api/table/rooms/'+room.id+'/leave',{});localStart(false);screen='home';$('message').textContent='';render();}catch{$('message').textContent='退出未成功，请重试。';}finally{pending=false;render();}};
$('again').onclick=async()=>{
  if(!room){localStart(computer);return;}if(pending)return;
  const token=generation,originId=room.id;let targetId=originId;
  const isCurrent=()=>token===generation&&(room?.id===originId||room?.id===targetId);
  pending=true;
  try{
    rematchPending=true;const next=await request('/api/table/rooms/'+originId+'/rematch',{});
    if(!isCurrent())return;
    targetId=next.id;apply(next);schedulePoll();$('message').textContent=room.phase==='OVER'?'等待好友确认再来一局。':'';
  }catch{if(isCurrent())$('message').textContent='重新开始失败，请重试。';}
  finally{if(isCurrent()){pending=false;render();}}
};
$('account-open').onclick=()=>{if(window.parent!==window){window.parent.postMessage({type:'joyflock:auth-request',mode:'login'},location.origin);return;}const old=$('account-summary');if(old)old.remove();$('auth-form').hidden=!!me?.account;if(me?.account){const section=document.createElement('section');section.id='account-summary';section.innerHTML='<h2></h2><p></p><button type="button" id="signout">退出登录</button><button type="button" id="summary-close">关闭</button>';section.querySelector('h2').textContent=me.account.displayName;section.querySelector('p').textContent=(me.appearance?.annualMember?'YEAR VIP':me.appearance?.member?'VIP':'普通账号')+' · '+$('stats').textContent;$('auth').append(section);$('signout').onclick=async()=>{await request('/api/auth/logout',{});await init();$('auth').close();};$('summary-close').onclick=()=>$('auth').close();}$('auth').showModal();};$('auth-close').onclick=()=>$('auth').close();$('auth-form').onsubmit=async event=>{event.preventDefault();const form=event.target,values=Object.fromEntries(new FormData(form)),action=event.submitter.value;if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)){$('auth-error').textContent='请输入完整的邮箱地址。';return;}if(action==='register'&&values.password!==values.confirmation){$('auth-error').textContent='两次输入的密码不一致。';return;}if(action==='register'&&!values.displayName.trim()){$('auth-error').textContent='注册请填写昵称。';return;}for(const b of form.querySelectorAll('button'))b.disabled=true;try{await init();await request('/api/auth/'+action,values);await init();form.reset();$('auth').close();}catch(e){$('auth-error').textContent=e.status===409?'邮箱已被使用。':e.status===401?'邮箱或密码不正确。':'未成功，请检查邮箱和密码（至少8位）后重试。';}finally{for(const b of form.querySelectorAll('button'))b.disabled=false;}};
render();init().then(()=>{if(params.get('room'))enter('FRIENDS',params.get('room'));}).catch(()=>{$('message').textContent='联机服务暂不可用，仍可单机游玩。';});

import {bindPortalControls} from '../portal-controls.js?v=20261106-layout';
import {bindTableLocale,tableLabel} from './table-locale.js?v=20261109-snookerlive1';
const applyTableLocale=bindTableLocale();
arcade?.refresh?.();
bindPortalControls({onLocale:locale=>{applyTableLocale(locale);if($('stats').dataset.demo==='1')$('stats').textContent=globalThis.__joyflockDemoStats?globalThis.__joyflockDemoStats(locale):'';else refreshStats();arcade?.refresh?.();render();}});
// The shell owns the account dialogs now. When it signs in/out, refresh the
// embedded game's own session view so the profile stats stay in sync.
window.addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==window.parent||event.data?.type!=='joyflock:auth-changed')return;init().catch(()=>{});});
$('home-link').onclick=async event=>{event.preventDefault();if(arcade&&!room){arcade.stop();generation++;screen='home';render();return;}if(room&&['WAITING','PLAYING'].includes(room.phase)){if(!confirm('返回游戏首页？当前席位将由电脑托管。'))return;try{await request('/api/table/rooms/'+room.id+'/leave',{});}catch{$('message').textContent='退出未成功，请重试。';return;}}localStart(false);screen='home';$('message').textContent='';render();};
let draggedTile=null;$('board').addEventListener('dragstart',event=>{const tile=event.target.closest('[data-position]');if(game!=='puzzle'||!tile||tile.disabled){event.preventDefault();return;}draggedTile=Number(tile.dataset.position);});$('board').addEventListener('dragover',event=>{if(game==='puzzle')event.preventDefault();});$('board').addEventListener('drop',event=>{event.preventDefault();const tile=event.target.closest('[data-position]');if(tile&&draggedTile!==null&&!tile.disabled){puzzleSelection=draggedTile;tile.click();}draggedTile=null;});

$('ready').onclick=async()=>{if(!room||pending)return;pending=true;try{apply(await request('/api/table/rooms/'+room.id+'/ready',{}));$('message').textContent='已准备，等待好友。';}catch{$('message').textContent='准备失败，请重试。';}finally{pending=false;render();}};

async function sketchAction(action,text,points){if(pending||board.over)return;pending=true;try{if(room)apply(await request('/api/table/rooms/'+room.id+'/sketch',{commandId:crypto.randomUUID(),version:room.version,action,text,points}));else{if(action==='stroke')board={...board,history:[...board.history,points.join(',')]};if(action==='clear')board={...board,history:[]};if(action==='guess'&&text.trim()===board.fen){board=sketchNext(board,true);$('board')._passed=false;if(computer&&!board.over)practiceDrawing();}}}catch{$('message').textContent='猜题请间隔1秒，每题最多6次；或当前状态已变化，请重试。';}finally{pending=false;render();}}
function practiceDrawing(){const n=Math.floor(Math.random()*3);board.fen=['三角形','正方形','圆形'][n];const points=n===0?[500,180,220,780,780,780,500,180]:n===1?[250,250,750,250,750,750,250,750,250,250]:Array.from({length:49},(_,i)=>[Math.round(500+280*Math.cos(i*Math.PI/24)),Math.round(500+280*Math.sin(i*Math.PI/24))]).flat();board.history=[points.join(',')];}
if(game==='draw'){$('board').classList.add('sketch');$('rules').textContent='两人轮流画画与猜词，共6题。猜对者得2题分，画画者得1题分；每题最多猜6次，猜题间隔1秒；最终按题分排名结算。单机电脑出图为几何图形练习，不模拟真人猜词。';$('computer').textContent='单机 · 电脑出图';$('local').textContent='单机 · 绘画练习';}

if(game==='draw')render();

if(game==='cards'){$('board').classList.add('cards');$('rules').textContent='颜色数字接龙：两人各7张，轮流打出与桌面同色或同数字的牌，也可摸一张并结束回合。先出完手牌获胜。没有功能牌、不下注；牌库耗尽时重洗弃牌。双人同屏会显示当前玩家手牌，请轮流操作。';render();}

if(game==='pool'){$('board').classList.add('pool');$('rules').textContent='休闲台球：移动鼠标瞄准，按住左键锁定方向，向后拖动蓄力，松开击球。左上角白球可选择击球点。首次有效进球确定全色（1–7）或花色（9–15），打进本组球可继续击球；分组后先碰对方球、未先碰本组目标球，或白球落袋，均为犯规。犯规后对手获得额外一杆，白球落袋自动复位。清空本组后下一杆打进8号获胜，提前打进8号或同时白球落袋判负。最多200杆后按落袋数判定。此模式不是完整竞技八球规则。';render();}

const metadata=CATALOG[game];
// The synchronous intro-boot script already wrote the final copy and an inline
// cover into the first frame. Do not overwrite them (especially the data-URI
// cover, which would trigger a second 160KB image request and a visible swap).
if(!document.documentElement.hasAttribute('data-intro-ready')){
  $('hero-title').textContent=metadata.name;$('hero-kicker').textContent=metadata.en;$('hero-description').textContent=metadata.description;$('hero-image').src=coverFor(game);$('hero-image').alt=metadata.name+' 游戏插画';$('turn-instruction').textContent=metadata.instruction;
}
function syncPresentation(){document.body.dataset.screen=screen;$('intro').hidden=screen==='play';$('arena').hidden=screen!=='play';const quickWaiting=screen==='waiting'&&room?.origin==='QUICK';if(quickWaiting){showMatchBox({room,onCancel:()=>$('leave').click()});updateMatchBox(room);if($('waiting').open)$('waiting').close();}else{hideMatchBox();if(screen==='waiting'&&!$('waiting').open)$('waiting').showModal();}if((screen!=='waiting'||quickWaiting)&&$('waiting').open)$('waiting').close();$('waiting-status').textContent=$('status').textContent;$('waiting-title').textContent=room?.origin==='QUICK'?'正在寻找你的游戏伙伴':'好友到齐，准备开玩';$('reaction-note').textContent=room?'表情会发送给房间内的其他玩家':'表情在本房间实时同步。';$('turn-clock').textContent=room?.phase==='PLAYING'?Math.max(0,Math.ceil((room.deadline-room.serverNow)/1000))+'s':'';const options={room,me,board,local,computer,names:names(),request,generation};if(game==='pool')updatePoolShell(options);else{if(game!=='snooker')$('arena').classList.add('table-chat-layout');updateTableChat(options);if(game==='snooker')mountSnookerShell();
if(usesCountdown){
  if(screen!=='play'){
    cancelPoolCountdown($('board'));fourMatchKey=null;fourOpening=0;fourReadyUntil=0;
  }else{
    const key=room?.id||generation;
    if(key!==fourMatchKey){fourMatchKey=key;fourOpening=!board.moves&&!board.over?Date.now()+COUNTDOWN_TOTAL:0;fourReadyUntil=fourOpening?fourOpening-COUNTDOWN_WINDOW:0;}
    updatePoolCountdown($('board'),fourCountdown,fourOpening,0,()=>{
      const phase=fourCountdown.dataset.phase;
      if(updateFourDrop&&(phase==='GO'||!phase))updateFourDrop(board,!pending&&!board.over&&(!room||room.you+1===board.turn)&&!(local&&computer&&board.turn===2),true);
      if(phase)fourCountdown.querySelector('span').textContent=tableLabel(phase==='GO'?'开始！':'准备开始');
      if(arcade&&!arcadeStarted&&(phase==='GO'||!phase)){
        arcadeStarted=true;
        arcade.start(computer);
      }
    },fourReadyUntil);
  }
}
// Four / Tic-tac-toe / Pool own a result dialog: their cue is fired by the
// confetti reveal so sound and celebration land on the same frame.
if(!usesOpening&&game!=='pool')playResultSound(options);if(usesOpening)updateFourResult(options);}}
$('back-home').onclick=()=>$('home-link').click();$('leave-play').onclick=()=>room?$('leave').click():$('home-link').click();$('cancel-waiting').onclick=()=>$('leave').click();$('waiting').addEventListener('cancel',event=>{event.preventDefault();$('leave').click();});
for(const tab of document.querySelectorAll('[data-period]'))tab.onclick=()=>{period=tab.dataset.period;for(const t of document.querySelectorAll('[data-period]'))t.setAttribute('aria-pressed',String(t===tab));refreshLeaderboard();};
function showReaction(event){if(document.querySelector('.pool-chat-panel')){appendPoolChatReaction(event);return;}const bubble=document.createElement('div');bubble.className='reaction-bubble';const emoji=document.createElement('span'),name=document.createElement('small');emoji.textContent=event.emoji;name.textContent=event.name;bubble.append(emoji,name);$('reaction-stage').append(bubble);const line=document.createElement('p');line.textContent=event.name+' '+event.emoji;$('reaction-feed').prepend(line);while($('reaction-feed').children.length>3)$('reaction-feed').lastElementChild.remove();setTimeout(()=>bubble.remove(),3200);}
function acceptReactions(events){for(const event of events){if(event.id<=reactionCursor)continue;reactionCursor=event.id;showReaction(event);}}
async function pollReactions(){if(!room||reactionBusy)return;if(reactionRoom!==room.id){reactionRoom=room.id;reactionCursor=0;$('reaction-feed').replaceChildren();}reactionBusy=true;const roomId=room.id;try{const events=await request('/api/table/rooms/'+roomId+'/reactions?after='+reactionCursor);if(room?.id===roomId)acceptReactions(events);}catch{}finally{reactionBusy=false;}}
for(const button of document.querySelectorAll('[data-emoji]'))button.onclick=async()=>{if(button.disabled)return;button.disabled=true;try{if(document.querySelector('.pool-chat-panel')){await sendPoolChatEmoji(button.dataset.emoji);return;}if(room){if(reactionRoom!==room.id){reactionRoom=room.id;reactionCursor=0;}const roomId=room.id;const events=await request('/api/table/rooms/'+roomId+'/reactions',{commandId:crypto.randomUUID(),emoji:button.dataset.emoji});if(room?.id===roomId)acceptReactions(events);}else showReaction({name:me?.account?.displayName||'你',emoji:button.dataset.emoji});}catch{$('reaction-note').textContent='表情发送太快或连接中断，请稍后重试。';}finally{setTimeout(()=>button.disabled=false,1500);}};
render();
