package com.flightparty.sync;

import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;

/** Applies trusted, already validated events; a consumer must ACK only after this transaction commits. */
@Service
public class EventProjection {
    private final JdbcClient db;
    public EventProjection(JdbcClient db) { this.db = db; }
    public record Event(UUID matchId, long version, String type, String payload, String snapshot) {
        public Event {
            if (matchId == null || version <= 0 || type == null || !type.matches("[A-Z_]{1,64}") || payload == null || snapshot == null || snapshot.isEmpty())
                throw new IllegalArgumentException("invalid event");
        }
    }
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean apply(Event event) {
        db.sql("insert into match_event_projection(match_id) values (:id) on conflict do nothing")
                .param("id", event.matchId()).update();
        long current = db.sql("select version from match_event_projection where match_id=:id for update")
                .param("id", event.matchId()).query(Long.class).single();
        if (event.version() <= current) {
            var existing = db.sql("select event_type, payload, snapshot from match_events where match_id=:id and version=:version")
                    .param("id", event.matchId()).param("version", event.version())
                    .query((rs, row) -> new Stored(rs.getString(1), rs.getString(2), rs.getString(3))).optional();
            if (existing.isEmpty() || !existing.get().equals(new Stored(event.type(),event.payload(),event.snapshot())))
                throw new IllegalStateException("conflicting event replay");
            return false;
        }
        if (event.version() != current + 1) throw new IllegalStateException("event sequence gap");
        db.sql("insert into match_events(match_id,version,event_type,payload,snapshot) values (:id,:version,:type,:payload,:snapshot)")
                .param("id", event.matchId()).param("version", event.version()).param("type", event.type())
                .param("payload", event.payload()).param("snapshot", event.snapshot()).update();
        db.sql("update match_event_projection set version=:version,snapshot=:snapshot where match_id=:id")
                .param("id", event.matchId()).param("version", event.version()).param("snapshot", event.snapshot()).update();
        return true;
    }
    private record Stored(String type, String payload, String snapshot) {}
}
