package com.flightparty.room;

import static com.flightparty.room.RoomRules.*;
import static org.junit.jupiter.api.Assertions.*;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class RoomRulesTest {
    @Test void originsAndFriendGroupSurviveTheLifecycle() {
        UUID a=UUID.randomUUID(),b=UUID.randomUUID(),random=UUID.randomUUID();
        var friends=join(friends(UUID.randomUUID(),a),b,now);
        var matching=ready(ready(friends,a,true,now),b,true,now);
        var mixed=joinPublic(matching,random,now);
        assertEquals(Origin.FRIENDS,mixed.origin());
        assertEquals(Origin.FRIENDS,RoomSnapshot.forMember(mixed,a,now).origin());
        assertEquals(Origin.QUICK,RoomSnapshot.forMember(mixed,random,now).origin());
        var started=startNow(mixed,a);
        var finished=new Room(started.id(),Phase.SETTLED,started.seats(),started.deadline(),started.origin());
        var next=rematch(finished,UUID.randomUUID());
        assertNotEquals(finished.id(),next.id());assertEquals(Phase.WAITING_FRIENDS,next.phase());assertNull(next.deadline());
        assertEquals(java.util.Set.of(a,b),next.seats().stream().map(Seat::principal).collect(java.util.stream.Collectors.toSet()));
        assertTrue(next.seats().stream().noneMatch(Seat::ready));
        var quick=quick(UUID.randomUUID(),a,now);
        assertEquals(Origin.QUICK,RoomSnapshot.forMember(quick,a,now).origin());
        assertThrows(IllegalStateException.class,()->rematch(quick,UUID.randomUUID()));
    }
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
    @Test void matchingMemberCanStartNowWithoutReplacingHumansOrResettingDeadline() {
        UUID a=UUID.randomUUID(),b=UUID.randomUUID();
        var waiting=join(quick(UUID.randomUUID(),a,now),b,now.plusSeconds(1));
        var started=startNow(waiting,b);
        assertEquals(Phase.STARTING,started.phase());assertEquals(waiting.deadline(),started.deadline());
        assertEquals(4,started.seats().size());assertEquals(2,started.seats().stream().filter(Seat::bot).count());
        assertTrue(started.seats().containsAll(waiting.seats()));assertSame(started,startNow(started,a));
        assertThrows(IllegalStateException.class,()->startNow(waiting,UUID.randomUUID()));
        assertThrows(IllegalStateException.class,()->startNow(friends(UUID.randomUUID(),a),a));
        assertThrows(IllegalStateException.class,()->join(started,UUID.randomUUID(),now.plusSeconds(2)));
        var solo=startNow(quick(UUID.randomUUID(),a,now),a);
        assertEquals(3,solo.seats().stream().filter(Seat::bot).count());
    }
}
