import {botTuning,jitter,pick} from '../bot-difficulty.js?v=20261112-gamelanes1';
import {poolStart,poolMove,poolBot} from './pool.js?v=20261113-pooldiff1';
import {cardsStart,cardsMove,cardsLegal,cardsBot} from './cards.js?v=20261112-gamelanes1';
import {sketchStart} from './sketch.js?v=20261110-glove2';
import {chessStart,chessMove,chessLegal,chessBot} from './chess-rules.js?v=20261110-glove2';
import {bubblesStart,bubblesMove,bubblesBot,ANGLE_MAX} from './bubbles-duel.js?v=20261112-gamelanes1';
import {snookerStart,snookerMove,snookerBot,snookerLegal} from './snooker-duel.js?v=20261112-gamelanes1';
export function start(game){if(game==='snooker')return snookerStart();if(game==='bubbles')return bubblesStart((Date.now()^Math.floor(Math.random()*0x7fffffff))>>>0);if(game==='pool')return poolStart();if(game==='cards')return cardsStart();if(game==='draw')return sketchStart();if(game==='chess')return chessStart();const cells=game==='puzzle'?Array.from({length:16},(_,i)=>i+1):Array(game==='four'?42:game==='xo'?9:225).fill(0);if(game==='puzzle')for(let i=15;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}return{game,cells,turn:1,winner:0,over:false,moves:0};}
export function move(s,actor,position){if(s.over||s.turn!==actor)throw Error('turn');if(s.game==='snooker')return snookerMove(s,actor,position);if(s.game==='bubbles')return bubblesMove(s,actor,position);if(s.game==='pool')return poolMove(s,actor,position);if(s.game==='cards')return cardsMove(s,actor,position);if(s.game==='puzzle'){if(!Number.isInteger(position)||position<0||position>=256)throw Error('tile');const a=Math.floor(position/16),b=position%16;if(a===b)throw Error('tile');const cells=s.cells.slice();[cells[a],cells[b]]=[cells[b],cells[a]];const solved=cells.every((n,i)=>n===i+1);return{...s,cells,turn:3-actor,winner:solved?1:0,over:solved,moves:s.moves+1};}if(s.game==='chess')return chessMove(s,actor,position);const width=s.game==='four'?7:s.game==='xo'?3:15;let index=position;if(s.game==='four'){if(position<0||position>6)throw Error('column');index=-1;for(let r=5;r>=0;r--)if(!s.cells[r*7+position]){index=r*7+position;break;}}if(!Number.isInteger(index)||index<0||index>=s.cells.length||s.cells[index])throw Error('occupied');const cells=s.cells.slice();cells[index]=actor;let win=false;for(const [dx,dy] of [[1,0],[0,1],[1,1],[1,-1]]){let count=1;for(const sign of [-1,1]){let x=index%width+dx*sign,y=Math.floor(index/width)+dy*sign;while(x>=0&&x<width&&y>=0&&y<cells.length/width&&cells[y*width+x]===actor){count++;x+=dx*sign;y+=dy*sign;}}if(count>=(s.game==='four'?4:s.game==='xo'?3:5))win=true;}return{...s,cells,turn:3-actor,winner:win?actor:0,over:win||s.moves+1===cells.length,moves:s.moves+1};}
export const legal=s=>s.over?[]:s.game==='snooker'?snookerLegal():s.game==='bubbles'?Array.from({length:ANGLE_MAX+1},(_,i)=>i):s.game==='cards'?cardsLegal(s):s.game==='chess'?chessLegal(s):s.game==='four'?[0,1,2,3,4,5,6].filter(c=>!s.cells[c]):s.cells.flatMap((v,i)=>v?[]:[i]);
/* Heuristic shared by the classic bot and the deeper search. `s.turn` is the
   side being evaluated: its own stones are worth slightly more. */
function gridScore(s,p){
 if(s.game==='xo')return p===4?2:p%2===0?1:0;
 if(s.game==='four')return-Math.abs(p-3);
 let score=-Math.abs(p%15-7)-Math.abs(Math.floor(p/15)-7);
 s.cells.forEach((v,i)=>{if(v&&Math.abs(i%15-p%15)<=2&&Math.abs(Math.floor(i/15)-Math.floor(p/15))<=2)score+=v===s.turn?5:4;});
 return score;
}
function nearStone(cells,p,width,radius=2){
 const x=p%width,y=Math.floor(p/width),height=cells.length/width;
 for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
  const nx=x+dx,ny=y+dy;
  if(nx>=0&&nx<width&&ny>=0&&ny<height&&cells[ny*width+nx])return true;
 }
 return false;
}
/* Gomoku has 225 points: only score empties next to existing stones, then keep
   the strongest few. Four/XO have <=9 moves so they need no pruning. */
function candidates(s,limit,noise,rng){
 const all=legal(s),width=s.game==='four'?7:s.game==='xo'?3:15;
 const pool=all.length>limit&&s.game!=='four'&&s.game!=='xo'?all.filter(p=>nearStone(s.cells,p,width)):all;
 const use=pool.length?pool:all;
 const scored=use.map(p=>({p,v:gridScore(s,p)+(noise?jitter(noise,rng):0)}));
 scored.sort((a,b)=>b.v-a.v);
 return scored.slice(0,limit).map(x=>x.p);
}
/* Real shape evaluation for the deeper levels. The classic gridScore above
   only prefers the centre of the board; feeding it into a multi-ply search
   made Pro weaker than the plain classic bot because the search optimised
   geometry instead of threats. Pro/Hell now count open runs for BOTH sides,
   which is what "looks ahead" is supposed to mean. Legacy / Normal / Easy
   never reach this function, so the golden fixtures stay byte-for-byte. */
function tacticalScore(state,me){
 const opponent=3-me,cells=state.cells,width=state.game==='four'?7:state.game==='xo'?3:15;
 const height=cells.length/width,need=state.game==='four'?4:state.game==='xo'?3:5;
 const dirs=[[1,0],[0,1],[1,1],[1,-1]];
 /* Connect-4 has gravity: only the lowest empty cell of a column is a threat. */
 const playable=p=>{
  if(state.game!=='four')return true;
  const column=p%width;
  for(let r=0;r<height;r++)if(!cells[r*width+column])return r*width+column===p;
  return false;
 };
 const side=actor=>{
  let total=0,best=0;
  for(let p=0;p<cells.length;p++){
   if(cells[p]||!playable(p))continue;
   const x0=p%width,y0=Math.floor(p/width);
   for(const [dx,dy] of dirs){
    let count=1,open=0;
    for(const sign of [-1,1]){
     let x=x0+dx*sign,y=y0+dy*sign;
     while(x>=0&&x<width&&y>=0&&y<height&&cells[y*width+x]===actor){count++;x+=dx*sign;y+=dy*sign;}
     if(x>=0&&x<width&&y>=0&&y<height&&cells[y*width+x]===0)open++;
    }
    if(count<2)continue;
    const value=count>=need?20000:count*count*count*(1+open*2);
    total+=value;if(value>best)best=value;
   }
  }
  return total*.12+best;
 };
 return side(me)-side(opponent)*1.12;
}
function heuristic(state,me,opponent,rng){
 return tacticalScore(state,me);
}
/* Connect-4 is a solved first-player win, but a generic 3-ply search with a
   shallow evaluation misses the forced lines. Hell gets a dedicated
   alpha-beta solver with centre-first move ordering; the threat evaluation
   above keeps the leaf scores meaningful. Depth 5 after the root is enough to
   see double threats without stalling the browser. */
function solveFour(state,depth,me,alpha,beta){
 if(state.over)return state.winner===me?100000+depth:state.winner?-100000-depth:0;
 if(depth<=0)return tacticalScore(state,me);
 const who=state.turn,list=legal(state).slice().sort((a,b)=>Math.abs(a-3)-Math.abs(b-3));
 let best=who===me?-Infinity:Infinity;
 for(const p of list){
  const value=solveFour(move(state,who,p),depth-1,me,alpha,beta);
  if(who===me){if(value>best)best=value;if(best>alpha)alpha=best;}
  else{if(value<best)best=value;if(best<beta)beta=best;}
  if(beta<=alpha)break;
 }
 return Number.isFinite(best)?best:0;
}
function search(state,depth,alpha,beta,me,opponent,tune,rng){
 if(state.over)return state.winner===me?100000+depth:state.winner?-100000-depth:0;
 if(depth<=0)return heuristic(state,me,opponent,rng);
 const who=state.turn,list=candidates(state,tune.searchWidth||8,0,rng);
 let best=who===me?-Infinity:Infinity;
 for(const p of list){
  const value=search(move(state,who,p),depth-1,alpha,beta,me,opponent,tune,rng);
  if(who===me){if(value>best)best=value;if(best>alpha)alpha=best;}
  else{if(value<best)best=value;if(best<beta)beta=best;}
  if(beta<=alpha)break;
 }
 return Number.isFinite(best)?best:0;
}
function gridBot(s,level,rng){
 const tune=botTuning(level),moves=legal(s);
 if(!moves.length)throw Error('over');
 // No level = legacy path, kept byte-for-byte compatible with golden fixtures.
 if(!tune){
  for(const p of moves)if(move(s,s.turn,p).winner===s.turn)return p;
  const opponent={...s,turn:3-s.turn};
  for(const p of moves)if(move(opponent,opponent.turn,p).winner===opponent.turn)return p;
  return moves.slice().sort((a,b)=>gridScore(s,b)-gridScore(s,a))[0];
 }
 if(tune.blunder&&rng()<tune.blunder)return pick(moves,rng);
 if(tune.win)for(const p of moves)if(move(s,s.turn,p).winner===s.turn)return p;
 if(tune.block){
  const opponent={...s,turn:3-s.turn};
  for(const p of moves)if(move(opponent,opponent.turn,p).winner===opponent.turn)return p;
 }
 if(tune.depth){
  const me=s.turn,opponent=3-me;
  if(s.game==='four'&&tune.level==='hell'){
   const ordered=moves.slice().sort((a,b)=>Math.abs(a-3)-Math.abs(b-3));
   let best=ordered[0],score=-Infinity;
   for(const p of ordered){
    const next=move(s,me,p);
    const value=next.over&&next.winner===me?100000:solveFour(next,5,me,-Infinity,Infinity);
    if(value>score){score=value;best=p;}
   }
   return best;
  }
  const list=candidates(s,tune.searchWidth||8,0,rng);
  let best=list[0]??moves[0],score=-Infinity;
  for(const p of list){
   const next=move(s,me,p);
   const value=next.over&&next.winner===me?100000:search(next,tune.depth-1,-Infinity,Infinity,me,opponent,tune,rng);
   if(value>score){score=value;best=p;}
  }
  return best;
 }
 const scored=moves.map(p=>({p,v:gridScore(s,p)+jitter(tune.noise,rng)}));
 scored.sort((a,b)=>b.v-a.v);
 return scored[0].p;
}
export function bot(s,level,rng=Math.random){
 if(s.game==='snooker')return snookerBot(s,level,rng);
 if(s.game==='bubbles')return bubblesBot(s,level,rng);
 if(s.game==='pool')return poolBot(s,level,rng);
 if(s.game==='cards')return cardsBot(s,level,rng);
 if(s.game==='chess')return chessBot(s,level,rng);
 if(s.game==='puzzle'){const a=s.cells.findIndex((n,i)=>n!==i+1);return a*16+s.cells.indexOf(a+1);}
 return gridBot(s,level,rng);
}
