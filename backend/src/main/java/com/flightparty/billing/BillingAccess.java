package com.flightparty.billing;

import java.util.Arrays;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class BillingAccess {
    private final boolean enabled,live;
    private final String key,monthly,annual,secret,allowlist;
    public BillingAccess(@Value("${CREEM_CHECKOUT_ENABLED:false}")boolean enabled,@Value("${CREEM_LIVE:false}")boolean live,@Value("${CREEM_API_KEY:}")String key,@Value("${CREEM_MONTHLY_PRODUCT_ID:}")String monthly,@Value("${CREEM_ANNUAL_PRODUCT_ID:}")String annual,@Value("${CREEM_WEBHOOK_SECRET:}")String secret,@Value("${CREEM_TEST_ACCOUNTS:}")String allowlist){this.enabled=enabled;this.live=live;this.key=key;this.monthly=monthly;this.annual=annual;this.secret=secret;this.allowlist=allowlist;}
    public boolean allowed(UUID account){return enabled&&!key.isBlank()&&!monthly.isBlank()&&!annual.isBlank()&&!secret.isBlank()&&(live||Arrays.stream(allowlist.split(",")).anyMatch(account.toString()::equals));}
    public boolean testMode(){return !live;}
}
