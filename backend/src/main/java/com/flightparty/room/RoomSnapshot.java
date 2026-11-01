package com.flightparty.room;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Public room view: internal principal identities never cross the API boundary. */
public record RoomSnapshot(UUID roomId, RoomRules.Phase phase, Instant matchingDeadline,
                           Instant serverNow, int yourSeat, List<Seat> seats, RoomRules.Origin origin) {
    public record Seat(int index, boolean ready, boolean bot, String displayName,boolean member,String avatarFrame,String flightTrail,String victoryEffect,String avatarUrl) {}
    public RoomSnapshot { seats=List.copyOf(seats); }
    public static RoomSnapshot forMember(RoomRules.Room room, UUID principal, Instant now) {
        return forMember(room,principal,now,java.util.Map.of());
    }
    public static RoomSnapshot forMember(RoomRules.Room room, UUID principal, Instant now, java.util.Map<Integer,String> names) {
        return forMember(room,principal,now,names,java.util.Map.of());
    }
    public static RoomSnapshot forMember(RoomRules.Room room,UUID principal,Instant now,java.util.Map<Integer,String> names,java.util.Map<Integer,com.flightparty.auth.AppearanceService.Appearance> appearances) {
        int own=room.seats().stream().filter(s->principal.equals(s.principal())).mapToInt(RoomRules.Seat::index).findFirst()
                .orElseThrow(()->new IllegalStateException("not a room member"));
        return new RoomSnapshot(room.id(),room.phase(),room.deadline(),now,own,
                room.seats().stream().map(s->new Seat(s.index(),s.ready(),s.bot(),s.bot()?null:names.get(s.index()),!s.bot()&&appearances.containsKey(s.index())&&appearances.get(s.index()).member(),!s.bot()&&appearances.containsKey(s.index())?appearances.get(s.index()).frame():"none",!s.bot()&&appearances.containsKey(s.index())?appearances.get(s.index()).trail():"none",!s.bot()&&appearances.containsKey(s.index())?appearances.get(s.index()).victory():"none",!s.bot()&&appearances.containsKey(s.index())?appearances.get(s.index()).avatarUrl():null)).toList(),
                room.origin()==RoomRules.Origin.FRIENDS&&room.seats().stream().anyMatch(s->principal.equals(s.principal())&&s.invited())?RoomRules.Origin.FRIENDS:RoomRules.Origin.QUICK);
    }
}
