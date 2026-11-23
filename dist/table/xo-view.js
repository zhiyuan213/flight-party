import {markSvg} from './personal-piece-art.js';
// Presentation only: the winner comes from the existing local/server rules.
const LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
export function xoWinningLine(cells,winner){
 if(winner!==1&&winner!==2)return null;
 const line=LINES.find(row=>row.every(i=>cells[i]===winner));
 if(!line)return null;
 const point=i=>({x:(i%3)*100+50,y:Math.floor(i/3)*100+50});
 return {cells:line,from:point(line[0]),to:point(line[2])};
}
let maskSerial=0;
export function decoratedMark(theme,value){
 if(!['neon','coral','jade','pearl','aurora'].includes(theme))return '';
 const art=markSvg(theme,value);if(!art)return '';
 const id='xo-mask-'+(++maskSerial);
 const strokes=value===1?'<path class="xo-mask-stroke xo-first" pathLength="1" d="M88 12 12 88"/><path class="xo-mask-stroke xo-second" pathLength="1" d="M12 12 88 88"/>':'<circle class="xo-mask-stroke xo-circle" pathLength="1" cx="50" cy="50" r="35.5" transform="rotate(-90 50 50)"/>';
 return '<svg class="xo-ink xo-custom-ink" viewBox="-4 -4 108 108" aria-hidden="true"><defs><mask id="'+id+'" maskUnits="userSpaceOnUse" x="-4" y="-4" width="108" height="108">'+strokes+'</mask></defs><image width="100" height="100" href="data:image/svg+xml,'+encodeURIComponent(art)+'" mask="url(#'+id+')"/></svg>';
}
const mark=value=>value===1
 ? '<svg class="xo-ink" viewBox="8 8 84 84" aria-hidden="true"><path class="xo-stroke xo-first" pathLength="1" d="M77 23 23 77"/><path class="xo-stroke xo-second" pathLength="1" d="M23 23 77 77"/></svg>'
 : '<svg class="xo-ink" viewBox="8 8 84 84" aria-hidden="true"><circle class="xo-stroke xo-circle" pathLength="1" cx="50" cy="50" r="30" transform="rotate(-90 50 50)"/></svg>';
export function renderXo(host,state,{can,key,pieceThemes=[]}={}){
 const doc=host.ownerDocument;
 if(host._xoKey!==key||host.querySelectorAll('button.cell').length!==9){
  host._xoKey=key;host._xoCells=Array(9).fill(0);host._xoWin='';
  host.innerHTML=Array.from({length:9},(_,i)=>'<button class="cell" data-value="0" data-position="'+i+'"></button>').join('');
 }
 const reduced=doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const buttons=host.querySelectorAll('button.cell');
 buttons.forEach((button,i)=>{
  const v=state.cells[i]||0,changed=v!==host._xoCells[i],theme=pieceThemes[v-1]||'',themeChanged=button.dataset.inkTheme!==theme;
  button.dataset.inkTheme=theme;
  button.disabled=!can||!!v;
  button.setAttribute('aria-label','第'+(Math.floor(i/3)+1)+'行第'+(i%3+1)+'列'+(v?'，'+(v===1?'X':'O'):'，空位'));
  button.dataset.value=String(v);
  if(changed||(v&&themeChanged)){button.innerHTML=v?(decoratedMark(theme,v)||mark(v)):'';button.classList.toggle('xo-writing',changed&&!!v&&!reduced);}
 });
 host._xoCells=[...state.cells];
 const win=state.over?xoWinningLine(state.cells,state.winner):null;
 const signature=win?state.winner+':'+win.cells.join(','):'';
 if(signature!==host._xoWin){
  host.querySelector('.xo-win-overlay')?.remove();host._xoWin=signature;
  buttons.forEach((b,i)=>{b.classList.toggle('xo-winner',!!win?.cells.includes(i));b.classList.toggle('xo-dim',!!win&&!win.cells.includes(i)&&!!state.cells[i]);});
  if(win){
   const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');
   svg.setAttribute('viewBox','0 0 300 300');svg.setAttribute('class','xo-win-overlay xo-win-'+state.winner);svg.setAttribute('aria-hidden','true');
   svg.innerHTML='<line pathLength="1" x1="'+win.from.x+'" y1="'+win.from.y+'" x2="'+win.to.x+'" y2="'+win.to.y+'"/>';
   host.append(svg);
  }
 }
 host._xoCells=[...state.cells];
}
