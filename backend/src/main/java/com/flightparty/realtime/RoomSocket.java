package com.flightparty.realtime;

import com.flightparty.room.*;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.time.Instant;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.session.Session;
import org.springframework.session.SessionRepository;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import tools.jackson.databind.json.JsonMapper;

/** Read-only room snapshots. Writes continue through CSRF-protected REST. */
@Component
public class RoomSocket extends TextWebSocketHandler {
    private final RedisRoomStore rooms;
    private final SessionRepository<? extends Session> sessions;
    private final StringRedisTemplate redis;
    private final ReactionService reactions;
    private final JsonMapper json=JsonMapper.builder().build();
    private final Map<String,Subscription> subscriptions=new ConcurrentHashMap<>();
    private record Subscription(WebSocketSession socket,String sessionId,UUID principal,UUID room) {}
    private static class AccessDenied extends RuntimeException {}
    public record Subscribe(String type,UUID roomId) {}
    public RoomSocket(RedisRoomStore rooms,SessionRepository<? extends Session> sessions,StringRedisTemplate redis,ReactionService reactions) { this.rooms=rooms;this.sessions=sessions;this.redis=redis;this.reactions=reactions; }
    @Override public void afterConnectionEstablished(WebSocketSession socket) { socket.setTextMessageSizeLimit(4096); }
    @Override protected void handleTextMessage(WebSocketSession socket,TextMessage message) throws Exception {
        String sessionId=(String)socket.getAttributes().get("sessionId");
        var session=sessions.findById(sessionId);
        if(session==null || session.getAttribute("flightparty.principal")==null) { socket.close(CloseStatus.POLICY_VIOLATION);return; }
        UUID principal=UUID.fromString(session.getAttribute("flightparty.principal"));
        Subscribe input;
        try { input=json.readValue(message.getPayload(),Subscribe.class); }
        catch(RuntimeException invalid) { socket.close(CloseStatus.BAD_DATA);return; }
        if(!"SUBSCRIBE".equals(input.type()) || input.roomId()==null) { socket.close(CloseStatus.BAD_DATA);return; }
        var room=rooms.load(input.roomId());
        if(room.isEmpty() || room.get().room().seats().stream().noneMatch(s->principal.equals(s.principal()))) { socket.close(CloseStatus.POLICY_VIOLATION);return; }
        subscriptions.put(socket.getId(),new Subscription(new ConcurrentWebSocketSessionDecorator(socket,5000,65536),sessionId,principal,input.roomId()));
    }
    @Scheduled(fixedDelay=250)
    public void publish() {
        for(var entry:subscriptions.entrySet()) {
            var sub=entry.getValue();
            try {
                var session=sessions.findById(sub.sessionId());
                if(session==null || !sub.principal().toString().equals(session.getAttribute("flightparty.principal"))) throw new AccessDenied();
                var stored=rooms.load(sub.room()).orElseThrow(AccessDenied::new);
                if(stored.room().seats().stream().noneMatch(s->sub.principal().equals(s.principal())))throw new AccessDenied();
                var view=RoomSnapshot.forMember(stored.room(),sub.principal(),Instant.now());
                var fields=redis.opsForHash().entries("fp:{rooms}:room:"+sub.room());
                String game=(String)fields.get("game");
                sub.socket().sendMessage(new TextMessage(json.writeValueAsString(Map.of("reactions",reactions.recent(sub.room()),"type","SNAPSHOT","room",view,"version",stored.version(),"gameVersion",fields.getOrDefault("gameVersion","0"),"busyUntil",fields.getOrDefault("busyUntil","0"),"actionDeadline",fields.getOrDefault("actionDeadline","0"),"game",game==null?Map.of():json.readTree(game)))));
            } catch(Exception failure) {
                subscriptions.remove(entry.getKey());
                try { sub.socket().close(failure instanceof AccessDenied?CloseStatus.POLICY_VIOLATION:CloseStatus.SERVER_ERROR); } catch(Exception ignored) {}
            }
        }
    }
    @Override public void afterConnectionClosed(WebSocketSession socket,CloseStatus status) { subscriptions.remove(socket.getId()); }
}
