package com.flightparty.room;



import java.util.HashMap;
import java.util.HashSet;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Durable initial-match start ledger. Redis activation must follow successful commit. */
@Service
public class MatchStartService {
    private final JdbcClient db;
    public MatchStartService(JdbcClient db) { this.db=db; }
    @Transactional
    public UUID prepare(RoomRules.Room room) {
        if(room.phase()!=RoomRules.Phase.STARTING || room.seats().size()!=4 || room.seats().stream().allMatch(RoomRules.Seat::bot))
            throw new IllegalArgumentException("room not ready to start");
        // Initial match uses room UUID as durable idempotency key; rematches require a new key.
        UUID match=room.id();
        var principals=room.seats().stream().filter(s->!s.bot()).map(RoomRules.Seat::principal).sorted().toList();
        var accounts=new HashMap<UUID,UUID>();var uniqueAccounts=new HashSet<UUID>();
        for(UUID principal:principals) {
            UUID account=db.sql("select account_id from principals where id=:id for update").param("id",principal)
                    .query((rs,row)->new Account(rs.getObject(1,UUID.class))).single().id();
            if(account!=null) {
                if(!uniqueAccounts.add(account)) throw new IllegalStateException("duplicate participating account");
                accounts.put(principal,account);
            }
        }
        var existing=db.sql("select room_id from matches where id=:id").param("id",match).query(UUID.class).optional();
        if(existing.isPresent()) {
            if(!existing.get().equals(room.id())) throw new IllegalStateException("start key conflict");
            return match;
        }
        db.sql("insert into matches(id,room_id,status,rules_version,started_at) values (:id,:room,'PREPARED',:rules,now())")
                .param("id",match).param("room",room.id()).param("rules",com.flightparty.stats.MatchScoring.VERSION).update();
        for(var seat:room.seats()) {
            db.sql("insert into match_participants(match_id,seat_index,principal_id,account_id_at_start,native_bot) values (:match,:seat,:principal,:account,:bot)")
                    .param("match",match).param("seat",seat.index()).param("principal",seat.principal()).param("account",accounts.get(seat.principal())).param("bot",seat.bot()).update();
        }
        return match;
    }
    private record Account(UUID id) {}
}
