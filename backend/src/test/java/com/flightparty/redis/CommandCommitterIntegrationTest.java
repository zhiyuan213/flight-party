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
    @Test void legacyRoomWithoutInvitationFieldCanRestoreAndAdvance() {
        var factory=new LettuceConnectionFactory(System.getenv("REDIS_TEST_HOST"),6379);factory.afterPropertiesSet();factory.start();
        try {
            var redis=new StringRedisTemplate(factory);redis.afterPropertiesSet();var rooms=new RedisRoomStore(redis);
            UUID id=UUID.randomUUID(),principal=UUID.randomUUID();
            String legacy="{\"id\":\""+id+"\",\"phase\":\"MATCHING\",\"seats\":[{\"index\":0,\"principal\":\""+principal+"\",\"ready\":true,\"bot\":false}],\"deadline\":\"2026-10-31T00:00:00Z\"}";
            redis.opsForHash().putAll("fp:{rooms}:room:"+id,java.util.Map.of("version","0","snapshot",legacy));
            var stored=rooms.load(id).orElseThrow();assertFalse(stored.room().seats().getFirst().invited());
            var starting=rooms.save(RoomRules.expire(stored.room(),Instant.now()),stored.version());assertTrue(rooms.activate(starting));
            assertEquals(RoomRules.Phase.PLAYING,rooms.load(id).orElseThrow().room().phase());
            var service=new com.flightparty.room.RoomRollService(rooms,redis);redis.opsForHash().put("fp:{rooms}:room:"+id,"actionDeadline","0");service.automate(id);
            assertTrue(Long.parseLong(redis.opsForHash().get("fp:{rooms}:room:"+id,"gameVersion").toString())>0);
        }finally{factory.destroy();}
    }
    @Test void friendRematchIsAtomicAndRetainsOnlyInvitedHumans() throws Exception {
        var factory=new LettuceConnectionFactory(System.getenv("REDIS_TEST_HOST"),6379);factory.afterPropertiesSet();factory.start();
        try {
            var redis=new StringRedisTemplate(factory);redis.afterPropertiesSet();var rooms=new RedisRoomStore(redis);
            UUID a=UUID.randomUUID(),b=UUID.randomUUID(),random=UUID.randomUUID();var now=Instant.now();
            var friends=RoomRules.join(RoomRules.friends(UUID.randomUUID(),a),b,now);
            var matching=RoomRules.ready(RoomRules.ready(friends,a,true,now),b,true,now);
            var started=RoomRules.startNow(RoomRules.joinPublic(matching,random,now),a);
            var old=new RoomRules.Room(started.id(),RoomRules.Phase.SETTLED,started.seats(),started.deadline(),started.origin());rooms.save(old,-1);
            assertThrows(IllegalStateException.class,()->rooms.rematch(old,random));
            UUID next;
            try(var pool=java.util.concurrent.Executors.newFixedThreadPool(8)){
                var calls=new java.util.ArrayList<java.util.concurrent.Future<UUID>>();
                for(int i=0;i<16;i++){UUID caller=i%2==0?a:b;calls.add(pool.submit(()->rooms.rematch(old,caller).room().id()));}
                next=calls.getFirst().get();for(var call:calls)assertEquals(next,call.get());
            }
            var room=rooms.load(next).orElseThrow().room();assertEquals(2,room.seats().size());
            assertEquals(next,rooms.active(a).orElseThrow());assertEquals(next,rooms.active(b).orElseThrow());assertTrue(rooms.active(random).isEmpty());
            assertEquals(RoomRules.Phase.WAITING_FRIENDS,room.phase());assertNull(room.deadline());
            assertTrue(room.seats().stream().noneMatch(RoomRules.Seat::bot));
            // Never steal a friend who has already entered a separate room.
            UUID c=UUID.randomUUID();var blocked=RoomRules.friends(UUID.randomUUID(),c);
            var settled=new RoomRules.Room(blocked.id(),RoomRules.Phase.SETTLED,blocked.seats(),null,RoomRules.Origin.FRIENDS);rooms.save(settled,-1);
            var elsewhere=RoomRules.quick(UUID.randomUUID(),c,now);rooms.save(elsewhere,-1);
            assertThrows(IllegalStateException.class,()->rooms.rematch(settled,c));assertEquals(elsewhere.id(),rooms.active(c).orElseThrow());
        } finally {factory.destroy();}
    }
    @Test void soleHumanMoveWaitsForDieThenCommitsOnceWithoutWaitingForDeadline() {
        var factory=new LettuceConnectionFactory(System.getenv("REDIS_TEST_HOST"),6379);
        factory.afterPropertiesSet();factory.start();
        try {
            var redis=new StringRedisTemplate(factory);redis.afterPropertiesSet();
            var rooms=new RedisRoomStore(redis);var service=new com.flightparty.room.RoomRollService(rooms,redis);
            var person=UUID.randomUUID();
            var room=RoomRules.startNow(RoomRules.quick(UUID.randomUUID(),person,Instant.now()),person);
            var stored=rooms.save(room,-1);assertTrue(rooms.activate(stored));
            String key="fp:{rooms}:room:"+room.id();var json=tools.jackson.databind.json.JsonMapper.builder().build();
            var original=rooms.game(room.id());var players=new java.util.ArrayList<>(original.players());
            players.set(0,new com.flightparty.game.GameRules.Player(0,java.util.List.of(57,5),null));
            var choosing=new com.flightparty.game.GameRules.State(players,0,com.flightparty.game.GameRules.Phase.CHOOSE,4,java.util.List.of());
            redis.opsForHash().put(key,"game",json.writeValueAsString(choosing));
            redis.opsForHash().put(key,"actionDeadline",Long.toString(System.currentTimeMillis()+60000));
            redis.opsForHash().put(key,"busyUntil",Long.toString(System.currentTimeMillis()+60000));
            service.automate(room.id());assertEquals(choosing,rooms.game(room.id()),"Do not move during the die animation");
            redis.opsForHash().put(key,"busyUntil","0");
            service.automate(room.id());
            var moved=rooms.game(room.id());assertEquals(com.flightparty.game.GameRules.Phase.ANIMATING,moved.phase());
            assertEquals(java.util.List.of(57,9),moved.players().getFirst().planes());
            Object version=redis.opsForHash().get(key,"gameVersion");
            service.automate(room.id());assertEquals(version,redis.opsForHash().get(key,"gameVersion"));
            players.set(0,new com.flightparty.game.GameRules.Player(0,java.util.List.of(3,5),null));
            var twoMoves=new com.flightparty.game.GameRules.State(players,0,com.flightparty.game.GameRules.Phase.CHOOSE,4,java.util.List.of());
            redis.opsForHash().put(key,"game",json.writeValueAsString(twoMoves));redis.opsForHash().put(key,"busyUntil","0");
            redis.opsForHash().put(key,"actionDeadline",Long.toString(System.currentTimeMillis()+60000));
            service.automate(room.id());assertEquals(twoMoves,rooms.game(room.id()),"Keep human choice while both planes can move");
        }finally{factory.destroy();}
    }
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
