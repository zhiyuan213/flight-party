package com.flightparty.room;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.json.JsonMapper;

/** Versioned storage primitive; occupancy and matching coordination must be committed separately by the future coordinator. */
@Repository
public class RedisRoomStore {
    private final StringRedisTemplate redis;
    private final JsonMapper json=JsonMapper.builder().build();
    private static final DefaultRedisScript<Long> SAVE=new DefaultRedisScript<>("""
        local t=redis.call('TYPE',KEYS[1]).ok
        if t~='none' and t~='hash' then return -2 end
        local current=redis.call('HGET',KEYS[1],'version')
        if ARGV[1]=='-1' then
          if current then return -1 end
        elseif not current or current~=ARGV[1] then return -1 end
        local it=redis.call('TYPE',KEYS[2]).ok
        if it~='none' and it~='hash' then return -2 end
        local mt=redis.call('TYPE',KEYS[3]).ok
        if mt~='none' and mt~='zset' then return -2 end
        local st=redis.call('TYPE',KEYS[4]).ok
        if st~='none' and st~='zset' then return -2 end
        local pt=redis.call('TYPE',KEYS[5]).ok
        if pt~='none' and pt~='zset' then return -2 end
        local room=cjson.decode(ARGV[2])
        for _,seat in ipairs(room.seats) do
          if not seat.bot and room.phase~='CLOSED' and room.phase~='SETTLED' then
            local occupied=redis.call('HGET',KEYS[2],seat.principal)
            if occupied and occupied~=ARGV[3] then return -3 end
          end
        end
        local old=redis.call('HGET',KEYS[1],'snapshot')
        if old then
          for _,seat in ipairs(cjson.decode(old).seats) do
            if not seat.bot and redis.call('HGET',KEYS[2],seat.principal)==ARGV[3] then redis.call('HDEL',KEYS[2],seat.principal) end
          end
        end
        if room.phase~='CLOSED' and room.phase~='SETTLED' then
          for _,seat in ipairs(room.seats) do if not seat.bot then redis.call('HSET',KEYS[2],seat.principal,ARGV[3]) end end
        end
        local next=tonumber(ARGV[1])+1
        redis.call('HSET',KEYS[1],'version',next,'snapshot',ARGV[2])
        if room.phase=='MATCHING' then redis.call('ZADD',KEYS[3],ARGV[4],ARGV[3]) else redis.call('ZREM',KEYS[3],ARGV[3]) end
        if room.phase=='STARTING' then redis.call('ZADD',KEYS[4],0,ARGV[3]) else redis.call('ZREM',KEYS[4],ARGV[3]) end
        if room.phase~='PLAYING' then redis.call('ZREM',KEYS[5],ARGV[3]) end
        return next
        """,Long.class);
    public record Stored(long version,RoomRules.Room room) {}
    public RedisRoomStore(StringRedisTemplate redis) { this.redis=redis; }
    public Stored save(RoomRules.Room room,long expectedVersion) {
        if(expectedVersion < -1 || expectedVersion>=9007199254740991L) throw new IllegalArgumentException("invalid version");
        Long result=redis.execute(SAVE,List.of(key(room.id()),"fp:{rooms}:active","fp:{rooms}:matching","fp:{rooms}:starting","fp:{rooms}:playing"),Long.toString(expectedVersion),json.writeValueAsString(room),room.id().toString(),room.deadline()==null?"0":Long.toString(room.deadline().toEpochMilli()));
        if(result==null || result<0) throw new IllegalStateException("room write conflict");
        return new Stored(result,room);
    }
    public Optional<Stored> load(UUID id) {
        var fields=redis.opsForHash().entries(key(id));
        if(fields.isEmpty()) return Optional.empty();
        return Optional.of(new Stored(Long.parseLong(fields.get("version").toString()),json.readValue(fields.get("snapshot").toString(),RoomRules.Room.class)));
    }
    public Optional<UUID> active(UUID principal) {
        Object id=redis.opsForHash().get("fp:{rooms}:active",principal.toString());
        return id==null?Optional.empty():Optional.of(UUID.fromString(id.toString()));
    }
    public List<UUID> matching() {
        var ids=redis.opsForZSet().range("fp:{rooms}:matching",0,99);
        return ids==null?List.of():ids.stream().map(UUID::fromString).toList();
    }
    public List<UUID> starting() {
        var ids=redis.opsForZSet().range("fp:{rooms}:starting",0,99);
        return ids==null?List.of():ids.stream().map(UUID::fromString).toList();
    }
    private static final DefaultRedisScript<Long> ACTIVATE=new DefaultRedisScript<>("""
        if redis.call('TYPE',KEYS[1]).ok~='hash' then return -1 end
        local st=redis.call('TYPE',KEYS[2]).ok
        if st~='none' and st~='zset' then return -1 end
        local pt=redis.call('TYPE',KEYS[3]).ok
        if pt~='none' and pt~='zset' then return -1 end
        if redis.call('HGET',KEYS[1],'version')~=ARGV[1] then return -1 end
        if cjson.decode(redis.call('HGET',KEYS[1],'snapshot')).phase~='STARTING' then return -1 end
        redis.call('HSET',KEYS[1],'snapshot',ARGV[2],'game',ARGV[3],'matchId',ARGV[4],'version',tonumber(ARGV[1])+1,'actionDeadline',ARGV[5])
        redis.call('ZREM',KEYS[2],ARGV[4])
        redis.call('ZADD',KEYS[3],0,ARGV[4])
        return 1
        """,Long.class);
    public boolean activate(Stored stored) {
        var room=stored.room();
        var playing=new RoomRules.Room(room.id(),RoomRules.Phase.PLAYING,room.seats(),room.deadline());
        var game=com.flightparty.game.GameRules.start(room.seats().stream().map(RoomRules.Seat::index).toList());
        return Long.valueOf(1).equals(redis.execute(ACTIVATE,List.of(key(room.id()),"fp:{rooms}:starting","fp:{rooms}:playing"),Long.toString(stored.version()),json.writeValueAsString(playing),json.writeValueAsString(game),room.id().toString(),Long.toString(System.currentTimeMillis()+15000)));
    }
    public com.flightparty.game.GameRules.State game(UUID id) {
        Object value=redis.opsForHash().get(key(id),"game");
        if(value==null) throw new IllegalStateException("match not active");
        return json.readValue(value.toString(),com.flightparty.game.GameRules.State.class);
    }
    public List<UUID> playing() {
        var ids=redis.opsForZSet().range("fp:{rooms}:playing",0,99);
        return ids==null?List.of():ids.stream().map(UUID::fromString).toList();
    }
    private static String key(UUID id) { return "fp:{rooms}:room:"+id; }
}
