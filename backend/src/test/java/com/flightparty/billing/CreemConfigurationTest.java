package com.flightparty.billing;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

class CreemConfigurationTest {
    private MockEnvironment both(){
        return new MockEnvironment()
            .withProperty("CREEM_PROD_API_KEY","creem_production_fixture")
            .withProperty("CREEM_PROD_WEBHOOK_SECRET","prod-secret")
            .withProperty("CREEM_PROD_MONTHLY_PRODUCT_ID","prod-month")
            .withProperty("CREEM_PROD_ANNUAL_PRODUCT_ID","prod-year")
            .withProperty("CREEM_TEST_API_KEY","creem_test_fixture")
            .withProperty("CREEM_TEST_WEBHOOK_SECRET","test-secret")
            .withProperty("CREEM_TEST_MONTHLY_PRODUCT_ID","test-month")
            .withProperty("CREEM_TEST_ANNUAL_PRODUCT_ID","test-year")
            .withProperty("CREEM_API_KEY","legacy-key-must-not-win");
    }
    @Test void oneFlagSelectsTheEntireSetAndCanSwitchBack(){
        var env=both();
        for(boolean live:new boolean[]{true,false,true}){
            env.setProperty("CREEM_LIVE",String.valueOf(live));
            var c=new CreemConfiguration(env);String prefix=live?"prod":"test";
            assertEquals(live,c.live());
            assertEquals(live?"creem_production_fixture":"creem_test_fixture",c.apiKey());
            assertEquals(prefix+"-secret",c.webhookSecret());
            assertEquals(prefix+"-month",c.monthlyProduct());
            assertEquals(prefix+"-year",c.annualProduct());
        }
    }
    @Test void missingSelectedSecretNeverFallsBackToLegacyOrTheOtherMode(){
        var env=both().withProperty("CREEM_LIVE","true");
        env.setProperty("CREEM_PROD_WEBHOOK_SECRET","");
        assertThrows(IllegalStateException.class,()->new CreemConfiguration(env));
        env.setProperty("CREEM_LIVE","false");
        assertEquals("test-secret",new CreemConfiguration(env).webhookSecret());
    }
    @Test void rejectsAKeyFromTheOppositeEnvironment(){
        var env=both().withProperty("CREEM_LIVE","true").withProperty("CREEM_PROD_API_KEY","creem_test_wrong");
        assertThrows(IllegalStateException.class,()->new CreemConfiguration(env));
        env.setProperty("CREEM_LIVE","false");env.setProperty("CREEM_TEST_API_KEY","creem_production_wrong");
        assertThrows(IllegalStateException.class,()->new CreemConfiguration(env));
    }
    @Test void legacyOnlyInstallationsRemainCompatible(){
        var c=new CreemConfiguration(new MockEnvironment().withProperty("CREEM_API_KEY","legacy"));
        assertEquals("legacy",c.apiKey());assertFalse(c.live());
    }
    @Test void allBillingComponentsUseTheSameSelectedCredentials(){
        for(boolean live:new boolean[]{true,false}){
            var props=both().withProperty("CREEM_LIVE",String.valueOf(live));
            var runner=new ApplicationContextRunner().withInitializer(ctx->ctx.getEnvironment().getPropertySources().addFirst(props.getPropertySources().get("mockProperties")))
                .withBean(JdbcClient.class,()->mock(JdbcClient.class))
                .withUserConfiguration(CreemConfiguration.class,BillingAccess.class,CreemCheckoutController.class,CreemWebhookController.class,CreemSubscriptionService.class,BillingSubscriptionController.class);
            runner.run(ctx->{
                assertNull(ctx.getStartupFailure());var c=ctx.getBean(CreemConfiguration.class);
                assertEquals(c.apiKey(),ReflectionTestUtils.getField(ctx.getBean(CreemCheckoutController.class),"key"));
                assertEquals(c.apiKey(),ReflectionTestUtils.getField(ctx.getBean(BillingSubscriptionController.class),"key"));
                assertEquals(c.webhookSecret(),ReflectionTestUtils.getField(ctx.getBean(CreemWebhookController.class),"secret"));
                assertEquals(c.monthlyProduct(),ReflectionTestUtils.getField(ctx.getBean(CreemSubscriptionService.class),"monthly"));
                assertEquals(c.annualProduct(),ReflectionTestUtils.getField(ctx.getBean(BillingAccess.class),"annual"));
                assertEquals(!live,ctx.getBean(BillingAccess.class).testMode());
            });
        }
    }
}
