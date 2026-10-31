package com.flightparty.room;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Public room view: internal principal identities never cross the API boundary. */
public record RoomSnapshot(UUID roomId, RoomRules.Phase phase, Instant matchingDeadline,
                           Instant serverNow, int yourSeat, List<Seat> seats) {
    public record Seat(int index, boolean ready, boolean bot) {}
    public RoomSnapshot { seats=List.copyOf(seats); }
    public static RoomSnapshot forMember(RoomRules.Room room, UUID principal, Instant now) {
        int own=room.seats().stream().filter(s->principal.equals(s.principal())).mapToInt(RoomRules.Seat::index).findFirst()
                .orElseThrow(()->new IllegalStateException("not a room member"));
        return new RoomSnapshot(room.id(),room.phase(),room.deadline(),now,own,
                room.seats().stream().map(s->new Seat(s.index(),s.ready(),s.bot())).toList());
    }
}
