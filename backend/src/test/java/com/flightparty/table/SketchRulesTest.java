package com.flightparty.table;
import org.junit.jupiter.api.Test;import static org.junit.jupiter.api.Assertions.*;import java.util.*;
class SketchRulesTest {
 @Test void answerAndDrawingSecurity(){var s=SketchRules.start();assertNotEquals(s.fen(),SketchRules.visible(s,2).fen());assertEquals(s.fen(),SketchRules.visible(s,1).fen());var original=s;assertThrows(IllegalArgumentException.class,()->SketchRules.act(original,2,"stroke",null,List.of(0,0,10,10)));assertThrows(IllegalArgumentException.class,()->SketchRules.act(original,1,"stroke",null,List.of(-1,0,10,10)));s=SketchRules.act(s,1,"stroke",null,List.of(0,0,100,100));assertEquals(1,s.history().size());assertEquals(s,SketchRules.act(s,2,"guess","wrong",null));}
 @Test void sixRoundsScoreAndTerminal(){var s=SketchRules.start();for(int i=0;i<6;i++)s=SketchRules.act(s,3-s.turn(),"guess",s.fen(),null);assertTrue(s.over());assertArrayEquals(new int[]{9,9},s.cells());assertEquals(0,s.winner());}
 @Test void computerProvidesRealDrawing(){var s=SketchRules.computer(SketchRules.start());assertFalse(s.history().isEmpty());assertTrue(Set.of("圆形","正方形","三角形").contains(s.fen()));}
}
