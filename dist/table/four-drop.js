import {decoratePiece} from './game-cosmetics.js?v=20261112-gamelanes1&nine=20261120-nineball1&skin=20261120-billiardskins1';
import {prepareFourAudio,createFourDropSound} from './four-audio.js?v=20261113-fourfeedback1&audio=20261115-levels1';

// A poll may skip several moves or replace a game. Only a single new counter
// on an otherwise identical board represents a new, observable drop.
export function addedFourCell(previous,next){
  if(!previous||previous.cells?.length!==42||next.cells?.length!==42)return -1;
  if(Number.isFinite(previous.moves)&&Number.isFinite(next.moves)&&next.moves!==previous.moves+1)return -1;
  let added=-1;
  for(let i=0;i<42;i++)if(previous.cells[i]!==next.cells[i]){
    if(added!==-1||previous.cells[i]!==0||![1,2].includes(next.cells[i]))return -1;
    added=i;
  }
  return added;
}
export function attachFourDrop(board,panel){
  prepareFourAudio();
  const marker=document.createElement('div'),coin=document.createElement('i'),hand=document.createElement('span');
  const ghost=document.createElement('i'),beam=document.createElement('div');
  marker.className='four-drop-marker';marker.hidden=true;marker.setAttribute('aria-hidden','true');
  hand.innerHTML='<svg viewBox="0 0 72 52"><g stroke-linejoin="round"><rect x="25" y="-2" width="22" height="14" rx="6" fill="#4a7fd4" stroke="#2c5282" stroke-width="2"/><rect x="12" y="12" width="48" height="16" rx="8" fill="#f7cda0" stroke="#7a5a44" stroke-width="2"/><rect x="14" y="28" width="9" height="16" rx="4.5" fill="#f7cda0" stroke="#7a5a44" stroke-width="2"/><rect x="26" y="28" width="10" height="17" rx="5" fill="#f7cda0" stroke="#7a5a44" stroke-width="2"/><rect x="39" y="28" width="9" height="16" rx="4.5" fill="#f7cda0" stroke="#7a5a44" stroke-width="2"/><rect x="51" y="28" width="9" height="15" rx="4.5" fill="#f7cda0" stroke="#7a5a44" stroke-width="2"/><rect x="2" y="18" width="10" height="14" rx="5" fill="#f7cda0" stroke="#7a5a44" stroke-width="2" transform="rotate(-16 7 25)"/></g></svg>';
  marker.append(coin,hand);
  ghost.className='four-drop-ghost';ghost.hidden=true;ghost.setAttribute('aria-hidden','true');
  beam.className='four-drop-beam';beam.hidden=true;beam.setAttribute('aria-hidden','true');
  panel.append(beam,ghost,marker);
  let lastState,latestState,hover,turn,can,animation,lastSound,disposed=false;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  board._fourDropAnimating=false;board._fourDropDone=Promise.resolve(null);
  const snapshot=state=>({...state,cells:state.cells.slice()});
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
    marker.dataset.player=turn;marker.dataset.mode='preview';decoratePiece(coin,turn);place(top);
    const origin=panel.getBoundingClientRect(),head=centre(top,origin),goal=centre(target,origin);
    ghost.dataset.player=turn;decoratePiece(ghost,turn);ghost.hidden=false;
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
  const observer=new ResizeObserver(()=>{reserveLaunchRow();if(!animation)preview();});observer.observe(board);
  const select=event=>{
    const cell=event.target.closest('.cell');
    if(cell){hover=Number(cell.dataset.position);preview();}
  };
  board.addEventListener('pointermove',select);
  board.addEventListener('focusin',select);
  const leave=()=>{hover=undefined;preview();};board.addEventListener('pointerleave',leave);
  function detail(drop){return {index:drop.index,player:drop.player,state:snapshot(latestState)};}
  function emit(name,drop){board.dispatchEvent(new CustomEvent('four:'+name,{detail:detail(drop),bubbles:true}));}
  function clearAnimation(drop){
    cancelAnimationFrame(drop.frame);animation=null;board._fourDropAnimating=false;
    drop.flight?.cancel();hand.getAnimations().forEach(a=>a.cancel());
    cells().forEach(cell=>cell.classList.remove('four-drop-hidden'));
    marker.hidden=true;
  }
  function cancelActive(){
    if(!animation)return;
    const drop=animation;drop.sound.cancel();clearAnimation(drop);
    drop.resolve({...detail(drop),cancelled:true});
  }
  function reset(){
    cancelActive();lastSound?.cancel();lastState=null;hover=undefined;can=false;marker.hidden=true;clearHint();
  }
  function contact(drop){
    if(drop.landed)return;drop.landed=true;drop.sound.land();emit('land',drop);
  }
  function finish(drop,reduced=false){
    if(animation!==drop)return;
    contact(drop);
    if(animation!==drop)return;
    if(!reduced)drop.sound.settle();
    clearAnimation(drop);preview();emit('settled',drop);
    drop.resolve({...detail(drop),cancelled:false});
  }
  function tick(drop){
    if(animation!==drop)return;
    if(document.hidden||!board.isConnected){cancelActive();return;}
    // Read the SAME WAAPI timeline that moves the counter. Wall-clock timers
    // would land early when an animation is pending or paused, or after leave.
    const elapsed=drop.flight.currentTime;
    if(elapsed!==null){
      if(!drop.released){drop.released=true;drop.sound.release();emit('release',drop);}
      if(animation!==drop)return;
      if(elapsed>=drop.dropTime)contact(drop);
      if(animation!==drop)return;
      if(elapsed>=drop.duration){finish(drop);return;}
    }
    drop.frame=requestAnimationFrame(()=>tick(drop));
  }
  const visibility=()=>{if(document.hidden){cancelActive();lastSound?.cancel();}};
  const pagehide=()=>reset();
  const reduce=()=>{if(reducedMotion.matches&&animation)finish(animation,true);};
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',pagehide);
  reducedMotion.addEventListener?.('change',reduce);
  function update(state,allowed,playing){
    if(disposed)return;
    if(!playing){reset();return;}
    latestState=snapshot(state);turn=state.turn;can=allowed;
    if(state.moves===0){reset();turn=state.turn;can=allowed;}
    reserveLaunchRow();
    const changed=addedFourCell(lastState,state);
    const same=lastState&&lastState.moves===state.moves&&state.cells.every((value,i)=>value===lastState.cells[i]);
    lastState=snapshot(state);
    if(animation&&!same)cancelActive();
    if(animation){cells()[animation.index]?.classList.add('four-drop-hidden');decoratePiece(coin,animation.player);}
    if(changed<0){preview();return;}
    clearHint();
    const buttons=cells(),target=buttons[changed],top=buttons[changed%7];
    if(!target||!top||document.hidden||!board.isConnected){preview();return;}
    let resolve;
    board._fourDropDone=new Promise(done=>{resolve=done;});board._fourDropAnimating=true;
    const drop={index:changed,player:state.cells[changed],sound:createFourDropSound(),resolve,frame:0};animation=drop;lastSound=drop.sound;
    if(reducedMotion.matches||typeof coin.animate!=='function'){finish(drop,true);return;}
    target.classList.add('four-drop-hidden');
    marker.dataset.player=drop.player;decoratePiece(coin,drop.player);marker.dataset.mode='drop';marker.hidden=false;
    place(top);
    const panelTop=panel.getBoundingClientRect().top;
    const rect=target.getBoundingClientRect(),distance=rect.top+rect.height/2-panelTop-parseFloat(marker.style.top);
    const dropTime=Math.min(465,Math.max(175,Math.sqrt(distance)*15)),bounce=Math.min(24,distance*.07);
    const duration=dropTime+275,at=dropTime/duration;
    hand.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-24px)'}],{duration:240,fill:'both'});
    drop.dropTime=dropTime;drop.duration=duration;
    drop.flight=coin.animate([
      {transform:'translateY(0)',offset:0,easing:'cubic-bezier(.5,0,.8,.45)'},
      {transform:'translateY('+distance+'px)',offset:at,easing:'ease-out'},
      {transform:'translateY('+(distance-bounce)+'px)',offset:at+(1-at)*.42,easing:'ease-in'},
      {transform:'translateY('+distance+'px)',offset:1}
    ],{duration,fill:'both'});
    drop.flight.finished.then(()=>{
      if(animation!==drop)return;
      if(document.hidden||!board.isConnected)cancelActive();else finish(drop);
    },()=>{if(animation===drop)cancelActive();});
    drop.frame=requestAnimationFrame(()=>tick(drop));
  }
  update.cancel=reset;
  update.dispose=()=>{
    if(disposed)return;reset();disposed=true;observer.disconnect();
    board.removeEventListener('pointermove',select);board.removeEventListener('focusin',select);board.removeEventListener('pointerleave',leave);
    document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pagehide);
    reducedMotion.removeEventListener?.('change',reduce);
    marker.remove();ghost.remove();beam.remove();
  };
  return update;
}
