import {chessLegal,chessReplay} from './chess-rules.js?v=20261106-chess';

const pieces=[
 '<path d="M35 73c-1-9 11-12 15-19 3-4 4-9 5-14h10c1 5 2 10 5 14 4 7 16 10 15 19Z"/><circle cx="60" cy="30" r="14"/><path d="M48 40h24a5 5 0 0 1 0 10H48a5 5 0 0 1 0-10Z"/>',
 '<path d="M36 74c0-19 2-43 19-52l5-9c2-3 6-1 6 2l1 7 19 14a7 7 0 0 1 2 10l-4 5a6 6 0 0 1-7 1l-9-5c1 9 11 13 11 27Z"/><path class="chess-piece-detail" d="m65 31 4 2"/>',
 '<path d="M41 74c-6-6-9-12-9-19 0-11 11-23 23-32l5-5 6 6-8 18 6 3 9-15c9 9 15 16 15 25 0 7-3 13-9 19Z"/><circle cx="60" cy="17" r="8"/>',
 '<path d="M42 75l4-37h28l4 37Z"/><path d="M35 19h12v11h7V19h12v11h7V19h12v19l-8 7H43l-8-7Z"/>',
 '<path d="M39 75 28 35l19 17 3-27 10 26 10-26 3 27 19-17-11 40Z"/><circle cx="29" cy="35" r="7"/><circle cx="50" cy="25" r="7"/><circle cx="70" cy="25" r="7"/><circle cx="91" cy="35" r="7"/>',
 '<path d="M44 74C27 58 26 44 36 38c8-5 17-1 24 6 7-7 16-11 24-6 10 6 9 20-8 36Z"/><path d="M55 39V29H44v-9h11V10h10v10h11v9H65v10Z"/><path class="chess-piece-detail" d="m46 50 8 10m20-10-8 10"/>'
];
const pieceNames=['兵','马','象','车','后','王'];
const files='abcdefgh';

function pieceImage(value){
 if(!value)return '';
 return '<svg class="chess-piece '+(value>6?'is-black':'is-white')+'" viewBox="14 5 92 96" aria-hidden="true">'+pieces[(value-1)%6]+'<rect x="27" y="72" width="66" height="16" rx="5"/><path class="chess-piece-detail" d="M34 81h52"/></svg>';
}

function makeReview(host,refresh){
 const panel=document.createElement('section');
 panel.className='chess-review';
 panel.innerHTML='<h2>走棋记录</h2><div class="chess-review-tools"><button type="button" data-step="start" aria-label="初始局面">«</button><button type="button" data-step="previous" aria-label="上一步">‹</button><button type="button" data-step="next" aria-label="下一步">›</button><button type="button" data-step="live" aria-label="最新局面">»</button><button type="button" data-step="flip">翻转棋盘</button></div><ol class="chess-moves" aria-label="走棋记录"></ol><p class="chess-review-status" role="status"></p>';
 host.closest('.arena').querySelector('.turn-panel').after(panel);
 const review={panel,cursor:null,flip:false,frames:null};
 panel.addEventListener('click',event=>{
  const button=event.target.closest('button');
  if(!button)return;
  const latest=review.frames.length-1;
  const current=review.cursor??latest;
  const step=button.dataset.step;
  if(step==='flip')review.flip=!review.flip;
  else{
   const next=step==='start'?0:step==='previous'?current-1:step==='next'?current+1:step==='live'?latest:Number(button.dataset.ply);
   review.cursor=next>=latest?null:Math.max(0,next);
  }
  refresh();
 });
 return review;
}

export function renderChess(host,state,{can,selected,seat,key,refresh}){
 const review=host._chessReview??=makeReview(host,refresh);
 if(review.key!==key){review.key=key;review.cursor=null;review.flip=false;review.history=null;}
 const history=state.history.join(' ');
 if(review.history!==history){review.history=history;review.frames=chessReplay(state.history);}
 const latest=review.frames.length-1;
 if(review.cursor!==null&&review.cursor>=latest)review.cursor=null;
 const current=review.cursor??latest;
 const frame=review.frames[current];
 const flipped=(seat===2)!==review.flip;
 const playable=can&&review.cursor===null;
 const targets=new Set(playable&&selected!==null?chessLegal(state)
  .filter(code=>Math.floor(code%4096/64)===selected).map(code=>code%64):[]);
 host.innerHTML=Array.from({length:64},(_,visual)=>{
  const square=flipped?63-visual:visual;
  const row=Math.floor(square/8),col=square%8;
  const value=frame.cells[square],name=files[col]+(8-row);
  const label=value?(value>6?'黑':'白')+pieceNames[(value-1)%6]:'空格';
  const classes=['cell','chess-square',(row+col)%2?'dark':'light'];
  if(playable&&selected===square)classes.push('chosen');
  if(frame.from===square||frame.to===square)classes.push('chess-last');
  if(frame.check===square)classes.push('chess-check');
  if(targets.has(square))classes.push(value?'chess-capture':'chess-target');
  return '<button type="button" class="'+classes.join(' ')+'" data-position="'+square+'" data-rank="'+(8-row)+'" data-file="'+files[col]+'" aria-label="'+name+' '+label+'" '+(playable?'':'disabled')+'>'+pieceImage(value)+'</button>';
 }).join('');
 const {panel}=review;
 for(const step of ['start','previous','next','live'])panel.querySelector('[data-step="'+step+'"]').disabled=
  step==='start'||step==='previous'?current===0:current===latest;
 const list=panel.querySelector('.chess-moves');
 if(review.listHistory!==history){
  review.listHistory=history;
  list.replaceChildren();
  for(let i=1;i<=latest;i+=2){
   const row=document.createElement('li');
   const number=document.createElement('span');
   number.textContent=Math.ceil(i/2)+'.';
   row.append(number);
   for(const ply of [i,i+1])if(ply<=latest){
    const button=document.createElement('button');
    button.type='button';
    button.dataset.ply=ply;
    button.textContent=review.frames[ply].san;
    row.append(button);
   }
   list.append(row);
  }
 }
 for(const button of list.querySelectorAll('button'))button.setAttribute('aria-current',String(Number(button.dataset.ply)===current));
 if(review.lastViewed!==current){
  review.lastViewed=current;
  if(current===latest)list.scrollTop=list.scrollHeight;
 }
 panel.querySelector('.chess-review-status').textContent=review.cursor!==null?'正在回看第 '+current+' 步':frame.check>=0&&!state.over?'将军':latest?'':'第一步走完后显示记录';
}
