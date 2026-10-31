package com.flightparty.room;

import static com.flightparty.room.RoomRules.*;
import static org.junit.jupiter.api.Assertions.*;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class RoomRulesTest {
    private final Instant now=Instant.parse("2026-10-31T00:00:00Z");
    @Test void friendsWaitThenMatchWithoutResettingDeadline() {
        UUID a=UUID.randomUUID(), b=UUID.randomUUID(), c=UUID.randomUUID();
        var room=friends(UUID.randomUUID(),a); room=join(room,b,now);
        room=ready(room,a,true,now); assertEquals(Phase.WAITING_FRIENDS,room.phase()); assertNull(room.deadline());
        room=ready(room,b,true,now.plusSeconds(5)); var deadline=now.plusSeconds(35);
        assertEquals(deadline,room.deadline()); room=join(room,c,now.plusSeconds(9));
        assertTrue(room.seats().stream().filter(s->c.equals(s.principal())).findFirst().orElseThrow().ready());
        room=leave(room,c,now.plusSeconds(10)); assertEquals(deadline,room.deadline());
        var filled=expire(room,deadline); assertEquals(Phase.STARTING,filled.phase());
        assertEquals(2,filled.seats().stream().filter(Seat::bot).count());
    }
    @Test void fullRoomStartsEarlyAndLateJoinFails() {
        var room=quick(UUID.randomUUID(),UUID.randomUUID(),now);
        for(int i=0;i<3;i++)room=join(room,UUID.randomUUID(),now.plusSeconds(1));
        assertEquals(Phase.STARTING,room.phase());
        var started=room; assertThrows(IllegalStateException.class,()->join(started,UUID.randomUUID(),now));
        var expired=quick(UUID.randomUUID(),UUID.randomUUID(),now);
        assertThrows(IllegalStateException.class,()->join(expired,UUID.randomUUID(),now.plusSeconds(30)));
    }
    @Test void soleCreatorCanReadyAndEmptyRoomCloses() {
        var id=UUID.randomUUID(); var room=ready(friends(UUID.randomUUID(),id),id,true,now);
        assertEquals(Phase.MATCHING,room.phase());
        assertEquals(Phase.CLOSED,leave(room,id,now).phase());
    }
}
