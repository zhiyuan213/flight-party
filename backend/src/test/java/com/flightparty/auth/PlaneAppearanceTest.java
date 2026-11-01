package com.flightparty.auth;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;

class PlaneAppearanceTest {
 @Test void activeMembersKeepEachApprovedPlayableSkin(){
  for(String choice:new String[]{"gold2d","cloud2d","night2d"}){
   assertEquals(choice,AppearanceService.displayPlane(true,choice));
   assertEquals(choice,AppearanceService.profile(true,"gold","star","gold",null,choice,0).plane());
  }
 }
 @Test void activeMembersReceiveThePlayableSkinAndLegacyChoicesRemainCompatible(){
  for(String choice:new String[]{"gold2d","gold","sapphire","night"}){
   assertEquals("gold2d",AppearanceService.displayPlane(true,choice));
   assertEquals("gold2d",AppearanceService.profile(true,"gold","star","gold",null,choice,0).plane());
  }
 }
 @Test void nonMembersClassicAndUnknownChoicesStayClassic(){
  for(String choice:new String[]{"gold2d","cloud2d","night2d","gold","sapphire","night","classic","untrusted-client-value"})assertEquals("classic",AppearanceService.displayPlane(false,choice));
  assertEquals("classic",AppearanceService.displayPlane(true,"classic"));
  assertEquals("classic",AppearanceService.displayPlane(true,"untrusted-client-value"));
  assertEquals("classic",AppearanceService.displayPlane(true,null));
 }
}
