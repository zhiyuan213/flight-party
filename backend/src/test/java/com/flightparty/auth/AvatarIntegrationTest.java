package com.flightparty.auth;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.*;
import java.io.*;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import jakarta.servlet.http.*;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.web.server.ResponseStatusException;
@EnabledIfEnvironmentVariable(named="SETTLEMENT_TEST_URL",matches=".+")
class AvatarIntegrationTest {
 @Test void memberUploadIsPersistentAndRevocationStopsPublicAccess()throws Exception{
  String schema="test_"+UUID.randomUUID().toString().replace("-","");String url=System.getenv("SETTLEMENT_TEST_URL"),user=System.getenv("SETTLEMENT_TEST_USER"),password=System.getenv("SETTLEMENT_TEST_PASSWORD");
  var flyway=Flyway.configure().dataSource(url,user,password).schemas(schema).cleanDisabled(false).load();flyway.migrate();
  try{var db=JdbcClient.create(new DriverManagerDataSource(url+"?currentSchema="+schema,user,password));var controller=new AvatarController(db);var appearance=new AppearanceService(db);
   UUID account=UUID.randomUUID();db.sql("insert into accounts(id,display_name) values (:id,'avatar test')").param("id",account).update();
   var request=mock(HttpServletRequest.class);var session=mock(HttpSession.class);when(request.getSession(false)).thenReturn(session);
   var image=new ByteArrayOutputStream();ImageIO.write(new BufferedImage(300,400,BufferedImage.TYPE_INT_RGB),"png",image);var input=new AvatarController.Upload(Base64.getEncoder().encodeToString(image.toByteArray()));
   assertEquals(401,assertThrows(ResponseStatusException.class,()->controller.upload(input,request)).getStatusCode().value());when(session.getAttribute("flightparty.account")).thenReturn(account);
   assertEquals(403,assertThrows(ResponseStatusException.class,()->controller.upload(input,request)).getStatusCode().value());assertThrows(IllegalStateException.class,()->appearance.selectPlane(account,"gold"));
   db.sql("insert into complimentary_memberships(account_id,valid_until,reason) values (:id,now()+interval '1 day','isolated test')").param("id",account).update();
   String path=controller.upload(input,request).get("avatarUrl");UUID token=UUID.fromString(path.substring(path.lastIndexOf('/')+1));assertEquals(path,appearance.get(account).avatarUrl());assertEquals(256,ImageIO.read(new ByteArrayInputStream(controller.image(token).getBody())).getWidth());
   db.sql("insert into account_statistics(account_id,points,completed_games) values (:id,2,1)").param("id",account).update();assertEquals(path,new com.flightparty.stats.LeaderboardService(db).top("points").getFirst().avatarUrl());
   appearance.selectPlane(account,"gold");assertEquals("gold2d",appearance.get(account).plane());
   String newer=controller.upload(input,request).get("avatarUrl");assertNotEquals(path,newer);assertEquals(404,assertThrows(ResponseStatusException.class,()->controller.image(token)).getStatusCode().value());
   db.sql("update complimentary_memberships set revoked_at=now() where account_id=:id").param("id",account).update();assertEquals("/api/avatars/system/0",appearance.get(account).avatarUrl());assertEquals("classic",appearance.get(account).plane());
   controller.selectSystem(new AvatarController.SystemAvatar(2),request);assertEquals("/api/avatars/system/2",appearance.get(account).avatarUrl());assertEquals(200,controller.system(2).getStatusCode().value());assertEquals(400,assertThrows(ResponseStatusException.class,()->controller.selectSystem(new AvatarController.SystemAvatar(9),request)).getStatusCode().value());
   UUID newToken=UUID.fromString(newer.substring(newer.lastIndexOf('/')+1));assertEquals(404,assertThrows(ResponseStatusException.class,()->controller.image(newToken)).getStatusCode().value());
  }finally{flyway.clean();}
 }
}

