package com.flightparty.table;
import org.junit.jupiter.api.Test;import static org.junit.jupiter.api.Assertions.*;
class PoolRulesTest {
 @Test void deterministicAndBounded(){var s=PoolRules.start();var a=PoolRules.move(s,1,PoolRules.bot(s));var b=PoolRules.move(s,1,PoolRules.bot(s));assertArrayEquals(a.cells(),b.cells());assertTrue(a.history().size()>1);assertThrows(IllegalArgumentException.class,()->PoolRules.move(s,1,0));}
 @Test void scratchAndBlackRules(){var s=PoolRules.start();s.cells()[0]=400;s.cells()[1]=400;var scratch=PoolRules.move(s,1,50*3600+2250);assertEquals(1,scratch.cells()[2]);assertEquals(2,scratch.turn());for(boolean clear:new boolean[]{false,true}){s=PoolRules.start();if(clear)for(int i=1;i<8;i++)s.cells()[i*3+2]=0;s.cells()[0]=1500;s.cells()[1]=1500;s.cells()[24]=400;s.cells()[25]=400;var result=PoolRules.move(s,1,80*3600+2250);assertTrue(result.over());assertEquals(clear?1:2,result.winner());}}
}
