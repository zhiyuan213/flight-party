// Static interface text only. Player names and server-provided data are never translated.
export const STATIC_COPY=[
 ['.brand small','PLAY A LITTLE. LAUGH A LOT.','轻松玩一局，快乐多一点。'],
 ['.hero-copy > .eyebrow','YOUR NEXT GAME NIGHT, CLEARED FOR TAKEOFF','好友已就位，欢乐即将起飞'],
 ['.hero-copy > h1','Little planes.<br>Big <em>feelings.</em>','小小飞机，<br>大大<em>欢乐。</em>','html'],
 ['.hero-copy > p:not(.legal-links)','Roll. Fly. Bump your friends back home.<br>A playful board game for your favorite people.','掷骰、起飞，把好友撞回基地。<br>和喜欢的人，一起玩欢乐飞行棋。','html'],
 ['.hero-notes span:nth-child(1)','◉ 2–4 players','◉ 2–4 人游玩'],
 ['.hero-notes span:nth-child(2)','◷ Quick rounds','◷ 轻松快节奏'],
 ['.hero-notes span:nth-child(3)','✓ No sign-up','✓ 无需注册'],
 ['.legal-links a[href="/membership.html"]','Membership & support','会员与帮助'],
 ['.legal-links a[href="/terms.html"]','Terms','服务条款'],
 ['.legal-links a[href="/privacy.html"]','Privacy','隐私政策'],
 ['.crew-head h2','Players','玩家'],
 ['#loading','Preparing the runway…','正在准备跑道…'],
 ['#demo-status','VISUAL PREVIEW · Original match resumes afterward','效果演示 · 结束后恢复原对局'],
 ['.board-bottom > span','✦ SAFE TILES PROTECT YOUR PLANES','✦ 安全格可以保护你的飞机'],
 ['#record-demo','⏺ Record preview','⏺ 录制演示'],
 ['#results > .eyebrow','THAT WAS A GOOD FLIGHT','精彩飞行，圆满落幕'],
 ['#results > p','Same crew. One more flight?','再来一局，继续欢乐？'],
 ['#settings-dialog .eyebrow','MAKE YOURSELF COMFORTABLE','按你的喜好设置'],
 ['#settings-dialog h2','Flight settings','游戏设置'],
 ['#settings-dialog label:nth-of-type(1)','Sound effects','游戏音效','label'],
 ['#settings-dialog label:nth-of-type(2)','Volume','音量','label'],
 ['#settings-dialog label:nth-of-type(3)','Visual mode','画面模式','label'],
 ['#settings-dialog label:nth-of-type(4)','Background music','背景音乐','label'],
 ['#settings-dialog label:nth-of-type(5)','Reduced motion','减少动态效果','label'],
 ['#visual-mode option[value="illustrated"]','Illustrated · v0.6.2','插画模式'],
 ['#visual-mode option[value="three"]','Realtime 3D · experimental','实时3D · 实验模式'],
 ['#settings-dialog p:nth-of-type(1)','Visual mode changes apply after reloading the page.','更改画面模式后，刷新页面生效。'],
 ['#settings-dialog p:nth-of-type(2)','Sound starts after your first click. Settings stay on this device.','点击页面后启用声音；设置保存在当前设备。'],
 ['#settings-dialog .primary','All set','完成'],
 ['#confirm-dialog h2','Leave this flight?','退出本局？'],
 ['#confirm-dialog p','The current match will end on this device.','退出后将离开当前对局界面。'],
 ['#confirm-stay','Keep flying','继续游戏'],['#confirm-leave','Leave','退出'],
 ['#lobby .eyebrow','YOUR CREW, YOUR RULES','选择阵容，准备起飞'],
 ['#lobby h1','Practice flight.','本地练习'],
 ['#lobby .section-title p','Play on this device. Choose your seats and take off.','在当前设备游玩，选好席位即可起飞。'],
 ['#lobby .pill','Local practice','本地练习'],
 ['#classic-mode b','Classic flight','经典模式'],
 ['#classic-mode span','Just dice, a little luck & friendly bumps.','掷骰、运气，还有欢乐碰撞。'],
 ['#party-mode b','Party flight <i>EXPERIMENTAL</i>','派对模式 <i>实验玩法</i>','html'],
 ['#party-mode span','Vote for a little twist between rounds.','每轮投票，为对局增加变化。'],
 ['#lobby .boarding p','No downloads. Two planes per player.','无需下载，每人两架飞机。']
];
export function translateStaticUI(language,root=document){
 for(const [selector,en,zh,kind] of STATIC_COPY){
  const node=root.querySelector(selector);if(!node)continue;const value=language==='zh'?zh:en;
  if(kind==='label'){if(node.firstChild?.nodeType===3)node.firstChild.textContent=value+' ';}
  else if(kind==='html')node.innerHTML=value;else node.textContent=value;
 }
 const attrs=[['#settings-dialog .close','aria-label','Close','关闭'],['#leaderboard-shell','aria-label','Pilot leaderboard','飞行员排行榜'],['#settings','aria-label','Settings','设置'],['#sound','aria-label','Toggle sound','开关音效'],['#camera-reset','title','Reset camera','重置视角'],['#language','title','Switch language','切换语言']];
 for(const [selector,attr,en,zh] of attrs)root.querySelector(selector)?.setAttribute(attr,language==='zh'?zh:en);
}
STATIC_COPY.push(
 ['#vote-dialog > .eyebrow','A LITTLE CHANGE IN THE WEATHER','给本轮增加一点变化'],
 ['#vote-dialog h2','Pick the next round.','选择下一轮效果'],
 ['[data-vote="tailwind"] b','Tailwind','顺风'],
 ['[data-vote="tailwind"] small','Every move gets +1 step.','本轮每次移动增加1格。'],
 ['[data-vote="peace"] b','Peaceful skies','和平天空'],
 ['[data-vote="peace"] small','No bumps this round.','本轮公共航道不发生撞机。'],
 ['#vote-dialog > .muted','One vote per active seat. Bots vote automatically. Ties are random.','每名参与者一票，电脑自动投票；平票随机选择。']
);

