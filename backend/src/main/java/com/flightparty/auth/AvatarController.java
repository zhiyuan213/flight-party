package com.flightparty.auth;

import jakarta.servlet.http.HttpServletRequest;
import java.util.*;
import java.io.*;
import java.awt.image.BufferedImage;
import javax.imageio.ImageIO;
import org.springframework.http.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** Re-encode raster input; never serve user-controlled MIME, metadata, SVG or filenames. */
@RestController
public class AvatarController {
 private final JdbcClient db;
 public AvatarController(JdbcClient db){this.db=db;}
 public record Upload(String image){}
 @PostMapping("/api/account/avatar") public Map<String,String> upload(@RequestBody Upload input,HttpServletRequest request){
  var session=request.getSession(false);var value=session==null?null:session.getAttribute("flightparty.account");
  if(value==null)throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
  UUID account=UUID.fromString(value.toString());
  if(!db.sql("select "+AppearanceService.MEMBER_SQL+" from accounts a where a.id=:id").param("id",account).query(Boolean.class).single())throw new ResponseStatusException(HttpStatus.FORBIDDEN);
  byte[] png;
  try{png=normalize(input.image());}catch(Exception invalid){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid image");}
  UUID token=UUID.randomUUID();
  if(db.sql("update accounts a set avatar_image=:image,avatar_token=:token where a.id=:id and "+AppearanceService.MEMBER_SQL).param("image",png).param("token",token).param("id",account).update()!=1)throw new ResponseStatusException(HttpStatus.FORBIDDEN);
  return Map.of("avatarUrl","/api/avatars/"+token);
 }
 static byte[] normalize(String input)throws IOException{
  if(input==null||input.length()>2800000)throw new IOException("size");
  byte[] data;try{data=Base64.getDecoder().decode(input);}catch(IllegalArgumentException e){throw new IOException(e);}
  if(data.length>2000000)throw new IOException("size");
  try(var stream=ImageIO.createImageInputStream(new ByteArrayInputStream(data))){
   var readers=ImageIO.getImageReaders(stream);if(!readers.hasNext())throw new IOException("format");var reader=readers.next();
   try{reader.setInput(stream);String format=reader.getFormatName();if(!List.of("png","jpeg","jpg","webp").contains(format.toLowerCase(Locale.ROOT)))throw new IOException("format");
    int w=reader.getWidth(0),h=reader.getHeight(0);if(w<1||h<1||w>4096||h>4096||(long)w*h>16000000)throw new IOException("dimensions");
    var original=reader.read(0);int side=Math.min(w,h);var image=new BufferedImage(256,256,BufferedImage.TYPE_INT_RGB);var g=image.createGraphics();
    try{g.setColor(java.awt.Color.WHITE);g.fillRect(0,0,256,256);g.setRenderingHint(java.awt.RenderingHints.KEY_INTERPOLATION,java.awt.RenderingHints.VALUE_INTERPOLATION_BICUBIC);g.drawImage(original,0,0,256,256,(w-side)/2,(h-side)/2,(w+side)/2,(h+side)/2,null);}finally{g.dispose();}
    var output=new ByteArrayOutputStream();ImageIO.write(image,"png",output);return output.toByteArray();
   }finally{reader.dispose();}
  }
 }
 @GetMapping("/api/avatars/{token}") public ResponseEntity<byte[]> image(@PathVariable UUID token){
  var bytes=db.sql("select a.avatar_image from accounts a where a.avatar_token=:token and "+AppearanceService.MEMBER_SQL).param("token",token).query(byte[].class).optional().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
  return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG).cacheControl(CacheControl.noStore()).header("X-Content-Type-Options","nosniff").body(bytes);
 }
}
