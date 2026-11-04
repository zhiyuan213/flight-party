package com.flightparty.table;
import com.github.bhlangonijr.chesslib.*;
import com.github.bhlangonijr.chesslib.move.Move;
import java.util.*;
/** Full legal chess backed by pinned Apache-2.0 chesslib. Histories are replayed for repetition draws. */
public final class ChessRules {
 private static Board board(GridRules.State s){Board b=new Board();if(s.history()!=null)for(String move:s.history())if(!b.doMove(new Move(move,b.getSideToMove()),true))throw new IllegalStateException("stored chess move");return b;}
 private static int index(Square sq){int n=sq.ordinal();return (7-n/8)*8+n%8;}
 private static int encode(Move m){String promo=m.getPromotion().getFenSymbol().toLowerCase();int p=switch(promo){case "q"->1;case "r"->2;case "b"->3;case "n"->4;default->0;};return index(m.getFrom())*64+index(m.getTo())+4096*p;}
 private static GridRules.State state(Board b,List<String> moves){int[] cells=new int[64];for(int i=0;i<64;i++){Piece p=b.getPiece(Square.squareAt((7-i/8)*8+i%8));cells[i]=p==Piece.NONE?0:p.ordinal()+1;}boolean mate=b.isMated(),over=mate||b.isDraw();int turn=b.getSideToMove()==Side.WHITE?1:2;return new GridRules.State("chess",cells,turn,mate?3-turn:0,over,moves.size(),b.getFen(),List.copyOf(moves));}
 public static GridRules.State start(){return state(new Board(),List.of());}
 public static List<Integer> legal(GridRules.State s){return board(s).legalMoves().stream().map(ChessRules::encode).toList();}
 public static GridRules.State move(GridRules.State s,int actor,int position){if(s.over()||s.turn()!=actor)throw new IllegalStateException("turn");Board b=board(s);Move selected=b.legalMoves().stream().filter(m->encode(m)==position).findFirst().orElseThrow(()->new IllegalArgumentException("illegal chess move"));if(!b.doMove(selected,true))throw new IllegalArgumentException("illegal move");var moves=new ArrayList<>(s.history());moves.add(selected.toString());return state(b,moves);}
 private static int value(Piece p){if(p==Piece.NONE)return 0;return switch(p.getPieceType()){case PAWN->100;case KNIGHT,BISHOP->320;case ROOK->500;case QUEEN->900;case KING->20000;default->0;};}
 public static int bot(GridRules.State s){Board b=board(s);int best=-1,bestScore=Integer.MIN_VALUE;for(Move m:b.legalMoves()){int score=value(b.getPiece(m.getTo()))*10;score+=m.getPromotion()==Piece.NONE?0:value(m.getPromotion())*9;b.doMove(m);if(b.isMated())score+=100000;else{int reply=0;for(Move r:b.legalMoves())reply=Math.max(reply,value(b.getPiece(r.getTo())));score-=reply*7;if(b.isKingAttacked())score+=20;}b.undoMove();score+=7-Math.abs(index(m.getTo())%8-3)-Math.abs(index(m.getTo())/8-3);if(score>bestScore){best=encode(m);bestScore=score;}}if(best<0)throw new IllegalStateException("over");return best;}
}
