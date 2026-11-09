package com.flightparty.table;

import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

/** Two-player Bubble Duel rules. Mirrors dist/table/bubbles-duel.js exactly.
 *  All authoritative state is packed into State.cells so the generic room API
 *  can carry it without a schema change. */
public final class BubbleRules {
 private static final double W=360,H=765,R=20,ROW=Math.sqrt(3)*R,LAUNCH_Y=H-29,LIMIT=H-90;
 private static final int ROWS=18,ANGLE_MAX=148,COLOURS=5,MAX_MOVES=24,EXTRA=16;
 private static final double MIN_AIM=-Math.PI+.16,MAX_AIM=-.16;
 private static final int S=153; // number of hex cells, see GRID below
 private static final int S_CEIL=S,S_UP=S+1,S_NEXT=S+2,S_SCORE1=S+3,S_SCORE2=S+4,
   S_MISS=S+5,S_COMBO=S+6,S_SEED=S+7,S_SLOT=S+8,S_ANGLE=S+9,S_COLOUR=S+10,
   S_MATCH=S+11,S_FLOAT=S+12,S_POINTS=S+13,S_LIMIT=S+14,S_SEAT=S+15;

 private static final class Cell { int i,r,c; double x,y; int[] neighbours; }
 private static final Cell[] GRID;
 private static final List<Cell>[] ROWS_OF;
 static {
  var all=new ArrayList<Cell>();int index=0;
  for(int r=0;r<ROWS;r++){int width=r%2==1?8:9;for(int c=0;c<width;c++){
   var cell=new Cell();cell.i=index++;cell.r=r;cell.c=c;
   cell.x=R+c*R*2+(r%2)*R;cell.y=R+r*ROW;all.add(cell);
  }}
  GRID=all.toArray(new Cell[0]);
  @SuppressWarnings("unchecked") List<Cell>[] rows=new List[ROWS];
  for(int r=0;r<ROWS;r++)rows[r]=new ArrayList<>();
  for(Cell a:GRID){var near=new ArrayList<Integer>();for(Cell b:GRID)if(b.i!=a.i&&Math.hypot(a.x-b.x,a.y-b.y)<41)near.add(b.i);
   Collections.sort(near);a.neighbours=near.stream().mapToInt(Integer::intValue).toArray();rows[a.r].add(a);}
  ROWS_OF=rows;
  if(GRID.length!=S)throw new IllegalStateException("bubble grid size");
 }
 private static int nextSeed(int seed){return (int)(((long)seed*1103515245L+12345L)&0x7fffffffL);}
 private static double value(int seed){return (double)seed/0x7fffffff;}
 private static double decode(int code){return MIN_AIM+(MAX_AIM-MIN_AIM)*((double)code/ANGLE_MAX);}

 public static GridRules.State start(){return start(ThreadLocalRandom.current().nextInt(1,Integer.MAX_VALUE));}
 /** Fixed-seed entry point used by tests and by parity checks with the browser. */
 public static GridRules.State start(int seed){
  seed=seed&0x7fffffff;if(seed==0)seed=20261109;
  int[] cells=new int[S+EXTRA];
  for(Cell g:GRID){
   if(g.r>=5)break;
   seed=nextSeed(seed);int colour=1+(int)(value(seed)*COLOURS);
   var row=ROWS_OF[g.r];
   if(g.c>=2&&cells[row.get(g.c-1).i]==colour&&cells[row.get(g.c-2).i]==colour)colour=colour%COLOURS+1;
   cells[g.i]=colour;
  }
  seed=nextSeed(seed);cells[S_UP]=1+(int)(value(seed)*COLOURS);
  seed=nextSeed(seed);cells[S_NEXT]=1+(int)(value(seed)*COLOURS);
  cells[S_SEED]=seed;cells[S_SLOT]=-1;cells[S_ANGLE]=ANGLE_MAX/2;cells[S_LIMIT]=MAX_MOVES;
  return new GridRules.State("bubbles",cells,1,0,false,0);
 }

 private static Set<Integer> connected(int[] cells,Collection<Integer> seeds,java.util.function.IntPredicate accept){
  var seen=new LinkedHashSet<Integer>(seeds);var queue=new ArrayList<Integer>(seeds);
  for(int head=0;head<queue.size();head++)for(int next:GRID[queue.get(head)].neighbours){
   if(seen.contains(next)||!accept.test(next))continue;
   seen.add(next);queue.add(next);
  }
  return seen;
 }
 private record Info(int slot,int match,int floating,int points,boolean noSlot){}

 private static Info step(int[] cells,int code,int colour,int seat){
  double aim=decode(code),ceiling=cells[S_CEIL]*ROW;
  double x=W/2,y=LAUNCH_Y,vx=Math.cos(aim),vy=Math.sin(aim);int impact=-1;
  for(int n=0;n<420;n++){
   x+=vx*4;y+=vy*4;
   if(x<R){x=2*R-x;vx=-vx;}else if(x>W-R){x=2*(W-R)-x;vx=-vx;}
   if(y<=R+ceiling)break;
   for(int j=0;j<S;j++){
    if(cells[j]==0)continue;
    Cell g=GRID[j];
    if(Math.hypot(g.x-x,g.y+ceiling-y)<R*2-1){impact=j;break;}
   }
   if(impact>=0)break;
  }
  var options=new ArrayList<Integer>();
  if(impact>=0){for(int i:GRID[impact].neighbours)if(cells[i]==0)options.add(i);}
  else for(Cell g:ROWS_OF[0])if(cells[g.i]==0)options.add(g.i);
  int slot=-1;double best=Double.POSITIVE_INFINITY;
  for(int i:options){Cell g=GRID[i];double d=Math.hypot(g.x-x,g.y-(y-ceiling));if(d<best){best=d;slot=i;}}
  if(slot<0)for(int i=0;i<S;i++)if(cells[i]==0){slot=i;break;}
  if(slot<0)return new Info(-1,0,0,0,true);

  cells[slot]=colour;
  var group=connected(cells,List.of(slot),i->cells[i]==colour);
  int match=0,floating=0,points=0;
  if(group.size()>=3){
   for(int i:group)cells[i]=0;
   match=group.size();
   var seeds=new ArrayList<Integer>();for(Cell g:ROWS_OF[0])if(cells[g.i]!=0)seeds.add(g.i);
   var attached=connected(cells,seeds,i->cells[i]!=0);
   for(int i=0;i<S;i++)if(cells[i]!=0&&!attached.contains(i)){cells[i]=0;floating++;}
   int combo=cells[S_COMBO];
   points=(int)Math.round((match*100+floating*200)*(1+Math.min(combo,5)*.2));
   cells[S_COMBO]=combo+1;
  }else{
   cells[S_COMBO]=0;
   int miss=cells[S_MISS]+1;cells[S_MISS]=miss;
   if(miss%5==0)cells[S_CEIL]++;
  }
  cells[seat==1?S_SCORE1:S_SCORE2]+=points;
  cells[S_SLOT]=slot;cells[S_ANGLE]=code;cells[S_COLOUR]=colour;
  cells[S_MATCH]=match;cells[S_FLOAT]=floating;cells[S_POINTS]=points;cells[S_SEAT]=seat;
  return new Info(slot,match,floating,points,false);
 }
 private static GridRules.State finished(GridRules.State s,int[] cells,int moves){
  int s1=cells[S_SCORE1],s2=cells[S_SCORE2];
  return new GridRules.State("bubbles",cells,s.turn(),s1>s2?1:s2>s1?2:0,true,moves);
 }

 public static GridRules.State move(GridRules.State s,int actor,int position){
  if(s.over()||s.turn()!=actor)throw new IllegalStateException("turn");
  if(position<0||position>ANGLE_MAX)throw new IllegalArgumentException("angle");
  int[] cells=s.cells().clone();
  Info info=step(cells,position,cells[S_UP],actor);
  int moves=s.moves()+1;
  cells[S_UP]=cells[S_NEXT];
  cells[S_SEED]=nextSeed(cells[S_SEED]);cells[S_NEXT]=1+(int)(value(cells[S_SEED])*COLOURS);
  if(info.noSlot)return finished(s,cells,moves);
  boolean cleared=true;for(int i=0;i<S;i++)if(cells[i]!=0){cleared=false;break;}
  if(cleared){cells[actor==1?S_SCORE1:S_SCORE2]+=2000;return finished(s,cells,moves);}
  double ceiling=cells[S_CEIL]*ROW;boolean danger=false;
  for(Cell g:GRID)if(cells[g.i]!=0&&g.y+ceiling+R>=LIMIT){danger=true;break;}
  if(danger||moves>=MAX_MOVES)return finished(s,cells,moves);
  return new GridRules.State("bubbles",cells,3-actor,0,false,moves);
 }

 public static int bot(GridRules.State s){
  int best=0;double bestValue=Double.NEGATIVE_INFINITY;
  for(int code=2;code<=ANGLE_MAX;code+=6){
   int[] cells=s.cells().clone();
   Info info=step(cells,code,cells[S_UP],s.turn());
   int row=info.slot<0?0:ROWS-GRID[info.slot].r;
   double score=info.points*1000+info.match*50+info.floating*30+row-(info.noSlot?100000:0)-code/1000.0;
   if(score>bestValue){bestValue=score;best=code;}
  }
  return best;
 }
}
