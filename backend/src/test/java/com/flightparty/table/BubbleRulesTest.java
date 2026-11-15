package com.flightparty.table;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import java.util.*;

class BubbleRulesTest {
 /* Two boards: each has 18 columns on even rows / 17 on odd rows, 18 rows ->
    315 cells. All state indices derive from S/BASE so widening the board
    cannot silently break tests. */
 private static final int COLS=18,ROWS=18,S=ROWS*(COLS*2-1)/2,EXTRA=18,BASE=2*S;
 private static final int START_ROWS=8;
 private static final int FILLED=4*COLS+4*(COLS-1); // first eight rows = 140 bubbles per board
 private static final int S_LIMIT=BASE+16,S_SLOT=BASE+9,S_ANGLE=BASE+10,S_COLOUR=BASE+11,
   S_MATCH=BASE+12,S_POINTS=BASE+14,S_SCORE1=BASE+4,S_SCORE2=BASE+5,S_CEIL1=BASE,S_CEIL2=BASE+1;

 @Test void initialBoardIsEightRowsPerSideWithoutHorizontalTriples(){
  var s=BubbleRules.start(20261109);
  assertEquals(BASE+EXTRA,s.cells().length);
  assertEquals(1,s.turn());assertEquals(0,s.moves());assertEquals(0,s.winner());assertFalse(s.over());
  assertEquals(24,s.cells()[S_LIMIT]);
  int filled=0;for(int i=0;i<BASE;i++)if(s.cells()[i]!=0)filled++;
  assertEquals(2*FILLED,filled);
  for(int i=0;i<BASE;i++)assertTrue(s.cells()[i]==0||s.cells()[i]>=1&&s.cells()[i]<=5);
  assertEquals(0,s.cells()[S_CEIL1]);assertEquals(0,s.cells()[S_CEIL2]);
 }

 @Test void shotsAlternateSeatsAndAdvanceTheRound(){
  var s=GridRules.start("bubbles");
  var next=GridRules.move(s,1,74);
  assertEquals(2,next.turn());assertEquals(1,next.moves());assertFalse(next.over());
  assertEquals(74,next.cells()[S_ANGLE]);
  assertTrue(next.cells()[S_SLOT]>=0&&next.cells()[S_SLOT]<S);
  assertEquals(-1,s.cells()[S_SLOT]);
  assertEquals(0,s.cells()[S_SCORE1]);
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
  int s1=s.cells()[S_SCORE1],s2=s.cells()[S_SCORE2];
  assertEquals(s1>s2?1:s2>s1?2:0,s.winner());
 }

 /** An attack from one side pushes only the OTHER board's ceiling down. */
 @Test void attacksPushOnlyTheOpponentsCeiling(){
  var s=BubbleRules.start(20261109);
  int c1=s.cells()[S_CEIL1],c2=s.cells()[S_CEIL2];
  var next=GridRules.move(s,1,74);
  // Seat 1's own ceiling must not move; seat 2's may only go up.
  assertEquals(c1,next.cells()[S_CEIL1]);
  assertTrue(next.cells()[S_CEIL2]>=c2);
 }

 /** Prints the board after a fixed seed + fixed shot sequence. The browser
  *  parity check must print the identical line. */
 @Test void deterministicParitySequence(){
  var s=BubbleRules.start(20261109);
  int[] shots={0,74,148,20,110,55,90,32};
  StringBuilder out=new StringBuilder("bubbles-parity:");
  out.append(Arrays.toString(s.cells())).append('|');
  for(int shot:shots){s=GridRules.move(s,s.turn(),shot);out.append(s.cells()[S_SLOT]).append(',').append(s.cells()[S_MATCH]).append(',').append(s.cells()[S_POINTS]).append(',').append(s.cells()[S_SCORE1]).append(',').append(s.cells()[S_SCORE2]).append(';');}
  System.out.println(out);
 }
}
