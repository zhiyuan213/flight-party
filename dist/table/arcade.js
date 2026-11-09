import {createBubbles} from './bubbles.js?v=20261109-duel1';
import {createSnooker} from './snooker-view.js?v=20261109-snookerlive1';
import {unlockPoolAudio} from './pool-audio.js?v=20261106-ui2';
import {start,move,bot} from './grid-rules.js?v=20261109-snookerlive1';
import {viewState} from './snooker-duel.js?v=20261109-snookerlive1';
import {S_SCORE1,S_SCORE2} from './bubbles-duel.js?v=20261109-duel1';

const $=selector=>document.querySelector(selector);
const game=new URLSearchParams(location.search).get('game')==='snooker'?'snooker':'bubbles';
const bubbles=game==='bubbles';
const canvas=$('canvas'),dialog=$('dialog'),action=$('#action');
document.body.classList.add(game);
document.body.dataset.screen='home';
$('#cover').src='/assets/covers/'+game+'.jpg?v=20261109-coverhd1';
let chinese=false,playing=false;
try{chinese=localStorage.getItem('joyflock-portal-language')==='zh';}catch{}
const label=(en,zh)=>chinese?zh:en;
const point=event=>{
  const rect=canvas.getBoundingClientRect();
  return {x:(event.clientX-rect.left)*canvas.width/rect.width,y:(event.clientY-rect.top)*canvas.height/rect.height};
};
let board=null,computer=false,pending=false;
const ui={canvas,ctx:canvas.getContext('2d'),point,label,action,power:$('#power'),nomination:$('#nomination'),
  status(text){if($('#status').textContent!==text)$('#status').textContent=text;},
  finish(text){dialog.querySelector('h2').textContent=text;if(!dialog.open)dialog.showModal();},
  onShoot(code){if(!board||pending||board.over||computer&&board.turn===2)return;commit(code);},
  canPlay:()=>playing&&!!board&&!pending&&!board.over&&!(computer&&board.turn===2),
  board:()=>board
};
const controller=bubbles?createBubbles(ui):createSnooker(ui);

async function commit(code){
  pending=true;
  try{
    board=move(board,board.turn,code);
    controller.applyBoard?.(board);
    while(computer&&!board.over&&board.turn===2){
      await new Promise(resolve=>setTimeout(resolve,game==='snooker'?Math.min(6500,((board.history?.length||0)*16)+300):900));
      if(!playing)return;
      board=move(board,2,bot(board));
      controller.applyBoard?.(board);
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
    :label('Take turns shooting. Match three or more bubbles to clear them; the higher score after 24 rounds wins.','两人轮流发射，三个及以上同色泡泡相连即可消除；24 回合后得分高者获胜。');
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
  if(dialog.open)dialog.close();
  $('#power-label').hidden=game!=='snooker';action.hidden=false;
  pending=false;
  board=start(game);
  controller.reset?.();
  controller.applyBoard?.(board);
  showScreen('play');
  controller.start(computer);canvas.focus();
}
$('#online').hidden=false;
$('#start').onclick=()=>startGame(true);
$('#online').onclick=()=>{location.href='/table/index.html?game='+game;};
$('#again').onclick=()=>startGame(computer);
$('#back').onclick=()=>{
  controller.stop();
  showScreen('home');
  $('#start').focus();
};
window.addEventListener('message',event=>{
  if(event.source!==parent||!['joyflock:hello','joyflock:locale'].includes(event.data?.type))return;
  chinese=event.data.locale==='zh';syncLanguage();
  if(playing)controller.refresh?.();
});
syncLanguage();
