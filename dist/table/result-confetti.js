/* DEPRECATED — kept as a fallback reference only.
   Every table game now ends in the shared result dialog (pool-shell.js
   updateGridResult / updateFourResult / updatePoolShell), whose own
   celebrateResult() owns the confetti stream inside the dialog. table.js no
   longer imports this module. Pieces and keyframes were deliberately reused
   from pool-shell.css so a win looked identical in every game; that visual
   still lives on in celebrateResult() with the same palette and timing.

   Win/Loss loop forever (stratified negative delays keep the stream continuous
   from frame 0, so it never falls off the bottom in one wave and goes blank).
   A draw is one finite shower. Everything is cleared on a new round, on going
   home, and under prefers-reduced-motion. */
let layer=null,currentKey=null,drawTimer=null;
const reduced=()=>Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

function removeLayer(){
  clearTimeout(drawTimer);drawTimer=null;
  if(layer){layer.replaceChildren();layer.remove();layer=null;}
}
function clear(){removeLayer();currentKey=null;}

function build(kind){
  const palette=kind==='win'?['#f5d584','#fff1be','#63d7cf','#89abff','#d1a2f0']
    :kind==='loss'?['#767676','#9b9b9b','#bdbdbd','#d8d8d8']
    :['#75d7d0','#afc5ff','#f1d899'];
  const count=kind==='win'?76:44,looping=kind!=='draw';
  const frag=document.createDocumentFragment();
  for(let i=0;i<count;i++){
    const piece=document.createElement('i'),duration=1.8+Math.random()*1.1;
    const phase=(i+Math.random())/count;
    const delay=looping?-(0.05+phase*(duration-0.05)):Math.random()*.55;
    piece.style.setProperty('--x',(Math.random()*100).toFixed(2)+'%');
    piece.style.setProperty('--drift',(Math.random()*32-16).toFixed(2)+'vw');
    piece.style.setProperty('--delay',delay.toFixed(2)+'s');
    piece.style.setProperty('--duration',duration.toFixed(2)+'s');
    piece.style.setProperty('--spin',(Math.random()*900-450).toFixed(0)+'deg');
    piece.style.setProperty('--color',palette[i%palette.length]);
    piece.style.setProperty('--width',(5+Math.random()*5).toFixed(1)+'px');
    frag.append(piece);
  }
  layer.append(frag);
}

/* key is identical to the result-sfx key in table.js / pool-shell.js, so a
   rematch, a fresh board or leaving the play screen can be detected exactly. */
export function updateResultConfetti(options,kind){
  const over=Boolean(options?.board?.over)&&document.body.dataset.screen==='play';
  if(!over){if(currentKey!==null)clear();return;}
  const key=[options.room?.id||'local',options.board.moves,options.board.winner].join(':');
  if(key===currentKey)return;
  clear();currentKey=key;
  if(reduced())return;
  layer=document.createElement('div');
  layer.className='pool-result-confetti joyflock-board-confetti';
  layer.dataset.outcome=kind;
  layer.setAttribute('aria-hidden','true');
  document.body.append(layer);
  build(kind);
  // Keep currentKey after a finite draw shower, otherwise the next room poll
  // would start the same shower all over again.
  if(kind==='draw')drawTimer=setTimeout(removeLayer,3600);
}
