package com.flightparty.auth;

import static org.junit.jupiter.api.Assertions.*;
import com.flightparty.room.RoomRules;
import com.flightparty.room.RoomViewService;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.function.Consumer;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

@EnabledIfEnvironmentVariable(named="SETTLEMENT_TEST_URL",matches=".+")
class PlaneAppearanceIntegrationTest {
 @Test void selectingThePlayableSkinRequiresRealActiveMembershipAndNeverRewritesLegacyChoices(){
  isolated(db->{
   UUID account=account(db);var appearance=new AppearanceService(db);
   for(String skin:List.of("gold2d","cloud2d","night2d"))assertThrows(IllegalStateException.class,()->appearance.selectPlane(account,skin));
   assertEquals("classic",storedPlane(db,account));
   assertThrows(IllegalArgumentException.class,()->appearance.selectPlane(account,"unknown-model"));
   assertThrows(IllegalArgumentException.class,()->appearance.selectPlane(account,null));
   db.sql("insert into membership_entitlements(account_id,subscription_id,provider,status,valid_until,test_mode) values (:id,'plane-test','creem','ACTIVE',now()+interval '1 day',true)").param("id",account).update();
   assertFalse(appearance.get(account).member());
   for(String skin:List.of("gold2d","cloud2d","night2d"))assertThrows(IllegalStateException.class,()->appearance.selectPlane(account,skin));
   db.sql("update membership_entitlements set test_mode=false where account_id=:id").param("id",account).update();
   for(String skin:List.of("gold2d","cloud2d","night2d")){
    appearance.selectPlane(account,skin);
    assertEquals(skin,storedPlane(db,account));assertEquals(skin,appearance.get(account).plane());
   }
   for(String legacy:List.of("gold","sapphire","night")){
    appearance.selectPlane(account,legacy);
    assertEquals(legacy,storedPlane(db,account));assertEquals("gold2d",appearance.get(account).plane());
    assertEquals(legacy,storedPlane(db,account)); // Reading a profile must not migrate data.
   }
   db.sql("update membership_entitlements set valid_until=now()-interval '1 second' where account_id=:id").param("id",account).update();
   assertEquals("classic",appearance.get(account).plane());assertEquals("night",storedPlane(db,account));
   for(String skin:List.of("gold2d","cloud2d","night2d"))assertThrows(IllegalStateException.class,()->appearance.selectPlane(account,skin));
   grant(db,account);
   for(String skin:List.of("gold2d","cloud2d","night2d")){
    appearance.selectPlane(account,skin);assertEquals(skin,appearance.get(account).plane());
   }
   db.sql("update complimentary_memberships set revoked_at=now() where account_id=:id").param("id",account).update();
   assertEquals("classic",appearance.get(account).plane());assertEquals("night2d",storedPlane(db,account));
  });
 }

 @Test void fourMembersKeepIndependentSkinsAcrossFrozenProfilesAndOneExpiry(){
  isolated(db->{
   var appearance=new AppearanceService(db);var views=new RoomViewService(db);
   var accounts=new java.util.ArrayList<UUID>();var principals=new java.util.ArrayList<UUID>();var seats=new java.util.ArrayList<RoomRules.Seat>();
   var skins=List.of("classic","gold2d","cloud2d","night2d");UUID match=UUID.randomUUID();var now=Instant.now();
   for(int i=0;i<skins.size();i++){
    UUID account=account(db),principal=UUID.randomUUID();accounts.add(account);principals.add(principal);grant(db,account);
    appearance.selectPlane(account,skins.get(i));
    db.sql("insert into principals(id,account_id) values (:id,:account)").param("id",principal).param("account",account).update();
    seats.add(new RoomRules.Seat(i,principal,true,false));
   }
   var waiting=new RoomRules.Room(match,RoomRules.Phase.WAITING_FRIENDS,seats,null);
   assertEquals(skins,views.forMember(waiting,principals.getFirst(),now).seats().stream().map(com.flightparty.room.RoomSnapshot.Seat::planeStyle).toList());
   db.sql("insert into matches(id,room_id,status,rules_version,started_at) values (:id,:id,'PLAYING','test',now())").param("id",match).update();
   for(int i=0;i<skins.size();i++){
    db.sql("insert into match_participants(match_id,seat_index,principal_id,account_id_at_start) values (:match,:seat,:principal,:account)").param("match",match).param("seat",i).param("principal",principals.get(i)).param("account",accounts.get(i)).update();
    db.sql("update principals set account_id=null where id=:id").param("id",principals.get(i)).update();
   }
   var playing=new RoomRules.Room(match,RoomRules.Phase.PLAYING,seats,null);
   assertEquals(skins,views.forMember(playing,principals.getFirst(),now.plusSeconds(2)).seats().stream().map(com.flightparty.room.RoomSnapshot.Seat::planeStyle).toList());
   db.sql("update complimentary_memberships set valid_until=now()-interval '1 second' where account_id=:id").param("id",accounts.get(2)).update();
   assertEquals(List.of("classic","gold2d","classic","night2d"),views.forMember(playing,principals.getFirst(),now.plusSeconds(4)).seats().stream().map(com.flightparty.room.RoomSnapshot.Seat::planeStyle).toList());
   assertEquals("cloud2d",storedPlane(db,accounts.get(2)));
  });
 }

 @Test void waitingFrozenAndMidgameProfilesBroadcastTheSameSkinAndExpiryReturnsToClassic(){
  isolated(db->{
   UUID account=account(db),principal=UUID.randomUUID();grant(db,account);
   var appearance=new AppearanceService(db);appearance.selectPlane(account,"gold2d");
   db.sql("insert into principals(id,account_id) values (:id,:account)").param("id",principal).param("account",account).update();
   UUID match=UUID.randomUUID();var now=Instant.now();var waiting=RoomRules.friends(match,principal);
   var views=new RoomViewService(db);
   assertEquals(appearance.get(account).plane(),views.forMember(waiting,principal,now).seats().getFirst().planeStyle());
   db.sql("insert into matches(id,room_id,status,rules_version,started_at) values (:id,:id,'PLAYING','test',now())").param("id",match).update();
   db.sql("insert into match_participants(match_id,seat_index,principal_id,account_id_at_start) values (:match,0,:principal,:account)").param("match",match).param("principal",principal).param("account",account).update();
   db.sql("update principals set account_id=null where id=:id").param("id",principal).update();
   var playing=new RoomRules.Room(match,RoomRules.Phase.PLAYING,List.of(new RoomRules.Seat(0,principal,true,false),new RoomRules.Seat(1,null,true,true)),null);
   var frozen=views.forMember(playing,principal,now.plusSeconds(2));
   assertEquals("gold2d",frozen.seats().getFirst().planeStyle());assertEquals("classic",frozen.seats().get(1).planeStyle());
   // A guest who signs in during play uses the same public appearance path.
   db.sql("update match_participants set account_id_at_start=null,score_account_id=:account where match_id=:match").param("account",account).param("match",match).update();
   assertEquals("gold2d",views.forMember(playing,principal,now.plusSeconds(4)).seats().getFirst().planeStyle());
   var settled=new RoomRules.Room(match,RoomRules.Phase.SETTLED,playing.seats(),null);
   assertEquals("gold2d",views.forMember(settled,principal,now.plusSeconds(6)).seats().getFirst().planeStyle());
   db.sql("update complimentary_memberships set valid_until=now()-interval '1 second' where account_id=:id").param("id",account).update();
   assertEquals("classic",views.forMember(playing,principal,now.plusSeconds(8)).seats().getFirst().planeStyle());
   assertEquals("gold2d",storedPlane(db,account));
  });
 }

 @Test void annualSkinsBadgesAndRoomProfilesRequireVerifiedAnnualEntitlement(){
  isolated(db->{
   var appearance=new AppearanceService(db);var views=new RoomViewService(db);
   UUID free=account(db),monthly=account(db),gift=account(db),sandbox=account(db),annual=account(db),legacy=account(db);
   entitlement(db,monthly,"monthly","MONTHLY",false,400);
   db.sql("insert into complimentary_memberships(account_id,valid_until,reason) values (:id,now()+interval '400 days','ordinary gift, not annual')").param("id",gift).update();
   entitlement(db,sandbox,"sandbox","ANNUAL",true,400);
   entitlement(db,annual,"annual","ANNUAL",false,2);
   db.sql("insert into membership_entitlements(account_id,subscription_id,provider,status,valid_until) values (:id,'unclassified','creem','ACTIVE',now()+interval '400 days')").param("id",legacy).update();
   assertTrue(appearance.get(monthly).member());assertTrue(appearance.get(gift).member());assertTrue(appearance.get(legacy).member());
   for(UUID ordinary:List.of(free,monthly,gift,sandbox,legacy)){
    assertFalse(appearance.get(ordinary).annualMember());
    for(String skin:List.of("obsidian2d","aurora2d"))assertThrows(IllegalStateException.class,()->appearance.selectPlane(ordinary,skin));
   }
   assertTrue(appearance.get(annual).annualMember());
   for(String skin:List.of("obsidian2d","aurora2d")){
    appearance.selectPlane(annual,skin);assertEquals(skin,appearance.get(annual).plane());
   }
   appearance.selectPlane(gift,"cloud2d");appearance.selectPlane(monthly,"gold2d");
   // A stored selection alone is never proof of paid access.
   db.sql("update accounts set plane_style='obsidian2d' where id=:id").param("id",sandbox).update();
   var accounts=List.of(gift,monthly,sandbox,annual);var principals=new java.util.ArrayList<UUID>();var seats=new java.util.ArrayList<RoomRules.Seat>();
   UUID match=UUID.randomUUID();var now=Instant.now();
   for(int i=0;i<accounts.size();i++){
    UUID principal=UUID.randomUUID();principals.add(principal);seats.add(new RoomRules.Seat(i,principal,true,false));
    db.sql("insert into principals(id,account_id) values (:id,:account)").param("id",principal).param("account",accounts.get(i)).update();
   }
   var waiting=new RoomRules.Room(match,RoomRules.Phase.WAITING_FRIENDS,seats,null);
   var snapshot=views.forMember(waiting,principals.getFirst(),now);
   assertEquals(List.of("cloud2d","gold2d","classic","aurora2d"),snapshot.seats().stream().map(com.flightparty.room.RoomSnapshot.Seat::planeStyle).toList());
   assertEquals(List.of(false,false,false,true),snapshot.seats().stream().map(com.flightparty.room.RoomSnapshot.Seat::annualMember).toList());
   db.sql("insert into matches(id,room_id,status,rules_version,started_at,settled_at) values (:id,:id,'SETTLED','test',now(),now())").param("id",match).update();
   for(int i=0;i<accounts.size();i++){
    db.sql("insert into match_participants(match_id,seat_index,principal_id,account_id_at_start,rank,points_delta) values (:match,:seat,:principal,:account,:rank,:points)").param("match",match).param("seat",i).param("principal",principals.get(i)).param("account",accounts.get(i)).param("rank",4-i).param("points",i-1).update();
    db.sql("insert into account_match_results(match_id,account_id,seat_index,rank,points_delta) values (:match,:account,:seat,:rank,:points)").param("match",match).param("account",accounts.get(i)).param("seat",i).param("rank",4-i).param("points",i-1).update();
    db.sql("insert into account_statistics(account_id,points,completed_games) values (:account,:points,1)").param("account",accounts.get(i)).param("points",i-1).update();
    db.sql("update principals set account_id=null where id=:id").param("id",principals.get(i)).update();
   }
   var playing=new RoomRules.Room(match,RoomRules.Phase.PLAYING,seats,null);
   assertEquals(snapshot.seats().stream().map(com.flightparty.room.RoomSnapshot.Seat::planeStyle).toList(),views.forMember(playing,principals.getFirst(),now.plusSeconds(2)).seats().stream().map(com.flightparty.room.RoomSnapshot.Seat::planeStyle).toList());
   var board=new com.flightparty.stats.LeaderboardService(db);
   for(String period:List.of("points","games","month","week","day"))assertEquals(List.of(true,false,false,false),board.top(period).stream().map(com.flightparty.stats.LeaderboardService.Entry::annualMember).toList());
   // Expiring/revoking annual access removes its skin even while monthly VIP remains.
   entitlement(db,annual,"monthly-after-annual","MONTHLY",false,400);
   db.sql("update membership_entitlements set valid_until=now()-interval '1 second' where subscription_id='annual'").update();
   assertTrue(appearance.get(annual).member());assertFalse(appearance.get(annual).annualMember());assertEquals("classic",appearance.get(annual).plane());
   assertEquals("aurora2d",storedPlane(db,annual));
   var expired=views.forMember(playing,principals.getFirst(),now.plusSeconds(4)).seats().get(3);
   assertTrue(expired.member());assertFalse(expired.annualMember());assertEquals("classic",expired.planeStyle());
   assertThrows(IllegalStateException.class,()->appearance.selectPlane(annual,"obsidian2d"));
   db.sql("update membership_entitlements set valid_until=now()+interval '2 days' where subscription_id='annual'").update();
   appearance.selectPlane(annual,"obsidian2d");
   db.sql("update membership_entitlements set status='REVOKED' where subscription_id='annual'").update();
   assertTrue(appearance.get(annual).member());assertFalse(appearance.get(annual).annualMember());assertEquals("classic",appearance.get(annual).plane());
   for(String period:List.of("points","month","week","day"))assertTrue(board.top(period).stream().noneMatch(com.flightparty.stats.LeaderboardService.Entry::annualMember));
  });
 }

 @Test void annualComplimentaryTierMustBeExplicitAndClosesOnExpiryOrRevocation(){
  isolated(db->{
   var appearance=new AppearanceService(db);UUID ordinary=account(db),annual=account(db),principal=UUID.randomUUID();
   db.sql("insert into complimentary_memberships(account_id,valid_until,reason) values (:id,now()+interval '400 days','ordinary long gift')").param("id",ordinary).update();
   db.sql("insert into complimentary_memberships(account_id,valid_until,reason,tier) values (:id,now()+interval '1 hour','explicit annual gift','ANNUAL')").param("id",annual).update();
   assertEquals("VIP",db.sql("select tier from complimentary_memberships where account_id=:id").param("id",ordinary).query(String.class).single());
   assertTrue(appearance.get(ordinary).member());assertFalse(appearance.get(ordinary).annualMember());
   for(String skin:List.of("obsidian2d","aurora2d")){
    assertThrows(IllegalStateException.class,()->appearance.selectPlane(ordinary,skin));
    appearance.selectPlane(annual,skin);assertTrue(appearance.get(annual).annualMember());assertEquals(skin,appearance.get(annual).plane());
   }
   assertEquals(0L,db.sql("select count(*) from membership_entitlements where account_id=:id").param("id",annual).query(Long.class).single());
   db.sql("insert into principals(id,account_id) values (:id,:account)").param("id",principal).param("account",annual).update();
   var views=new RoomViewService(db);var room=RoomRules.friends(UUID.randomUUID(),principal);var now=Instant.now();
   var member=views.forMember(room,principal,now).seats().getFirst();assertTrue(member.annualMember());assertEquals("aurora2d",member.planeStyle());
   db.sql("insert into account_statistics(account_id,points,completed_games) values (:id,2,1)").param("id",annual).update();
   var board=new com.flightparty.stats.LeaderboardService(db);assertTrue(board.top("points").getFirst().annualMember());
   db.sql("update complimentary_memberships set revoked_at=now() where account_id=:id").param("id",annual).update();
   assertFalse(appearance.get(annual).member());assertFalse(appearance.get(annual).annualMember());assertEquals("classic",appearance.get(annual).plane());
   for(String skin:List.of("obsidian2d","aurora2d"))assertThrows(IllegalStateException.class,()->appearance.selectPlane(annual,skin));
   db.sql("update complimentary_memberships set revoked_at=null,valid_until=now()-interval '1 second' where account_id=:id").param("id",annual).update();
   assertFalse(appearance.get(annual).member());assertFalse(appearance.get(annual).annualMember());
   entitlement(db,annual,"gift-member-monthly","MONTHLY",false,400);
   assertTrue(appearance.get(annual).member());assertFalse(appearance.get(annual).annualMember());assertEquals("classic",appearance.get(annual).plane());
   assertThrows(IllegalStateException.class,()->appearance.selectPlane(annual,"obsidian2d"));
   db.sql("update complimentary_memberships set valid_until=now()+interval '1 hour' where account_id=:id").param("id",annual).update();
   assertTrue(appearance.get(annual).annualMember());assertEquals("aurora2d",appearance.get(annual).plane());
   db.sql("update complimentary_memberships set revoked_at=now() where account_id=:id").param("id",annual).update();
   var revoked=views.forMember(room,principal,now.plusSeconds(2)).seats().getFirst();
   assertTrue(revoked.member());assertFalse(revoked.annualMember());assertEquals("classic",revoked.planeStyle());
   assertFalse(board.top("points").getFirst().annualMember());assertEquals("aurora2d",storedPlane(db,annual));
  });
 }

 private static UUID account(JdbcClient db){
  UUID id=UUID.randomUUID();db.sql("insert into accounts(id,display_name) values (:id,'plane test')").param("id",id).update();return id;
 }
 private static void grant(JdbcClient db,UUID account){db.sql("insert into complimentary_memberships(account_id,valid_until,reason) values (:id,now()+interval '1 day','isolated plane test')").param("id",account).update();}
 private static void entitlement(JdbcClient db,UUID account,String id,String plan,boolean test,int days){db.sql("insert into membership_entitlements(account_id,subscription_id,provider,status,valid_until,test_mode,billing_plan,product_id) values (:account,:id,'creem',:status,now()+(:days*interval '1 day'),:test,:plan,:product)").param("account",account).param("id",id).param("status",test?"TEST_ACTIVE":"ACTIVE").param("days",days).param("test",test).param("plan",plan).param("product","product-"+plan).update();}
 private static String storedPlane(JdbcClient db,UUID account){return db.sql("select plane_style from accounts where id=:id").param("id",account).query(String.class).single();}
 private static void isolated(Consumer<JdbcClient> test){
  String schema="test_"+UUID.randomUUID().toString().replace("-","");String url=System.getenv("SETTLEMENT_TEST_URL"),user=System.getenv("SETTLEMENT_TEST_USER"),password=System.getenv("SETTLEMENT_TEST_PASSWORD");
  var flyway=Flyway.configure().dataSource(url,user,password).schemas(schema).cleanDisabled(false).load();flyway.migrate();
  try{test.accept(JdbcClient.create(new DriverManagerDataSource(url+"?currentSchema="+schema,user,password)));}finally{flyway.clean();}
 }
}
