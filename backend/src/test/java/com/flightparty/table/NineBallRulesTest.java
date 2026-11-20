package com.flightparty.table;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
/** Mirrors tests/nineball-rules.test.mjs. The nine-ball state keeps the 53-cell
    eight-ball layout so every renderer, replay frame and room snapshot stays
    compatible; only the rack, the legal target and the settlement differ. */
class NineBallRulesTest {
 @Test void nineBallRackMatchesTheClientDiamond(){
  var s=GridRules.start("nineball");
  assertEquals("nineball",s.game());
  assertEquals(53,s.cells().length);
  assertEquals(1,s.cells()[2],"cue ball");
  for(int id=1;id<=9;id++)assertEquals(1,s.cells()[id*3+2],"ball "+id+" alive");
  for(int id=10;id<16;id++)assertEquals(0,s.cells()[id*3+2],"unused ball "+id);
  assertEquals(6500,s.cells()[3],"1-ball apex x");
  assertEquals(2500,s.cells()[4],"1-ball apex y");
  assertEquals(7064,s.cells()[27],"9-ball centre x");
  assertEquals(2500,s.cells()[28],"9-ball centre y");
  for(int a=1;a<=9;a++)for(int b=a+1;b<=9;b++){
   double dx=(s.cells()[a*3]-s.cells()[b*3])/10.,dy=(s.cells()[a*3+1]-s.cells()[b*3+1])/10.;
   assertTrue(Math.hypot(dx,dy)>=32,a+"/"+b+" separated");
  }
 }
 @Test void theEightBallStartIsByteForByteUnchanged(){
  assertArrayEquals(PoolRules.start().cells(),PoolRules.start("pool").cells());
  assertEquals(7064,PoolRules.start().cells()[24],"existing golden fixture");
  assertEquals("pool",PoolRules.start().game());
 }
 @Test void aLegalNineBallEndsTheFrameForTheShooter(){
  var s=GridRules.start("nineball");
  for(int id=1;id<=9;id++)s.cells()[id*3+2]=0;
  s.cells()[9*3+2]=1;
  s.cells()[0]=1500;s.cells()[1]=1500;
  s.cells()[27]=400;s.cells()[28]=400;
  // 30% stronger strokes: 30% power still pots the 9 legally; 40%+ scratches.
  var r=PoolRules.move(s,1,30*3600+2250);
  assertEquals("nineball",r.game());
  assertEquals(53,r.cells().length);
  assertTrue(r.over(),"the 9-ball ends the frame");
  assertEquals(1,r.winner(),"a legal 9 wins");
  assertEquals(0,r.cells()[52],"no penalty visit survives a finished frame");
 }
 @Test void normalAndHostedBotsProduceAcceptedNineBallMoves(){
  var s=GridRules.start("nineball");
  int normal=GridRules.bot(s),hosted=GridRules.easyBot(s);
  assertTrue(normal>0);assertTrue(hosted>0);
  for(int command:new int[]{normal,hosted}){
   var moved=GridRules.move(s,1,command);
   assertEquals("nineball",moved.game());
   assertEquals(53,moved.cells().length);
   assertEquals(1,moved.moves());
  }
 }
}
