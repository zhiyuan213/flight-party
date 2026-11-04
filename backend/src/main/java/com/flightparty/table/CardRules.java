package com.flightparty.table;
import java.util.*;
/** Two-player color/number matching deck, without gambling or proprietary action-card rules. */
public final class CardRules {
 private static List<Integer> parse(String s){if(s.isEmpty())return new ArrayList<>();return new ArrayList<>(Arrays.stream(s.split(",")).map(Integer::valueOf).toList());}
 private static String pack(List<Integer> s){return String.join(",",s.stream().map(Object::toString).toList());}
 private static GridRules.State state(List<Integer> a,List<Integer>b,List<Integer>deck,List<Integer>discard,int turn,int moves,int passes){int top=discard.getLast();boolean over=a.isEmpty()||b.isEmpty()||passes>=2||moves>=1000;int winner=over?(a.size()==b.size()?0:a.size()<b.size()?1:2):0;return new GridRules.State("cards",new int[]{top,a.size(),b.size()},turn,winner,over,moves,""+passes,List.of(pack(a),pack(b),pack(deck),pack(discard)));}
 public static GridRules.State start(){var deck=new ArrayList<Integer>();for(int i=0;i<72;i++)deck.add(i);Collections.shuffle(deck,new java.security.SecureRandom());var a=new ArrayList<>(deck.subList(0,7));var b=new ArrayList<>(deck.subList(7,14));return state(a,b,new ArrayList<>(deck.subList(15,72)),new ArrayList<>(List.of(deck.get(14))),1,0,0);}
 public static GridRules.State visible(GridRules.State s,int player){return new GridRules.State(s.game(),s.cells(),s.turn(),s.winner(),s.over(),s.moves(),s.fen(),List.of(player==1?s.history().get(0):"",player==2?s.history().get(1):"","",""));}
 public static boolean matches(int card,int top){return card/18==top/18||card%9==top%9;}
 public static List<Integer> legal(GridRules.State s){var hand=parse(s.history().get(s.turn()-1));var moves=new ArrayList<Integer>();if(s.over())return moves;for(int i=0;i<hand.size();i++)if(matches(hand.get(i),s.cells()[0]))moves.add(i);moves.add(-1);return moves;}
 public static GridRules.State move(GridRules.State s,int actor,int index){if(s.over()||s.turn()!=actor)throw new IllegalStateException();var a=parse(s.history().get(0));var b=parse(s.history().get(1));var deck=parse(s.history().get(2));var discard=parse(s.history().get(3));var hand=actor==1?a:b;int passes=0;if(index==-1){if(deck.isEmpty()&&discard.size()>1){int top=discard.removeLast();deck.addAll(discard);discard.clear();discard.add(top);Collections.shuffle(deck,new java.security.SecureRandom());}if(deck.isEmpty())passes=Integer.parseInt(s.fen())+1;else hand.add(deck.removeLast());}else{if(index<0||index>=hand.size()||!matches(hand.get(index),s.cells()[0]))throw new IllegalArgumentException();discard.add(hand.remove(index));}return state(a,b,deck,discard,3-actor,s.moves()+1,passes);}
 public static int bot(GridRules.State s){return legal(s).getFirst();}
}
