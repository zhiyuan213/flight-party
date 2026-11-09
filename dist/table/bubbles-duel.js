/* Pure, deterministic rules for the two-player Bubble Duel.
 *
 * The whole authoritative state lives in `cells` so it can travel through the
 * existing table-room API unchanged:
 *   [0 .. GRID.length-1]  bubble colour per hex cell (0 empty, 1..5)
 *   [GRID.length .. +15]  ceiling, upcoming/next colour, both scores, misses,
 *                         combo, RNG seed, last shot metadata, round limit.
 * The browser and BubbleRules.java implement the identical algorithm, so a
 * local game and a hosted room always produce the same board. */
export const W=360,H=765,R=20,ROW=Math.sqrt(3)*R,LAUNCH_Y=H-29,LIMIT=H-90;
export const ROWS=18,ANGLE_MAX=148,COLOURS=5,MAX_MOVES=24;
const MIN_AIM=-Math.PI+.16,MAX_AIM=-.16;

export const GRID=[];
{
  let index=0;
  for(let r=0;r<ROWS;r++){
    const width=r%2?8:9;
    for(let c=0;c<width;c++)GRID.push({i:index++,r,c,x:R+c*R*2+(r%2)*R,y:R+r*ROW,neighbours:[]});
  }
  for(const a of GRID)a.neighbours=GRID.filter(b=>b.i!==a.i&&Math.hypot(a.x-b.x,a.y-b.y)<41).map(b=>b.i).sort((p,q)=>p-q);
}
export const N=GRID.length,EXTRA=16,TOTAL=N+EXTRA;
export const S_CEIL=N+0,S_UP=N+1,S_NEXT=N+2,S_SCORE1=N+3,S_SCORE2=N+4,
  S_MISS=N+5,S_COMBO=N+6,S_SEED=N+7,S_SLOT=N+8,S_ANGLE=N+9,S_COLOUR=N+10,
  S_MATCH=N+11,S_FLOAT=N+12,S_POINTS=N+13,S_LIMIT=N+14,S_SEAT=N+15;

export const decodeAngle=code=>MIN_AIM+(MAX_AIM-MIN_AIM)*(code/ANGLE_MAX);
export const encodeAngle=aim=>Math.max(0,Math.min(ANGLE_MAX,Math.round((aim-MIN_AIM)/(MAX_AIM-MIN_AIM)*ANGLE_MAX)));
/* 32-bit LCG: Math.imul matches Java's (int)(long) low bits exactly. */
export const nextSeed=seed=>(Math.imul(seed,1103515245)+12345)&0x7fffffff;
const roll=seed=>{const value=nextSeed(seed);return{seed:value,value:value/0x7fffffff};};

function connected(cells,seeds,accept){
  const seen=new Set(seeds),queue=[...seen];
  for(let head=0;head<queue.length;head++){
    for(const next of GRID[queue[head]].neighbours){
      if(seen.has(next)||!accept(next))continue;
      seen.add(next);queue.push(next);
    }
  }
  return seen;
}

export function bubblesStart(seed){
  let s=Math.max(1,Math.floor(seed||0))&0x7fffffff;
  if(!s)s=20261109;
  const cells=Array(TOTAL).fill(0);
  for(const g of GRID){
    if(g.r>=5)break;
    let colour;
    const picked=roll(s);s=picked.seed;colour=1+Math.floor(picked.value*COLOURS);
    const row=GRID.filter(other=>other.r===g.r);
    const left=row[g.c-1],left2=row[g.c-2];
    if(left&&left2&&cells[left.i]===colour&&cells[left2.i]===colour)colour=colour%COLOURS+1;
    cells[g.i]=colour;
  }
  const up=roll(s);s=up.seed;const next=roll(s);s=next.seed;
  cells[S_CEIL]=0;
  cells[S_UP]=1+Math.floor(up.value*COLOURS);
  cells[S_NEXT]=1+Math.floor(next.value*COLOURS);
  cells[S_SEED]=s;
  cells[S_SLOT]=-1;cells[S_ANGLE]=Math.round(ANGLE_MAX/2);cells[S_COLOUR]=0;
  cells[S_LIMIT]=MAX_MOVES;cells[S_SEAT]=0;
  return{game:'bubbles',cells,turn:1,winner:0,over:false,moves:0};
}

/* Simulate one shot. Mutates `cells` and returns what happened, so the
   renderer can replay the flight and the clear effect from the snapshot. */
export function bubblesStep(cells,code,colour,seat){
  const aim=decodeAngle(code),ceiling=cells[S_CEIL]*ROW;
  let x=W/2,y=LAUNCH_Y,vx=Math.cos(aim),vy=Math.sin(aim),impact=-1;
  for(let step=0;step<420;step++){
    x+=vx*4;y+=vy*4;
    if(x<R){x=2*R-x;vx=-vx;}else if(x>W-R){x=2*(W-R)-x;vx=-vx;}
    if(y<=R+ceiling)break;
    for(let j=0;j<N;j++){
      if(!cells[j])continue;
      const g=GRID[j];
      if(Math.hypot(g.x-x,g.y+ceiling-y)<R*2-1){impact=j;break;}
    }
    if(impact>=0)break;
  }
  const options=impact>=0?GRID[impact].neighbours.filter(i=>!cells[i]):GRID.filter(g=>g.r===0).map(g=>g.i).filter(i=>!cells[i]);
  let slot=-1,best=Infinity;
  for(const i of options){
    const g=GRID[i],d=Math.hypot(g.x-x,g.y-(y-ceiling));
    if(d<best){best=d;slot=i;}
  }
  if(slot<0)for(let i=0;i<N;i++)if(!cells[i]){slot=i;break;}
  if(slot<0)return{slot:-1,match:0,floating:0,points:0,noSlot:true};

  cells[slot]=colour;
  const group=connected(cells,[slot],i=>cells[i]===colour);
  let match=0,floating=0,points=0;
  if(group.size>=3){
    for(const i of group)cells[i]=0;
    match=group.size;
    const seeds=[];
    for(const g of GRID)if(g.r===0&&cells[g.i])seeds.push(g.i);
    const attached=connected(cells,seeds,i=>cells[i]!==0);
    for(let i=0;i<N;i++)if(cells[i]&&!attached.has(i)){cells[i]=0;floating++;}
    const combo=cells[S_COMBO];
    points=Math.round((match*100+floating*200)*(1+Math.min(combo,5)*.2));
    cells[S_COMBO]=combo+1;
  }else{
    cells[S_COMBO]=0;
    const miss=cells[S_MISS]+1;cells[S_MISS]=miss;
    if(miss%5===0)cells[S_CEIL]++;
  }
  cells[seat===1?S_SCORE1:S_SCORE2]+=points;
  cells[S_SLOT]=slot;cells[S_ANGLE]=code;cells[S_COLOUR]=colour;
  cells[S_MATCH]=match;cells[S_FLOAT]=floating;cells[S_POINTS]=points;cells[S_SEAT]=seat;
  return{slot,match,floating,points,noSlot:false};
}

function finish(cells,moves){
  const s1=cells[S_SCORE1],s2=cells[S_SCORE2];
  return{winner:s1>s2?1:s2>s1?2:0,over:true,moves};
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
  if(info.noSlot)return{...s,cells,...finish(cells,moves)};
  let cleared=true;
  for(let i=0;i<N;i++)if(cells[i]){cleared=false;break;}
  if(cleared){cells[actor===1?S_SCORE1:S_SCORE2]+=2000;return{...s,cells,...finish(cells,moves)};}
  const ceilingNow=cells[S_CEIL]*ROW;
  let danger=false;
  for(const g of GRID)if(cells[g.i]&&g.y+ceilingNow+R>=LIMIT){danger=true;break;}
  if(danger||moves>=MAX_MOVES)return{...s,cells,...finish(cells,moves)};
  return{game:'bubbles',cells,turn:3-actor,winner:0,over:false,moves};
}

export function bubblesBot(s){
  let best=0,bestValue=-Infinity;
  for(let code=2;code<=ANGLE_MAX;code+=6){
    const cells=s.cells.slice();
    const info=bubblesStep(cells,code,cells[S_UP],s.turn);
    const row=info.slot<0?0:ROWS-GRID[info.slot].r;
    const value=info.points*1000+info.match*50+info.floating*30+row-(info.noSlot?100000:0)-code/1000;
    if(value>bestValue){bestValue=value;best=code;}
  }
  return best;
}

export const bubblesScore=cells=>[cells[S_SCORE1],cells[S_SCORE2]];
