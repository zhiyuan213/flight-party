package com.flightparty.room;

import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Advances expired matching rooms to STARTING; it does not activate a match. */
@Component
@EnableScheduling
public class MatchingDeadlineWorker {
    private static final Logger LOG=LoggerFactory.getLogger(MatchingDeadlineWorker.class);
    private final RedisRoomStore store;
    private final MatchStartService starts;
    public MatchingDeadlineWorker(RedisRoomStore store,MatchStartService starts) { this.store=store;this.starts=starts; }
    @Scheduled(fixedDelay=250)
    public void poll() {
        try {
            Instant now=Instant.now();
            for(var id:store.matching()) {
                var existing=store.load(id);if(existing.isEmpty()) continue;
                var state=existing.get();
                if(state.room().phase()!=RoomRules.Phase.MATCHING || now.isBefore(state.room().deadline())) continue;
                try { store.save(RoomRules.expire(state.room(),now),state.version()); }
                catch(IllegalStateException conflict) { /* Retry latest version on next poll. */ }
            }
            for(var id:store.starting()) {
                var existing=store.load(id);if(existing.isEmpty()) continue;
                var state=existing.get();if(state.room().phase()!=RoomRules.Phase.STARTING) continue;
                try { starts.prepare(state.room());store.activate(state); }
                catch(RuntimeException failure) { LOG.warn("Room start awaiting recovery ({})",failure.getClass().getSimpleName()); }
            }
        } catch(RuntimeException failure) {
            LOG.warn("Matching deadline polling unavailable ({})",failure.getClass().getSimpleName());
        }
    }
}
