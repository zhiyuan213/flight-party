package com.flightparty.auth;
import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;
import javax.imageio.ImageIO;
import java.io.*;
import java.awt.image.BufferedImage;
import java.util.Base64;
class AvatarImageTest {
 @Test void reencodesAndCropsRaster()throws Exception{
  var input=new BufferedImage(512,300,BufferedImage.TYPE_INT_RGB);var buffer=new ByteArrayOutputStream();ImageIO.write(input,"png",buffer);
  var output=AvatarController.normalize(Base64.getEncoder().encodeToString(buffer.toByteArray()));var decoded=ImageIO.read(new ByteArrayInputStream(output));
  assertEquals(256,decoded.getWidth());assertEquals(256,decoded.getHeight());
 }
 @Test void refusesSvgInvalidAndOversize(){
  assertThrows(IOException.class,()->AvatarController.normalize(Base64.getEncoder().encodeToString("<svg xmlns='http://www.w3.org/2000/svg'/>".getBytes())));
  assertThrows(IOException.class,()->AvatarController.normalize("!invalid"));
  assertThrows(IOException.class,()->AvatarController.normalize("x".repeat(2800001)));
 }
}
