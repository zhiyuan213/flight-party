/* JoyFlock Joy Coin + cosmetics — ONE currency, named Joy Coin and identified
   by the brand star. Shared by the portal shell, the game detail shell and
   /shop.html. CURRENCY below is the single source of the currency's name;
   every visible price, balance, button and tooltip reads it from here.

   This file owns the wallet / ownership / equipped state. In local preview
   mode the wallet is kept in localStorage so that a purchase really changes
   the site: the cursor, the header avatar and the aircraft are replaced for
   real, and they persist across pages and reloads. No badge labels the
   balance in the UI; the currency name appears in the pill's hover tooltip.

   Purchasable cosmetics belong to exactly ONE of three rarities:
     Rare   — 1,000 Joy Coin for everybody, including members.
     Epic   — free for VIP and Annual VIP, otherwise 3,000 Joy Coin.
     Legend — free for Annual VIP, otherwise 5,000 Joy Coin.
   Annual VIP includes VIP. The rarity of an id is the single source of
   truth for its list price and its membership entitlement.
   In addition every section that has an original look ships ONE free
   `default` baseline: it costs 0, is owned and equipped on the first visit,
   and restores the original look. Defaults are a baseline, not a fourth
   rarity: they are never sold and never carry a membership perk. Aircraft
   (blue Classic), the site pointer and every game cosmetic family each have
   one; Happy Smile is the free default avatar. Game defaults resolve to an
   empty style, while the avatar baseline displays its actual face artwork.

   The FOUR board games (Connect Four / Gomoku / Chess / Tic-tac-toe) own
   INDEPENDENT products and equip slots: buying a Gomoku stone never changes
   Connect Four, and each game arbitrates its own shared board. Only Pool and
   Snooker deliberately still share one billiard set. A `per-game` equipped
   id resolves to a theme suffix; the game page picks the slot for its game.

   The three flight trails (star / rainbow / cloud) are SOLD as their own
   shop section; they are never bundled into an aircraft. Equipping one
   publishes data-shop-trail on <html>, which the in-game renderers read as
   a fallback when the server has no verified appearance for that seat.

   A server-backed host overrides every value through
   window.__joyflockPoints.set({total, vip, annualVip, live:true}); VIP
   entitlement and the real balance must be server-authoritative before
   launch. No gameplay rule, score or leaderboard is touched here.
   See docs/QA.md, shop section. */
(function(){
 'use strict';
 var VERSION='20261112-gamelanes1';
 var AVATAR_VERSION='20261114-avatar5';
 var CURSOR_VERSION='20261113-pointer1';
 var CURRENCY='Joy Coin';       /* the ONE name of the star currency */
 var CURRENCY_PLURAL=CURRENCY+'s';
 var MARK='/assets/points/star-point.svg?v='+VERSION;
 var KEY='joyflock.shop.v1';
 var PRICE=1000;                 /* Rare list price */
 var EPIC_PRICE=3000;            /* Epic list price */
 var LEGEND_PRICE=5000;          /* Legendary list price */
 var START_POINTS=10000;
 var DEFAULT_PLANE='plane-classic';       /* the blue Classic aircraft */
 var DEFAULT_CURSOR='cursor-star';        /* the built-in site pointer */
 var DEFAULT_AVATAR='avatar-starling';    /* the free Happy Smile face */
 var DEFAULT_TRAIL='trail-none';         /* no trail behind the plane */
 /* Board-game cosmetics: FOUR independent product families. Each game has
    its OWN free baseline, its OWN pieces and its OWN shared board, equipped
    in its OWN slot. Nothing is shared between the four games. */
 var GAME_KEYS=['four','gomoku','chess','xo'];
 var GAME_DEFAULTS={};
 GAME_KEYS.forEach(function(g){
  GAME_DEFAULTS[g+'Piece']=g+'-piece-default';
  GAME_DEFAULTS[g+'Board']=g+'-board-default';
 });
 /* Four's pink seat-2 counters are a separate equip slot with its own
    baseline, so both teams can wear a themed badge independently. */
 GAME_DEFAULTS['fourPiecePink']='four-pink-piece-default';
 GAME_DEFAULTS['gomokuPieceWhite']='gomoku-white-piece-default';
 GAME_DEFAULTS['xoPieceO']='xo-o-piece-default';
 /* Billiards cosmetics: the original rack, MY original cue and the original
    SHARED cloth. One theme covers both Pool and Snooker. */
 var DEFAULT_BALL='ball-default';
 var DEFAULT_CUE='cue-default';
 var DEFAULT_TABLE='table-default';
 /* Three PURCHASABLE rarities plus the free baseline. `perk` is the
    membership that equips the item without spending points: '' = none,
    'vip' = VIP (Annual VIP included), 'annual' = Annual VIP only.
    `default` is never sold: price 0, no perk, always owned. */
 var RARITY={
  default:{price:0,perk:''},
  rare:{price:PRICE,perk:''},
  epic:{price:EPIC_PRICE,perk:'vip'},
  legend:{price:LEGEND_PRICE,perk:'annual'}
 };
 var RARITY_BY_ID={
  'cursor-star':'default','cursor-rainbow':'epic','cursor-ember':'rare','cursor-frost':'epic',
  'cursor-leaf':'rare','cursor-volt':'epic','cursor-amethyst':'legend','cursor-blade':'epic',
  'cursor-candy':'rare','cursor-comet':'legend',
  'cursor-bubble':'rare','cursor-shell':'rare','cursor-heart':'epic','cursor-butterfly':'epic',
  'cursor-nova':'legend',
  'avatar-starling':'default','avatar-cloudy':'rare','avatar-rocket':'epic','avatar-luna':'epic',
  'avatar-owl':'rare','avatar-bear':'rare','avatar-fox':'epic','avatar-octo':'legend',
  'avatar-bot':'epic','avatar-crown':'legend',
  'avatar-bob':'rare','avatar-ponytail':'rare','avatar-buns':'epic','avatar-waves':'epic',
  'avatar-blossom':'legend','avatar-beret':'legend',
  'plane-classic':'default','plane-cloud2d':'rare','plane-gold2d':'epic','plane-night2d':'epic',
  'plane-obsidian2d':'legend','plane-aurora2d':'legend',
  /* Flight trails are a separate product section: one free "no trail"
     baseline plus one item per purchasable grade. */
  'trail-none':'default','trail-star':'rare','trail-rainbow':'epic','trail-cloud':'legend',
  /* Board-game cosmetics: FOUR PER-GAME families, never shared. An id is
     `<game>-<piece|board>-<theme>`; the equip slot is `<game>Piece` /
     `<game>Board`. A `-piece-` theme changes only MY stones in THAT game;
     a `-board-` theme is that game's SHARED board and is arbitrated alone. */
  'four-piece-default':'default','four-piece-neon':'rare','four-piece-jade':'epic','four-piece-aurora':'legend',
  'four-piece-coral':'rare','four-piece-pearl':'epic',
  'four-pink-piece-default':'default','four-pink-piece-blossom':'rare','four-pink-piece-heart':'rare',
  'four-pink-piece-bow':'epic','four-pink-piece-diamond':'epic','four-pink-piece-candy':'legend',
  'four-board-default':'default','four-board-neon':'rare','four-board-jade':'epic','four-board-aurora':'legend',
  'four-board-coral':'rare','four-board-pearl':'epic',
  'gomoku-piece-default':'default','gomoku-piece-neon':'rare','gomoku-piece-jade':'epic','gomoku-piece-aurora':'legend',
  'gomoku-piece-coral':'rare','gomoku-piece-pearl':'epic',
  'gomoku-white-piece-default':'default','gomoku-white-piece-neon':'rare','gomoku-white-piece-jade':'epic','gomoku-white-piece-aurora':'legend',
  'gomoku-white-piece-coral':'rare','gomoku-white-piece-pearl':'epic',
  'gomoku-board-default':'default','gomoku-board-neon':'rare','gomoku-board-jade':'epic','gomoku-board-aurora':'legend',
  'chess-piece-default':'default','chess-piece-neon':'rare','chess-piece-jade':'epic','chess-piece-aurora':'legend',
  'chess-board-default':'default','chess-board-neon':'rare','chess-board-coral':'rare','chess-board-jade':'epic','chess-board-pearl':'epic','chess-board-aurora':'legend',
  'xo-piece-default':'default','xo-piece-neon':'rare','xo-piece-jade':'epic','xo-piece-aurora':'legend',
  'xo-piece-coral':'rare','xo-piece-pearl':'epic',
  'xo-o-piece-default':'default','xo-o-piece-neon':'rare','xo-o-piece-jade':'epic','xo-o-piece-aurora':'legend',
  'xo-o-piece-coral':'rare','xo-o-piece-pearl':'epic',
  'xo-board-default':'default','xo-board-neon':'rare','xo-board-jade':'epic','xo-board-aurora':'legend',
  'xo-board-coral':'rare','xo-board-pearl':'epic',
  /* Billiards: `ball-` restyles EVERY ball individually (number and stripes
     survive), `cue-` changes only my cue, `table-` is the shared cloth and is
     subject to the in-match arbitration rule. */
  'ball-default':'default','ball-neon':'rare','ball-crystal':'rare','ball-jade':'epic','ball-galaxy':'epic','ball-aurora':'legend',
  'cue-default':'default','cue-neon':'rare','cue-crystal':'rare','cue-jade':'epic','cue-galaxy':'epic','cue-aurora':'legend',
  'table-default':'default','table-neon':'rare','table-crystal':'rare','table-jade':'epic','table-galaxy':'epic','table-aurora':'legend'
 };
 var PLANE_IDS={},TRAIL_IDS={},BALL_IDS={},CUE_IDS={},TABLE_IDS={};
 var PIECE_IDS={},BOARD_IDS={},COSMETIC_IDS={},GAME_IDS={};
 GAME_KEYS.forEach(function(g){GAME_IDS[g+'Piece']={};GAME_IDS[g+'Board']={};});
 GAME_IDS['fourPiecePink']={};GAME_IDS['gomokuPieceWhite']={};GAME_IDS['xoPieceO']={};
 Object.keys(RARITY_BY_ID).forEach(function(id){
  if(id.indexOf('plane-')===0)PLANE_IDS[id]=true;
  if(id.indexOf('trail-')===0)TRAIL_IDS[id]=true;
  if(id.indexOf('ball-')===0)BALL_IDS[id]=true;
  if(id.indexOf('cue-')===0)CUE_IDS[id]=true;
  if(id.indexOf('table-')===0)TABLE_IDS[id]=true;
  var m=/^(four|gomoku|chess|xo)-(?:pink-|white-|o-)?(piece|board)-/.exec(id);
  if(m){
   var isPink=id.indexOf('-pink-piece-')>=0,isWhite=id.indexOf('-white-piece-')>=0,isO=id.indexOf('-o-piece-')>=0;
   var slot=m[1]+(isPink?'PiecePink':isWhite?'PieceWhite':isO?'PieceO':(m[2]==='piece'?'Piece':'Board'));
   GAME_IDS[slot][id]=true;
   if(isPink||isWhite||isO)COSMETIC_IDS[id]=true;
   else if(m[2]==='piece')PIECE_IDS[id]=true;else BOARD_IDS[id]=true;
  }
  if(/^(ball|cue|table)-/.test(id)||m)COSMETIC_IDS[id]=true;
 });
 var pill=null,toastNode=null,observer=null;
 var SCHEMA=3;
 /* Before the free 默认 baseline existed these Rare starters were equipped
    automatically. A one-time migration moves ONLY those untouched automatic
    choices back to the original look; an explicit jade / aurora / rainbow
    choice is never overwritten. */
 var LEGACY_AUTO={trail:'trail-star',piece:'piece-neon',board:'board-neon',
  ball:'ball-neon',cue:'cue-neon',table:'table-neon'};
 var NEW_AUTO={trail:DEFAULT_TRAIL,piece:'piece-default',board:'board-default',
  ball:DEFAULT_BALL,cue:DEFAULT_CUE,table:DEFAULT_TABLE};
 function oldTheme(id){
  var m=/^(?:piece|board)-(default|neon|jade|aurora)$/.exec(String(id||''));
  return m?m[1]:'default';
 }
 /* v1/v2 saved ONE shared `piece` + ONE shared `board`. Schema 3 splits them
    into eight per-game slots. The theme the visitor already chose (and paid
    for) is replicated into all four games for FREE, so splitting a product
    family never takes a cosmetic away or charges for it a second time. */
 function migrate(v){
  if(!v)return {};
  if(v.v===SCHEMA)return v;
  var e=v.equipped||{};
  Object.keys(LEGACY_AUTO).forEach(function(k){if(e[k]===LEGACY_AUTO[k])e[k]=NEW_AUTO[k];});
  var pt=oldTheme(e.piece),bt=oldTheme(e.board),owned=v.owned||{};
  GAME_KEYS.forEach(function(g){
   var pk=g+'Piece',bk=g+'Board';
   if(!e[pk]||!GAME_IDS[pk][e[pk]])e[pk]=g+'-piece-'+pt;
   if(!e[bk]||!GAME_IDS[bk][e[bk]])e[bk]=g+'-board-'+bt;
   if(pt!=='default')owned[g+'-piece-'+pt]=true;
   if(bt!=='default')owned[g+'-board-'+bt]=true;
  });
  delete e.piece;delete e.board;
  v.equipped=e;v.owned=owned;v.v=SCHEMA;return v;
 }
 /* One-off LOCAL PREVIEW top-up: a browser that already has a signed-in
    nickname gets 100,000 Joy Coin once. This is client-side demo data only —
    NOT a server-verified score, payment or membership entitlement. A later
    server summary still wins through __joyflockPoints.set({total, live:true}),
    and brand-new visitors keep START_POINTS. The marker makes it idempotent,
    so later purchases and reloads are never overwritten. */
 var GRANT_KEY='joyflock.demoGrant.v1',GRANT_TOTAL=100000;
 function demoIdentity(){
  var name='';
  try{name=localStorage.getItem('joyflock.accountName')||'';}catch(e){}
  if(!name||name==='0'){
   try{var m=/(?:^|;\s*)joyflock_account=([^;]*)/.exec(document.cookie||'');
    name=m?decodeURIComponent(m[1]):'';}catch(e){name='';}
  }
  return name&&name!=='0'?name:'';
 }
 function applyDemoGrant(v){
  try{
   if(localStorage.getItem(GRANT_KEY)==='1')return false;
   if(!demoIdentity())return false;
   v.points=GRANT_TOTAL;
   return true;
  }catch(e){return false;}
 }
 var stored=migrate(load());
 var demoGranted=applyDemoGrant(stored);
 function defaultOwned(){var o={};o[DEFAULT_PLANE]=true;o[DEFAULT_CURSOR]=true;o[DEFAULT_TRAIL]=true;
  o[DEFAULT_AVATAR]=true;
  o[DEFAULT_BALL]=true;o[DEFAULT_CUE]=true;o[DEFAULT_TABLE]=true;
  Object.keys(GAME_DEFAULTS).forEach(function(k){o[GAME_DEFAULTS[k]]=true;});
  /* The old Rare starters stay free too, so nobody loses a cosmetic that
     used to be owned on the first visit. */
  ['trail-star','piece-neon','board-neon','ball-neon','cue-neon','table-neon']
   .forEach(function(id){o[id]=true;});
  return o;}
 var state={
  total:Number.isFinite(stored.points)?stored.points:START_POINTS,
  game:0,
  vip:false,
  annualVip:false,
  live:false,
  owned:Object.assign(defaultOwned(),stored.owned||{}),
  equipped:Object.assign(
   Object.assign({cursor:DEFAULT_CURSOR,avatar:DEFAULT_AVATAR,plane:DEFAULT_PLANE,trail:DEFAULT_TRAIL,
    ball:DEFAULT_BALL,cue:DEFAULT_CUE,table:DEFAULT_TABLE},GAME_DEFAULTS),stored.equipped||{})
 };
 /* Older local saves stored an empty cursor for "system default". Normalise
    them to the shop's first card so the owned label is always correct. */
 // Removed product families remain in old ownership receipts, but cannot
 // style a retired slot or be redeemed again.
 function retired(id){return /^(?:(?:gomoku|xo)-board-|chess-piece-)/.test(id)&&!/-default$/.test(id);}
 function normalise(){
  Object.assign(state.owned,defaultOwned());
  if(!state.equipped.cursor)state.equipped.cursor=DEFAULT_CURSOR;
  if(kindOf(state.equipped.avatar)!=='avatar')state.equipped.avatar=DEFAULT_AVATAR;
  if(!state.equipped.plane||!PLANE_IDS[state.equipped.plane])state.equipped.plane=DEFAULT_PLANE;
  if(!state.equipped.trail||!TRAIL_IDS[state.equipped.trail])state.equipped.trail=DEFAULT_TRAIL;
  if(!state.equipped.ball||!BALL_IDS[state.equipped.ball])state.equipped.ball=DEFAULT_BALL;
  if(!state.equipped.cue||!CUE_IDS[state.equipped.cue])state.equipped.cue=DEFAULT_CUE;
  if(!state.equipped.table||!TABLE_IDS[state.equipped.table])state.equipped.table=DEFAULT_TABLE;
  Object.keys(GAME_DEFAULTS).forEach(function(k){
   if(!state.equipped[k]||!GAME_IDS[k][state.equipped[k]]||retired(state.equipped[k]))state.equipped[k]=GAME_DEFAULTS[k];
  });
 }
 normalise();
 /* Persist the demo top-up immediately: the pill and every shop price read
    the same wallet, and the marker is written only after a successful save. */
 if(demoGranted){
  persist();
  try{localStorage.setItem(GRANT_KEY,'1');}catch(e){}
 }

 function zh(){return document.documentElement.getAttribute('data-locale')==='zh'||document.documentElement.lang==='zh-CN';}
 function t(en,cn){return zh()?cn:en;}
 function fmt(n){return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');}
 function load(){try{var raw=localStorage.getItem(KEY);var v=raw?JSON.parse(raw):{};return v&&typeof v==='object'?v:{};}catch(e){return {};}}
 function persist(){
  try{localStorage.setItem(KEY,JSON.stringify({
   v:SCHEMA,
   points:state.live?undefined:state.total,
   owned:state.owned,
   equipped:state.equipped
  }));}catch(e){}
 }
 function mark(){var i=document.createElement('img');i.className='jp-mark';i.src=MARK;i.alt='';i.setAttribute('aria-hidden','true');return i;}
 function tag(name,cls){var n=document.createElement(name);if(cls)n.className=cls;return n;}
 function kindOf(id){
  if(!RARITY_BY_ID[id])return null;
  var m=/^(four|gomoku|chess|xo)-(?:pink-|white-|o-)?(piece|board)-/.exec(String(id));
  if(m)return m[1]+(id.indexOf('-pink-piece-')>=0?'PiecePink':id.indexOf('-white-piece-')>=0?'PieceWhite':id.indexOf('-o-piece-')>=0?'PieceO':(m[2]==='piece'?'Piece':'Board'));
  return id.indexOf('cursor-')===0?'cursor':id.indexOf('avatar-')===0?'avatar'
   :id.indexOf('plane-')===0?'plane':id.indexOf('trail-')===0?'trail'
   :id.indexOf('ball-')===0?'ball':id.indexOf('cue-')===0?'cue':id.indexOf('table-')===0?'table':null;
 }
 function rarityOf(id){return RARITY_BY_ID[id]||'rare';}
 function priceOf(id){return (RARITY[rarityOf(id)]||RARITY.rare).price;}
 function planeStyle(id){return String(id||'').replace(/^plane-/,'');}
 /* The three in-game trail styles are the exact keys FlightTrails.emit accepts. */
 function trailStyle(id){
  if(!TRAIL_IDS[id])return '';
  var k=String(id).replace(/^trail-/,'');
  return ['star','rainbow','cloud'].indexOf(k)>=0?k:'';
 }
 function assetUrl(id){
  /* Trail cards are animated canvases, not image files. A tiny inline pixel
     keeps any accidental <img src> from generating a 404. */
  if(TRAIL_IDS[id]||COSMETIC_IDS[id])
   return 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
  if(PLANE_IDS[id])return '/assets/shop/planes/'+planeStyle(id)+'.png?v='+VERSION;
  if(kindOf(id)==='avatar')return '/assets/shop/avatars-v4/'+id+'.svg?v='+AVATAR_VERSION;
  if(kindOf(id)==='cursor'&&id!==DEFAULT_CURSOR)return '/assets/shop/'+id+'.svg?v='+CURSOR_VERSION;
  return '/assets/shop/'+id+'.svg?v='+VERSION;
 }
 /* The catalogue card shows the crisp vector artwork, but a CSS cursor is an
    image resource: PNG is the only format every browser accepts there (Safari
    ignores SVG cursors, and some engines drop gradients in SVG cursors).
    Each PNG is a 32x32 render of the very same SVG, so the card and the real
    pointer always look identical, including the lower-right accent. */
 function cursorAssetUrl(id){return '/assets/shop/'+id+'.png?v='+CURSOR_VERSION;}
 function emit(){try{window.dispatchEvent(new CustomEvent('joyflock:shop-changed'));}catch(e){}}
 function emitPlane(){
  try{window.dispatchEvent(new CustomEvent('joyflock:plane-changed',{detail:planeStyle(state.equipped.plane||DEFAULT_PLANE)}));}catch(e){}
 }
 function emitTrail(){
  try{window.dispatchEvent(new CustomEvent('joyflock:trail-changed',{detail:trailStyle(state.equipped.trail)}));}catch(e){}
 }
 /* Board-game / billiard cosmetics are pure CSS/shape themes, so only the
    suffix is published. A `default` baseline resolves to an EMPTY style:
    the game renderers then keep their original artwork instead of a skin. */
 function cosmeticTheme(id){
  /* Both `ball-jade` and `gomoku-piece-jade` collapse to the theme suffix;
     the game page decides WHICH game a published suffix belongs to. */
  var k=String(id||'').replace(/^(?:(?:four|gomoku|chess|xo)-)?(?:pink-|white-|o-)?(?:piece|board|ball|cue|table)-/,'');
  return k==='default'?'':k;
 }

 function toast(text){
  if(!toastNode){toastNode=tag('div','jp-toast');toastNode.setAttribute('role','status');document.body.append(toastNode);}
  toastNode.textContent=text;toastNode.dataset.show='1';
  clearTimeout(toast.timer);toast.timer=setTimeout(function(){toastNode.dataset.show='0';},2600);
 }

 /* Equipped cosmetics are applied from the id alone: the catalogue artwork
    follows the /assets/shop/<kind>-<name> naming convention, so pages that
    never load the shop script still show the visitor's choices. The aircraft
    key is published on <html> for site-plane-fx.js and the in-game hangar. */
 function applyEquipped(){
  var root=document.documentElement;
  var cursor=state.equipped.cursor,avatar=state.equipped.avatar,plane=state.equipped.plane;
  /* The first card IS the built-in site cursor: leave --shop-cursor
     untouched so seasonal themes and hover pointers still work. */
  if(cursor&&cursor!==DEFAULT_CURSOR&&kindOf(cursor)){
   root.style.setProperty('--shop-cursor','url("'+cursorAssetUrl(cursor)+'") 3 2, auto');
   root.setAttribute('data-shop-cursor','1');
  }else{root.style.removeProperty('--shop-cursor');root.removeAttribute('data-shop-cursor');}
  if(avatar&&kindOf(avatar)){
   root.style.setProperty('--shop-avatar','url("'+assetUrl(avatar)+'")');
   root.setAttribute('data-shop-avatar','1');
  }else{root.style.removeProperty('--shop-avatar');root.removeAttribute('data-shop-avatar');}
  if(plane&&PLANE_IDS[plane]){
   root.setAttribute('data-shop-plane',planeStyle(plane));
   root.style.setProperty('--shop-plane','url("'+assetUrl(plane)+'")');
  }else{root.removeAttribute('data-shop-plane');root.style.removeProperty('--shop-plane');}
  /* An equipped shop trail is the local fallback for the in-game renderer;
     a server-verified appearance still wins (see shop-trail.js). */
  var ts=trailStyle(state.equipped.trail);
  if(ts)root.setAttribute('data-shop-trail',ts);else root.removeAttribute('data-shop-trail');
  /* A 默认 baseline publishes NOTHING: the original artwork is restored.
     Only a real theme suffix reaches <html>. */
  var themes=[['data-shop-ball',state.equipped.ball],['data-shop-cue',state.equipped.cue],
   ['data-shop-table',state.equipped.table]];
  /* One attribute PER GAME, so no page can accidentally treat four board
     games as one shared skin. `fourPiece` -> data-shop-four-piece. */
  Object.keys(GAME_DEFAULTS).forEach(function(k){
   themes.push(['data-shop-'+k.replace(/([A-Z])/g,'-$1').toLowerCase(),state.equipped[k]]);
  });
  for(var i=0;i<themes.length;i++){
   var v=cosmeticTheme(themes[i][1]);
   if(v)root.setAttribute(themes[i][0],v);else root.removeAttribute(themes[i][0]);
  }
  emitPlane();emitTrail();
 }

 /* Rare items are always a points purchase, even for members. Epic items are
    a VIP perk (Annual VIP included); Legendary items are an Annual VIP perk.
    Already owned items equip for free through buy(), not through freeFor(),
    so a member still sees OWNED rather than "VIP FREE" on a Rare default. */
 function freeFor(id){
  var perk=RARITY[rarityOf(id)].perk;
  if(perk==='vip')return !!state.vip;
  if(perk==='annual')return !!state.annualVip;
  return false;
 }
 /* One click either redeems the rarity's list price and equips, equips an
    already owned item, or equips for free when the server says the visitor
    has the matching membership. No preview state exists: the button always
    performs the real replacement. */
 function buy(id){
  var kind=kindOf(id);
  if(!kind)return {ok:false,reason:'unknown'};
  if(retired(id)||(['cursor-candy','cursor-volt','cursor-blade'].indexOf(id)>=0&&!state.owned[id]))return {ok:false,reason:'retired'};
  if(state.equipped[kind]===id)return {ok:true,already:true};
  var free=freeFor(id),owned=!!state.owned[id],cost=priceOf(id);
  if(!free&&!owned&&state.total<cost)return {ok:false,reason:'insufficient',short:cost-state.total};
  if(!free&&!owned){state.total-=cost;state.owned[id]=true;}
  state.equipped[kind]=id;
  persist();render();applyEquipped();emit();
  return {ok:true,cost:free||owned?0:cost,free:free,owned:owned,equipped:true};
 }
 function reset(kind){
  if(['cursor','avatar','plane','trail','ball','cue','table'].indexOf(kind)<0&&!GAME_DEFAULTS[kind])return;
  var baseline={plane:DEFAULT_PLANE,cursor:DEFAULT_CURSOR,avatar:DEFAULT_AVATAR,trail:DEFAULT_TRAIL,
   ball:DEFAULT_BALL,cue:DEFAULT_CUE,table:DEFAULT_TABLE};
  state.equipped[kind]=GAME_DEFAULTS[kind]||baseline[kind]||'';
  persist();render();applyEquipped();emit();
 }

 function buildPill(host){
  pill=tag('button','jp-pill');pill.type='button';pill.id='jp-pill';
  pill.append(mark());
  var amount=tag('span','jp-amount');amount.dataset.jp='amount';pill.append(amount);
  var label=tag('span','jp-label');label.dataset.jp='label';pill.append(label);
  pill.addEventListener('click',function(){
   if(location.pathname==='/shop.html')window.scrollTo({top:0,behavior:'smooth'});
   else location.href='/shop.html';
  });
  host.append(pill);
 }

 /* A guest has no account balance to display. The shared header stores the
    server-confirmed nickname (or "0" for a confirmed guest) in localStorage
    and a host cookie, so every shell agrees on the very first frame. The local
    wallet itself is kept intact: signing back in reveals the same balance.
    Unit harnesses have no location object and keep the legacy preview value. */
 function accountName(){
  var n='';
  try{n=localStorage.getItem('joyflock.accountName')||'';}catch(e){}
  if(!n||n==='0'){
   try{var c=document.cookie||'';var parts=c.split(';');
    for(var i=0;i<parts.length;i++){var part=parts[i].trim();
     if(part.indexOf('joyflock_account=')===0){n=decodeURIComponent(part.slice(17));break;}}}catch(e){n='';}
  }
  return n&&n!=='0'?n:'';
 }
 function shownTotal(){
  if(typeof location==='undefined'||!location||!location.hostname)return state.total;
  return accountName()?state.total:0;
 }
 function render(){
  if(!pill)return;
  var shown=shownTotal();
  /* The header pill stays compact (✦ + amount only). Hover / keyboard focus
     spells out the CURRENT balance in the currency's plural form, e.g.
     "9,000 Joy Coins"; the hidden label and accessible name give the balance. */
  pill.dataset.coin=fmt(shown)+' '+CURRENCY_PLURAL;
  pill.setAttribute('aria-label',t('Joy Coin balance: '+fmt(shown),'Joy Coin 余额：'+fmt(shown)));
  pill.querySelector('[data-jp=amount]').textContent=fmt(shown);
  pill.querySelector('[data-jp=label]').textContent=CURRENCY;
 }

 function consumeIdentity(){
  /* Reuse the identity request the portal already makes; never add a new
     network probe. A 404 simply leaves both tiers false in local preview. */
  var p=window.__joyflockMe;
  if(!p||typeof p.then!=='function')return;
  p.then(function(me){
   var a=me&&me.appearance||{};
   state.annualVip=!!(me&&(a.annualMember===true||me.annualMember===true||me.membership==='annual'));
   state.vip=!!(me&&(me.member===true||me.membership==='active'||a.annualMember===true||a.member===true))||state.annualVip;
   render();emit();
  }).catch(function(){});
 }

 function mount(){
  /* Stand-alone game pages have no header pill host. Apply the equipped
     cosmetics FIRST so cursors still work there, then only build the wallet
     pill where the shared chrome actually exists. data-shop-no-pill opts a
     page out of the legacy `header > div` fallback (a game header's own div
     must never receive a points pill). */
  applyEquipped();consumeIdentity();
  var host=document.querySelector('.topbar .top-actions');
  if(!host&&!document.documentElement.hasAttribute('data-shop-no-pill'))
   host=document.querySelector('header > div');
  if(host&&!document.getElementById('jp-pill'))buildPill(host);
  render();
  window.addEventListener('joyflock:account-changed',render);
  if(typeof MutationObserver!=='undefined'){
   observer=new MutationObserver(render);
   observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-locale','lang']});
  }
  window.addEventListener('storage',function(e){
   if(e.key!==KEY)return;
   var next=migrate(load());
   if(Number.isFinite(next.points)&&!state.live)state.total=next.points;
   state.owned=Object.assign(defaultOwned(),next.owned||{});
   state.equipped=Object.assign(
    Object.assign({cursor:DEFAULT_CURSOR,avatar:DEFAULT_AVATAR,plane:DEFAULT_PLANE,trail:DEFAULT_TRAIL,
     ball:DEFAULT_BALL,cue:DEFAULT_CUE,table:DEFAULT_TABLE},GAME_DEFAULTS),next.equipped||{});
   normalise();render();applyEquipped();emit();
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();

 /* Server-backed host pages call this once /api/points/summary resolves. */
 window.__joyflockPoints={
  version:VERSION,currency:CURRENCY,
  set:function(next){
   if(!next||typeof next!=='object')return;
   if(Number.isFinite(next.total))state.total=next.total;
   if(Number.isFinite(next.game))state.game=next.game;
   if(typeof next.vip==='boolean')state.vip=next.vip;
   if(typeof next.annualVip==='boolean')state.annualVip=next.annualVip;
   if(typeof next.live==='boolean')state.live=next.live;
   if(state.annualVip)state.vip=true;
   render();emit();
  },
  get:function(){return {total:state.total,display:shownTotal(),game:state.game,vip:state.vip,annualVip:state.annualVip,live:state.live,
   owned:Object.assign({},state.owned),equipped:Object.assign({},state.equipped)};},
  refresh:render
 };
 window.__joyflockShop={
  version:VERSION,currency:CURRENCY,price:PRICE,epicPrice:EPIC_PRICE,legendPrice:LEGEND_PRICE,rarities:RARITY,itemRarity:RARITY_BY_ID,
  buy:buy,reset:reset,toast:toast,assetUrl:assetUrl,cursorAssetUrl:cursorAssetUrl,
  freeFor:freeFor,rarityOf:rarityOf,priceOf:priceOf,planeStyle:planeStyle,planeIds:PLANE_IDS,
  trailStyle:trailStyle,trailIds:TRAIL_IDS,
  pieceIds:PIECE_IDS,boardIds:BOARD_IDS,cosmeticIds:COSMETIC_IDS,
  gameKeys:GAME_KEYS,gameIds:GAME_IDS,gameDefaults:GAME_DEFAULTS,
  ballIds:BALL_IDS,cueIds:CUE_IDS,tableIds:TABLE_IDS,cosmeticTheme:cosmeticTheme,
  defaults:Object.assign({cursor:DEFAULT_CURSOR,avatar:DEFAULT_AVATAR,plane:DEFAULT_PLANE,trail:DEFAULT_TRAIL,
   ball:DEFAULT_BALL,cue:DEFAULT_CUE,table:DEFAULT_TABLE},GAME_DEFAULTS),
  getState:function(){return window.__joyflockPoints.get();},
  mark:MARK,
  zh:zh,t:t,fmt:fmt
 };
 // Every shell already loads this wallet. The enhancement keeps PNG cursors
 // as its fallback and only overlays an animated, non-interactive decoration.
 if(document.head&&document.createElement&&!document.getElementById('joy-cursor-effects-script')){
  var cursorFX=document.createElement('script');cursorFX.id='joy-cursor-effects-script';
  cursorFX.src='/site-cursor-effects.js?v='+CURSOR_VERSION;cursorFX.defer=true;
  document.head.appendChild(cursorFX);
 }
})();
