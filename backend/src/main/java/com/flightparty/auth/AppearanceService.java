package com.flightparty.auth;
import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
@Service
public class AppearanceService {
 public static final String MEMBER_SQL="(exists(select 1 from membership_entitlements e where e.account_id=a.id and e.provider='creem' and e.status='ACTIVE' and not e.test_mode and e.valid_until>now()) or exists(select 1 from complimentary_memberships c where c.account_id=a.id and c.revoked_at is null and c.valid_until>now()))";
 public record Appearance(boolean member,String frame,String selectedFrame,String trail,String victory,String selectedTrail,String selectedVictory) {
 public Appearance(boolean member,String frame,String selectedFrame){this(member,frame,selectedFrame,member?"star":"none",member?"gold":"none","star","gold");}
 }
 public static Appearance make(boolean member,String frame,String trail,String victory){return new Appearance(member,member?frame:"none",frame,member?trail:"none",member?victory:"none",trail,victory);}
 private final JdbcClient db;
 public AppearanceService(JdbcClient db){this.db=db;}
 public Appearance get(UUID account){return db.sql("select a.avatar_frame,"+MEMBER_SQL+",a.flight_trail,a.victory_effect from accounts a where a.id=:id").param("id",account).query((rs,n)->make(rs.getBoolean(2),rs.getString(1),rs.getString(3),rs.getString(4))).single();}
 public void select(UUID account,String frame){
  select(account,frame,null,null);
 }
 public void select(UUID account,String frame,String trail,String victory){
  if(frame==null&&trail==null&&victory==null)throw new IllegalArgumentException("empty selection");
  if(frame!=null&&!List.of("gold","cloud","night").contains(frame))throw new IllegalArgumentException("invalid frame");
  if(trail!=null&&!List.of("none","star","rainbow","cloud").contains(trail))throw new IllegalArgumentException("invalid trail");
  if(victory!=null&&!List.of("none","gold").contains(victory))throw new IllegalArgumentException("invalid victory");
  if(db.sql("update accounts a set flight_trail=coalesce(:trail,flight_trail),victory_effect=coalesce(:victory,victory_effect),avatar_frame=coalesce(:frame,avatar_frame) where a.id=:id and "+MEMBER_SQL).param("frame",frame).param("trail",trail).param("victory",victory).param("id",account).update()!=1)throw new IllegalStateException("membership required");
 }
}
