export const CATALOG={
  snooker:{name:'斯诺克',en:'Snooker',description:'两人轮流击球，红球与彩球交替，最后按分值顺序清彩。可挑战电脑或联网对战。',instruction:'轮到你时瞄准并向后拖动蓄力，松手击球。红球和彩球交替击打，最后按分值顺序清彩。'},
  bubbles:{name:'泡泡射击',en:'Bubble Shooter',description:'两人轮流发射，三个及以上同色泡泡相连即可消除；24 回合后得分高者获胜。可挑战电脑或联网对战。',instruction:'轮到你时移动鼠标瞄准，点击发射。三个及以上同色泡泡相连即可消除，24 回合后比分高者获胜。'},
 xo:{name:'井字棋',en:'Tic-tac-toe',description:'3×3 棋盘，双方轮流放 X 或 O，先连成一条线获胜。',instruction:'横、竖或斜线连成三个同样的符号即可获胜。'},
 four:{name:'四子连珠',en:'Connect Four',description:'7 列棋盘，轮流选一列落子，棋子堆到该列最下方。先横、竖或斜连成 4 颗获胜。',instruction:'点击左侧任意一列落子。横、竖或斜向连成四颗就能获胜。'},
 gomoku:{name:'五子棋',en:'Gomoku',description:'黑白轮流落子，先连成 5 颗获胜。当前为无禁手规则。',instruction:'点击棋盘空位落子。连成五颗及以上获胜，当前采用无禁手规则。'},
 puzzle:{name:'趣味拼图',en:'Puzzles',description:'交换两块图片还原画面，可与好友轮流协作，也支持拖动交换。',instruction:'先选一块图片，再选另一块交换。也可以拖动交换位置。'},
 chess:{name:'国际象棋',en:'Chess',description:'标准国际象棋，白棋先行。支持王车易位、吃过路兵与升变，将死获胜。',instruction:'先选自己的棋子，再选目标格。白棋先行，支持王车易位、吃过路兵和升变。'},
 draw:{name:'你画我猜',en:'Draw & Guess',description:'两人轮流画画与猜词，共 6 题，按猜对次数计分。',instruction:'画题的一方在画布上作画，另一方输入答案。共六题，猜对就进入下一题。'},
 cards:{name:'欢乐纸牌',en:'Cards',description:'两人各 7 张牌，按颜色或数字接龙，先出完手牌获胜。',instruction:'选择与桌面牌同色或同数字的手牌。也可以摸一张并结束回合。'},
 pool:{name:'欢乐台球',en:'Pool',description:'休闲八球：瞄准、蓄力、击球。先清空本组球，再合法打进 8 号获胜。',instruction:'点击球桌选择方向，再调整力度击球。先清空1–7号共享目标，再合法打进8号。'}
};
export function screenForRoom(room){return room?.phase==='CLOSED'?'home':room?.phase==='WAITING'?'waiting':room?'play':'home';}
export function coverFor(game){return '../assets/covers/'+game+(['xo'].includes(game)?'.svg':'.jpg');}
export function playerCard(document,profile,index,active){
 const item=document.createElement('div');item.className='seat'+(active?' active':'');
 const avatar=document.createElement('span');avatar.className='avatar-shell';const image=document.createElement('img');image.className='seat-avatar';image.alt='';image.src=/^\/api\/avatars\//.test(profile.avatarUrl||'')?profile.avatarUrl:'/api/avatars/system/'+index;if(profile.name==='等待加入'){avatar.textContent='＋';item.classList.add('empty-seat');}else avatar.append(image);
 if(profile.member&&['gold','cloud','night'].includes(profile.frame)){const frame=document.createElement('img');frame.src='../assets/member/frame-'+profile.frame+'-v2.png';frame.alt='';frame.className='avatar-frame';avatar.append(frame);}
 const copy=document.createElement('div');copy.className='seat-copy';const line=document.createElement('div');line.className='seat-name';const name=document.createElement('strong');name.textContent=profile.name||'等待加入';line.append(name);
 if(profile.member){const annual=profile.member&&profile.annualMember===true;
  const badge=document.createElement('span');badge.className='member-label'+(annual?' annual':'');
  badge.setAttribute('role','img');badge.setAttribute('aria-label',annual?'Annual VIP':'VIP');line.append(badge);item.classList.add('member');}
 const status=document.createElement('span');status.className='seat-status';status.textContent=profile.bot?'电脑玩家':active?'当前回合':'真人玩家';copy.append(line,status);item.append(avatar,copy);return item;
}
