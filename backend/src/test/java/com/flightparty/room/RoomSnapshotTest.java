package com.flightparty.room;

import static org.junit.jupiter.api.Assertions.*;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class RoomSnapshotTest {
    @Test void onlyMembersCanReadTheirSeat() {
        UUID first=UUID.randomUUID(),second=UUID.randomUUID();var now=Instant.now();
        var room=RoomRules.join(RoomRules.friends(UUID.randomUUID(),first),second,now);
        assertEquals(0,RoomSnapshot.forMember(room,first,now).yourSeat());
        assertEquals(1,RoomSnapshot.forMember(room,second,now).yourSeat());
        assertThrows(IllegalStateException.class,()->RoomSnapshot.forMember(room,UUID.randomUUID(),now));
    }
}
