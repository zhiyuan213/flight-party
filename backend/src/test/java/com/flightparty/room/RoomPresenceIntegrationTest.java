package com.flightparty.room;

import static org.junit.jupiter.api.Assertions.*;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

@EnabledIfEnvironmentVariable(named="REDIS_TEST_HOST",matches=".+")
class RoomPresenceIntegrationTest {
    @Test void multipleWindowsReconnectAndAtomicExpiryDoNotStealLiveSeats(){
        var factory=new LettuceConnectionFactory(System.getenv("REDIS_TEST_HOST"),6379);factory.afterPropertiesSet();factory.start();
        try{
            var redis=new StringRedisTemplate(factory);redis.afterPropertiesSet();var rooms=new RedisRoomStore(redis);var presence=new RoomPresence(redis,rooms);
            UUID a=UUID.randomUUID(),b=UUID.randomUUID();Instant now=Instant.now();
            var room=RoomRules.join(RoomRules.friends(UUID.randomUUID(),a),b,now);rooms.save(room,-1);presence.watch(room,now);
            presence.heartbeat(room.id(),a,"a",now);presence.heartbeat(room.id(),b,"b1",now);presence.heartbeat(room.id(),b,"b2",now);
            presence.disconnect(room.id(),b,"b1",now.plusSeconds(1));
            presence.heartbeat(room.id(),a,"a",now.plusSeconds(18));presence.heartbeat(room.id(),b,"b2",now.plusSeconds(18));
            presence.prune(now.plusSeconds(20));assertEquals(2,rooms.load(room.id()).orElseThrow().room().seats().size());
            presence.disconnect(room.id(),b,"b2",now.plusSeconds(20));presence.heartbeat(room.id(),a,"a",now.plusSeconds(32));presence.prune(now.plusSeconds(34));assertTrue(rooms.active(b).isPresent());
            var stale=rooms.load(room.id()).orElseThrow();presence.heartbeat(room.id(),b,"reconnected",now.plusSeconds(34));
            assertThrows(IllegalStateException.class,()->rooms.leaveDisconnected(stale,b,now.plusSeconds(36)),"Atomic guard sees reconnect after an expiry scan");
            presence.disconnect(room.id(),b,"reconnected",now.plusSeconds(40));presence.heartbeat(room.id(),a,"a",now.plusSeconds(50));presence.prune(now.plusSeconds(56));
            assertTrue(rooms.active(b).isEmpty());assertEquals(1,rooms.load(room.id()).orElseThrow().room().seats().size());
        }finally{factory.destroy();}
    }
    @Test void noBrowserEverConnectsClosesTheWaitingRoomButPlayingGamesAreRetained(){
        var factory=new LettuceConnectionFactory(System.getenv("REDIS_TEST_HOST"),6379);factory.afterPropertiesSet();factory.start();
        try{
            var redis=new StringRedisTemplate(factory);redis.afterPropertiesSet();var rooms=new RedisRoomStore(redis);var presence=new RoomPresence(redis,rooms);Instant now=Instant.now();UUID a=UUID.randomUUID();
            var abandoned=RoomRules.friends(UUID.randomUUID(),a);rooms.save(abandoned,-1);presence.watch(abandoned,now);presence.prune(now.plusSeconds(16));
            assertEquals(RoomRules.Phase.CLOSED,rooms.load(abandoned.id()).orElseThrow().room().phase());assertTrue(rooms.active(a).isEmpty());
            var quick=RoomRules.quick(UUID.randomUUID(),a,now);var old=rooms.save(quick,-1);presence.watch(quick,now);
            var starting=rooms.save(RoomRules.startNow(quick,a),old.version());assertTrue(rooms.activate(starting));
            assertThrows(IllegalStateException.class,()->rooms.leaveDisconnected(old,a,now.plusSeconds(20)));
            presence.prune(now.plusSeconds(3600));assertEquals(RoomRules.Phase.PLAYING,rooms.load(quick.id()).orElseThrow().room().phase());assertEquals(quick.id(),rooms.active(a).orElseThrow());
        }finally{factory.destroy();}
    }
}
