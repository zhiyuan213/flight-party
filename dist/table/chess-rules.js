import {Chess} from '../vendor/chess-1.4.0.js?v=20261104-seven';
const symbols='pnbrqk';const square=i=>String.fromCharCode(97+i%8)+(8-Math.floor(i/8));const index=s=>(8-Number(s[1]))*8+s.charCodeAt(0)-97;
export const encodeChess=m=>index(m.from)*64+index(m.to)+4096*({q:1,r:2,b:3,n:4}[m.promotion]||0);
function read(s){const b=new Chess();for(const m of s?.history||[])b.move({from:m.slice(0,2),to:m.slice(2,4),...(m.length>4?{promotion:m[4]}:{})});return b;}
function snapshot(b,history){return{game:'chess',cells:b.board().flat().map(p=>p?symbols.indexOf(p.type)+1+(p.color==='b'?6:0):0),turn:b.turn()==='w'?1:2,winner:b.isCheckmate()?(b.turn()==='w'?2:1):0,over:b.isGameOver(),moves:history.length,fen:b.fen(),history};}
export const chessStart=()=>snapshot(new Chess(),[]);
export function chessMove(s,actor,position){if(s.over||s.turn!==actor)throw Error('turn');const b=read(s),m=b.moves({verbose:true}).find(m=>encodeChess(m)===position);if(!m)throw Error('illegal chess move');b.move(m);return snapshot(b,[...s.history,m.from+m.to+(m.promotion||'')]);}
export const chessLegal=s=>read(s).moves({verbose:true}).map(encodeChess);
export function chessBot(s){const b=read(s),values={p:100,n:320,b:320,r:500,q:900,k:20000};let best,score=-Infinity;for(const m of b.moves({verbose:true})){let v=(values[m.captured]||0)*10+(values[m.promotion]||0)*9;b.move(m);if(b.isCheckmate())v+=100000;else{let reply=0;for(const r of b.moves({verbose:true}))reply=Math.max(reply,values[r.captured]||0);v-=reply*7;if(b.isCheck())v+=20;}b.undo();const to=index(m.to);v+=7-Math.abs(to%8-3)-Math.abs(Math.floor(to/8)-3);if(v>score){score=v;best=encodeChess(m);}}return best;}
