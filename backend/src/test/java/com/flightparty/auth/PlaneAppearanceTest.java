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
  for(String choice:new String[]{"gold2d","cloud2d","night2d","obsidian2d","aurora2d","gold","sapphire","night","classic","untrusted-client-value"})assertEquals("classic",AppearanceService.displayPlane(false,choice));
  assertEquals("classic",AppearanceService.displayPlane(true,"classic"));
  assertEquals("classic",AppearanceService.displayPlane(true,"untrusted-client-value"));
  assertEquals("classic",AppearanceService.displayPlane(true,null));
 }
 @Test void annualSkinsAndFlagRequireBothRealMembershipAndAnnualQualification(){
  for(String skin:new String[]{"obsidian2d","aurora2d"}){
   assertEquals("classic",AppearanceService.displayPlane(true,skin));
   assertEquals("classic",AppearanceService.displayPlane(false,true,skin));
   assertEquals("classic",AppearanceService.displayPlane(true,false,skin));
   assertEquals(skin,AppearanceService.displayPlane(true,true,skin));
   var annual=AppearanceService.profile(true,true,"gold","star","gold",null,skin,0);
   assertTrue(annual.member());assertTrue(annual.annualMember());assertEquals(skin,annual.plane());
   var inactive=AppearanceService.profile(false,true,"gold","star","gold",null,skin,0);
   assertFalse(inactive.member());assertFalse(inactive.annualMember());assertEquals("classic",inactive.plane());
  }
 }
}
