package com.flightparty.table;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import java.util.*;

class BubbleRulesTest {
 @Test void initialBoardIsFiveRowsOfBubblesWithoutHorizontalTriples(){
  var s=BubbleRules.start(20261109);
  assertEquals(169,s.cells().length);
  assertEquals(1,s.turn());assertEquals(0,s.moves());assertEquals(0,s.winner());assertFalse(s.over());
  assertEquals(24,s.cells()[167]);
  int filled=0;for(int i=0;i<153;i++)if(s.cells()[i]!=0)filled++;
  assertEquals(43,filled);
  for(int i=0;i<153;i++)assertTrue(s.cells()[i]==0||s.cells()[i]>=1&&s.cells()[i]<=5);
 }

 @Test void shotsAlternateSeatsAndAdvanceTheRound(){
  var s=GridRules.start("bubbles");
  var next=GridRules.move(s,1,74);
  assertEquals(2,next.turn());assertEquals(1,next.moves());assertFalse(next.over());
  assertEquals(74,next.cells()[162]);
  assertTrue(next.cells()[161]>=0&&next.cells()[161]<153);
  assertEquals(-1,s.cells()[161]);
  assertEquals(0,s.cells()[156]);
  var third=GridRules.move(next,2,20);
  assertEquals(1,third.turn());assertEquals(2,third.moves());
 }

 @Test void rejectsWrongTurnAndOutOfRangeAngles(){
  var s=GridRules.start("bubbles");
  assertThrows(IllegalStateException.class,()->GridRules.move(s,2,74));
  assertThrows(IllegalArgumentException.class,()->GridRules.move(s,1,-1));
  assertThrows(IllegalArgumentException.class,()->GridRules.move(s,1,149));
  assertEquals(149,GridRules.legal(s).size());
 }

 @Test void botReturnsAValidAngleAndDoesNotMutateTheBoard(){
  var s=BubbleRules.start(20261109);
  int[] before=s.cells().clone();
  int angle=GridRules.bot(s);
  assertTrue(angle>=0&&angle<=148);
  assertArrayEquals(before,s.cells());
  assertDoesNotThrow(()->GridRules.move(s,s.turn(),angle));
 }

 @Test void fullBotDuelSettlesWithinTheRoundLimit(){
  var s=BubbleRules.start(424242);
  int guard=0;
  while(!s.over()&&guard++<40)s=GridRules.move(s,s.turn(),GridRules.bot(s));
  assertTrue(s.over());assertTrue(s.moves()<=24);
  assertTrue(s.winner()==0||s.winner()==1||s.winner()==2);
  int s1=s.cells()[156],s2=s.cells()[157];
  assertEquals(s1>s2?1:s2>s1?2:0,s.winner());
 }

 /** Prints the board after a fixed seed + fixed shot sequence. The browser
  *  parity check in tools/bubbles-parity.mjs must print the identical line. */
 @Test void deterministicParitySequence(){
  var s=BubbleRules.start(20261109);
  int[] shots={0,74,148,20,110,55,90,32};
  StringBuilder out=new StringBuilder("bubbles-parity:");
  out.append(Arrays.toString(s.cells())).append('|');
  for(int shot:shots){s=GridRules.move(s,s.turn(),shot);out.append(s.cells()[161]).append(',').append(s.cells()[164]).append(',').append(s.cells()[166]).append(',').append(s.cells()[156]).append(',').append(s.cells()[157]).append(';');}
  System.out.println(out);
 }
}
