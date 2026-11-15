package com.flightparty.table;

import java.util.Set;

/** A room's visual selection, not a purchase receipt or membership entitlement. */
public final class TableCosmetics {
 private TableCosmetics() {}
 public record Selection(String piece,String board) {}
 public static Selection select(String game,String piece,String board) {
  if(game==null||!Set.of("four","gomoku","xo","chess").contains(game))throw new IllegalArgumentException("unsupported cosmetic game");
  return new Selection(id(game,"piece",piece,!game.equals("chess")),id(game,"board",board,Set.of("four","chess").contains(game)));
 }
 private static String id(String game,String role,String value,boolean enabled) {
  String prefix=game+"-"+role+"-", baseline=prefix+"default";
  if(value==null||value.isBlank())return baseline;
  Set<String> allowed=!enabled?Set.of(baseline):game.equals("chess")
   ?Set.of(baseline,prefix+"neon",prefix+"jade",prefix+"aurora")
   :Set.of(baseline,prefix+"neon",prefix+"jade",prefix+"aurora",prefix+"coral",prefix+"pearl");
  if(!allowed.contains(value))throw new IllegalArgumentException("invalid cosmetic id");
  return value;
 }
}
