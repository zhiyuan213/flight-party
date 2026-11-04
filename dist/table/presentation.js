export const CATALOG={
 four:{name:'四子连珠',en:'FOUR IN A ROW',description:'落下一颗棋子，让下一步成为你的好棋。和好友来一场轻松又过瘾的连珠对决。',instruction:'点击左侧任意一列落子。横、竖或斜向连成四颗就能获胜。'},
 gomoku:{name:'五子棋',en:'FIVE IN A ROW',description:'黑白之间，藏着你的下一步。邀好友落子，享受一盘纯粹的策略对决。',instruction:'点击棋盘空位落子。连成五颗及以上获胜，当前采用无禁手规则。'},
 puzzle:{name:'趣味拼图',en:'PIECE IT TOGETHER',description:'把零散的快乐，一块块拼完整。和朋友轮流交换图片，还原这一幅风景。',instruction:'先选一块图片，再选另一块交换。也可以拖动交换位置。'},
 chess:{name:'国际象棋',en:'YOUR NEXT BRILLIANT MOVE',description:'从第一步兵，到最后一次将军。与好友对弈，也可以挑战电脑练习棋艺。',instruction:'先选自己的棋子，再选目标格。白棋先行，支持王车易位、吃过路兵和升变。'},
 draw:{name:'你画我猜',en:'A LITTLE IMAGINATION',description:'画得像不像不重要，朋友猜到才好笑。轮流出笔，让脑洞成为你们的默契。',instruction:'画题的一方在画布上作画，另一方输入答案。共六题，猜对就进入下一题。'},
 cards:{name:'欢乐纸牌',en:'ONE MORE CARD',description:'同一个颜色，下一个数字。看准时机打出手牌，争取第一个轻松出完。',instruction:'选择与桌面牌同色或同数字的手牌。也可以摸一张并结束回合。'},
 pool:{name:'欢乐台球',en:'LINE IT UP. LET IT ROLL.',description:'瞄准，蓄力，漂亮地落袋。和朋友来一局休闲台球，享受碰撞与进球的快乐。',instruction:'点击球桌选择方向，再调整力度击球。先清空1–7号共享目标，再合法打进8号。'}
};
export function screenForRoom(room){return room?.phase==='CLOSED'?'home':room?.phase==='WAITING'?'waiting':room?'play':'home';}
export function coverFor(game){return '../assets/covers/'+game+'.jpg';}
export function playerCard(document,profile,index,active){
 const item=document.createElement('div');item.className='seat'+(active?' active':'');
 const avatar=document.createElement('span');avatar.className='avatar-shell';const image=document.createElement('img');image.className='seat-avatar';image.alt='';image.src=/^\/api\/avatars\//.test(profile.avatarUrl||'')?profile.avatarUrl:'/api/avatars/system/'+index;if(profile.name==='等待加入'){avatar.textContent='＋';item.classList.add('empty-seat');}else avatar.append(image);
 if(profile.member&&['gold','cloud','night'].includes(profile.frame)){const frame=document.createElement('img');frame.src='../assets/member/frame-'+profile.frame+'-v2.png';frame.alt='';frame.className='avatar-frame';avatar.append(frame);}
 const copy=document.createElement('div');copy.className='seat-copy';const line=document.createElement('div');line.className='seat-name';const name=document.createElement('strong');name.textContent=profile.name||'等待加入';line.append(name);
 if(profile.member){const badge=document.createElement('span');badge.className='member-label'+(profile.annualMember?' annual':'');badge.textContent=profile.annualMember?'YEAR VIP':'VIP';line.append(badge);item.classList.add('member');}
 const status=document.createElement('span');status.className='seat-status';status.textContent=profile.bot?'电脑玩家':active?'当前回合':'真人玩家';copy.append(line,status);item.append(avatar,copy);return item;
}
