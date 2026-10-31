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

@RestController
public class BillingSubscriptionController {
    private final JdbcClient db;private final String key;private final boolean live;
    private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    public BillingSubscriptionController(JdbcClient db,@Value("${CREEM_API_KEY:}")String key,@Value("${CREEM_LIVE:false}")boolean live){this.db=db;this.key=key;this.live=live;}
    @PostMapping("/api/billing/subscriptions/{id}/cancel")
    public Map<String,String> cancel(@PathVariable String id,HttpServletRequest request)throws Exception{
        var session=request.getSession(false);Object account=session==null?null:session.getAttribute("flightparty.account");
        if(account==null)throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        var owned=db.sql("select cancel_scheduled from membership_entitlements where subscription_id=:id and account_id=:account and test_mode=:test").param("id",id).param("account",UUID.fromString(account.toString())).param("test",!live).query(Boolean.class).optional();
        if(owned.isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        if(owned.get())return Map.of("status","scheduled_cancel");
        if(key.isBlank()||!id.matches("sub_[A-Za-z0-9]+"))throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);
        var response=http.send(HttpRequest.newBuilder(URI.create((live?"https://api.creem.io":"https://test-api.creem.io")+"/v1/subscriptions/"+id+"/cancel")).timeout(Duration.ofSeconds(20)).header("x-api-key",key).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString("{\"mode\":\"scheduled\",\"onExecute\":\"cancel\"}")).build(),HttpResponse.BodyHandlers.ofString());
        if(response.statusCode()<200||response.statusCode()>=300)throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,"cancellation not confirmed; retry later");
        db.sql("update membership_entitlements set cancel_scheduled=true where subscription_id=:id and account_id=:account").param("id",id).param("account",UUID.fromString(account.toString())).update();
        return Map.of("status","scheduled_cancel");
    }
}
