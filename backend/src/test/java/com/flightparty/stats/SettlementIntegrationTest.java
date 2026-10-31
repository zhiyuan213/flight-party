package com.flightparty.stats;

import static org.junit.jupiter.api.Assertions.*;
import java.util.UUID;
import com.flightparty.sync.EventProjection;
import com.flightparty.room.MatchStartService;
import com.flightparty.room.RoomRules;
import java.time.Instant;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;

@EnabledIfEnvironmentVariable(named = "SETTLEMENT_TEST_URL", matches = ".+")
class SettlementIntegrationTest {
    @Test void settlementIsIdempotentAndUsesFrozenAccount() {
        String schema = "test_" + UUID.randomUUID().toString().replace("-", "");
        String url = System.getenv("SETTLEMENT_TEST_URL");
        String user = System.getenv("SETTLEMENT_TEST_USER"), password = System.getenv("SETTLEMENT_TEST_PASSWORD");
        var flyway = Flyway.configure().dataSource(url, user, password).schemas(schema).cleanDisabled(false).load();
        flyway.migrate();
        try {
            var ds = new DriverManagerDataSource(url + "?currentSchema=" + schema, user, password);
            var db = JdbcClient.create(ds); var tx = new TransactionTemplate(new DataSourceTransactionManager(ds));
            var auth=new com.flightparty.auth.AccountService(db);
            var registered=tx.execute(s->auth.register("  Pilot@Example.test ","test-only-password-123","Test pilot"));
            assertFalse(registered.emailVerified());
            assertEquals(registered.id(),auth.login("pilot@example.test","test-only-password-123").id());
            assertThrows(IllegalArgumentException.class,()->auth.login("pilot@example.test","incorrect-password"));
            assertThrows(IllegalArgumentException.class,()->auth.login("missing@example.test","incorrect-password"));
            String storedHash=db.sql("select password_hash from accounts where id=:id").param("id",registered.id()).query(String.class).single();
            assertNotEquals("test-only-password-123",storedHash);
            assertThrows(org.springframework.dao.DuplicateKeyException.class,()->tx.execute(s->auth.register("PILOT@example.test","another-test-password","Duplicate")));
            UUID account = UUID.randomUUID(), principal = UUID.randomUUID(), match = UUID.randomUUID();
            db.sql("insert into accounts(id,display_name) values (:id,'Pilot')").param("id", account).update();
            db.sql("insert into principals(id,account_id) values (:id,:account)").param("id", principal).param("account", account).update();
            db.sql("insert into matches(id,room_id,status,rules_version,started_at) values (:id,:room,'COMPLETED_PENDING','1',now())").param("id", match).param("room", UUID.randomUUID()).update();
            var projection = new EventProjection(db);
            var event = new EventProjection.Event(match, 1, "MOVE", "{}", "{\"turn\":1}");
            assertTrue(Boolean.TRUE.equals(tx.execute(s -> projection.apply(event))));
            assertFalse(Boolean.TRUE.equals(tx.execute(s -> projection.apply(event))));
            assertThrows(IllegalStateException.class, () -> tx.execute(s -> projection.apply(new EventProjection.Event(match, 1, "ROLL", "{}", "{}"))));
            assertThrows(IllegalStateException.class, () -> tx.execute(s -> projection.apply(new EventProjection.Event(match, 3, "MOVE", "{}", "{}"))));
            assertEquals(1L, db.sql("select count(*) from match_events").query(Long.class).single());
            db.sql("insert into match_participants(match_id,seat_index,principal_id,account_id_at_start,rank) values (:match,0,:principal,:account,3)").param("match", match).param("principal", principal).param("account", account).update();
            db.sql("insert into match_participants(match_id,seat_index,native_bot,rank) values (:match,1,true,1)").param("match", match).update();
            db.sql("insert into match_participants(match_id,seat_index,native_bot,rank) values (:match,2,true,2)").param("match", match).update();
            var service = new SettlementService(db);
            assertTrue(Boolean.TRUE.equals(tx.execute(s -> service.settle(match))));
            assertFalse(Boolean.TRUE.equals(tx.execute(s -> service.settle(match))));
            assertEquals(1L, db.sql("select completed_games from account_statistics where account_id=:id").param("id", account).query(Long.class).single());
            assertEquals(-1L, db.sql("select points from account_statistics where account_id=:id").param("id", account).query(Long.class).single());
            assertEquals(1L, db.sql("select count(*) from statistics_outbox").query(Long.class).single());
            UUID other = UUID.randomUUID();
            db.sql("insert into accounts(id,display_name,email_normalized) values (:id,'Ace','private@example.test')").param("id",other).update();
            db.sql("insert into account_statistics(account_id,points,completed_games,stats_version) values (:id,-1,2,1)").param("id",other).update();
            var boards = new LeaderboardService(db);
            assertEquals("Ace", boards.top("points").getFirst().displayName());
            assertEquals("Ace", boards.top("games").getFirst().displayName());
            var starts=new MatchStartService(db);
            UUID guest=UUID.randomUUID();
            db.sql("insert into principals(id) values (:id)").param("id",guest).update();
            var initial=RoomRules.quick(UUID.randomUUID(),guest,Instant.now().minusSeconds(31));
            var ready=RoomRules.expire(initial,Instant.now());
            UUID start=tx.execute(s->starts.prepare(ready));
            assertEquals(start,tx.execute(s->starts.prepare(ready)));
            assertEquals(0L,db.sql("select count(*) from daily_usage where principal_id=:id").param("id",guest).query(Long.class).single());
            assertEquals(4L,db.sql("select count(*) from match_participants where match_id=:id").param("id",start).query(Long.class).single());
            var simulated=com.flightparty.game.GameRules.start(java.util.List.of(0,1,2,3));
            var random=new java.util.Random(10);
            while(simulated.phase()!=com.flightparty.game.GameRules.Phase.OVER) {
                simulated=com.flightparty.game.GameRules.roll(simulated,random.nextInt(6)+1);
                simulated=com.flightparty.game.GameRules.advance(com.flightparty.game.GameRules.move(simulated,com.flightparty.game.GameRules.botChoice(simulated)).state());
            }
            String finalJson=tools.jackson.databind.json.JsonMapper.builder().build().writeValueAsString(simulated);
            tx.execute(s->projection.apply(new EventProjection.Event(start,1,"TURN_CHANGED","{}",finalJson)));
            var completion=new MatchCompletionService(db,service);
            assertTrue(Boolean.TRUE.equals(tx.execute(s->completion.complete(start))));
            assertFalse(Boolean.TRUE.equals(tx.execute(s->completion.complete(start))));
            assertEquals("SETTLED",db.sql("select status from matches where id=:id").param("id",start).query(String.class).single());
            db.sql("insert into daily_usage(principal_id,usage_day,starts) values (:id,current_date,20)").param("id",guest).update();
            var blocked=RoomRules.expire(RoomRules.quick(UUID.randomUUID(),guest,Instant.now().minusSeconds(31)),Instant.now());
            assertEquals(blocked.id(),tx.execute(s->starts.prepare(blocked)));
            db.sql("insert into account_daily_usage(account_id,usage_day,starts) values (:id,current_date,20)").param("id",registered.id()).update();
            UUID otherIdentity=UUID.randomUUID();
            db.sql("insert into principals(id,account_id) values (:id,:account)").param("id",otherIdentity).param("account",registered.id()).update();
            var accountBlocked=RoomRules.expire(RoomRules.quick(UUID.randomUUID(),otherIdentity,Instant.now().minusSeconds(31)),Instant.now());
            assertEquals(accountBlocked.id(),tx.execute(s->starts.prepare(accountBlocked)));
            assertEquals(registered.id(),db.sql("select account_id_at_start from match_participants where match_id=:id and seat_index=0").param("id",accountBlocked.id()).query(UUID.class).single());
            if(System.getenv("REDIS_TEST_HOST")!=null){
                var factory=new org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory(System.getenv("REDIS_TEST_HOST"),6379);
                factory.afterPropertiesSet();factory.start();
                try{
                    var redis=new org.springframework.data.redis.core.StringRedisTemplate(factory);redis.afterPropertiesSet();
                    var publisher=new StatisticsCachePublisher(db,redis);publisher.poll();
                    assertEquals("-1",redis.opsForHash().get("fp:stats:"+account,"points"));
                    assertEquals(0L,db.sql("select count(*) from statistics_outbox where published_at is null").query(Long.class).single());
                    assertFalse(publisher.publishValue(account,0,999,999));
                    assertEquals("-1",redis.opsForHash().get("fp:stats:"+account,"points"));
                    publisher.poll();assertEquals("1",redis.opsForHash().get("fp:stats:"+account,"completedGames"));
                }finally{factory.destroy();}
            }
            assertEquals(-1, boards.top("points").getFirst().points());
            assertThrows(IllegalArgumentException.class, () -> boards.top("wins"));
            for (int i = 0; i < 10; i++) {
                UUID id = UUID.randomUUID();
                db.sql("insert into accounts(id,display_name) values (:id,:name)").param("id",id).param("name","Pilot"+i).update();
                db.sql("insert into account_statistics(account_id,points,completed_games,stats_version) values (:id,:points,1,1)")
                        .param("id",id).param("points",i).update();
            }
            assertEquals(10, boards.top("points").size());
            assertEquals(10, boards.top("games").size());
            assertEquals("Pilot9", boards.top("points").getFirst().displayName());
            assertEquals("Ace", boards.top("games").getFirst().displayName());
            for(int attempt=0;attempt<2;attempt++){
                if(attempt==1)db.sql("insert into membership_entitlements(account_id,subscription_id,provider,status,valid_until) values (:id,'isolated-test-subscription','creem','ACTIVE',now()+interval '30 days')").param("id",account).update();
                UUID extra=UUID.randomUUID();
                db.sql("insert into matches(id,room_id,status,rules_version,started_at) values (:id,:room,'COMPLETED_PENDING','1',now())").param("id",extra).param("room",UUID.randomUUID()).update();
                db.sql("insert into match_participants(match_id,seat_index,principal_id,account_id_at_start,rank) values (:match,0,:principal,:account,2)").param("match",extra).param("principal",principal).param("account",account).update();
                db.sql("insert into match_participants(match_id,seat_index,native_bot,rank) values (:match,1,true,1)").param("match",extra).update();
                assertTrue(Boolean.TRUE.equals(tx.execute(s->service.settle(extra))));
                assertFalse(Boolean.TRUE.equals(tx.execute(s->service.settle(extra))));
                assertEquals(attempt==1,db.sql("select recorded from score_recording_decisions where match_id=:id").param("id",extra).query(Boolean.class).single());
                assertEquals(attempt==0?1L:2L,db.sql("select completed_games from account_statistics where account_id=:id").param("id",account).query(Long.class).single());
                assertEquals(attempt==0?-1L:0L,db.sql("select points from account_statistics where account_id=:id").param("id",account).query(Long.class).single());
            }
        } finally { flyway.clean(); }
    }
}
