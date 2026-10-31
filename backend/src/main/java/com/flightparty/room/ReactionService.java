package com.flightparty.room;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;
import tools.jackson.databind.json.JsonMapper;

@Service
public class ReactionService {
    private final StringRedisTemplate redis;private final JsonMapper json=JsonMapper.builder().build();
    private static final Set<String> EMOJIS=Set.of("😂","👋","🎉","😮","❤️");
    public record Reaction(String eventId,int seat,String emoji,long createdAt) {}
    private static final DefaultRedisScript<String> SEND=new DefaultRedisScript<>("""
        local old=redis.call('GET',KEYS[2])
        if old then return old end
        local kind=redis.call('TYPE',KEYS[1]).ok
        if kind~='none' and kind~='list' then return 'CONFLICT' end
        redis.call('LPUSH',KEYS[1],ARGV[1]);redis.call('LTRIM',KEYS[1],0,19);redis.call('EXPIRE',KEYS[1],60)
        redis.call('SET',KEYS[2],ARGV[1],'EX',60)
        return ARGV[1]
        """,String.class);
    public ReactionService(StringRedisTemplate redis){this.redis=redis;}
    public Reaction send(UUID room,UUID principal,int seat,UUID command,String emoji){
        if(command==null||emoji==null||!EMOJIS.contains(emoji))throw new IllegalArgumentException("invalid reaction");
        var event=new Reaction(UUID.randomUUID().toString(),seat,emoji,System.currentTimeMillis());
        String value=redis.execute(SEND,List.of(key(room),"fp:{rooms}:reaction:"+room+":"+principal+":"+command),json.writeValueAsString(event));
        if(value==null||value.equals("CONFLICT"))throw new IllegalStateException("reaction unavailable");
        var result=json.readValue(value,Reaction.class);if(!result.emoji().equals(emoji))throw new IllegalStateException("command conflict");return result;
    }
    public List<Reaction> recent(UUID room){
        var values=redis.opsForList().range(key(room),0,19);
        return values==null?List.of():values.stream().map(v->json.readValue(v,Reaction.class)).filter(r->System.currentTimeMillis()-r.createdAt()<5000).toList();
    }
    private static String key(UUID room){return "fp:{rooms}:reactions:"+room;}
}
