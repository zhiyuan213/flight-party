/* Pure, deterministic rules for the two-player Bubble Duel (versus edition).
 *
 * Each player owns their OWN hex board. They alternate shots on their own
 * board; a pop of three-or-more same-colour bubbles (and every detached
 * bubble that falls) counts as ATTACK and pushes the opponent's board one row
 * lower. The first player whose bubbles reach the danger line loses; clearing
 * your own board wins immediately; a round cap settles by score otherwise.
 *
 * The whole authoritative state lives in `cells` so it can travel through the
 * existing table-room API unchanged:
 *   [0 .. N-1]    player 1 board (colour 0 empty, 1..5)
 *   [N .. 2N-1]   player 2 board
 *   [2N .. +17]   both ceilings, current/next colour, both scores, both
 *                 combos, RNG seed, last-shot metadata, attack, round limit
 * The browser and BubbleRules.java implement the identical algorithm. */

import {botTuning,jitter} from '../bot-difficulty.js?v=20261112-gamelanes1&nine=20261120-nineball1&power=20261120-poolpower30';

export const R=20,ROW=Math.sqrt(3)*R,COLS=18,W=COLS*R*2,H=765,LAUNCH_Y=H-29,LIMIT=H-90;
export const ROWS=18,START_ROWS=8,ANGLE_MAX=148,COLOURS=5,MAX_MOVES=24;
const MIN_AIM=-Math.PI+.16,MAX_AIM=-.16;

export const GRID=[];
{
  let index=0;
  for(let r=0;r<ROWS;r++){
    const width=r%2?COLS-1:COLS;
    for(let c=0;c<width;c++)GRID.push({i:index++,r,c,x:R+c*R*2+(r%2)*R,y:R+r*ROW,neighbours:[]});
  }
  for(const a of GRID)a.neighbours=GRID.filter(b=>b.i!==a.i&&Math.hypot(a.x-b.x,a.y-b.y)<41).map(b=>b.i).sort((p,q)=>p-q);
}
export const N=GRID.length;               /* 315 cells per board */
const BASE=2*N;                           /* board 2 starts here */
export const EXTRA=18,TOTAL=BASE+EXTRA;   /* 648 */
export const S_CEIL1=BASE+0,S_CEIL2=BASE+1,S_UP=BASE+2,S_NEXT=BASE+3,
  S_SCORE1=BASE+4,S_SCORE2=BASE+5,S_COMBO1=BASE+6,S_COMBO2=BASE+7,
  S_SEED=BASE+8,S_SLOT=BASE+9,S_ANGLE=BASE+10,S_COLOUR=BASE+11,
  S_MATCH=BASE+12,S_FLOAT=BASE+13,S_POINTS=BASE+14,S_ATTACK=BASE+15,
  S_LIMIT=BASE+16,S_SEAT=BASE+17;

const boardOf=seat=>seat===1?0:N;
const ceilingOf=(cells,seat)=>cells[seat===1?S_CEIL1:S_CEIL2];
const setCeiling=(cells,seat,val)=>{cells[seat===1?S_CEIL1:S_CEIL2]=val;};

export const decodeAngle=code=>MIN_AIM+(MAX_AIM-MIN_AIM)*(code/ANGLE_MAX);
export const encodeAngle=aim=>Math.max(0,Math.min(ANGLE_MAX,Math.round((aim-MIN_AIM)/(MAX_AIM-MIN_AIM)*ANGLE_MAX)));
/* 32-bit LCG: Math.imul matches Java's (int)(long) low bits exactly. */
export const nextSeed=seed=>(Math.imul(seed,1103515245)+12345)&0x7fffffff;
const roll=seed=>{const value=nextSeed(seed);return{seed:value,value:value/0x7fffffff};};

function connected(cells,off,seeds,accept){
  const seen=new Set(seeds),queue=[...seeds];
  for(let head=0;head<queue.length;head++){
    for(const next of GRID[queue[head]].neighbours){
      if(seen.has(next)||!accept(next))continue;
      seen.add(next);queue.push(next);
    }
  }
  return seen;
}

/* Rising per-group reward: one big pop is worth far more than several threes. */
function matchPoints(n){
  if(n<=3)return 100;
  if(n===4)return 160;
  if(n===5)return 240;
  if(n===6)return 340;
  if(n===7)return 460;
  return 600;
}
const FLOAT_POINTS=250,CLEAR_BONUS=3000;

export function bubblesStart(seed){
  let s=Math.max(1,Math.floor(seed||0))&0x7fffffff;
  if(!s)s=20261109;
  const cells=Array(TOTAL).fill(0);
  for(const seat of [1,2]){
    const off=boardOf(seat);
    for(const g of GRID){
      if(g.r>=START_ROWS)break;
      let colour;
      const picked=roll(s);s=picked.seed;colour=1+Math.floor(picked.value*COLOURS);
      const row=GRID.filter(other=>other.r===g.r);
      const left=row[g.c-1],left2=row[g.c-2];
      if(left&&left2&&cells[off+left.i]===colour&&cells[off+left2.i]===colour)colour=colour%COLOURS+1;
      cells[off+g.i]=colour;
    }
  }
  const up=roll(s);s=up.seed;const next=roll(s);s=next.seed;
  cells[S_UP]=1+Math.floor(up.value*COLOURS);
  cells[S_NEXT]=1+Math.floor(next.value*COLOURS);
  cells[S_SEED]=s;
  cells[S_SLOT]=-1;cells[S_ANGLE]=Math.round(ANGLE_MAX/2);cells[S_COLOUR]=0;
  cells[S_LIMIT]=MAX_MOVES;cells[S_SEAT]=0;
  return{game:'bubbles',cells,turn:1,winner:0,over:false,moves:0};
}

/* Simulate one shot on `seat`'s board. Mutates `cells` and returns what
   happened (including the attack rows sent to the opponent), so the renderer
   can replay the flight and the clear effect from the snapshot. */
export function bubblesStep(cells,code,colour,seat){
  const off=boardOf(seat);
  const aim=decodeAngle(code),ceiling=ceilingOf(cells,seat)*ROW;
  let x=W/2,y=LAUNCH_Y,vx=Math.cos(aim),vy=Math.sin(aim),impact=-1;
  for(let step=0;step<420;step++){
    x+=vx*4;y+=vy*4;
    if(x<R){x=2*R-x;vx=-vx;}else if(x>W-R){x=2*(W-R)-x;vx=-vx;}
    if(y<=R+ceiling)break;
    for(let j=0;j<N;j++){
      if(!cells[off+j])continue;
      const g=GRID[j];
      if(Math.hypot(g.x-x,g.y+ceiling-y)<R*2-1){impact=j;break;}
    }
    if(impact>=0)break;
  }
  const options=impact>=0?GRID[impact].neighbours.filter(i=>!cells[off+i])
    :GRID.filter(g=>g.r===0).map(g=>g.i).filter(i=>!cells[off+i]);
  let slot=-1,best=Infinity;
  for(const i of options){
    const g=GRID[i],d=Math.hypot(g.x-x,g.y-(y-ceiling));
    if(d<best){best=d;slot=i;}
  }
  if(slot<0)for(let i=0;i<N;i++)if(!cells[off+i]){slot=i;break;}
  if(slot<0)return{slot:-1,match:0,floating:0,points:0,attack:0,noSlot:true};

  cells[off+slot]=colour;
  const group=connected(cells,off,[slot],i=>cells[off+i]===colour);
  let match=0,floating=0,points=0;
  if(group.size>=3){
    for(const i of group)cells[off+i]=0;
    match=group.size;
    const seeds=[];
    for(const g of GRID)if(g.r===0&&cells[off+g.i])seeds.push(g.i);
    const attached=connected(cells,off,seeds,i=>cells[off+i]!==0);
    for(let i=0;i<N;i++)if(cells[off+i]&&!attached.has(i)){cells[off+i]=0;floating++;}
    const comboSel=seat===1?S_COMBO1:S_COMBO2;
    const combo=cells[comboSel];
    points=Math.round((matchPoints(match)+floating*FLOAT_POINTS)*(1+Math.min(combo,5)*.2));
    cells[comboSel]=combo+1;
  }else{
    cells[seat===1?S_COMBO1:S_COMBO2]=0;
  }
  /* Attack: each pop of 3 and each 2 detached bubbles send one garbage row. */
  const attack=Math.floor(match/3)+Math.floor(floating/2);
  cells[seat===1?S_SCORE1:S_SCORE2]+=points;
  cells[S_SLOT]=slot;cells[S_ANGLE]=code;cells[S_COLOUR]=colour;
  cells[S_MATCH]=match;cells[S_FLOAT]=floating;cells[S_POINTS]=points;
  cells[S_ATTACK]=attack;cells[S_SEAT]=seat;
  return{slot,match,floating,points,attack,noSlot:false};
}

function finished(s,cells,moves,winner){
  return{game:'bubbles',cells,turn:s.turn,winner,over:true,moves};
}

export function bubblesMove(s,actor,position){
  if(s.over||s.turn!==actor)throw Error('turn');
  if(!Number.isInteger(position)||position<0||position>ANGLE_MAX)throw Error('angle');
  const cells=s.cells.slice();
  const info=bubblesStep(cells,position,cells[S_UP],actor);
  const moves=s.moves+1;
  cells[S_UP]=cells[S_NEXT];
  const rolled=roll(cells[S_SEED]);
  cells[S_SEED]=rolled.seed;cells[S_NEXT]=1+Math.floor(rolled.value*COLOURS);
  if(info.noSlot){const a=cells[S_SCORE1],b=cells[S_SCORE2];return finished(s,cells,moves,a>b?1:b>a?2:0);}
  const opponent=3-actor;
  /* Push the opponent's board down by the attack rows. */
  setCeiling(cells,opponent,ceilingOf(cells,opponent)+info.attack);
  /* Clearing your own board wins on the spot. */
  const off=boardOf(actor);
  let cleared=true;
  for(let i=0;i<N;i++)if(cells[off+i]){cleared=false;break;}
  if(cleared){cells[actor===1?S_SCORE1:S_SCORE2]+=CLEAR_BONUS;return finished(s,cells,moves,actor);}
  /* Opponent's board touching the danger line loses. */
  const oppOff=boardOf(opponent),oppCeil=ceilingOf(cells,opponent)*ROW;
  let danger=false;
  for(const g of GRID)if(cells[oppOff+g.i]&&g.y+oppCeil+R>=LIMIT){danger=true;break;}
  if(danger)return finished(s,cells,moves,actor);
  /* Round cap settles by score. */
  if(moves>=MAX_MOVES){
    const a=cells[S_SCORE1],b=cells[S_SCORE2];
    return finished(s,cells,moves,a>b?1:b>a?2:0);
  }
  return{game:'bubbles',cells,turn:opponent,winner:0,over:false,moves};
}

export function bubblesBot(s,level,rng=Math.random){
 const tune=botTuning(level);
 /* Strength grows ONLY with sampling resolution: easy 15, normal 6, pro 4,
    hell 2. Every coarser set is a subset of the finer one, so Hell can never
    settle on a worse shot than Pro while sharing exactly the same evaluation. */
 const step=tune?tune.scan:6;
 const advanced=!!tune&&(tune.level==='pro'||tune.level==='hell');
 if(tune&&tune.blunder&&rng()<tune.blunder)return 2+Math.floor(rng()*(ANGLE_MAX-1));
 const colour=s.cells[S_UP];
 const off=s.turn===1?0:N;
 let bestValue=-Infinity,bestCode=0;
 for(let code=2;code<=ANGLE_MAX;code+=step){
  const cells=s.cells.slice();
  const info=bubblesStep(cells,code,colour,s.turn);
  const row=info.slot<0?0:ROWS-GRID[info.slot].r;
  /* Attack (garbage sent to the opponent) is the primary strategic goal,
     then score, then popping size and dropping bubbles. */
  let value=info.points*1000+info.attack*900+info.match*50+info.floating*30+row
   -(info.noSlot?100000:0)-code/1000
   +(tune&&tune.noise?jitter(tune.noise*400,rng):0);
  if(advanced){
   value+=info.floating*20;
   if(info.slot>=0){
    let chain=0;
    for(const n of GRID[info.slot].neighbours)if(s.cells[off+n]===colour)chain++;
    value+=chain*11;
   }
  }
  if(value>bestValue){bestValue=value;bestCode=code;}
 }
 return bestCode;
}

export const bubblesScore=cells=>[cells[S_SCORE1],cells[S_SCORE2]];
