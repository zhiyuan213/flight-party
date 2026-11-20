// Snooker play shell: the two seats move to a top matchup bar (like the main
// pool game), each seat shows the ball(s) that may legally be struck, and the
// live score/turn line moves under the table.
import {drawPoolBall} from './pool-ball.js?v=20261112-gamelanes1';
import {colours,snookerTargets} from './snooker.js?v=20261110-dotblack1&release=20261115-polishrelease1&power=20261120-poolpower30';
const $=id=>document.getElementById(id);
let built=false,latest=null,score=null,target=null;
const zh=()=>document.documentElement.lang!=='en';
const sphereColour=id=>id===0?0:id<=6?id+1:1;
function ball(id){
  const canvas=document.createElement('canvas');
  canvas.width=36;canvas.height=36;canvas.className='snooker-target-ball';
  drawPoolBall(canvas.getContext('2d'),sphereColour(id),18,18,14,0,0,null,null,{plain:true,palette:colours});
  return canvas;
}
/* Both seats display the same "ball on" strip: snooker has no per-player
   groups, so the legal targets are shared. The inactive seat is dimmed by CSS. */
function targetNodes(state){
  const nodes=[],tag=document.createElement('small');
  tag.className='snooker-targets-label';
  if(!state){tag.textContent=zh()?'可击打':'Ball on';return [tag];}
  let ids=[],note='';
  if(state.on==='red'){
    ids=[7];note='×'+snookerTargets(state).length;
    tag.textContent=zh()?'可击打 红球':'Red on';
  }else if(state.on==='colour'){
    ids=snookerTargets(state).filter(id=>id<=6&&state.cells[id*3+2]);
    tag.textContent=zh()?'可击打 彩球':'Colour on';
  }else{
    ids=[state.on].filter(id=>state.cells[id*3+2]);
    note='+'+(state.on+1);tag.textContent=zh()?'可击打':'Ball on';
  }
  nodes.push(tag,...ids.map(ball));
  if(note){const n=document.createElement('small');n.className='snooker-targets-note';n.textContent=note;nodes.push(n);}
  return nodes;
}
function decorateSeats(){
  const seats=document.querySelectorAll('#seats .seat');
  if(!seats.length)return;
  seats.forEach((seat,index)=>{
    /* The view reports its state only when a shot has settled, so the active
      seat follows the VISIBLE turn: it never flips while balls are rolling. */
    if(latest)seat.classList.toggle('active',!latest.over&&latest.turn===index+1);
    const copy=seat.querySelector('.seat-copy')||seat;
    let row=copy.querySelector('.snooker-targets');
    if(!row){row=document.createElement('div');row.className='snooker-targets';copy.append(row);}
    row.setAttribute('aria-label',index===0?(zh()?'玩家一可击打球':'Player one ball on'):(zh()?'玩家二可击打球':'Player two ball on'));
    /* Each seat needs freshly drawn nodes: cloneNode(true) on a canvas copies
       its size and class but NOT its bitmap, so cloned target balls render as
      empty squares. */
    row.replaceChildren(...targetNodes(latest));
  });
}
function apply(){
  if(!built||!score)return;
  score.textContent=latest?latest.scores.join(' : '):'0 : 0';
  if(!latest){target.textContent=zh()?'准备开球':'Ready to break';return;}
  const names=zh()?['黄球','绿球','棕球','蓝球','粉球','黑球']:['Yellow','Green','Brown','Blue','Pink','Black'];
  target.textContent=latest.inHand?(zh()?'在 D 区摆放白球':'Place cue ball in the D')
    :latest.over?(zh()?'本局结束':'Game over')
    :latest.on==='red'?(zh()?'红球':'Red')
    :latest.on==='colour'?(zh()?'彩球':'Colour')
    :names[latest.on-1]||'';
}
export function mountSnookerShell(){
  // Re-applied on every render (seats are rebuilt each frame) and on locale
  // changes, so the plaque and the target strips always follow the language.
  if(!built){
    built=true;
    const panel=document.querySelector('.game-panel'),board=$('board');
    if(!panel||!board)return;
    const top=document.createElement('div');top.className='snooker-matchup';
    const centre=document.createElement('div');centre.className='snooker-centre';
    score=document.createElement('strong');score.className='snooker-score';score.textContent='0 : 0';
    target=document.createElement('small');target.className='snooker-target';
    centre.append(score,target);
    top.append($('seats'),centre);
    panel.insertBefore(top,board);
    const strip=document.createElement('div');strip.className='snooker-status-strip';
    strip.append($('status'),$('again'));
    board.after(strip);
  }
  decorateSeats();apply();
}
export function updateSnookerShell(state){latest=state||null;decorateSeats();apply();}
