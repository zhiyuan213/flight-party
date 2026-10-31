package com.flightparty.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Fixed-window abuse limits. Redis failure fails closed for API requests. */
@Component
public class ApiRateLimitFilter extends OncePerRequestFilter {
    private final StringRedisTemplate redis;
    private static final DefaultRedisScript<Long> COUNT=new DefaultRedisScript<>("""
        local count=redis.call('INCR',KEYS[1])
        if count==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end
        return count
        """,Long.class);
    public ApiRateLimitFilter(StringRedisTemplate redis) { this.redis=redis; }
    @Override protected boolean shouldNotFilter(HttpServletRequest request) { return !request.getRequestURI().startsWith("/api/"); }
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
        String address=UUID.nameUUIDFromBytes(request.getRemoteAddr().getBytes(StandardCharsets.UTF_8)).toString();
        boolean guest=request.getRequestURI().equals("/api/session/guest");
        boolean auth=request.getRequestURI().startsWith("/api/auth/");
        var session=request.getSession(false);
        Object principal=session==null?null:session.getAttribute("flightparty.principal");
        String identity=principal==null?"ip:"+address:"principal:"+principal;
        boolean write=!request.getMethod().equals("GET");
        String key="fp:limit:"+(auth?"auth:ip:"+address:guest?"guest:ip:"+address:identity+":"+(write?"write":"read"));
        long limit=auth?10:guest?60:write?120:1200;
        try {
            Long count=redis.execute(COUNT,List.of(key),"60000");
            if(count==null)throw new IllegalStateException("rate limiter unavailable");
            if(count>limit){response.setHeader("Retry-After","60");error(response,429,"RATE_LIMITED");return;}
        }catch(RuntimeException failure){error(response,503,"SERVICE_UNAVAILABLE");return;}
        chain.doFilter(request,response);
    }
    private static void error(HttpServletResponse response,int status,String code) throws IOException {
        response.setStatus(status);response.setContentType("application/json");
        response.getWriter().write("{\"code\":\""+code+"\",\"message\":\"Request temporarily unavailable\",\"requestId\":\""+UUID.randomUUID()+"\"}");
    }
}
