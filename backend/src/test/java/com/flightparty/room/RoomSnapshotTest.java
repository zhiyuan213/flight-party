package com.flightparty.room;

import static org.junit.jupiter.api.Assertions.*;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class RoomSnapshotTest {
    @Test void snapshotsFromBeforeOriginAndInvitationFieldsRemainReadable() {
        UUID room=UUID.randomUUID(),principal=UUID.randomUUID();
        String old="{\"id\":\""+room+"\",\"phase\":\"PLAYING\",\"seats\":[{\"index\":0,\"principal\":\""+principal+"\",\"ready\":true,\"bot\":false}],\"deadline\":null}";
        var json=tools.jackson.databind.json.JsonMapper.builder().build();
        var restored=json.readValue(old,RoomRules.Room.class);
        assertFalse(restored.seats().getFirst().invited());assertEquals(RoomRules.Origin.QUICK,restored.origin());
        assertEquals(room,RoomSnapshot.forMember(restored,principal,Instant.now()).roomId());
        assertEquals(restored,json.readValue(json.writeValueAsString(restored),RoomRules.Room.class));
        var waiting=json.readValue(old.replace("PLAYING","WAITING_FRIENDS"),RoomRules.Room.class);
        assertEquals(RoomRules.Phase.MATCHING,RoomRules.ready(waiting,principal,true,Instant.now()).phase());
    }
    @Test void publicNicknameDoesNotExposePrincipalOrAccount() {
        UUID user=UUID.randomUUID();var now=Instant.now();
        var room=RoomRules.friends(UUID.randomUUID(),user);
        var view=RoomSnapshot.forMember(room,user,now,java.util.Map.of(0,"大卫 <pilot>"));
        assertEquals("大卫 <pilot>",view.seats().getFirst().displayName());
        String json=tools.jackson.databind.json.JsonMapper.builder().build().writeValueAsString(view);
        assertFalse(json.contains(user.toString()));assertFalse(json.contains("accountId"));
        assertNull(RoomSnapshot.forMember(room,user,now).seats().getFirst().displayName());
    }
    @Test void onlyMembersCanReadTheirSeat() {
        UUID first=UUID.randomUUID(),second=UUID.randomUUID();var now=Instant.now();
        var room=RoomRules.join(RoomRules.friends(UUID.randomUUID(),first),second,now);
        assertEquals(0,RoomSnapshot.forMember(room,first,now).yourSeat());
        assertEquals(1,RoomSnapshot.forMember(room,second,now).yourSeat());
        assertThrows(IllegalStateException.class,()->RoomSnapshot.forMember(room,UUID.randomUUID(),now));
    }
    @Test void publicPlaneSkinIsMemberOnlyAndNeverAppliedToBots(){
        UUID principal=UUID.randomUUID();var now=Instant.now();
        var room=new RoomRules.Room(UUID.randomUUID(),RoomRules.Phase.PLAYING,java.util.List.of(new RoomRules.Seat(0,principal,true,false),new RoomRules.Seat(1,null,true,true)),null);
        var member=com.flightparty.auth.AppearanceService.profile(true,"gold","star","gold",null,"gold2d",0);
        var seat=RoomSnapshot.forMember(room,principal,now,java.util.Map.of(),java.util.Map.of(0,member,1,member));
        assertEquals("gold2d",seat.seats().get(0).planeStyle());
        assertEquals("classic",seat.seats().get(1).planeStyle());
        var ordinary=com.flightparty.auth.AppearanceService.profile(false,"gold","star","gold",null,"gold2d",0);
        assertEquals("classic",RoomSnapshot.forMember(room,principal,now,java.util.Map.of(),java.util.Map.of(0,ordinary)).seats().getFirst().planeStyle());
        assertEquals("classic",RoomSnapshot.forMember(room,principal,now).seats().getFirst().planeStyle());
    }
    @Test void mixedMemberRoomBroadcastsEverySelectedSkinWithoutConflatingSeats(){
        var seats=new java.util.ArrayList<RoomRules.Seat>();
        var appearances=new java.util.HashMap<Integer,com.flightparty.auth.AppearanceService.Appearance>();
        var skins=java.util.List.of("classic","gold2d","cloud2d","night2d");
        for(int i=0;i<skins.size();i++){
            seats.add(new RoomRules.Seat(i,UUID.randomUUID(),true,false));
            appearances.put(i,com.flightparty.auth.AppearanceService.profile(true,"gold","star","gold",null,skins.get(i),0));
        }
        var room=new RoomRules.Room(UUID.randomUUID(),RoomRules.Phase.PLAYING,seats,null);
        var snapshot=RoomSnapshot.forMember(room,seats.getFirst().principal(),Instant.now(),java.util.Map.of(),appearances);
        assertEquals(skins,snapshot.seats().stream().map(RoomSnapshot.Seat::planeStyle).toList());
        appearances.put(2,com.flightparty.auth.AppearanceService.profile(false,"gold","star","gold",null,"cloud2d",0));
        assertEquals(java.util.List.of("classic","gold2d","classic","night2d"),RoomSnapshot.forMember(room,seats.getFirst().principal(),Instant.now(),java.util.Map.of(),appearances).seats().stream().map(RoomSnapshot.Seat::planeStyle).toList());
    }
}
