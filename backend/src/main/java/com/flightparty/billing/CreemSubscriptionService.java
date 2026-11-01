package com.flightparty.billing;

import java.time.Instant;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;

/** Applies only authenticated provider events. Test entitlements never authorize real score recording. */
@Service
public class CreemSubscriptionService {
    private final JdbcClient db;
    private final String monthly,annual;
    private final boolean live;
    public CreemSubscriptionService(JdbcClient db,@Value("${CREEM_MONTHLY_PRODUCT_ID:}")String monthly,@Value("${CREEM_ANNUAL_PRODUCT_ID:}")String annual,@Value("${CREEM_LIVE:false}")boolean live){this.db=db;this.monthly=monthly;this.annual=annual;this.live=live;}

    @Transactional
    public void apply(JsonNode event){
        String eventId=event.path("id").asText();
        var row=db.sql("select processed_at is not null from creem_webhook_inbox where event_id=:id for update").param("id",eventId).query(Boolean.class).single();
        if(row)return;
        String type=event.path("eventType").asText();
        JsonNode object=event.path("object");
        boolean reversal=type.equals("refund.created")||type.equals("dispute.created");
        JsonNode sub=reversal?object.path("subscription"):object;
        if(!(type.startsWith("subscription.")||reversal)){finish(eventId,"ignored non-subscription event");return;}
        String id=sub.isTextual()?sub.asText():sub.path("id").asText();
        if(id.isBlank())throw new IllegalArgumentException("missing subscription");
        db.sql("select pg_advisory_xact_lock(hashtextextended(:id,0))").param("id",id).query(Object.class).single();
        var existing=db.sql("select account_id from membership_entitlements where subscription_id=:id").param("id",id).query(UUID.class).optional();
        String mode=object.path("mode").asText(sub.path("mode").asText());
        boolean test=mode.equals("test")||mode.equals("sandbox");
        if((live&&test)||(!live&&!test))throw new IllegalArgumentException("billing mode mismatch");
        long stamp=event.path("created_at").asLong(0);
        if(stamp<=0)throw new IllegalArgumentException("missing event timestamp");
        if(reversal){
            JsonNode transactionNode=object.path("transaction");
            String transaction=transactionNode.isTextual()?transactionNode.asText():transactionNode.path("id").asText();
            if(transaction.isBlank())throw new IllegalArgumentException("missing reversed transaction");
            db.sql("""
                insert into creem_subscription_reversals(subscription_id,transaction_id,event_ms,event_type) values (:id,:tx,:stamp,:type)
                on conflict(subscription_id,transaction_id) do update set event_ms=greatest(creem_subscription_reversals.event_ms,excluded.event_ms)
                """).param("id",id).param("tx",transaction).param("stamp",stamp).param("type",type).update();
            db.sql("update membership_entitlements set status='REVOKED',last_event_ms=greatest(last_event_ms,:stamp) where subscription_id=:id and last_transaction_id=:tx").param("id",id).param("tx",transaction).param("stamp",stamp).update();
            finish(eventId,"reversal recorded; matching paid transaction revoked");return;
        }
        boolean paid=type.equals("subscription.paid");
        UUID account=existing.orElse(null);
        if(paid){
            JsonNode product=sub.path("product");String productId=product.path("id").asText();
            boolean month=!monthly.isBlank()&&productId.equals(monthly),year=!annual.isBlank()&&productId.equals(annual);
            if(month==year)throw new IllegalArgumentException("unknown or ambiguous product");
            if(!product.path("currency").asText().equals("USD")||!product.path("price").isIntegralNumber()||product.path("price").asLong()!=(month?900:5900))throw new IllegalArgumentException("product price mismatch");
            String interval=product.path("recurring_interval").asText();
            if(!(product.path("billing_period").asText().equals(month?"every-month":"every-year")||(interval.equals(month?"month":"year")&&product.path("recurring_interval_count").asInt(1)==1)))throw new IllegalArgumentException("product interval mismatch");
            String requestId=sub.path("metadata").path("joyflock_request_id").asText();
            if(account==null){
                UUID request=UUID.fromString(requestId);
                account=db.sql("select account_id from billing_checkout_requests where id=:id and product_id=:product").param("id",request).param("product",productId).query(UUID.class).single();
            }
            if(!sub.path("last_transaction").path("status").asText().equals("paid"))throw new IllegalArgumentException("transaction not paid");
            String transaction=sub.path("last_transaction").path("id").asText();
            if(transaction.isBlank())throw new IllegalArgumentException("missing paid transaction");
            Instant until=Instant.parse(sub.path("current_period_end_date").asText());
            long terminal=db.sql("select last_event_ms from creem_subscription_tombstones where subscription_id=:id").param("id",id).query(Long.class).optional().orElse(0L);
            long reversed=db.sql("select event_ms from creem_subscription_reversals where subscription_id=:id and transaction_id=:tx").param("id",id).param("tx",transaction).query(Long.class).optional().orElse(0L);
            String status=reversed>0?"REVOKED":terminal>=stamp?"INACTIVE":test?"TEST_ACTIVE":"ACTIVE";
            long effectiveStamp=Math.max(stamp,Math.max(terminal,reversed));
            // Denial watermarks protect a first insert; they never promote an old
            // payment over a newer transaction. Equal paid stamps only downgrade.
            db.sql("""
                insert into membership_entitlements(account_id,subscription_id,provider,status,valid_until,last_event_ms,last_transaction_id,test_mode,billing_plan,product_id)
                values (:account,:id,'creem',:status,:until,:stamp,:tx,:test,:plan,:product)
                on conflict(subscription_id) do update set status=excluded.status,valid_until=excluded.valid_until,last_event_ms=excluded.last_event_ms,last_transaction_id=excluded.last_transaction_id,billing_plan=excluded.billing_plan,product_id=excluded.product_id
                where membership_entitlements.status<>'REVOKED' and
                    (membership_entitlements.last_event_ms<:paidStamp or
                     (membership_entitlements.last_event_ms=:paidStamp and membership_entitlements.status in ('ACTIVE','TEST_ACTIVE') and membership_entitlements.billing_plan='ANNUAL' and excluded.billing_plan='MONTHLY'))
                """).param("account",account).param("id",id).param("status",status).param("until",java.sql.Timestamp.from(until)).param("stamp",effectiveStamp).param("paidStamp",stamp).param("tx",transaction).param("test",test).param("plan",year?"ANNUAL":"MONTHLY").param("product",productId).update();
        }else if(existing.isPresent()&&type.equals("subscription.scheduled_cancel")){
            db.sql("update membership_entitlements set cancel_scheduled=true where subscription_id=:id").param("id",id).update();
        }else if(existing.isPresent()&&!type.equals("subscription.active")){
            // scheduled cancellation retains the already-paid period. Unpaid/paused/canceled remove access.
            if(java.util.Set.of("subscription.canceled","subscription.unpaid","subscription.expired","subscription.paused").contains(type))
                db.sql("update membership_entitlements set status='INACTIVE',last_event_ms=:stamp where subscription_id=:id and last_event_ms<=:stamp and status<>'REVOKED'").param("stamp",stamp).param("id",id).update();
        }
        if(java.util.Set.of("subscription.canceled","subscription.unpaid","subscription.expired","subscription.paused").contains(type)){
            db.sql("""
                insert into creem_subscription_tombstones(subscription_id,last_event_ms,event_type) values (:id,:stamp,:type)
                on conflict(subscription_id) do update set last_event_ms=excluded.last_event_ms,event_type=excluded.event_type
                where creem_subscription_tombstones.last_event_ms<excluded.last_event_ms
                """).param("id",id).param("stamp",stamp).param("type",type).update();
        }
        finish(eventId,paid?"paid event synchronized":"subscription synchronized");
    }
    private void finish(String id,String note){db.sql("update creem_webhook_inbox set processed_at=now(),processing_note=:note where event_id=:id").param("note",note).param("id",id).update();}
}
