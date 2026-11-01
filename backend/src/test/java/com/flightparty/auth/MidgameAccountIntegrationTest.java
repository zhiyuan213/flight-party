package com.flightparty.auth;

import static org.junit.jupiter.api.Assertions.*;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.*;
import org.springframework.transaction.support.TransactionTemplate;

@EnabledIfEnvironmentVariable(named="SETTLEMENT_TEST_URL",matches=".+")
class MidgameAccountIntegrationTest {
    @Test void liveGuestOwnershipIsImmutableAndDailyRecordingIsSharedAcrossWindows() throws Exception {
        String schema="test_"+UUID.randomUUID().toString().replace("-","");
        String url=System.getenv("SETTLEMENT_TEST_URL"),user=System.getenv("SETTLEMENT_TEST_USER"),password=System.getenv("SETTLEMENT_TEST_PASSWORD");
        var flyway=Flyway.configure().dataSource(url,user,password).schemas(schema).cleanDisabled(false).load();flyway.migrate();
        try{
            var ds=new DriverManagerDataSource(url+"?currentSchema="+schema,user,password);
            var db=JdbcClient.create(ds);var tx=new TransactionTemplate(new DataSourceTransactionManager(ds));
            UUID account=UUID.randomUUID(),other=UUID.randomUUID(),principal=UUID.randomUUID();
            for(UUID id:java.util.List.of(account,other))db.sql("insert into accounts(id,display_name) values (:id,'Pilot')").param("id",id).update();
            db.sql("insert into principals(id) values (:id)").param("id",principal).update();
            var service=new MidgameAccountService(db);
            UUID first=match(db,principal,account,true),second=match(db,principal,null,true);
            assertTrue(Boolean.TRUE.equals(tx.execute(s->service.bind(second,principal,account))));
            assertFalse(Boolean.TRUE.equals(tx.execute(s->service.bind(second,principal,account))));
            assertFalse(Boolean.TRUE.equals(tx.execute(s->service.bind(second,principal,other))));
            assertNull(db.sql("select account_id_at_start from match_participants where match_id=:id and seat_index=0").param("id",second).query((rs,n)->new UUID[]{rs.getObject(1,UUID.class)}).single()[0]);
            var settlement=new com.flightparty.stats.SettlementService(db);
            for(UUID id:java.util.List.of(first,second))db.sql("update matches set status='COMPLETED_PENDING' where id=:id").param("id",id).update();
            try(var pool=java.util.concurrent.Executors.newFixedThreadPool(2)){
                var a=pool.submit(()->tx.execute(s->settlement.settle(first)));
                var b=pool.submit(()->tx.execute(s->settlement.settle(second)));
                assertTrue(a.get());assertTrue(b.get());
            }
            assertEquals(1L,db.sql("select completed_games from account_statistics where account_id=:id").param("id",account).query(Long.class).single());
            assertEquals(-1L,db.sql("select points from account_statistics where account_id=:id").param("id",account).query(Long.class).single());
            assertEquals(2L,db.sql("select count(*) from score_recording_decisions where account_id=:id").param("id",account).query(Long.class).single());
            assertFalse(Boolean.TRUE.equals(tx.execute(s->settlement.settle(second))));
            assertFalse(Boolean.TRUE.equals(tx.execute(s->service.bind(second,principal,other))));
            UUID finished=match(db,principal,null,true);
            db.sql("insert into match_event_projection(match_id,snapshot) values (:id,'{\"phase\":\"OVER\"}')").param("id",finished).update();
            assertFalse(Boolean.TRUE.equals(tx.execute(s->service.bind(finished,principal,account))));
            UUID duplicate=match(db,principal,null,true);
            db.sql("update match_participants set native_bot=false,principal_id=:principal,account_id_at_start=:account where match_id=:id and seat_index=1")
                .param("principal",principal).param("account",account).param("id",duplicate).update();
            assertFalse(Boolean.TRUE.equals(tx.execute(s->service.bind(duplicate,principal,account))));
        }finally{flyway.clean();}
    }
    private UUID match(JdbcClient db,UUID principal,UUID account,boolean live){
        UUID id=UUID.randomUUID();
        db.sql("insert into matches(id,room_id,status,rules_version,started_at) values (:id,:id,'PREPARED','test',now())").param("id",id).update();
        db.sql("insert into match_participants(match_id,seat_index,principal_id,account_id_at_start,rank) values (:id,0,:principal,:account,3)")
            .param("id",id).param("principal",principal).param("account",account).update();
        for(int seat=1;seat<4;seat++)db.sql("insert into match_participants(match_id,seat_index,native_bot,rank) values (:id,:seat,true,:rank)")
            .param("id",id).param("seat",seat).param("rank",seat==1?1:seat==2?2:4).update();
        return id;
    }
}
