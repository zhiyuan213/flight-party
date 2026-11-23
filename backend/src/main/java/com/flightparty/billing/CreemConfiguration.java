package com.flightparty.billing;

import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/** Selects one complete credential set for every billing operation. Never logs secrets. */
@Component
public final class CreemConfiguration {
    private final boolean live;
    private final String apiKey,webhookSecret,monthlyProduct,annualProduct,successUrl;
    public CreemConfiguration(Environment env){
        live=env.getProperty("CREEM_LIVE",Boolean.class,false);
        String[] suffixes={"API_KEY","WEBHOOK_SECRET","MONTHLY_PRODUCT_ID","ANNUAL_PRODUCT_ID"};
        boolean grouped=false;
        for(String mode:new String[]{"PROD","TEST"})for(String suffix:suffixes)
            grouped|=!env.getProperty("CREEM_"+mode+"_"+suffix,"").isBlank();
        String prefix=grouped?"CREEM_"+(live?"PROD_":"TEST_"):"CREEM_";
        apiKey=env.getProperty(prefix+"API_KEY","");
        webhookSecret=env.getProperty(prefix+"WEBHOOK_SECRET","");
        monthlyProduct=env.getProperty(prefix+"MONTHLY_PRODUCT_ID","");
        annualProduct=env.getProperty(prefix+"ANNUAL_PRODUCT_ID","");
        successUrl=env.getProperty("CREEM_SUCCESS_URL","");
        if(grouped){
            if(apiKey.isBlank()||webhookSecret.isBlank()||monthlyProduct.isBlank()||annualProduct.isBlank())
                throw new IllegalStateException("Selected Creem configuration is incomplete; refusing credential fallback");
            if(live==apiKey.startsWith("creem_test_"))
                throw new IllegalStateException("Selected Creem API key does not match CREEM_LIVE");
            if(monthlyProduct.equals(annualProduct))
                throw new IllegalStateException("Creem monthly and annual products must differ");
        }
    }
    public boolean live(){return live;}
    public String apiKey(){return apiKey;}
    public String webhookSecret(){return webhookSecret;}
    public String monthlyProduct(){return monthlyProduct;}
    public String annualProduct(){return annualProduct;}
    public String successUrl(){return successUrl;}
}
