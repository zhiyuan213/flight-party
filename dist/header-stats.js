/* Shared header overview. Read-only: never grants membership or credits scores. */
(()=>{
 const header=document.querySelector('.native-topbar,.topbar');if(!header)return;
 const game=new URLSearchParams(location.search).get('game')||'pool';
 const valid=['pool','flight','four','gomoku','chess','xo','cards','snooker','bubbles','nineball'];
 const selected=valid.includes(game)?game:'pool';
 const zh=()=>document.documentElement.lang!=='en';
 const strip=document.createElement('section');strip.className='header-stats';strip.setAttribute('aria-label','游戏数据');
 const paths={games:'M7 4h13v15H7zM4 7v14h13M10 8h7m-7 4h7',rate:'M8 3h8v6a4 4 0 0 1-8 0V3ZM8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 2v5m-4 2h8'};
 const vip=document.createElement('a');vip.className='hs-vip';vip.href='/membership.html';
 vip.addEventListener('click',event=>{
  const account=header.querySelector('#chrome-account');
  if(!account||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();account.click();
 });
 vip.innerHTML='<img src="/assets/member/vip-laurel-v3.png" alt=""><span>VIP</span>';
 strip.append(vip);
 const wallet=document.createElement('div');wallet.className='hs-wallet';
 wallet.innerHTML='<span class="jp-pill hs-wallet-placeholder" aria-hidden="true"><img class="jp-mark" src="/assets/points/star-point.svg" alt=""><span class="jp-amount">0</span></span>';
 strip.append(wallet);
 const gameStats=document.createElement('div');gameStats.className='hs-game-stats';gameStats.setAttribute('role','group');
 const gameIcon=document.createElement('img');gameIcon.className='hs-game-icon';gameIcon.src='/assets/score-icons/'+selected+'.svg?v=2';gameIcon.alt='';
 strip.append(gameStats);
 const fields={};
 for(const key of ['score','games','rate']){
  const item=document.createElement('div');item.className='hs-stat hs-'+key;
  item.innerHTML=(key==='score'?'':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+paths[key]+'"/></svg>')+'<span class="hs-copy"><small></small><b>0</b></span>';
  if(key==='score')item.prepend(gameIcon);
  gameStats.append(item);fields[key]=item;
 }
 const actions=header.querySelector('.top-actions');header.insertBefore(strip,actions);header.classList.add('has-header-stats');
 let identity=null,stats=null,failed=false,requestId=0;
 function moveWallet(){const pill=document.getElementById('jp-pill');if(pill&&pill.parentElement!==wallet)wallet.replaceChildren(pill);}
 function paint(){
  const gameName=document.querySelector('#rail-items [aria-current="page"]')?.textContent.trim()||document.querySelector('#hero-title')?.innerText.trim()||(selected==='pool'?(zh()?'欢乐台球':'Pool'):selected);
  gameStats.setAttribute('aria-label',zh()?gameName+'数据':gameName+' statistics');
  gameIcon.title=gameStats.getAttribute('aria-label');
  strip.setAttribute('aria-label',zh()?'当前游戏数据':'Current game statistics');
  const annual=identity?.appearance?.annualMember===true,member=annual||identity?.appearance?.member===true;
  vip.classList.toggle('is-inactive',!member);vip.querySelector('img').src='/assets/member/'+(annual?'annual-vip-laurel-v3.png':'vip-laurel-v3.png');
  vip.querySelector('span').textContent=member?(annual?(zh()?'年度会员':'Annual VIP'):'VIP'):(zh()?'未开通':'Inactive');
  vip.title=zh()?'查看会员状态与套餐':'Membership status and plans';
  const labels=zh()?['积分','局数','胜率']:['Score','Games','Win rate'];
  const shown=stats;
  const values=[shown?.points??(failed?'—':0),shown?.completedGames??(failed?'—':0),Number.isFinite(shown?.wins)&&shown.completedGames>0?Math.round(100*shown.wins/shown.completedGames)+'%':failed||shown?.completedGames>0?'—':'0%'];
  ['score','games','rate'].forEach((key,i)=>{fields[key].querySelector('small').textContent=labels[i];fields[key].querySelector('b').textContent=values[i];fields[key].setAttribute('aria-label',labels[i]+' '+values[i]);fields[key].title=(zh()?'当前游戏：':'Current game: ')+selected+' · '+labels[i]+(failed?(zh()?' · 暂时无法加载':' · Unavailable'):key==='rate'&&shown?.completedGames>0&&!Number.isFinite(shown.wins)?(zh()?' · 服务端暂未提供胜场':' · Server wins unavailable'):'');});
  strip.dataset.game=selected;moveWallet();
 }
 async function refresh(){
  const token=++requestId;failed=false;
  try{
   const response=await fetch('/api/me',{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw Error();const me=await response.json();if(token!==requestId)return;if(identity?.account?.id!==me.account?.id)stats=null;identity=me;
   if(!me.account){stats={points:0,completedGames:0,wins:0};paint();return;}
   if(selected==='flight'){stats=me.statistics||null;}
   else{const r=await fetch('/api/table/stats/'+selected,{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw Error();const value=await r.json();if(token!==requestId)return;stats=value; if(Number.isFinite(value.wins))stats={...value,points:20*(value.completedGames+value.wins)};}
  }catch{if(token!==requestId)return;failed=true;}
  paint();
 }
 new MutationObserver(moveWallet).observe(header,{childList:true,subtree:true});
 new MutationObserver(paint).observe(document.documentElement,{attributes:true,attributeFilter:['lang','data-locale']});
 window.addEventListener('joyflock:account-changed',refresh);
 window.addEventListener('joyflock:game-points',refresh);
 window.addEventListener('pageshow',refresh);
 window.addEventListener('message',e=>{const frame=document.getElementById('game-frame');if(e.source===frame?.contentWindow&&['https://flight.joyflock.com',location.origin].includes(e.origin)&&e.data?.type==='joyflock:game-points')refresh();});
 paint();refresh();
})();
