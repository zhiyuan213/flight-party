package com.flightparty.table;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class GridRulesTest {
 @Test void gravityAndTurn(){var s=GridRules.start("four");var n=GridRules.move(s,1,3);assertEquals(1,n.cells()[38]);assertEquals(0,s.cells()[38]);assertThrows(IllegalStateException.class,()->GridRules.move(n,1,3));}
 @Test void verticalWin(){var s=GridRules.start("four");for(int p:new int[]{0,1,0,1,0,1,0})s=GridRules.move(s,s.turn(),p);assertTrue(s.over());assertEquals(1,s.winner());var done=s;assertThrows(IllegalStateException.class,()->GridRules.move(done,2,2));}
 @Test void horizontalWin(){var s=GridRules.start("four");for(int p:new int[]{0,0,1,1,2,2,3})s=GridRules.move(s,s.turn(),p);assertEquals(1,s.winner());}
 @Test void fullColumn(){var s=GridRules.start("four");for(int i=0;i<6;i++)s=GridRules.move(s,s.turn(),0);var full=s;assertThrows(IllegalArgumentException.class,()->GridRules.move(full,1,0));assertFalse(GridRules.legal(s).contains(0));}
 @Test void botBlocksImmediateLoss(){var s=GridRules.start("four");for(int p:new int[]{0,6,1,6,2})s=GridRules.move(s,s.turn(),p);assertEquals(3,GridRules.bot(s));}
 @Test void gomokuFiveAndNoWrap(){var s=GridRules.start("gomoku");for(int p:new int[]{0,30,1,31,2,32,3,33,4})s=GridRules.move(s,s.turn(),p);assertTrue(s.over());assertEquals(1,s.winner());var empty=GridRules.start("gomoku");assertEquals(225,GridRules.legal(empty).size());assertEquals(112,GridRules.bot(empty));}
 @Test void puzzleIsAPermutationAndBotSolvesWithoutClientScores(){var s=GridRules.start("puzzle");assertEquals(16,java.util.Arrays.stream(s.cells()).distinct().count());int count=0;while(!s.over()&&count++<16)s=GridRules.move(s,s.turn(),GridRules.bot(s));assertTrue(s.over());assertEquals(1,s.winner());}
}