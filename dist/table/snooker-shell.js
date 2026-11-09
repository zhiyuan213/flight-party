// Snooker play shell: the two seats move to a top matchup bar (like the main
// pool game) and the live score/turn line moves under the table.
const $=id=>document.getElementById(id);
let built=false,latest=null,score=null,target=null;
const zh=()=>document.documentElement.lang!=='en';
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
  // Re-applied on every render so a language switch updates the plaque too.
  if(built){apply();return;}
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
  apply();
}
export function updateSnookerShell(state){latest=state||null;apply();}
