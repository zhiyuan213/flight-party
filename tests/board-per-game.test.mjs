import test from 'node:test';
import assert from 'node:assert/strict';
import {installCosmeticsDom} from './helpers/cosmetics-dom.mjs';
const equipped={fourPiece:'four-piece-neon',fourPiecePink:'four-pink-piece-blossom',fourBoard:'four-board-aurora',gomokuPiece:'gomoku-piece-jade',gomokuPieceWhite:'gomoku-white-piece-pearl',gomokuBoard:'gomoku-board-neon',chessPiece:'chess-piece-jade',chessBoard:'chess-board-aurora',xoPiece:'xo-piece-aurora',xoPieceO:'xo-o-piece-pearl',xoBoard:'xo-board-jade'};

test('personal pieces decorate only their owner; the bot keeps the free baseline',async()=>{
 const env=installCosmeticsDom(equipped);try{
  const api=await import('../dist/table/game-cosmetics.js?personal-families');
  // Four has separate blue/pink slots: the human's chosen seat (2 = pink)
  // reads the pink equip; the bot (seat 1 = blue) stays on the free default.
  env.setGame('four');let state=api.applyCosmetics({mySeat:2,matchKey:'same-id'});
  assert.deepEqual(state.pieceThemes,['','blossom']);assert.equal(state.boardTheme,'aurora');
  assert.equal(env.root.getAttribute('data-cosmetic-board'),'aurora');
  assert.equal(env.root.getAttribute('data-cosmetic-piece-1'),null);
  assert.equal(env.root.getAttribute('data-cosmetic-piece-2'),'blossom');
  // Gomoku splits black / white the same way: only the human wears a skin.
  env.setGame('gomoku');state=api.applyCosmetics({mySeat:2,matchKey:'same-id'});
  assert.deepEqual(state.pieceThemes,['','pearl']);assert.equal(state.boardTheme,'');
  assert.equal(env.root.getAttribute('data-cosmetic-piece-1'),null);
  assert.equal(env.root.getAttribute('data-cosmetic-piece-2'),'pearl');
  // XO splits X / O and shares the board; the bot stays on the free X.
  env.setGame('xo');state=api.applyCosmetics({mySeat:2,matchKey:'same-id'});
  assert.deepEqual(state.pieceThemes,['','pearl']);assert.equal(state.boardTheme,'jade');
  assert.equal(env.root.getAttribute('data-cosmetic-piece-1'),null);
  assert.equal(env.root.getAttribute('data-cosmetic-piece-2'),'pearl');
  assert.equal(env.root.getAttribute('data-cosmetic-board'),'jade');
  env.setGame('chess');const chess=api.applyCosmetics({mySeat:1,matchKey:'same-id'});
  assert.deepEqual(chess.pieceThemes,['','']);assert.equal(chess.boardTheme,'aurora');
  assert.equal(chess.piece,'chess-piece-default');
 }finally{env.restore();}
});

test('room selections stay on absolute seats and each opponent keeps their own style',async()=>{
 const env=installCosmeticsDom(equipped,'gomoku');try{
  const api=await import('../dist/table/game-cosmetics.js?personal-rooms');
  const seatProfiles=[{piece:'gomoku-piece-neon'},{piece:'gomoku-piece-jade'}];
  for(const mySeat of [1,2]){
   const s=api.applyCosmetics({mySeat,matchKey:'room',network:true,seatProfiles});
   assert.deepEqual(s.pieceThemes,['neon','jade']);
  }
  const key=api.cosmeticKey();seatProfiles[1].piece='gomoku-piece-aurora';
  api.applyCosmetics({mySeat:1,matchKey:'room',network:true,seatProfiles});assert.notEqual(api.cosmeticKey(),key);
  seatProfiles[1].piece='four-piece-jade';
  assert.deepEqual(api.applyCosmetics({mySeat:1,matchKey:'room',network:true,seatProfiles}).pieceThemes,['neon','']);
  assert.deepEqual(api.applyCosmetics({mySeat:1,matchKey:'fresh-room',network:true,seatProfiles:[]}).pieceThemes,['jade','']);
 }finally{env.restore();}
});

test('DOM medallions clear on default and leave team values untouched',async()=>{
 const env=installCosmeticsDom(equipped);try{
  const api=await import('../dist/table/game-cosmetics.js?personal-dom');api.applyCosmetics({mySeat:1});
  assert.equal(env.cells[0].getAttribute('data-cosmetic-piece'),null);
  assert.equal(env.cells[1].getAttribute('data-cosmetic-piece'),'neon');
  assert.equal(env.cells[2].getAttribute('data-cosmetic-piece'),null);
  assert.match(env.cells[1].styles.get('--personal-emblem'),/data:image\/svg\+xml/);
  env.store.equipped.fourPiece='four-piece-default';api.applyCosmetics({mySeat:1});
  assert.equal(env.cells[1].getAttribute('data-cosmetic-piece'),null);assert.equal(env.cells[1].styles.size,0);
  assert.deepEqual(env.cells.map(n=>n.dataset.value),['0','1','2']);
 }finally{env.restore();}
});

test('recovery keeps a room choice when the browser has no saved slot, but respects explicit default',async()=>{
 const env=installCosmeticsDom({},'four');try{
  const api=await import('../dist/table/game-cosmetics.js?personal-recovery');
  const profile={piece:'four-piece-aurora'};
  assert.deepEqual(api.localSelection('four',profile),{pieceId:'four-piece-aurora',boardId:'four-board-default'});
  const visible=api.applyCosmetics({network:true,mySeat:2,matchKey:'recovered',seatProfiles:[{},profile]});
  assert.deepEqual(visible.pieceThemes,['','aurora']);
  assert.deepEqual(api.localSelection('four',{}),{pieceId:'four-piece-default',boardId:'four-board-default'});
  env.store.equipped.fourPiece='gomoku-piece-neon';
  assert.equal(api.localSelection('four',profile).pieceId,'four-piece-aurora','invalid other-game save cannot reset the recovered seat');
  env.store.equipped.fourPiece='four-piece-jade';assert.equal(api.localSelection('four',profile).pieceId,'four-piece-jade');
  env.store.equipped.fourPiece='four-piece-default';assert.equal(api.localSelection('four',profile).pieceId,'four-piece-default');
  assert.equal(api.localSelection('four',{board:'four-board-jade'}).boardId,'four-board-jade');
  env.store.equipped.fourBoard='four-board-default';assert.equal(api.localSelection('four',{board:'four-board-jade'}).boardId,'four-board-default');
  assert.deepEqual(api.localSelection('chess',{board:'chess-board-jade'}),{pieceId:'',boardId:'chess-board-jade'});
  env.store.equipped.chessBoard='chess-board-default';assert.equal(api.localSelection('chess',{board:'chess-board-jade'}).boardId,'chess-board-default');
  assert.deepEqual(api.localSelection('xo',{piece:'gomoku-piece-jade'}),{pieceId:'xo-piece-default',boardId:'xo-board-default'});
 }finally{env.restore();}
});

test('Four default theme uses each own piece and the existing shared-board priority',async()=>{
 const env=installCosmeticsDom(equipped,'four');try{
  const api=await import('../dist/table/game-cosmetics.js?four-shared-board');
  const seats=[{piece:'four-piece-neon',board:'four-board-neon',points:9000},
    {piece:'four-piece-jade',board:'four-board-jade',member:true,points:1}];
  const apply=mySeat=>api.applyCosmetics({network:true,mySeat,matchKey:'four-room',seatProfiles:seats});
  for(const mySeat of [1,2]){const s=apply(mySeat);assert.equal(s.boardTheme,'jade');assert.deepEqual(s.pieceThemes,['neon','jade']);assert.equal(s.decision.reason,'tier');}
  seats[0].annualMember=true;assert.equal(apply(2).boardTheme,'neon');
  seats[0].annualMember=false;seats[1].member=false;assert.equal(apply(1).boardTheme,'neon');assert.equal(apply(1).decision.reason,'points');
  seats[1].points=9000;assert.deepEqual(apply(1).decision,apply(2).decision,'tie agrees from both seats');
  seats[0].board='four-board-default';assert.equal(apply(1).boardTheme,'jade');assert.equal(apply(1).decision.reason,'single');
  seats[1].board='four-board-default';assert.equal(apply(1).boardTheme,'');
 }finally{env.restore();}
});

test('all seasonal Four themes suppress shop pieces and boards without deleting saved choices',async()=>{
 const env=installCosmeticsDom(equipped,'four');try{
  const api=await import('../dist/table/game-cosmetics.js?four-theme-gate');
  const before=JSON.stringify(env.store);
  api.applyCosmetics({mySeat:1});assert.equal(env.cells[1].getAttribute('data-cosmetic-piece'),'neon');
  for(const theme of ['independence','thanksgiving','halloween','christmas','valentine','stpatricks','easter','spring','midautumn']){
   env.setTheme(theme);env.win.dispatchEvent(new CustomEvent('joyflock:theme-applied'));
   const s=api.current();assert.deepEqual(s.pieceThemes,['','']);assert.equal(s.boardTheme,'');assert.equal(s.decision.reason,'theme');
   assert.equal(env.cells[1].getAttribute('data-cosmetic-piece'),null);assert.equal(env.cells[1].styles.get('--personal-emblem'),undefined);
   assert.equal(api.localSelection('four').boardId,'four-board-aurora');
  }
  assert.equal(JSON.stringify(env.store),before);
  env.setTheme('classic');env.win.dispatchEvent(new CustomEvent('joyflock:theme-applied'));
  assert.equal(api.current().boardTheme,'aurora');assert.equal(api.current().pieceTheme,'neon');
 }finally{env.restore();}
});

test('unacknowledged local boards never override a shared room snapshot',async()=>{
 const env=installCosmeticsDom(equipped,'four');try{
  const api=await import('../dist/table/game-cosmetics.js?four-public-snapshot');
  const seatProfiles=[{board:null},{board:null}];
  for(const mySeat of [1,2])assert.equal(api.applyCosmetics({network:true,mySeat,matchKey:'pending',seatProfiles}).boardTheme,'');
  seatProfiles[1].board='four-board-jade';
  for(const mySeat of [1,2])assert.equal(api.applyCosmetics({network:true,mySeat,matchKey:'pending',seatProfiles}).boardTheme,'jade');
 }finally{env.restore();}
});

test('Chess shared decision is stable, refreshed on choices and identical from both seats',async()=>{
 const env=installCosmeticsDom(equipped,'chess');try{
  const api=await import('../dist/table/game-cosmetics.js?personal-chess');
  const seatProfiles=[{board:'chess-board-neon',points:100},{board:'chess-board-jade',points:100}];
  const first=api.applyCosmetics({network:true,mySeat:1,matchKey:'tie',seatProfiles}).decision;
  assert.strictEqual(api.applyCosmetics({network:true,mySeat:1,matchKey:'tie',seatProfiles}).decision,first);
  assert.deepEqual(api.applyCosmetics({network:true,mySeat:2,matchKey:'tie',seatProfiles}).decision,first);
  seatProfiles[1]={board:'chess-board-jade',annualMember:true,points:0};
  assert.equal(api.applyCosmetics({network:true,mySeat:1,matchKey:'tie',seatProfiles}).boardTheme,'jade');
  env.setGame('pool');const pool=api.applyCosmetics({matchKey:'tie'});
  assert.equal(pool.ballTheme,'');assert.equal(pool.cueTheme,'');assert.equal(pool.tableTheme,'');
  assert.equal(env.root.getAttribute('data-cosmetic-piece-2'),null);
  env.setGame('cards');assert.equal(api.applyCosmetics(),null);
  assert.equal(env.root.attrs.size,0);assert.equal(env.board.attrs.size,0);
 }finally{env.restore();}
});
