package com.flightparty.room;

import com.flightparty.game.GameRules;
import com.flightparty.game.ServerDie;
import java.util.List;
import java.util.UUID;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;
import tools.jackson.databind.json.JsonMapper;

@Service
public class RoomRollService {
    private final RedisRoomStore rooms;
    private final StringRedisTemplate redis;
    private final ServerDie die=new ServerDie();
    private final JsonMapper json=JsonMapper.builder().build();
    private static final DefaultRedisScript<String> COMMIT=new DefaultRedisScript<>("""
        local rt=redis.call('TYPE',KEYS[2]).ok
        local et=redis.call('TYPE',KEYS[3]).ok
        if rt~='none' and rt~='string' then return 'CONFLICT' end
        if et~='none' and et~='stream' then return 'CONFLICT' end
        local receipt=redis.call('GET',KEYS[2])
        if receipt then return receipt end
        if redis.call('HGET',KEYS[1],'game')~=ARGV[1] then return 'CONFLICT' end
        local version=tonumber(redis.call('HGET',KEYS[1],'gameVersion') or '0')
        if not version or version<0 or version>=9007199254740991 then return 'CONFLICT' end
        version=version+1
        local game=cjson.decode(ARGV[2])
        local deadline=0
        if game.phase=='CHOOSE' then deadline=tonumber(ARGV[3])+15000 end
        if game.phase=='ROLL' then deadline=tonumber(ARGV[7])+15000 end
        redis.call('HSET',KEYS[1],'game',ARGV[2],'busyUntil',ARGV[3],'gameVersion',version,'actionDeadline',deadline)
        redis.call('SET',KEYS[2],ARGV[4])
        redis.call('XADD',KEYS[3],'*','matchId',ARGV[5],'version',version,'type',ARGV[6],'payload',ARGV[4],'snapshot',ARGV[2])
        return ARGV[4]
        """,String.class);
    public record Result(GameRules.State game,long busyUntil) {}
    public RoomRollService(RedisRoomStore rooms,StringRedisTemplate redis) { this.rooms=rooms;this.redis=redis; }
    public synchronized Result roll(UUID roomId,UUID principal,UUID commandId) {
        if(commandId==null) throw new IllegalArgumentException("commandId required");
        var room=rooms.load(roomId).orElseThrow().room();
        var seat=room.seats().stream().filter(s->principal.equals(s.principal())).findFirst().orElseThrow();
        if(room.phase()!=RoomRules.Phase.PLAYING) throw new IllegalStateException("not playing");
        String key="fp:{rooms}:room:"+roomId;
        String receipt="fp:{rooms}:roll:"+roomId+":"+principal+":"+commandId;
        String saved=redis.opsForValue().get(receipt);
        if(saved!=null) return json.readValue(saved,Result.class);
        String old=(String)redis.opsForHash().get(key,"game");
        var game=json.readValue(old,GameRules.State.class);
        if(game.turn()!=seat.index()) throw new IllegalStateException("not your turn");
        var next=GameRules.roll(game,die.roll());
        long busy=System.currentTimeMillis()+1120;
        var result=new Result(next,busy);
        String response=redis.execute(COMMIT,List.of(key,receipt,"fp:{rooms}:events"),old,json.writeValueAsString(next),Long.toString(busy),json.writeValueAsString(result),roomId.toString(),"DICE_ROLLED",Long.toString(System.currentTimeMillis()));
        if(response==null || response.equals("CONFLICT")) throw new IllegalStateException("state conflict");
        return json.readValue(response,Result.class);
    }
    public record MoveResult(int plane,GameRules.Move move,long busyUntil) {}
    public synchronized MoveResult move(UUID roomId,UUID principal,UUID commandId,int plane) {
        if(commandId==null || plane<0 || plane>1) throw new IllegalArgumentException("invalid move command");
        var room=rooms.load(roomId).orElseThrow().room();
        var seat=room.seats().stream().filter(s->principal.equals(s.principal())).findFirst().orElseThrow();
        if(room.phase()!=RoomRules.Phase.PLAYING) throw new IllegalStateException("not playing");
        String key="fp:{rooms}:room:"+roomId;
        String receipt="fp:{rooms}:move:"+roomId+":"+principal+":"+commandId;
        String saved=redis.opsForValue().get(receipt);
        if(saved!=null) {
            var replay=json.readValue(saved,MoveResult.class);
            if(replay.plane()!=plane) throw new IllegalStateException("command conflict");
            return replay;
        }
        Object busy=redis.opsForHash().get(key,"busyUntil");
        if(busy!=null && System.currentTimeMillis()<Long.parseLong(busy.toString())) throw new IllegalStateException("dice animation active");
        String old=(String)redis.opsForHash().get(key,"game");
        var game=json.readValue(old,GameRules.State.class);
        if(game.turn()!=seat.index()) throw new IllegalStateException("not your turn");
        var move=GameRules.move(game,plane);
        int steps=move.to()-move.from();
        long duration=(long)Math.ceil(steps*Math.max(100,Math.min(175,1250.0/steps)))+(move.captures().isEmpty()?130:1660);
        long until=System.currentTimeMillis()+duration;
        var result=new MoveResult(plane,move,until);
        String response=redis.execute(COMMIT,List.of(key,receipt,"fp:{rooms}:events"),old,json.writeValueAsString(move.state()),Long.toString(until),json.writeValueAsString(result),roomId.toString(),"MOVE_RESOLVED",Long.toString(System.currentTimeMillis()));
        if(response==null || response.equals("CONFLICT")) throw new IllegalStateException("state conflict");
        var committed=json.readValue(response,MoveResult.class);
        if(committed.plane()!=plane) throw new IllegalStateException("command conflict");
        return committed;
    }
    public synchronized void advance(UUID roomId) {
        String key="fp:{rooms}:room:"+roomId;
        Object busy=redis.opsForHash().get(key,"busyUntil");
        if(busy==null || System.currentTimeMillis()<Long.parseLong(busy.toString())) return;
        String old=(String)redis.opsForHash().get(key,"game");if(old==null) return;
        var game=json.readValue(old,GameRules.State.class);
        if(game.phase()!=GameRules.Phase.ANIMATING) return;
        var next=GameRules.advance(game);var result=new Result(next,0);
        String receipt="fp:{rooms}:advance:"+roomId+":"+UUID.nameUUIDFromBytes(old.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        redis.execute(COMMIT,List.of(key,receipt,"fp:{rooms}:events"),old,json.writeValueAsString(next),"0",json.writeValueAsString(result),roomId.toString(),"TURN_CHANGED",Long.toString(System.currentTimeMillis()));
    }
    public synchronized void automate(UUID roomId) {
        String key="fp:{rooms}:room:"+roomId;long now=System.currentTimeMillis();
        String old=(String)redis.opsForHash().get(key,"game");if(old==null) return;
        var game=json.readValue(old,GameRules.State.class);
        if(game.phase()!=GameRules.Phase.ROLL && game.phase()!=GameRules.Phase.CHOOSE) return;
        Object busy=redis.opsForHash().get(key,"busyUntil");
        if(busy!=null && now<Long.parseLong(busy.toString())) return;
        var room=rooms.load(roomId).orElseThrow().room();
        boolean bot=room.seats().stream().anyMatch(s->s.index()==game.turn()&&s.bot());
        boolean onlyMove=game.phase()==GameRules.Phase.CHOOSE && GameRules.legal(game).size()==1;
        Object deadline=redis.opsForHash().get(key,"actionDeadline");
        if(!bot && !onlyMove && (deadline==null || now<Long.parseLong(deadline.toString()))) return;
        GameRules.State next;long until;Object response;String type;
        if(game.phase()==GameRules.Phase.ROLL) {
            next=GameRules.roll(game,die.roll());until=now+1120;response=new Result(next,until);type="DICE_ROLLED";
        } else {
            int plane=GameRules.botChoice(game);var move=GameRules.move(game,plane);next=move.state();
            int steps=move.to()-move.from();until=now+(long)Math.ceil(steps*Math.max(100,Math.min(175,1250.0/steps)))+(move.captures().isEmpty()?130:1660);
            response=new MoveResult(plane,move,until);type="MOVE_RESOLVED";
        }
        String receipt="fp:{rooms}:auto:"+roomId+":"+UUID.nameUUIDFromBytes(old.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        redis.execute(COMMIT,List.of(key,receipt,"fp:{rooms}:events"),old,json.writeValueAsString(next),Long.toString(until),json.writeValueAsString(response),roomId.toString(),type,Long.toString(now));
    }
}
