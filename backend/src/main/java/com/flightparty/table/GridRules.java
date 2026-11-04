package com.flightparty.table;

import java.util.*;
/** Pure board rules. 0 empty, 1/2 players. No transport or rendering. */
public final class GridRules {
 public record State(String game,int[] cells,int turn,int winner,boolean over,int moves,String fen,List<String> history) {public State(String game,int[] cells,int turn,int winner,boolean over,int moves){this(game,cells,turn,winner,over,moves,null,List.of());}}
 public static State start(String game){if(!Set.of("four","gomoku","puzzle","chess","draw","cards","pool").contains(game))throw new IllegalArgumentException("game");if(game.equals("pool"))return PoolRules.start();if(game.equals("cards"))return CardRules.start();if(game.equals("draw"))return SketchRules.start();if(game.equals("chess"))return ChessRules.start();if(game.equals("puzzle")){var tiles=new ArrayList<Integer>();for(int i=1;i<=16;i++)tiles.add(i);Collections.shuffle(tiles,new java.security.SecureRandom());return new State(game,tiles.stream().mapToInt(Integer::intValue).toArray(),1,0,false,0);}return new State(game,new int[game.equals("four")?42:225],1,0,false,0);}
 public static State move(State s,int actor,int position){
  if(s.over||actor!=s.turn)throw new IllegalStateException("turn");
  if(s.game.equals("pool"))return PoolRules.move(s,actor,position);if(s.game.equals("cards"))return CardRules.move(s,actor,position);if(s.game.equals("chess"))return ChessRules.move(s,actor,position);if(s.game.equals("puzzle")){if(position<0||position>=256)throw new IllegalArgumentException("tile");int a=position/16,b=position%16;if(a==b)throw new IllegalArgumentException("same tile");int[] tiles=s.cells.clone();int value=tiles[a];tiles[a]=tiles[b];tiles[b]=value;boolean solved=true;for(int i=0;i<16;i++)if(tiles[i]!=i+1)solved=false;return new State(s.game,tiles,3-actor,solved?1:0,solved,s.moves+1);}int width=s.game.equals("four")?7:15,index=position;
  if(s.game.equals("four")){if(position<0||position>=7)throw new IllegalArgumentException("column");index=-1;for(int row=5;row>=0;row--)if(s.cells[row*7+position]==0){index=row*7+position;break;}}
  if(index<0||index>=s.cells.length||s.cells[index]!=0)throw new IllegalArgumentException("occupied");
  int[] cells=s.cells.clone();cells[index]=actor;boolean win=false;int target=s.game.equals("four")?4:5;
  for(int[] d:new int[][]{{1,0},{0,1},{1,1},{1,-1}}){int count=1;for(int sign:new int[]{-1,1}){int x=index%width+d[0]*sign,y=index/width+d[1]*sign;while(x>=0&&x<width&&y>=0&&y<cells.length/width&&cells[y*width+x]==actor){count++;x+=d[0]*sign;y+=d[1]*sign;}}if(count>=target)win=true;}
  return new State(s.game,cells,3-actor,win?actor:0,win||s.moves+1==cells.length,s.moves+1);
 }
 public static List<Integer> legal(State s){var result=new ArrayList<Integer>();if(s.over)return result;if(s.game.equals("cards"))return CardRules.legal(s);if(s.game.equals("chess"))return ChessRules.legal(s);if(s.game.equals("four")){for(int c=0;c<7;c++)if(s.cells[c]==0)result.add(c);}else{for(int i=0;i<s.cells.length;i++)if(s.cells[i]==0)result.add(i);}return result;}
 public static int bot(State s){
  if(s.game.equals("pool"))return PoolRules.bot(s);if(s.game.equals("cards"))return CardRules.bot(s);if(s.game.equals("chess"))return ChessRules.bot(s);if(s.game.equals("puzzle")){for(int i=0;i<16;i++)if(s.cells[i]!=i+1){for(int j=0;j<16;j++)if(s.cells[j]==i+1)return i*16+j;}throw new IllegalStateException("solved");}var moves=legal(s);if(moves.isEmpty())throw new IllegalStateException("over");
  for(int p:moves)if(move(s,s.turn,p).winner==s.turn)return p;
  var opponent=new State(s.game,s.cells,3-s.turn,0,false,s.moves);for(int p:moves)if(move(opponent,opponent.turn,p).winner==opponent.turn)return p;
  if(s.game.equals("four"))return moves.stream().min(Comparator.comparingInt(c->Math.abs(c-3))).orElseThrow();
  int best=moves.getFirst(),score=Integer.MIN_VALUE;for(int p:moves){int value=-Math.abs(p%15-7)-Math.abs(p/15-7);for(int i=0;i<s.cells.length;i++)if(s.cells[i]!=0&&Math.abs(i%15-p%15)<=2&&Math.abs(i/15-p/15)<=2)value+=s.cells[i]==s.turn?5:4;if(value>score){score=value;best=p;}}return best;
 }
}
