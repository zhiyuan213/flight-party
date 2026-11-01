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
            assertEquals("MONTHLY",db.sql("select billing_plan from membership_entitlements").query(String.class).single());
            assertEquals("monthly",db.sql("select product_id from membership_entitlements").query(String.class).single());
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

    @Test void annualTierComesFromTheVerifiedProductAndOrderedPaidEvents(){
        String schema="annual_test_"+UUID.randomUUID().toString().replace("-","");
        String url=System.getenv("SETTLEMENT_TEST_URL"),user=System.getenv("SETTLEMENT_TEST_USER"),password=System.getenv("SETTLEMENT_TEST_PASSWORD");
        var flyway=Flyway.configure().dataSource(url,user,password).schemas(schema).cleanDisabled(false).load();flyway.migrate();
        try{
            var source=new DriverManagerDataSource(url+"?currentSchema="+schema,user,password);var db=JdbcClient.create(source);var tx=new TransactionTemplate(new DataSourceTransactionManager(source));
            var mapper=JsonMapper.builder().build();var appearances=new com.flightparty.auth.AppearanceService(db);
            for(int i=0;i<3;i++){
                boolean annual=i>0,test=i==1;String plan=annual?"ANNUAL":"MONTHLY",productId=annual?"annual":"monthly";
                UUID account=UUID.randomUUID(),request=UUID.randomUUID();String subscription="annual-case-"+i,eventId="annual-paid-"+i;
                db.sql("insert into accounts(id,display_name) values (:id,'Plan test')").param("id",account).update();
                db.sql("insert into billing_checkout_requests(id,account_id,plan,product_id) values (:id,:account,:plan,:product)").param("id",request).param("account",account).param("plan",plan).param("product",productId).update();
                var product=Map.of("id",productId,"price",annual?5900:900,"currency","USD","billing_period",annual?"every-year":"every-month");
                var sub=Map.of("id",subscription,"mode",test?"test":"live","product",product,"metadata",Map.of("joyflock_request_id",request.toString()),"current_period_end_date",Instant.now().plusSeconds(86400L*(annual?2:400)).toString(),"last_transaction",Map.of("id","tx-"+i,"status","paid"));
                var paid=mapper.valueToTree(Map.of("id",eventId,"eventType","subscription.paid","created_at",1000,"object",sub));
                store(db,paid);var service=new CreemSubscriptionService(db,"monthly","annual",!test);tx.executeWithoutResult(s->service.apply(paid));
                assertEquals(plan,db.sql("select billing_plan from membership_entitlements where subscription_id=:id").param("id",subscription).query(String.class).single());
                assertEquals(productId,db.sql("select product_id from membership_entitlements where subscription_id=:id").param("id",subscription).query(String.class).single());
                assertEquals(!test,appearances.get(account).member());assertEquals(annual&&!test,appearances.get(account).annualMember());
                if(!annual||test){assertThrows(IllegalStateException.class,()->appearances.selectPlane(account,"obsidian2d"));continue;}
                appearances.selectPlane(account,"obsidian2d");assertEquals("obsidian2d",appearances.get(account).plane());
                var monthProduct=Map.of("id","monthly","price",900,"currency","USD","billing_period","every-month");
                var switched=new java.util.HashMap<String,Object>(sub);switched.put("product",monthProduct);
                var monthly=mapper.valueToTree(Map.of("id","annual-downgrade","eventType","subscription.paid","created_at",2000,"object",switched));
                store(db,monthly);tx.executeWithoutResult(s->service.apply(monthly));
                assertTrue(appearances.get(account).member());assertFalse(appearances.get(account).annualMember());assertEquals("classic",appearances.get(account).plane());
                var stale=mapper.valueToTree(Map.of("id","annual-stale","eventType","subscription.paid","created_at",1500,"object",sub));
                store(db,stale);tx.executeWithoutResult(s->service.apply(stale));
                assertEquals("MONTHLY",db.sql("select billing_plan from membership_entitlements where subscription_id=:id").param("id",subscription).query(String.class).single());assertFalse(appearances.get(account).annualMember());
                var ambiguous=mapper.valueToTree(Map.of("id","annual-ambiguous","eventType","subscription.paid","created_at",3000,"object",sub));
                store(db,ambiguous);var misconfigured=new CreemSubscriptionService(db,"annual","annual",true);
                assertThrows(IllegalArgumentException.class,()->tx.executeWithoutResult(s->misconfigured.apply(ambiguous)));
                assertFalse(appearances.get(account).annualMember());
            }
        }finally{flyway.clean();}
    }
    @Test void reverseFirstDeliveryNeverActivatesAnOlderPaidEventAndPreservesItsOwner(){
        isolated((db,tx)->{
            var mapper=JsonMapper.builder().build();var service=new CreemSubscriptionService(db,"monthly","annual",true);var appearances=new com.flightparty.auth.AppearanceService(db);
            for(String type:java.util.List.of("subscription.canceled","subscription.unpaid","subscription.expired","subscription.paused","refund.created","dispute.created")){
                UUID account=UUID.randomUUID(),request=UUID.randomUUID();String subscription="reverse-first-"+type;
                db.sql("insert into accounts(id,display_name) values (:id,'Reverse delivery pilot')").param("id",account).update();
                db.sql("insert into billing_checkout_requests(id,account_id,plan,product_id) values (:id,:account,'ANNUAL','annual')").param("id",request).param("account",account).update();
                var sub=annualSub(subscription,request,"paid-tx");boolean reversal=type.equals("refund.created")||type.equals("dispute.created");
                var object=reversal?Map.of("mode","live","subscription",subscription,"transaction",Map.of("id","paid-tx")):sub;
                var first=mapper.valueToTree(Map.of("id",subscription+"-first","eventType",type,"created_at",2000,"object",object));
                store(db,first);tx.executeWithoutResult(s->service.apply(first));
                assertEquals(0L,db.sql("select count(*) from membership_entitlements where subscription_id=:id").param("id",subscription).query(Long.class).single());
                var paid=mapper.valueToTree(Map.of("id",subscription+"-paid","eventType","subscription.paid","created_at",type.equals("subscription.paused")?2000:1000,"object",sub));
                store(db,paid);tx.executeWithoutResult(s->service.apply(paid));
                assertEquals(account,db.sql("select account_id from membership_entitlements where subscription_id=:id").param("id",subscription).query(UUID.class).single());
                assertEquals(reversal?"REVOKED":"INACTIVE",db.sql("select status from membership_entitlements where subscription_id=:id").param("id",subscription).query(String.class).single());
                assertEquals(2000L,db.sql("select last_event_ms from membership_entitlements where subscription_id=:id").param("id",subscription).query(Long.class).single());
                assertFalse(appearances.get(account).member());assertFalse(appearances.get(account).annualMember());
                assertThrows(IllegalStateException.class,()->appearances.selectPlane(account,"obsidian2d"));
                var stale=mapper.valueToTree(Map.of("id",subscription+"-stale","eventType","subscription.paid","created_at",1500,"object",sub));
                store(db,stale);tx.executeWithoutResult(s->service.apply(stale));assertFalse(appearances.get(account).annualMember());
                var renewed=mapper.valueToTree(Map.of("id",subscription+"-renewed","eventType","subscription.paid","created_at",3000,"object",annualSub(subscription,request,"new-paid-tx")));
                store(db,renewed);tx.executeWithoutResult(s->service.apply(renewed));
                assertEquals(!reversal,appearances.get(account).annualMember());
                assertEquals(account,db.sql("select account_id from membership_entitlements where subscription_id=:id").param("id",subscription).query(UUID.class).single());
            }
        });
    }
    @Test void aFirstReversalOnlyBlocksItsMatchingTransactionAndInvalidPayloadsGrantNothing(){
        isolated((db,tx)->{
            var mapper=JsonMapper.builder().build();var service=new CreemSubscriptionService(db,"monthly","annual",true);var appearances=new com.flightparty.auth.AppearanceService(db);
            UUID account=UUID.randomUUID(),request=UUID.randomUUID();db.sql("insert into accounts(id,display_name) values (:id,'Guard pilot')").param("id",account).update();
            db.sql("insert into billing_checkout_requests(id,account_id,plan,product_id) values (:id,:account,'ANNUAL','annual')").param("id",request).param("account",account).update();
            for(String type:java.util.List.of("refund.created","dispute.created")){
                String subscription="unrelated-"+type;
                var first=mapper.valueToTree(Map.of("id",subscription+"-first","eventType",type,"created_at",2000,"object",Map.of("mode","live","subscription",subscription,"transaction",Map.of("id","old-tx"))));
                store(db,first);tx.executeWithoutResult(s->service.apply(first));
                var paid=mapper.valueToTree(Map.of("id",subscription+"-paid","eventType","subscription.paid","created_at",3000,"object",annualSub(subscription,request,"new-tx")));
                store(db,paid);tx.executeWithoutResult(s->service.apply(paid));assertTrue(appearances.get(account).annualMember());
            }
            UUID invalidAccount=UUID.randomUUID(),invalidRequest=UUID.randomUUID();db.sql("insert into accounts(id,display_name) values (:id,'Invalid payload pilot')").param("id",invalidAccount).update();
            db.sql("insert into billing_checkout_requests(id,account_id,plan,product_id) values (:id,:account,'ANNUAL','annual')").param("id",invalidRequest).param("account",invalidAccount).update();
            var missingTx=mapper.valueToTree(Map.of("id","invalid-refund","eventType","refund.created","created_at",2000,"object",Map.of("mode","live","subscription","invalid-sub")));
            store(db,missingTx);assertThrows(IllegalArgumentException.class,()->tx.executeWithoutResult(s->service.apply(missingTx)));
            var missingStamp=mapper.valueToTree(Map.of("id","invalid-terminal","eventType","subscription.canceled","object",Map.of("id","invalid-sub","mode","live")));
            store(db,missingStamp);assertThrows(IllegalArgumentException.class,()->tx.executeWithoutResult(s->service.apply(missingStamp)));
            var malformed=new java.util.HashMap<String,Object>(annualSub("invalid-sub",invalidRequest,"paid-tx"));malformed.put("product",Map.of("id","annual","price",5900.5,"currency","USD","billing_period","every-year"));
            var badPrice=mapper.valueToTree(Map.of("id","invalid-paid","eventType","subscription.paid","created_at",3000,"object",malformed));
            store(db,badPrice);assertThrows(IllegalArgumentException.class,()->tx.executeWithoutResult(s->service.apply(badPrice)));
            var noPaidTx=new java.util.HashMap<String,Object>(annualSub("invalid-sub",invalidRequest,""));
            var missingPaidTx=mapper.valueToTree(Map.of("id","invalid-paid-transaction","eventType","subscription.paid","created_at",3000,"object",noPaidTx));
            store(db,missingPaidTx);assertThrows(IllegalArgumentException.class,()->tx.executeWithoutResult(s->service.apply(missingPaidTx)));
            assertEquals(0L,db.sql("select count(*) from membership_entitlements where account_id=:id").param("id",invalidAccount).query(Long.class).single());
            assertEquals(0L,db.sql("select count(*) from creem_subscription_tombstones where subscription_id='invalid-sub'").query(Long.class).single());
            assertEquals(0L,db.sql("select count(*) from creem_subscription_reversals where subscription_id='invalid-sub'").query(Long.class).single());
            assertFalse(appearances.get(invalidAccount).member());assertFalse(appearances.get(invalidAccount).annualMember());
        });
    }
    @Test void migrationRetainsDenialsProcessedBeforeDeliveryGuardsExisted(){
        String schema="guard_upgrade_"+UUID.randomUUID().toString().replace("-","");String url=System.getenv("SETTLEMENT_TEST_URL"),user=System.getenv("SETTLEMENT_TEST_USER"),password=System.getenv("SETTLEMENT_TEST_PASSWORD");
        var flyway=Flyway.configure().dataSource(url,user,password).schemas(schema).cleanDisabled(false).target("16").load();flyway.migrate();
        try{
            var source=new DriverManagerDataSource(url+"?currentSchema="+schema,user,password);var db=JdbcClient.create(source);var tx=new TransactionTemplate(new DataSourceTransactionManager(source));var mapper=JsonMapper.builder().build();
            UUID account=UUID.randomUUID(),request=UUID.randomUUID();db.sql("insert into accounts(id,display_name) values (:id,'Pre-upgrade pilot')").param("id",account).update();
            db.sql("insert into billing_checkout_requests(id,account_id,plan,product_id) values (:id,:account,'ANNUAL','annual')").param("id",request).param("account",account).update();
            for(String type:java.util.List.of("subscription.canceled","refund.created","dispute.created")){
                String subscription="before-upgrade-"+type;
                var object=type.equals("subscription.canceled")?Map.of("id",subscription,"mode","live"):Map.of("subscription",Map.of("id",subscription),"transaction",Map.of("id","paid-tx"),"mode","live");
                var event=mapper.valueToTree(Map.of("id",subscription,"eventType",type,"created_at",2000,"object",object));
                db.sql("insert into creem_webhook_inbox(event_id,event_type,payload_hash,payload,processed_at) values (:id,:type,:hash,:payload,now())").param("id",subscription).param("type",type).param("hash","0".repeat(64)).param("payload",mapper.writeValueAsString(event)).update();
                // The old implementation may already have granted the late, older payment.
                db.sql("insert into membership_entitlements(account_id,subscription_id,provider,status,valid_until,last_event_ms,last_transaction_id,billing_plan,product_id) values (:account,:sub,'creem','ACTIVE',now()+interval '1 day',1000,'paid-tx','ANNUAL','annual')").param("account",account).param("sub",subscription).update();
            }
            UUID newerAccount=UUID.randomUUID();db.sql("insert into accounts(id,display_name) values (:id,'Newer valid pilot')").param("id",newerAccount).update();
            var earlierCancel=mapper.valueToTree(Map.of("id","earlier-valid-cancel","eventType","subscription.canceled","created_at",2000,"object",Map.of("id","newer-valid","mode","live")));
            db.sql("insert into creem_webhook_inbox(event_id,event_type,payload_hash,payload,processed_at) values ('earlier-valid-cancel','subscription.canceled',:hash,:payload,now())").param("hash","0".repeat(64)).param("payload",mapper.writeValueAsString(earlierCancel)).update();
            db.sql("insert into membership_entitlements(account_id,subscription_id,provider,status,valid_until,last_event_ms,last_transaction_id,billing_plan,product_id) values (:account,'newer-valid','creem','ACTIVE',now()+interval '1 day',3000,'new-paid-tx','ANNUAL','annual')").param("account",newerAccount).update();
            UUID ordinaryGift=UUID.randomUUID();db.sql("insert into accounts(id,display_name) values (:id,'Historical ordinary gift')").param("id",ordinaryGift).update();
            db.sql("insert into complimentary_memberships(account_id,valid_until,reason) values (:id,now()+interval '400 days','pre-tier ordinary gift')").param("id",ordinaryGift).update();
            // A manually malformed inbox row cannot break migration or manufacture a guard.
            db.sql("insert into creem_webhook_inbox(event_id,event_type,payload_hash,payload,processed_at) values ('malformed-old','refund.created',:hash,'not-json',now())").param("hash","0".repeat(64)).update();
            assertEquals(3L,db.sql("select count(*) from membership_entitlements where account_id=:id and status='ACTIVE' and billing_plan='ANNUAL'").param("id",account).query(Long.class).single());
            Flyway.configure().dataSource(url,user,password).schemas(schema).load().migrate();
            // Denial applies immediately at upgrade, without waiting for another webhook.
            assertFalse(new com.flightparty.auth.AppearanceService(db).get(account).member());
            assertFalse(new com.flightparty.auth.AppearanceService(db).get(account).annualMember());
            assertTrue(new com.flightparty.auth.AppearanceService(db).get(newerAccount).annualMember());
            assertEquals("VIP",db.sql("select tier from complimentary_memberships where account_id=:id").param("id",ordinaryGift).query(String.class).single());
            assertTrue(new com.flightparty.auth.AppearanceService(db).get(ordinaryGift).member());assertFalse(new com.flightparty.auth.AppearanceService(db).get(ordinaryGift).annualMember());
            var service=new CreemSubscriptionService(db,"monthly","annual",true);
            for(String type:java.util.List.of("subscription.canceled","refund.created","dispute.created")){
                String subscription="before-upgrade-"+type;
                var paid=mapper.valueToTree(Map.of("id",subscription+"-paid","eventType","subscription.paid","created_at",1000,"object",annualSub(subscription,request,"paid-tx")));
                store(db,paid);tx.executeWithoutResult(s->service.apply(paid));
                assertEquals(type.equals("subscription.canceled")?"INACTIVE":"REVOKED",db.sql("select status from membership_entitlements where subscription_id=:id").param("id",subscription).query(String.class).single());
                assertEquals(account,db.sql("select account_id from membership_entitlements where subscription_id=:id").param("id",subscription).query(UUID.class).single());
            }
            assertEquals(2L,db.sql("select count(*) from creem_subscription_tombstones").query(Long.class).single());assertEquals(2L,db.sql("select count(*) from creem_subscription_reversals").query(Long.class).single());
            assertFalse(new com.flightparty.auth.AppearanceService(db).get(account).annualMember());
            assertTrue(new com.flightparty.auth.AppearanceService(db).get(newerAccount).annualMember());
        }finally{flyway.clean();}
    }
    @Test void unrelatedLaterReversalCannotPromoteDelayedOldPaidOverNewerPayment(){
        isolated((db,tx)->{
            var mapper=JsonMapper.builder().build();var service=new CreemSubscriptionService(db,"monthly","annual",true);var appearances=new com.flightparty.auth.AppearanceService(db);
            for(String type:java.util.List.of("refund.created","dispute.created")){
                UUID account=UUID.randomUUID(),request=UUID.randomUUID();String subscription="old-paid-reversal-"+type;
                db.sql("insert into accounts(id,display_name) values (:id,'Current transaction pilot')").param("id",account).update();
                db.sql("insert into billing_checkout_requests(id,account_id,plan,product_id) values (:id,:account,'ANNUAL','annual')").param("id",request).param("account",account).update();
                var newerPaid=mapper.valueToTree(Map.of("id",subscription+"-new","eventType","subscription.paid","created_at",3000,"object",annualSub(subscription,request,"tx-new")));
                store(db,newerPaid);tx.executeWithoutResult(s->service.apply(newerPaid));
                var reversal=mapper.valueToTree(Map.of("id",subscription+"-refund","eventType",type,"created_at",5000,"object",Map.of("mode","live","subscription",subscription,"transaction",Map.of("id","tx-old"))));
                store(db,reversal);tx.executeWithoutResult(s->service.apply(reversal));assertTrue(appearances.get(account).annualMember());
                var olderPaid=mapper.valueToTree(Map.of("id",subscription+"-old","eventType","subscription.paid","created_at",1000,"object",annualSub(subscription,request,"tx-old")));
                store(db,olderPaid);tx.executeWithoutResult(s->service.apply(olderPaid));
                assertEquals("ACTIVE",db.sql("select status from membership_entitlements where subscription_id=:id").param("id",subscription).query(String.class).single());
                assertEquals("tx-new",db.sql("select last_transaction_id from membership_entitlements where subscription_id=:id").param("id",subscription).query(String.class).single());
                assertEquals(3000L,db.sql("select last_event_ms from membership_entitlements where subscription_id=:id").param("id",subscription).query(Long.class).single());
                assertEquals(account,db.sql("select account_id from membership_entitlements where subscription_id=:id").param("id",subscription).query(UUID.class).single());
                assertTrue(appearances.get(account).annualMember());
            }
        });
    }
    @Test void equalTimestampVerifiedPlanChangesPreferMonthlyInEitherDeliveryOrder(){
        isolated((db,tx)->{
            var mapper=JsonMapper.builder().build();var service=new CreemSubscriptionService(db,"monthly","annual",true);var appearances=new com.flightparty.auth.AppearanceService(db);
            for(boolean annualFirst:java.util.List.of(true,false)){
                UUID account=UUID.randomUUID(),request=UUID.randomUUID();String subscription="equal-plan-"+annualFirst;
                db.sql("insert into accounts(id,display_name,plane_style) values (:id,'Equal timestamp pilot','obsidian2d')").param("id",account).update();
                db.sql("insert into billing_checkout_requests(id,account_id,plan,product_id) values (:id,:account,:plan,:product)").param("id",request).param("account",account).param("plan",annualFirst?"ANNUAL":"MONTHLY").param("product",annualFirst?"annual":"monthly").update();
                for(boolean annual:java.util.List.of(annualFirst,!annualFirst)){
                    var sub=new java.util.HashMap<String,Object>(annualSub(subscription,request,annual?"annual-tx":"monthly-tx"));
                    if(!annual)sub.put("product",Map.of("id","monthly","price",900,"currency","USD","billing_period","every-month"));
                    var paid=mapper.valueToTree(Map.of("id",subscription+"-"+annual,"eventType","subscription.paid","created_at",3000,"object",sub));
                    store(db,paid);tx.executeWithoutResult(s->service.apply(paid));
                }
                assertEquals("MONTHLY",db.sql("select billing_plan from membership_entitlements where subscription_id=:id").param("id",subscription).query(String.class).single());
                assertTrue(appearances.get(account).member());assertFalse(appearances.get(account).annualMember());assertEquals("classic",appearances.get(account).plane());
                appearances.selectPlane(account,"gold2d");assertEquals("gold2d",appearances.get(account).plane());
                var terminal=mapper.valueToTree(Map.of("id",subscription+"-terminal","eventType","subscription.canceled","created_at",3000,"object",Map.of("id",subscription,"mode","live")));
                store(db,terminal);tx.executeWithoutResult(s->service.apply(terminal));assertFalse(appearances.get(account).member());
                var tiedPaid=mapper.valueToTree(Map.of("id",subscription+"-after-terminal","eventType","subscription.paid","created_at",3000,"object",annualSub(subscription,request,"another-annual-tx")));
                store(db,tiedPaid);tx.executeWithoutResult(s->service.apply(tiedPaid));
                assertFalse(appearances.get(account).member());assertFalse(appearances.get(account).annualMember());
            }
        });
    }
    private static Map<String,Object> annualSub(String subscription,UUID request,String transaction){return Map.of("id",subscription,"mode","live","product",Map.of("id","annual","price",5900,"currency","USD","billing_period","every-year"),"metadata",Map.of("joyflock_request_id",request.toString()),"current_period_end_date",Instant.now().plusSeconds(86400).toString(),"last_transaction",Map.of("id",transaction,"status","paid"));}
    private static void isolated(java.util.function.BiConsumer<JdbcClient,TransactionTemplate> test){
        String schema="guard_test_"+UUID.randomUUID().toString().replace("-","");String url=System.getenv("SETTLEMENT_TEST_URL"),user=System.getenv("SETTLEMENT_TEST_USER"),password=System.getenv("SETTLEMENT_TEST_PASSWORD");
        var flyway=Flyway.configure().dataSource(url,user,password).schemas(schema).cleanDisabled(false).load();flyway.migrate();
        try{var source=new DriverManagerDataSource(url+"?currentSchema="+schema,user,password);test.accept(JdbcClient.create(source),new TransactionTemplate(new DataSourceTransactionManager(source)));}finally{flyway.clean();}
    }
    private static void store(JdbcClient db,tools.jackson.databind.JsonNode event){db.sql("insert into creem_webhook_inbox(event_id,event_type,payload_hash,payload) values (:id,:type,:hash,'{}')").param("id",event.path("id").asText()).param("type",event.path("eventType").asText()).param("hash","0".repeat(64)).update();}
}
