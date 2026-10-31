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
        if(reversal){
            String transaction=object.path("transaction").path("id").asText();
            db.sql("update membership_entitlements set status='REVOKED' where subscription_id=:id and last_transaction_id=:tx").param("id",id).param("tx",transaction).update();
            finish(eventId,"reversal applied to matching paid transaction");return;
        }
        long stamp=event.path("created_at").asLong(0);
        if(stamp<=0)throw new IllegalArgumentException("missing event timestamp");
        boolean paid=type.equals("subscription.paid");
        UUID account=existing.orElse(null);
        if(paid){
            JsonNode product=sub.path("product");String productId=product.path("id").asText();
            boolean month=!monthly.isBlank()&&productId.equals(monthly),year=!annual.isBlank()&&productId.equals(annual);
            if(!month&&!year)throw new IllegalArgumentException("unknown product");
            if(!product.path("currency").asText().equals("USD")||product.path("price").asInt()!=(month?900:5900))throw new IllegalArgumentException("product price mismatch");
            String interval=product.path("recurring_interval").asText();
            if(!(product.path("billing_period").asText().equals(month?"every-month":"every-year")||(interval.equals(month?"month":"year")&&product.path("recurring_interval_count").asInt(1)==1)))throw new IllegalArgumentException("product interval mismatch");
            String requestId=sub.path("metadata").path("joyflock_request_id").asText();
            if(account==null){
                UUID request=UUID.fromString(requestId);
                account=db.sql("select account_id from billing_checkout_requests where id=:id and product_id=:product").param("id",request).param("product",productId).query(UUID.class).single();
            }
            if(!sub.path("last_transaction").path("status").asText().equals("paid"))throw new IllegalArgumentException("transaction not paid");
            Instant until=Instant.parse(sub.path("current_period_end_date").asText());
            db.sql("""
                insert into membership_entitlements(account_id,subscription_id,provider,status,valid_until,last_event_ms,last_transaction_id,test_mode)
                values (:account,:id,'creem',:status,:until,:stamp,:tx,:test)
                on conflict(subscription_id) do update set status=excluded.status,valid_until=excluded.valid_until,last_event_ms=excluded.last_event_ms,last_transaction_id=excluded.last_transaction_id
                where membership_entitlements.last_event_ms<excluded.last_event_ms and membership_entitlements.status<>'REVOKED'
                """).param("account",account).param("id",id).param("status",test?"TEST_ACTIVE":"ACTIVE").param("until",java.sql.Timestamp.from(until)).param("stamp",stamp).param("tx",sub.path("last_transaction").path("id").asText()).param("test",test).update();
        }else if(existing.isPresent()&&!type.equals("subscription.active")&&!type.equals("subscription.scheduled_cancel")){
            // scheduled cancellation retains the already-paid period. Unpaid/paused/canceled remove access.
            if(java.util.Set.of("subscription.canceled","subscription.unpaid","subscription.expired","subscription.paused").contains(type))
                db.sql("update membership_entitlements set status='INACTIVE',last_event_ms=:stamp where subscription_id=:id and last_event_ms<:stamp and status<>'REVOKED'").param("stamp",stamp).param("id",id).update();
        }
        finish(eventId,paid?"paid subscription applied":"subscription synchronized");
    }
    private void finish(String id,String note){db.sql("update creem_webhook_inbox set processed_at=now(),processing_note=:note where event_id=:id").param("note",note).param("id",id).update();}
}
