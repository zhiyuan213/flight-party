package com.flightparty.billing;

import static org.junit.jupiter.api.Assertions.*;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.json.JsonMapper;

@EnabledIfEnvironmentVariable(named="SETTLEMENT_TEST_URL",matches=".+")
class CreemSubscriptionIntegrationTest {
    @Test void verifiedPaymentsAreBoundIdempotentOrderedAndTestIsolated(){
        String schema="billing_test_"+UUID.randomUUID().toString().replace("-","");
        String url=System.getenv("SETTLEMENT_TEST_URL"),user=System.getenv("SETTLEMENT_TEST_USER"),password=System.getenv("SETTLEMENT_TEST_PASSWORD");
        var flyway=Flyway.configure().dataSource(url,user,password).schemas(schema).cleanDisabled(false).load();flyway.migrate();
        try{
            var db=JdbcClient.create(new DriverManagerDataSource(url+"?currentSchema="+schema,user,password));
            var tx=new TransactionTemplate(new DataSourceTransactionManager(new DriverManagerDataSource(url+"?currentSchema="+schema,user,password)));
            // JdbcClient must share the transaction manager's DataSource instance.
            var source=new DriverManagerDataSource(url+"?currentSchema="+schema,user,password);
            db=JdbcClient.create(source);tx=new TransactionTemplate(new DataSourceTransactionManager(source));
            var service=new CreemSubscriptionService(db,"monthly","annual",false);
            UUID account=UUID.randomUUID(),request=UUID.randomUUID();
            db.sql("insert into accounts(id,display_name) values (:id,'Sandbox pilot')").param("id",account).update();
            db.sql("insert into billing_checkout_requests(id,account_id,plan,product_id) values (:id,:account,'MONTHLY','monthly')").param("id",request).param("account",account).update();
            var mapper=JsonMapper.builder().build();
            var product=Map.of("id","monthly","price",900,"currency","USD","billing_period","every-month");
            var sub=Map.of("id","sub_test","mode","test","product",product,"metadata",Map.of("joyflock_request_id",request.toString()),"current_period_end_date",Instant.now().plusSeconds(86400).toString(),"last_transaction",Map.of("id","tx_paid","status","paid"));
            var paid=mapper.valueToTree(Map.of("id","evt_paid","eventType","subscription.paid","created_at",1000,"object",sub));
            db.sql("insert into creem_webhook_inbox(event_id,event_type,payload_hash,payload) values ('evt_paid','subscription.paid',:hash,'{}')").param("hash","0".repeat(64)).update();
            tx.executeWithoutResult(s->service.apply(paid));tx.executeWithoutResult(s->service.apply(paid));
            assertEquals("TEST_ACTIVE",db.sql("select status from membership_entitlements").query(String.class).single());
            assertEquals(account,db.sql("select account_id from membership_entitlements").query(UUID.class).single());
            assertEquals(0L,db.sql("select count(*) from membership_entitlements where status='ACTIVE'").query(Long.class).single());
            var cancel=mapper.valueToTree(Map.of("id","evt_cancel","eventType","subscription.canceled","created_at",2000,"object",sub));
            db.sql("insert into creem_webhook_inbox(event_id,event_type,payload_hash,payload) values ('evt_cancel','subscription.canceled',:hash,'{}')").param("hash","0".repeat(64)).update();tx.executeWithoutResult(s->service.apply(cancel));
            assertEquals("INACTIVE",db.sql("select status from membership_entitlements").query(String.class).single());
            var stale=mapper.valueToTree(Map.of("id","evt_stale","eventType","subscription.paid","created_at",1500,"object",sub));
            db.sql("insert into creem_webhook_inbox(event_id,event_type,payload_hash,payload) values ('evt_stale','subscription.paid',:hash,'{}')").param("hash","0".repeat(64)).update();tx.executeWithoutResult(s->service.apply(stale));
            assertEquals("INACTIVE",db.sql("select status from membership_entitlements").query(String.class).single());
            var refund=mapper.valueToTree(Map.of("id","evt_refund","eventType","refund.created","created_at",3000,"object",Map.of("mode","test","subscription",sub,"transaction",Map.of("id","tx_paid"))));
            db.sql("insert into creem_webhook_inbox(event_id,event_type,payload_hash,payload) values ('evt_refund','refund.created',:hash,'{}')").param("hash","0".repeat(64)).update();tx.executeWithoutResult(s->service.apply(refund));
            assertEquals("REVOKED",db.sql("select status from membership_entitlements").query(String.class).single());
            assertFalse(new BillingAccess(true,false,"test","m","y","secret","").allowed(account));
            assertTrue(new BillingAccess(true,false,"test","m","y","secret",account.toString()).allowed(account));
        }finally{flyway.clean();}
    }
}
