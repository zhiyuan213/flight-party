package com.flightparty.billing;

import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

/** Verified inbox only. Receiving an event does not grant membership. */
@RestController
public class CreemWebhookController {
    private final JdbcClient db;private final String secret;
    private final JsonMapper json=JsonMapper.builder().build();
    public CreemWebhookController(JdbcClient db,@Value("${CREEM_WEBHOOK_SECRET:}")String secret){this.db=db;this.secret=secret;}
    @PostMapping("/api/billing/creem/webhook")
    public Map<String,String> receive(HttpServletRequest request)throws Exception{
        if(secret.isBlank())throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"billing not configured");
        byte[] raw=request.getInputStream().readNBytes(65537);
        if(raw.length>65536)throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE);
        if(!CreemSignature.verify(raw,request.getHeader("creem-signature"),secret))throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        tools.jackson.databind.JsonNode node;
        try{node=json.readTree(raw);}catch(RuntimeException invalid){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"invalid event JSON");}
        if(node==null||!node.isObject())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"invalid event JSON");
        String id=node.path("id").asText(),type=node.path("eventType").asText();
        if(id.isBlank()||id.length()>128||type.isBlank()||type.length()>128)throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        String hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(raw));
        db.sql("insert into creem_webhook_inbox(event_id,event_type,payload_hash,payload) values (:id,:type,:hash,:payload) on conflict do nothing")
                .param("id",id).param("type",type).param("hash",hash).param("payload",new String(raw,StandardCharsets.UTF_8)).update();
        String stored=db.sql("select payload_hash from creem_webhook_inbox where event_id=:id").param("id",id).query(String.class).single();
        if(!hash.equals(stored))throw new ResponseStatusException(HttpStatus.CONFLICT,"event content conflict");
        return Map.of("status","received");
    }
}
