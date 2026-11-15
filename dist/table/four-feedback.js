/* Visual feedback only: wins and turns still come from grid-rules / the server. */
export function analyzeFourConnections(state) {
  const cells=state?.cells||[],chains=Array(42).fill(0),lines=[],winningCells=new Set();
  for(let row=0;row<6;row++)for(let col=0;col<7;col++){
    const player=cells[row*7+col];if(player!==1&&player!==2)continue;
    for(const [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){
      const pr=row-dr,pc=col-dc;
      if(pr>=0&&pr<6&&pc>=0&&pc<7&&cells[pr*7+pc]===player)continue;
      const run=[];
      for(let r=row,c=col;r>=0&&r<6&&c>=0&&c<7&&cells[r*7+c]===player;r+=dr,c+=dc)run.push(r*7+c);
      if(run.length<2)continue;
      lines.push({player,cells:run});
      for(const index of run){
        chains[index]=Math.max(chains[index],run.length);
        if(state.over&&state.winner===player&&run.length>=4)winningCells.add(index);
      }
    }
  }
  return {chains,lines,winningCells:[...winningCells]};
}

const snapshot=state=>({...state,cells:[...(state?.cells||[])]});
const signature=state=>[state?.moves,state?.over?1:0,state?.winner||0,...(state?.cells||[])].join(':');

export function attachFourFeedback(board,panel,{onWin}={}) {
  const doc=board.ownerDocument,svgNS='http://www.w3.org/2000/svg';
  const lineLayer=doc.createElementNS(svgNS,'svg');lineLayer.classList.add('four-win-line');
  lineLayer.setAttribute('aria-hidden','true');
  const celebration=doc.createElement('div');celebration.className='four-celebration';celebration.setAttribute('aria-hidden','true');
  panel.append(lineLayer,celebration);
  let current=null,shown=null,match=null,eligibleWin=null,celebrated=null,disposed=false;
  const cellNodes=()=>Array.from(board.querySelectorAll('.cell'));
  function clearClasses(){
    board.classList.remove('four-victory');
    for(const cell of cellNodes()){
      cell.classList.remove('four-linked','four-winning');delete cell.dataset.fourChain;
    }
  }
  function drawLines(result){
    lineLayer.replaceChildren();
    const bounds=panel.getBoundingClientRect(),nodes=cellNodes();
    lineLayer.setAttribute('viewBox',`0 0 ${Math.max(1,bounds.width)} ${Math.max(1,bounds.height)}`);
    for(const line of result.lines){
      if(line.cells.length<4||!shown?.over||line.player!==shown.winner)continue;
      const first=nodes[line.cells[0]]?.getBoundingClientRect(),last=nodes[line.cells.at(-1)]?.getBoundingClientRect();
      if(!first||!last)continue;
      const node=doc.createElementNS(svgNS,'line');
      node.setAttribute('x1',first.x+first.width/2-bounds.x);node.setAttribute('y1',first.y+first.height/2-bounds.y);
      node.setAttribute('x2',last.x+last.width/2-bounds.x);node.setAttribute('y2',last.y+last.height/2-bounds.y);
      lineLayer.append(node);
    }
  }
  function paint(){
    clearClasses();
    const result=analyzeFourConnections(shown),winning=new Set(result.winningCells),nodes=cellNodes();
    for(let index=0;index<nodes.length;index++){
      // A newly rebuilt board can already contain the still-falling counter.
      if(!shown?.cells[index]||Number(nodes[index].dataset.value)!==shown.cells[index])continue;
      const length=result.chains[index];if(length<2)continue;
      nodes[index].classList.add(winning.has(index)?'four-winning':'four-linked');
      nodes[index].dataset.fourChain=String(Math.min(4,length));
    }
    board.classList.toggle('four-victory',winning.size>0);drawLines(result);return result;
  }
  function burst(result){
    celebration.replaceChildren();
    if(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
    const bounds=panel.getBoundingClientRect(),nodes=cellNodes(),colors=['#fff5ce','#ffc958','#ff7194','#36dfe0','#b09aff'];
    result.winningCells.forEach((index,cellIndex)=>{
      const rect=nodes[index]?.getBoundingClientRect();if(!rect)return;
      for(let n=0;n<13;n++){
        const particle=doc.createElement('i'),angle=n/13*Math.PI*2;
        particle.className=n<6?'four-spark':'four-confetti';
        const reach=rect.width*(.7+(n%4)*.25);
        for(const [name,value] of Object.entries({x:`${rect.x+rect.width/2-bounds.x}px`,y:`${rect.y+rect.height/2-bounds.y}px`,dx:`${Math.cos(angle)*reach}px`,dy:`${Math.sin(angle)*reach-rect.height*.4}px`,spin:`${(n%2?1:-1)*(180+n*31)}deg`,delay:`${cellIndex*.06}s`,duration:`${.9+(n%4)*.16}s`,color:colors[n%colors.length]}))particle.style.setProperty('--'+name,value);
        particle.addEventListener('animationend',()=>particle.remove(),{once:true});
        celebration.append(particle);
      }
    });
  }
  function settle(){
    if(!current||disposed)return;
    shown=snapshot(current);const result=paint(),key=signature(current);
    if(!doc.hidden&&eligibleWin===key&&celebrated!==key&&result.winningCells.length){
      celebrated=key;eligibleWin=null;burst(result);
      onWin?.({state:snapshot(current),lines:result.lines.filter(line=>line.player===current.winner&&line.cells.length>=4),cells:result.winningCells});
    }
  }
  function landed(event){
    if(current&&signature(event.detail?.state)===signature(current))settle();
  }
  board.addEventListener('four:settled',landed);
  const visible=()=>{if(!doc.hidden&&!board._fourDropAnimating&&current)settle();};
  doc.addEventListener('visibilitychange',visible);
  const resize=typeof ResizeObserver==='function'?new ResizeObserver(()=>{if(shown)drawLines(analyzeFourConnections(shown));}):null;
  resize?.observe(panel);
  function reset(){current=shown=null;eligibleWin=celebrated=null;clearClasses();lineLayer.replaceChildren();celebration.replaceChildren();}
  function update(state,playing=true,matchKey='local'){
    if(disposed)return;
    if(!playing||!state?.cells){reset();match=matchKey;return;}
    if(match!==matchKey){reset();match=matchKey;}
    const next=snapshot(state),key=signature(next);
    if(!current){current=shown=next;paint();return;}
    if(signature(current)!==key){
      eligibleWin=!current.over&&next.over&&next.winner?key:null;
      if((next.moves||0)<(current.moves||0)||!next.moves){reset();current=shown=next;paint();return;}
      current=next;
    }
    if(board._fourDropAnimating){paint();return;}
    settle();
  }
  update.reset=reset;
  update.dispose=()=>{reset();disposed=true;resize?.disconnect();board.removeEventListener('four:settled',landed);doc.removeEventListener('visibilitychange',visible);lineLayer.remove();celebration.remove();};
  return update;
}
