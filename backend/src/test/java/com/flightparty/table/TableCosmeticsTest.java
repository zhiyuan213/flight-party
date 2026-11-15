package com.flightparty.table;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class TableCosmeticsTest {
 @Test void piecesAndBoardsRemainSpecificToTheirGame(){
  for(String game:new String[]{"four","gomoku","xo"}){
   for(String theme:new String[]{"default","neon","jade","aurora"}){
    var s=TableCosmetics.select(game,game+"-piece-"+theme,null);
    assertEquals(game+"-piece-"+theme,s.piece());assertEquals(game+"-board-default",s.board());
   }
   if(!game.equals("four"))assertThrows(IllegalArgumentException.class,()->TableCosmetics.select(game,null,game+"-board-jade"));
  }
  for(String theme:new String[]{"default","neon","jade","aurora"})assertEquals("four-board-"+theme,TableCosmetics.select("four",null,"four-board-"+theme).board());
  assertThrows(IllegalArgumentException.class,()->TableCosmetics.select("four",null,"chess-board-jade"));
  assertEquals("chess-board-jade",TableCosmetics.select("chess",null,"chess-board-jade").board());
  assertThrows(IllegalArgumentException.class,()->TableCosmetics.select("chess","chess-piece-jade",null));
  assertThrows(IllegalArgumentException.class,()->TableCosmetics.select("gomoku","four-piece-neon",null));
  assertThrows(IllegalArgumentException.class,()->TableCosmetics.select("pool",null,null));
  assertThrows(IllegalArgumentException.class,()->TableCosmetics.select(null,null,null));
  assertThrows(IllegalArgumentException.class,()->TableCosmetics.select("xo","https://example.com/avatar.svg",null));
 }
 @Test void oldRoomSeatsStillDeserializeWithOptionalCosmetics(){
  var json=tools.jackson.databind.json.JsonMapper.builder().build();
  var principal=java.util.UUID.randomUUID();
  String oldJson="""
   {"id":"%s","game":"gomoku","origin":"FRIENDS","phase":"WAITING",
    "seats":[{"principal":"%s","account":null,"name":"Guest","bot":false}],
    "board":%s,"version":7,"deadline":0}
   """.formatted(java.util.UUID.randomUUID(),principal,json.writeValueAsString(GridRules.start("gomoku")));
  var room=json.readValue(oldJson,TableService.Room.class);
  var old=room.seats().getFirst();
  assertEquals(principal,old.principal());assertEquals(7,room.version());
  assertNull(old.piece());assertNull(old.board());
  var baseline=TableCosmetics.select("gomoku",old.piece(),old.board());
  assertEquals("gomoku-piece-default",baseline.piece());
 }
}
