package com.flightparty.room;

import com.flightparty.online.CustodyPolicy;
import java.time.*;
import java.util.UUID;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/** Browser connections, not account logins. Only unstarted seats may be removed;
    a playing seat is never removed, it enters the 30s reconnect window instead. */
@Service
public class RoomPresence {
    public static final long GRACE_MS=15000;
    private final StringRedisTemplate redis;
    private final RedisRoomStore rooms;
    public RoomPresence(StringRedisTemplate redis,RedisRoomStore rooms){this.redis=redis;this.rooms=rooms;}
    public static String deadlines(UUID room){return "fp:{rooms}:presence-deadlines:"+room;}
    public static String connections(UUID room){return "fp:{rooms}:presence-connections:"+room;}
    private static final String CHECK="fp:{rooms}:presence-check";
    public void watch(RoomRules.Room room,Instant now){
        if(room.phase()==RoomRules.Phase.PLAYING){
            /* Managed playing rooms stay in the scan so grace windows can expire
               into easy-bot custody even when nobody is polling the REST API. */
            if(RoomRules.managed(room)){
                for(var seat:room.seats())if(!seat.bot())
                    redis.opsForHash().putIfAbsent(deadlines(room.id()),seat.principal().toString(),Long.toString(now.toEpochMilli()+CustodyPolicy.GRACE_MS));
                redis.expire(deadlines(room.id()),Duration.ofDays(1));
                redis.opsForZSet().add(CHECK,room.id().toString(),now.toEpochMilli());
            }
            return;
        }
        if(room.phase()!=RoomRules.Phase.WAITING_FRIENDS&&room.phase()!=RoomRules.Phase.MATCHING)return;
        for(var seat:room.seats())if(!seat.bot())redis.opsForHash().putIfAbsent(deadlines(room.id()),seat.principal().toString(),Long.toString(now.toEpochMilli()+GRACE_MS));
        redis.expire(deadlines(room.id()),Duration.ofDays(1));
        redis.opsForZSet().add(CHECK,room.id().toString(),now.toEpochMilli());
    }
    /** Explicit presence: a REST read by the owner, a fresh WS SUBSCRIBE or
        an /activity signal. Re-selecting "在线对决" calls create()/quick()/
        snapshot(), which all hand the seat back here; plain WS pings do not. */
    public RoomRules.Room resume(RoomRules.Room room,UUID principal,Instant now){
        watch(room,now);
        if(room.phase()!=RoomRules.Phase.PLAYING||!RoomRules.managed(room))return room;
        var updated=rooms.mutate(room.id(),r->RoomRules.resumeCustody(r,principal,now));
        return updated==null?room:updated;
    }
    public void heartbeat(UUID room,UUID principal,String connection,Instant now){
        long until=now.toEpochMilli()+GRACE_MS;
        redis.opsForZSet().add(connections(room),principal+":"+connection,until);
        redis.opsForHash().put(deadlines(room),principal.toString(),Long.toString(until));
        redis.expire(connections(room),Duration.ofDays(1));redis.expire(deadlines(room),Duration.ofDays(1));
        /* A pong only keeps the connection lease alive; it is NOT a reconnect.
           Otherwise an online-but-idle player would cancel their own hosted
           seat every few seconds. Reclaiming goes through resume()/activity(). */
    }
    public void disconnect(UUID room,UUID principal,String connection,Instant now){
        redis.opsForZSet().remove(connections(room),principal+":"+connection);
        redis.opsForHash().put(deadlines(room),principal.toString(),Long.toString(now.toEpochMilli()+GRACE_MS));
        redis.expire(deadlines(room),Duration.ofDays(1));
        /* Another live window of the same player still owns the seat: do not
           start a countdown. Otherwise open the visible 30s grace window. */
        if(!hasLiveConnection(room,principal,now))
            rooms.mutate(room,r->RoomRules.beginCustody(r,principal,now));
    }
    private boolean hasLiveConnection(UUID room,UUID principal,Instant now){
        var live=redis.opsForZSet().rangeByScore(connections(room),now.toEpochMilli(),Double.POSITIVE_INFINITY);
        if(live==null)return false;
        String prefix=principal+":";
        for(String value:live)if(value.startsWith(prefix))return true;
        return false;
    }
    @Scheduled(fixedDelay=1000)
    public void poll(){prune(Instant.now());}
    public void prune(Instant now){
        var ids=redis.opsForZSet().range(CHECK,0,99);if(ids==null)return;
        long stamp=now.toEpochMilli();
        for(String value:ids){
            UUID id=UUID.fromString(value);
            try{
                var stored=rooms.load(id);
                if(stored.isEmpty()){redis.opsForZSet().remove(CHECK,value);continue;}
                var room=stored.get().room();
                if(room.phase()==RoomRules.Phase.PLAYING&&RoomRules.managed(room)){
                    /* 1. A finished 30s countdown becomes easy-bot custody. */
                    rooms.mutate(id,r->RoomRules.expireCustody(r,stamp));
                    /* 2. Fallback for a browser that vanished without a socket
                          close event: the presence lease expires, then the same
                          30s grace opens. Multiple windows stay protected. */
                    var latest=rooms.load(id);
                    if(latest.isPresent())for(var seat:latest.get().room().seats()){
                        if(seat.bot()||!CustodyPolicy.ACTIVE.equals(seat.custody()))continue;
                        Object deadline=redis.opsForHash().get(deadlines(id),seat.principal().toString());
                        if(deadline==null||Long.parseLong(deadline.toString())>stamp)continue;
                        if(hasLiveConnection(id,seat.principal(),now))continue;
                        rooms.mutate(id,r->RoomRules.beginCustody(r,seat.principal(),now));
                    }
                    redis.opsForZSet().add(CHECK,value,stamp);
                    continue;
                }
                if(!waiting(room)){redis.opsForZSet().remove(CHECK,value);continue;}
                redis.opsForZSet().removeRangeByScore(connections(id),0,stamp);
                var seats=room.seats();
                for(var seat:seats)if(!seat.bot()){
                    Object deadline=redis.opsForHash().get(deadlines(id),seat.principal().toString());
                    if(deadline!=null&&Long.parseLong(deadline.toString())<=stamp){
                        var latest=rooms.load(id).orElseThrow();
                        if(waiting(latest.room())&&latest.room().seats().stream().anyMatch(s->seat.principal().equals(s.principal())))
                            rooms.leaveDisconnected(latest,seat.principal(),now);
                    }
                }
                redis.opsForZSet().add(CHECK,value,stamp);
            }catch(IllegalStateException conflict){/* Reconnect, start or membership changed; recheck next tick. */}
        }
    }
    private boolean waiting(RoomRules.Room room){return room.phase()==RoomRules.Phase.WAITING_FRIENDS||room.phase()==RoomRules.Phase.MATCHING;}
}
