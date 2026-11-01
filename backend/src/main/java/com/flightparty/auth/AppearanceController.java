package com.flightparty.auth;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
@RestController
@RequestMapping("/api/account/appearance")
public class AppearanceController {
 private final AppearanceService service;
 public AppearanceController(AppearanceService service){this.service=service;}
 public record Selection(String frame,String trail,String victory){}
 @PostMapping public AppearanceService.Appearance select(@RequestBody Selection input,HttpServletRequest request){
  var session=request.getSession(false);var account=session==null?null:session.getAttribute("flightparty.account");
  if(account==null)throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
  try{var id=UUID.fromString(account.toString());service.select(id,input.frame(),input.trail(),input.victory());return service.get(id);}
  catch(IllegalArgumentException bad){throw new ResponseStatusException(HttpStatus.BAD_REQUEST);}
  catch(IllegalStateException forbidden){throw new ResponseStatusException(HttpStatus.FORBIDDEN);}
 }
}
