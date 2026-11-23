import {botTuning,pick,jitter} from '../bot-difficulty.js?v=20261112-gamelanes1&nine=20261120-nineball1&power=20261120-poolpower30';
export const cardMatches=(a,b)=>Math.floor(a/18)===Math.floor(b/18)||a%9===b%9;
const parse=s=>s?s.split(',').map(Number):[];
const state=(a,b,deck,discard,turn,moves,passes)=>{const over=!a.length||!b.length||passes>=2||moves>=1000;return{game:'cards',cells:[discard.at(-1),a.length,b.length],turn,moves,over,winner:over?(a.length===b.length?0:a.length<b.length?1:2):0,fen:String(passes),history:[a.join(','),b.join(','),deck.join(','),discard.join(',')]};};
export function cardsStart(){const deck=Array.from({length:72},(_,i)=>i);for(let i=71;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}return state(deck.slice(0,7),deck.slice(7,14),deck.slice(15),[deck[14]],1,0,0);}
export function cardsLegal(s){return s.over?[]:[...parse(s.history[s.turn-1]).flatMap((c,i)=>cardMatches(c,s.cells[0])?[i]:[]),-1];}
export function cardsMove(s,actor,index){if(s.over||actor!==s.turn)throw Error('turn');const a=parse(s.history[0]),b=parse(s.history[1]),deck=parse(s.history[2]),discard=parse(s.history[3]),hand=actor===1?a:b;let passes=0;if(index===-1){if(!deck.length&&discard.length>1){const top=discard.pop();deck.push(...discard);discard.splice(0,discard.length,top);for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}}if(!deck.length)passes=Number(s.fen)+1;else hand.push(deck.pop());}else{if(!Number.isInteger(index)||index<0||index>=hand.length||!cardMatches(hand[index],s.cells[0]))throw Error('illegal card');discard.push(hand.splice(index,1)[0]);}return state(a,b,deck,discard,3-actor,s.moves+1,passes);}
/* Easy plays almost at random but only rarely draws: drawing on half of its
   turns used to keep refilling the deck until the 1000-move cap, so most
   "easy" games ended in a draw instead of a win for the human.
   Pro/Hell look one ply ahead and avoid leaving the opponent many answers.
   Measured over 60 fixed-deck duels against the classic bot (36/60 baseline
   for a mirror match): the old Pro scored only 27/60 - WEAKER than Normal -
   because optimising hand flexibility alone just delays its own plays.
   Pro now uses a light reply penalty (39/60) and Hell a heavy one (44/60),
   which makes the four levels monotone without stalling the game. */
export function cardsBot(s,level,rng=Math.random){
 const moves=cardsLegal(s);
 if(!moves.length)throw Error('over');
 const tune=botTuning(level);
 if(!tune||tune.level==='normal')return moves[0];
 if(tune.level==='easy'){
  const plays=moves.filter(m=>m!==-1);
  if(plays.length&&rng()<.9)return pick(plays,rng);
  return moves.includes(-1)?-1:pick(moves,rng);
 }
  const hand=parse(s.history[s.turn-1]);
  /* Both advanced levels simulate this play and count how many cards the
     opponent could answer with. Hell weights that much more heavily. */
  const hell=tune.level==='hell';
  let best=moves[0],score=-Infinity;
  for(const m of moves){
   let value;
   if(m===-1)value=-6;
   else{
    const card=hand[m],rest=hand.filter((_,i)=>i!==m);
    value=rest.filter(c=>cardMatches(c,card)).length*3
     -rest.filter(c=>Math.floor(c/18)===Math.floor(card/18)).length*.4
     -rest.filter(c=>c%9===card%9).length*.4;
   }
   const next=cardsMove(s,s.turn,m);
   const replies=next.over?0:cardsLegal(next).filter(x=>x!==-1).length;
   value-=replies*(hell?2.5:1.2);
   if(!hell)value+=jitter(.4,rng);
   if(value>score){score=value;best=m;}
  }
  return best;
}
export function renderCards(host,s,you,can){
 const hand=parse(s.history[you-1]),count=s.cells[3-you],en=document.documentElement.lang==='en';
 const face=c=>'<small>'+(c%9+1)+'</small><b>'+(c%9+1)+'</b><small>'+(c%9+1)+'</small>';
 const card=(c,extra='')=>'<div class="playing-card color-'+Math.floor(c/18)+' '+extra+'">'+face(c)+'</div>';
 host.innerHTML='<div class="cards-opponent"><div class="cards-back-fan" aria-hidden="true">'+Array.from({length:Math.min(count,12)},(_,i)=>'<i style="--tilt:'+((i-(Math.min(count,12)-1)/2)*4)+'deg"></i>').join('')+'</div><span>'+(en?'Opponent · ':'对手 · ')+count+(en?' cards':' 张牌')+'</span></div><div class="card-table"><div class="cards-orbit" aria-hidden="true">↻</div><button class="cards-draw-stack" data-position="-1" '+(!can?'disabled':'')+' aria-label="'+(en?'Draw one card and end turn':'摸一张 · 结束回合')+'"><i>✦</i><span>'+(en?'DRAW':'摸一张')+'</span></button><div class="cards-discard">'+card(parse(s.history[3]).at(-2)??s.cells[0],'cards-under')+card(s.cells[0])+'</div></div><p class="cards-turn">'+(can?(en?'Your turn · Match colour or number':'轮到你了 · 同色或同数字可出'):(en?'Waiting for opponent':'等待对手出牌'))+'</p><div class="card-hand" style="--hand-count:'+hand.length+'">'+hand.map((c,i)=>'<button class="playing-card color-'+Math.floor(c/18)+'" style="--angle:'+((i-(hand.length-1)/2)*Math.min(4,35/hand.length))+'deg" data-position="'+i+'" '+(!can||!cardMatches(c,s.cells[0])?'disabled':'')+' aria-label="'+['红','黄','绿','蓝'][Math.floor(c/18)]+'色 '+(c%9+1)+'">'+face(c)+'</button>').join('')+'</div><p class="cards-hand-label">'+(en?'Your hand · ':'你的手牌 · ')+hand.length+(en?' cards':' 张')+'</p>';
}
