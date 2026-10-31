package com.flightparty.auth;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Credential service only. Session binding and account-aware quota integration are separate. */
@Service
public class AccountService {
    private final JdbcClient db;
    private final BCryptPasswordEncoder passwords=new BCryptPasswordEncoder(12);
    private final String dummy=passwords.encode(UUID.randomUUID().toString());
    public AccountService(JdbcClient db) { this.db=db; }
    public record Account(UUID id,String displayName,boolean emailVerified) {}
    @Transactional
    public Account register(String email,String password,String name) {
        String normalized=email(email);validatePassword(password);
        if(name==null || name.trim().isEmpty() || name.trim().length()>64)throw new IllegalArgumentException("invalid display name");
        UUID id=UUID.randomUUID();String display=name.trim();
        db.sql("insert into accounts(id,email_normalized,password_hash,display_name,email_verified) values (:id,:email,:hash,:name,false)")
                .param("id",id).param("email",normalized).param("hash",passwords.encode(password)).param("name",display).update();
        return new Account(id,display,false);
    }
    public Account login(String email,String password) {
        String normalized=email(email);validatePassword(password);
        var found=db.sql("select id,display_name,email_verified,password_hash from accounts where email_normalized=:email")
                .param("email",normalized).query((rs,row)->new Credentials(new Account(rs.getObject(1,UUID.class),rs.getString(2),rs.getBoolean(3)),rs.getString(4))).optional();
        String hash=found.isPresent()&&found.get().hash()!=null?found.get().hash():dummy;
        boolean valid=passwords.matches(password,hash);
        if(!valid || found.isEmpty() || found.get().hash()==null)throw new IllegalArgumentException("invalid credentials");
        return found.get().account();
    }
    private static String email(String value) {
        if(value==null)throw new IllegalArgumentException("invalid email");
        String normalized=value.trim().toLowerCase(Locale.ROOT);
        if(normalized.length()>254 || !normalized.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"))throw new IllegalArgumentException("invalid email");
        return normalized;
    }
    private static void validatePassword(String value) {
        if(value==null || value.length()<8 || value.getBytes(StandardCharsets.UTF_8).length>72)throw new IllegalArgumentException("password must be 8 characters or more and at most 72 UTF-8 bytes");
    }
    private record Credentials(Account account,String hash) {}
}
