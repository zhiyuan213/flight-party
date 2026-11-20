import {createBubbles} from './bubbles.js?v=20261110-glove2';
import {createSnooker} from './snooker-view.js?v=20261113-humanring1&release=20261115-polishrelease1&power=20261120-poolpower30';
import {unlockPoolAudio} from './pool-audio.js?v=20261113-snookerrail1&release=20261115-polishrelease1&audio=20261115-levels1&power=20261120-poolpower30';
import {unlockBubblesAudio} from './bubbles-audio.js?v=20261113-bubbles2&audio=20261115-levels1';
import {start,move,bot} from './grid-rules.js?v=20261112-gamelanes1&release=20261115-polishrelease1&nine=20261120-nineball1&power=20261120-poolpower30';
import {bindBotDifficultyDialog,botLevelStore} from '../bot-difficulty.js?v=20261112-gamelanes1&nine=20261120-nineball1&power=20261120-poolpower30';
import {viewState} from './snooker-duel.js?v=20261112-gamelanes1&release=20261115-polishrelease1&power=20261120-poolpower30';
import {S_SCORE1,S_SCORE2} from './bubbles-duel.js?v=20261112-gamelanes1';
import {updatePoolCountdown,cancelPoolCountdown,COUNTDOWN_TOTAL,COUNTDOWN_WINDOW} from './pool-countdown.js?release=20261115-polishrelease1';

const $=selector=>document.querySelector(selector);
const game=new URLSearchParams(location.search).get('game')==='snooker'?'snooker':'bubbles';
/* This arcade view shares the same saved difficulty as its table-game twin. */
const botLevels=botLevelStore(game);
const bubbles=game==='bubbles';
const canvas=$('canvas'),dialog=$('dialog'),action=$('#action');
document.body.classList.add(game);
document.body.dataset.screen='home';
$('#cover').src='/assets/covers/'+game+'.jpg?v=20261109-coverhd1';
let chinese=false,playing=false;
try{chinese=localStorage.getItem('joyflock-portal-language')==='zh';}catch{}
const label=(en,zh)=>chinese?zh:en;
const difficultyControl=bindBotDifficultyDialog($('#bot-difficulty'),{lang:chinese?'zh':'en',game});
const point=event=>{
  const rect=canvas.getBoundingClientRect();
  return {x:(event.clientX-rect.left)*canvas.width/rect.width,y:(event.clientY-rect.top)*canvas.height/rect.height};
};
let board=null,computer=false,pending=false,openingUntil=0;
const main=$('main');
const countdown=document.createElement('div');
countdown.className='pool-countdown';countdown.hidden=true;
countdown.innerHTML='<b>3</b><span data-ready="准备开球" data-ready-en="Get ready">准备开球</span>';
main.append(countdown);
const shotCard=document.createElement('div');
shotCard.className='snooker-shot-card';shotCard.hidden=true;
shotCard.innerHTML='<b></b><span></span>';
main.append(shotCard);
let cardTimer=0,pendingResult=null;
const ui={canvas,ctx:canvas.getContext('2d'),point,label,action,power:$('#power'),nomination:$('#nomination'),
  status(value){const text=String(value);if($('#status').textContent!==text)$('#status').textContent=text;},
  finish(text){pendingResult=text;revealResult();},
  onShoot(code){if(!board||pending||board.over||computer&&board.turn===2||Date.now()<openingUntil)return;commit(code);},
  canPlay:()=>playing&&!!board&&!pending&&!board.over&&!(computer&&board.turn===2)&&Date.now()>=openingUntil,
  board:()=>board,
  onAnimating(value){canvas._animating=value;if(!value)revealResult();},
  onShotResult(info){
    if(game!=='snooker')return;
    const b=shotCard.querySelector('b'),s=shotCard.querySelector('span');
    const gained=info.gained?.[info.shooter-1]||0,score=info.scores.join(' : ');
    if(info.over){b.textContent=label('Frame over','本局结束');s.textContent=score;}
    else if(info.penalty){b.textContent=label('Foul','犯规')+' +'+info.penalty;s.textContent=score+' · '+label('Turn passes','换人');}
    else if(gained>0){b.textContent='+'+gained+label(' pts',' 分');s.textContent=score+' · '+label('Break ','单杆 ')+info.breakScore;}
    else{b.textContent=label('No pot','未进球');s.textContent=score;}
    shotCard.hidden=false;shotCard.style.animation='none';void shotCard.offsetWidth;shotCard.style.animation='';
    clearTimeout(cardTimer);cardTimer=setTimeout(()=>{shotCard.hidden=true;},1900);
  }
};
function revealResult(){
  if(!pendingResult||canvas._animating||document.body.dataset.screen!=='play')return;
  const text=pendingResult;pendingResult=null;
  dialog.querySelector('h2').textContent=text;if(!dialog.open)dialog.showModal();
}
const controller=bubbles?createBubbles(ui):createSnooker(ui);

async function commit(code){
  pending=true;
  try{
    board=move(board,board.turn,code);
    controller.applyBoard?.(board);
    // Snooker only changes hands once the replay and pocket drops have settled.
    if(game==='snooker')await controller.whenSettled?.();
    while(computer&&!board.over&&board.turn===2){
      await new Promise(resolve=>setTimeout(resolve,game==='snooker'?320:900));
      if(!playing)return;
      board=move(board,2,bot(board,botLevels.get()));
      controller.applyBoard?.(board);
      if(game==='snooker')await controller.whenSettled?.();
    }
    if(board.over)showResult();
  }finally{pending=false;controller.refresh?.();}
}
function showResult(){
  const scores=bubbles?[board.cells[S_SCORE1],board.cells[S_SCORE2]]:viewState(board).scores;
  const winner=board.winner;
  const heading=winner?label('P'+winner+' wins!','玩家'+winner+' 获胜！'):label('Draw!','平局！');
  dialog.querySelector('h2').textContent=heading+'  '+scores.join(' : ');
  const outcome=!winner?'draw':computer&&winner===2?'loss':'win';
  globalThis.__joyflockResultSfx?.play(outcome,[game,board.moves,board.winner].join(':'));
  if(!dialog.open)dialog.showModal();
}
function syncLanguage(){
  document.documentElement.lang=label('en','zh-CN');
  const title=game==='snooker'?label('Snooker','斯诺克'):label('Bubble Shooter','泡泡射击');
  $('h1').textContent=title;$('#game-title').textContent=title;document.title=title+' — JoyFlock';
  $('#kicker').textContent=game==='snooker'?label('CUE SPORTS','杆类游戏'):label('ARCADE','休闲游戏');
  $('#lobby').textContent=label('← All games','← 所有游戏');
  $('#back').setAttribute('aria-label',label('Back to game overview','返回游戏介绍页'));
  $('#start').textContent=label('Play computer','电脑对战');
  $('#online').textContent=label('Play online','联网对战');
  $('#instructions').textContent=game==='snooker'
    ?label('Two players take turns at the table. Pot a red, then a colour; clear the colours in order. Challenge the computer or play online.','两人轮流击球，红球与彩球交替，最后按分值顺序清彩。可挑战电脑或联网对战。')
    :label('Each player owns a board and takes turns shooting. Clearing bubbles or dropping detached ones attacks the opponent; the first to hit the bottom loses.','两人各占一块球阵，轮流发射。消除同色泡泡或整串掉落都会攻击对手，把对手球阵往下压；谁的球阵先触底线谁输。');
  $('#again').textContent=label('Play again','再玩一局');
  $('#power-label span').textContent=label('Power','力度');
  $('#nomination-label span').textContent=label('Nominate colour','指定彩球');
  action.textContent=game==='snooker'?label('Shoot','击球'):label('Fire','发射');
}
function showScreen(screen){
  playing=screen==='play';
  document.body.dataset.screen=screen;
  $('#intro').hidden=playing;
  $('header').hidden=$('footer').hidden=canvas.hidden=!playing;
  if(parent!==window)parent.postMessage({type:'joyflock:game-screen',screen,game},location.origin);
}
function startGame(withComputer){
  computer=withComputer;
  unlockPoolAudio();
  unlockBubblesAudio();
  if(dialog.open)dialog.close();
  $('#power-label').hidden=game!=='snooker';action.hidden=false;
  pending=false;
  board=start(game);
  controller.reset?.();
  controller.applyBoard?.(board);
  showScreen('play');
  // The same 3 · 2 · 1 opening clock as the room shell; the table is dimmed
  // and inputs stay locked until GO. Bubble Duel keeps its own instant start.
  openingUntil=game==='snooker'?Date.now()+COUNTDOWN_TOTAL:0;
  controller.start(computer);canvas.focus();
  if(game==='snooker'){
    updatePoolCountdown(main,countdown,openingUntil,0,()=>{
      const phase=countdown.dataset.phase;
      if(phase&&phase!=='GO'){countdown.querySelector('span').textContent=label('Get ready','准备开球');return;}
      if(openingUntil){openingUntil=0;controller.refresh?.();}
    },openingUntil-COUNTDOWN_WINDOW);
  }else{openingUntil=0;cancelPoolCountdown(main);}
}
$('#online').hidden=false;
$('#start').onclick=()=>startGame(true);
$('#online').onclick=()=>{location.href='/table/index.html?game='+game;};
$('#again').onclick=()=>startGame(computer);
$('#back').onclick=()=>{
  controller.stop();
  cancelPoolCountdown(main);openingUntil=0;pendingResult=null;
  shotCard.hidden=true;clearTimeout(cardTimer);
  showScreen('home');
  $('#start').focus();
};
window.addEventListener('message',event=>{
  if(event.source!==parent||!['joyflock:hello','joyflock:locale'].includes(event.data?.type))return;
  chinese=event.data.locale==='zh';difficultyControl?.language(chinese?'zh':'en');syncLanguage();
  if(playing)controller.refresh?.();
});
syncLanguage();
