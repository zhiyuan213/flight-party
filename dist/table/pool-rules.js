// Board state: 16 ball triples, scores at 48–49, groups at 50–51.
// Group 0=open table, 1=solids, 2=stripes. Result data is server-owned online.
export const BALL_COUNT=16, BALL_RADIUS=16, STATE_SIZE=53;
// The current player has an extra visit in reserve, or is about to use its first shot.
export const PENALTY_VISIT=52, PENALTY_READY=1, PENALTY_ACTIVE=2;
export const ballGroup=id=>id>0&&id<8?1:id>8&&id<16?2:0;
export function poolTargets(c,actor){
  const group=c[49+actor]||0;
  const ids=Array.from({length:15},(_,i)=>i+1).filter(id=>id!==8&&c[id*3+2]&&(!group||ballGroup(id)===group));
  return ids.length?ids:group&&c[26]?[8]:[];
}
export function settlePool(before,c,actor,potted,firstContact){
  const scratch=potted.includes(0),black=potted.includes(8);
  const legal=poolTargets(before,actor);
  const foul=scratch||!legal.includes(firstContact);
  if(!foul&&!c[49+actor]){
    const first=potted.find(id=>ballGroup(id));
    if(first){c[49+actor]=ballGroup(first);c[52-actor]=3-ballGroup(first);}
  }
  for(let seat=1;seat<=2;seat++){
    c[47+seat]=c[49+seat]?Array.from({length:15},(_,i)=>i+1).filter(id=>ballGroup(id)===c[49+seat]&&!c[id*3+2]).length:0;
  }
  const own=potted.some(id=>ballGroup(id)&&ballGroup(id)===c[49+actor]);
  const penalty=before[PENALTY_VISIT]||0;
  const useExtra=!foul&&!own&&penalty===PENALTY_READY;
  const foulReason=scratch?'白球落袋':firstContact===0?'白球未碰到目标球':'白球先碰到非目标球';
 c[PENALTY_VISIT]=black?0:foul?PENALTY_READY:useExtra?PENALTY_ACTIVE:own&&penalty===PENALTY_READY?PENALTY_READY:0;
 return {foul,foulReason,over:black,winner:black?(!foul&&legal.length===1&&legal[0]===8?actor:3-actor):0,turn:!foul&&(own||useExtra)?actor:3-actor};
}

/* Nine-ball ---------------------------------------------------------------
   It keeps the exact same 53-cell layout: ids 10..15 are never racked and
   stay dead, so the table, ball sprites, cue placement, replay frames and
   audio chains need no separate implementation. Only the rack, legal target
   and settlement differ. The Java authority mirrors the same branch. */
export const NINE_RACK=[[1],[2,3],[4,9,5],[6,7],[8]];
export const isNineBall=game=>game==='nineball';
/** The lowest numbered ball still on the table is always the legal first contact. */
export function nineballTargets(c){
 for(let id=1;id<=9;id++)if(c[id*3+2])return[id];
 return[];
}
export function targetsFor(c,actor,game){
 return isNineBall(game)?nineballTargets(c):poolTargets(c,actor);
}
/* Casual nine-ball: first contact must be the lowest ball, any ball may be
   potted, and a legal 9-ball ends the match. A 9 on a foul loses. The extra
   visit state is shared with eight-ball so the HUD and cue placement behave
   identically. Push-out, called pockets and three-consecutive-foul rules are
   deliberately out of scope, as documented in docs/RULES.md. */
export function settleNineBall(before,c,actor,potted,firstContact){
 const scratch=potted.includes(0),nine=potted.includes(9);
 const legal=nineballTargets(before);
 const foul=scratch||!legal.includes(firstContact);
 const own=potted.some(id=>id>0&&id<9);
 const penalty=before[PENALTY_VISIT]||0;
 const useExtra=!foul&&!own&&penalty===PENALTY_READY;
 for(let seat=1;seat<=2;seat++)c[47+seat]=Array.from({length:9},(_,i)=>i+1).filter(id=>!c[id*3+2]).length;
 c[PENALTY_VISIT]=nine?0:foul?PENALTY_READY:useExtra?PENALTY_ACTIVE:own&&penalty===PENALTY_READY?PENALTY_READY:0;
 const foulReason=scratch?'白球落袋':firstContact===0?'白球未碰到目标球':'白球先碰到非目标球';
 return {foul,foulReason,over:nine,winner:nine?(!foul?actor:3-actor):0,turn:!foul&&(own||useExtra)?actor:3-actor};
}
