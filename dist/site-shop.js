/* JoyFlock Joy Coin Shop — /shop.html only.
   The star currency is named Joy Coin; its name comes from site-points.js
   (API.currency) and appears in every balance, price, button and notice.
   Eleven sections: aircraft, flight trails, cursors, avatars, FOUR board
   games (Connect Four / Gomoku / Chess / Tic-tac-toe, each with its own
   personal pieces or chessboards), ball sets, cues and billiard tables. Board-game
   cosmetics are PER GAME: buying a Gomoku stone never touches Connect Four,
   and each game arbitrates its own shared board. Pool + Snooker deliberately
   still share one billiard set. Every PURCHASABLE item belongs to exactly ONE
   of three rarities:
     Rare   — 1,000 Joy Coin for everybody, including members.
     Epic   — free for VIP and Annual VIP, otherwise 3,000 Joy Coin.
     Legend — free for Annual VIP, otherwise 5,000 Joy Coin.
   Every section that has an original look also ships ONE free `default`
   baseline (blue Classic aircraft, no trail, built-in pointer, each game's
   original stones / board, balls / cue / cloth). It costs 0, is owned and
   equipped on the first visit and restores the original artwork. Avatars
   default to the free Happy Smile expression. The rarity tag and the card border always share one
   colour. Inside each section the cards are ordered 默认 → Rare → Epic →
   Legendary, with pieces leading boards inside a grade. The aircraft are illustrated
   planes from the in-game hangar; their cards
   show a spinning propeller only (site-plane-fx.js). Flight trails are a
   SEPARATE product with their own section and animated previews
   (site-trail-fx.js); they are never bundled into an aircraft card.

   Clicking a card opens a redeem dialog that spends the rarity's list price
   in Joy Coin and replaces the cosmetic. An ALREADY OWNED item asks nothing:
   one click equips it immediately and a short notice confirms which cosmetic
   was replaced. A matching membership tier also equips in one click with no
   payment step. There is NO preview mode and NO confirmation for items the
   visitor already has: the action always performs the real replacement.
   Wallet / ownership / rarity state lives in site-points.js, which is the
   single source of truth for prices, perks and the currency name. */
(function(){
 'use strict';
 var VERSION='20261112-gamelanes1';
 var API=window.__joyflockShop;
 if(!API)return;
 var COIN=API.currency||'Joy Coin';   /* ONE name, owned by site-points.js */
 var RARITY={
  default:{en:'Default',cn:'默认'},
  rare:{en:'Rare',cn:'稀有'},epic:{en:'Epic',cn:'史诗'},legend:{en:'Legendary',cn:'传说'}
 };
 /* Four INDEPENDENT board-game families, each with its own equip slots. */
 var GAME_NAME={
  four:{en:'Connect Four',cn:'四子连珠'},gomoku:{en:'Gomoku',cn:'五子棋'},
  chess:{en:'Chess',cn:'国际象棋'},xo:{en:'Tic-tac-toe',cn:'井字棋'}
 };
 var GAME_KEYS=['four','gomoku','chess','xo'];
 function gameOf(kind){var m=/^(four|gomoku|chess|xo)(Piece|Board|PiecePink|PieceWhite|PieceO)$/.exec(String(kind||''));return m?m[1]:'';}
 function roleOf(kind){return String(kind||'').indexOf('Piece')>=0?'piece':'board';}
 function isBoardGame(kind){return /^(four|gomoku|chess|xo)(Piece|Board|PiecePink|PieceWhite|PieceO)$/.test(String(kind||''));}
 /* Cards are grouped 默认 → Rare → Epic → Legendary. Within one grade the
    original catalogue order is kept, so each free baseline leads its section. */
 var CATALOG=[
  /* The original site pointer: the free 默认 baseline, equipped from the
     first visit. Its id is unchanged so old saves keep working. */
  {id:'cursor-star',kind:'cursor',en:'Default pointer',cn:'默认光标',de:'The original JoyFlock pointer. Free baseline — switch back any time.',dc:'JoyFlock 原本的光标，默认款，随时免费换回。'},
  {id:'cursor-ember',kind:'cursor',en:'Ember pointer',cn:'焰火光标',de:'Flat coral arrow and a still flame emblem.',dc:'珊瑚橙平面指针，右下角火苗标志静态显示。'},
  {id:'cursor-leaf',kind:'cursor',en:'Leaf pointer',cn:'叶影光标',de:'Flat mint arrow and a still leaf emblem.',dc:'薄荷绿平面指针，右下角叶片标志静态显示。'},
  {id:'cursor-bubble',kind:'cursor',en:'Bubble pointer',cn:'气泡光标',de:'Flat aqua arrow and a still bubble cluster.',dc:'水蓝平面指针，右下角气泡标志静态显示。'},
  {id:'cursor-shell',kind:'cursor',en:'Seashell pointer',cn:'贝壳光标',de:'Flat peach arrow and a still seashell emblem.',dc:'蜜桃色平面指针，右下角贝壳标志静态显示。'},
  {id:'cursor-rainbow',kind:'cursor',en:'Rainbow pointer',cn:'彩虹光标',de:'A still flat arrow with an animated rainbow emblem.',dc:'平面指针保持静止，右下角彩虹标志动态变化。'},
  {id:'cursor-frost',kind:'cursor',en:'Frost pointer',cn:'冰晶光标',de:'A still flat arrow with a rotating frost emblem.',dc:'平面指针保持静止，右下角冰晶标志旋转闪动。'},
  {id:'cursor-heart',kind:'cursor',en:'Heart pointer',cn:'心动光标',de:'A still flat arrow with a beating heart emblem.',dc:'平面指针保持静止，右下角爱心标志跳动。'},
  {id:'cursor-butterfly',kind:'cursor',en:'Butterfly pointer',cn:'蝶舞光标',de:'A still flat arrow with fluttering butterfly wings.',dc:'平面指针保持静止，右下角蝴蝶翅膀扇动。'},
  {id:'cursor-amethyst',kind:'cursor',en:'Amethyst pointer',cn:'紫晶光标',de:'Light travels through the arrow while the crystal emblem animates.',dc:'指针流光变化，右下角紫晶标志同步动态展示。'},
  {id:'cursor-comet',kind:'cursor',en:'Comet pointer',cn:'彗星光标',de:'An animated luminous arrow with an orbiting comet emblem.',dc:'指针光纹流动，右下角彗星标志环绕运行。'},
  {id:'cursor-nova',kind:'cursor',en:'Nova pointer',cn:'星爆光标',de:'Light travels through the arrow while a starburst pulses.',dc:'指针流光变化，右下角星爆标志旋转闪烁。'},

  {id:'avatar-starling',kind:'avatar',en:'Happy Smile',cn:'开心笑脸',de:'Your free default avatar. A bright wide-eyed smile.',dc:'免费默认头像，睁大眼睛，露出灿烂笑容。'},
  {id:'avatar-cloudy',kind:'avatar',en:'Playful Wink',cn:'调皮眨眼',de:'Friendly wink and open smile.',dc:'眨一下眼，带着轻松的笑意。'},
  {id:'avatar-owl',kind:'avatar',en:'Curious Face',cn:'好奇宝宝',de:'Raised eyebrow, side glance and small surprised mouth.',dc:'挑起眉毛，好奇地看过来。'},
  {id:'avatar-bear',kind:'avatar',en:'Gentle Smile',cn:'温柔微笑',de:'Soft crescent eyes and a gentle closed smile.',dc:'弯弯的眼睛，暖暖的微笑。'},
  {id:'avatar-bob',kind:'avatar',en:'Chestnut Bob',cn:'栗色短发',de:'A neat chestnut bob, mint hair clip and a friendly smile.',dc:'利落栗色短发，薄荷发夹，笑得自然又亲切。'},
  {id:'avatar-ponytail',kind:'avatar',en:'Sunny Ponytail',cn:'元气马尾',de:'A high ponytail with a coral ribbon and a playful wink.',dc:'高马尾配珊瑚色发带，俏皮眨眼，元气满满。'},
  {id:'avatar-rocket',kind:'avatar',en:'Big Laugh',cn:'哈哈大笑',de:'Laughing eyes and a broad joyful mouth.',dc:'笑弯了眼睛，开心藏不住。'},
  {id:'avatar-luna',kind:'avatar',en:'Easygoing',cn:'悠闲眯眼',de:'Relaxed closed eyes and a contented little smile.',dc:'轻轻眯起眼睛，放松一会儿。'},
  {id:'avatar-fox',kind:'avatar',en:'Cheeky Tongue',cn:'吐舌鬼脸',de:'A playful tongue-out smile.',dc:'吐吐舌头，开个小玩笑。'},
  {id:'avatar-bot',kind:'avatar',en:'Cool Shades',cn:'酷酷墨镜',de:'Dark rounded sunglasses and a confident grin.',dc:'戴上墨镜，笑得轻松又自在。'},
  {id:'avatar-buns',kind:'avatar',en:'Ribbon Buns',cn:'蝴蝶结丸子',de:'Twin buns with lilac bows and a joyful, crescent-eyed smile.',dc:'双丸子配紫色蝴蝶结，弯弯笑眼，活泼可爱。'},
  {id:'avatar-waves',kind:'avatar',en:'Pearl Waves',cn:'珍珠卷发',de:'Soft flowing waves and a small pearl barrette.',dc:'柔和波浪长发，点缀珍珠发夹，温柔耐看。'},
  {id:'avatar-octo',kind:'avatar',en:'Starry Eyes',cn:'闪亮星星眼',de:'Golden star pupils inside the same white eyes, with delighted smile.',dc:'眼里闪着小星星，满是期待。'},
  {id:'avatar-crown',kind:'avatar',en:'Happy Crown',cn:'得意小皇冠',de:'The same peach face wearing a little golden crown, with a delighted grin.',dc:'小皇冠戴得正，笑容也更自信。'},
  {id:'avatar-blossom',kind:'avatar',en:'Blossom Hairpin',cn:'花漾发簪',de:'A pink blossom hairpin with gold details on a softly swept hairstyle.',dc:'侧分长发配立体花瓣发簪，金色花蕊精致闪亮。'},
  {id:'avatar-beret',kind:'avatar',en:'Ruby Beret',cn:'莓红贝雷帽',de:'A ruby beret, star brooch and a cheerful, confident wink.',dc:'莓红贝雷帽配星形胸针，轻轻眨眼，俏皮又自信。'},

  /* Style suffixes are the exact plane-skin.js keys, so the homepage hangar
     can render the same aircraft that the visitor equips here. */
  {id:'plane-classic',kind:'plane',en:'Default blue plane',cn:'默认蓝色飞机',de:'The original blue illustrated airplane. Free baseline — switch back any time.',dc:'最初的蓝色插画飞机，默认款，随时免费换回。'},
  {id:'plane-cloud2d',kind:'plane',en:'Cloud Cruiser',cn:'云海巡航',de:'A soft white-and-blue cruiser with a silver propeller hub.',dc:'白蓝配色巡航机，配银色桨毂。'},
  {id:'plane-gold2d',kind:'plane',en:'Golden Wings',cn:'金翼领航',de:'Polished gold body with a golden membership glow.',dc:'亮金机身，配金色会员光晕。'},
  {id:'plane-night2d',kind:'plane',en:'Night Racer',cn:'星夜疾风',de:'Deep violet racer with a violet membership glow.',dc:'深紫疾风机，配紫色会员光晕。'},
  {id:'plane-obsidian2d',kind:'plane',en:'Obsidian Falcon',cn:'黑曜猎隼',de:'Black obsidian with rose-gold edges. Annual VIP.',dc:'黑曜机身配玫瑰金描边；年度 VIP。'},
  {id:'plane-aurora2d',kind:'plane',en:'Aurora Wings',cn:'极光幻翼',de:'Iridescent teal wings with an aurora glow. Annual VIP.',dc:'幻彩青绿机翼与极光光晕；年度 VIP。'},

  /* The three in-game flight trails, sold as their own section. The style
     suffix is the exact key accepted by FlightTrails.emit(style, ...).
     `trail-none` is the free 默认 baseline: NO effect is drawn at all. */
  {id:'trail-none',kind:'trail',en:'No trail',cn:'无拖尾',de:'The original look — nothing trails behind your plane. Free baseline.',dc:'原始外观，飞机身后不绘制任何拖尾；默认款。'},
  {id:'trail-star',kind:'trail',en:'Starlight trail',cn:'星光尾迹',de:'Golden sparks trailing behind your plane. Already yours.',dc:'金色星点随飞行洒落，已拥有，随时免费换回。'},
  {id:'trail-rainbow',kind:'trail',en:'Rainbow trail',cn:'彩虹尾迹',de:'A continuous seven-colour ribbon follows every turn.',dc:'七色连续彩带，随每次转向流动。'},
  {id:'trail-cloud',kind:'trail',en:'Cloud trail',cn:'云朵尾迹',de:'Soft white wisps like a slipstream through the clouds.',dc:'柔白云气，像穿过云层的气流。'},

  /* Board-game cosmetics: FOUR INDEPENDENT product families. Each game has
     its own 默认 baseline and active cosmetic categories,
     and equipping one game NEVER changes another. The card art is drawn per
     game too (round counters / black-white stones / chessboards / X-O). */
  {id:'four-piece-default',kind:'fourPiece',en:'Default counters',cn:'默认棋子',de:'The original Connect Four counters. Free baseline, no skin.',dc:'四子连珠原本的圆片棋子，默认款，不附加任何造型。'},
  {id:'four-piece-neon',kind:'fourPiece',en:'Neon counters',cn:'轨道徽章',de:'Your own piece style. The opponent keeps their own choice.',dc:'只装扮你自己的棋子，对手保留自己的款式。'},
  {id:'four-piece-coral',kind:'fourPiece',en:'Coral blossom',cn:'珊瑚花徽章',de:'A coral flower with warm metallic edging on your own counters.',dc:'珊瑚花瓣与暖金镶边，仅装扮自己的圆片棋子。'},
  {id:'four-piece-jade',kind:'fourPiece',en:'Jade counters',cn:'翠叶徽章',de:'Your own piece style. The opponent keeps their own choice.',dc:'只装扮你自己的棋子，对手保留自己的款式。'},
  {id:'four-piece-pearl',kind:'fourPiece',en:'Pearl shell',cn:'珍珠贝徽章',de:'A pearly shell and tiny pearl, framed in champagne gold.',dc:'贝壳纹、圆润珍珠与香槟金边，仅装扮自己的圆片棋子。'},
  {id:'four-piece-aurora',kind:'fourPiece',en:'Aurora counters',cn:'星芒徽章',de:'Your own piece style. The opponent keeps their own choice.',dc:'只装扮你自己的棋子，对手保留自己的款式。'},
  {id:'four-pink-piece-default',kind:'fourPiecePink',en:'Default pink counters',cn:'默认粉色棋子',de:'The original pink Connect Four counters. Free baseline, no skin.',dc:'四子连珠原本的粉色圆片棋子，默认款，不附加任何造型。'},
  {id:'four-pink-piece-blossom',kind:'fourPiecePink',en:'Cherry blossom',cn:'樱花徽章',de:'A five-petal pink blossom on the pink team\'s counters.',dc:'五瓣樱花落在粉色队伍的棋子中央。'},
  {id:'four-pink-piece-heart',kind:'fourPiecePink',en:'Heart emblem',cn:'爱心徽章',de:'A glossy pink heart on the pink team\'s counters.',dc:'粉色队伍的棋子上的一颗亮泽爱心。'},
  {id:'four-pink-piece-bow',kind:'fourPiecePink',en:'Ribbon bow',cn:'蝴蝶结徽章',de:'A silky pink ribbon bow on the pink team\'s counters.',dc:'粉色队伍的棋子上的丝缎蝴蝶结。'},
  {id:'four-pink-piece-diamond',kind:'fourPiecePink',en:'Pink diamond',cn:'粉钻徽章',de:'A faceted pink diamond on the pink team\'s counters.',dc:'粉色队伍的棋子中央的切面粉钻。'},
  {id:'four-pink-piece-candy',kind:'fourPiecePink',en:'Candy swirl',cn:'糖果徽章',de:'A sweet pink lollipop swirl on the pink team\'s counters.',dc:'粉色队伍的棋子上的甜美棒棒糖漩涡。'},
  {id:'four-board-default',kind:'fourBoard',en:'Peachwood board',cn:'默认桃木棋盘',de:'The original warm peachwood board with recessed holes. Classic theme only.',dc:'原本的暖桃木棋盘与凹陷洞口；仅经典主题生效。'},
  {id:'four-board-neon',kind:'fourBoard',en:'Glacier board',cn:'冰川铝板',de:'Brushed ice-blue metal, silver edges and dark round wells. Classic theme only.',dc:'冰蓝拉丝金属、银色边框与深色圆孔；仅经典主题生效。'},
  {id:'four-board-coral',kind:'fourBoard',en:'Coral ceramic board',cn:'珊瑚陶瓷',de:'Rose ceramic with flowing glaze and warm edges. Classic theme only.',dc:'珊瑚粉釉面、流动陶瓷纹与暖色边缘；仅默认主题生效。'},
  {id:'four-board-jade',kind:'fourBoard',en:'Jade board',cn:'翡翠玉石',de:'Deep green stone with delicate veins and warm gold edges. Classic theme only.',dc:'深绿玉石、细腻石纹与暖金边框；仅经典主题生效。'},
  {id:'four-board-pearl',kind:'fourBoard',en:'Mother-of-pearl board',cn:'贝母珍珠',de:'Ivory mother-of-pearl, shell grain and soft silver edges. Classic theme only.',dc:'象牙贝母、细密贝纹与柔和银边；仅默认主题生效。'},
  {id:'four-board-aurora',kind:'fourBoard',en:'Starlit amethyst board',cn:'星夜紫晶',de:'Violet crystal with stardust and golden inlays. Classic theme only.',dc:'紫晶底色、细碎星砂与金色嵌边；仅经典主题生效。'},
  {id:'gomoku-piece-default',kind:'gomokuPiece',en:'Default stones',cn:'默认棋子',de:'The original black and white Gomoku stones. Free baseline, no skin.',dc:'五子棋原本的黑白子，默认款，不附加任何造型。'},
  {id:'gomoku-piece-neon',kind:'gomokuPiece',en:'Glacial crystal stones',cn:'冰晶切面',de:'Faceted crystal across the whole stone, with dark and light variants for each side.',dc:'整颗棋子的冰晶切面与细碎冰纹，黑白双方保留深浅区分，仅改变自己的棋子。'},
  {id:'gomoku-piece-coral',kind:'gomokuPiece',en:'Coral porcelain stones',cn:'珊瑚花瓷',de:'An inlaid coral blossom across polished dark or light porcelain.',dc:'整颗瓷面上的珊瑚花纹，黑方深瓷、白方浅瓷，仅改变自己的棋子。'},
  {id:'gomoku-piece-jade',kind:'gomokuPiece',en:'Flowing jade stones',cn:'翡翠流纹',de:'Polished jade with flowing mineral veins, in dark and light variants.',dc:'温润玉石与贯穿棋面的流纹，保留黑白深浅区分，仅改变自己的棋子。'},
  {id:'gomoku-piece-pearl',kind:'gomokuPiece',en:'Mother-of-pearl stones',cn:'贝母流光',de:'Shell-like pearl fans and iridescent veins, in dark and light variants.',dc:'贝母扇纹与温润珠光，保留黑白深浅区分，仅改变自己的棋子。'},
  {id:'gomoku-piece-aurora',kind:'gomokuPiece',en:'Gilded nebula stones',cn:'紫金星河',de:'Amethyst bands and gold stardust, in dark and light variants.',dc:'紫晶流带、金色星河与细碎星芒，保留黑白深浅区分，仅改变自己的棋子。'},
  {id:'gomoku-white-piece-default',kind:'gomokuPieceWhite',en:'Default white stones',cn:'默认白子',de:'The original white Gomoku stones. Free baseline, no skin.',dc:'五子棋原本的白子，默认款，不附加任何造型。'},
  {id:'gomoku-white-piece-neon',kind:'gomokuPieceWhite',en:'Glacial crystal white stones',cn:'冰晶切面·白子',de:'Faceted crystal on the white stones, with a light icy finish.',dc:'白子的冰晶切面与细碎冰纹，仅改变白色方棋子。'},
  {id:'gomoku-white-piece-coral',kind:'gomokuPieceWhite',en:'Coral porcelain white stones',cn:'珊瑚花瓷·白子',de:'An inlaid coral blossom across polished light porcelain.',dc:'白子浅瓷面上的珊瑚花纹，仅改变白色方棋子。'},
  {id:'gomoku-white-piece-jade',kind:'gomokuPieceWhite',en:'Flowing jade white stones',cn:'翡翠流纹·白子',de:'Polished jade with flowing mineral veins on the white stones.',dc:'白子的温润玉石与流纹，仅改变白色方棋子。'},
  {id:'gomoku-white-piece-pearl',kind:'gomokuPieceWhite',en:'Mother-of-pearl white stones',cn:'贝母流光·白子',de:'Shell-like pearl fans and iridescent veins on the white stones.',dc:'白子的贝母扇纹与温润珠光，仅改变白色方棋子。'},
  {id:'gomoku-white-piece-aurora',kind:'gomokuPieceWhite',en:'Gilded nebula white stones',cn:'紫金星河·白子',de:'Amethyst bands and gold stardust on the white stones.',dc:'白子的紫晶流带、金色星河与细碎星芒，仅改变白色方棋子。'},
  {id:'chess-board-default',kind:'chessBoard',en:'Default board',cn:'默认棋盘',de:'The original 64-square chessboard. Free baseline, no skin.',dc:'国际象棋原本的 64 格棋盘，默认款，不附加任何造型。'},
  {id:'chess-board-neon',kind:'chessBoard',en:'Neon board',cn:'霓虹棋盘',de:'Cool blue and slate alternating squares.',dc:'冷蓝与深石板色交替方格。'},
  {id:'chess-board-coral',kind:'chessBoard',en:'Coral board',cn:'珊瑚棋盘',de:'Warm coral and cream squares with a rosewood rim.',dc:'暖珊瑚与奶油色方格，配玫瑰木边框。'},
  {id:'chess-board-jade',kind:'chessBoard',en:'Jade board',cn:'翡翠棋盘',de:'Mint and jade-green squares with a gold rim. VIP free.',dc:'浅薄荷与翡翠绿方格，搭配金色边框；VIP 免费。'},
  {id:'chess-board-pearl',kind:'chessBoard',en:'Pearl board',cn:'珍珠棋盘',de:'Ivory pearl and slate squares with a champagne rim. VIP free.',dc:'象牙珍珠与石板灰方格，配香槟金边框；VIP 免费。'},
  {id:'chess-board-aurora',kind:'chessBoard',en:'Aurora board',cn:'星曜棋盘',de:'Twilight violet squares with star-point inlays. Annual VIP free.',dc:'暮紫交替方格缀星点；年度 VIP 免费。'},
  {id:'xo-piece-default',kind:'xoPiece',en:'Default mark',cn:'默认标志',de:'The original X and O marks. Free baseline, no skin.',dc:'井字棋原本的 X / O，默认款，不附加任何造型。'},
  {id:'xo-piece-neon',kind:'xoPiece',en:'Ice crystal marks',cn:'冰晶刻印',de:'Crystal facets and bright ice veins inside your X or O.',dc:'冰晶切面与明亮冰纹，保留自己的 X 或 O 形状。'},
  {id:'xo-piece-coral',kind:'xoPiece',en:'Coral ribbon marks',cn:'珊瑚丝带',de:'Soft coral floral ribbons inside your X or O.',dc:'珊瑚花瓣丝带纹，保留自己的 X 或 O 形状。'},
  {id:'xo-piece-jade',kind:'xoPiece',en:'Woven leaf marks',cn:'藤叶编织',de:'Flowing vines and sculpted leaves inside your X or O.',dc:'流动藤纹与叶片装饰，保留自己的 X 或 O 形状。'},
  {id:'xo-piece-pearl',kind:'xoPiece',en:'Pearl porcelain marks',cn:'珍珠瓷纹',de:'Pearlescent shell grain with small pearl accents inside your X or O.',dc:'贝母瓷纹与细小珍珠装饰，保留自己的 X 或 O 形状。'},
  {id:'xo-piece-aurora',kind:'xoPiece',en:'Stardust marks',cn:'流星星轨',de:'Gold star trails and sparkling tips inside your X or O.',dc:'金色星轨与闪亮星芒，保留自己的 X 或 O 形状。'},
  {id:'xo-o-piece-default',kind:'xoPieceO',en:'Default O mark',cn:'默认 O',de:'The original O mark. Free baseline, no skin.',dc:'井字棋原本的 O，默认款，不附加任何造型。'},
  {id:'xo-o-piece-neon',kind:'xoPieceO',en:'Ice crystal O marks',cn:'冰晶刻印·O',de:'Crystal facets and bright ice veins inside your O.',dc:'冰晶切面与明亮冰纹，保留自己的 O 形状。'},
  {id:'xo-o-piece-coral',kind:'xoPieceO',en:'Coral ribbon O marks',cn:'珊瑚丝带·O',de:'Soft coral floral ribbons inside your O.',dc:'珊瑚花瓣丝带纹，保留自己的 O 形状。'},
  {id:'xo-o-piece-jade',kind:'xoPieceO',en:'Woven leaf O marks',cn:'藤叶编织·O',de:'Flowing vines and sculpted leaves inside your O.',dc:'流动藤纹与叶片装饰，保留自己的 O 形状。'},
  {id:'xo-o-piece-pearl',kind:'xoPieceO',en:'Pearl porcelain O marks',cn:'珍珠瓷纹·O',de:'Pearlescent shell grain with small pearl accents inside your O.',dc:'贝母瓷纹与细小珍珠装饰，保留自己的 O 形状。'},
  {id:'xo-o-piece-aurora',kind:'xoPieceO',en:'Stardust O marks',cn:'流星星轨·O',de:'Gold star trails and sparkling tips inside your O.',dc:'金色星轨与闪亮星芒，保留自己的 O 形状。'},
  {id:'xo-board-default',kind:'xoBoard',en:'Default board',cn:'默认棋盘',de:'The original 3×3 Tic-tac-toe grid. Free baseline, no skin.',dc:'井字棋原本的 3×3 棋盘，默认款，不附加任何造型。'},
  {id:'xo-board-neon',kind:'xoBoard',en:'Neon grid',cn:'霓虹网格',de:'Cool blue cells with a bright cyan grid.',dc:'冷蓝格面与明亮青色网格线。'},
  {id:'xo-board-coral',kind:'xoBoard',en:'Coral grid',cn:'珊瑚网格',de:'Warm coral cells with a soft blush grid.',dc:'暖珊瑚格面与柔和粉色网格线。'},
  {id:'xo-board-jade',kind:'xoBoard',en:'Jade grid',cn:'翡翠网格',de:'Polished jade cells with a mint grid.',dc:'翡翠格面与薄荷绿网格线。'},
  {id:'xo-board-pearl',kind:'xoBoard',en:'Pearl grid',cn:'珍珠网格',de:'Pearlescent slate cells with a champagne grid.',dc:'珠光石板格面与香槟金网格线。'},
  {id:'xo-board-aurora',kind:'xoBoard',en:'Aurora grid',cn:'极光网格',de:'Amethyst cells with a violet stardust grid.',dc:'紫晶格面与紫罗兰星尘网格线。'},

  /* Billiards. ONE theme works for both Pool and Snooker. A ball product is a
     whole rack, but EVERY sphere keeps its own number, stripes and colour —
     the theme restyles materials and adds a per-number signature, it never
     paints all sixteen balls the same. */
  {id:'ball-default',kind:'ball',en:'Default ball set',cn:'默认球组',de:'The original Pool and Snooker balls. Free baseline, no skin.',dc:'台球与斯诺克原本的球组，默认款，不附加任何造型。'},
  {id:'ball-neon',kind:'ball',en:'Glacier enamel',cn:'冰川珐琅球组',de:'Polished enamel, silver number bezels and fine double engraving. Original colours and stripes remain.',dc:'珐琅球面、银色号码镶圈与双道细纹，保留原本球色和条纹。'},
  {id:'ball-crystal',kind:'ball',en:'Crystal glass',cn:'冰晶玻璃球组',de:'Faceted glass spheres with a frosted inner core and a bright icy rim. Original colours and stripes remain.',dc:'切面玻璃球身与霜面内芯，冰蓝亮边，保留原本球色和条纹。'},
  {id:'ball-jade',kind:'ball',en:'Heritage ivory',cn:'典藏象牙球组',de:'Warm ivory number medallions, brushed brass and restrained pinstripes. VIP free.',dc:'暖象牙白号码章、拉丝黄铜镶边与精细环纹；VIP 免费。'},
  {id:'ball-galaxy',kind:'ball',en:'Galaxy nebula',cn:'星云星河球组',de:'Deep-space spheres with scattered stars and a swirling nebula. Original colours and stripes remain. VIP free.',dc:'深空球身缀星点与星云漩涡，保留原本球色和条纹；VIP 免费。'},
  {id:'ball-aurora',kind:'ball',en:'Gilded obsidian',cn:'黑曜鎏金球组',de:'Gilded number bezels and amethyst micro-engraving on the original ball colours. Annual VIP free.',dc:'鎏金号码镶圈与紫晶细刻纹，保留每颗球的原色；年度 VIP 免费。'},
  {id:'cue-default',kind:'cue',en:'Default cue',cn:'默认球杆',de:'The original wooden cue for your own shots. Free baseline, no skin.',dc:'原本的木质球杆，默认款，不附加任何造型。'},
  {id:'cue-neon',kind:'cue',en:'Glacier carbon cue',cn:'冰川碳纤球杆',de:'Woven graphite shaft, ice-blue inlays and satin silver joints. Your cue only.',dc:'石墨碳纤杆身、冰蓝嵌线与哑光银接环，只改变你自己的球杆。'},
  {id:'cue-crystal',kind:'cue',en:'Crystal glass cue',cn:'冰晶玻璃球杆',de:'A clear glass shaft with a bright light core and icy inlays. Your cue only.',dc:'透明玻璃杆身带亮光内芯与冰蓝嵌线，只改变你自己的球杆。'},
  {id:'cue-jade',kind:'cue',en:'Walnut brass cue',cn:'胡桃黄铜球杆',de:'Honey walnut shaft, dark green leather grip and brass splices. VIP free.',dc:'蜜色胡桃木杆身、墨绿皮革握柄与黄铜拼花；VIP 免费。'},
  {id:'cue-galaxy',kind:'cue',en:'Galaxy stardust cue',cn:'星云星河球杆',de:'A deep-space shaft scattered with star points and a violet glow. VIP free.',dc:'深空杆身缀星点与紫光，VIP 免费。'},
  {id:'cue-aurora',kind:'cue',en:'Obsidian inlay cue',cn:'黑曜镶金球杆',de:'Black lacquer, amethyst splices and fine gold inlays. Annual VIP free.',dc:'黑曜漆面、紫晶拼花与精细金属嵌线；年度 VIP 免费。'},
  {id:'table-default',kind:'table',en:'Default table',cn:'默认桌球台',de:'The original cloth and wooden frame. Free baseline, no skin.',dc:'原本的台呢与木框，默认款，不附加任何造型。'},
  {id:'table-neon',kind:'table',en:'Glacier carbon table',cn:'冰川碳纤球台',de:'Steel-blue woven cloth, graphite carbon rails and brushed silver hardware.',dc:'钢蓝织纹台呢、石墨碳纤桌框与拉丝银金属件。'},
  {id:'table-crystal',kind:'table',en:'Crystal glass table',cn:'冰晶玻璃球台',de:'Frosted glass rails and a pale ice-blue cloth with bright seams.',dc:'霜面玻璃桌框与浅冰蓝台呢，亮色接缝。'},
  {id:'table-jade',kind:'table',en:'Walnut club table',cn:'胡桃典藏球台',de:'Racing-green cloth, flowing walnut grain and warm brass hardware. VIP free.',dc:'赛车墨绿台呢、自然胡桃木纹与暖黄铜金属件；VIP 免费。'},
  {id:'table-galaxy',kind:'table',en:'Galaxy starfield table',cn:'星云星河球台',de:'A starfield frame and deep-indigo cloth with violet rails. VIP free.',dc:'星点桌框与深靛台呢，紫色边条；VIP 免费。'},
  {id:'table-aurora',kind:'table',en:'Obsidian gold table',cn:'黑曜鎏金球台',de:'Smoky amethyst cloth, obsidian stone grain and thin gold inlays. Annual VIP free.',dc:'烟紫晶台呢、黑曜石纹桌框与细金嵌线；年度 VIP 免费。'}
 ];
 var byId={};CATALOG.forEach(function(item){byId[item.id]=item;});
 var root=null,heroWallet=null,currentBox=null,hangarCurrent=null,dialog=null,selected=null,observer=null;

 function t(en,cn){return API.t(en,cn);}
 function fmt(n){return API.fmt(n);}
 function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
 function mark(){return '<img class="jp-mark" src="'+API.mark+'" alt="" aria-hidden="true">';}
 function src(id){return API.assetUrl(id);}
 function state(){return API.getState();}
 function freeFor(id){return API.freeFor(id);}
 function rarityOf(id){return API.rarityOf(id);}
 function priceOf(id){return API.priceOf(id);}
 function rarityLabel(id){return RARITY[rarityOf(id)][API.zh()?'cn':'en'];}
 function rarityTag(id,cls){return '<span class="'+cls+'" data-rarity="'+rarityOf(id)+'">'+esc(rarityLabel(id))+'</span>';}
 function freeLabel(id){return rarityOf(id)==='legend'?t('ANNUAL VIP FREE','年VIP 免费'):t('VIP FREE','VIP 免费');}
 /* One-click replacement of an owned item confirms WHICH cosmetic changed.
    The wording is per category, in both languages, and never re-opens the
    redeem dialog. */
 function replacedToast(kind){
  if(isBoardGame(kind)){
   var gn=GAME_NAME[gameOf(kind)],en=gn.en,cn=gn.cn;
   return roleOf(kind)==='piece'
    ?t(en+' pieces replaced successfully','成功替换'+cn+'棋子')
    :t(en+' board replaced successfully','成功替换'+cn+'棋盘');
  }
  return kind==='plane'?t('Aircraft replaced successfully','成功替换飞行器')
   :kind==='avatar'?t('Avatar replaced successfully','成功替换头像')
   :kind==='trail'?t('Trail replaced successfully','成功替换拖尾')
   :kind==='ball'?t('Balls replaced successfully','成功替换台球')
   :kind==='cue'?t('Cue replaced successfully','成功替换球杆')
   :kind==='table'?t('Table replaced successfully','成功替换桌球台')
   :t('Cursor replaced successfully','成功替换光标');
 }
 function stage(id,cls){
  return '<span class="shop-plane-stage '+cls+'" data-plane-style="'+esc(API.planeStyle(id))+'"></span>';
 }
 function trailStage(id,cls){
  /* The 默认 "no trail" baseline has no drawable style: `none` tells the
     preview renderer to draw the plane but no effect at all. */
  return '<span class="shop-trail-stage '+cls+'" data-trail-style="'+esc(API.trailStyle(id)||'none')+'"></span>';
 }
 /* Reproducible vector cards share the in-match materials and palettes. */
 function cosmeticArt(item){
  var game=gameOf(item.kind),role=roleOf(item.kind),theme=API.cosmeticTheme(item.id)||'default';
  return '<span class="shop-personal-art" data-cosmetic-game="'+game+'" data-cosmetic-role="'+role+'" data-cosmetic="'+theme+'" aria-hidden="true">'+
   '<img src="/assets/shop/game-styles/'+item.id+'.svg?v='+(game==='four'?(role==='board'?'20261113-fourboard1':'20261113-fourglass1'):'20261113-personal1')+'" alt="" loading="lazy"></span>';
 }
 /* Billiards cards use the SAME per-ball colour table and theme variables the
    canvas renderers read, so a card showing ball 9 is literally ball 9 in a
    match. Six representative spheres stand in for the full rack. */
 function billiardArt(item){
  /* Same rule as cosmeticArt(): the default card previews the ORIGINAL
     ball / cue / cloth colours instead of publishing a skin. */
  var theme=rarityOf(item.id)==='default'?'default'
   :API.cosmeticTheme?API.cosmeticTheme(item.id):String(item.id).replace(/^(ball|cue|table)-/,'');
  var role=item.kind,inner='',ids=[1,3,8,9,12,15];
  if(role==='ball'){
   for(var i=0;i<ids.length;i++){
    var n=ids[i];
    inner+='<i class="cos-ball" style="--ball-body:var(--ball-'+n+')" data-ball-id="'+n+
     '" data-striped="'+(n>8?'1':'0')+'"><b>'+n+'</b></i>';
   }
  }else if(role==='cue'){
   inner='<i class="cos-cue"><i class="cos-cue-tip"></i><i class="cos-cue-wrap"></i></i>';
  }else{
   inner='<i class="cos-table"><i class="cos-cloth"></i>'+
    '<i class="cos-ball" style="--ball-body:var(--ball-1)" data-ball-id="1"><b>1</b></i>'+
    '<i class="cos-ball" style="--ball-body:var(--ball-9)" data-ball-id="9" data-striped="1"><b>9</b></i>'+
    '<i class="cos-ball" style="--ball-body:var(--ball-8)" data-ball-id="8"><b>8</b></i></i>';
  }
  /* All three theme attributes share ONE element but own disjoint variable
     groups (ball / cue / cloth), so a table card can still draw themed balls. */
  return '<span class="shop-billiard-art" data-billiard-ball="'+esc(theme)+
   '" data-billiard-cue="'+esc(theme)+'" data-billiard-table="'+esc(theme)+
   '" data-billiard-'+role+'="'+esc(theme)+
   '" data-billiard-role="'+role+'" aria-hidden="true">'+inner+'</span>';
 }
 function scanFX(node){
  if(window.__joyflockPlaneFX)window.__joyflockPlaneFX.scan(node||root);
  if(window.__joyflockTrailFX)window.__joyflockTrailFX.scan(node||root);
 }

 /* ------------------------------------------------------- current loadout */
 /* The strip under the hero lists EVERY equipped cosmetic slot, not just the
    original four site-wide ones. All 16 slots (4 global, 9 board-game and
    3 billiards) have their own free baseline, so each chip also carries its
    category label: otherwise six "默认" entries would be indistinguishable.
    This is a read-only view of getState().equipped — buying/equipping still
    goes through the shop API, and paint() refreshes it on shop-changed. */
 var LOADOUT_SLOTS=[
  {slot:'cursor',en:'Pointer',cn:'光标'},
  {slot:'avatar',en:'Avatar',cn:'头像'},
  {slot:'plane',en:'Aircraft',cn:'飞机'},
  {slot:'trail',en:'Trail',cn:'拖尾'},
  {slot:'fourPiece',en:'Connect Four · blue',cn:'四子·蓝棋'},
  {slot:'fourPiecePink',en:'Connect Four · pink',cn:'四子·粉棋'},
  {slot:'fourBoard',en:'Connect Four · board',cn:'四子·棋盘'},
  {slot:'gomokuPiece',en:'Gomoku · black',cn:'五子·黑子'},
  {slot:'gomokuPieceWhite',en:'Gomoku · white',cn:'五子·白子'},
  {slot:'chessBoard',en:'Chess · board',cn:'象棋·棋盘'},
  {slot:'xoPiece',en:'Tic-tac-toe · X',cn:'井字·X'},
  {slot:'xoPieceO',en:'Tic-tac-toe · O',cn:'井字·O'},
  {slot:'xoBoard',en:'Tic-tac-toe · board',cn:'井字·棋盘'},
  {slot:'ball',en:'Billiards · balls',cn:'台球·球'},
  {slot:'cue',en:'Billiards · cue',cn:'台球·球杆'},
  {slot:'table',en:'Billiards · cloth',cn:'台球·台呢'}
 ];
 var LOADOUT_ART_VERSION='20261115-loadout1';
 function loadoutIcon(kind,id){
  if(!id)return '<span class="shop-current-empty">—</span>';
  /* The first four slots keep the exact markup used before, so the plane /
     trail FX scanners and the existing cursor / avatar styles still apply. */
  if(kind==='cursor')return '<img class="shop-current-cursor" src="'+src(id)+'" alt="">';
  if(kind==='avatar')return '<span class="shop-current-avatar" style="--shop-avatar:url('+src(id)+')"></span>';
  if(kind==='plane')return '<span class="shop-plane-stage shop-current-plane" data-plane-current data-plane-style="'+esc(API.planeStyle(id))+'"></span>';
  if(kind==='trail')return '<span class="shop-current-trail" data-trail-dot="'+esc(API.trailStyle(id))+'"></span>';
  /* Board-game styles and billiards skins ship standalone SVG previews, so a
     plain 24px thumbnail avoids dragging the full animated card art in here. */
  var folder=isBoardGame(kind)?'game-styles':'billiards-v2';
  return '<img class="shop-current-svg" src="/assets/shop/'+folder+'/'+esc(id)+'.svg?v='+LOADOUT_ART_VERSION+'" alt="">';
 }
 function currentLoadoutHtml(s){
  return '<span class="shop-current-title">'+esc(t('Equipped now','当前装配'))+'</span>'+
   LOADOUT_SLOTS.map(function(slot){
    var id=s.equipped[slot.slot]||'',item=byId[id];
    var label=t(slot.en,slot.cn),name=item?t(item.en,item.cn):t('Not selected','未选择');
    return '<div class="shop-current-item" data-slot="'+esc(slot.slot)+'" title="'+esc(label+' · '+name)+'">'+
      loadoutIcon(slot.slot,id)+
      '<span class="shop-current-slot">'+esc(label)+'</span>'+
      '<span class="shop-current-name">'+esc(name)+'</span></div>';
   }).join('');
 }

 /* ------------------------------------------------------------- catalogue */
 /* ONE ordering rule for every section: 默认 → Rare → Epic → Legendary. The
    sort is explicitly stable (the catalogue index breaks ties), so items of
    the same grade keep their hand-picked order and every free baseline leads
    its own section. New products are filed by grade automatically. */
 var GRADE_ORDER={default:-1,rare:0,epic:1,legend:2};
 function graded(kinds){
  return CATALOG.filter(function(x){return kinds.indexOf(x.kind)>=0;})
   .map(function(x,i){return {item:x,i:i};})
   .sort(function(a,b){
    var d=(GRADE_ORDER[rarityOf(a.item.id)]||0)-(GRADE_ORDER[rarityOf(b.item.id)]||0);
    if(d)return d;
    /* A board-game section holds pieces AND boards: inside one grade the
       four pieces lead, so each grade reads as a matched pair of rows. */
    var pa=isBoardGame(a.item.kind)&&roleOf(a.item.kind)==='piece'?0:1;
    var pb=isBoardGame(b.item.kind)&&roleOf(b.item.kind)==='piece'?0:1;
    return pa-pb||a.i-b.i;
   })
   .map(function(x){return x.item;});
 }
 function headFor(kind){
  return kind==='cursor'
   ?[t('Cursors','光标'),t('Rare: static · Epic: animated emblem · Legendary: animated arrow and emblem','稀有全静态 · 史诗标志动态 · 传说指针和标志都动态')]
   :kind==='avatar'
   ?[t('Avatars','头像'),t(CATALOG.filter(function(x){return x.kind==='avatar';}).length+' expressions and hairstyles · Happy Smile is the free default',CATALOG.filter(function(x){return x.kind==='avatar';}).length+' 款表情与发型 · 开心笑脸为免费默认头像')]
   :kind==='trail'
   ?[t('Flight trails','飞行器拖尾'),t('Four options · 默认 is no trail at all · equip one at a time','4 款 · 默认为无拖尾，一次装备一款')]
   :kind==='ball'
   ?[t('Billiard balls','台球用球'),t('Six sets · each ball keeps its own number, stripes and colour · 默认 is the original rack','6 款球组 · 每颗球按编号单独设计，保留号码与条纹 · 默认款为原始球组')]
   :kind==='cue'
   ?[t('Cues','球杆'),t('Six cues · only your own stroke changes · 默认 is the original wooden cue','6 款球杆 · 只替换你自己出杆时的球杆 · 默认款为原始木杆')]
   :kind==='table'
   ?[t('Billiard tables','桌球台'),t('Six tables · shared cloth · 默认 is the original cloth · arbitration when both pick one','公共台呢 · 含默认款；双方都选时按 年VIP > VIP > 普通 → 累计得分 → 随机 裁决')]
   :[t('Aircraft','飞行器'),t('Six planes · 默认 is the blue Classic · animated propeller; trails sold separately','6 款飞机 · 默认为蓝色经典机，拖尾为独立道具')];
 }
 /* One section PER GAME. Everything in it is exclusive to that game: the
    pieces, the shared board, the 默认 baseline and the equip slots. */
 function gameHead(g){
  var name=t(GAME_NAME[g].en,GAME_NAME[g].cn);
  return [name,g==='four'
   ?t('Classic only · 6 blue counters + 6 pink counters + 6 shared boards · board priority: Annual VIP > VIP > regular → total points → random; seasonal themes keep their own look','仅默认主题 · 6 款蓝色棋子 + 6 款粉色棋子 + 6 款公共棋盘 · 棋盘按 年VIP > VIP > 普通 → 累计得分 → 随机；节日主题保留原貌')
   :g==='chess'
   ?t('Six board designs · original chess pieces','6 款棋盘 · 保留原本的国际象棋棋子')
   :g==='gomoku'
   ?t('6 black + 6 white stone styles · only your own side changes · each player keeps their own style','6 款黑子 + 6 款白子 · 仅改变自己一方的棋子 · 双方各用自己的款式')
   :g==='xo'
   ?t('6 X + 6 O marks + 6 shared boards · only your own mark changes · board priority: Annual VIP > VIP > regular → total points → random','6 款 X + 6 款 O + 6 款公共棋盘 · 仅改变自己一方的标志 · 棋盘按 年VIP > VIP > 普通 → 累计得分 → 随机')
   :t('Six personal styles · only your pieces change · each player keeps their own style','6 款个人'+(g==='xo'?'标志':'棋子')+' · 仅本游戏生效，四游戏互不共用 · 双方各用自己的款式')];
 }
 function cardHtml(item){
  var isPlane=item.kind==='plane',isTrail=item.kind==='trail';
  var isCosmetic=isBoardGame(item.kind);
  var isBilliard=item.kind==='ball'||item.kind==='cue'||item.kind==='table';
  var art=isPlane?stage(item.id,'')
   :isTrail?trailStage(item.id,'')
   :isCosmetic?cosmeticArt(item)
   :isBilliard?billiardArt(item)
   :'<img class="shop-art" src="'+src(item.id)+'" alt="" loading="lazy">';
  /* The top-right ribbon is back — but it now says 装配中 / Equipped and
     appears ONLY on the card that is actually in use. Ownership keeps its
     single bottom pill, so the two markers no longer repeat one word. */
  return '<button type="button" class="shop-card'+(isPlane?' shop-card--plane':isTrail?' shop-card--trail':'')+'" data-shop-id="'+item.id+'" data-rarity="'+rarityOf(item.id)+'" aria-label="'+esc(t(item.en,item.cn))+'">'+
    rarityTag(item.id,'shop-rarity')+
    '<span class="shop-state" aria-hidden="true"></span>'+
    art+
    '<span class="shop-name">'+esc(t(item.en,item.cn))+'</span>'+
    '<span class="shop-price"></span>'+
   '</button>';
 }
 /* Every grid is the SAME six-column grid, so a card in a lane has exactly
    the same width as a card in any other section. Only the row fills differ. */
 function gridHtml(modifier,items){
  return '<div class="shop-grid'+(modifier?' '+modifier:'')+'">'+
   items.map(cardHtml).join('')+'</div>';
 }
 /* A section that owns BOTH roles (Connect Four) is split into two labelled
    lanes instead of interleaving 棋子 / 棋盘 cards grade by grade. Each lane
    keeps its own 默认 → Rare → Epic → Legendary order. Sections with only one
    active role keep the original single grid, untouched. */
 function laneOf(kind){return kind==='fourPiecePink'?'pink':kind==='gomokuPieceWhite'?'white':kind==='xoPieceO'?'o':roleOf(kind);}
 function laneTitle(kind){
  if(kind==='fourPiecePink')return [t('Pink pieces','粉色棋子'),t('6 styles · the pink team\'s counters','6 款 · 粉色队伍的棋子')];
  if(kind==='gomokuPieceWhite')return [t('White pieces','白色棋子'),t('6 styles · the white team\'s stones','6 款 · 白色方的棋子')];
  if(kind==='xoPieceO')return [t('O marks','O 标志'),t('6 styles · the O mark','6 款 · O 一方的标志')];
  return roleOf(kind)==='piece'
   ?[t('Pieces','棋子'),t('6 styles · only your own pieces','6 款 · 仅改变你的棋子')]
   :[t('Board','棋盘'),t('6 styles · shared board','6 款 · 双方公用棋盘')];
 }
 function renderSection(dataKind,kinds,head){
  var items=graded(kinds);
  var modifier=dataKind==='plane'?'shop-grid--planes':dataKind==='trail'?'shop-grid--trails':'';
  var body=kinds.length>1
   ?kinds.map(function(k){
     var title=laneTitle(k);
     return '<div class="shop-lane" data-lane="'+laneOf(k)+'">'+
       '<div class="shop-lane-head"><h3>'+esc(title[0])+'</h3><small>'+esc(title[1])+'</small></div>'+
       gridHtml(modifier,items.filter(function(it){return it.kind===k;}))+
      '</div>';
    }).join('')
   :gridHtml(modifier,items);
  return '<section class="shop-section" data-kind="'+dataKind+'">'+
    '<div class="shop-section-head"><h2>'+esc(head[0])+' <small>'+esc(head[1])+'</small></h2></div>'+
    body+'</section>';
 }
 function section(kind){return renderSection(kind,[kind],headFor(kind));}
 function gameSection(g){return renderSection(g,g==='four'?['fourPiece','fourPiecePink','fourBoard']:g==='gomoku'?['gomokuPiece','gomokuPieceWhite']:g==='xo'?['xoPiece','xoPieceO','xoBoard']:[g+(g==='chess'?'Board':'Piece')],gameHead(g));}

 function paint(){
  if(!root)return;
  var s=state();
  if(heroWallet){
   heroWallet.innerHTML='<span class="shop-wallet-label">'+esc(t(COIN+' balance',COIN+' 余额'))+'</span>'+
    '<span class="shop-wallet-value">'+mark()+fmt(s.total)+'</span>'+
    (s.vip?'<span class="shop-wallet-vip">VIP</span>':'')+
    (s.annualVip?'<span class="shop-wallet-vip shop-wallet-annual">ANNUAL VIP</span>':'');
  }
  if(currentBox)currentBox.innerHTML=currentLoadoutHtml(s);
  if(hangarCurrent){
   var p=s.equipped.plane||'plane-classic',pi=byId[p];
   hangarCurrent.innerHTML='<span>'+esc(t('Current aircraft','当前飞机'))+'</span><b>'+esc(t(pi.en,pi.cn))+'</b>'+
    rarityTag(p,'shop-rarity')+
    '<span>'+esc(freeFor(p)?t('Membership free','会员免费'):s.owned[p]?t('Owned','已拥有'):'')+'</span>';
  }
  var cards=root.querySelectorAll('.shop-card');
  Array.prototype.forEach.call(cards,function(card){
   var id=card.dataset.shopId,item=byId[id],s2=state();
   var equipped=s2.equipped[item.kind]===id;
   var free=freeFor(id),owned=!!s2.owned[id];
   card.dataset.equipped=equipped?'1':'0';
   card.dataset.vip=free?'1':'0';
   /* Ownership is stated ONCE by the bottom pill. The restored top-right
      ribbon says something DIFFERENT: 装配中 / Equipped, and only on the
      one card of this section that is really in use. */
   var ribbon=card.querySelector('.shop-state');
   if(ribbon)ribbon.textContent=equipped?t('Equipped','装配中'):'';
   card.querySelector('.shop-price').innerHTML=free
    ?'<span class="shop-price-free">'+esc(freeLabel(id))+'</span>'
    :owned?'<span class="shop-price-owned">'+esc(t('Owned','已拥有'))+'</span>'
    :mark()+fmt(priceOf(id));
  });
  if(selected)renderDialog(selected);
  scanFX(root);
 }

 /* --------------------------------------------------------------- dialog */
 function buildDialog(){
  dialog=document.createElement('dialog');dialog.className='shop-buy';dialog.id='shop-buy';
  dialog.setAttribute('aria-label',t('Redeem item','兑换道具'));
  document.body.append(dialog);
  dialog.addEventListener('click',function(e){
   if(e.target===dialog){dialog.close();return;}
   if(e.target.closest('[data-shop-close]')||e.target.closest('[data-shop-cancel]')){dialog.close();return;}
   if(e.target.closest('[data-shop-confirm]'))confirm();
  });
  dialog.addEventListener('close',function(){selected=null;});
 }

 function renderDialog(id){
  var item=byId[id];if(!item)return;
  var s=state();
  var equipped=s.equipped[item.kind]===id;
  var free=freeFor(id),owned=!!s.owned[id];
  var price=priceOf(id);
  var cost=free||owned?0:price;
  var short=Math.max(0,price-s.total);
  var blocked=!free&&!owned&&short>0;
  var legendary=rarityOf(id)==='legend';
  var starter=owned&&rarityOf(id)==='default';
  var button=equipped?t('Already equipped','已在使用')
   :free?(legendary?t('Equip instantly with Annual VIP','年VIP 直接替换'):t('Equip instantly with VIP','VIP 直接替换'))
   :owned?t('Equip now','直接替换')
   :blocked?t('Not enough '+COIN,COIN+' 不足')
   :t('Redeem for '+fmt(price)+' '+COIN,'以 '+fmt(price)+' '+COIN+' 兑换并替换');
  var payLabel=free?(legendary?t('Annual VIP membership','年度 VIP 会员'):t('VIP membership','VIP 会员'))
   :owned?t('Already owned','已拥有'):t(COIN,COIN);
  var payValue=free||owned?t('FREE','免费'):mark()+fmt(price);
  var art=item.kind==='plane'?stage(id,'shop-plane-stage--dialog')
   :item.kind==='trail'?trailStage(id,'shop-trail-stage--dialog')
   :isBoardGame(item.kind)?cosmeticArt(item)
   :item.kind==='ball'||item.kind==='cue'||item.kind==='table'?billiardArt(item)
   :'<img src="'+src(id)+'" alt="">';
  /* ONE route note, not two. open() only shows this dialog to visitors who
     are neither the owner nor an entitled VIP, so the old grade note at the
     bottom of the art card and the VIP note under the CTA always described
     the same two routes twice — both in loud gold, one per column. The short
     grade sentence now sits directly under the price; the longer membership
     sentence stays as the fallback for the already-owned case. */
  var gradeNote=rarityOf(id)==='epic'
   ?t('Epic: VIP and Annual VIP equip for free; everyone else redeems for 3,000 '+COIN+'.','史诗：VIP 与年度 VIP 免费替换；其他玩家可用 3,000 '+COIN+' 兑换。')
   :legendary
   ?t('Legendary: Annual VIP equips for free; everyone else redeems for 5,000 '+COIN+'.','传说：年度 VIP 免费替换；其他玩家可用 5,000 '+COIN+' 兑换。')
   :'';
  var vipNote=starter
   ?t('This item is already yours; switching back to it costs no '+COIN+'.','该道具已拥有，换回不消耗 '+COIN+'。')
   :free?'':(legendary
    ?t('Annual VIP members equip directly, with no '+COIN+' spent; other players redeem for 5,000 '+COIN+'.','年度 VIP 会员无需 '+COIN+'，可直接替换；其他玩家可用 5,000 '+COIN+' 兑换。')
     :rarityOf(id)==='epic'
     ?t('VIP members equip directly, with no '+COIN+' spent; other players redeem for 3,000 '+COIN+'.','VIP 会员无需 '+COIN+'，可直接替换；其他玩家可用 3,000 '+COIN+' 兑换。')
     :'');
  var routeNote=gradeNote||vipNote;
  dialog.dataset.rarity=rarityOf(id);
  dialog.dataset.kind=item.kind;
  dialog.innerHTML=
   '<button type="button" class="shop-buy-close" data-shop-close aria-label="'+esc(t('Close','关闭'))+'">×</button>'+
   '<h2>'+esc(t('Redeem this item?','要兑换这个道具吗？'))+' '+rarityTag(id,'shop-rarity shop-rarity--dialog')+'</h2>'+
   '<div class="shop-buy-body">'+
    '<div class="shop-buy-art">'+
     art+
     '<h3>'+esc(t(item.en,item.cn))+'</h3>'+
     '<p>'+esc(t(item.de,item.dc))+'</p>'+
    '</div>'+
    '<div class="shop-buy-pay">'+
     '<span class="shop-buy-caption">'+esc(t('Payment method','支付方式'))+'</span>'+
     '<div class="shop-pay-option'+(free?' is-vip':'')+'">'+
      '<span>'+esc(payLabel)+'</span><b>'+payValue+'</b>'+
      '<small>'+esc(t('You have ','你有 ')+fmt(s.total))+'</small></div>'+
     (routeNote?'<p class="shop-buy-vip-note">'+esc(routeNote)+'</p>':'')+
     '<div class="shop-buy-actions">'+
      '<button type="button" class="shop-buy-submit" data-shop-confirm'+(blocked||equipped?' disabled':'')+'>'+esc(button)+'</button>'+
      (blocked?'<small class="shop-buy-short">'+esc(t('Still need ','还差 ')+fmt(short))+'</small>':'')+
      '<button type="button" class="shop-buy-cancel" data-shop-cancel>'+esc(t('Cancel','取消'))+'</button>'+
     '</div>'+
    '</div>'+
   '</div>';
  dialog.querySelector('.shop-pay-option').classList.toggle('is-vip',!!free);
  scanFX(dialog);
 }

 function open(id){
  if(!byId[id])return;
  var item=byId[id],s=state();
  /* Already owned = NO confirmation dialog. One click really equips it (free,
     including the two starter items and anything redeemed earlier), then a
     toast reports which cosmetic was replaced. Ownership wins over a VIP
     perk, so a member clicking an owned item gets the same short notice. */
  if(s.owned[id]){
   if(dialog&&dialog.open){dialog.close();selected=null;}
   var ownedResult=API.buy(id);
   if(ownedResult.ok)API.toast(replacedToast(item.kind));
   return;
  }
  /* A matching membership is a ONE-CLICK replacement: there is no payment
     step and no "Are you sure?" dialog to click through. buy() already emits
     joyflock:shop-changed, which repaints the cards, the hangar and the
     header balance; the wallet never changes for a server-verified tier.
     Ordinary visitors still get the redeem dialog below. */
  if(freeFor(id)){
   if(dialog&&dialog.open){dialog.close();selected=null;}
   var r=API.buy(id);
   if(r.ok)API.toast(rarityOf(id)==='legend'
    ?t('Annual VIP free: equipped '+t(item.en,item.cn),'年度 VIP 免费：已替换为'+t(item.en,item.cn))
    :t('VIP free: equipped '+t(item.en,item.cn),'VIP 免费：已替换为'+t(item.en,item.cn)));
   return;
  }
  selected=id;renderDialog(id);
  if(!dialog.open)dialog.showModal();
 }

 function confirm(){
  var id=selected;if(!id)return;
  var item=byId[id],s=state();
  if(s.equipped[item.kind]===id){API.toast(t('Already in use.','当前已在使用。'));return;}
  var price=priceOf(id);
  var r=API.buy(id);
  if(!r.ok){
   if(r.reason==='insufficient')API.toast(t('Still need '+fmt(r.short)+' '+COIN+'.','还差 '+fmt(r.short)+' '+COIN+'。'));
   return;
  }
  dialog.close();selected=null;paint();
  API.toast(r.free?(rarityOf(id)==='legend'
    ?t('Annual VIP free: equipped '+t(item.en,item.cn),'年度 VIP 免费：已替换为'+t(item.en,item.cn))
    :t('VIP free: equipped '+t(item.en,item.cn),'VIP 免费：已替换为'+t(item.en,item.cn)))
   :r.cost?t('Redeemed for '+fmt(price)+' '+COIN+' and equipped.','已扣除 '+fmt(price)+' '+COIN+' 并替换成功。')
   :replacedToast(item.kind));
 }

 /* ---------------------------------------------------------------- mount */
 /* Static copy is rebuilt on a locale change; the card grid keeps its state
    because paint() runs immediately afterwards and the click listener lives
    on the persistent #shop-root, not on the replaced children. */
 function renderShell(){
  root.innerHTML=
   '<div class="shop-hero"><div><h1>'+esc(t('Joy Coin Shop','Joy Coin 商城'))+'</h1>'+
    '<p>'+esc(t('One currency: Joy Coin (✦). Rare 1,000 · Epic 3,000 (free for VIP) · Legendary 5,000 (free for Annual VIP). Free 默认 baselines are already equipped.','唯一货币 Joy Coin（✦ 星标）。稀有 1,000 · 史诗 3,000（VIP 免费）· 传说 5,000（年VIP 免费）。各分区另有免费默认款，已装配。'))+'</p></div>'+
    '<div class="shop-wallet" id="shop-wallet"></div></div>'+
   '<section class="shop-hangar">'+
    '<div class="shop-hangar-info">'+
     '<span class="shop-hangar-pill">✦ '+esc(t('YOUR HANGAR','我的机库'))+'</span>'+
     '<h2>'+esc(t('Ready for your next flight','选一架，准备起飞'))+'</h2>'+
     '<p>'+esc(t('Six illustrated aircraft with a spinning propeller. The 默认 one is the blue Classic; one Rare, two Epic (VIP free) and two Legendary (Annual VIP free) are also on sale. Flight trails are separate items, sold in their own section below.','6 款插画飞机，螺旋桨持续旋转。默认款为蓝色经典飞机；另有一款稀有、两款史诗（VIP 免费）、两款传说（年度 VIP 免费）。飞行拖尾为独立道具，不包含在飞机内；默认无拖尾，三款尾迹已在下方独立分区上架。'))+'</p>'+
     '<div class="shop-hangar-current" id="shop-hangar-current"></div>'+
    '</div>'+
    /* Poster stage: while the starter Classic is equipped, show the more
       striking Obsidian Falcon here; after another plane is equipped it
       follows the real aircraft (site-plane-fx.js refresh()). This is a
       display choice only — ownership, prices and rarity do not change. */
    '<span class="shop-plane-stage shop-plane-stage--hero" data-plane-showcase="obsidian2d" data-plane-style="obsidian2d" role="img" aria-label="'+esc(t('Aircraft showcase','飞机展示'))+'"></span>'+
   '</section>'+
   '<div class="shop-current" id="shop-current"></div>'+
   section('plane')+section('trail')+section('cursor')+section('avatar')+
   GAME_KEYS.map(gameSection).join('')+
   section('ball')+section('cue')+section('table')+
   '<p class="shop-note">'+esc(t(
    'Only three grades: Rare 1,000 '+COIN+', Epic 3,000 '+COIN+' (VIP and Annual VIP equip free), Legendary 5,000 '+COIN+' (Annual VIP equips free). The 默认 pointer, blue Classic aircraft and no-trail baseline are free; Starlight stays an owned Rare trail. Wallet: 10,000 '+COIN+' to start. Purchases, ownership and equipped cosmetics are saved in this browser and really replace the site cursor, account avatar, aircraft and flight trail. Real balances, deductions and VIP entitlement must be supplied by the server ; cosmetics never change any game rule, score or win rate. Flight trails are separate items, not part of an aircraft: Starlight (Rare), Rainbow (Epic) and Cloud (Legendary) are sold in their own section and change the trail drawn behind your plane in a game. Avatar frames are not part of this shop. Connect Four, Gomoku, Chess and Tic-tac-toe each own an INDEPENDENT product family: personal counters for Connect Four, stones for Gomoku, marks for Tic-tac-toe, and boards only for Chess. Each item works in its own game. Each player keeps their own piece style; the Chess board is shared and is decided by Annual VIP > VIP > normal, then higher cumulative match score, then a random draw when both sides picked one. Billiard balls, cues and tables are separate products too: one theme covers both Pool and Snooker, and EVERY ball keeps its own number, stripes and colour instead of being painted one flat shade. A cue changes only your own shots; the table cloth is shared and follows the same Annual VIP > VIP > normal, higher cumulative match score, then random draw rule. Every section ships ONE free default baseline, owned and equipped on the first visit: the blue Classic aircraft, no trail, the built-in pointer, the Happy Smile avatar, the original stones and board of EACH board game, and the original balls / cue / cloth. A baseline restores the original artwork, costs nothing and publishes no skin; the 装配中 ribbon marks the item currently in use.',
    '只有三档：稀有 1,000 '+COIN+'、史诗 3,000 '+COIN+'（VIP 与年度 VIP 免费）、传说 5,000 '+COIN+'（年度 VIP 免费）。默认光标、蓝色经典飞机与无拖尾为免费默认款；星光尾迹仍是已拥有的稀有道具。'+COIN+' 钱包初始 10,000。兑换、拥有与装扮会保存在本浏览器，并真实替换整站光标、账户头像、飞行器与飞行尾迹。真实余额、扣减与 VIP 身份必须由服务端提供；外观道具不影响任何游戏规则、对局得分结算或胜率。飞行拖尾为独立道具，不包含在飞机内：星光（稀有）、彩虹（史诗）、云朵（传说）已在独立分区上架，装备后会改变对局中飞机身后的尾迹；人物头像框暂不开放。四子连珠、五子棋、国际象棋、井字棋各有一套独立商品：四子连珠为个人圆片、五子棋为个人棋子、井字棋为个人标志，国际象棋只提供棋盘款式，各有 4 款，只在本游戏生效；双方各用自己的棋子款式；国际象棋棋盘为双方公用，双方都选择时按 年VIP > VIP > 普通用户、再比双方累计得分、仍相同则随机 裁决。台球用球、球杆与桌球台同样是独立道具：一套造型同时适用欢乐台球与斯诺克，16 颗球逐颗设计，每颗都保留自己的号码、条纹与配色，不会刷成同一个颜色；球杆只改变你自己出杆时的那一根；台呢为双方公用，裁决顺序与棋盘相同。每个分区都有一款免费默认款，首次访问即拥有并装配：蓝色经典飞机、无拖尾、原本光标、开心笑脸头像、四个棋类各自的原始棋子 / 棋盘，以及原始球组 / 球杆 / 台呢；默认款恢复原始外观、不消耗 '+COIN+'、不附加任何造型，右上角「装配中」标出当前正在使用的道具。'))+'</p>';
  heroWallet=document.getElementById('shop-wallet');
  currentBox=document.getElementById('shop-current');
  hangarCurrent=document.getElementById('shop-hangar-current');
  scanFX(root);
 }

 function mount(){
  root=document.getElementById('shop-root');if(!root)return;
  renderShell();buildDialog();paint();
  root.addEventListener('click',function(e){
   var card=e.target.closest('[data-shop-id]');if(card){open(card.dataset.shopId);return;}
  });
  window.addEventListener('joyflock:shop-changed',paint);
  if(typeof MutationObserver!=='undefined'){
   observer=new MutationObserver(function(){renderShell();paint();});
   observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-locale','lang']});
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
 window.__joyflockShopCatalog={version:VERSION,items:CATALOG,priceOf:priceOf,rarityOf:rarityOf};
})();
