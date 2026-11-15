package com.flightparty.room;

import com.flightparty.online.CustodyPolicy;
import static org.junit.jupiter.api.Assertions.*;
import java.time.Instant;
import java.util.*;
import org.junit.jupiter.api.Test;

/** Flight-room half of the shared online custody contract. Each test builds a
    room from pure rules, so no Redis or Spring context is needed. */
class RoomRulesCustodyTest {
    private static final Instant NOW = Instant.parse("2026-11-14T09:00:00Z");
    private final UUID a = UUID.randomUUID(), b = UUID.randomUUID();

    private RoomRules.Room friends() {
        return new RoomRules.Room(UUID.randomUUID(), RoomRules.Phase.PLAYING,
                List.of(new RoomRules.Seat(0, a, true, false),
                        new RoomRules.Seat(1, b, true, false)),
                null, RoomRules.Origin.FRIENDS);
    }

    private RoomRules.Room computerMatch() {
        return new RoomRules.Room(UUID.randomUUID(), RoomRules.Phase.PLAYING,
                List.of(new RoomRules.Seat(0, a, true, false),
                        new RoomRules.Seat(1, null, true, true),
                        new RoomRules.Seat(2, null, true, true),
                        new RoomRules.Seat(3, null, true, true)),
                null, RoomRules.Origin.QUICK);
    }

    @Test void twoRealPlayersAreManagedButAComputerMatchIsNot() {
        assertTrue(RoomRules.managed(friends()));
        assertFalse(RoomRules.managed(computerMatch()));
    }

    @Test void leavingManagedPlayingRoomOpensA30SecondReconnectWindow() {
        var left = RoomRules.leave(friends(), a, NOW);
        assertEquals(RoomRules.Phase.PLAYING, left.phase());
        var seat = left.seats().getFirst();
        assertEquals(CustodyPolicy.GRACE, seat.custody());
        assertEquals(NOW.toEpochMilli() + CustodyPolicy.GRACE_MS, seat.graceUntilMs());
        assertEquals(a, seat.principal(), "the hosted seat keeps its real identity");
        assertFalse(seat.bot(), "it stays human so the active-room index can reconnect it");
        assertEquals(CustodyPolicy.GRACE, seat.resolved(NOW.toEpochMilli() + 29_999));
        assertEquals(CustodyPolicy.HOSTED, seat.resolved(NOW.toEpochMilli() + 30_000));
        assertFalse(CustodyPolicy.recordsScore(seat.resolved(NOW.toEpochMilli() + 30_000)));
    }

    @Test void reconnectAtAnyTimeHandsTheExactSeatBack() {
        var left = RoomRules.leave(friends(), a, NOW);
        var hosted = RoomRules.expireCustody(left, NOW.toEpochMilli() + 31_000);
        assertEquals(CustodyPolicy.HOSTED, hosted.seats().getFirst().custody());
        var back = RoomRules.resumeCustody(hosted, a, NOW);
        assertEquals(CustodyPolicy.ACTIVE, back.seats().getFirst().custody());
        assertEquals(a, back.seats().getFirst().principal());
        assertEquals(0L, back.seats().getFirst().graceUntilMs());
        assertEquals(b, back.seats().get(1).principal(), "the other player is untouched");
        assertEquals(CustodyPolicy.ACTIVE, back.seats().get(1).custody());
        assertSame(back, RoomRules.resumeCustody(back, a, NOW), "reconnecting an active seat is read-only");
    }

    @Test void bothPlayersCanLeaveAndTheMatchRunsUnderDoubleCustody() {
        var first = RoomRules.leave(friends(), a, NOW);
        var second = RoomRules.leave(first, b, NOW);
        assertEquals(CustodyPolicy.GRACE, second.seats().get(0).custody());
        assertEquals(CustodyPolicy.GRACE, second.seats().get(1).custody());
        var expired = RoomRules.expireCustody(second, NOW.toEpochMilli() + 31_000);
        assertTrue(expired.seats().stream().allMatch(s -> s.botControlled(NOW.toEpochMilli() + 31_000)));
        assertTrue(expired.seats().stream().noneMatch(RoomRules.Seat::bot), "both are still reconnectable human seats");
        assertEquals(Set.of(0, 1), RoomRules.noScoreSeats(expired, NOW.toEpochMilli() + 31_000),
                "neither hosted seat may be written to the match ledger");
        assertEquals(RoomRules.Phase.PLAYING, expired.phase(), "the match is not abandoned");
    }

    @Test void anOnlineIdlePilotIsHostedWithoutASecondCountdownAndCanResume() {
        var room=friends();
        var hosted=RoomRules.hostIdle(room,0,NOW.toEpochMilli()+30_001L);
        assertEquals(CustodyPolicy.HOSTED,hosted.seats().getFirst().custody());
        assertEquals(0L,hosted.seats().getFirst().graceUntilMs(),"no grace window, no visible countdown");
        assertEquals(a,hosted.seats().getFirst().principal());
        assertFalse(hosted.seats().getFirst().bot(),"the real identity stays reconnectable");
        assertEquals(CustodyPolicy.ACTIVE,hosted.seats().get(1).custody(),"the other pilot is untouched");
        assertSame(hosted,RoomRules.hostIdle(hosted,0,NOW.toEpochMilli()+31_000L),"already hosted is read-only");
        assertSame(room,RoomRules.hostIdle(room,99,NOW.toEpochMilli()),"an unknown seat is harmless");
        var back=RoomRules.resumeCustody(hosted,a,NOW);
        assertEquals(CustodyPolicy.ACTIVE,back.seats().getFirst().custody(),
                "reconnecting or moving the mouse cancels hosted at once");
    }

    @Test void computerMatchesAndNativeBotSeatsAreNeverIdleHosted() {
        var match=computerMatch();
        assertSame(match,RoomRules.hostIdle(match,0,NOW.toEpochMilli()+30_001L));
        assertSame(match,RoomRules.hostIdle(match,1,NOW.toEpochMilli()+30_001L));
        assertEquals(30_000L,CustodyPolicy.IDLE_MS,"flight uses the same 30s turn clock as the table games");
    }

    @Test void aComputerMatchClosesImmediatelyOnLeave() {
        var left = RoomRules.leave(computerMatch(), a, NOW);
        assertEquals(RoomRules.Phase.CLOSED, left.phase(),
                "no grace, no custody, no reconnect for a game against computers");
    }

    @Test void aStalePresenceEventForARemovedSeatIsHarmless() {
        var before = friends();
        assertSame(before, RoomRules.beginCustody(before, UUID.randomUUID(), NOW));
        assertSame(before, RoomRules.resumeCustody(before, UUID.randomUUID(), NOW));
    }

    @Test void oldRedisSnapshotsWithoutCustodyFieldsReadBackAsActive() throws Exception {
        var json = tools.jackson.databind.json.JsonMapper.builder().build();
        String old = """
          {"id":"%s","phase":"PLAYING","seats":[
            {"index":0,"principal":"%s","ready":true,"bot":false},
            {"index":1,"principal":"%s","ready":true,"bot":false}],"deadline":null}
          """.formatted(UUID.randomUUID(), a, b);
        var restored = json.readValue(old, RoomRules.Room.class);
        assertEquals(CustodyPolicy.ACTIVE, restored.seats().getFirst().custody());
        assertEquals(0L, restored.seats().getFirst().graceUntilMs());
        assertTrue(RoomRules.managed(restored));
        assertEquals(Set.of(), RoomRules.noScoreSeats(restored, NOW.toEpochMilli()));
    }
}
