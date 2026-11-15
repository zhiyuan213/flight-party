package com.flightparty.table;

import com.flightparty.auth.AppearanceService;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Service boundary tests with an in-memory JDBC stub, not a database integration test. */
class TableCosmeticsServiceTest {
 @Test void readyVotesArePublishedPerSeatAndStartTheRoomOnTheSecondVote(){
  var f=new Fixture();var room=f.room("xo","WAITING",f.seats("xo"),0);f.put(room);
  var first=f.service.ready(room.id(),request(f.me));
  assertEquals(List.of(true,false),first.ready(),"only the caller's portrait is marked ready");
  assertEquals("WAITING",first.phase(),"one vote alone cannot start a two-seat room");
  assertEquals(0L,f.get(room.id()).deadline(),"no bot-fill countdown is armed in a friends room");
  var second=f.service.ready(room.id(),request(f.other));
  assertEquals(List.of(true,true),second.ready());
  assertEquals("PLAYING",second.phase());
  assertEquals(List.of(true,true),f.service.snapshot(room.id(),request(f.me)).ready(),
    "a reloading client still sees both ready tags");
 }
 @Test void changesOnlyCallerSeatWithoutAdvancingExpiredTurnOrBot(){
  var f=new Fixture();var mine=new TableService.Seat(f.me,null,"Mine",true,"gomoku-piece-neon","gomoku-board-default");
  var other=new TableService.Seat(f.other,null,"Other",false,"gomoku-piece-jade","gomoku-board-default");
  var old=f.room("gomoku","PLAYING",List.of(mine,other),1);f.put(old);
  var view=f.service.cosmetics(old.id(),"gomoku-piece-aurora",null,request(f.me));var saved=f.get(old.id());
  assertEquals("gomoku-piece-aurora",saved.seats().getFirst().piece());
  assertEquals(other,saved.seats().get(1));assertEquals(mine.principal(),saved.seats().getFirst().principal());
  assertEquals(mine.account(),saved.seats().getFirst().account());assertEquals(mine.name(),saved.seats().getFirst().name());
  assertTrue(saved.seats().getFirst().bot(),"appearance request must not reclaim a bot or act for it");
  assertEquals(f.json.writeValueAsString(old.board()),f.json.writeValueAsString(saved.board()));
  assertEquals(old.version(),saved.version());assertEquals(old.deadline(),saved.deadline());
  assertEquals(old.phase(),saved.phase());assertEquals(old.origin(),saved.origin());assertEquals(old.guesses(),saved.guesses());
  assertEquals("gomoku-piece-aurora",view.profiles().getFirst().piece());assertEquals(other.piece(),view.profiles().get(1).piece());
  assertEquals(1,f.updates);assertEquals(0,f.scoreQueries);
 }
 @Test void requiresSessionAndCurrentSeatBeforeAnyWrite(){
  var f=new Fixture();var room=f.room("xo","PLAYING",f.seats("xo"),Long.MAX_VALUE);f.put(room);
  assertStatus(HttpStatus.UNAUTHORIZED,()->f.service.cosmetics(room.id(),"xo-piece-jade",null,new MockHttpServletRequest()));
  assertStatus(HttpStatus.FORBIDDEN,()->f.service.cosmetics(room.id(),"xo-piece-jade",null,request(UUID.randomUUID())));
  assertEquals(0,f.updates);assertEquals(f.json.writeValueAsString(room),f.rooms.get(room.id()));
 }
 @Test void rejectsRemovedFamiliesCrossGameIdsAndClosedRoomsWithoutWriting(){
  var f=new Fixture();var room=f.room("four","PLAYING",f.seats("four"),Long.MAX_VALUE);f.put(room);
  for(String value:List.of("xo-piece-jade","four-piece-unknown","https://example.com/a.svg","four-piece-jade "))
   assertStatus(HttpStatus.BAD_REQUEST,()->f.service.cosmetics(room.id(),value,null,request(f.me)));
  assertStatus(HttpStatus.BAD_REQUEST,()->f.service.cosmetics(room.id(),null,"chess-board-jade",request(f.me)));
  var closed=f.room("four","CLOSED",f.seats("four"),0);f.put(closed);
  assertStatus(HttpStatus.CONFLICT,()->f.service.cosmetics(closed.id(),null,null,request(f.me)));
  var unsupported=f.room("pool","PLAYING",f.seats("pool"),Long.MAX_VALUE);f.put(unsupported);
  assertStatus(HttpStatus.BAD_REQUEST,()->f.service.cosmetics(unsupported.id(),null,null,request(f.me)));
  assertEquals(0,f.updates);
 }
 @Test void repeatSelectionIsReadOnlyAndNullSelectionResetsToBaseline(){
  var f=new Fixture();var room=f.room("xo","WAITING",f.seats("xo"),0);f.put(room);
  f.service.cosmetics(room.id(),"xo-piece-jade",null,request(f.me));
  f.service.cosmetics(room.id(),"xo-piece-jade","xo-board-default",request(f.me));
  assertEquals(1,f.updates);
  var view=f.service.cosmetics(room.id(),null,null,request(f.me));
  assertEquals("xo-piece-default",view.profiles().getFirst().piece());assertEquals("xo-board-default",view.profiles().getFirst().board());
  assertEquals(2,f.updates);
 }
 @Test void accountRecoveryKeepsSelectionsAndReplacesOnlyRecoveredIdentity(){
  var f=new Fixture();UUID account=UUID.randomUUID(),newPrincipal=UUID.randomUUID();
  var oldSeat=new TableService.Seat(f.me,account,"Old（托管）",true,"gomoku-piece-jade","gomoku-board-default");
  var room=f.room("gomoku","PLAYING",List.of(oldSeat,f.seats("gomoku").get(1)),Long.MAX_VALUE);f.put(room);
  f.accounts.put(newPrincipal,account);f.names.put(account,"Recovered");
  var view=f.service.join(room.id(),request(newPrincipal));var seat=f.get(room.id()).seats().getFirst();
  assertEquals(newPrincipal,seat.principal());assertEquals(account,seat.account());assertFalse(seat.bot());
  assertEquals(oldSeat.piece(),seat.piece());assertEquals(oldSeat.board(),seat.board());assertEquals(0,view.you());
  assertStatus(HttpStatus.FORBIDDEN,()->f.service.cosmetics(room.id(),null,null,request(f.me)));
 }
 @Test void guestBindingAndReconnectWindowRetainSelections(){
  /* Leaving a managed online room no longer turns the seat into a bot. It
     keeps the exact identity/outfit and opens a 30s reconnect window; only
     after that does an easy bot take over. */
  var f=new Fixture();UUID account=UUID.randomUUID();f.accounts.put(f.me,account);f.names.put(account,"Signed In");
  var first=new TableService.Seat(f.me,null,"Guest",false,"xo-piece-aurora","xo-board-default");
  var room=f.room("xo","PLAYING",List.of(first,f.seats("xo").get(1)),Long.MAX_VALUE);f.put(room);
  f.service.join(room.id(),request(f.me));var bound=f.get(room.id()).seats().getFirst();
  assertEquals(account,bound.account());assertEquals(first.piece(),bound.piece());assertEquals(first.board(),bound.board());
  f.service.leave(room.id(),request(f.me));var absent=f.get(room.id()).seats().getFirst();
  assertFalse(absent.bot(),"a hosted seat keeps its human identity");
  assertEquals(com.flightparty.online.CustodyPolicy.GRACE,absent.custody());
  assertTrue(absent.graceUntil()>System.currentTimeMillis());
  assertEquals(f.me,absent.principal());assertEquals(bound.account(),absent.account());
  assertEquals(bound.piece(),absent.piece());assertEquals(bound.board(),absent.board());
  // Coming back reclaims the same seat and clears the countdown.
  var view=f.service.join(room.id(),request(f.me));
  assertEquals(0,view.you());
  assertEquals(com.flightparty.online.CustodyPolicy.ACTIVE,f.get(room.id()).seats().getFirst().custody());
 }
 @Test void anExpiredGraceBecomesEasyBotCustodyAndKeepsTheIdentity(){
  var f=new Fixture();long now=System.currentTimeMillis();
  var leaving=new TableService.Seat(f.me,null,"Leaving",false,"xo-piece-default","xo-board-default",
    com.flightparty.online.CustodyPolicy.GRACE,now-1);
  var staying=new TableService.Seat(f.other,null,"Staying",false,"xo-piece-neon","xo-board-default");
  var room=f.room("xo","PLAYING",List.of(leaving,staying),Long.MAX_VALUE);f.put(room);
  f.service.advance(room.id());var next=f.get(room.id());
  assertEquals(com.flightparty.online.CustodyPolicy.HOSTED,next.seats().getFirst().custody());
  assertEquals(f.me,next.seats().getFirst().principal(),"the easy bot never replaces the player");
  assertFalse(next.seats().getFirst().bot());
  assertEquals(com.flightparty.online.CustodyPolicy.ACTIVE,next.seats().get(1).custody());
  assertTrue(next.board().moves()>room.board().moves(),"the hosted seat still plays its turn");
  assertTrue(f.results.isEmpty(),"an unfinished hosted match writes no results");
 }
 @Test void aDoubleHostedMatchAlwaysFinishesAndWritesNoResultsOrPoints(){
  var f=new Fixture();UUID first=UUID.randomUUID(),second=UUID.randomUUID();
  f.accounts.put(f.me,first);f.names.put(first,"First");f.accounts.put(f.other,second);f.names.put(second,"Second");
  var hosted1=new TableService.Seat(f.me,first,"First",false,"xo-piece-default","xo-board-default",
    com.flightparty.online.CustodyPolicy.HOSTED,0L);
  var hosted2=new TableService.Seat(f.other,second,"Second",false,"xo-piece-neon","xo-board-default",
    com.flightparty.online.CustodyPolicy.HOSTED,0L);
  var start=GridRules.start("xo");
  var longBoard=new GridRules.State("xo",start.cells(),1,0,false,240);
  var room=f.room("xo","PLAYING",List.of(hosted1,hosted2),Long.MAX_VALUE);
  room=new TableService.Room(room.id(),room.game(),room.origin(),room.phase(),room.seats(),longBoard,
   room.version(),room.deadline(),room.guesses());f.put(room);
  f.service.advance(room.id());var settled=f.get(room.id());
  assertEquals("OVER",settled.phase(),"double custody is never left running forever");
  assertTrue(settled.board().over());
  assertTrue(f.results.isEmpty(),"hosted seats write no table_results rows and earn no points");
 }
 @Test void aReconnectedSeatScoresNormallyWhenTheMatchEnds(){
  var f=new Fixture();UUID account=UUID.randomUUID();f.accounts.put(f.me,account);f.names.put(account,"Back");
  var back=new TableService.Seat(f.me,account,"Back",false,"xo-piece-default","xo-board-default",
    com.flightparty.online.CustodyPolicy.ACTIVE,0L);
  var rival=new TableService.Seat(f.other,null,"Rival",false,"xo-piece-neon","xo-board-default",
    com.flightparty.online.CustodyPolicy.HOSTED,0L);
  var start=GridRules.start("xo");
  var longBoard=new GridRules.State("xo",start.cells(),1,0,false,240);
  var room=f.room("xo","PLAYING",List.of(back,rival),Long.MAX_VALUE);
  room=new TableService.Room(room.id(),room.game(),room.origin(),room.phase(),room.seats(),longBoard,
   room.version(),room.deadline(),room.guesses());f.put(room);
  /* One active human means the hosted cap must NOT fire: the board is frozen
     at moves=240 but there is still a real player who can finish the match. */
  f.service.advance(room.id());
  assertEquals("PLAYING",f.get(room.id()).phase());
  assertTrue(f.results.isEmpty());
 }
 @Test void friendRematchPreservesBothSeatSelections(){
  var f=new Fixture();var seats=f.seats("gomoku");var room=f.room("gomoku","OVER",seats,0);f.put(room);
  f.votes.put(room.id(),new LinkedHashSet<>(List.of(f.other)));
  var view=f.service.rematch(room.id(),request(f.me));var next=f.get(view.id());
  assertNotEquals(room.id(),next.id());assertEquals(seats,next.seats());
  assertEquals(seats.getFirst().piece(),view.profiles().getFirst().piece());assertEquals(seats.get(1).piece(),view.profiles().get(1).piece());
 }
 /* "再来一次" in a friends room goes back to the middle page, then into ONE
    shared WAITING successor: no rematch votes, no automatic start, both
    players must press 准备 again while waiting for the friend to return. */
 @Test void friendRematchReopensOneSharedWaitingRoomUntilBothReadyAgain(){
  var f=new Fixture();var seats=f.seats("gomoku");var room=f.room("gomoku","OVER",seats,0);f.put(room);
  var mine=f.service.rematch(room.id(),request(f.me));
  assertEquals("WAITING",mine.phase(),"a rematch waits for both players instead of starting immediately");
  assertEquals(0L,mine.deadline(),"a friends room has no bot-fill countdown");
  assertEquals(List.of(false,false),mine.bots(),"only real players are carried over");
  assertEquals(List.of(false,false),mine.ready(),"the new room starts with empty ready votes");
  assertEquals(2,mine.names().size());
  var theirs=f.service.rematch(room.id(),request(f.other));
  assertEquals(mine.id(),theirs.id(),"successor_id puts both clients in the same room without votes");
  assertEquals("WAITING",f.get(mine.id()).phase());
  f.service.ready(mine.id(),request(f.me));
  assertEquals("WAITING",f.get(mine.id()).phase(),"one ready vote cannot start the next game");
  assertEquals("PLAYING",f.service.ready(mine.id(),request(f.other)).phase());
 }
 @Test void sharedBoardArbitrationPointsComeOnlyFromServerResultsAndGuestsAreZero(){
  for(String game:List.of("chess","four")){
  var f=new Fixture();UUID account=UUID.randomUUID();f.scores.put(account,-7L);
  var mine=new TableService.Seat(f.me,account,"Account",false,game+"-piece-default",game+"-board-jade");
  var room=f.room(game,"PLAYING",List.of(mine,new TableService.Seat(f.other,null,"Guest",false)),Long.MAX_VALUE);f.put(room);
  var view=f.service.cosmetics(room.id(),null,game+"-board-aurora",request(f.me));
  assertEquals(-7,view.profiles().getFirst().points());assertEquals(0,view.profiles().get(1).points());
  assertEquals(1,f.scoreQueries);assertEquals(game,f.lastScoreGame);assertEquals(account,f.lastScoreAccount);
  assertEquals(room.version(),view.version());assertEquals(room.deadline(),view.deadline());
  }
 }
 @Test void fourBoardSelectionPreservesBothServerScoreProfiles(){
  var f=new Fixture();UUID first=UUID.randomUUID(),second=UUID.randomUUID();f.scores.put(first,120L);f.scores.put(second,800L);
  var seats=List.of(new TableService.Seat(f.me,first,"First",false,"four-piece-neon","four-board-default"),
    new TableService.Seat(f.other,second,"Second",false,"four-piece-default","four-board-jade"));
  var room=f.room("four","PLAYING",seats,Long.MAX_VALUE);f.put(room);
  var view=f.service.cosmetics(room.id(),"four-piece-neon","four-board-aurora",request(f.me));
  assertEquals("four-board-aurora",view.profiles().getFirst().board());assertEquals("four-board-jade",view.profiles().get(1).board());
  assertEquals(120,view.profiles().getFirst().points());assertEquals(800,view.profiles().get(1).points());
  assertEquals(2,f.scoreQueries);assertEquals("four",f.lastScoreGame);assertEquals(room.version(),view.version());
 }
 /* ---- online presence: idle hosting, bot pace, explicit reclaim ---------- */
 private TableService.Seat seat(UUID principal,String name,String piece,String custody){
  return new TableService.Seat(principal,null,name,false,piece,"xo-board-default",custody,0L);
 }
 @Test void anOnlineButIdleSeatIsHostedTheMomentIts30sTurnClockRunsOut(){
  var f=new Fixture();long now=System.currentTimeMillis();
  var idle=seat(f.me,"Idle",null,com.flightparty.online.CustodyPolicy.ACTIVE);
  var rival=seat(f.other,"Rival","xo-piece-neon",com.flightparty.online.CustodyPolicy.ACTIVE);
  var room=f.room("xo","PLAYING",List.of(idle,rival),now-1);f.put(room);
  f.service.advance(room.id());var next=f.get(room.id());
  assertEquals(com.flightparty.online.CustodyPolicy.HOSTED,next.seats().getFirst().custody(),
    "no second reconnect countdown for a player who is online but idle");
  assertEquals(0L,next.seats().getFirst().graceUntil());
  assertFalse(next.seats().getFirst().bot(),"the original identity is kept for a later resume");
  assertEquals(com.flightparty.online.CustodyPolicy.ACTIVE,next.seats().get(1).custody());
  assertTrue(next.board().moves()>room.board().moves(),"the easy bot takes over immediately");
  assertTrue(f.results.isEmpty(),"a hosted seat writes no results");
 }
 @Test void hostedTurnsNeverRearmA30SecondCountdownAndHideTheClock(){
  var f=new Fixture();long now=System.currentTimeMillis();
  var one=seat(f.me,"One",null,com.flightparty.online.CustodyPolicy.HOSTED);
  var two=seat(f.other,"Two","xo-piece-neon",com.flightparty.online.CustodyPolicy.HOSTED);
  var room=f.room("xo","PLAYING",List.of(one,two),now-1);f.put(room);
  f.service.advance(room.id());var next=f.get(room.id());
  assertTrue(next.deadline()<=System.currentTimeMillis()+com.flightparty.online.CustodyPolicy.HOSTED_PACE_MS+1000,
    "the bot plays at its own pace instead of restarting a 30s clock");
  assertEquals(0L,f.service.snapshot(room.id(),request(f.me)).turnClockUntil(),
    "a hosted turn has NO visible countdown");
 }
 @Test void aRealPlayerTurnStillGetsAFresh30SecondClock(){
  var f=new Fixture();long now=System.currentTimeMillis();
  var hosted=seat(f.me,"Away",null,com.flightparty.online.CustodyPolicy.HOSTED);
  var real=seat(f.other,"Here","xo-piece-neon",com.flightparty.online.CustodyPolicy.ACTIVE);
  var room=f.room("xo","PLAYING",List.of(hosted,real),now-1);f.put(room);
  f.service.advance(room.id());var next=f.get(room.id());
  assertTrue(next.deadline()>=now+com.flightparty.online.CustodyPolicy.IDLE_MS-1000,
    "the next real human turn gets a full 30s countdown");
  assertEquals(next.deadline(),f.service.snapshot(room.id(),request(f.me)).turnClockUntil());
 }
 @Test void pollingIsNotPresenceButExplicitActivityAndRejoinReclaimTheSeat(){
  var f=new Fixture();long now=System.currentTimeMillis();
  var hosted=seat(f.me,"Away",null,com.flightparty.online.CustodyPolicy.HOSTED);
  var real=seat(f.other,"Here","xo-piece-neon",com.flightparty.online.CustodyPolicy.ACTIVE);
  var room=f.room("xo","PLAYING",List.of(hosted,real),Long.MAX_VALUE);f.put(room);
  var polled=f.service.snapshot(room.id(),request(f.me));
  assertEquals(com.flightparty.online.CustodyPolicy.HOSTED,polled.custody().getFirst(),
    "a polling GET must not cancel the very custody state it renders");
  assertEquals(com.flightparty.online.CustodyPolicy.HOSTED,f.get(room.id()).seats().getFirst().custody());
  var back=f.service.activity(room.id(),false,request(f.me));
  assertEquals(com.flightparty.online.CustodyPolicy.ACTIVE,back.custody().getFirst(),
    "a pointer/key event or fresh page load cancels hosted");
  assertEquals(com.flightparty.online.CustodyPolicy.ACTIVE,f.get(room.id()).seats().getFirst().custody());
  assertTrue(f.get(room.id()).deadline()>now,"the returning player gets a fresh 30s turn");
 }
 @Test void aPointerEventOnAnActiveSeatIsReadOnlyAndCannotExtendTheIdleClock(){
  var f=new Fixture();long now=System.currentTimeMillis();
  var mine=seat(f.me,"Here",null,com.flightparty.online.CustodyPolicy.ACTIVE);
  var rival=seat(f.other,"Rival","xo-piece-neon",com.flightparty.online.CustodyPolicy.ACTIVE);
  var room=f.room("xo","PLAYING",List.of(mine,rival),now+9000);f.put(room);
  long before=f.get(room.id()).version(),deadline=f.get(room.id()).deadline();
  var pointer=f.service.activity(room.id(),false,request(f.me));
  assertEquals(before,pointer.version(),"wiggling the mouse must not restart the 30s idle clock");
  assertEquals(deadline,f.get(room.id()).deadline());
  assertEquals(com.flightparty.online.CustodyPolicy.ACTIVE,pointer.custody().getFirst());
  var resumed=f.service.activity(room.id(),true,request(f.me));
  assertTrue(resumed.version()>before,"an explicit resume grants a fresh 30s turn");
  assertTrue(f.get(room.id()).deadline()>deadline);
 }
 @Test void reSelectingOnlineDuelReclaimsAHostedSeat(){
  var f=new Fixture();
  var hosted=seat(f.me,"Away",null,com.flightparty.online.CustodyPolicy.HOSTED);
  var real=seat(f.other,"Here","xo-piece-neon",com.flightparty.online.CustodyPolicy.ACTIVE);
  var room=f.room("xo","PLAYING",List.of(hosted,real),Long.MAX_VALUE);f.put(room);
  f.service.join(room.id(),request(f.me));
  assertEquals(com.flightparty.online.CustodyPolicy.ACTIVE,f.get(room.id()).seats().getFirst().custody());
 }
 @Test void aComputerMatchIsExemptFromIdleCustody(){
  var f=new Fixture();long now=System.currentTimeMillis();
  var human=seat(f.me,"Solo",null,com.flightparty.online.CustodyPolicy.ACTIVE);
  var bot=new TableService.Seat(null,null,"电脑",true);
  var room=f.room("xo","PLAYING",List.of(human,bot),now-1);f.put(room);
  f.service.advance(room.id());
  assertEquals(com.flightparty.online.CustodyPolicy.ACTIVE,f.get(room.id()).seats().getFirst().custody(),
    "a game against computers has no grace, no custody and no reconnect");
 }
 private static MockHttpServletRequest request(UUID principal){var request=new MockHttpServletRequest();request.getSession().setAttribute("flightparty.principal",principal);return request;}
 private static void assertStatus(HttpStatus status,Runnable action){assertEquals(status,assertThrows(ResponseStatusException.class,action::run).getStatusCode());}

 private static final class Fixture {
  final ObjectMapper json=JsonMapper.builder().build();
  final UUID me=UUID.randomUUID(),other=UUID.randomUUID();
  final Map<UUID,String> rooms=new HashMap<>();final Map<UUID,UUID> accounts=new HashMap<>(),successors=new HashMap<>();
  final Map<UUID,String> names=new HashMap<>();final Map<UUID,Set<UUID>> votes=new HashMap<>(),readyVotes=new HashMap<>();final Map<UUID,Long> scores=new HashMap<>();
  final List<Map<String,Object>> results=new ArrayList<>();
  final JdbcClient db=mock(JdbcClient.class);final AppearanceService appearances=mock(AppearanceService.class);
  final TableService service=new TableService(db,json,appearances);
  int updates=0,scoreQueries=0;String lastScoreGame;UUID lastScoreAccount;
  Fixture(){
   when(appearances.get(any(UUID.class))).thenReturn(new AppearanceService.Appearance(false,"none","none"));
   when(db.sql(anyString())).thenAnswer(inv->statement(inv.getArgument(0)));
  }
  List<TableService.Seat> seats(String game){return List.of(new TableService.Seat(me,null,"Mine",false,game+"-piece-default",game+"-board-default"),new TableService.Seat(other,null,"Other",false,game+"-piece-neon",game+"-board-default"));}
  TableService.Room room(String game,String phase,List<TableService.Seat> seats,long deadline){return new TableService.Room(UUID.randomUUID(),game,"FRIENDS",phase,seats,GridRules.start(game),17,deadline,Map.of("existing",3L));}
  void put(TableService.Room room){rooms.put(room.id(),json.writeValueAsString(room));}
  TableService.Room get(UUID id){return json.readValue(rooms.get(id),TableService.Room.class);}
  @SuppressWarnings({"rawtypes","unchecked"})
  JdbcClient.StatementSpec statement(String sql){
   var params=new HashMap<String,Object>();var spec=mock(JdbcClient.StatementSpec.class,RETURNS_SELF);
   when(spec.param(anyString(),any())).thenAnswer(inv->{params.put(inv.getArgument(0),inv.getArgument(1));return spec;});
   when(spec.query(any(Class.class))).thenAnswer(inv->{
    var query=mock(JdbcClient.MappedQuerySpec.class);
    when(query.optional()).thenAnswer(ignored->Optional.ofNullable(result(sql,params)));
    when(query.single()).thenAnswer(ignored->result(sql,params));
    when(query.list()).thenAnswer(ignored->result(sql,params));return query;
   });
   when(spec.update()).thenAnswer(inv->{
    updates++;
    if(sql.startsWith("update table_rooms set state="))rooms.put((UUID)params.get("id"),(String)params.get("s"));
    else if(sql.startsWith("insert into table_rooms("))rooms.put((UUID)params.get("id"),(String)params.get("state"));
    else if(sql.startsWith("insert into table_results("))results.add(new HashMap<>(params));
    else if(sql.startsWith("insert into table_rematch_votes"))votes.computeIfAbsent((UUID)params.get("id"),id->new LinkedHashSet<>()).add((UUID)params.get("p"));
    else if(sql.startsWith("insert into table_room_ready"))readyVotes.computeIfAbsent((UUID)params.get("id"),id->new LinkedHashSet<>()).add((UUID)params.get("p"));
    else if(sql.startsWith("update table_rooms set successor_id="))successors.put((UUID)params.get("id"),(UUID)params.get("next"));
    else throw new AssertionError("Unexpected write: "+sql);
    return 1;
   });return spec;
  }
  Object result(String sql,Map<String,Object> params){
   if(sql.startsWith("select state from table_rooms"))return rooms.get(params.get("id"));
   if(sql.startsWith("select account_id from principals"))return accounts.get(params.get("id"));
   if(sql.startsWith("select display_name from accounts"))return names.get(params.get("id"));
   if(sql.startsWith("select successor_id from table_rooms"))return successors.get(params.get("id"));
   if(sql.startsWith("select principal_id from table_rematch_votes"))return new ArrayList<>(votes.getOrDefault(params.get("id"),Set.of()));
   if(sql.startsWith("select principal_id from table_room_ready"))return new ArrayList<>(readyVotes.getOrDefault(params.get("id"),Set.of()));
   if(sql.equals("select coalesce(sum(points),0) from table_results where account_id=:account and game=:game")){
    scoreQueries++;lastScoreGame=(String)params.get("game");lastScoreAccount=(UUID)params.get("account");return scores.getOrDefault(lastScoreAccount,0L);
   }
   throw new AssertionError("Unexpected query: "+sql);
  }
 }
}
