package com.flightparty.room;

import static org.junit.jupiter.api.Assertions.*;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class RoomSnapshotTest {
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
}
