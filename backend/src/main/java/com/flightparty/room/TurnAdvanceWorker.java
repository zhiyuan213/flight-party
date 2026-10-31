package com.flightparty.room;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class TurnAdvanceWorker {
    private static final Logger LOG=LoggerFactory.getLogger(TurnAdvanceWorker.class);
    private final RedisRoomStore rooms;
    private final RoomRollService commands;
    public TurnAdvanceWorker(RedisRoomStore rooms,RoomRollService commands) { this.rooms=rooms;this.commands=commands; }
    @Scheduled(fixedDelay=100)
    public void poll() {
        try { for(var id:rooms.playing()) { commands.advance(id);commands.automate(id); } }
        catch(RuntimeException failure) { LOG.warn("Turn advancement unavailable ({})",failure.getClass().getSimpleName()); }
    }
}
