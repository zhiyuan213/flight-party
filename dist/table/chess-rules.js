import {Chess} from '../vendor/chess-1.4.0.js?v=20261110-glove2';
import {botTuning,pick} from '../bot-difficulty.js?v=20261112-gamelanes1';
const symbols='pnbrqk';const square=i=>String.fromCharCode(97+i%8)+(8-Math.floor(i/8));const index=s=>(8-Number(s[1]))*8+s.charCodeAt(0)-97;
export const encodeChess=m=>index(m.from)*64+index(m.to)+4096*({q:1,r:2,b:3,n:4}[m.promotion]||0);
function read(s){const b=new Chess();for(const m of s?.history||[])b.move({from:m.slice(0,2),to:m.slice(2,4),...(m.length>4?{promotion:m[4]}:{})});return b;}
function snapshot(b,history){return{game:'chess',cells:b.board().flat().map(p=>p?symbols.indexOf(p.type)+1+(p.color==='b'?6:0):0),turn:b.turn()==='w'?1:2,winner:b.isCheckmate()?(b.turn()==='w'?2:1):0,over:b.isGameOver(),moves:history.length,fen:b.fen(),history};}
export const chessStart=()=>snapshot(new Chess(),[]);
export function chessReplay(history){
 const board=new Chess();
 const position=()=>({
  cells:board.board().flat().map(p=>p?symbols.indexOf(p.type)+1+(p.color==='b'?6:0):0),
  check:board.isCheck()?board.board().flat().findIndex(p=>p?.type==='k'&&p.color===board.turn()):-1
 });
 const frames=[position()];
 for(const command of history){
  const move=board.move({from:command.slice(0,2),to:command.slice(2,4),promotion:command[4]});
  frames.push({...position(),san:move.san,from:index(move.from),to:index(move.to)});
 }
 return frames;
}
export function chessMove(s,actor,position){if(s.over||s.turn!==actor)throw Error('turn');const b=read(s),m=b.moves({verbose:true}).find(m=>encodeChess(m)===position);if(!m)throw Error('illegal chess move');b.move(m);return snapshot(b,[...s.history,m.from+m.to+(m.promotion||'')]);}
export const chessLegal=s=>read(s).moves({verbose:true}).map(encodeChess);
const PIECE={p:100,n:320,b:320,r:500,q:900,k:20000};
function legacyChessBot(b){let best,score=-Infinity;for(const m of b.moves({verbose:true})){let v=(PIECE[m.captured]||0)*10+(PIECE[m.promotion]||0)*9;b.move(m);if(b.isCheckmate())v+=100000;else{let reply=0;for(const r of b.moves({verbose:true}))reply=Math.max(reply,PIECE[r.captured]||0);v-=reply*7;if(b.isCheck())v+=20;}b.undo();const to=index(m.to);v+=7-Math.abs(to%8-3)-Math.abs(Math.floor(to/8)-3);if(v>score){score=v;best=encodeChess(m);}}return best;}
/* Material + centralisation from one fixed side's point of view. */
function boardScore(b,me){
 let v=0;const board=b.board();
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){
  const p=board[r][c];if(!p)continue;
  const sign=p.color===me?1:-1;
  v+=sign*(PIECE[p.type]+(3.5-Math.abs(c-3.5))*(3.5-Math.abs(r-3.5))*3);
 }
 if(b.isCheckmate())v+=b.turn()===me?-100000:100000;
 else if(b.isCheck())v+=b.turn()===me?-35:35;
 else if(b.isGameOver())v=0;
 return v;
}
function orderedMoves(b,limit){
 const scored=b.moves({verbose:true}).map(m=>{
  let v=(PIECE[m.captured]||0)*10+(PIECE[m.promotion]||0)*9;
  const to=index(m.to);v+=7-Math.abs(to%8-3)-Math.abs(Math.floor(to/8)-3);
  return {m,v};
 });
 scored.sort((a,b)=>b.v-a.v);
 return scored.slice(0,limit).map(x=>x.m);
}
/* Root ordering must never prune away an immediate mate: a quiet queen move
   scores low on material/centralisation but ends the game outright. */
function rootMoves(b,limit){
 const scored=b.moves({verbose:true}).map(m=>{
  let v=(PIECE[m.captured]||0)*10+(PIECE[m.promotion]||0)*9;
  const to=index(m.to);v+=7-Math.abs(to%8-3)-Math.abs(Math.floor(to/8)-3);
  b.move(m);if(b.isCheckmate())v+=1000000;b.undo();
  return {m,v};
 });
 scored.sort((a,b)=>b.v-a.v);
 return scored.slice(0,limit).map(x=>x.m);
}
function minimax(b,depth,alpha,beta,me,width){
 if(b.isGameOver()||depth<=0)return boardScore(b,me);
 const maximizing=b.turn()===me,list=orderedMoves(b,width);
 if(!list.length)return boardScore(b,me);
 let best=maximizing?-Infinity:Infinity;
 for(const m of list){
  b.move(m);
  const value=minimax(b,depth-1,alpha,beta,me,width);
  b.undo();
  if(maximizing){if(value>best)best=value;if(best>alpha)alpha=best;}
  else{if(value<best)best=value;if(best<beta)beta=best;}
  if(beta<=alpha)break;
 }
 return Number.isFinite(best)?best:boardScore(b,me);
}
export function chessBot(s,level,rng=Math.random){
 const b=read(s),tune=botTuning(level);
 if(!tune||tune.level==='normal')return legacyChessBot(b);
 const moves=b.moves({verbose:true});
 if(!moves.length)throw Error('over');
 if(tune.level==='easy'||(tune.blunder&&rng()<tune.blunder))return encodeChess(pick(moves,rng));
 const me=b.turn(),hell=tune.level==='hell',root=rootMoves(b,hell?12:10);
 let best=root[0]||moves[0],score=-Infinity;
 for(const m of root){
  b.move(m);
  const value=b.isCheckmate()?100000:minimax(b,tune.depth-1,-Infinity,Infinity,me,hell?6:8);
  b.undo();
  if(value>score){score=value;best=m;}
 }
 return encodeChess(best);
}
