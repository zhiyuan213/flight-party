package com.flightparty.sync;

import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.connection.stream.Consumer;
import org.springframework.data.redis.connection.stream.ReadOffset;
import org.springframework.data.redis.connection.stream.StreamOffset;
import org.springframework.data.redis.connection.stream.StreamReadOptions;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Single-instance worker. A stable consumer name recovers its pending records after restart. */
@Component
@EnableScheduling
@ConditionalOnProperty(name="flightparty.events.enabled",havingValue="true")
public class EventConsumer {
    private static final Logger LOG=LoggerFactory.getLogger(EventConsumer.class);
    private static final String GROUP="pg-projection", WORKER="single-instance";
    private final StringRedisTemplate redis;
    private final EventStreamProjector projector;
    public EventConsumer(StringRedisTemplate redis, EventStreamProjector projector) { this.redis=redis;this.projector=projector; }
    @Scheduled(fixedDelay=100)
    public void poll() {
        for(int shard=-1;shard<16;shard++) {
            String stream=shard<0?"fp:{rooms}:events":"fp:{s%02d}:events".formatted(shard);
            try {
                ensureGroup(stream);
                var ops=redis.<String,String>opsForStream();
                var records=ops.read(Consumer.from(GROUP,WORKER),StreamReadOptions.empty().count(50),StreamOffset.create(stream,ReadOffset.from("0")));
                if(records==null || records.isEmpty()) records=ops.read(Consumer.from(GROUP,WORKER),StreamReadOptions.empty().count(50),StreamOffset.create(stream,ReadOffset.lastConsumed()));
                if(records!=null) for(var record:records) projector.process(GROUP,record);
            } catch(RuntimeException failure) {
                // Stop this shard before later records; leave the failed record pending.
                LOG.warn("Event projection paused for shard {} ({})",shard,failure.getClass().getSimpleName());
            }
        }
    }
    private void ensureGroup(String stream) {
        try {
            redis.execute((RedisCallback<Object>) connection -> connection.execute("XGROUP",bytes("CREATE"),bytes(stream),bytes(GROUP),bytes("0"),bytes("MKSTREAM")));
        } catch(RuntimeException failure) {
            Throwable cause=failure;boolean exists=false;
            while(cause!=null) { if(cause.getMessage()!=null && cause.getMessage().contains("BUSYGROUP")) exists=true;cause=cause.getCause(); }
            if(!exists) throw failure;
        }
    }
    private static byte[] bytes(String value) { return value.getBytes(StandardCharsets.UTF_8); }
}
