package com.flightparty.billing;

import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

@RestController
public class CreemCheckoutController {
    private final BillingAccess access;
    private final JdbcClient db;private final String key,monthly,annual,success;private final boolean live;
    private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final JsonMapper json=JsonMapper.builder().build();
    public CreemCheckoutController(JdbcClient db,@Value("${CREEM_API_KEY:}")String key,@Value("${CREEM_MONTHLY_PRODUCT_ID:}")String monthly,@Value("${CREEM_ANNUAL_PRODUCT_ID:}")String annual,@Value("${CREEM_SUCCESS_URL:}")String success,@Value("${CREEM_LIVE:false}")boolean live,BillingAccess access){this.db=db;this.key=key;this.monthly=monthly;this.annual=annual;this.success=success;this.live=live;this.access=access;}
    public record Input(UUID requestId,String plan) {}
    public record Checkout(String checkoutUrl) {}
    @PostMapping("/api/billing/checkout")
    @org.springframework.transaction.annotation.Transactional
    public synchronized Checkout create(@RequestBody Input input,HttpServletRequest request)throws Exception{
        var session=request.getSession(false);Object account=session==null?null:session.getAttribute("flightparty.account");
        if(account==null)throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        if(input.requestId()==null)throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        String product=switch(input.plan()==null?"":input.plan()){case "MONTHLY"->monthly;case "ANNUAL"->annual;default->throw new ResponseStatusException(HttpStatus.BAD_REQUEST);};
        if(key.isBlank()||product.isBlank()||!success.startsWith("https://"))throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"billing not configured");
        var owner=UUID.fromString(account.toString());
        if(!access.allowed(owner))throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"billing not enabled for this account");
        // Serialize checkout creation across application instances for this account.
        db.sql("select id from accounts where id=:id for update").param("id",owner).query(UUID.class).single();
        boolean subscribed=db.sql("select exists(select 1 from membership_entitlements where account_id=:id and status in ('ACTIVE','TEST_ACTIVE') and test_mode=:test and valid_until>now())")
                .param("id",owner).param("test",!live).query(Boolean.class).single();
        if(subscribed)throw new ResponseStatusException(HttpStatus.CONFLICT,"membership already active; duplicate subscriptions are not allowed");
        var existing=db.sql("select account_id,plan,checkout_url from billing_checkout_requests where id=:id").param("id",input.requestId()).query((rs,row)->new Existing(rs.getObject(1,UUID.class),rs.getString(2),rs.getString(3))).optional();
        if(existing.isPresent()){
            var old=existing.get();if(!old.account().equals(owner)||!old.plan().equals(input.plan()))throw new ResponseStatusException(HttpStatus.CONFLICT);
            if(old.url()==null)throw new ResponseStatusException(HttpStatus.CONFLICT,"checkout awaiting reconciliation");
            return new Checkout(old.url());
        }
        // A second tab must reuse a still-pending checkout, not create another subscription.
        var pending=db.sql("select id,plan,checkout_id,checkout_url from billing_checkout_requests b where account_id=:account and product_id in (:monthly,:annual) and not exists(select 1 from membership_entitlements e where e.account_id=b.account_id and e.product_id=b.product_id) order by created_at desc limit 1")
                .param("account",owner).param("monthly",monthly).param("annual",annual)
                .query((rs,row)->new Pending(rs.getObject(1,UUID.class),rs.getString(2),rs.getString(3),rs.getString(4))).optional();
        if(pending.isPresent()){
            var p=pending.get();
            if(p.checkout()==null)throw new ResponseStatusException(HttpStatus.CONFLICT,"previous checkout awaiting reconciliation");
            var check=http.send(HttpRequest.newBuilder(URI.create((live?"https://api.creem.io":"https://test-api.creem.io")+"/v1/checkouts?checkout_id="+java.net.URLEncoder.encode(p.checkout(),java.nio.charset.StandardCharsets.UTF_8))).timeout(Duration.ofSeconds(20)).header("x-api-key",key).GET().build(),HttpResponse.BodyHandlers.ofString());
            if(check.statusCode()!=200)throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,"previous checkout status unavailable");
            String state=json.readTree(check.body()).path("status").asText();
            if(state.equals("pending")){
                if(!p.plan().equals(input.plan()))throw new ResponseStatusException(HttpStatus.CONFLICT,"another plan has a pending checkout");
                return new Checkout(p.url());
            }
            if(!java.util.Set.of("expired","canceled","cancelled").contains(state))throw new ResponseStatusException(HttpStatus.CONFLICT,"payment awaiting membership confirmation");
        }
        db.sql("insert into billing_checkout_requests(id,account_id,plan,product_id) values (:id,:account,:plan,:product)").param("id",input.requestId()).param("account",owner).param("plan",input.plan()).param("product",product).update();
        String body=json.writeValueAsString(Map.of("product_id",product,"request_id",input.requestId().toString(),"success_url",success,"metadata",Map.of("joyflock_request_id",input.requestId().toString())));
        var response=http.send(HttpRequest.newBuilder(URI.create(live?"https://api.creem.io/v1/checkouts":"https://test-api.creem.io/v1/checkouts")).timeout(Duration.ofSeconds(20)).header("x-api-key",key).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(body)).build(),HttpResponse.BodyHandlers.ofString());
        if(response.statusCode()<200||response.statusCode()>=300)throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,"checkout provider unavailable");
        var result=json.readTree(response.body());String url=result.path("checkout_url").asText(),id=result.path("id").asText();
        URI target=URI.create(url);String host=target.getHost();
        if(!"https".equals(target.getScheme())||host==null||!(host.equals("creem.io")||host.endsWith(".creem.io"))||id.isBlank())throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,"invalid checkout response");
        db.sql("update billing_checkout_requests set checkout_id=:checkout,checkout_url=:url where id=:id").param("checkout",id).param("url",url).param("id",input.requestId()).update();
        return new Checkout(url);
    }
    private record Existing(UUID account,String plan,String url) {}
    private record Pending(UUID id,String plan,String checkout,String url) {}
}
