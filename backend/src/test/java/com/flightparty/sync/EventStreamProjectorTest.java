package com.flightparty.sync;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.connection.stream.StreamRecords;
import org.springframework.data.redis.core.StreamOperations;
import org.springframework.data.redis.core.StringRedisTemplate;

class EventStreamProjectorTest {
    @Test void failureLeavesMessagePending() {
        var projection = mock(EventProjection.class);
        var redis = mock(StringRedisTemplate.class);
        var ops = mock(StreamOperations.class);
        when(redis.opsForStream()).thenReturn(ops);
        var record = StreamRecords.mapBacked(Map.of("matchId",UUID.randomUUID().toString(),"version","1","type","MOVE","payload","{}","snapshot","{}"))
                .withStreamKey("events").withId(RecordId.of("1-0"));
        when(projection.apply(any())).thenThrow(new IllegalStateException("gap"));
        assertThrows(IllegalStateException.class, () -> new EventStreamProjector(projection,redis).process("group",record));
        verifyNoInteractions(ops);
    }
}
