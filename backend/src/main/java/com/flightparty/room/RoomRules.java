package com.flightparty.room;

import com.flightparty.online.CustodyPolicy;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/** Pure waiting-room transitions. Persistence, eligibility and concurrency are external responsibilities. */
public final class RoomRules {
    private static final Duration MATCH_WAIT = Duration.ofSeconds(30);
    public enum Phase { WAITING_FRIENDS, MATCHING, STARTING, PLAYING, SETTLED, CLOSED }
    public enum Origin { QUICK, FRIENDS }
    /* ONLINE CUSTODY: a hosted seat keeps bot=false and its original principal,
       so the room's `active` index and the match ledger keep pointing at the
       real player who can still reclaim the exact same seat. Old Redis
       snapshots without custody/graceUntilMs read back as active (or bot). */
    /* Long (not long): Redis snapshots written before custody existed have no
       graceUntilMs field, and Jackson 3 refuses to map null into a primitive. */
    public record Seat(int index, UUID principal, boolean ready, boolean bot, Boolean invited, String custody, Long graceUntilMs) {
        public Seat(int index,UUID principal,boolean ready,boolean bot) { this(index,principal,ready,bot,false,null,0L); }
        public Seat(int index,UUID principal,boolean ready,boolean bot,Boolean invited) { this(index,principal,ready,bot,invited,null,0L); }
        public Seat {
            if(invited==null)invited=false;
            custody=CustodyPolicy.normalize(custody,bot);
            if(graceUntilMs==null||graceUntilMs<0)graceUntilMs=0L;
            if (index < 0 || index > 3 || (bot && principal != null) || (!bot && principal == null)) throw new IllegalArgumentException("invalid seat");
        }
        public String resolved(long now){return CustodyPolicy.resolve(custody,graceUntilMs,now,bot);}
        public boolean absent(long now){String s=resolved(now);return CustodyPolicy.GRACE.equals(s)||CustodyPolicy.HOSTED.equals(s);}
        public boolean botControlled(long now){return CustodyPolicy.botControlled(resolved(now));}
        public Seat withCustody(String state,long until){return new Seat(index,principal,ready,bot,invited,state,until);}
    }
    public record Room(UUID id, Phase phase, List<Seat> seats, Instant deadline, Origin origin) {
        public Room(UUID id,Phase phase,List<Seat> seats,Instant deadline) { this(id,phase,seats,deadline,phase==Phase.WAITING_FRIENDS?Origin.FRIENDS:Origin.QUICK); }
        public Room {
            if(origin==null)origin=phase==Phase.WAITING_FRIENDS?Origin.FRIENDS:Origin.QUICK;
            seats = List.copyOf(seats);
            if (id == null || phase == null || seats.size() > 4 || seats.stream().map(Seat::index).distinct().count() != seats.size()
                    || seats.stream().filter(s -> !s.bot()).map(Seat::principal).distinct().count() != seats.stream().filter(s -> !s.bot()).count()
                    || (phase == Phase.MATCHING && deadline == null)) throw new IllegalArgumentException("invalid room");
        }
    }
    private RoomRules() {}
    public static Room friends(UUID roomId, UUID principal) {
        return new Room(roomId, Phase.WAITING_FRIENDS, List.of(new Seat(0,principal,false,false,true)), null,Origin.FRIENDS);
    }
    public static Room quick(UUID roomId, UUID principal, Instant now) {
        return new Room(roomId, Phase.MATCHING, List.of(new Seat(0,principal,true,false)), now.plus(MATCH_WAIT));
    }
    public static Room join(Room room, UUID principal, Instant now) {
        return join(room,principal,now,room.origin()==Origin.FRIENDS);
    }
    public static Room joinPublic(Room room, UUID principal, Instant now) {
        return join(room,principal,now,false);
    }
    private static Room join(Room room, UUID principal, Instant now,boolean invited) {
        if (room.phase() != Phase.WAITING_FRIENDS && room.phase() != Phase.MATCHING) throw new IllegalStateException("room unavailable");
        if (room.phase() == Phase.MATCHING && !now.isBefore(room.deadline())) throw new IllegalStateException("matching expired");
        if (room.seats().size() == 4 || room.seats().stream().anyMatch(s -> principal.equals(s.principal()))) throw new IllegalStateException("room full or already joined");
        var seats = new ArrayList<>(room.seats());
        int index = 0; while (containsIndex(seats,index)) index++;
        seats.add(new Seat(index, principal, room.phase() == Phase.MATCHING, false,invited));
        return new Room(room.id(), seats.size() == 4 && room.phase() == Phase.MATCHING ? Phase.STARTING : room.phase(), seats, room.deadline(),room.origin());
    }
    public static Room ready(Room room, UUID principal, boolean ready, Instant now) {
        if (room.phase() != Phase.WAITING_FRIENDS) throw new IllegalStateException("not waiting for friends");
        var seats = new ArrayList<>(room.seats()); int index = memberIndex(seats,principal);
        var seat = seats.get(index); seats.set(index,new Seat(seat.index(),principal,ready,false,seat.invited()));
        if (seats.stream().allMatch(Seat::ready)) return new Room(room.id(), seats.size() == 4 ? Phase.STARTING : Phase.MATCHING, seats, now.plus(MATCH_WAIT),room.origin());
        return new Room(room.id(), room.phase(), seats, null,room.origin());
    }
    /** At least two real human identities: only such a room is managed. A
        quick match against server bots is a computer match and is exempt. */
    public static boolean managed(Room room) {
        if (room.phase()!=Phase.PLAYING && room.phase()!=Phase.STARTING) return false;
        return CustodyPolicy.managed((int)room.seats().stream().filter(s->!s.bot()&&s.principal()!=null).count());
    }
    /** Open a visible 30s reconnect window for one real player. The seat, its
        identity and its outfit are untouched, so a later resume is exact. */
    public static Room beginCustody(Room room,UUID principal,Instant now) {
        if (room.phase()!=Phase.PLAYING) return room;
        if (!managed(room)) return new Room(room.id(),Phase.CLOSED,room.seats(),room.deadline(),room.origin());
        long deadline=CustodyPolicy.graceDeadline(now.toEpochMilli());
        var seats=new ArrayList<>(room.seats());int index;
        /* A stale socket/leave event for a seat that is no longer in the room
           must not abort the presence scan or the REST call. */
        try{index=memberIndex(seats,principal);}catch(IllegalStateException missing){return room;}
        Seat seat=seats.get(index);
        if(CustodyPolicy.GRACE.equals(seat.custody())||CustodyPolicy.HOSTED.equals(seat.custody()))return room;
        seats.set(index,seat.withCustody(CustodyPolicy.GRACE,deadline));
        return new Room(room.id(),room.phase(),seats,room.deadline(),room.origin());
    }
    /** Expire every finished countdown into easy-bot custody. All four seats
        may be hosted; the match then runs to completion. */
    public static Room expireCustody(Room room,long now) {
        if (room.phase()!=Phase.PLAYING) return room;
        var seats=new ArrayList<>(room.seats());boolean changed=false;
        for(int i=0;i<seats.size();i++){
            Seat s=seats.get(i);
            if(CustodyPolicy.GRACE.equals(s.custody())&&s.graceUntilMs()<=now){seats.set(i,s.withCustody(CustodyPolicy.HOSTED,0));changed=true;}
        }
        return changed?new Room(room.id(),room.phase(),seats,room.deadline(),room.origin()):room;
    }
    /** An ONLINE but idle real player whose turn clock expired is hosted at
        once — no second reconnect countdown. Native bots and already absent
        seats are untouched; the seat keeps its identity so it can be resumed. */
    public static Room hostIdle(Room room,int seatIndex,long now) {
        if (room.phase()!=Phase.PLAYING || !managed(room)) return room;
        var seats=new ArrayList<>(room.seats());int index=-1;
        for(int i=0;i<seats.size();i++)if(seats.get(i).index()==seatIndex){index=i;break;}
        if(index<0)return room;
        Seat s=seats.get(index);
        if(!CustodyPolicy.ACTIVE.equals(s.resolved(now)))return room;
        seats.set(index,s.withCustody(CustodyPolicy.HOSTED,0));
        return new Room(room.id(),room.phase(),seats,room.deadline(),room.origin());
    }
    /** Reconnect: hand the seat back to its owner, active and unhosted. */
    public static Room resumeCustody(Room room,UUID principal,Instant now) {
        if (room.phase()!=Phase.PLAYING) return room;
        var seats=new ArrayList<>(room.seats());int index;
        try{index=memberIndex(seats,principal);}catch(IllegalStateException missing){return room;}
        Seat s=seats.get(index);
        String stored=s.custody();
        if(!CustodyPolicy.GRACE.equals(stored)&&!CustodyPolicy.HOSTED.equals(stored))return room;
        seats.set(index,s.withCustody(CustodyPolicy.ACTIVE,0));
        return new Room(room.id(),room.phase(),seats,room.deadline(),room.origin());
    }
    /** Seats that finished hosted: no results, no statistics, no points. */
    public static Set<Integer> noScoreSeats(Room room,long now) {
        return room.seats().stream().filter(s->!CustodyPolicy.recordsScore(s.resolved(now)))
                .map(Seat::index).collect(Collectors.toSet());
    }
    public static Room leave(Room room, UUID principal, Instant now) {
        if (room.phase()==Phase.PLAYING) return beginCustody(room,principal,now);
        if (room.phase() != Phase.MATCHING && room.phase() != Phase.WAITING_FRIENDS) throw new IllegalStateException("room has started");
        var seats = new ArrayList<>(room.seats()); seats.remove(memberIndex(seats,principal));
        if (seats.isEmpty()) return new Room(room.id(), Phase.CLOSED, seats, room.deadline(),room.origin());
        if (room.phase() == Phase.WAITING_FRIENDS && seats.stream().allMatch(Seat::ready))
            return new Room(room.id(), Phase.MATCHING, seats, now.plus(MATCH_WAIT),room.origin());
        return new Room(room.id(), room.phase(), seats, room.deadline(),room.origin());
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
        if (room.seats().isEmpty()) return new Room(room.id(), Phase.CLOSED, List.of(), room.deadline(),room.origin());
        var seats = new ArrayList<>(room.seats());
        for (int i = 0; i < 4; i++) if (!containsIndex(seats,i)) seats.add(new Seat(i,null,true,true));
        return new Room(room.id(), Phase.STARTING, seats, room.deadline(),room.origin());
    }
    public static Room rematch(Room old,UUID id) {
        if(old.phase()!=Phase.SETTLED || old.origin()!=Origin.FRIENDS)throw new IllegalStateException("not a finished friend room");
        var humans=old.seats().stream().filter(s->!s.bot()&&s.invited()).map(s->new Seat(s.index(),s.principal(),false,false,true)).toList();
        if(humans.isEmpty())throw new IllegalStateException("no friends");
        return new Room(id,Phase.WAITING_FRIENDS,humans,null,Origin.FRIENDS);
    }
    private static boolean containsIndex(List<Seat> seats, int index) { return seats.stream().anyMatch(s -> s.index() == index); }
    private static int memberIndex(List<Seat> seats, UUID id) {
        for (int i=0;i<seats.size();i++) if (id.equals(seats.get(i).principal())) return i;
        throw new IllegalStateException("not a room member");
    }
}
