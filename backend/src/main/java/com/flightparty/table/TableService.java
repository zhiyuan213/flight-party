package com.flightparty.table;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;
import com.flightparty.online.CustodyPolicy;

@Service
public class TableService {
 /* Two hosted easy bots must always be able to finish a match. Pool/bubbles/
    cards already cap themselves; this is the safety net for boards (chess,
    snooker, puzzle, gomoku) that have no natural move limit under weak play. */
 private static final int HOSTED_MOVE_CAP=240;
 /* ONLINE CUSTODY: a seat keeps its principal/account/name even while the
    easy bot plays for it, so the returning player reclaims the exact same
    seat. `custody` is active|grace|hosted|bot; `graceUntil` is an absolute
    server timestamp in ms. Old persisted rooms without these fields read as
    active (or bot), so a running deployment upgrades without a migration. */
 public record Seat(UUID principal,UUID account,String name,boolean bot,String piece,String board,String custody,Long graceUntil) {
  /* Long (not long): Jackson 3 cannot map a missing/null JSON field into a
     primitive, and rooms persisted before custody existed have no such field.
     Null is normalised here so every accessor is a non-null epoch value. */
  public Seat {custody=CustodyPolicy.normalize(custody,bot);if(graceUntil==null||graceUntil<0)graceUntil=0L;}
  public Seat(UUID principal,UUID account,String name,boolean bot){this(principal,account,name,bot,null,null,null,0L);}
  public Seat(UUID principal,UUID account,String name,boolean bot,String piece,String board){this(principal,account,name,bot,piece,board,null,0L);}
  public String resolved(long now){return CustodyPolicy.resolve(custody,graceUntil,now,bot);}
 }
 public record Room(UUID id,String game,String origin,String phase,List<Seat> seats,GridRules.State board,long version,long deadline,Map<String,Long> guesses) {public Room(UUID id,String game,String origin,String phase,List<Seat> seats,GridRules.State board,long version,long deadline){this(id,game,origin,phase,seats,board,version,deadline,Map.of());}}
 public record PublicSeat(String name,boolean bot,boolean member,boolean annualMember,String avatarUrl,String frame,String piece,String board,long points,String custody,long graceUntil) {}
 /* `ready` is one flag per seat, derived from table_room_ready (V22). The
     waiting dialog uses it to paint the "已准备" tag on both portraits. */
 /* `turnClockUntil` is 0 while the current turn is bot-controlled: a hosted
    seat (or a native bot) has NO visible countdown, the easy bot plays at its
    own pace. A real human turn keeps the 30s clock. The browser only renders
    this server decision, it never derives custody itself. */
 public record View(UUID id,String game,String origin,String phase,List<String> names,List<Boolean> bots,List<PublicSeat> profiles,GridRules.State board,long version,long deadline,long serverNow,int you,long playStartsAt,List<String> custody,List<Long> graceUntil,boolean managed,List<Boolean> ready,long turnClockUntil) {}
 private final JdbcClient db;private final ObjectMapper json;private final com.flightparty.auth.AppearanceService appearances;
 public TableService(JdbcClient db,ObjectMapper json,com.flightparty.auth.AppearanceService appearances){this.db=db;this.json=json;this.appearances=appearances;}
 private UUID principal(HttpServletRequest r){var s=r.getSession(false);var p=s==null?null:s.getAttribute("flightparty.principal");if(p==null)throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);return UUID.fromString(p.toString());}
 private Seat seat(UUID p){var account=db.sql("select account_id from principals where id=:id").param("id",p).query(UUID.class).optional().orElse(null);var name=account==null?"游客":db.sql("select display_name from accounts where id=:id").param("id",account).query(String.class).single();return new Seat(p,account,name,false);}
 private Room read(UUID id){return db.sql("select state from table_rooms where id=:id for update").param("id",id).query(String.class).optional().map(s->json.readValue(s,Room.class)).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));}
 private void write(Room r){db.sql("update table_rooms set state=:s,phase=:phase,updated_at=now() where id=:id").param("s",json.writeValueAsString(r)).param("phase",r.phase).param("id",r.id).update();}
 private int member(Room r,UUID p){for(int i=0;i<r.seats.size();i++)if(p.equals(r.seats.get(i).principal))return i;throw new ResponseStatusException(HttpStatus.FORBIDDEN);}
 private Room changed(Room r,String phase,List<Seat> seats,GridRules.State board,long deadline){return new Room(r.id,r.game,r.origin,phase,List.copyOf(seats),board,r.version+1,deadline,r.guesses);}
 // Chess keeps a shared board. Its appearance tie-breaker uses only server results.
 private long cosmeticPoints(Room r,Seat s){return s.account==null||!Set.of("four","chess").contains(r.game)?0:db.sql("select coalesce(sum(points),0) from table_results where account_id=:account and game=:game").param("account",s.account).param("game",r.game).query(Long.class).single();}
 /* Two real human identities are required for the managed custody flow. A
    QUICK room whose opponent was filled by a server bot has only one and is
    therefore a computer match: leaving ends it, re-entering starts fresh. */
 private boolean managed(Room r){return CustodyPolicy.managed((int)r.seats.stream().filter(s->!s.bot&&s.principal!=null).count());}
 private View view(Room r,UUID p){
  long now=System.currentTimeMillis();int you=member(r,p);
  /* Votes are authoritative and survive a page reload, so a returning client
     sees both "已准备" tags without any client-side guesswork. */
  var votes=new HashSet<>(db.sql("select principal_id from table_room_ready where room_id=:id").param("id",r.id).query(UUID.class).list());
  List<Boolean> ready=r.seats.stream().map(s->votes.contains(s.principal())).toList();
  int clockTurn=r.board.turn()-1;
  String clockState=clockTurn>=0&&clockTurn<r.seats.size()?r.seats.get(clockTurn).resolved(now):CustodyPolicy.ACTIVE;
  long turnClockUntil=CustodyPolicy.turnClockVisible(clockState)?r.deadline:0L;
  return new View(r.id,r.game,r.origin,r.phase,r.seats.stream().map(Seat::name).toList(),r.seats.stream().map(Seat::bot).toList(),r.seats.stream().map(s->{var a=s.account==null?null:appearances.get(s.account);return new PublicSeat(s.name,s.bot,a!=null&&a.member(),a!=null&&a.annualMember(),a==null?"/api/avatars/system/0":a.avatarUrl(),a==null?"none":a.frame(),s.piece,s.board,cosmeticPoints(r,s),s.resolved(now),s.graceUntil());}).toList(),r.game.equals("cards")?CardRules.visible(r.board,you+1):r.game.equals("draw")?SketchRules.visible(r.board,you+1):r.board,r.version,r.deadline,now,you,playStartsAt(r),r.seats.stream().map(s->s.resolved(now)).toList(),r.seats.stream().map(Seat::graceUntil).toList(),managed(r),ready,turnClockUntil);
 }
 private long firstDeadline(String game){return System.currentTimeMillis()+30000+((game.equals("pool")||game.equals("snooker"))?3000:0);}
 private long playStartsAt(Room r){return r.game.equals("pool")&&r.phase.equals("PLAYING")&&r.board.moves()==0?r.deadline-30000:0;}
 /* A seat that ends the game in grace or hosted writes no result row at all:
    no data, no points, no leaderboard entry, no completed-game count. A player
    who reconnected before the game ended is active again and scores normally. */
 private Room settle(Room r){if(!r.board.over())return r;long now=System.currentTimeMillis();for(int i=0;i<r.seats.size();i++){Seat s=r.seats.get(i);if(s.account==null)continue;if(!CustodyPolicy.recordsScore(s.resolved(now)))continue;int rank=r.game.equals("puzzle")?1:r.board.winner()==0?2:r.board.winner()==i+1?1:2;int points=rank==1?3:2;db.sql("insert into table_results(room_id,account_id,game,rank,points) values(:room,:account,:game,:rank,:points) on conflict do nothing").param("room",r.id).param("account",s.account).param("game",r.game).param("rank",rank).param("points",points).update();}return changed(r,"OVER",r.seats,r.board,0);}
 private Room tick(Room r){
  long now=System.currentTimeMillis();
  if(r.phase.equals("WAITING")&&r.deadline>0&&r.deadline<=now){var seats=new ArrayList<>(r.seats);seats.add(new Seat(null,null,"电脑",true));r=changed(r,"PLAYING",seats,r.board,firstDeadline(r.game));}
  if(!r.phase.equals("PLAYING"))return r;
  // 1. Expire every 30s reconnect window into easy-bot custody. Both seats can
  //    be hosted at once: the match simply keeps running until the board is over.
  var seats=new ArrayList<>(r.seats);boolean expired=false;
  for(int i=0;i<seats.size();i++){Seat s=seats.get(i);if(CustodyPolicy.GRACE.equals(s.custody())&&s.graceUntil()<=now){seats.set(i,new Seat(s.principal(),s.account(),s.name(),s.bot(),s.piece(),s.board(),CustodyPolicy.HOSTED,0L));expired=true;}}
  if(expired)r=changed(r,r.phase,seats,r.board,r.deadline);
  /* 2. An ONLINE but idle real player is hosted the moment their own 30s turn
        clock runs out — there is no second reconnect countdown. Only the seat
        whose turn it is can be hosted this way; computer matches (managed=false)
        keep the old one-off bot move. Polling snapshots deliberately do not
        count as presence, so an idle browser cannot cancel its own custody. */
  int idleTurn=r.board.turn()-1;
  if(managed(r)&&idleTurn>=0&&idleTurn<r.seats.size()){
   Seat t=r.seats.get(idleTurn);
   if(CustodyPolicy.hostOnIdle(t.resolved(now),r.deadline(),now)){
    var hosted=new ArrayList<>(r.seats);
    hosted.set(idleTurn,new Seat(t.principal(),t.account(),t.name(),false,t.piece(),t.board(),CustodyPolicy.HOSTED,0L));
    r=changed(r,r.phase,hosted,r.board,r.deadline);
   }
  }
  /* Double custody: keep playing, but guarantee a finish. A room with no
     active human left is declared a draw after HOSTED_MOVE_CAP moves; hosted
     seats write no results/points, so settle() only closes the room. */
  boolean allHosted=managed(r)&&r.seats.stream().allMatch(s->CustodyPolicy.botControlled(s.resolved(now)));
  if(allHosted&&r.board.moves()>=HOSTED_MOVE_CAP){
   var b=r.board;
   var drawn=new GridRules.State(b.game(),b.cells(),b.turn(),0,true,b.moves(),b.fen(),b.history(),b.shotCommand());
   return settle(changed(r,"PLAYING",r.seats,drawn,r.deadline));
  }
  int turn=r.board.turn()-1;if(turn<0||turn>=r.seats.size())return r;
  Seat turnSeat=r.seats.get(turn);String state=turnSeat.resolved(now);
  // During the 30s countdown the absent seat holds its turn; the remaining real
  // player can still act. No bot may move for a seat that might come back.
  if(CustodyPolicy.GRACE.equals(state))return r;
  if(r.game.equals("draw")){if(turnSeat.bot&&r.board.history().isEmpty())r=changed(r,r.phase,r.seats,SketchRules.computer(r.board),r.deadline);if(r.deadline<=now){r=changed(r,"PLAYING",r.seats,SketchRules.advance(r.board,false),now+30000);r=settle(r);}return r;}
  boolean hosted=CustodyPolicy.HOSTED.equals(state),botControlled=CustodyPolicy.botControlled(state);
  if((botControlled&&(hosted||!r.game.equals("pool")&&!r.game.equals("snooker")||r.deadline-now<=28000))||r.deadline<=now){
   // Hosted seats always use the easy bot, never the normal search-based bot.
   int command=hosted?GridRules.easyBot(r.board):GridRules.bot(r.board);
   var board=GridRules.move(r.board,r.board.turn(),command);
   /* A bot-controlled next turn gets only the short bot pace, NEVER a fresh
      30s visible countdown: the computer plays at its own rhythm. The next
      real human turn gets a full 30s. `deadline` is still the authoritative
      internal turn clock; `View.turnClockUntil` hides it while hosted. */
   int next=board.turn()-1;
   String nextState=next>=0&&next<r.seats.size()?r.seats.get(next).resolved(now):CustodyPolicy.ACTIVE;
   long nextGrace=next>=0&&next<r.seats.size()?r.seats.get(next).graceUntil():0L;
   r=changed(r,"PLAYING",r.seats,board,CustodyPolicy.nextDeadline(nextState,nextGrace,now));r=settle(r);}
  return r;}
 /* Reconnecting after a new session/login: the account reclaims the same seat,
    its outfit and an active (not hosted) state. */
 private Room recover(Room r,UUID p){if(r.seats.stream().anyMatch(s->p.equals(s.principal)))return r;Seat fresh=seat(p);if(fresh.account==null)return r;for(int index=0;index<r.seats.size();index++){Seat old=r.seats.get(index);if(fresh.account.equals(old.account)){var seats=new ArrayList<>(r.seats);seats.set(index,new Seat(p,old.account,fresh.name.replace("（托管）",""),false,old.piece,old.board,CustodyPolicy.ACTIVE,0L));return changed(r,r.phase,seats,r.board,r.deadline);}}return r;}
 /* Identity binding ONLY. A plain polling snapshot must NOT reclaim a hosted
    seat: an online-but-idle browser polls every 400ms/1s and would otherwise
    cancel its own custody instantly. Presence is now an explicit signal. */
 private Room bind(Room r,UUID p){if(r.board.over())return r;int index=member(r,p);Seat old=r.seats.get(index),fresh=seat(p);
  if((old.account==null&&fresh.account!=null)||old.bot){
   String kept=old.bot?CustodyPolicy.ACTIVE:old.custody();long keptUntil=old.bot?0L:old.graceUntil();
   Seat replacement=old.account!=null?new Seat(p,old.account,old.name.replace("（托管）",""),false,old.piece,old.board,kept,keptUntil):new Seat(fresh.principal,fresh.account,fresh.name,false,old.piece,old.board,kept,keptUntil);
   if(replacement.account!=null&&r.seats.stream().anyMatch(s->replacement.account.equals(s.account)&&!p.equals(s.principal)))throw new ResponseStatusException(HttpStatus.CONFLICT,"same account already seated");
   var seats=new ArrayList<>(r.seats);seats.set(index,replacement);r=changed(r,r.phase,seats,r.board,r.deadline);}
  return r;}
 /* Reconnecting (re-selecting 在线对决, an invite link, a fresh page load) or a
    real pointer/key event hands a grace/hosted seat straight back to its owner.
    The easy bot stops at once and the returning player gets a fresh 30s turn. */
 private Room reclaim(Room r,UUID p){r=bind(r,p);if(r.board.over())return r;int index=member(r,p);Seat old=r.seats.get(index);String state=old.resolved(System.currentTimeMillis());
  if(!CustodyPolicy.GRACE.equals(state)&&!CustodyPolicy.HOSTED.equals(state))return r;
  var seats=new ArrayList<>(r.seats);seats.set(index,new Seat(old.principal(),old.account(),old.name().replace("（托管）",""),false,old.piece(),old.board(),CustodyPolicy.ACTIVE,0L));
  return changed(r,r.phase,seats,r.board,CustodyPolicy.turnDeadline(System.currentTimeMillis()));}
 /* Presence endpoint: reconnect / mouse move / keyboard / tap. Polling is not
    presence. A hosted or grace seat is reclaimed. An active seat is READ-ONLY
    for a pointer event (wiggling the mouse must not extend the 30s idle clock);
    only an explicit `resume` on the caller's own turn grants a fresh 30s. */
 @Transactional public View activity(UUID id,boolean resume,HttpServletRequest request){UUID p=principal(request);Room r=read(id);int index=member(r,p);
  if(!r.phase.equals("PLAYING")||!managed(r))return view(r,p);
  long now=System.currentTimeMillis();Seat s=r.seats.get(index);String state=s.resolved(now);
  boolean absent=CustodyPolicy.GRACE.equals(state)||CustodyPolicy.HOSTED.equals(state);
  if(!absent&&(!resume||r.board.turn()-1!=index))return view(r,p);
  var seats=new ArrayList<>(r.seats);
  if(absent)seats.set(index,new Seat(s.principal(),s.account(),s.name(),false,s.piece(),s.board(),CustodyPolicy.ACTIVE,0L));
  Room next=changed(r,r.phase,seats,r.board,CustodyPolicy.turnDeadline(now));write(next);return view(next,p);}
 @Transactional public View create(String game,String mode,HttpServletRequest request){UUID p=principal(request);if(game==null||!Set.of("four","gomoku","xo","puzzle","chess","draw","cards","pool","bubbles","snooker").contains(game))throw new ResponseStatusException(HttpStatus.BAD_REQUEST);if(mode==null||!Set.of("QUICK","FRIENDS").contains(mode))throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
  UUID joiningAccount=seat(p).account;
  // Serialize matchmaking across processes and duplicate create requests for an identity.
  db.sql("select pg_advisory_xact_lock(hashtext(:key))").param("key","table:"+game).query(Object.class).single();
  for(UUID id:db.sql("select id from table_rooms where game=:game and phase in ('WAITING','PLAYING') order by created_at desc").param("game",game).query(UUID.class).list()){Room r=read(id);if(r.seats.stream().anyMatch(s->(p.equals(s.principal)||joiningAccount!=null&&joiningAccount.equals(s.account))&&!s.bot)){r=recover(r,p);r=tick(reclaim(r,p));write(r);return view(r,p);}}
  if(mode.equals("QUICK"))for(UUID id:db.sql("select id from table_rooms where game=:game and phase='WAITING' order by created_at").param("game",game).query(UUID.class).list()){Room r=read(id);if(r.deadline==0)continue;if(r.deadline<=System.currentTimeMillis()){write(tick(r));continue;}var me=seat(p);if(me.account!=null&&r.seats.stream().anyMatch(s->me.account.equals(s.account)))continue;var seats=new ArrayList<>(r.seats);seats.add(me);r=changed(r,"PLAYING",seats,r.board,firstDeadline(r.game));write(r);return view(r,p);}
  Room r=new Room(UUID.randomUUID(),game,mode,"WAITING",List.of(seat(p)),GridRules.start(game),0,mode.equals("QUICK")?System.currentTimeMillis()+30000:0);db.sql("insert into table_rooms(id,game,origin,phase,state) values(:id,:game,:origin,:phase,:s)").param("id",r.id).param("game",game).param("origin",mode).param("phase",r.phase).param("s",json.writeValueAsString(r)).update();return view(r,p);}
 @Transactional public View join(UUID id,HttpServletRequest request){UUID p=principal(request);Room r=recover(read(id),p);if(r.seats.stream().anyMatch(s->p.equals(s.principal))){r=tick(reclaim(r,p));write(r);return view(r,p);}if(!r.phase.equals("WAITING")||r.seats.size()!=1)throw new ResponseStatusException(HttpStatus.CONFLICT,"room started");var me=seat(p);if(me.account!=null&&r.seats.stream().anyMatch(s->me.account.equals(s.account)))throw new ResponseStatusException(HttpStatus.CONFLICT,"same account");var seats=new ArrayList<>(r.seats);seats.add(me);r=changed(r,r.deadline>0?"PLAYING":"WAITING",seats,r.board,r.deadline>0?firstDeadline(r.game):0);write(r);return view(r,p);}
 // Only the authenticated caller's seat can change. This is visual synchronization,
 // not server verification of the local shop's balance or item ownership.
 @Transactional public View cosmetics(UUID id,String pieceId,String boardId,HttpServletRequest request){
  UUID p=principal(request);Room r=read(id);int index=member(r,p);
  if(r.phase.equals("CLOSED"))throw new ResponseStatusException(HttpStatus.CONFLICT);
  TableCosmetics.Selection choice;
  try{choice=TableCosmetics.select(r.game,pieceId,boardId);}catch(IllegalArgumentException e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"invalid cosmetic selection");}
  Seat old=r.seats.get(index);
  if(Objects.equals(old.piece,choice.piece())&&Objects.equals(old.board,choice.board()))return view(r,p);
  var seats=new ArrayList<>(r.seats);
  // Keep custody too: changing an outfit cannot reclaim a hosted seat or
  // restart its 30s reconnect window.
  seats.set(index,new Seat(old.principal,old.account,old.name,old.bot,choice.piece(),choice.board(),old.custody(),old.graceUntil()));
  // Keep gameplay version and deadline: changing an outfit cannot reject a legal
  // in-flight move, replay a turn, reset a clock, or trigger a bot action.
  r=new Room(r.id,r.game,r.origin,r.phase,List.copyOf(seats),r.board,r.version,r.deadline,r.guesses);
  write(r);return view(r,p);
 }
 /* A polling snapshot is NOT presence. It still advances the authoritative
    clock (an idle online seat can become hosted), but never reclaims custody;
    that requires /activity, join, create or an actual move. */
 @Transactional public View snapshot(UUID id,HttpServletRequest request){UUID p=principal(request);Room r=read(id);member(r,p);var next=db.sql("select successor_id from table_rooms where id=:id").param("id",id).query(UUID.class).optional();if(next.isPresent()){r=read(next.get());member(r,p);}r=tick(bind(r,p));write(r);return view(r,p);}
 @Transactional public View move(UUID id,UUID command,long version,int position,HttpServletRequest request){UUID p=principal(request);if(command==null)throw new ResponseStatusException(HttpStatus.BAD_REQUEST);Room r=read(id);int you=member(r,p);if(db.sql("select count(*) from table_commands where room_id=:r and principal_id=:p and command_id=:c").param("r",id).param("p",p).param("c",command).query(Long.class).single()>0)return view(r,p);r=tick(reclaim(r,p));if(!r.phase.equals("PLAYING")||r.version!=version||r.board.turn()!=you+1){write(r);return view(r,p);}if(System.currentTimeMillis()<playStartsAt(r))throw new ResponseStatusException(HttpStatus.CONFLICT,"opening countdown");if(r.game.equals("draw"))throw new ResponseStatusException(HttpStatus.CONFLICT,"use sketch commands");try{r=changed(r,"PLAYING",r.seats,GridRules.move(r.board,you+1,position),System.currentTimeMillis()+30000);}catch(IllegalArgumentException|IllegalStateException e){throw new ResponseStatusException(HttpStatus.CONFLICT,"illegal move");}db.sql("insert into table_commands values(:r,:p,:c)").param("r",id).param("p",p).param("c",command).update();r=settle(r);write(r);return view(r,p);}

 @Transactional public View sketch(UUID id,UUID command,long version,String action,String text,List<Integer> points,HttpServletRequest request){UUID p=principal(request);Room r=read(id);int you=member(r,p);if(command==null||!r.game.equals("draw"))throw new ResponseStatusException(HttpStatus.BAD_REQUEST);if(db.sql("select count(*) from table_commands where room_id=:r and principal_id=:p and command_id=:c").param("r",id).param("p",p).param("c",command).query(Long.class).single()>0)return view(r,p);r=tick(reclaim(r,p));if(!r.phase.equals("PLAYING")||r.version!=version){write(r);return view(r,p);}if("guess".equals(action)){String key=p+":"+r.board.moves();var guesses=new HashMap<String,Long>(r.guesses==null?Map.of():r.guesses);long now=System.currentTimeMillis();if(guesses.getOrDefault(key+":count",0L)>=6||now-guesses.getOrDefault(key+":time",0L)<1000)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"guess limit");guesses.put(key+":count",guesses.getOrDefault(key+":count",0L)+1);guesses.put(key+":time",now);r=new Room(r.id,r.game,r.origin,r.phase,r.seats,r.board,r.version,r.deadline,guesses);}try{var next=SketchRules.act(r.board,you+1,action,text,points);r=changed(r,r.phase,r.seats,next,next.moves()!=r.board.moves()?System.currentTimeMillis()+30000:r.deadline);}catch(IllegalArgumentException|IllegalStateException e){throw new ResponseStatusException(HttpStatus.CONFLICT,"illegal drawing action");}db.sql("insert into table_commands values(:r,:p,:c)").param("r",id).param("p",p).param("c",command).update();r=settle(r);write(r);return view(r,p);}
 /* Leaving an online room:
    * computer match (only one human identity) -> end it. Re-entering creates
      a brand-new game; no grace, no custody, no reconnect.
    * managed real-player match -> keep the exact seat/identity/outfit and open
      a visible 30s reconnect window. When it expires tick() hands the seat to
      an easy bot. Both players may do this and the game still finishes. */
 @Transactional public void leave(UUID id,HttpServletRequest request){UUID p=principal(request);Room r=read(id);int you=member(r,p);
  if(r.phase.equals("WAITING")){r=changed(r,"CLOSED",r.seats,r.board,0);write(r);return;}
  if(!r.phase.equals("PLAYING"))return;
  if(!managed(r)){r=changed(r,"CLOSED",r.seats,r.board,0);write(r);return;}
  long now=System.currentTimeMillis();var seats=new ArrayList<>(r.seats);Seat s=seats.get(you);
  // Repeated leave requests must not rewind the countdown.
  if(CustodyPolicy.GRACE.equals(s.custody())||CustodyPolicy.HOSTED.equals(s.custody()))return;
  seats.set(you,new Seat(s.principal,s.account,s.name.replace("（托管）",""),false,s.piece,s.board,CustodyPolicy.GRACE,CustodyPolicy.graceDeadline(now)));
  // Align the visible turn clock with the 30s reconnect countdown.
  r=changed(r,r.phase,seats,r.board,CustodyPolicy.graceDeadline(now));write(r);}
 @Transactional public void advance(UUID id){Room r=read(id);Room next=tick(r);if(next!=r)write(next);}
 public List<UUID> pending(){return db.sql("select id from table_rooms where phase in ('WAITING','PLAYING')").query(UUID.class).list();}
 public record Statistics(long points,long completedGames) {}
 public Statistics statistics(String game,HttpServletRequest request){UUID p=principal(request);return db.sql("select coalesce(sum(t.points),0),count(t.room_id) from principals p left join table_results t on t.account_id=p.account_id and t.game=:game where p.id=:id").param("id",p).param("game",game).query((rs,n)->new Statistics(rs.getLong(1),rs.getLong(2))).single();}
 /* "再来一次" re-enters the ORIGINAL mode from the middle page, it does NOT
    reset the board in place:
      · QUICK   -> create() re-queues this identity for a NEW random opponent.
      · FRIENDS -> one shared SUCCESSOR room in WAITING with the same real
        players and EMPTY ready votes. Both clients call rematch() on their
        own; successor_id makes them land in the very same room. They then
        press "准备" again and wait for the friend, exactly like the first
        game. There are deliberately no rematch votes and no automatic
        PLAYING transition — a fresh match needs both people back. */
 @Transactional public View rematch(UUID id,HttpServletRequest request){UUID p=principal(request);Room old=read(id);member(old,p);if(!old.phase.equals("OVER"))throw new ResponseStatusException(HttpStatus.CONFLICT);
  if(old.origin.equals("QUICK"))return create(old.game,"QUICK",request);
  var existing=db.sql("select successor_id from table_rooms where id=:id").param("id",id).query(UUID.class).optional();if(existing.isPresent())return view(read(existing.get()),p);
  /* Keep only real humans: a friend who never showed up was replaced by a
     server bot, and that seat must be free again for the invitation flow. */
  var fresh=old.seats.stream().filter(s->!s.bot).map(s->new Seat(s.principal,s.account,s.name.replace("（托管）",""),false,s.piece,s.board,CustodyPolicy.ACTIVE,0L)).toList();
  Room r=new Room(UUID.randomUUID(),old.game,"FRIENDS","WAITING",fresh,GridRules.start(old.game),0,0);db.sql("insert into table_rooms(id,game,origin,phase,state) values(:id,:game,'FRIENDS','WAITING',:state)").param("id",r.id).param("game",r.game).param("state",json.writeValueAsString(r)).update();db.sql("update table_rooms set successor_id=:next where id=:id").param("next",r.id).param("id",id).update();return view(r,p);}
 @Transactional public View ready(UUID id,HttpServletRequest request){UUID p=principal(request);Room r=read(id);member(r,p);if(!r.phase.equals("WAITING"))return view(r,p);db.sql("insert into table_room_ready values(:id,:p) on conflict do nothing").param("id",id).param("p",p).update();var votes=db.sql("select principal_id from table_room_ready where room_id=:id").param("id",id).query(UUID.class).list();if(r.seats.size()==2&&r.seats.stream().allMatch(seat->votes.contains(seat.principal)))r=changed(r,"PLAYING",r.seats,r.board,firstDeadline(r.game));else if(r.seats.size()==1&&r.deadline==0)r=changed(r,r.phase,r.seats,r.board,System.currentTimeMillis()+30000);write(r);return view(r,p);}

 public record Reaction(long id,int seat,String name,String emoji,long time) {}
 @Transactional public List<Reaction> reactions(UUID id,long after,HttpServletRequest request){UUID p=principal(request);Room room=read(id);member(room,p);return reactions(room,after);}
 private List<Reaction> reactions(Room room,long after){return db.sql("select id,principal_id,emoji,extract(epoch from created_at)*1000 as stamp from table_reactions where room_id=:room and id>:after and created_at>now()-interval '10 seconds' order by id limit 32").param("room",room.id).param("after",Math.max(0,after)).query((rs,n)->{UUID sender=rs.getObject("principal_id",UUID.class);int index=-1;for(int i=0;i<room.seats.size();i++)if(sender.equals(room.seats.get(i).principal)){index=i;break;}return new Reaction(rs.getLong("id"),index,index<0?"玩家":room.seats.get(index).name,rs.getString("emoji"),rs.getLong("stamp"));}).list();}
 @Transactional public List<Reaction> react(UUID id,UUID command,String emoji,HttpServletRequest request){UUID p=principal(request);Room room=read(id);member(room,p);if(command==null||!Set.of("😂","👋","🎉","😮","❤️","👍").contains(emoji==null?"":emoji))throw new ResponseStatusException(HttpStatus.BAD_REQUEST);if(room.phase.equals("CLOSED"))throw new ResponseStatusException(HttpStatus.CONFLICT);boolean duplicate=db.sql("select count(*) from table_reactions where room_id=:room and principal_id=:p and command_id=:c").param("room",id).param("p",p).param("c",command).query(Long.class).single()>0;if(!duplicate){long recent=db.sql("select count(*) from table_reactions where room_id=:room and principal_id=:p and created_at>now()-interval '1500 milliseconds'").param("room",id).param("p",p).query(Long.class).single();if(recent>0)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS);db.sql("insert into table_reactions(room_id,principal_id,command_id,emoji) values(:room,:p,:c,:emoji)").param("room",id).param("p",p).param("c",command).param("emoji",emoji).update();}return reactions(room,0);}
 public record Chat(long id,int seat,String name,String text,long time) {}
 @Transactional public List<Chat> chat(UUID id,long after,HttpServletRequest request){UUID p=principal(request);Room room=read(id);member(room,p);return chat(room,after);}
 private List<Chat> chat(Room room,long after){return db.sql("select * from (select id,sender_seat,sender_name,message,extract(epoch from created_at)*1000 as stamp from table_chat where room_id=:room and id>:after and created_at>now()-interval '24 hours' order by id desc limit 100) recent order by id").param("room",room.id).param("after",Math.max(0,after)).query((rs,n)->new Chat(rs.getLong("id"),rs.getInt("sender_seat"),rs.getString("sender_name"),rs.getString("message"),rs.getLong("stamp"))).list();}
 @Transactional public List<Chat> sendChat(UUID id,UUID command,String text,HttpServletRequest request){UUID p=principal(request);Room room=read(id);int index=member(room,p);if(command==null||text==null)throw new ResponseStatusException(HttpStatus.BAD_REQUEST);String clean=text.strip().replaceAll("[\\r\\n\\t]+"," ");if(clean.isBlank()||clean.codePointCount(0,clean.length())>200||clean.codePoints().anyMatch(c->Character.isISOControl(c)||c>=0x202a&&c<=0x202e||c>=0x2066&&c<=0x2069))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"chat must contain 1-200 plain text characters");if(room.phase.equals("CLOSED"))throw new ResponseStatusException(HttpStatus.CONFLICT);boolean duplicate=db.sql("select count(*) from table_chat where room_id=:room and principal_id=:p and command_id=:c").param("room",id).param("p",p).param("c",command).query(Long.class).single()>0;if(!duplicate){long recent=db.sql("select count(*) from table_chat where room_id=:room and principal_id=:p and created_at>now()-interval '1 second'").param("room",id).param("p",p).query(Long.class).single();if(recent>0)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS);db.sql("insert into table_chat(room_id,principal_id,command_id,sender_seat,sender_name,message) values(:room,:p,:c,:seat,:name,:message)").param("room",id).param("p",p).param("c",command).param("seat",index).param("name",room.seats.get(index).name).param("message",clean).update();}return chat(room,0);}
 public record Ranking(String name,long points,long games,boolean member,boolean annualMember,String avatarUrl,String frame,long wins) {}
 /* The flight detail page now shares the table game's win-rate standings.
    Flight results live in account_match_results / matches, not table_results,
    so the same Ranking shape is projected from the authoritative flight
    settlement rows: rank=1 is a win, every row is a completed game. */
 public List<Ranking> leaderboard(String game,String period){
  if(!Set.of("day","week","month").contains(period))throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
  if("flight".equals(game))return flightLeaderboard(period);
return db.sql("select a.id,a.display_name,sum(t.points),count(*),sum(case when t.rank=1 then 1 else 0 end) from table_results t join accounts a on a.id=t.account_id where t.game=:game and t.created_at >= (date_trunc(:period,now() at time zone 'UTC') at time zone 'UTC') group by a.id,a.display_name order by sum(case when t.rank=1 then 1 else 0 end)::numeric/nullif(count(*),0) desc,count(*) desc,a.id limit 10").param("game",game).param("period",period).query((rs,n)->{var a=appearances.get(rs.getObject(1,UUID.class));return new Ranking(rs.getString(2),rs.getLong(3),rs.getLong(4),a.member(),a.annualMember(),a.avatarUrl(),a.frame(),rs.getLong(5));}).list();
 }
 private List<Ranking> flightLeaderboard(String period){
  return db.sql("select a.id,a.display_name,sum(r.points_delta),count(*),sum(case when r.rank=1 then 1 else 0 end) from account_match_results r join matches m on m.id=r.match_id join accounts a on a.id=r.account_id where m.status='SETTLED' and m.settled_at >= (date_trunc(:period,now() at time zone 'UTC') at time zone 'UTC') and m.settled_at <= now() group by a.id,a.display_name order by sum(case when r.rank=1 then 1 else 0 end)::numeric/nullif(count(*),0) desc,count(*) desc,a.id limit 10")
   .param("period",period).query((rs,n)->{var a=appearances.get(rs.getObject(1,UUID.class));return new Ranking(rs.getString(2),rs.getLong(3),rs.getLong(4),a.member(),a.annualMember(),a.avatarUrl(),a.frame(),rs.getLong(5));}).list();
 }
}
