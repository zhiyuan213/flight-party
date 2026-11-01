package com.flightparty.auth;

import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** A live guest seat can gain one immutable score owner, never a client score. */
@Service
public class MidgameAccountService {
    private final JdbcClient db;
    public MidgameAccountService(JdbcClient db){this.db=db;}
    @Transactional
    public boolean bind(UUID match,UUID principal,UUID account){
        String status=db.sql("select status from matches where id=:id for update").param("id",match).query(String.class).optional().orElse("");
        if(!status.equals("PREPARED"))return false;
        // Also reject a final state already projected but not yet settled.
        var snapshot=db.sql("select snapshot from match_event_projection where match_id=:id").param("id",match).query(String.class).optional();
        if(snapshot.isPresent() && "OVER".equals(tools.jackson.databind.json.JsonMapper.builder().build().readTree(snapshot.get()).path("phase").asText()))return false;
        return db.sql("update match_participants set score_account_id=:account where match_id=:match and principal_id=:principal and not native_bot and account_id_at_start is null and score_account_id is null and not exists (select 1 from match_participants other where other.match_id=:match and coalesce(other.account_id_at_start,other.score_account_id)=:account)")
            .param("account",account).param("match",match).param("principal",principal).update()==1;
    }
}
