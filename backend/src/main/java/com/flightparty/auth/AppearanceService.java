package com.flightparty.auth;
import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
@Service
public class AppearanceService {
 public static final String MEMBER_SQL="(exists(select 1 from membership_entitlements e where e.account_id=a.id and e.provider='creem' and e.status='ACTIVE' and not e.test_mode and e.valid_until>now()) or exists(select 1 from complimentary_memberships c where c.account_id=a.id and c.revoked_at is null and c.valid_until>now()))";
 public record Appearance(boolean member,String frame,String selectedFrame) {}
 private final JdbcClient db;
 public AppearanceService(JdbcClient db){this.db=db;}
 public Appearance get(UUID account){return db.sql("select a.avatar_frame,"+MEMBER_SQL+" from accounts a where a.id=:id").param("id",account).query((rs,n)->new Appearance(rs.getBoolean(2),rs.getBoolean(2)?rs.getString(1):"none",rs.getString(1))).single();}
 public void select(UUID account,String frame){
  if(frame==null||!List.of("gold","cloud","night").contains(frame))throw new IllegalArgumentException("invalid frame");
  if(db.sql("update accounts a set avatar_frame=:frame where a.id=:id and "+MEMBER_SQL).param("frame",frame).param("id",account).update()!=1)throw new IllegalStateException("membership required");
 }
}
