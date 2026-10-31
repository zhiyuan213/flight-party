package com.flightparty.auth;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AccountService accounts;private final JdbcClient db;private final TransactionTemplate tx;
    public AuthController(AccountService accounts,JdbcClient db,TransactionTemplate tx) { this.accounts=accounts;this.db=db;this.tx=tx; }
    public record Credentials(String email,String password,String displayName) {}
    private UUID principal(HttpServletRequest request) {
        var session=request.getSession(false);Object id=session==null?null:session.getAttribute("flightparty.principal");
        if(id==null)throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);return UUID.fromString(id.toString());
    }
    private AccountService.Account bind(HttpServletRequest request,AccountService.Account account) {
        UUID principal=principal(request);
        tx.executeWithoutResult(status->{
            db.sql("select id from principals where id=:id for update").param("id",principal).query(UUID.class).single();
            db.sql("update principals set account_id=:account where id=:id").param("account",account.id()).param("id",principal).update();
        });
        request.changeSessionId();request.getSession().setAttribute("flightparty.account",account.id().toString());return account;
    }
    @PostMapping("/register")
    public AccountService.Account register(@RequestBody Credentials input,HttpServletRequest request) {
        principal(request);
        try { return bind(request,accounts.register(input.email(),input.password(),input.displayName())); }
        catch(DuplicateKeyException duplicate){throw new ResponseStatusException(HttpStatus.CONFLICT,"account unavailable");}
        catch(IllegalArgumentException invalid){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"invalid registration");}
    }
    @PostMapping("/login")
    public AccountService.Account login(@RequestBody Credentials input,HttpServletRequest request) {
        principal(request);
        try{return bind(request,accounts.login(input.email(),input.password()));}
        catch(IllegalArgumentException invalid){throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"invalid credentials");}
    }
    @PostMapping("/logout")
    public Map<String,String> logout(HttpServletRequest request) {
        UUID principal=principal(request);
        tx.executeWithoutResult(status->db.sql("update principals set account_id=null where id=:id").param("id",principal).update());
        request.getSession().removeAttribute("flightparty.account");request.changeSessionId();return Map.of("kind","guest");
    }
}
