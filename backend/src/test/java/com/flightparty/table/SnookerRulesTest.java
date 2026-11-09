package com.flightparty.table;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import java.util.*;

class SnookerRulesTest {
 @Test void initialTableHasTwentyTwoBallsAndCleanScores(){
  var s=GridRules.start("snooker");
  assertEquals("snooker",s.game());assertEquals(72,s.cells().length);
  assertEquals(1,s.turn());assertEquals(0,s.moves());assertEquals(0,s.winner());assertFalse(s.over());
  assertEquals(-1,s.cells()[68]);assertEquals(0,s.cells()[66]);assertEquals(0,s.cells()[67]);
  int alive=0;for(int i=0;i<22;i++)if(s.cells()[i*3+2]==1)alive++;
  assertEquals(22,alive);
  // Cue ball sits in the D; the fifteen reds form the rack; six colours on spots.
  assertEquals(2450,s.cells()[0]);assertEquals(2900,s.cells()[1]);
 }

 @Test void aShotAdvancesTheTurnAndShipsReplayFrames(){
  var s=GridRules.start("snooker");
  var next=GridRules.move(s,1,GridRules.bot(s));
  assertEquals(1,next.moves());assertEquals(72,next.cells().length);
  assertTrue(next.turn()==1||next.turn()==2);
  assertTrue(next.cells()[66]>=0&&next.cells()[67]>=0);
  assertEquals(1,next.cells()[2],"cue ball is always re-spotted, never left in hand");
  assertFalse(next.history().isEmpty());
  for(String frame:next.history())assertEquals(66,frame.split(",").length);
  assertEquals(66,next.history().getLast().split(",").length);
  assertNotNull(next.shotCommand());
 }

 @Test void rejectsWrongTurnAndMalformedCommands(){
  var s=GridRules.start("snooker");
  assertThrows(IllegalStateException.class,()->GridRules.move(s,2,62*3600));
  assertThrows(IllegalArgumentException.class,()->GridRules.move(s,1,-1));
  assertThrows(IllegalArgumentException.class,()->GridRules.move(s,1,101*3600));
  assertThrows(IllegalArgumentException.class,()->GridRules.move(s,1,7*3600000+62*3600));
  assertTrue(GridRules.legal(s).isEmpty());
 }

 @Test void botDuelStaysConsistentForManyShots(){
  var s=GridRules.start("snooker");
  for(int i=0;i<80&&!s.over();i++){
   int command=GridRules.bot(s);
   assertTrue(command>=0&&command<7*3600000);
   s=GridRules.move(s,s.turn(),command);
   assertEquals(i+1,s.moves());
   assertEquals(72,s.cells().length);
   assertTrue(s.cells()[66]>=0&&s.cells()[67]>=0);
   assertTrue(s.cells()[68]>=-2&&s.cells()[68]<=6);
   assertEquals(1,s.cells()[2]);
   int balls=0;for(int b=0;b<22;b++)if(s.cells()[b*3+2]==1)balls++;
   assertTrue(balls>=1&&balls<=22,"ball count stays in range");
  }
  assertTrue(s.winner()==0||s.winner()==1||s.winner()==2);
 }

 @Test void nominatedColourIsCarriedThroughTheCommand(){
  var s=GridRules.start("snooker");
  int command=4*3600000+62*3600+1800;
  var next=GridRules.move(s,1,command);
  assertEquals(command,next.shotCommand());
  assertEquals(1,next.moves());
 }
}
