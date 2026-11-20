package com.flightparty.table;

import java.util.*;
/** Pure board rules. 0 empty, 1/2 players. No transport or rendering. */
public final class GridRules {
 public record State(String game,int[] cells,int turn,int winner,boolean over,int moves,String fen,List<String> history,Integer shotCommand) {
  public State(String game,int[] cells,int turn,int winner,boolean over,int moves,String fen,List<String> history){
   this(game,cells,turn,winner,over,moves,fen,history,null);
  }
  public State(String game,int[] cells,int turn,int winner,boolean over,int moves){this(game,cells,turn,winner,over,moves,null,List.of());}
 }
 public static State start(String game){if(!Set.of("four","gomoku","xo","puzzle","chess","draw","cards","pool","nineball","bubbles","snooker").contains(game))throw new IllegalArgumentException("game");if(game.equals("snooker"))return SnookerRules.start();if(game.equals("bubbles"))return BubbleRules.start();if(game.equals("pool")||game.equals("nineball"))return PoolRules.start(game);if(game.equals("cards"))return CardRules.start();if(game.equals("draw"))return SketchRules.start();if(game.equals("chess"))return ChessRules.start();if(game.equals("puzzle")){var tiles=new ArrayList<Integer>();for(int i=1;i<=16;i++)tiles.add(i);Collections.shuffle(tiles,new java.security.SecureRandom());return new State(game,tiles.stream().mapToInt(Integer::intValue).toArray(),1,0,false,0);}return new State(game,new int[game.equals("four")?42:game.equals("xo")?9:225],1,0,false,0);}
 public static State move(State s,int actor,int position){
  if(s.over||actor!=s.turn)throw new IllegalStateException("turn");
  if(s.game.equals("snooker"))return SnookerRules.move(s,actor,position);if(s.game.equals("bubbles"))return BubbleRules.move(s,actor,position);
  if(s.game.equals("pool")||s.game.equals("nineball"))return PoolRules.move(s,actor,position);if(s.game.equals("cards"))return CardRules.move(s,actor,position);if(s.game.equals("chess"))return ChessRules.move(s,actor,position);if(s.game.equals("puzzle")){if(position<0||position>=256)throw new IllegalArgumentException("tile");int a=position/16,b=position%16;if(a==b)throw new IllegalArgumentException("same tile");int[] tiles=s.cells.clone();int value=tiles[a];tiles[a]=tiles[b];tiles[b]=value;boolean solved=true;for(int i=0;i<16;i++)if(tiles[i]!=i+1)solved=false;return new State(s.game,tiles,3-actor,solved?1:0,solved,s.moves+1);}int width=s.game.equals("four")?7:s.game.equals("xo")?3:15,index=position;
  if(s.game.equals("four")){if(position<0||position>=7)throw new IllegalArgumentException("column");index=-1;for(int row=5;row>=0;row--)if(s.cells[row*7+position]==0){index=row*7+position;break;}}
  if(index<0||index>=s.cells.length||s.cells[index]!=0)throw new IllegalArgumentException("occupied");

  int[] cells=s.cells.clone();cells[index]=actor;boolean win=false;int target=s.game.equals("four")?4:s.game.equals("xo")?3:5;
  for(int[] d:new int[][]{{1,0},{0,1},{1,1},{1,-1}}){int count=1;for(int sign:new int[]{-1,1}){int x=index%width+d[0]*sign,y=index/width+d[1]*sign;while(x>=0&&x<width&&y>=0&&y<cells.length/width&&cells[y*width+x]==actor){count++;x+=d[0]*sign;y+=d[1]*sign;}}if(count>=target)win=true;}
  return new State(s.game,cells,3-actor,win?actor:0,win||s.moves+1==cells.length,s.moves+1);
 }
 public static List<Integer> legal(State s){var result=new ArrayList<Integer>();if(s.over)return result;if(s.game.equals("snooker"))return SnookerRules.legal();if(s.game.equals("bubbles")){for(int i=0;i<=148;i++)result.add(i);return result;}if(s.game.equals("cards"))return CardRules.legal(s);if(s.game.equals("chess"))return ChessRules.legal(s);if(s.game.equals("four")){for(int c=0;c<7;c++)if(s.cells[c]==0)result.add(c);}else{for(int i=0;i<s.cells.length;i++)if(s.cells[i]==0)result.add(i);}return result;}
 public static int bot(State s){
  if(s.game.equals("snooker"))return SnookerRules.bot(s);if(s.game.equals("bubbles"))return BubbleRules.bot(s);
  if(s.game.equals("pool")||s.game.equals("nineball"))return PoolRules.bot(s);if(s.game.equals("cards"))return CardRules.bot(s);if(s.game.equals("chess"))return ChessRules.bot(s);if(s.game.equals("puzzle")){for(int i=0;i<16;i++)if(s.cells[i]!=i+1){for(int j=0;j<16;j++)if(s.cells[j]==i+1)return i*16+j;}throw new IllegalStateException("solved");}var moves=legal(s);if(moves.isEmpty())throw new IllegalStateException("over");
  for(int p:moves)if(move(s,s.turn,p).winner==s.turn)return p;
  var opponent=new State(s.game,s.cells,3-s.turn,0,false,s.moves);for(int p:moves)if(move(opponent,opponent.turn,p).winner==opponent.turn)return p;
  if(s.game.equals("four"))return moves.stream().min(Comparator.comparingInt(c->Math.abs(c-3))).orElseThrow();
  // Mirror the browser bot for tic-tac-toe: centre, then corners, then edges.
  // Winning and blocking moves are already handled above.
  if(s.game.equals("xo")){int best=moves.getFirst(),bestScore=-1;for(int p:moves){int value=p==4?2:p%2==0?1:0;if(value>bestScore){bestScore=value;best=p;}}return best;}
  int best=moves.getFirst(),score=Integer.MIN_VALUE;for(int p:moves){int value=-Math.abs(p%15-7)-Math.abs(p/15-7);for(int i=0;i<s.cells.length;i++)if(s.cells[i]!=0&&Math.abs(i%15-p%15)<=2&&Math.abs(i/15-p/15)<=2)value+=s.cells[i]==s.turn?5:4;if(value>score){score=value;best=p;}}return best;
 }
 /* ONLINE CUSTODY BOT -----------------------------------------------------
    When a real player leaves for good, an *easy* bot takes over their seat.
    This is deliberately weaker than bot(State): no winning/Blocking search,
    no aim optimisation, low power with a small deterministic miss. It always
    returns a command the game's move() accepts, so a double-hosted match can
    always run to a finish. The player's saved single-player difficulty never
    applies here. See com.flightparty.online.CustodyPolicy. */
 public static int easyBot(State s){
  if(s.over)throw new IllegalStateException("over");
  if(s.game.equals("snooker")){
   int command=SnookerRules.bot(s);
   int nomination=command/3600000,shot=command%3600000,angle=shot%3600;
   return nomination*3600000+32*3600+(angle+96)%3600;
  }
  if(s.game.equals("pool")||s.game.equals("nineball")){
   int command=PoolRules.bot(s);
   int spin=command/363600,shot=command%363600,angle=shot%3600;
   return spin*363600+28*3600+(angle+120)%3600;
  }
  if(s.game.equals("bubbles"))return 2+Math.floorMod(s.moves*17+s.turn*7,145);
  // Draw & Guess never uses GridRules.bot/easyBot: TableService drives it with
  // SketchRules.advance(). Keep a harmless legal fallback for completeness.
  if(s.game.equals("draw"))return 0;
  if(s.game.equals("cards")){
   // legal() always appends the "pass/draw" move (-1). Playing only that would
   // burn the 1000-move cap; stay legal but prefer an actual card so a fully
   // hosted match reaches a real finish.
   var legal=CardRules.legal(s);
   if(legal.isEmpty())throw new IllegalStateException("over");
   return legal.size()>1?legal.get(Math.floorMod(s.moves,legal.size()-1)):legal.getFirst();
  }
  if(s.game.equals("puzzle")){
   // A random swap never solves a 15-puzzle. Fix the first wrong tile on each
   // turn instead: deterministic, legal, and finished within 16 hosted moves.
   for(int a=0;a<16;a++)if(s.cells[a]!=a+1){
    for(int b=0;b<16;b++)if(s.cells[b]==a+1&&b!=a)return a*16+b;
   }
   return 0;
  }
  var moves=legal(s);if(moves.isEmpty())throw new IllegalStateException("over");
  return moves.get(Math.floorMod(s.moves*7+s.turn*3,moves.size()));
 }
}
