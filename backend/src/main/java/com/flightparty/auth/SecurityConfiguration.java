package com.flightparty.auth;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.session.data.redis.config.annotation.web.http.EnableRedisHttpSession;
import org.springframework.session.web.http.DefaultCookieSerializer;

@Configuration
@EnableRedisHttpSession(maxInactiveIntervalInSeconds = 2592000)
public class SecurityConfiguration {
    @Bean
    DefaultCookieSerializer cookieSerializer(@Value("${FLIGHTPARTY_SECURE_COOKIE:false}") boolean secure) {
        var cookie = new DefaultCookieSerializer();
        cookie.setUseHttpOnlyCookie(true);
        cookie.setUseSecureCookie(secure);
        cookie.setSameSite("Lax");
        return cookie;
    }
    @Bean
    SecurityFilterChain security(HttpSecurity http) throws Exception {
        return http.authorizeHttpRequests(auth -> auth.requestMatchers("/api/billing/subscriptions/*/cancel", "/api/billing/checkout", "/api/billing/creem/webhook", "/api/auth/**", "/ws", "/api/csrf", "/api/session/guest", "/api/me", "/api/leaderboards", "/api/rooms", "/api/rooms/**", "/error").permitAll().anyRequest().denyAll())
                .csrf(csrf -> csrf.ignoringRequestMatchers("/api/billing/creem/webhook"))
                .httpBasic(basic -> basic.disable())
                .formLogin(form -> form.disable())
                .logout(logout -> logout.disable())
                .build();
    }
}
