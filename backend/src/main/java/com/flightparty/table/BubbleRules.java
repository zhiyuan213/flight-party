package com.flightparty.table;

import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

/** Two-player Bubble Duel (versus edition). Mirrors dist/table/bubbles-duel.js
 *  exactly. Each player owns their own hex board; a pop of three-or-more and
 *  every detached bubble send "attack" rows that push the opponent's board
 *  down. First player to hit the danger line loses; clearing your own board
 *  wins; a round cap settles by score otherwise. All authoritative state is
 *  packed into State.cells so the generic room API can carry it unchanged. */
public final class BubbleRules {
 private static final double R=20,ROW=Math.sqrt(3)*R,H=765,LAUNCH_Y=H-29,LIMIT=H-90;
 private static final int COLS=18,ROWS=18,START_ROWS=8,ANGLE_MAX=148,COLOURS=5,MAX_MOVES=24,EXTRA=18;
 private static final double W=COLS*R*2; // 720 per board
 private static final double MIN_AIM=-Math.PI+.16,MAX_AIM=-.16;
 private static final int S=ROWS*(COLS*2-1)/2; // 315 hex cells per board
 private static final int BASE=2*S;
 private static final int S_CEIL1=BASE,S_CEIL2=BASE+1,S_UP=BASE+2,S_NEXT=BASE+3,
   S_SCORE1=BASE+4,S_SCORE2=BASE+5,S_COMBO1=BASE+6,S_COMBO2=BASE+7,
   S_SEED=BASE+8,S_SLOT=BASE+9,S_ANGLE=BASE+10,S_COLOUR=BASE+11,
   S_MATCH=BASE+12,S_FLOAT=BASE+13,S_POINTS=BASE+14,S_ATTACK=BASE+15,
   S_LIMIT=BASE+16,S_SEAT=BASE+17;
 private static final int FLOAT_POINTS=250,CLEAR_BONUS=3000;

 private static final class Cell { int i,r,c; double x,y; int[] neighbours; }
 private static final Cell[] GRID;
 private static final List<Cell>[] ROWS_OF;
 static {
  var all=new ArrayList<Cell>();int index=0;
  for(int r=0;r<ROWS;r++){int width=r%2==1?COLS-1:COLS;for(int c=0;c<width;c++){
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
 /* Rising per-group reward: one big pop is worth far more than several threes. */
 private static int matchPoints(int n){
  if(n<=3)return 100;if(n==4)return 160;if(n==5)return 240;if(n==6)return 340;if(n==7)return 460;return 600;
 }
 private static int boardOf(int seat){return seat==1?0:S;}
 private static int ceilingOf(int[] cells,int seat){return cells[seat==1?S_CEIL1:S_CEIL2];}
 private static void setCeiling(int[] cells,int seat,int val){cells[seat==1?S_CEIL1:S_CEIL2]=val;}

 public static GridRules.State start(){return start(ThreadLocalRandom.current().nextInt(1,Integer.MAX_VALUE));}
 /** Fixed-seed entry point used by tests and by parity checks with the browser. */
 public static GridRules.State start(int seed){
  seed=seed&0x7fffffff;if(seed==0)seed=20261109;
  int[] cells=new int[BASE+EXTRA];
  for(int seat=1;seat<=2;seat++){
   int off=boardOf(seat);
   for(Cell g:GRID){
    if(g.r>=START_ROWS)break;
    seed=nextSeed(seed);int colour=1+(int)(value(seed)*COLOURS);
    var row=ROWS_OF[g.r];
    if(g.c>=2&&cells[off+row.get(g.c-1).i]==colour&&cells[off+row.get(g.c-2).i]==colour)colour=colour%COLOURS+1;
    cells[off+g.i]=colour;
   }
  }
  seed=nextSeed(seed);cells[S_UP]=1+(int)(value(seed)*COLOURS);
  seed=nextSeed(seed);cells[S_NEXT]=1+(int)(value(seed)*COLOURS);
  cells[S_SEED]=seed;cells[S_SLOT]=-1;cells[S_ANGLE]=ANGLE_MAX/2;cells[S_LIMIT]=MAX_MOVES;
  return new GridRules.State("bubbles",cells,1,0,false,0);
 }

 private static Set<Integer> connected(int[] cells,int off,Collection<Integer> seeds,java.util.function.IntPredicate accept){
  var seen=new LinkedHashSet<Integer>(seeds);var queue=new ArrayList<Integer>(seeds);
  for(int head=0;head<queue.size();head++)for(int next:GRID[queue.get(head)].neighbours){
   if(seen.contains(next)||!accept.test(next))continue;
   seen.add(next);queue.add(next);
  }
  return seen;
 }
 private record Info(int slot,int match,int floating,int points,int attack,boolean noSlot){}

 private static Info step(int[] cells,int code,int colour,int seat){
  int off=boardOf(seat);
  double aim=decode(code),ceiling=ceilingOf(cells,seat)*ROW;
  double x=W/2,y=LAUNCH_Y,vx=Math.cos(aim),vy=Math.sin(aim);int impact=-1;
  for(int n=0;n<420;n++){
   x+=vx*4;y+=vy*4;
   if(x<R){x=2*R-x;vx=-vx;}else if(x>W-R){x=2*(W-R)-x;vx=-vx;}
   if(y<=R+ceiling)break;
   for(int j=0;j<S;j++){
    if(cells[off+j]==0)continue;
    Cell g=GRID[j];
    if(Math.hypot(g.x-x,g.y+ceiling-y)<R*2-1){impact=j;break;}
   }
   if(impact>=0)break;
  }
  var options=new ArrayList<Integer>();
  if(impact>=0){for(int i:GRID[impact].neighbours)if(cells[off+i]==0)options.add(i);}
  else for(Cell g:ROWS_OF[0])if(cells[off+g.i]==0)options.add(g.i);
  int slot=-1;double best=Double.POSITIVE_INFINITY;
  for(int i:options){Cell g=GRID[i];double d=Math.hypot(g.x-x,g.y-(y-ceiling));if(d<best){best=d;slot=i;}}
  if(slot<0)for(int i=0;i<S;i++)if(cells[off+i]==0){slot=i;break;}
  if(slot<0)return new Info(-1,0,0,0,0,true);

  cells[off+slot]=colour;
  var group=connected(cells,off,List.of(slot),i->cells[off+i]==colour);
  int match=0,floating=0,points=0;
  if(group.size()>=3){
   for(int i:group)cells[off+i]=0;
   match=group.size();
   var seeds=new ArrayList<Integer>();for(Cell g:ROWS_OF[0])if(cells[off+g.i]!=0)seeds.add(g.i);
   var attached=connected(cells,off,seeds,i->cells[off+i]!=0);
   for(int i=0;i<S;i++)if(cells[off+i]!=0&&!attached.contains(i)){cells[off+i]=0;floating++;}
   int comboSel=seat==1?S_COMBO1:S_COMBO2;
   int combo=cells[comboSel];
   points=(int)Math.round((matchPoints(match)+floating*FLOAT_POINTS)*(1+Math.min(combo,5)*.2));
   cells[comboSel]=combo+1;
  }else{
   cells[seat==1?S_COMBO1:S_COMBO2]=0;
  }
  int attack=match/3+floating/2;
  cells[seat==1?S_SCORE1:S_SCORE2]+=points;
  cells[S_SLOT]=slot;cells[S_ANGLE]=code;cells[S_COLOUR]=colour;
  cells[S_MATCH]=match;cells[S_FLOAT]=floating;cells[S_POINTS]=points;
  cells[S_ATTACK]=attack;cells[S_SEAT]=seat;
  return new Info(slot,match,floating,points,attack,false);
 }
 private static GridRules.State finished(GridRules.State s,int[] cells,int moves,int winner){
  return new GridRules.State("bubbles",cells,s.turn(),winner,true,moves);
 }

 public static GridRules.State move(GridRules.State s,int actor,int position){
  if(s.over()||s.turn()!=actor)throw new IllegalStateException("turn");
  if(position<0||position>ANGLE_MAX)throw new IllegalArgumentException("angle");
  int[] cells=s.cells().clone();
  Info info=step(cells,position,cells[S_UP],actor);
  int moves=s.moves()+1;
  cells[S_UP]=cells[S_NEXT];
  cells[S_SEED]=nextSeed(cells[S_SEED]);cells[S_NEXT]=1+(int)(value(cells[S_SEED])*COLOURS);
  if(info.noSlot){int a=cells[S_SCORE1],b=cells[S_SCORE2];return finished(s,cells,moves,a>b?1:b>a?2:0);}
  int opponent=3-actor;
  setCeiling(cells,opponent,ceilingOf(cells,opponent)+info.attack);
  int off=boardOf(actor);
  boolean cleared=true;for(int i=0;i<S;i++)if(cells[off+i]!=0){cleared=false;break;}
  if(cleared){cells[actor==1?S_SCORE1:S_SCORE2]+=CLEAR_BONUS;return finished(s,cells,moves,actor);}
  int oppOff=boardOf(opponent);double oppCeil=ceilingOf(cells,opponent)*ROW;boolean danger=false;
  for(Cell g:GRID)if(cells[oppOff+g.i]!=0&&g.y+oppCeil+R>=LIMIT){danger=true;break;}
  if(danger)return finished(s,cells,moves,actor);
  if(moves>=MAX_MOVES){int a=cells[S_SCORE1],b=cells[S_SCORE2];return finished(s,cells,moves,a>b?1:b>a?2:0);}
  return new GridRules.State("bubbles",cells,3-actor,0,false,moves);
 }

 public static int bot(GridRules.State s){
  int best=0;double bestValue=Double.NEGATIVE_INFINITY;
  int off=s.turn()==1?0:S,colour=s.cells()[S_UP];
  for(int code=2;code<=ANGLE_MAX;code+=6){
   int[] cells=s.cells().clone();
   Info info=step(cells,code,colour,s.turn());
   int row=info.slot<0?0:ROWS-GRID[info.slot].r;
   double score=info.points*1000+info.attack*900+info.match*50+info.floating*30+row-(info.noSlot?100000:0)-code/1000.0;
   if(score>bestValue){bestValue=score;best=code;}
  }
  return best;
 }
}
