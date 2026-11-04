package com.flightparty.table;
import org.junit.jupiter.api.Test;import static org.junit.jupiter.api.Assertions.*;
class CardRulesTest {
 @Test void hiddenHandsAndFullGame(){var s=CardRules.start();assertEquals("",CardRules.visible(s,1).history().get(1));assertEquals("",CardRules.visible(s,2).history().get(0));assertEquals("",CardRules.visible(s,1).history().get(2));int turns=0;while(!s.over()){s=CardRules.move(s,s.turn(),CardRules.bot(s));assertTrue(++turns<=1000);}assertTrue(s.winner()>=0&&s.winner()<=2);}
 @Test void illegalTurnAndRules(){assertTrue(CardRules.matches(0,9));assertTrue(CardRules.matches(0,18));assertFalse(CardRules.matches(0,19));var s=CardRules.start();assertThrows(IllegalStateException.class,()->CardRules.move(s,2,-1));}
}
