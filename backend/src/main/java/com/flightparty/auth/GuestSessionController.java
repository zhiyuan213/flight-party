package com.flightparty.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.Map;
import java.util.UUID;
import java.nio.charset.StandardCharsets;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class GuestSessionController {
    private static final String PRINCIPAL = "flightparty.principal";
    private final JdbcClient db;
    @org.springframework.beans.factory.annotation.Autowired private com.flightparty.billing.BillingAccess billing;
    private final TransactionTemplate transaction;
    private final com.flightparty.room.RedisRoomStore rooms;
    public GuestSessionController(JdbcClient db, TransactionTemplate transaction,com.flightparty.room.RedisRoomStore rooms) { this.db = db; this.transaction = transaction;this.rooms=rooms; }
    @GetMapping("/csrf")
    public Map<String,String> csrf(CsrfToken token) { return Map.of("headerName",token.getHeaderName(),"token",token.getToken()); }

    @PostMapping("/session/guest")
    public Map<String,String> guest(HttpServletRequest request) {
        HttpSession session = request.getSession(true);
        if (session.getAttribute(PRINCIPAL) == null) {
            UUID id = UUID.nameUUIDFromBytes(("flightparty:guest:" + session.getId()).getBytes(StandardCharsets.UTF_8));
            transaction.executeWithoutResult(status -> db.sql("insert into principals(id) values (:id) on conflict do nothing").param("id",id).update());
            session.setAttribute(PRINCIPAL,id.toString());
        }
        return Map.of("kind","guest");
    }
    public record Statistics(long points,long completedGames) {}
    public record Recording(boolean member,int freeRemaining,String resetsAt,int monthlyUsd,int annualUsd,boolean paymentConfigured,boolean testMode,boolean testMembership) {}
    public record Me(String kind,UUID activeRoomId,AccountService.Account account,Statistics statistics,Recording recording) {}
    @GetMapping("/me")
    public Me me(HttpServletRequest request) {
        var session=request.getSession(false);
        Object principal=session==null?null:session.getAttribute(PRINCIPAL);
        Object account=session==null?null:session.getAttribute("flightparty.account");
        var profile=account==null?null:db.sql("select id,display_name,email_verified from accounts where id=:id").param("id",UUID.fromString(account.toString()))
                .query((rs,row)->new AccountService.Account(rs.getObject(1,UUID.class),rs.getString(2),rs.getBoolean(3))).optional().orElse(null);
        var statistics=profile==null?null:db.sql("select points,completed_games from account_statistics where account_id=:id").param("id",profile.id())
                .query((rs,row)->new Statistics(rs.getLong(1),rs.getLong(2))).optional().orElse(new Statistics(0,0));
        Recording recording=null;
        if(profile!=null){
            boolean member=db.sql("select count(*) from membership_entitlements where account_id=:id and status='ACTIVE' and valid_until>now()").param("id",profile.id()).query(Long.class).single()>0;
            var today=java.time.LocalDate.now(java.time.ZoneOffset.UTC);
            boolean used=db.sql("select count(*) from score_daily_usage where account_id=:id and usage_day=:day").param("id",profile.id()).param("day",today).query(Long.class).single()>0;
            boolean testMember=db.sql("select count(*) from membership_entitlements where account_id=:id and status='TEST_ACTIVE' and valid_until>now()").param("id",profile.id()).query(Long.class).single()>0;
            recording=new Recording(member,used?0:1,today.plusDays(1).atStartOfDay().toInstant(java.time.ZoneOffset.UTC).toString(),9,59,billing.allowed(profile.id()),billing.testMode(),testMember);
        }
        return new Me(principal==null?"none":profile==null?"guest":"account",principal==null?null:rooms.active(UUID.fromString(principal.toString())).orElse(null),profile,statistics,recording);
    }
}
