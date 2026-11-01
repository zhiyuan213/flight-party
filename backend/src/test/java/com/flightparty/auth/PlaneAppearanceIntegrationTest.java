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

 private static UUID account(JdbcClient db){
  UUID id=UUID.randomUUID();db.sql("insert into accounts(id,display_name) values (:id,'plane test')").param("id",id).update();return id;
 }
 private static void grant(JdbcClient db,UUID account){db.sql("insert into complimentary_memberships(account_id,valid_until,reason) values (:id,now()+interval '1 day','isolated plane test')").param("id",account).update();}
 private static String storedPlane(JdbcClient db,UUID account){return db.sql("select plane_style from accounts where id=:id").param("id",account).query(String.class).single();}
 private static void isolated(Consumer<JdbcClient> test){
  String schema="test_"+UUID.randomUUID().toString().replace("-","");String url=System.getenv("SETTLEMENT_TEST_URL"),user=System.getenv("SETTLEMENT_TEST_USER"),password=System.getenv("SETTLEMENT_TEST_PASSWORD");
  var flyway=Flyway.configure().dataSource(url,user,password).schemas(schema).cleanDisabled(false).load();flyway.migrate();
  try{test.accept(JdbcClient.create(new DriverManagerDataSource(url+"?currentSchema="+schema,user,password)));}finally{flyway.clean();}
 }
}
