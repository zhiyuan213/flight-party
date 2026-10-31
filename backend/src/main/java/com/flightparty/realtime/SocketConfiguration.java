package com.flightparty.realtime;

import java.util.Map;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.server.*;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.*;
import org.springframework.web.socket.server.HandshakeInterceptor;

@Configuration
@EnableWebSocket
public class SocketConfiguration implements WebSocketConfigurer {
    private final RoomSocket handler;
    public SocketConfiguration(RoomSocket handler) { this.handler=handler; }
    @Override public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(handler,"/ws").addInterceptors(new HandshakeInterceptor() {
            public boolean beforeHandshake(ServerHttpRequest request,ServerHttpResponse response,WebSocketHandler handler,Map<String,Object> attrs) {
                if(!(request instanceof ServletServerHttpRequest servlet)) return false;
                var session=servlet.getServletRequest().getSession(false);
                if(session==null || session.getAttribute("flightparty.principal")==null) return false;
                attrs.put("sessionId",session.getId());return true;
            }
            public void afterHandshake(ServerHttpRequest request,ServerHttpResponse response,WebSocketHandler handler,Exception error) {}
        });
    }
}
