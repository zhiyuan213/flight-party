package com.flightparty.redis;

import static org.junit.jupiter.api.Assertions.*;
import java.util.UUID;
import com.flightparty.room.RedisRoomStore;
import com.flightparty.room.RoomRules;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

/** Run only against a dedicated disposable Redis instance. */
@EnabledIfEnvironmentVariable(named = "REDIS_TEST_HOST", matches = ".+")
class CommandCommitterIntegrationTest {
    @Test void commitsOnceAndRejectsConflict() {
        var factory = new LettuceConnectionFactory(System.getenv("REDIS_TEST_HOST"), 6379);
        factory.afterPropertiesSet(); factory.start();
        try {
            var redis = new StringRedisTemplate(factory); redis.afterPropertiesSet();
            var rooms=new RedisRoomStore(redis);
            var room=RoomRules.quick(UUID.randomUUID(),UUID.randomUUID(),Instant.parse("2026-10-31T00:00:00Z"));
            var stored=rooms.save(room,-1);
            assertEquals(0,stored.version());
            assertEquals(room,rooms.load(room.id()).orElseThrow().room());
            assertThrows(IllegalStateException.class,()->rooms.save(room,-1));
            assertEquals(1,rooms.save(room,0).version());
            assertThrows(IllegalStateException.class,()->rooms.save(room,0));
            rooms.save(new RoomRules.Room(room.id(),RoomRules.Phase.SETTLED,room.seats(),room.deadline()),1);
            assertTrue(rooms.active(room.seats().getFirst().principal()).isEmpty());
            assertEquals(0,rooms.save(RoomRules.friends(UUID.randomUUID(),room.seats().getFirst().principal()),-1).version());
            var match = UUID.randomUUID(); var principal = UUID.randomUUID(); var command = UUID.randomUUID();
            var prefix = "fp:{s15}:";
            Long existing = redis.opsForStream().size(prefix + "events");
            redis.opsForHash().put(prefix + "match:" + match, "version", "0");
            var committer = new CommandCommitter(redis); String hash = "a".repeat(64);
            assertEquals("COMMITTED", committer.commit(15,match,principal,command,0,hash,"{}","ok","MOVE","{}",1000L).getFirst());
            assertEquals("REPLAY", committer.commit(15,match,principal,command,0,hash,"{}","ok","MOVE","{}",1000L).getFirst());
            assertEquals("COMMAND_CONFLICT", committer.commit(15,match,principal,command,0,"b".repeat(64),"{}","ok","MOVE","{}",1000L).getFirst());
            assertEquals((existing == null ? 0L : existing) + 1, redis.opsForStream().size(prefix + "events"));
            assertEquals("1", redis.opsForHash().get(prefix + "match:" + match,"version"));
        } finally { factory.destroy(); }
    }
}
