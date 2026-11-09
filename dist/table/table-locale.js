const labels = new Map(Object.entries({
  '台球桌，移动鼠标瞄准，按住左键后拉蓄力，松开击球':'Pool table. Aim with the mouse, hold and pull back to set power, then release to shoot.',
  '排行榜周期':'Leaderboard period',
  '从第一步兵，到最后一次将军。与好友对弈，也可以挑战电脑练习棋艺。':'Play chess with a friend or practice against the computer.',
  '白棋先行。点击自己的棋子，再点击目标格。支持王车易位、吃过路兵及升变；将死获胜，逼和、重复局面、50回合及子力不足判和。电脑为基础难度。':'White moves first. Select a piece and then its destination. Castling, en passant and promotion are supported. Checkmate wins. Stalemate, repetition, the 50-move rule and insufficient material can draw. The computer is set to beginner difficulty.',
  '先选自己的棋子，再选目标格。白棋先行，支持王车易位、吃过路兵和升变。':'Choose a piece, then a destination. White moves first. Castling, en passant and promotion are supported.',
  '白':'W','黑':'B','欢乐台球':'Pool','国际象棋':'Chess','四子连珠':'Connect Four','五子棋':'Gomoku','趣味拼图':'Puzzles','欢乐纸牌':'Cards','你画我猜':'Draw & Guess',
  '声音':'Sound','静音':'Muted','中心击球':'Center','高杆':'Top spin','右上塞':'Top right','右塞':'Right spin','右下塞':'Bottom right','低杆':'Backspin','左下塞':'Bottom left','左塞':'Left spin','左上塞':'Top left',
  '回合':'Turn','房间聊天':'Room chat','和同房间的朋友聊两句吧。':'Say hello to the room.','单机 · 本机可见':'Local only','同房间可见':'Room only','消息仅发送给当前房间。':'Messages are visible to this room.','单机聊天仅在本机显示。':'Local chat stays on this device.','消息在本房间实时同步。':'Messages sync live in this room.','表情在本房间实时同步。':'Reactions sync live in this room.','发送消息…':'Write a message…','发送':'Send','聊天消息':'Chat message','场内聊天消息':'Room messages',
  '你':'You','电脑':'Computer','好友':'Friend','游客':'Guest','等待加入':'Waiting to join','当前回合':'Current turn','真人玩家':'Human player','电脑玩家':'Computer player','本局平局。':'Draw.','本局和棋。':'Draw.',
  '快速开始':'Quick play','创建房间':'Create room','单机 · 电脑对战':'Play computer','单机 · 双人同屏':'Local two-player','单机 · 双人协作':'Local co-op','单机 · 电脑协作':'Co-op with computer','在线对局':'Online game',
  '通过房间码加入好友':'Join with a room code','房间码或邀请链接':'Room code or invite link','粘贴好友的邀请链接':'Paste your invite link','加入房间':'Join room','2位玩家':'2 players','免费畅玩':'Free to play','无需下载':'No download',
  '玩家排行榜':'Leaderboard','月积分榜':'Monthly','周积分榜':'Weekly','日积分榜':'Daily','玩家':'Player','积分':'Points','局数':'Games','登录联机自动记录 · UTC时间 · 前10名':'Online results for signed-in players · UTC · Top 10','还没有成绩，来成为第一位上榜玩家。':'No results yet. Be the first on the leaderboard.',
  '怎么玩':'How to play','有你的风格，也有公平的对局。':'Your style, fair play.','沿用你的会员身份、头像和头像框。会员装饰不改变棋子规则、牌序、击球或积分优势。':'Use your membership badge, avatar and frame. Cosmetics do not affect gameplay or scoring.','了解会员权益 ↗':'Membership benefits ↗','会员':'Membership',
  '←← 游戏首页':'Game home','发送表情':'Send reaction','发送大笑':'Laugh','发送招手':'Wave','发送庆祝':'Celebrate','发送惊讶':'Surprised','发送爱心':'Love','发送点赞':'Thumbs up','静音中':'Muted','查看球桌':'View table','查看本局结算':'View result','本局结束':'Game over','关闭结算，查看球桌':'Close result and view table',
  '斯诺克':'Snooker','泡泡射击':'Bubble Shooter','准备开始':'Get ready','游戏模式':'Game modes','单人限时挑战':'Solo time challenge','电脑对战或双人同屏':'Play the computer or share a screen','1位玩家':'1 player','1位参与':'1 player','开始游戏':'Start game',
  '先打红球，再打彩球。用走位和连续得分赢下对局。':'Pot reds and colours in turn. Play for position and build your break.',
  '瞄准后向后拖动蓄力，松手击球。红球和彩球交替击打，最后按分值顺序清彩。':'Aim, pull back and release to shoot. Alternate reds and colours, then clear the colours in order of value.',
  '瞄准发射，限时消除同色泡泡。':'Aim and shoot to clear matching bubbles before time runs out.',
  '两人轮流发射，三个及以上同色泡泡相连即可消除；24 回合后得分高者获胜。可挑战电脑、双人同屏或联网对战。':'Take turns shooting. Match three or more bubbles to clear them; the higher score after 24 rounds wins. Play the computer, share a screen, or play online.',
  '轮到你时移动鼠标瞄准，点击发射。三个及以上同色泡泡相连即可消除，24 回合后比分高者获胜。':'On your turn, aim with the pointer and click to shoot. Clear three or more to score; the higher score after 24 rounds wins.',
  '两人轮流在同一块球阵上发射。三个或更多同色泡泡相连即可消除，悬空泡泡掉落另有加分；未消除累计 5 次，球阵下压一行。清空球阵额外 +2000 分；球阵触线或打满 24 回合即结算，比分高者获胜。':'Players take turns on one shared board. Clear three or more matching bubbles; detached bubbles score extra. Five misses push the board down a row. Clearing the board earns 2,000 bonus points. The duel ends on a danger-line hit or after 24 rounds, and the higher score wins.',
  '移动鼠标瞄准，点击发射。三个或更多同色泡泡相连即可消除。':'Aim with the pointer and click to shoot. Connect three or more bubbles of the same colour to clear them.',
  '井字棋':'Tic-tac-toe','选择 X 或 O 的落点，和好友或电脑轮流下棋。':'Take turns placing X or O against a friend or the computer.','横、竖或斜线连成三个同样的符号即可获胜。':'Get three matching marks in a row, column or diagonal to win.','开始！':'Play!','查看棋盘':'View board','犯规':'Foul','准备开球':'Get ready','开球！':'Play!','全色目标球':'Solids','花色目标球':'Stripes','首次有效进球后分组':'Groups assigned after the first legal pot','切换台球音效':'Toggle pool sound','选择白球击球点':'Choose cue ball spin','击球力度':'Shot power','棋盘':'Game board','← 游戏首页':'← Game home','退出对局':'Leave game','退出房间':'Leave room',
  '房间玩家':'Players','2位参与':'2 seats','兵升变为':'Promote to','皇后':'Queen','车':'Rook','象':'Bishop','马':'Knight','走棋记录':'Move history','翻转棋盘':'Flip board','初始局面':'Starting position','上一步':'Previous move','下一步':'Next move','最新局面':'Latest position','第一步走完后显示记录':'Moves will appear here.','将军':'Check',
  '准备开始':'Ready','邀请好友 · 复制链接':'Copy invite link','邀请好友':'Invite friend','再玩一局 ↗':'Play again ↗','你的 JoyFlock 账号':'Your JoyFlock account','登录':'Sign in','注册':'Register','登录 / 注册':'Sign in / Register','邮箱':'Email','密码':'Password','昵称（注册时填写）':'Nickname (registration)','确认密码（注册时填写）':'Confirm password (registration)',
  '等好友，一起开玩':'Waiting for friends','好友到齐，准备开玩':'Ready when friends join','正在寻找你的游戏伙伴':'Finding players','等待好友加入并准备':'Waiting for friends to join and ready up','联机服务暂不可用，仍可单机游玩。':'Online play is unavailable. Local play is still available.','排行榜暂时无法加载，请稍后重试。':'Leaderboard unavailable. Try again later.',
  '瞄准，蓄力，漂亮地落袋。和朋友来一局休闲台球，享受碰撞与进球的快乐。':'Aim, pull back and pocket the ball. Play a casual game of eight-ball with friends.',
  '登录账号的完整联机成绩自动记录，游客和单机不累计。第一名+3、第二名+2，平局各+2；各游戏独立计分。':'Completed online games count for signed-in players. First place earns 3 points, second earns 2, and both earn 2 in a draw. Each game has its own standings.',
  '选择主题':'Choose a theme','只改变外观，不改变规则。默认是无主题。':'Looks only — rules stay the same. Classic is the default.',
  '关闭':'Close','取消':'Cancel','应用主题':'Apply theme','切换主题':'Change theme',
  '无主题':'Classic','万圣节':'Halloween','圣诞节':'Christmas','春节':'Spring Festival','中秋节':'Mid-Autumn',
  '独立日':'Independence Day','感恩节':'Thanksgiving','情人节':"Valentine's Day",
  '圣帕特里克节':"St. Patrick's Day",'复活节':'Easter',
  '经典深色棋盘':'Original dark board','南瓜灯与幽灵之夜':'Jack-o-lanterns and friendly ghosts',
  '雪夜、圣诞老人与雪人':'Snowy night, Santa and a snowman','灯笼、烟火与福字金牌':'Lanterns, fireworks and gold coins',
  '满月、玉兔与月饼':'Full moon, jade rabbit and mooncakes','房间主题':'Room theme','更换':'Change',
  '烟花、星条旗与夏夜':'Fireworks, stars and stripes','秋叶、火鸡与丰收宴':'Autumn leaves, turkey and harvest',
  '爱心、玫瑰与粉红夜':'Hearts, roses and a pink sky','三叶草、彩虹与金罐':'Shamrocks, rainbows and a pot of gold',
  '彩蛋、春兔与花田':'Easter eggs, spring bunnies and blooms',
  '正在寻找对局':'Finding a match','预计等待':'Est. wait','正在匹配在线玩家':'Matching online players','取消匹配':'Cancel match','开始匹配':'Start matching','本局主题已锁定':'Theme locked for this game',
  '落下一颗棋子，让下一步成为你的好棋。和好友来一场轻松又过瘾的连珠对决。':'Drop a disc, set up your next move, and enjoy a relaxed Connect Four duel with a friend.',
  '点击左侧任意一列落子。横、竖或斜向连成四颗就能获胜。':'Click any column to drop a disc. Connect four horizontally, vertically or diagonally to win.',
  '轮流选择一列落子，棋子落到该列最下方的空位。横、竖或斜向连成4颗即获胜。':'Take turns choosing a column; the disc lands in the lowest empty slot. Connect four in any direction to win.',
  '双方轮流落子，黑棋先行。横、竖或斜向连成5颗及以上获胜；当前为无禁手的自由五子棋。':'Players alternate with black moving first. Get five or more in a row in any direction to win. Freestyle rules apply.',
  '黑白之间，藏着你的下一步。邀好友落子，享受一盘纯粹的策略对决。':'Black and white, one move at a time. Invite a friend for a pure strategy duel.',
  '点击棋盘空位落子。连成五颗及以上获胜，当前采用无禁手规则。':'Click an empty point to place a stone. Five or more in a row wins; freestyle rules apply.',
  '把零散的快乐，一块块拼完整。和朋友轮流交换图片，还原这一幅风景。':'Put the picture back together one swap at a time with a friend.',
  '先选一块图片，再选另一块交换。也可以拖动交换位置。':'Pick one tile, then another to swap them. You can also drag tiles into place.',
  '交换两块拼图，还原完整的飞行棋画面。点击两块图片交换位置，也可以拖动交换。联机时与好友轮流协作；完成后两人各+3分。':'Swap two tiles to rebuild the flight-party picture. Click two tiles or drag them. Online, take turns with a friend; both players earn 3 points when finished.',
  '画题的一方在画布上作画，另一方输入答案。共六题，猜对就进入下一题。':'One player draws the prompt while the other types a guess. Six rounds — a correct guess moves to the next.',
  '画得像不像不重要，朋友猜到才好笑。轮流出笔，让脑洞成为你们的默契。':'Drawing skill is optional — the fun is in the guesses. Take turns and find your rhythm.',
  '同一个颜色，下一个数字。看准时机打出手牌，争取第一个轻松出完。':'Match a colour or a number, play at the right moment, and be first to empty your hand.',
  '选择与桌面牌同色或同数字的手牌。也可以摸一张并结束回合。':'Play a card matching the discard pile by colour or number, or draw one card and end your turn.',
  '点击球桌选择方向，再调整力度击球。先清空1–7号共享目标，再合法打进8号。':'Click the table to choose a direction, then set your power. Clear the shared 1–7 balls before legally potting the 8-ball.',
  '单机表情仅在本机显示':'Reactions stay on this device','表情会发送给房间内的其他玩家':'Reactions are sent to everyone in the room',
  '10 套主题 · 向下滚动查看全部':'10 themes · scroll to see them all',
  '单机结果不上传。':'Local games are not uploaded.',
  '拼图完成，合作愉快！':'Puzzle complete — nicely done!',
  '对局已在另一个窗口恢复':'Game resumed in another window',
  '房间已关闭，请重新创建。':'Room closed. Please create a new one.',
  '房间已不可用，请重新匹配。':'Room no longer available. Please match again.',
  '房间已开始、已满，或同一账号已在房间中。':'The room has started, is full, or this account is already in a room.',
  '当前对局已由其他窗口接管，或席位不可用。':'This game was taken over in another window, or the seat is unavailable.',
  '已准备，等待好友。':'Ready! Waiting for your friend.',
  '连接中断，正在重新连接…':'Connection lost. Reconnecting…',
  '未能进入，请重试。':'Could not join. Please try again.',
  '已完成的联机结果由服务器保存；本游戏独立计分。':'Completed online results are saved on the server. Each game has its own standings.',
  '本游戏累计：':'Total for this game: ',
  '请输入完整的邮箱地址。':'Please enter a complete email address.',
  '两次输入的密码不一致。':'Passwords do not match.',
  '注册请填写昵称。':'Please enter a nickname to register.',
  '邮箱已被使用。':'This email is already in use.',
  '邮箱或密码不正确。':'Incorrect email or password.',
  '未成功，请检查邮箱和密码（至少8位）后重试。':'Could not sign in. Check your email and password (at least 8 characters) and try again.',
  '普通账号':'Standard account','退出登录':'Sign out',
  '红球与彩球交替击打，最后按分值顺序清彩，得分高者获胜。':'Pot reds and colours in turn, then clear the colours in order of value. Highest score wins.',
  '两人轮流击球，红球与彩球交替，最后按分值顺序清彩。可挑战电脑、双人同屏或联网对战。':'Two players take turns. Alternate reds and colours, then clear the colours in order of value. Play the computer, share a screen, or play online.',
  '轮到你时瞄准并向后拖动蓄力，松手击球。红球和彩球交替击打，最后按分值顺序清彩。':'On your turn, aim and pull back to set power, then release. Alternate reds and colours, then clear the colours in order of value.',
  '两人轮流击球：先打红球，再打彩球，红球清空后按分值顺序清彩；得分高者获胜。可挑战电脑、双人同屏或联网对战。':'Players alternate shots: pot a red, then a colour. Once the reds are gone, clear the colours in order. Highest score wins. Play the computer, share a screen, or play online.',
  '瞄准发射，三个及以上同色泡泡相连即可消除，限时内尽量多得分。':'Aim and shoot; three or more matching bubbles clear. Score as much as you can before time runs out.',
  '3×3 棋盘，双方轮流放 X 或 O，先连成一条线获胜。':'A 3×3 grid. Take turns placing X or O; three in a row wins.',
  '7 列棋盘，轮流选一列落子，棋子堆到该列最下方。先横、竖或斜连成 4 颗获胜。':'Seven columns. A counter stacks in the lowest free slot. Connect four horizontally, vertically or diagonally to win.',
  '黑白轮流落子，先连成 5 颗获胜。当前为无禁手规则。':'Black and white alternate; five in a row wins. No forbidden-move rules are applied.',
  '交换两块图片还原画面，可与好友轮流协作，也支持拖动交换。':'Swap two tiles to restore the picture, take turns with a friend, or drag tiles to swap.',
  '标准国际象棋，白棋先行。支持王车易位、吃过路兵与升变，将死获胜。':'Standard chess. White moves first. Castling, en passant and promotion are supported; checkmate wins.',
  '两人轮流画画与猜词，共 6 题，按猜对次数计分。':'Two players take turns drawing and guessing across six rounds. Correct guesses score points.',
  '两人各 7 张牌，按颜色或数字接龙，先出完手牌获胜。':'Each player gets seven cards. Match a colour or number; first to empty their hand wins.',
  '休闲八球：瞄准、蓄力、击球。先清空本组球，再合法打进 8 号获胜。':'Casual eight-ball: aim, set power and shoot. Clear your group, then legally pocket the 8-ball.',
  '浏览器直接玩':'Play in your browser','无需安装':'No install',
  '会员与计分':'Membership & scoring',
  '会员装饰只改变头像、头像框和外观，不改变棋子规则、牌序、击球或积分。联机成绩按各游戏独立记录。':'Cosmetics change avatars and frames only. They do not affect rules or scoring. Online results are tracked per game.',
  '会员说明 ↗':'Membership details ↗',
  '暂无成绩。':'No results yet.',
  '登录后可查看本游戏的累计积分。':'Sign in to see your points for this game.',
  '已完成的联机结果由服务器保存；本游戏独立计分。':'Completed online results are saved by the server. Each game has its own standings.',
  '游客对局不累计积分。':'Guest games do not earn points.',
  '返回游戏页':'Back to game','返回首页':'Back to home','关闭结算':'Close result',
  '获胜':'Win','失利':'Loss','平局':'Draw','再玩一局':'Play again',
  '你获胜了！':'You win!','本局失利':'You lose.','本局平局':'Draw.',
  '势均力敌，再来一局。':'Even game. Play again.','这一局，胜利属于你。':'You win this one.',
  '精彩对局，感谢两位玩家。':'Great game, both players.'
}));
function english(value) {
  const key=value.trim();
  const exact=labels.get(key);
  if(exact)return value.replace(key,exact);
  if(key.startsWith('房间 ')&&/^房间 [0-9a-f-]{36}$/i.test(key))return 'Room '+key.slice(3);
  if(key.startsWith('休闲台球：'))return 'Aim with the mouse. Hold the left button and pull back, then release to shoot. Choose spin on the cue ball control. The first legal pot assigns solids or stripes. Fouls give the other player an extra shot. Clear your group before legally pocketing the 8-ball.';
  if(key.endsWith(' · 本杆为额外罚杆'))return (labels.get(key.split(' · ')[0])||key.split(' · ')[0])+' · Extra shot';
  const target=key.match(/^(\d+)号目标球$/);
  if(target)return 'Target ball '+target[1];
  const turn=key.match(/^(.+?) 的回合( · 超时电脑代走)?$/);
  if(turn)return (labels.get(turn[1])||turn[1])+'’s turn'+(turn[2]?' · Computer plays on timeout':'');
  if(key.endsWith(' 游戏插画'))return (labels.get(key.slice(0,-5))||key.slice(0,-5))+' cover art';
  if(key.endsWith(' 获胜！')){
    const name=labels.get(key.slice(0,-4))||key.slice(0,-4);
    return name==='You'?'You win!':name+' wins!';
  }
  return value;
}

// Translate interface nodes only. Keep account names and chat messages as entered.
export function tableLabel(text){return document.documentElement.lang==='en'?english(text):text;}

export function bindTableLocale(){
  const originals=new WeakMap();
  let locale=document.documentElement.getAttribute('data-locale')==='en'?'en':'zh';
  const apply=()=>{
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    for(let node; (node=walker.nextNode());){
      const systemEnglish=node.parentElement.dataset.systemEnglish;
      if(systemEnglish===undefined&&node.parentElement.closest('script,style,.pool-chat-message,textarea,[contenteditable]'))continue;
      const before=node.data, saved=originals.get(node);
      const original=saved?.last===before?saved.original:before;
      const next=locale==='en'?(systemEnglish??english(original)):original;
      if(next!==original||saved)originals.set(node,{original,last:next});
      if(next!==before)node.data=next;
    }
    for(const el of document.querySelectorAll('[placeholder],[aria-label],[alt]')){
      const saved=el._tableLocaleAttributes??={};
      for(const attr of ['placeholder','aria-label','alt']){
        const before=el.getAttribute(attr);
        if(before===null)continue;
        const entry=saved[attr];
        const original=entry?.last===before?entry.original:before;
        const next=locale==='en'?english(original):original;
        saved[attr]={original,last:next};
        if(next!==before)el.setAttribute(attr,next);
      }
    }
  };
  const observer=new MutationObserver(apply);
  // Resolve the language during module evaluation, not on the first parent
  // message, so dynamically rendered intro copy starts in the right language.
  document.documentElement.lang=locale==='en'?'en':'zh-CN';
  apply();
  observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  document.documentElement.removeAttribute('data-translating');
  return value=>{
    locale=value;
    document.documentElement.lang=locale==='en'?'en':'zh-CN';
    apply();
  };
}
