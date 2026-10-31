package com.flightparty.stats;

import java.util.UUID;
import com.flightparty.room.RedisRoomStore;
import com.flightparty.room.RoomRules;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class MatchCompletionWorker {
    private static final Logger LOG=LoggerFactory.getLogger(MatchCompletionWorker.class);
    private final JdbcClient db;private final MatchCompletionService completion;
    private final RedisRoomStore rooms;
    public MatchCompletionWorker(JdbcClient db,MatchCompletionService completion,RedisRoomStore rooms) { this.db=db;this.completion=completion;this.rooms=rooms; }
    @Scheduled(fixedDelay=500)
    public void poll() {
        try {
            var ids=db.sql("select m.id from matches m join match_event_projection p on p.match_id=m.id where m.status<>'SETTLED' and p.snapshot::jsonb->>'phase'='OVER' order by m.started_at limit 50").query(UUID.class).list();
            for(var id:ids) {
                try { completion.complete(id); }
                catch(RuntimeException failure) { LOG.warn("Match completion awaiting recovery ({})",failure.getClass().getSimpleName()); }
            }
            var releases=db.sql("select id from matches where status='SETTLED' and not redis_released order by settled_at limit 50").query(UUID.class).list();
            for(var id:releases) {
                try {
                    var state=rooms.load(id).orElseThrow();var room=state.room();
                    if(room.phase()!=RoomRules.Phase.SETTLED) {
                        if(room.phase()!=RoomRules.Phase.PLAYING) throw new IllegalStateException("unexpected room phase");
                        rooms.save(new RoomRules.Room(room.id(),RoomRules.Phase.SETTLED,room.seats(),room.deadline()),state.version());
                    }
                    db.sql("update matches set redis_released=true where id=:id and status='SETTLED'").param("id",id).update();
                } catch(RuntimeException failure) { LOG.warn("Settled room release awaiting recovery ({})",failure.getClass().getSimpleName()); }
            }
        } catch(RuntimeException failure) { LOG.warn("Completion polling unavailable ({})",failure.getClass().getSimpleName()); }
    }
}
