package com.flightparty.table;
import org.junit.jupiter.api.Test;import static org.junit.jupiter.api.Assertions.*;
class ChessRulesTest {
 private static int square(String s){return (8-Character.digit(s.charAt(1),10))*8+s.charAt(0)-'a';}
 private static int code(String move){int p=move.length()==4?0:switch(move.charAt(4)){case 'q'->1;case 'r'->2;case 'b'->3;case 'n'->4;default->throw new IllegalArgumentException();};return square(move.substring(0,2))*64+square(move.substring(2,4))+4096*p;}
 private GridRules.State play(String... moves){var s=GridRules.start("chess");for(String m:moves)s=GridRules.move(s,s.turn(),code(m));return s;}
 @Test void legalAndMate(){var s=GridRules.start("chess");assertEquals(20,GridRules.legal(s).size());assertTrue(GridRules.legal(s).contains(GridRules.bot(s)));assertThrows(IllegalArgumentException.class,()->GridRules.move(s,1,code("e1g1")));var mate=play("f2f3","e7e5","g2g4","d8h4");assertTrue(mate.over());assertEquals(2,mate.winner());}
 @Test void castlingAndEnPassant(){var s=play("e2e4","e7e5","g1f3","b8c6","f1c4","g8f6","e1g1");assertEquals(6,s.cells()[square("g1")]);assertEquals(4,s.cells()[square("f1")]);s=play("e2e4","a7a6","e4e5","d7d5","e5d6");assertEquals(1,s.cells()[square("d6")]);assertEquals(0,s.cells()[square("d5")]);}
 @Test void repetitionsAndPromotions(){var draw=play("g1f3","g8f6","f3g1","f6g8","g1f3","g8f6","f3g1","f6g8");assertTrue(draw.over());assertEquals(0,draw.winner());for(char promotion:new char[]{'q','r','b','n'}){var s=play("a2a4","h7h5","a4a5","h5h4","a5a6","h4h3","a6b7","h3g2","b7a8"+promotion);assertTrue(s.cells()[square("a8")]>=2&&s.cells()[square("a8")]<=5);}}
}
