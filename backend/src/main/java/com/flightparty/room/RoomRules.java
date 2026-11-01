package com.flightparty.room;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Pure waiting-room transitions. Persistence, eligibility and concurrency are external responsibilities. */
public final class RoomRules {
    private static final Duration MATCH_WAIT = Duration.ofSeconds(30);
    public enum Phase { WAITING_FRIENDS, MATCHING, STARTING, PLAYING, SETTLED, CLOSED }
    public record Seat(int index, UUID principal, boolean ready, boolean bot) {
        public Seat { if (index < 0 || index > 3 || (bot && principal != null) || (!bot && principal == null)) throw new IllegalArgumentException("invalid seat"); }
    }
    public record Room(UUID id, Phase phase, List<Seat> seats, Instant deadline) {
        public Room {
            seats = List.copyOf(seats);
            if (id == null || phase == null || seats.size() > 4 || seats.stream().map(Seat::index).distinct().count() != seats.size()
                    || seats.stream().filter(s -> !s.bot()).map(Seat::principal).distinct().count() != seats.stream().filter(s -> !s.bot()).count()
                    || (phase == Phase.MATCHING && deadline == null)) throw new IllegalArgumentException("invalid room");
        }
    }
    private RoomRules() {}
    public static Room friends(UUID roomId, UUID principal) {
        return new Room(roomId, Phase.WAITING_FRIENDS, List.of(new Seat(0,principal,false,false)), null);
    }
    public static Room quick(UUID roomId, UUID principal, Instant now) {
        return new Room(roomId, Phase.MATCHING, List.of(new Seat(0,principal,true,false)), now.plus(MATCH_WAIT));
    }
    public static Room join(Room room, UUID principal, Instant now) {
        if (room.phase() != Phase.WAITING_FRIENDS && room.phase() != Phase.MATCHING) throw new IllegalStateException("room unavailable");
        if (room.phase() == Phase.MATCHING && !now.isBefore(room.deadline())) throw new IllegalStateException("matching expired");
        if (room.seats().size() == 4 || room.seats().stream().anyMatch(s -> principal.equals(s.principal()))) throw new IllegalStateException("room full or already joined");
        var seats = new ArrayList<>(room.seats());
        int index = 0; while (containsIndex(seats,index)) index++;
        seats.add(new Seat(index, principal, room.phase() == Phase.MATCHING, false));
        return new Room(room.id(), seats.size() == 4 && room.phase() == Phase.MATCHING ? Phase.STARTING : room.phase(), seats, room.deadline());
    }
    public static Room ready(Room room, UUID principal, boolean ready, Instant now) {
        if (room.phase() != Phase.WAITING_FRIENDS) throw new IllegalStateException("not waiting for friends");
        var seats = new ArrayList<>(room.seats()); int index = memberIndex(seats,principal);
        var seat = seats.get(index); seats.set(index,new Seat(seat.index(),principal,ready,false));
        if (seats.stream().allMatch(Seat::ready)) return new Room(room.id(), seats.size() == 4 ? Phase.STARTING : Phase.MATCHING, seats, now.plus(MATCH_WAIT));
        return new Room(room.id(), room.phase(), seats, null);
    }
    public static Room leave(Room room, UUID principal, Instant now) {
        if (room.phase() != Phase.MATCHING && room.phase() != Phase.WAITING_FRIENDS) throw new IllegalStateException("room has started");
        var seats = new ArrayList<>(room.seats()); seats.remove(memberIndex(seats,principal));
        if (seats.isEmpty()) return new Room(room.id(), Phase.CLOSED, seats, room.deadline());
        if (room.phase() == Phase.WAITING_FRIENDS && seats.stream().allMatch(Seat::ready))
            return new Room(room.id(), Phase.MATCHING, seats, now.plus(MATCH_WAIT));
        return new Room(room.id(), room.phase(), seats, room.deadline());
    }
    public static Room expire(Room room, Instant now) {
        if (room.phase() != Phase.MATCHING || now.isBefore(room.deadline())) throw new IllegalStateException("not due");
        return fillBots(room);
    }
    public static Room startNow(Room room, UUID principal) {
        memberIndex(room.seats(),principal);
        if (room.phase()==Phase.STARTING || room.phase()==Phase.PLAYING) return room;
        if (room.phase()!=Phase.MATCHING) throw new IllegalStateException("not matching");
        return fillBots(room);
    }
    private static Room fillBots(Room room) {
        if (room.seats().isEmpty()) return new Room(room.id(), Phase.CLOSED, List.of(), room.deadline());
        var seats = new ArrayList<>(room.seats());
        for (int i = 0; i < 4; i++) if (!containsIndex(seats,i)) seats.add(new Seat(i,null,true,true));
        return new Room(room.id(), Phase.STARTING, seats, room.deadline());
    }
    private static boolean containsIndex(List<Seat> seats, int index) { return seats.stream().anyMatch(s -> s.index() == index); }
    private static int memberIndex(List<Seat> seats, UUID id) {
        for (int i=0;i<seats.size();i++) if (id.equals(seats.get(i).principal())) return i;
        throw new IllegalStateException("not a room member");
    }
}
