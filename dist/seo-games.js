/* JoyFlock game SEO contract — the single source of truth for every game's
   search / share metadata and for the static landing pages under /games/.

   Buildless: scripts/build-game-seo.mjs imports this file and regenerates the
   pages, sitemap.xml, robots.txt and game-seo-meta.js. Do not hand-edit the
   generated files — edit this contract and re-run the generator instead.

   `id` MUST match the ?game= value used by portal.js / table.js, otherwise
   game-seo-meta.js cannot map a live game URL to its canonical landing page. */
export const SITE = {
  origin: 'https://flight.joyflock.com',
  name: 'JoyFlock',
  tagline: {zh: '十款游戏，打开就能玩', en: 'Ten games, just open one'},
  zhPath: '/games/',
  enPath: '/en/games/',
  ogWidth: 1200,
  ogHeight: 630,
  lastmod: '2026-11-20',
  cacheKey: '20261120-nineball1'
};

export const GAMES = [
  {
    id: 'pool', slug: 'pool', cover: '/assets/covers/pool.jpg',
    name: {zh: '欢乐台球', en: 'Pool'},
    altNames: {zh: ['八球', '在线台球', '2D 台球'], en: ['8-ball', 'online billiards', 'pocket billiards']},
    title: {zh: '欢乐台球在线玩 · 免费双人对战 | JoyFlock', en: 'Play Pool Online Free — 2-Player 8-Ball Game | JoyFlock'},
    description: {zh: '在 JoyFlock 免费在线玩欢乐台球：不用下载，打开浏览器就能和好友打一局休闲八球。鼠标瞄准、拖拽蓄力、松开击球，支持电脑对战、创建房间与邀请链接，还有真实击球音效与进球反馈。', en: 'Play free online 8-ball pool on JoyFlock — no download, no sign-up. Aim with the mouse, drag to set power and release to shoot. Challenge the computer, create a private room or send an invite link to a friend.'},
    keywords: {zh: '欢乐台球,在线台球,八球游戏,双人台球,免费台球游戏,网页台球,无需下载', en: 'online pool,8-ball game,free billiards,two player pool,browser pool game,no download'},
    lead: {zh: '一杆定胜负的休闲八球，操作只要「瞄准—蓄力—松手」三步。', en: 'A casual 8-ball table that takes three moves: aim, pull back, release.'},
    about: {zh: ['欢乐台球是一张为浏览器重做的休闲八球桌。球桌、球体与袋口都有独立渲染，击球、碰撞、落袋各有音效，力量条与击球点让每一杆都能自己控制。规则比竞技八球更轻，一局通常几分钟就能打完。', '不想等人的时候可以开电脑对战；想和朋友打就创建房间，把邀请链接发过去，两人进同一个房间即可开局。'], en: ['A casual eight-ball table rebuilt for the browser. The cloth, balls and pockets are rendered separately, with their own impact and drop sounds, while the power meter and cue-ball contact point keep every shot under your control.', 'Play the computer when you are alone, or create a room and send the invite link — both players land on the same table instantly.']},
    rules: {zh: ['首次有效进球决定你打全色（1–7）还是花色（9–15）；打进本组球可以继续出杆。', '分组后先碰对方球、未先碰本组目标球或白球落袋都算犯规，对手获得额外一杆。', '清空本组后，合法打进 8 号球获胜；提前打进 8 号或同时白球落袋判负。最多 200 杆后按落袋数判定。'], en: ['The first legal pot assigns solids (1–7) or stripes (9–15); potting your own group keeps the turn.', 'After the assignment, hitting the opponent group first, missing your own group or scratching gives the opponent an extra shot.', 'Clear your group, then legally pot the 8-ball to win. An early 8-ball or a scratch on the 8 loses. After 200 shots the higher pocket count wins.']},
    faq: [
      {q: {zh: '欢乐台球是完整的竞技八球规则吗？', en: 'Is this full competition eight-ball rules?'}, a: {zh: '不是。这是为快速对局简化的休闲八球，判定更宽松、节奏更快，适合几分钟一局的联机娱乐。', en: 'No. This is a simplified, faster casual variant tuned for short online matches rather than tournament rules.'}},
      {q: {zh: '需要下载或注册才能玩吗？', en: 'Do I need to download or register?'}, a: {zh: '不需要。浏览器打开页面即可开始，游客身份也能玩；登录账号才会把Joy Coins 和战绩累计下来。', en: 'No. Open the page and play as a guest. An account is only needed if you want your Joy Coins and stats saved.'}},
      {q: {zh: '可以邀请朋友一起打吗？', en: 'Can I invite a friend?'}, a: {zh: '可以。点「创建房间」生成邀请链接，对方打开后进入同一张球桌，两人轮流击球。', en: 'Yes. Create a room, share the invite link and you both land on the same table, taking alternating shots.'}}
    ],
    features: {zh: ['鼠标瞄准与拖拽蓄力', '好友房间与邀请链接', '电脑对战随时开局'], en: ['Mouse aiming with drag-to-charge power', 'Private rooms and invite links', 'Instant computer opponent']},
    players: {min: 2, max: 2, label: {zh: '2 人', en: '2 players'}},
    modes: {zh: '电脑对战 · 好友联机 · 快速匹配', en: 'Computer · Friend room · Quick match'},
    genre: {zh: ['台球', '休闲竞技'], en: ['Billiards', 'Casual sport']}
  },
  {
    id: 'flight', slug: 'flight-party', cover: '/assets/plane-vip-gold-body.png',
    name: {zh: '飞行棋', en: 'Flight Party'},
    altNames: {zh: ['飞行棋联机', '在线飞行棋', 'Aeroplane Chess'], en: ['Aeroplane Chess', 'Ludo', 'online flight chess']},
    title: {zh: '飞行棋在线玩 · 2–4 人好友联机 | JoyFlock', en: 'Play Flight Party Online — 2–4 Player Aeroplane Chess | JoyFlock'},
    description: {zh: 'JoyFlock 飞行棋：经典掷骰起飞、跳棋、撞机与叠机，支持 2–4 人在线联机、邀请好友进房、电脑玩家补位。不用下载、不用注册，浏览器打开就能和朋友们一起飞。', en: 'Play Flight Party (Aeroplane Chess) free online: roll the dice, launch your planes, jump, collide and stack. Invite 2–4 friends into one room, or fill empty seats with computer pilots. No install, no sign-up.'},
    keywords: {zh: '飞行棋,在线飞行棋,飞行棋联机,多人飞行棋,Aeroplane Chess,免费飞行棋,网页游戏', en: 'Aeroplane Chess,online Ludo,flight chess,multiplayer board game,free dice game,browser game'},
    lead: {zh: '掷骰起飞、跳格撞机，一局能坐 2–4 个人，掉线了还有电脑帮忙接着飞。', en: 'Roll, launch, jump and bump. Two to four seats, and a bot keeps your planes moving if you drop out.'},
    about: {zh: ['飞行棋是 JoyFlock 的主打多人桌游：四色飞机从基地起飞，掷到 6 才能出场，沿赛道前进、跳到同色格、把对手的飞机撞回机库。规则保留大家熟悉的经典玩法，界面、骰子与飞机则全部重做。', '房间支持 2–4 人，可以邀请好友、快速匹配陌生人，也可以用简单电脑补位。玩家临时离开会先等重连，超时后才交给电脑托管，回来点一下就能接回自己的席位。'], en: ['Flight Party is JoyFlock\'s flagship multiplayer board game: four colours of planes leave the hangar on a six, travel the track, hop on matching squares and send opponents back to base. The rules stay classic; the board, dice and planes are rebuilt from scratch.', 'Rooms take 2–4 players. Invite friends, quick-match strangers or fill seats with an easy computer pilot. If someone leaves, the seat waits for a reconnect before a bot takes over — one click hands it back.']},
    rules: {zh: ['掷出 6 点才能把一架飞机从基地送上起飞点，并且可以再掷一次。', '沿自己的赛道前进；停在同色格可跳到下一个同色格，落在有己方飞机的格子还能叠机。', '落在对手飞机所在格把它撞回基地。先把全部飞机送进终点者获胜。'], en: ['Roll a six to launch a plane from the hangar, and roll again.', 'Move along your own track; landing on your own colour hops to the next one, and sharing a square with your own plane stacks them.', 'Landing on an opponent sends their plane back to base. First to fly every plane home wins.']},
    faq: [
      {q: {zh: '朋友中途掉线会不会直接输掉？', en: 'Does a dropped player lose the match?'}, a: {zh: '不会。房间先等 30 秒重连，超时后由简单电脑按自己的节奏代走；玩家回来重新进入或动一下鼠标，就能立刻接回原席位。', en: 'No. The room waits 30 seconds, then an easy bot plays at its own pace. Reconnecting or simply moving the mouse hands the seat straight back.'}},
      {q: {zh: '最多几个人一起玩？', en: 'How many players can join?'}, a: {zh: '一间房支持 2–4 人，人数不够时可以用电脑玩家补位。', en: 'Rooms take 2–4 players; empty seats can be filled by computer pilots.'}},
      {q: {zh: '要注册才能联机吗？', en: 'Do I need an account to play online?'}, a: {zh: '不用。游客身份可以直接进房，登录只是为了保存 Joy Coins、战绩和已拥有的装扮。', en: 'No. Guests can join a room directly; an account only saves Joy Coins, stats and cosmetics.'}}
    ],
    features: {zh: ['2–4 人同房间联机', '掉线宽限与电脑托管', '邀请链接一键进房'], en: ['2–4 players in one room', 'Reconnect grace and bot custody', 'One-link room invites']},
    players: {min: 2, max: 4, label: {zh: '2–4 人', en: '2–4 players'}},
    modes: {zh: '好友联机 · 快速匹配 · 电脑补位', en: 'Friend rooms · Quick match · Bot seats'},
    genre: {zh: ['飞行棋', '多人桌游'], en: ['Aeroplane Chess', 'Multiplayer board game']}
  },
  {
    id: 'four', slug: 'connect-four', cover: '/assets/covers/four.jpg',
    name: {zh: '四子连珠', en: 'Connect Four'},
    altNames: {zh: ['四子棋', '连线四子', 'Connect 4'], en: ['Connect 4', 'Four in a Row', 'drop four']},
    title: {zh: '四子连珠在线玩 · 免费双人对战 | JoyFlock', en: 'Play Connect Four Online Free — 2-Player Strategy Game | JoyFlock'},
    description: {zh: '免费在线玩四子连珠：7 列棋盘轮流落子，横、竖或斜向先连成 4 颗获胜。支持电脑对战、好友联机与难度选择，浏览器打开即玩，无需下载或注册。', en: 'Play Connect Four free online: drop counters into a seven-column grid and be first to line up four horizontally, vertically or diagonally. Play the computer at four difficulty levels or invite a friend — right in the browser.'},
    keywords: {zh: '四子连珠,四子棋,Connect Four,在线四子棋,双人对战,免费策略游戏,无需下载', en: 'Connect Four,Connect 4,Four in a Row,free online strategy game,two player grid game,no download'},
    lead: {zh: '7 列棋盘，一次落子，先连成 4 颗就赢——一局只要两三分钟。', en: 'Seven columns, one drop per turn, four in a row wins — a match lasts a couple of minutes.'},
    about: {zh: ['四子连珠是规则最短、变化最多的经典连线游戏。棋子会自动落到所选列的最下方空位，因此每一步都要同时算自己的连线和对手的封堵。', 'JoyFlock 版本支持四档电脑难度，也支持创建房间邀请好友；棋盘、棋子和落子反馈都针对鼠标与触屏分别适配。'], en: ['Connect Four has the shortest rulebook and one of the deepest decision trees. Counters fall to the lowest free cell of the chosen column, so every move has to build your own line while blocking theirs.', 'JoyFlock adds four computer difficulty levels and private friend rooms, with board and drop feedback tuned for both mouse and touch.']},
    rules: {zh: ['双方轮流选一列落子，棋子落到该列最下方的空位。', '横、竖或斜向连成 4 颗同色棋子立即获胜。', '棋盘填满仍未连线则判平局。'], en: ['Take turns choosing a column; the counter falls to its lowest empty cell.', 'Four matching counters in a row, column or diagonal win immediately.', 'A full board with no line is a draw.']},
    faq: [
      {q: {zh: '四子连珠有必胜策略吗？', en: 'Is Connect Four solved?'}, a: {zh: '理论上有：先手在完美下法下可以必胜。但实战里一次漏防就会翻盘，所以选难度和朋友对局仍然很有意思。', en: 'In theory yes — with perfect play the first player wins. In practice one missed block flips the result, which is exactly what makes it fun.'}},
      {q: {zh: '电脑难度有几档？', en: 'How many difficulty levels are there?'}, a: {zh: '四档，默认简单；选择会按游戏分别记住，不会每次重置。', en: 'Four levels, easy by default. Your choice is remembered per game.'}},
      {q: {zh: '可以和朋友联机吗？', en: 'Can I play a friend online?'}, a: {zh: '可以，创建房间后把邀请链接发给对方即可开局。', en: 'Yes — create a room and send the invite link.'}}
    ],
    features: {zh: ['四档电脑难度', '好友房间联机', '鼠标与触屏都能落子'], en: ['Four computer difficulty levels', 'Private friend rooms', 'Mouse and touch support']},
    players: {min: 2, max: 2, label: {zh: '2 人', en: '2 players'}},
    modes: {zh: '电脑对战 · 好友联机', en: 'Computer · Friend room'},
    genre: {zh: ['连线棋', '策略'], en: ['Strategy', 'Abstract board game']}
  },
  {
    id: 'gomoku', slug: 'gomoku', cover: '/assets/covers/gomoku.jpg',
    name: {zh: '五子棋', en: 'Gomoku'},
    altNames: {zh: ['五子连珠', '无禁手五子棋', 'Five in a Row'], en: ['Five in a Row', 'Gobang', 'free-style gomoku']},
    title: {zh: '五子棋在线玩 · 免费双人对战 | JoyFlock', en: 'Play Gomoku Online Free — Five in a Row | JoyFlock'},
    description: {zh: '免费在线玩五子棋：黑白轮流落子，横、竖或斜向先连成 5 颗获胜。当前为无禁手自由规则，支持电脑对战、好友联机与棋盘缩放，打开浏览器即可开局。', en: 'Play free-style Gomoku online: black and white alternate, and five in a row horizontally, vertically or diagonally wins. No forbidden-move rules, computer opponents, friend rooms and a responsive board.'},
    keywords: {zh: '五子棋,在线五子棋,五子连珠,Gomoku,Five in a Row,双人对弈,免费网页游戏', en: 'Gomoku,Five in a Row,Gobang,free online board game,two player strategy,no download'},
    lead: {zh: '无禁手自由规则，黑白轮流落子，先连成五颗就赢。', en: 'Free-style rules: alternate black and white, first to five in a row wins.'},
    about: {zh: ['五子棋是最容易上手、也最难下好的棋类之一。JoyFlock 采用无禁手的自由规则，黑棋先行，横、竖、斜任意方向连成 5 颗及以上即获胜，新手不用先学禁手表也能直接开局。', '棋盘会随窗口缩放，鼠标与触屏都能落子；想练手就开电脑对战，想认真下一盘就创建房间邀请好友。'], en: ['Gomoku is the easiest board game to learn and one of the hardest to master. JoyFlock uses free-style rules with no forbidden moves: black starts, and five or more in any direction wins, so beginners can play immediately.', 'The board scales with the window and works with mouse or touch. Warm up against the computer, or open a private room for a serious match.']},
    rules: {zh: ['黑棋先行，双方轮流点击棋盘空位落子。', '横、竖或斜向连成 5 颗及以上同色棋子即获胜。', '采用无禁手自由规则，长连同样算胜；棋盘下满未分胜负则判和。'], en: ['Black moves first; click any empty intersection to place a stone.', 'Five or more in a row, column or diagonal wins.', 'Free-style rules: no forbidden moves and overlines count as a win; a full board is a draw.']},
    faq: [
      {q: {zh: '有禁手规则吗？', en: 'Are forbidden moves enforced?'}, a: {zh: '没有。当前是无禁手自由五子棋，黑棋也没有三三、四四或长连限制，长连算赢。', en: 'No. This is free-style Gomoku — no double-three, double-four or overline restrictions for black, and an overline wins.'}},
      {q: {zh: '能和好友联机下吗？', en: 'Can I play a friend online?'}, a: {zh: '可以。创建房间并分享邀请链接，双方进入同一张棋盘轮流落子。', en: 'Yes. Create a room, share the link and you both play on the same board.'}},
      {q: {zh: '手机上下棋方便吗？', en: 'Does it work on a phone?'}, a: {zh: '棋盘会按屏幕缩放，触屏点击即可落子。', en: 'The board scales to the screen and a tap places a stone.'}}
    ],
    features: {zh: ['无禁手自由规则', '自适应棋盘', '电脑与好友两种对手'], en: ['Free-style rules with no forbidden moves', 'Responsive board', 'Computer and friend opponents']},
    players: {min: 2, max: 2, label: {zh: '2 人', en: '2 players'}},
    modes: {zh: '电脑对战 · 好友联机', en: 'Computer · Friend room'},
    genre: {zh: ['棋类', '策略'], en: ['Abstract strategy', 'Board game']}
  },
  {
    id: 'chess', slug: 'chess', cover: '/assets/covers/chess.jpg',
    name: {zh: '国际象棋', en: 'Chess'},
    altNames: {zh: ['在线国际象棋', '西洋棋', 'Chess online'], en: ['online chess', 'western chess', 'chess vs computer']},
    title: {zh: '国际象棋在线玩 · 免费双人对弈 | JoyFlock', en: 'Play Chess Online Free — 2-Player & Computer | JoyFlock'},
    description: {zh: '免费在线下国际象棋：标准规则，白棋先行，支持王车易位、吃过路兵与兵升变，将死获胜。可与电脑对弈、创建房间邀请好友，浏览器打开即玩，无需下载注册。', en: 'Play standard chess free online: white moves first, with castling, en passant and promotion supported, and checkmate deciding the game. Face the computer or invite a friend — no install, no sign-up.'},
    keywords: {zh: '国际象棋,在线国际象棋,免费下棋,chess online,电脑对弈,双人对弈,王车易位', en: 'online chess,free chess,play chess vs computer,two player chess,castling,en passant,promotion'},
    lead: {zh: '标准规则完整实现：易位、吃过路兵、升变都有，点棋子再点目标格即可走棋。', en: 'Full standard rules — castling, en passant and promotion — with simple click-to-move controls.'},
    about: {zh: ['JoyFlock 国际象棋按标准规则实现，白棋先行，支持王车易位、吃过路兵、兵升变，以及将死、逼和、重复局面、50 回合与子力不足的判和。走棋只要先点自己的棋子，再点目标格。', '电脑对手为基础难度，适合练手和熟悉规则；想和人下就创建房间，把邀请链接发给对方。'], en: ['JoyFlock implements standard chess: white first, castling, en passant, promotion, plus checkmate, stalemate, threefold repetition, the fifty-move rule and insufficient material. Click a piece, then a target square.', 'The computer plays at a basic level — good for practising — or create a room and send the invite link for a human opponent.']},
    rules: {zh: ['白棋先行，点击自己的棋子再点击目标格完成走棋。', '支持王车易位、吃过路兵；兵到底线可选择升变为后、车、象或马。', '将死获胜；逼和、三次重复局面、50 回合规则与子力不足判和。'], en: ['White moves first; click one of your pieces, then the target square.', 'Castling and en passant are supported; a pawn reaching the last rank promotes to queen, rook, bishop or knight.', 'Checkmate wins; stalemate, threefold repetition, the fifty-move rule and insufficient material are draws.']},
    faq: [
      {q: {zh: '支持王车易位和吃过路兵吗？', en: 'Are castling and en passant supported?'}, a: {zh: '支持，规则按标准国际象棋实现；兵升变时可以在界面里选择升变后的棋子。', en: 'Yes, both follow standard rules, and you can choose the promotion piece in the UI.'}},
      {q: {zh: '电脑对手强吗？', en: 'How strong is the computer?'}, a: {zh: '是基础难度，主要用来熟悉规则和随手练一盘，不是引擎级对手。', en: 'It plays at a basic level for practice, not engine strength.'}},
      {q: {zh: '要装插件或注册吗？', en: 'Do I need a plugin or an account?'}, a: {zh: '都不需要，浏览器直接打开就能下；登录只是保存 Joy Coins 与战绩。', en: 'Neither. Open the page and play; an account only saves Joy Coins and stats.'}}
    ],
    features: {zh: ['标准规则含易位与升变', '完整判和条件', '点击式走棋'], en: ['Standard rules including castling and promotion', 'Full draw conditions', 'Click-to-move controls']},
    players: {min: 2, max: 2, label: {zh: '2 人', en: '2 players'}},
    modes: {zh: '电脑对弈 · 好友联机', en: 'Computer · Friend room'},
    genre: {zh: ['棋类', '策略'], en: ['Abstract strategy', 'Board game']}
  },
  {
    id: 'xo', slug: 'tic-tac-toe', cover: '/assets/covers/xo-3d-20261123.jpg',
    name: {zh: '井字棋', en: 'Tic-tac-toe'},
    altNames: {zh: ['井字游戏', '三连棋', '圈圈叉叉'], en: ['noughts and crosses', 'Xs and Os', 'three in a row']},
    title: {zh: '井字棋在线玩 · 免费双人对战 | JoyFlock', en: 'Play Tic-Tac-Toe Online Free — 2-Player | JoyFlock'},
    description: {zh: '免费在线玩井字棋：3×3 棋盘，双方轮流放 X 或 O，先连成一条线获胜。支持电脑对战与好友联机，规则一秒看懂，打开浏览器就能开局，无需下载。', en: 'Play Tic-Tac-Toe free online: take turns placing X and O on a 3×3 grid, first to three in a line wins. Challenge the computer or a friend right in your browser.'},
    keywords: {zh: '井字棋,在线井字棋,三连棋,圈圈叉叉,Tic-tac-toe,双人对战,免费小游戏', en: 'tic tac toe,online noughts and crosses,Xs and Os,free two player game,browser game'},
    lead: {zh: '3×3 棋盘，规则一秒看懂，适合等人时随手开一局。', en: 'A 3×3 grid and a one-second rulebook — perfect for a quick match while you wait.'},
    about: {zh: ['井字棋是最经典的入门棋类：九个格子、两种符号，横、竖或斜向先连成三个就赢。双方都不犯错时必然平局，因此它也是最适合教小朋友「轮流与预判」的游戏。', 'JoyFlock 版本既能和简单电脑对练，也能创建房间邀请好友，落子带动画和音效反馈。'], en: ['The classic starter game: nine squares, two symbols, three in a line wins. With perfect play it always draws, which makes it a great way to teach turn-taking and thinking one move ahead.', 'JoyFlock adds an easy computer opponent, private friend rooms and animated, audible moves.']},
    rules: {zh: ['双方轮流点击 3×3 棋盘的空位，分别放置 X 与 O。', '横、竖或斜向先连成三个同样符号者获胜。', '九格填满仍无人连线则判平局。'], en: ['Take turns tapping an empty cell of the 3×3 grid, placing X or O.', 'First to three matching symbols in a row, column or diagonal wins.', 'A full grid with no line is a draw.']},
    faq: [
      {q: {zh: '井字棋能赢电脑吗？', en: 'Can you beat the computer?'}, a: {zh: '简单电脑会优先堵线，但主动失误时不会每次都抓住，认真下仍然有机会。', en: 'The easy bot blocks obvious lines but does not punish every mistake, so a careful player can still win.'}},
      {q: {zh: '要注册才能玩吗？', en: 'Do I need an account?'}, a: {zh: '不用，游客打开页面直接开始。', en: 'No — open the page and play as a guest.'}},
      {q: {zh: '可以和朋友远程下吗？', en: 'Can I play a friend remotely?'}, a: {zh: '可以，创建房间后分享邀请链接即可。', en: 'Yes, create a room and share the invite link.'}}
    ],
    features: {zh: ['零学习成本', '电脑与好友两种对手', '落子动画与音效'], en: ['Zero learning curve', 'Computer and friend opponents', 'Animated moves with sound']},
    players: {min: 2, max: 2, label: {zh: '2 人', en: '2 players'}},
    modes: {zh: '电脑对战 · 好友联机', en: 'Computer · Friend room'},
    genre: {zh: ['棋类', '休闲'], en: ['Casual', 'Abstract board game']}
  },
  {
    id: 'cards', slug: 'cards', cover: '/assets/covers/cards.jpg',
    name: {zh: '欢乐纸牌', en: 'Cards'},
    altNames: {zh: ['颜色数字接龙', '在线纸牌', 'UNO 类接龙'], en: ['colour and number matching card game', 'online card game', 'UNO-like']},
    title: {zh: '欢乐纸牌在线玩 · 免费双人接龙 | JoyFlock', en: 'Play Cards Online Free — Colour & Number Matching | JoyFlock'},
    description: {zh: '免费在线玩欢乐纸牌：两人各 7 张牌，按颜色或数字接龙，先出完手牌获胜。没有功能牌、不下注，规则简单节奏快，支持电脑对战与好友联机，打开浏览器即玩。', en: 'A fast, free two-player card game: seven cards each, match the colour or the number, first to empty your hand wins. No action cards, no betting — play the computer or a friend in your browser.'},
    keywords: {zh: '欢乐纸牌,在线纸牌,接龙纸牌,双人纸牌游戏,免费卡牌游戏,颜色数字接龙', en: 'online card game,colour matching cards,two player card game,free browser cards,no download'},
    lead: {zh: '两人各 7 张，同色或同数字就能出，先出完手牌即胜。', en: 'Seven cards each; match a colour or a number and be first to empty your hand.'},
    about: {zh: ['欢乐纸牌把接龙类卡牌收敛到最纯粹的规则：只有颜色与数字，没有功能牌、没有叠加、没有下注。每回合要么出一张匹配的牌，要么摸一张并结束回合。', '牌库耗尽时会自动重洗弃牌，因此不会因为摸空卡住；一局通常两三分钟，适合连着打几盘。'], en: ['Cards strips the matching genre down to its essence: colours and numbers only, no action cards, no stacking, no betting. Each turn you either play a matching card or draw one and pass.', 'When the deck runs out the discard pile is reshuffled automatically, so a match never stalls. Most games finish in two or three minutes.']},
    rules: {zh: ['两人各发 7 张牌，桌面翻开一张作为起始牌。', '轮到你时打出与桌面牌同色或同数字的一张；没有可出的牌就摸一张并结束回合。', '先出完手牌者获胜；牌库耗尽时重洗弃牌继续。'], en: ['Each player is dealt seven cards and one card is flipped to start.', 'Play a card matching the top card\'s colour or number; otherwise draw one and end your turn.', 'First to empty their hand wins; the discard pile is reshuffled when the deck runs out.']},
    faq: [
      {q: {zh: '有功能牌或叠牌规则吗？', en: 'Are there action cards or stacking?'}, a: {zh: '没有。这版刻意只保留颜色与数字匹配，规则更短、单局更快。', en: 'No. This version deliberately keeps only colour and number matching for shorter, faster games.'}},
      {q: {zh: '牌摸完了怎么办？', en: 'What happens when the deck runs out?'}, a: {zh: '系统会自动重洗弃牌堆补充牌库，对局不会因此中断。', en: 'The discard pile is reshuffled automatically, so play continues.'}},
      {q: {zh: '能和朋友联机吗？', en: 'Can I play a friend online?'}, a: {zh: '可以，创建房间并分享邀请链接即可。', en: 'Yes — create a room and share the invite link.'}}
    ],
    features: {zh: ['规则只有颜色与数字', '牌库自动重洗', '两三分钟一局'], en: ['Colours and numbers only', 'Automatic deck reshuffle', 'Two-to-three minute matches']},
    players: {min: 2, max: 2, label: {zh: '2 人', en: '2 players'}},
    modes: {zh: '电脑对战 · 好友联机', en: 'Computer · Friend room'},
    genre: {zh: ['纸牌', '休闲'], en: ['Card game', 'Casual']}
  },
  {
    id: 'snooker', slug: 'snooker', cover: '/assets/covers/snooker.jpg',
    name: {zh: '斯诺克', en: 'Snooker'},
    altNames: {zh: ['在线斯诺克', '桌球', 'snooker online'], en: ['online snooker', 'English billiards', 'snooker table']},
    title: {zh: '斯诺克在线玩 · 免费双人对战 | JoyFlock', en: 'Play Snooker Online Free — 2-Player | JoyFlock'},
    description: {zh: '免费在线玩斯诺克：红球与彩球交替击打，最后按分值顺序清彩。支持电脑对战与好友联机，鼠标瞄准、拖拽蓄力、松手击球，浏览器打开即玩，无需下载。', en: 'Play snooker free online: pot reds and colours in turn, then clear the colours in value order. Aim with the mouse, drag for power and release. Computer or friend opponent, no download.'},
    keywords: {zh: '斯诺克,在线斯诺克,snooker,免费桌球游戏,双人斯诺克,网页台球', en: 'online snooker,free snooker game,two player billiards,browser snooker,no download'},
    lead: {zh: '红彩交替、按分值清彩，比八球更讲走位的一张长台。', en: 'Reds and colours in turn, then clear by value — a longer table that rewards position play.'},
    about: {zh: ['斯诺克用更长的球台、更小的袋口和 22 颗球，把击球精度与走位都放大了。JoyFlock 保留红球与彩球交替、最后按分值清彩的核心流程，并把力度、击球点与瞄准线做得直观。', '台呢、库边、球体与落袋分别渲染，碰撞和进球各有反馈；可以开电脑对战，也可以创建房间邀请好友。'], en: ['Snooker uses a longer table, tighter pockets and 22 balls, which magnifies both precision and position play. JoyFlock keeps the red-then-colour rhythm and the final clear in value order, with an intuitive power meter, contact point and aim line.', 'Cloth, cushions, balls and pockets render separately with their own impact sounds. Play the computer or invite a friend into a room.']},
    rules: {
      zh: ['轮到你时瞄准并向后拖动蓄力，松手击球。', '先打进红球，再选择一颗彩球；红球未清完前交替进行。', '红球清完后按分值从低到高依次清彩，总分高者获胜。'],
      en: ['Aim and drag backwards to charge, then release to shoot.', 'Pot a red, then nominate a colour; keep alternating while reds remain.', 'Once the reds are gone, clear the colours in ascending value order. Highest score wins.']
    },
    faq: [
      {q: {zh: '斯诺克和欢乐台球是一套规则吗？', en: 'Is snooker the same rules as the pool table?'}, a: {zh: '不是。斯诺克是长台、红彩交替并按分值清彩，欢乐台球是简化八球；两者的力量参数也分别调过。', en: 'No. Snooker uses a longer table, red/colour alternation and a value-order clear; Pool is simplified eight-ball. Their power models are tuned separately.'}},
      {q: {zh: '要注册才能玩吗？', en: 'Do I need an account?'}, a: {zh: '不用，游客打开即可开局；登录只是为了保存 Joy Coins 与战绩。', en: 'No — play as a guest; an account only saves Joy Coins and stats.'}},
      {q: {zh: '可以邀请好友吗？', en: 'Can I invite a friend?'}, a: {zh: '可以，创建房间后把邀请链接发给对方。', en: 'Yes — create a room and share the invite link.'}}
    ],
    features: {zh: ['红彩交替与按序清彩', '独立力度与击球点', '电脑与好友两种对手'], en: ['Red/colour alternation and value-order clear', 'Separate power and contact-point tuning', 'Computer and friend opponents']},
    players: {min: 2, max: 2, label: {zh: '2 人', en: '2 players'}},
    modes: {zh: '电脑对战 · 好友联机', en: 'Computer · Friend room'},
    genre: {zh: ['台球', '休闲竞技'], en: ['Billiards', 'Cue sport']}
  },
  {
    id: 'bubbles', slug: 'bubble-shooter', cover: '/assets/covers/bubbles.jpg',
    name: {zh: '泡泡射击', en: 'Bubble Shooter'},
    altNames: {zh: ['泡泡龙对战', '在线泡泡射击', 'bubble shooter'], en: ['bubble shooter duel', 'online bubble game', 'match-3 shooter']},
    title: {zh: '泡泡射击在线玩 · 免费双人泡泡对战 | JoyFlock', en: 'Play Bubble Shooter Online Free — 2-Player Duel | JoyFlock'},
    description: {zh: '免费在线玩泡泡射击对战：两人各占一块球阵，瞄准发射同色泡泡消除，掉落整串会攻击对手。对手球阵先触底线即获胜，支持电脑对战与好友联机，无需下载。', en: 'A two-player bubble shooter duel: each side owns a field, match three colours to pop, and dropping a whole cluster attacks your opponent. Push their field to the bottom line to win — free in the browser.'},
    keywords: {zh: '泡泡射击,泡泡龙,双人对战,在线消除游戏,bubble shooter,免费网页游戏', en: 'bubble shooter,online bubble duel,match three shooter,two player puzzle game,no download'},
    lead: {zh: '消除或打断整串都会压低对手球阵，先到底线的一方输。', en: 'Every pop or dropped cluster pushes the opponent down; first field to the bottom line loses.'},
    about: {zh: ['这不是单人闯关的泡泡龙，而是左右两块球阵的正面对抗。你打出的每一次消除都会变成压力送到对面，挂在关键连接点上的一发甚至能让整片球阵一起掉落。', 'JoyFlock 版本支持简单电脑对战和好友联机，瞄准线、落点预判与连锁掉落都有独立反馈。'], en: ['This is not a solo level climb — it is a head-to-head duel across two bubble fields. Every clear sends pressure to the other side, and one well-placed shot on a key connector can drop an entire cluster.', 'JoyFlock adds an easy computer opponent and friend rooms, with its own aim line, landing preview and cascade feedback.']},
    rules: {zh: ['移动鼠标瞄准，点击发射一颗泡泡。', '三个及以上同色泡泡相连即可消除；被打断连接的整串泡泡会一起掉落。', '消除和掉落都会向对手施压；对手球阵先触到底线即获胜，清空自己的球阵也会立即获胜。'], en: ['Move the mouse to aim and click to fire a bubble.', 'Three or more matching colours pop; any cluster detached from the ceiling falls as a group.', 'Pops and drops push the opponent\'s field down. First field to reach the bottom line loses; clearing your own field wins immediately.']},
    faq: [
      {q: {zh: '和单人泡泡龙有什么不同？', en: 'How is this different from solo bubble shooter?'}, a: {zh: '这是双人对战：你消除得越好，对手的球阵压得越快，胜负由两块球阵的底线决定。', en: 'It is head-to-head: your clears push the opponent\'s field down, and the bottom line decides the winner.'}},
      {q: {zh: '能一个人练吗？', en: 'Can I practise alone?'}, a: {zh: '可以，开电脑对战即可，难度为简单档。', en: 'Yes — start a computer match at the easy level.'}},
      {q: {zh: '支持手机触屏吗？', en: 'Does it work on touchscreens?'}, a: {zh: '支持，点按即可瞄准发射。', en: 'Yes — tap to aim and fire.'}}
    ],
    features: {zh: ['双人球阵对抗', '连锁掉落攻击', '电脑与好友两种对手'], en: ['Two-field head-to-head duel', 'Cascade drops as attacks', 'Computer and friend opponents']},
    players: {min: 2, max: 2, label: {zh: '2 人', en: '2 players'}},
    modes: {zh: '电脑对战 · 好友联机', en: 'Computer · Friend room'},
    genre: {zh: ['消除', '休闲竞技'], en: ['Puzzle', 'Arcade']}
  },
  {
    id: 'nineball', slug: 'nineball', cover: '/assets/covers/nineball.jpg',
    name: {zh: '欢乐九球', en: 'Nine-ball'},
    altNames: {zh: ['九球', '美式九球', '9球'], en: ['9-ball', 'nine ball', 'online nine-ball']},
    title: {zh: '欢乐九球在线玩 · 免费双人对战 | JoyFlock', en: 'Play Nine-ball Online Free — 2-Player 9-Ball Game | JoyFlock'},
    description: {zh: '在 JoyFlock 免费在线玩欢乐九球：不用下载，打开浏览器就能和好友打一局美式九球。每杆先碰台面最小号球，合法打进 9 号球立即获胜。鼠标瞄准、拖拽蓄力、松开击球，支持电脑对战、创建房间与邀请链接。', en: 'Play free online nine-ball on JoyFlock — no download, no sign-up. Every shot must hit the lowest ball first and a legal 9-ball ends the match. Aim with the mouse, drag to set power and release to shoot. Challenge the computer, create a private room or send an invite link.'},
    keywords: {zh: '欢乐九球,九球游戏,美式九球,9球,在线台球,双人台球,免费台球游戏', en: 'nine ball,9-ball game,online nine-ball,free billiards,two player pool,browser pool game,no download'},
    lead: {zh: '按号码顺序击球，一杆打进 9 号就赢的休闲九球。', en: 'A casual nine-ball table: hit the lowest ball first, then pot the 9 to win.'},
    about: {zh: ['欢乐九球沿用欢乐台球的球桌、球体、袋口与击球音效，只把规则换成九球：9 颗目标球菱形摆放，每杆白球必须先碰台面上号码最小的球，之后任何球落袋都算合法。', '合法打进 9 号球立即结束本局；犯规打进 9 号球则判负。不想等人的时候可以开电脑对战，也可以创建房间把邀请链接发给朋友。'], en: ['Nine-ball reuses the Pool table, ball sprites, pockets and impact sounds, with the rules swapped for nine-ball: nine object balls in a diamond rack, and the cue ball must contact the lowest numbered ball first.', 'A legal 9-ball wins the frame immediately, while a 9 on a foul loses. Play the computer when alone, or create a room and send the invite link to a friend.']},
    rules: {zh: ['9 颗目标球菱形摆放，1 号在顶点、9 号在中心；每杆必须先碰台面最小号球。', '落袋任意球且无犯规可继续出杆；未先碰最小号球或白球落袋均为犯规，对手获得额外一杆。', '合法打进 9 号球立即获胜；犯规打进 9 号球判负。最多 200 杆。'], en: ['Nine balls are racked in a diamond with the 1 at the apex and the 9 in the centre; every shot must first contact the lowest ball.', 'Potting any ball without a foul keeps the turn. Missing the lowest ball first or scratching is a foul and gives the opponent an extra shot.', 'Legally potting the 9-ball wins at once; a 9-ball on a foul loses. The frame is capped at 200 shots.']},
    faq: [
      {q: {zh: '欢乐九球和欢乐台球有什么区别？', en: 'How is Nine-ball different from Pool?'}, a: {zh: '欢乐台球是分组八球，要先清空本组再打 8 号；欢乐九球不分组，按号码顺序击球，合法打进 9 号球立即获胜。', en: 'Pool is grouped eight-ball: clear your group, then pot the 8. Nine-ball has no groups — hit the lowest ball first and pot the 9 to win.'}},
      {q: {zh: '九球需要指定袋口吗？', en: 'Do I have to call pockets?'}, a: {zh: '不需要。这是为快速对局简化的休闲九球，不指定袋口，也未实现推杆、三连犯规等赛事规则。', en: 'No. This is a simplified casual variant with no called pockets, push-out or three-consecutive-foul rules.'}},
      {q: {zh: '可以邀请朋友一起打吗？', en: 'Can I invite a friend?'}, a: {zh: '可以。点「创建房间」生成邀请链接，对方打开后进入同一张球桌，两人轮流击球。', en: 'Yes. Create a room, share the invite link and you both land on the same table, taking alternating shots.'}}
    ],
    features: {zh: ['鼠标瞄准与拖拽蓄力', '好友房间与邀请链接', '电脑对战随时开局'], en: ['Mouse aiming with drag-to-charge power', 'Private rooms and invite links', 'Instant computer opponent']},
    players: {min: 2, max: 2, label: {zh: '2 人', en: '2 players'}},
    modes: {zh: '电脑对战 · 好友联机 · 快速匹配', en: 'Computer · Friend room · Quick match'},
    genre: {zh: ['台球', '休闲竞技'], en: ['Billiards', 'Casual sport']}
  }
];
