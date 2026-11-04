package com.flightparty.table;
import java.util.UUID;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/table")
public class TableController {
 private final TableService service;public TableController(TableService service){this.service=service;}

 public record React(UUID commandId,String emoji){}
 @GetMapping("/rooms/{id}/reactions") public java.util.List<TableService.Reaction> reactions(@PathVariable UUID id,@RequestParam(defaultValue="0") long after,HttpServletRequest r){return service.reactions(id,after,r);}
 @PostMapping("/rooms/{id}/reactions") public java.util.List<TableService.Reaction> react(@PathVariable UUID id,@RequestBody React input,HttpServletRequest r){return service.react(id,input.commandId(),input.emoji(),r);}
 public record Sketch(UUID commandId,long version,String action,String text,java.util.List<Integer> points){}
 @PostMapping("/rooms/{id}/sketch") public TableService.View sketch(@PathVariable UUID id,@RequestBody Sketch input,HttpServletRequest r){return service.sketch(id,input.commandId(),input.version(),input.action(),input.text(),input.points(),r);}
 public record Create(String game,String mode){} public record Move(UUID commandId,long version,int position){}
 @GetMapping("/leaderboards/{game}") public java.util.List<TableService.Ranking> board(@PathVariable String game,@RequestParam(defaultValue="month") String period){return service.leaderboard(game,period);}
 @GetMapping("/stats/{game}") public TableService.Statistics stats(@PathVariable String game,HttpServletRequest r){return service.statistics(game,r);}
 @PostMapping("/rooms") public TableService.View create(@RequestBody Create input,HttpServletRequest r){return service.create(input.game(),input.mode(),r);}
 @PostMapping("/rooms/{id}/join") public TableService.View join(@PathVariable UUID id,HttpServletRequest r){return service.join(id,r);}
 @GetMapping("/rooms/{id}") public TableService.View state(@PathVariable UUID id,HttpServletRequest r){return service.snapshot(id,r);}
 @PostMapping("/rooms/{id}/move") public TableService.View move(@PathVariable UUID id,@RequestBody Move input,HttpServletRequest r){return service.move(id,input.commandId(),input.version(),input.position(),r);}
 @PostMapping("/rooms/{id}/ready") public TableService.View ready(@PathVariable UUID id,HttpServletRequest r){return service.ready(id,r);}
 @PostMapping("/rooms/{id}/rematch") public TableService.View rematch(@PathVariable UUID id,HttpServletRequest r){return service.rematch(id,r);}
 @PostMapping("/rooms/{id}/leave") public void leave(@PathVariable UUID id,HttpServletRequest r){service.leave(id,r);}
}
