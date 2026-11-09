export function attachFourDrop(board,panel){
  const marker=document.createElement('div'),coin=document.createElement('i'),hand=document.createElement('span');
  const ghost=document.createElement('i'),beam=document.createElement('div');
  marker.className='four-drop-marker';marker.hidden=true;marker.setAttribute('aria-hidden','true');
  hand.innerHTML='<svg viewBox="0 0 72 52"><path d="M34-4h19v20c7 1 13 6 13 13v8c0 7-8 8-10 1l-2-8c-2-3-7-3-9 1l-5 12c-3 7-11 4-10-2l2-11-8 7c-6 4-11-3-7-7l11-13 6-7z" fill="#f5c999" stroke="#865e50" stroke-width="2.3" stroke-linejoin="round"/></svg>';
  marker.append(coin,hand);
  ghost.className='four-drop-ghost';ghost.hidden=true;ghost.setAttribute('aria-hidden','true');
  beam.className='four-drop-beam';beam.hidden=true;beam.setAttribute('aria-hidden','true');
  panel.append(beam,ghost,marker);
  let lastCells,hover,turn,can,animation,hiddenCell;
  const cells=()=>Array.from(board.querySelectorAll('.cell'));
  function reserveLaunchRow(){
    const cell=cells()[0];
    const height=cell?.getBoundingClientRect().height;
    if(height>0)panel.style.setProperty('--four-launch-height',Math.ceil(height*1.22)+8+'px');
  }
  function centre(node,origin){
    const rect=node.getBoundingClientRect();
    return {x:rect.left-origin.left+rect.width/2,y:rect.top-origin.top+rect.height/2,size:rect.width};
  }
  function place(cell){
    const rect=cell.getBoundingClientRect(),origin=panel.getBoundingClientRect();
    marker.style.left=(rect.left-origin.left+rect.width/2)+'px';
    const boardTop=board.getBoundingClientRect().top-origin.top;
    marker.style.top=(boardTop-rect.height/2-4)+'px';
    marker.style.setProperty('--coin-size',rect.width+'px');
  }
  function clearHint(){
    ghost.hidden=true;beam.hidden=true;
    cells().forEach(cell=>cell.classList.remove('four-col-hover','four-landing'));
  }
  function landing(list){
    if(!Number.isInteger(hover)||hover<0||hover>6)return null;
    for(let row=5;row>=0;row--){
      const cell=list[row*7+hover];
      if(cell&&cell.dataset.value==='0')return cell;
    }
    return null;
  }
  function preview(){
    if(animation)return;
    const list=cells(),top=hover===undefined?null:list[hover],target=landing(list);
    const shown=can&&top&&target&&top.dataset.value==='0';
    marker.hidden=!shown;
    if(!shown){clearHint();return;}
    marker.dataset.player=turn;marker.dataset.mode='preview';place(top);
    const origin=panel.getBoundingClientRect(),head=centre(top,origin),goal=centre(target,origin);
    ghost.dataset.player=turn;ghost.hidden=false;
    ghost.style.left=goal.x+'px';ghost.style.top=goal.y+'px';
    ghost.style.setProperty('--coin-size',goal.size+'px');
    beam.dataset.player=turn;beam.hidden=false;
    beam.style.left=head.x+'px';beam.style.top=head.y+'px';
    beam.style.height=Math.max(0,goal.y-head.y)+'px';
    beam.style.setProperty('--coin-size',goal.size+'px');
    const landingAt=list.indexOf(target);
    list.forEach((cell,i)=>{
      cell.classList.toggle('four-col-hover',i%7===hover);
      cell.classList.toggle('four-landing',i===landingAt);
    });
  }
  new ResizeObserver(()=>{reserveLaunchRow();if(!animation)preview();}).observe(board);
  const select=event=>{
    const cell=event.target.closest('.cell');
    if(cell){hover=Number(cell.dataset.position);preview();}
  };
  board.addEventListener('pointermove',select);
  board.addEventListener('focusin',select);
  board.addEventListener('pointerleave',()=>{hover=undefined;preview();});
  function reset(){
    animation?.cancel();animation=null;hiddenCell=null;lastCells=null;
    marker.hidden=true;coin.getAnimations().forEach(a=>a.cancel());hand.getAnimations().forEach(a=>a.cancel());
    clearHint();
  }
  return function update(state,allowed,playing){
    turn=state.turn;can=allowed;
    if(!playing||state.moves===0)reset();
    if(!playing)return;
    reserveLaunchRow();
    const changed=lastCells?state.cells.findIndex((value,i)=>value&&!lastCells[i]):-1;
    lastCells=state.cells.slice();
    if(animation&&hiddenCell!==null)cells()[hiddenCell]?.classList.add('four-drop-hidden');
    if(changed<0||matchMedia('(prefers-reduced-motion: reduce)').matches){preview();return;}
    animation?.cancel();cells().forEach(cell=>cell.classList.remove('four-drop-hidden'));
    clearHint();
    const buttons=cells(),target=buttons[changed],top=buttons[changed%7];
    if(!target||!top)return;
    hiddenCell=changed;target.classList.add('four-drop-hidden');
    marker.dataset.player=state.cells[changed];marker.dataset.mode='drop';marker.hidden=false;
    place(top);
    const panelTop=panel.getBoundingClientRect().top;
    const rect=target.getBoundingClientRect(),distance=rect.top+rect.height/2-panelTop-parseFloat(marker.style.top);
    const dropTime=Math.min(465,Math.max(175,Math.sqrt(distance)*15)),bounce=Math.min(24,distance*.07);
    const duration=dropTime+275,at=dropTime/duration;
    hand.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-24px)'}],{duration:240,fill:'both'});
    const flight=coin.animate([
      {transform:'translateY(0)',offset:0,easing:'cubic-bezier(.5,0,.8,.45)'},
      {transform:'translateY('+distance+'px)',offset:at,easing:'ease-out'},
      {transform:'translateY('+(distance-bounce)+'px)',offset:at+(1-at)*.42,easing:'ease-in'},
      {transform:'translateY('+distance+'px)',offset:1}
    ],{duration,fill:'both'});
    animation=flight;
    board._fourDropDone=flight.finished.catch(()=>{}).then(()=>{
      if(animation!==flight)return;
      animation=null;hiddenCell=null;flight.cancel();
      cells().forEach(cell=>cell.classList.remove('four-drop-hidden'));preview();
    });
  };
}
