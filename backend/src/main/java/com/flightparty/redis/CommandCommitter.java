package com.flightparty.redis;

import java.util.List;
import java.util.UUID;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

/** Storage primitive only: authorization and rule validation must precede this call. */
@Component
public class CommandCommitter {
    private final StringRedisTemplate redis;
    private final DefaultRedisScript<List> script;
    public CommandCommitter(StringRedisTemplate redis) {
        this.redis = redis;
        script = new DefaultRedisScript<>();
        script.setLocation(new ClassPathResource("redis/commit-command.lua"));
        script.setResultType(List.class);
    }
    public List<?> commit(int shard, UUID matchId, UUID principalId, UUID commandId, long expectedVersion,
                          String requestHash, String snapshot, String response, String eventType,
                          String eventPayload, Long dueAtMillis) {
        if (shard < 0 || shard >= 16 || matchId == null || principalId == null || commandId == null
                || expectedVersion < 0 || expectedVersion >= 9007199254740991L
                || requestHash == null || !requestHash.matches("[0-9a-f]{64}")
                || snapshot == null || snapshot.isEmpty() || response == null || eventPayload == null
                || eventType == null || !eventType.matches("[A-Z_]{1,64}")
                || (dueAtMillis != null && dueAtMillis < 0)) throw new IllegalArgumentException("invalid command commit");
        String prefix = "fp:{s%02d}:".formatted(shard);
        var keys = List.of(prefix + "match:" + matchId, prefix + "receipt:" + principalId + ":" + commandId,
                prefix + "events", prefix + "due");
        return redis.execute(script, keys, Long.toString(expectedVersion), requestHash, snapshot, response,
                eventType, eventPayload, matchId.toString(), dueAtMillis == null ? "" : dueAtMillis.toString());
    }
}
