package com.flightparty.sync;

import java.util.Map;
import java.util.UUID;
import org.springframework.data.redis.connection.stream.MapRecord;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

/** Projects a delivered record; scheduling, pending reclamation and shard ownership are separate. */
@Service
public class EventStreamProjector {
    private final EventProjection projection;
    private final StringRedisTemplate redis;
    public EventStreamProjector(EventProjection projection, StringRedisTemplate redis) {
        this.projection = projection; this.redis = redis;
    }
    public void process(String group, MapRecord<String, String, String> record) {
        Map<String, String> fields = record.getValue();
        var event = new EventProjection.Event(UUID.fromString(fields.get("matchId")), Long.parseLong(fields.get("version")),
                fields.get("type"), fields.get("payload"), fields.get("snapshot"));
        projection.apply(event);
        redis.opsForStream().acknowledge(record.getStream(), group, record.getId());
    }
}
