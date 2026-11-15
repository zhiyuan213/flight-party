package com.flightparty.room;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Public room view: internal principal identities never cross the API boundary.
    `custody` / `graceUntil` are the browser-visible 30s reconnect state. */
public record RoomSnapshot(UUID roomId, RoomRules.Phase phase, Instant matchingDeadline,
                           Instant serverNow, int yourSeat, List<Seat> seats, RoomRules.Origin origin,
                           boolean managed) {
    public record Seat(int index, boolean ready, boolean bot, String displayName,boolean member,
                       String avatarFrame,String flightTrail,String victoryEffect,String avatarUrl,
                       String planeStyle,boolean annualMember,String custody,long graceUntil) {}
    public RoomSnapshot { seats=List.copyOf(seats); }
    public static RoomSnapshot forMember(RoomRules.Room room, UUID principal, Instant now) {
        return forMember(room,principal,now,java.util.Map.of());
    }
    public static RoomSnapshot forMember(RoomRules.Room room, UUID principal, Instant now, java.util.Map<Integer,String> names) {
        return forMember(room,principal,now,names,java.util.Map.of());
    }
    /** Convenience overload used by tests and callers that only care about the
        seat list; a single-seat room is not a managed online match. */
    public static RoomSnapshot forMember(RoomRules.Room room, UUID principal, Instant now,
                                         java.util.Map<Integer,String> names,
                                         java.util.Map<Integer,com.flightparty.auth.AppearanceService.Appearance> appearances) {
        int own=room.seats().stream().filter(s->principal.equals(s.principal())).mapToInt(RoomRules.Seat::index).findFirst()
                .orElseThrow(()->new IllegalStateException("not a room member"));
        long stamp=now.toEpochMilli();
        var seats=room.seats().stream().map(s->{
            var a=appearances.containsKey(s.index())?appearances.get(s.index()):null;
            boolean member=!s.bot()&&a!=null&&a.member();
            boolean annual=member&&a.annualMember();
            return new Seat(s.index(),s.ready(),s.bot(),s.bot()?null:names.get(s.index()),
                member,!s.bot()&&a!=null?a.frame():"none",!s.bot()&&a!=null?a.trail():"none",
                !s.bot()&&a!=null?a.victory():"none",!s.bot()&&a!=null?a.avatarUrl():null,
                !s.bot()&&a!=null?com.flightparty.auth.AppearanceService.displayPlane(a.member(),a.annualMember(),a.plane()):"classic",
                annual,s.resolved(stamp),s.graceUntilMs());
        }).toList();
        var origin=room.origin()==RoomRules.Origin.FRIENDS&&room.seats().stream().anyMatch(s->principal.equals(s.principal())&&s.invited())
                ?RoomRules.Origin.FRIENDS:RoomRules.Origin.QUICK;
        return new RoomSnapshot(room.id(),room.phase(),room.deadline(),now,own,seats,origin,RoomRules.managed(room));
    }
}
