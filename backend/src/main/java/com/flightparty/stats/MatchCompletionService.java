package com.flightparty.stats;

import com.flightparty.game.GameRules;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

@Service
public class MatchCompletionService {
    private final JdbcClient db;
    private final SettlementService settlement;
    private final JsonMapper json=JsonMapper.builder().build();
    public MatchCompletionService(JdbcClient db,SettlementService settlement) { this.db=db;this.settlement=settlement; }
    @Transactional
    public boolean complete(UUID match) {
        String status=db.sql("select status from matches where id=:id for update").param("id",match).query(String.class).single();
        if(status.equals("SETTLED")) return false;
        String snapshot=db.sql("select snapshot from match_event_projection where match_id=:id").param("id",match).query(String.class).single();
        var game=json.readValue(snapshot,GameRules.State.class);
        if(game.phase()!=GameRules.Phase.OVER || game.ranking().size()!=game.players().size() || game.ranking().stream().distinct().count()!=game.players().size()) throw new IllegalStateException("incomplete final state");
        var seats=db.sql("select seat_index from match_participants where match_id=:id order by seat_index").param("id",match).query(Integer.class).list();
        if(!seats.equals(game.players().stream().map(GameRules.Player::seat).sorted().toList())) throw new IllegalStateException("participant mismatch");
        for(int i=0;i<game.ranking().size();i++) {
            int seat=game.ranking().get(i);var player=game.players().stream().filter(p->p.seat()==seat).findFirst().orElseThrow();
            if(player.rank()==null || player.rank()!=i+1 || (i<2 && player.planes().stream().anyMatch(p->p!=57))) throw new IllegalStateException("invalid final ranking");
            db.sql("update match_participants set rank=:rank,finished_planes=:finished where match_id=:id and seat_index=:seat").param("finished",player.planes().stream().filter(p->p==57).count()).param("rank",i+1).param("id",match).param("seat",seat).update();
        }
        db.sql("update matches set status='COMPLETED_PENDING' where id=:id").param("id",match).update();
        return settlement.settle(match);
    }
}
