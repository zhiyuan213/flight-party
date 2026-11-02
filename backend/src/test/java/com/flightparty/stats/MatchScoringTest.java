package com.flightparty.stats;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class MatchScoringTest {
 @Test void awardsRankAndEveryFinishedPlane(){
  assertEquals(7,MatchScoring.points(1,2));assertEquals(6,MatchScoring.points(2,2));
  for(int rank:new int[]{3,4})for(int planes=0;planes<=2;planes++)assertEquals(planes*2,MatchScoring.points(rank,planes));
  assertEquals(3,MatchScoring.points(1,0));assertEquals(4,MatchScoring.points(2,1));
 }
 @Test void rejectsInvalidAuthorityInputs(){
  assertThrows(IllegalArgumentException.class,()->MatchScoring.points(0,2));
  assertThrows(IllegalArgumentException.class,()->MatchScoring.points(5,0));
  assertThrows(IllegalArgumentException.class,()->MatchScoring.points(3,-1));
  assertThrows(IllegalArgumentException.class,()->MatchScoring.points(4,3));
 }
}
