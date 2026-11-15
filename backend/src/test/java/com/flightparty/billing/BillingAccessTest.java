package com.flightparty.billing;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class BillingAccessTest {
    @Test void publicSandboxStillRequiresAnAccountAndCompleteConfiguration(){
        UUID account=UUID.randomUUID();
        var open=new BillingAccess(true,false,"test","m","y","secret"," * ");
        assertTrue(open.allowed(account));
        assertTrue(open.testMode());
        assertFalse(open.allowed(null));
        assertFalse(new BillingAccess(false,false,"test","m","y","secret","*").allowed(account));
        assertFalse(new BillingAccess(true,false,"test","m","y","","*").allowed(account));
        assertFalse(new BillingAccess(true,false,"test","m","y","secret","").allowed(account));
        assertFalse(new BillingAccess(true,false,"test","m","y","secret",UUID.randomUUID().toString()).allowed(account));
        assertTrue(new BillingAccess(true,false,"test","m","y","secret",account.toString()).allowed(account));
    }
}
