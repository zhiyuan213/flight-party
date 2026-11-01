package com.flightparty.stats;

import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Internal ledger operation. No client-facing score submission endpoint exists. */
@Service
public class SettlementService {
    private final JdbcClient db;
    public SettlementService(JdbcClient db) { this.db = db; }

    @Transactional
    public boolean settle(UUID matchId) {
        var status = db.sql("select status from matches where id = :id for update")
                .param("id", matchId).query(String.class).optional().orElseThrow();
        if (status.equals("SETTLED")) return false;
        if (!status.equals("COMPLETED_PENDING")) throw new IllegalStateException("match is not ready for settlement");
        var participants = db.sql("select seat_index, coalesce(account_id_at_start,score_account_id), rank from match_participants where match_id = :id order by seat_index")
                .param("id", matchId).query((rs, row) -> new Participant(rs.getInt(1), rs.getObject(2, UUID.class), (Integer) rs.getObject(3, Integer.class))).list();
        validateRanks(participants);
        for(var account:participants.stream().map(Participant::accountId).filter(java.util.Objects::nonNull).distinct().sorted().toList())
            db.sql("select id from accounts where id=:id for update").param("id",account).query(UUID.class).single();
        for (var p : participants) {
            int points = switch (p.rank()) { case 1 -> 2; case 2 -> 1; default -> -1; };
            db.sql("update match_participants set points_delta=:points where match_id=:match and seat_index=:seat")
                    .param("points", points).param("match", matchId).param("seat", p.seat()).update();
            if (p.accountId() == null) continue;
            boolean member=db.sql("select count(*) from membership_entitlements where account_id=:id and provider='creem' and status='ACTIVE' and valid_until>now()")
                    .param("id",p.accountId()).query(Long.class).single()>0;
            boolean recorded=member;
            if(!member)recorded=db.sql("insert into score_daily_usage(account_id,usage_day,match_id) values (:account,(now() at time zone 'UTC')::date,:match) on conflict do nothing")
                    .param("account",p.accountId()).param("match",matchId).update()==1;
            db.sql("insert into score_recording_decisions(match_id,account_id,recorded,reason) values (:match,:account,:recorded,:reason)")
                    .param("match",matchId).param("account",p.accountId()).param("recorded",recorded).param("reason",member?"MEMBER":recorded?"FREE_DAILY":"DAILY_LIMIT").update();
            if(!recorded)continue;
            db.sql("insert into account_match_results(match_id,account_id,seat_index,rank,points_delta) values (:match,:account,:seat,:rank,:points)")
                    .param("match", matchId).param("account", p.accountId()).param("seat", p.seat()).param("rank", p.rank()).param("points", points).update();
            long version = db.sql("insert into account_statistics(account_id,points,completed_games,stats_version) values (:account,:points,1,1) on conflict(account_id) do update set points=account_statistics.points+excluded.points, completed_games=account_statistics.completed_games+1, stats_version=account_statistics.stats_version+1 returning stats_version")
                    .param("account", p.accountId()).param("points", points).query(Long.class).single();
            db.sql("insert into statistics_outbox(account_id,stats_version) values (:account,:version)")
                    .param("account", p.accountId()).param("version", version).update();
        }
        db.sql("update matches set status='SETTLED', settled_at=now() where id=:id").param("id", matchId).update();
        return true;
    }
    private static void validateRanks(List<Participant> ps) {
        if (ps.size() < 2 || ps.size() > 4 || ps.stream().anyMatch(p -> p.rank() == null || p.rank() < 1 || p.rank() > ps.size()) || ps.stream().map(Participant::rank).distinct().count() != ps.size())
            throw new IllegalStateException("incomplete or invalid server rankings");
    }
    private record Participant(int seat, UUID accountId, Integer rank) {}
}
