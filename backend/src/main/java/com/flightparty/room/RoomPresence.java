package com.flightparty.room;

import java.time.*;
import java.util.UUID;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/** Browser connections, not account logins. Only unstarted seats may expire. */
@Service
public class RoomPresence {
    public static final long GRACE_MS=15000;
    private final StringRedisTemplate redis;
    private final RedisRoomStore rooms;
    public RoomPresence(StringRedisTemplate redis,RedisRoomStore rooms){this.redis=redis;this.rooms=rooms;}
    public static String deadlines(UUID room){return "fp:{rooms}:presence-deadlines:"+room;}
    public static String connections(UUID room){return "fp:{rooms}:presence-connections:"+room;}
    public void watch(RoomRules.Room room,Instant now){
        if(room.phase()!=RoomRules.Phase.WAITING_FRIENDS&&room.phase()!=RoomRules.Phase.MATCHING)return;
        for(var seat:room.seats())if(!seat.bot())redis.opsForHash().putIfAbsent(deadlines(room.id()),seat.principal().toString(),Long.toString(now.toEpochMilli()+GRACE_MS));
        redis.expire(deadlines(room.id()),Duration.ofDays(1));
        redis.opsForZSet().add("fp:{rooms}:presence-check",room.id().toString(),now.toEpochMilli());
    }
    public void heartbeat(UUID room,UUID principal,String connection,Instant now){
        long until=now.toEpochMilli()+GRACE_MS;
        redis.opsForZSet().add(connections(room),principal+":"+connection,until);
        redis.opsForHash().put(deadlines(room),principal.toString(),Long.toString(until));
        redis.expire(connections(room),Duration.ofDays(1));redis.expire(deadlines(room),Duration.ofDays(1));
    }
    public void disconnect(UUID room,UUID principal,String connection,Instant now){
        redis.opsForZSet().remove(connections(room),principal+":"+connection);
        redis.opsForHash().put(deadlines(room),principal.toString(),Long.toString(now.toEpochMilli()+GRACE_MS));
        redis.expire(deadlines(room),Duration.ofDays(1));
    }
    @Scheduled(fixedDelay=1000)
    public void poll(){prune(Instant.now());}
    public void prune(Instant now){
        var ids=redis.opsForZSet().range("fp:{rooms}:presence-check",0,99);if(ids==null)return;
        for(String value:ids){
            UUID id=UUID.fromString(value);
            try{
                var stored=rooms.load(id);
                if(stored.isEmpty()||!waiting(stored.get().room())){redis.opsForZSet().remove("fp:{rooms}:presence-check",value);continue;}
                redis.opsForZSet().removeRangeByScore(connections(id),0,now.toEpochMilli());
                var seats=stored.get().room().seats();
                for(var seat:seats)if(!seat.bot()){
                    Object deadline=redis.opsForHash().get(deadlines(id),seat.principal().toString());
                    if(deadline!=null&&Long.parseLong(deadline.toString())<=now.toEpochMilli()){
                        var latest=rooms.load(id).orElseThrow();
                        if(waiting(latest.room())&&latest.room().seats().stream().anyMatch(s->seat.principal().equals(s.principal())))
                            rooms.leaveDisconnected(latest,seat.principal(),now);
                    }
                }
                redis.opsForZSet().add("fp:{rooms}:presence-check",value,now.toEpochMilli());
            }catch(IllegalStateException conflict){/* Reconnect, start or membership changed; recheck next tick. */}
        }
    }
    private boolean waiting(RoomRules.Room room){return room.phase()==RoomRules.Phase.WAITING_FRIENDS||room.phase()==RoomRules.Phase.MATCHING;}
}
