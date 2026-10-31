package com.flightparty.room;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

/** Waiting-room endpoints only; STARTING is not yet an activated match. */
@RestController
@RequestMapping("/api/rooms")
public class RoomController {
    private final RedisRoomStore store;
    private final RoomRollService rolls;
    private final org.springframework.jdbc.core.simple.JdbcClient db;
    private final ReactionService reactions;
    public RoomController(RedisRoomStore store,RoomRollService rolls,org.springframework.jdbc.core.simple.JdbcClient db,ReactionService reactions) { this.store=store;this.rolls=rolls;this.db=db;this.reactions=reactions; }
    public record ReactionInput(UUID commandId,String emoji) {}
    @PostMapping("/{id}/reaction")
    public ReactionService.Reaction react(@PathVariable UUID id,@RequestBody ReactionInput input,HttpServletRequest request){
        UUID user=principal(request);var room=member(id,user).room();
        int seat=room.seats().stream().filter(s->user.equals(s.principal())).findFirst().orElseThrow().index();
        try{return reactions.send(id,user,seat,input.commandId(),input.emoji());}
        catch(IllegalArgumentException invalid){throw new ResponseStatusException(HttpStatus.BAD_REQUEST);}
        catch(IllegalStateException conflict){throw new ResponseStatusException(HttpStatus.CONFLICT);}
    }
    public record Rank(int seatIndex,Integer rank,Integer pointsDelta) {}
    public record Result(String status,java.util.List<Rank> ranking) {}
    @GetMapping("/{id}/result")
    public Result result(@PathVariable UUID id,HttpServletRequest request) {
        member(id,principal(request));
        String status=db.sql("select status from matches where id=:id").param("id",id).query(String.class).optional().orElse("WAITING");
        if(!status.equals("SETTLED")) return new Result("PENDING",java.util.List.of());
        var ranking=db.sql("select seat_index,rank,points_delta from match_participants where match_id=:id order by rank")
                .param("id",id).query((rs,row)->new Rank(rs.getInt(1),rs.getObject(2,Integer.class),rs.getObject(3,Integer.class))).list();
        return new Result("COMMITTED",ranking);
    }
    public record Roll(UUID commandId) {}
    public record Move(UUID commandId,int planeId) {}
    @PostMapping("/{id}/move")
    public RoomRollService.MoveResult move(@PathVariable UUID id,@RequestBody Move input,HttpServletRequest request) {
        UUID user=principal(request);member(id,user);
        try { return rolls.move(id,user,input.commandId(),input.planeId()); }
        catch(IllegalArgumentException error) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST); }
        catch(IllegalStateException error) { throw new ResponseStatusException(HttpStatus.CONFLICT); }
    }
    @PostMapping("/{id}/roll")
    public RoomRollService.Result roll(@PathVariable UUID id,@RequestBody Roll input,HttpServletRequest request) {
        UUID user=principal(request);member(id,user);
        try { return rolls.roll(id,user,input.commandId()); }
        catch(IllegalArgumentException error) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST); }
        catch(IllegalStateException error) { throw new ResponseStatusException(HttpStatus.CONFLICT); }
    }
    private UUID principal(HttpServletRequest request) {
        var session=request.getSession(false);
        Object id=session==null?null:session.getAttribute("flightparty.principal");
        if(id==null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        return UUID.fromString(id.toString());
    }
    private RedisRoomStore.Stored member(UUID room,UUID principal) {
        var state=store.load(room).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
        if(state.room().seats().stream().noneMatch(s->principal.equals(s.principal()))) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return state;
    }
    @PostMapping
    public synchronized RoomSnapshot create(HttpServletRequest request) {
        UUID user=principal(request);var active=store.active(user);
        var room=active.isPresent()?member(active.get(),user).room():store.save(RoomRules.friends(UUID.randomUUID(),user),-1).room();
        return RoomSnapshot.forMember(room,user,Instant.now());
    }
    public record Join(UUID code) {}
    public record Ready(boolean ready) {}
    @PostMapping("/{id}/ready")
    public synchronized RoomSnapshot ready(@PathVariable UUID id,@RequestBody Ready input,HttpServletRequest request) {
        UUID user=principal(request);var old=member(id,user);
        try { return RoomSnapshot.forMember(store.save(RoomRules.ready(old.room(),user,input.ready(),Instant.now()),old.version()).room(),user,Instant.now()); }
        catch(IllegalStateException error) { throw new ResponseStatusException(HttpStatus.CONFLICT); }
    }
    @PostMapping("/quick")
    public synchronized RoomSnapshot quick(HttpServletRequest request) {
        UUID user=principal(request);var active=store.active(user);
        if(active.isPresent()) return RoomSnapshot.forMember(member(active.get(),user).room(),user,Instant.now());
        Instant now=Instant.now();
        for(UUID id:store.matching()) {
            var candidate=store.load(id);
            if(candidate.isEmpty()) continue;
            var old=candidate.get();
            if(old.room().phase()!=RoomRules.Phase.MATCHING || !now.isBefore(old.room().deadline()) || old.room().seats().size()>=4) continue;
            return RoomSnapshot.forMember(store.save(RoomRules.join(old.room(),user,now),old.version()).room(),user,now);
        }
        return RoomSnapshot.forMember(store.save(RoomRules.quick(UUID.randomUUID(),user,now),-1).room(),user,now);
    }
    @PostMapping("/join")
    public synchronized RoomSnapshot join(@RequestBody Join input,HttpServletRequest request) {
        UUID user=principal(request);
        if(input.code()==null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        var active=store.active(user);
        if(active.isPresent()) {
            if(!active.get().equals(input.code())) throw new ResponseStatusException(HttpStatus.CONFLICT);
            return RoomSnapshot.forMember(member(active.get(),user).room(),user,Instant.now());
        }
        var old=store.load(input.code()).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
        try { return RoomSnapshot.forMember(store.save(RoomRules.join(old.room(),user,Instant.now()),old.version()).room(),user,Instant.now()); }
        catch(IllegalStateException error) { throw new ResponseStatusException(HttpStatus.CONFLICT); }
    }
    @GetMapping("/{id}/snapshot")
    public RoomSnapshot snapshot(@PathVariable UUID id,HttpServletRequest request) {
        UUID user=principal(request);return RoomSnapshot.forMember(member(id,user).room(),user,Instant.now());
    }
    @GetMapping("/{id}/game")
    public com.flightparty.game.GameRules.State game(@PathVariable UUID id,HttpServletRequest request) {
        member(id,principal(request));
        try { return store.game(id); }
        catch(IllegalStateException error) { throw new ResponseStatusException(HttpStatus.CONFLICT); }
    }
    @PostMapping("/{id}/leave")
    public synchronized void leave(@PathVariable UUID id,HttpServletRequest request) {
        UUID user=principal(request);var old=member(id,user);
        try { store.save(RoomRules.leave(old.room(),user,Instant.now()),old.version()); }
        catch(IllegalStateException error) { throw new ResponseStatusException(HttpStatus.CONFLICT); }
    }
}
