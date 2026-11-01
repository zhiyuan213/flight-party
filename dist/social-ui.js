import {avatarStyle} from './avatar.js';
// v0.7.2 presentation prototype. No network, account storage, password storage, or real quotas.
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MODES=['guest','free'];
export class SocialUI{
 constructor({getLanguage=()=> 'en',onChange=()=>{}}={}){
  this.getLanguage=getLanguage;this.onChange=onChange;this.mode='guest';this.displayName='You';this.boardTab='month';this.authTab='login';this._takeoverPreview=false;this.initialized=false;this.result=null;this.showResultPreview=false;this.authNotice='';this.roomTab='quick';this.roomState='waiting';this.roomNotice='';this.roomDeadline=0;this.roomTimer=null;this.friendSample=false;this.friendReady=false;this.youReady=false;this.fullSample=false;
 }
 t(en,zh){return this.getLanguage()==='zh'?zh:en;}
 get profile(){return this.viewer;}
 get viewer(){const isGuest=this.mode==='guest',isMember=this.mode==='member';return Object.freeze({mode:this.mode,name:this.displayName,displayName:this.displayName,isGuest,isMember,authenticated:!isGuest,preview:true,points:isGuest?null:246,games:isGuest?null:240,dailyLimit:null,dailyRemaining:null});}
 get takeoverPreview(){return this._takeoverPreview;}
 init(){
  if(this.initialized)return this;this.initialized=true;
  this.accountButton=document.getElementById('account-open');this.dialog=document.getElementById('account-dialog');this.leaderboard=document.getElementById('leaderboard-shell');this.roomDialog=document.getElementById('room-preview-dialog');
  this.accountButton.addEventListener('click',()=>this.open());
  this.leaderboard.addEventListener('click',e=>{const tab=e.target.closest('[data-leaderboard-tab]');if(tab){this.boardTab=tab.dataset.leaderboardTab;this.renderLeaderboard();}});
  this.dialog.addEventListener('click',e=>{
   if(e.target.closest('[data-account-close]'))this.dialog.close();
   const auth=e.target.closest('[data-auth-tab]');if(auth){this.authTab=auth.dataset.authTab;this.authNotice='';this.renderDialog();}
   const mode=e.target.closest('[data-preview-mode]');if(mode)this.setMode(mode.dataset.previewMode);
   if(e.target.closest('[data-preview-signout]'))this.setMode('guest');
   const provider=e.target.closest('[data-oauth-preview]');if(provider){this.authNotice=this.t(`${provider.dataset.oauthPreview} sign-in entry preview. The integration is not connected.`,`${provider.dataset.oauthPreview} 登录入口预览，尚未接入。`);this.renderDialog();}
   if(e.target.closest('[data-preview-result]')){this.showResultPreview=!this.showResultPreview;this.renderDialog();}
  });
  this.dialog.addEventListener('change',e=>{if(e.target.id==='takeover-preview'){this._takeoverPreview=e.target.checked;this.onChange(this.viewer);}});
  this.dialog.addEventListener('input',e=>{if(e.target.id==='preview-password'||e.target.id==='preview-password-confirm')this.dialog.querySelector('#preview-password-confirm')?.setCustomValidity('');});
  this.dialog.addEventListener('submit',e=>{
   e.preventDefault();const password=this.dialog.querySelector('#preview-password'),confirm=this.dialog.querySelector('#preview-password-confirm');
   if(confirm&&(password.value||confirm.value)&&password.value!==confirm.value){confirm.setCustomValidity(this.t('Passwords must match.','两次密码需要一致。'));confirm.reportValidity();return;}
   const name=this.dialog.querySelector('#preview-name')?.value.trim().slice(0,18);if(name)this.displayName=name;
   this.clearFields();this.authNotice=this.t('Signed-in layout preview. No account was created and no score was uploaded.','已展示登录态界面；没有创建真实账号，也没有上传成绩。');this.setMode('free');
  });
  this.dialog.addEventListener('close',()=>this.clearFields());
  for(const [id,tab] of [['invite-preview','invite'],['join-preview','join'],['quick-match-preview','quick']])document.getElementById(id)?.addEventListener('click',()=>this.openRoom(tab));
  this.roomDialog.addEventListener('click',e=>{
   if(e.target.closest('[data-room-close]')){this.stopMatching();this.roomDialog.close();return;}
   if(e.target.closest('[data-room-ready]')){this.youReady=!this.youReady;this.tryReady();}
   if(e.target.closest('[data-sample-friend]')){this.friendSample=true;this.friendReady=false;this.renderRoom();}
   if(e.target.closest('[data-sample-friend-ready]')){this.friendReady=!this.friendReady;this.tryReady();}
   if(e.target.closest('[data-sample-full]')){this.fullSample=true;this.finishMatching();}
   if(e.target.closest('[data-invite-preview]')){this.roomNotice=this.t('Invitation preview only. This sample code cannot connect another device yet.','仅为邀请界面预览，示例房码暂不能连接其他设备。');this.renderRoom();}
   if(e.target.closest('[data-join-open]')){this.openRoom('join');}
   if(e.target.closest('[data-room-join]')){this.roomNotice=this.t('The room service is not connected. No room has been joined.','房间服务尚未接入，没有加入真实房间。');this.renderRoom();}
   if(e.target.closest('[data-local-practice]')){this.stopMatching();this.roomDialog.close();document.dispatchEvent(new CustomEvent('flight-party-practice-preview'));}
  });
  this.roomDialog.addEventListener('close',()=>{if(!this.roomDialog.open)this.stopMatching();});
  this.render();return this;
 }
 clearFields(){for(const input of this.dialog.querySelectorAll('input:not([type=checkbox])'))input.value='';}
 setLanguage(){if(this.initialized)this.render();}
 setMode(mode){if(!MODES.includes(mode))return;this.mode=mode;this.render();this.onChange(this.viewer);}
 open(){this.renderDialog();if(!this.dialog.open)this.dialog.showModal();this.dialog.scrollTop=0;}
 render(){this.renderAccountButton();this.renderHomeAccess();this.renderLeaderboard();this.renderDialog();this.renderStatsNote();this.renderResult();this.renderRoom();}
 renderAccountButton(){const guest=this.viewer.isGuest;this.accountButton.innerHTML=`<span class="account-button-avatar avatar-0" aria-hidden="true">${guest?'':this.mode==='member'?'★':''}</span><span class="account-button-label">${guest?this.t('Sign in','登录'):esc(this.displayName)}</span><span class="account-button-mode">${this.t('PREVIEW','预览')}</span>`;this.accountButton.setAttribute('aria-label',this.t('Account interface preview','账号界面预览'));}
 renderHomeAccess(){
  const el=document.getElementById('home-access'),v=this.viewer;
  const title=this.t('Unlimited flights for everyone','所有玩家不限次数');
  const detail=this.t('Play without limits. Only signed-in games add account statistics.','不限次数游玩，只有登录后参与的对局累计账号成绩。');
  el.innerHTML=`<span class="access-symbol" aria-hidden="true">${v.isGuest?'✈':v.isMember?'★':this.mode==='exhausted'?'◷':'✓'}</span><div><b>${title}</b><span>${detail}</span></div><button type="button" id="home-account-open">${this.t('Account','查看账号')} <span aria-hidden="true">↗</span></button>`;
  el.querySelector('button').addEventListener('click',()=>this.open());
  document.getElementById('social-preview-note').textContent=this.t('Unlimited guest play. Email accounts and server results are connected. Google/GitHub sign-in is not configured.','匿名不限次数游玩，邮箱账号和服务器成绩已接入；Google/GitHub 登录暂未配置。');
  document.getElementById('quick-match-preview').innerHTML=this.t('Quick match <span>↗</span>','快速匹配 <span>↗</span>');
  const join=document.getElementById('join-preview');if(join)join.textContent=this.t('Join with a room code','输入房码加入');
  const invite=document.getElementById('invite-preview');if(invite)invite.textContent=this.t('Create a friend room · Preview','创建好友房 · 预览');
 }

 renderLeaderboard(){
  const tab=['month','week','day'].includes(this.boardTab)?this.boardTab:'month';
  this.liveBoards??={};this.liveBoardStatus??={};
  if(!this.liveBoardStatus[tab])this.loadLeaderboard(tab);
  const real=this.liveBoards[tab]||[];
  const fillers=['Cloud Captain','Sky Mango','Luna Wing','Blue Comet','Sunny Ace','Wind Rider','Star Finch','Coco Jet','Moon Pilot','Happy Nimbus'].filter(name=>!real.some(p=>p.name===name)).map((name,i)=>({name,points:5-i,games:8+i,avatar:i%4,synthetic:true}));
  const rows=[...real,...fillers.slice(0,Math.max(0,10-real.length))].sort((a,b)=>b.points-a.points||b.games-a.games).slice(0,10);
  this.leaderboard.innerHTML=`<div class="leaderboard-heading"><div><span class="eyebrow">${this.t('A LITTLE FRIENDLY COMPETITION','和飞行伙伴一起，争取好成绩')}</span><h2>${this.t('Pilot leaderboard','飞行员排行榜')}</h2></div><span class="leaderboard-trophy" aria-hidden="true"><img src="assets/member/trophy.svg" alt=""></span></div><div class="leaderboard-meta"><span class="sample-pill">${this.t('PILOT RANKINGS','飞行员排名')}</span><span>${this.t('TOP 10 · UTC','TOP 10 · UTC')}</span></div><div class="leaderboard-tabs" role="tablist" aria-label="${this.t('Ranking type','排行榜类型')}">${[ ["month","Monthly points","月积分榜"],["week","Weekly points","周积分榜"],["day","Daily points","日积分榜"] ].map(([key,en,zh])=>`<button type="button" id="lb-tab-${key}" role="tab" aria-controls="lb-panel" aria-selected="${tab===key}" data-leaderboard-tab="${key}">${this.t(en,zh)}</button>`).join('')}</div><div id="lb-panel" role="tabpanel" aria-labelledby="lb-tab-${tab}"><div class="leaderboard-columns"><span>${this.t('PILOT','飞行员')}</span><span>${this.t('POINTS','积分')}</span><span>${this.t('GAMES','已完成局数')}</span></div><ol class="leaderboard-list">${rows.map((p,i)=>`<li class="leaderboard-row ${i<3?'podium podium-'+i:''}"><span class="leaderboard-rank">${String(i+1).padStart(2,'0')}</span><span class="leaderboard-avatar avatar-${p.avatar}" ${avatarStyle(p.avatarUrl)} data-frame="${esc(p.avatarFrame||'none')}" aria-hidden="true"></span><b data-member="${p.member===true}" data-annual-member="${p.member===true&&p.annualMember===true}"><span class="membership-name-value">${esc(p.name)}</span></b><strong class="ranking-value-active">${p.points}</strong><strong class="">${p.games}</strong></li>`).join('')}</ol></div><p class="leaderboard-foot">${this.t('Signed-in results save automatically. Guest games are not recorded.','登录后自动保存成绩；匿名对局不记入排行榜。')}</p>`;
  this.leaderboard.querySelector('.sample-pill').textContent=this.t('PILOT RANKINGS','飞行员排名');
  this.syncLeaderboardGutter();
  if(!rows.length){const note=document.createElement('p');note.className='leaderboard-foot';note.setAttribute('role','status');note.textContent=this.liveBoardStatus[tab]==='error'?this.t('Leaderboard unavailable. Try again later.','排行榜暂不可用，请稍后重试。'):this.liveBoardStatus[tab]==='loaded'?this.t('No completed signed-in games yet.','暂无已完成的登录账号对局。'):this.t('Loading leaderboard…','正在读取排行榜…');this.leaderboard.querySelector('#lb-panel').append(note);}
  const tabs=[...this.leaderboard.querySelectorAll('[role=tab]')];tabs.forEach(button=>button.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const keys=['month','week','day'];const next=e.key==='Home'?'month':e.key==='End'?'day':keys[(keys.indexOf(tab)+(e.key==='ArrowRight'?1:2))%3];this.boardTab=next;this.renderLeaderboard();this.leaderboard.querySelector(`[data-leaderboard-tab="${next}"]`).focus();}));
 }
 syncLeaderboardGutter(){
  const list=this.leaderboard.querySelector('.leaderboard-list');
  if(list===this.leaderboardScrollList){this.leaderboardUpdateGutter?.();return;}
  this.leaderboardResizeObserver?.disconnect();this.leaderboardResizeObserver=null;this.leaderboardScrollList=list;
  const update=()=>{if(this.leaderboardScrollList!==list)return;const measured=(list?.offsetWidth??0)-(list?.clientWidth??0),gutter=Number.isFinite(measured)?Math.max(0,measured):0;this.leaderboard.style?.setProperty('--lb-scrollbar',gutter+'px');};
  this.leaderboardUpdateGutter=update;
  if(list&&typeof ResizeObserver!=='undefined'){this.leaderboardResizeObserver=new ResizeObserver(update);this.leaderboardResizeObserver.observe(list);}
  update();
 }
 async loadLeaderboard(tab){
  this.liveBoardStatus[tab]='loading';
  try{
   const response=await fetch(`/api/leaderboards?type=${tab}`,{credentials:'same-origin',signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw new Error('leaderboard unavailable');
   const values=await response.json();if(!Array.isArray(values))throw new Error('invalid leaderboard');
   this.liveBoards[tab]=values.slice(0,10).map((p,i)=>({name:p.displayName,points:p.points,games:p.completedGames,avatar:i%4,member:p.member===true,annualMember:p.member===true&&p.annualMember===true,avatarFrame:p.avatarFrame,avatarUrl:p.avatarUrl}));this.liveBoardStatus[tab]='loaded';
  }catch(error){this.liveBoards[tab]=[];this.liveBoardStatus[tab]='error';}
  if(this.boardTab===tab)this.renderLeaderboard();
 }
 renderDialog(){
  const openDetails=this.dialog.querySelector('#account-preview-states')?.open??false,v=this.viewer,register=this.authTab==='register';
  const modeLabel={guest:this.t('Guest','匿名'),free:this.t('Free account','普通账号'),member:this.t('Member','会员'),exhausted:this.t('Limit reached','额度用尽')};
  const quota=this.t('Unlimited flights for everyone','所有玩家不限次数');
  const quotaDetail=this.t('Only signed-in games add account statistics. Guest results are not claimed later.','仅登录后参与的对局累计账号成绩，匿名成绩不能事后认领。');
  this.dialog.innerHTML=`<button type="button" class="close" data-account-close aria-label="${this.t('Close account preview','关闭账号预览')}">×</button><div class="account-dialog-heading"><span class="account-dialog-avatar avatar-0" aria-hidden="true"></span><div><span class="sample-pill">${this.t('UI PREVIEW','界面预览')}</span><h2>${v.isGuest?this.t('Keep your good flights','保存精彩战绩'):esc(this.displayName)}</h2><p>${v.isGuest?this.t('Signed-in flights count automatically.','登录后，对局成绩自动记录。'):modeLabel[this.mode]}</p></div></div><div class="account-quota ${this.mode==='exhausted'?'quota-empty':''}"><span class="quota-icon" aria-hidden="true">${v.isMember?'★':v.isGuest?'✈':'◷'}</span><div><b>${quota}</b><p>${quotaDetail}</p></div></div>${this.authNotice?`<p class="social-action-notice" role="status">${esc(this.authNotice)}</p>`:''}${v.isGuest?`<div class="auth-tabs" role="tablist" aria-label="${this.t('Account form','账号表单')}"><button type="button" role="tab" aria-selected="${!register}" data-auth-tab="login">${this.t('Sign in','登录')}</button><button type="button" role="tab" aria-selected="${register}" data-auth-tab="register">${this.t('Create account','注册')}</button></div><div class="oauth-preview-buttons"><button type="button" data-oauth-preview="Google"><b aria-hidden="true">G</b>${this.t('Continue with Google','使用 Google 登录')}</button><button type="button" data-oauth-preview="GitHub"><b aria-hidden="true">GH</b>${this.t('Continue with GitHub','使用 GitHub 登录')}</button></div><div class="auth-divider"><span>${this.t('or use email + password','或使用邮箱 + 密码')}</span></div><form id="account-preview-form" autocomplete="off">${register?`<label for="preview-name">${this.t('Pilot name','飞行员昵称')}</label><input id="preview-name" maxlength="18" placeholder="${this.t('Your call sign','你的昵称')}" autocomplete="off">`:''}<label for="preview-email">${this.t('Email address','邮箱地址')}</label><input id="preview-email" type="email" placeholder="pilot@example.com" autocomplete="off"><label for="preview-password">${this.t('Password','密码')}</label><input id="preview-password" type="password" minlength="8" placeholder="${this.t('At least 8 characters, or leave blank for preview','至少 8 位，或留空预览')}" autocomplete="off">${register?`<label for="preview-password-confirm">${this.t('Confirm password','确认密码')}</label><input id="preview-password-confirm" type="password" minlength="8" placeholder="${this.t('Repeat password, or leave blank','再次输入密码，或留空预览')}" autocomplete="off">`:''}<p class="auth-preview-disclosure">${this.t('Email + password, with no verification-code step. All sign-in methods are UI previews: no data is sent or account created; passwords are cleared and never stored. Leave fields blank to inspect the next screen.','邮箱 + 密码，无验证码步骤。所有登录方式仅为界面预览，不发送数据或创建账号，密码会清空且不保存。可留空查看后续界面。')}</p><button class="primary auth-submit" type="submit">${register?this.t('Preview account','预览注册后界面'):this.t('Preview sign-in','预览登录后界面')} <span aria-hidden="true">→</span></button></form>`:`<div class="account-sample-stats"><div><strong>246</strong><span>${this.t('Sample points','示例积分')}</span></div><div><strong>240</strong><span>${this.t('Sample completed games','示例已完成局数')}</span></div></div><p class="auth-preview-disclosure">${this.t('Sample profile only. These values are not earned from your games and disappear on reload.','仅为示例账号，数值不来自实际对局，刷新后恢复匿名预览。')}</p><div class="account-profile-actions"><button type="button" class="primary" data-account-close>${this.t('Back to the skies','返回游戏')} <span aria-hidden="true">→</span></button><button type="button" class="text-button" data-preview-signout>${this.t('Preview sign-out','预览退出账号')}</button></div>`}<details id="account-preview-states" ${openDetails?'open':''}><summary>${this.t('Preview design states','预览不同设计状态')}</summary><div class="preview-state-buttons">${MODES.map(mode=>`<button type="button" data-preview-mode="${mode}" aria-pressed="${this.mode===mode}">${modeLabel[mode]}</button>`).join('')}</div><label class="takeover-preview-option"><input id="takeover-preview" type="checkbox" ${this.takeoverPreview?'checked':''}><span>${this.t('Disconnected · computer takeover','断线 · 电脑托管')}<small>${this.t('Visual state only; seat control stays unchanged.','仅预览状态，不改变席位控制方式。')}</small></span></label><button type="button" class="result-design-preview-button" data-preview-result>${this.t('Preview result status','预览结算状态')}</button>${this.showResultPreview?`<div class="result-save-preview">${this.resultCard({rank:2,name:'You'},true)}</div>`:''}</details>`;
 }
 setResult(result){
  this.result=result&&Number.isInteger(result.rank)&&result.rank>=1&&result.rank<=4?{rank:result.rank,name:String(result.name||'You')}:null;if(this.initialized)this.renderResult();
 }
 resultCard(result,sample=false){
  const guest=this.viewer.isGuest;
  return `<div class="result-save-heading"><span class="save-result-icon" aria-hidden="true">✦</span><div><span class="sample-pill">${sample?this.t('SAMPLE RESULT','结算示例'):this.t('RESULT UI PREVIEW','结算界面预览')}</span><h3>${esc(result.name)} · ${this.t(`Place #${result.rank}`,`第 ${result.rank} 名`)}</h3></div></div><p>${guest?this.t('Guest game · Not recorded. Sign in before a future game to have its result saved automatically.','匿名对局 · 不记录成绩。登录后参与的后续对局将自动保存。'):this.t('Automatic result saving · Preview. The live service will record the full result, including negative points, without an upload button.','自动保存成绩 · 预览。正式服务将自动记录完整结果（包括负分），无需手动上传。')}</p><small>${this.t('Local preview · No data has been uploaded or saved','本地预览 · 尚未上传或保存任何数据')}</small>`;
 }
 renderResult(){const panel=document.getElementById('result-save-panel');if(!panel)return;panel.classList.toggle('hidden',!this.result);panel.innerHTML=this.result?this.resultCard(this.result):'';}
 stopMatching(){if(this.roomTimer!==null){clearInterval(this.roomTimer);this.roomTimer=null;}this.roomDeadline=0;}
 openRoom(tab='quick'){
  this.stopMatching();this.roomTab=['quick','invite','join'].includes(tab)?tab:'quick';this.roomState=this.roomTab==='quick'?'matching':'waiting';this.roomNotice='';this.friendSample=false;this.friendReady=false;this.youReady=this.roomTab==='quick';this.fullSample=false;
  if(!this.roomDialog.open)this.roomDialog.showModal();
  if(this.roomTab==='quick')this.startMatching();else this.renderRoom();this.roomDialog.scrollTop=0;
 }
 tryReady(){if(this.youReady&&(!this.friendSample||this.friendReady))this.startMatching();else this.renderRoom();}
 startMatching(){
  this.stopMatching();this.roomState='matching';this.roomDeadline=Date.now()+30000;this.renderRoom();
  this.roomTimer=setInterval(()=>{if(!this.roomDialog.open){this.stopMatching();return;}if(Date.now()>=this.roomDeadline)this.finishMatching();else this.updateCountdown();},200);
 }
 updateCountdown(){
  const seconds=Math.max(0,Math.ceil((this.roomDeadline-Date.now())/1000));
  const label=this.roomDialog.querySelector('#match-countdown');if(label)label.textContent=String(seconds).padStart(2,'0');
  const progress=this.roomDialog.querySelector('#match-wait-progress');if(progress){progress.value=30-seconds;progress.setAttribute('aria-label',this.t(`${seconds} seconds until computer fill`,`${seconds} 秒后电脑补位`));}
 }
 finishMatching(){this.stopMatching();this.roomState='ready';this.renderRoom();}
 roomSeats(){
  const ready=this.roomState==='ready',matching=this.roomState==='matching',friend=this.friendSample;
  return Array.from({length:4},(_,i)=>{
   const self=i===0,isFriend=i===1&&friend,human=self||isFriend||this.fullSample,bot=!human&&ready;
   const occupied=human||bot,name=self?esc(this.displayName):isFriend?this.t('Alex · Sample','Alex · 示例'):human?this.t(`Pilot ${i+1} · Sample`,`飞行员 ${i+1} · 示例`):bot?['','Alex','Milo','Coco'][i]:this.t('Open seat','空闲席位');
   const status=self?(matching||ready||this.youReady?this.t('Ready','已准备'):this.t('Host · Not ready','房主 · 未准备')):isFriend?(matching||ready||this.friendReady?this.t('Ready · Sample','已准备 · 示例'):this.t('Not ready · Sample','未准备 · 示例')):human?this.t('Ready · Sample','已准备 · 示例'):bot?this.t('Computer pilot · Preview','电脑补位 · 预览'):matching?this.t('Finding a pilot…','正在寻找飞行员…'):this.t('Invite a friend','邀请好友加入');
   return `<li class="room-seat ${occupied?'occupied':'empty'} ${bot?'bot-seat':''}"><span class="room-seat-avatar ${occupied?'avatar-'+i:'empty-seat-avatar'}" aria-hidden="true">${occupied?'':'+'}</span><div><b>${name}</b><span>${status}</span></div><span class="room-seat-marker" aria-hidden="true">${bot?'BOT':human&&(matching||ready||(self?this.youReady:this.friendReady))?'✓':String(i+1).padStart(2,'0')}</span></li>`;
  }).join('');
 }
 renderRoom(){
  if(!this.roomDialog)return;
  const matching=this.roomState==='matching',ready=this.roomState==='ready',joining=this.roomTab==='join';
  const detailsOpen=this.roomDialog.querySelector('#room-preview-states')?.open??false;
  this.roomDialog.innerHTML=`<button type="button" class="close" data-room-close aria-label="${this.t('Close room preview','关闭房间预览')}">×</button><span class="sample-pill">${this.t('LOCAL UI PREVIEW · NOT CONNECTED','本地界面预览 · 尚未联网')}</span><h2>${joining?this.t('Join your friends.','加入好友的房间。'):ready?this.t('Crew ready to fly.','飞行伙伴已就位。'):matching?this.t('Finding your crew…','正在寻找飞行伙伴…'):this.t('Your room is ready.','在这里等朋友。')}</h2><p class="room-preview-intro">${joining?this.t('Enter the room code your friend shared.','输入朋友分享的房间码。'):ready?this.t('Start-state preview only. No online game has started.','仅展示开局状态，没有开始真实在线对局。'):matching?this.t('Join a room with a free seat, or create one. Empty seats fill with bots after 30 seconds.','优先加入有空位的房间，否则自动建房；30 秒后电脑补齐空位。'):this.t('Invite friends. When everyone is ready, we’ll match the remaining seats.','邀请朋友加入；大家准备好后，自动匹配剩余席位。')}</p>${joining?`<section class="join-preview-panel"><label for="room-code-input">${this.t('ROOM CODE','房间码')}</label><input id="room-code-input" placeholder="DEMO-7K2" maxlength="16" autocomplete="off" spellcheck="false"><button type="button" class="primary room-preview-action" data-room-join>${this.t('Join room · Preview','加入房间 · 预览')} <span aria-hidden="true">→</span></button></section>`:`<div class="simple-room-meta"><span>${this.t('CLASSIC · 4 SEATS','经典模式 · 4 个席位')}</span><span>${this.t('2 planes each','每人 2 架飞机')}</span></div><ol class="simple-room-seats">${this.roomSeats()}</ol>${matching?`<div class="room-countdown-panel"><div><b>${this.t('Taking off soon','即将起飞')}</b><span>${this.t('Empty seats will be filled automatically','空位将自动由电脑补齐')}</span></div><strong><span id="match-countdown">30</span><small>s</small></strong><progress id="match-wait-progress" max="30" value="0"></progress></div><button type="button" class="secondary room-cancel" data-room-close>${this.t('Cancel matching','取消匹配')}</button>`:ready?`<div class="room-ready-note">${this.fullSample?this.t('Full-room start preview · 4 sample human seats','满员开局预览 · 4 个真人示例席位'):this.t('30-second timeout preview · Computer pilots fill the empty seats','30 秒超时预览 · 电脑已补齐空位')}</div><button type="button" class="primary room-preview-action" data-local-practice>${this.t('Try a local game with bots','试玩一局本地电脑对局')} <span aria-hidden="true">→</span></button>`:`<div class="room-invite-strip"><div><span>${this.t('SAMPLE ROOM CODE','示例房码')}</span><b>DEMO-7K2</b></div><button type="button" class="secondary" data-invite-preview>${this.t('Invite friends','邀请好友')}</button></div><p class="room-flow-note">${this.t('This code is a preview and cannot connect other devices. The 30-second timer begins after everyone is ready.','示例房码暂不能连接其他设备；全部真人准备后才开始 30 秒匹配。')}</p><button type="button" class="primary room-preview-action" data-room-ready>${this.youReady?this.t('Ready · Waiting for friend','已准备 · 等待好友'):this.t('Ready for takeoff','准备起飞')} <span aria-hidden="true">${this.youReady?'✓':'→'}</span></button><button type="button" class="text-button room-join-link" data-join-open>${this.t('Have a friend’s room code?','已有朋友的房间码？')}</button>`}`}${this.roomNotice?`<p class="social-action-notice" role="status">${esc(this.roomNotice)}</p>`:''}${!joining&&!ready?`<details id="room-preview-states" ${detailsOpen?'open':''}><summary>${this.t('Preview friend states','预览好友状态')}</summary><p>${this.t('Design samples only. These actions do not add real players.','仅设计示例，以下操作不会加入真实玩家。')}</p>${matching?`<button type="button" data-sample-full>${this.t('Preview a full room','预览真人满员')}</button>`:!this.friendSample?`<button type="button" data-sample-friend>${this.t('Add one sample friend','加入一位好友示例')}</button>`:`<button type="button" data-sample-friend-ready>${this.friendReady?this.t('Sample friend: cancel ready','示例好友：取消准备'):this.t('Sample friend: ready','示例好友：准备')}</button>`}</details>`:''}<p class="room-preview-foot">${this.t('UI preview only · No online room or score upload','仅界面预览 · 尚无真实联机或成绩上报')}</p>`;
  if(matching)this.updateCountdown();
 }

 renderStatsNote(){let note=document.getElementById('social-stats-note');if(!note){note=document.createElement('p');note.id='social-stats-note';document.querySelector('.crew-panel')?.append(note);}note.textContent=this.t('Account stats are UI samples · Guest stats are not recorded','账号数据为界面示例 · 匿名数据不记录');}
 playerStats(player){
  const bot=player.type==='bot',guest=player.color===0&&this.viewer.isGuest,untracked=bot||guest;
  const points=untracked?'—':player.color===0?'246':'128',games=untracked?'—':player.color===0?'240':'168';
  const note=bot?this.t('BOT','电脑'):guest?this.t('Not recorded','未记录'):this.t('Sample','示例');
  return `<div class="player-social-stats ${untracked?'stats-untracked':''}" aria-label="${esc(this.t(`Points ${points}, completed games ${games}, ${note}`,`积分 ${points}，已完成局数 ${games}，${note}`))}"><div><b>${points}</b><span>${this.t('POINTS','积分')}</span></div><div><b>${games}</b><span>${this.t('GAMES','局数')}</span></div><small>${note}</small></div>`;
 }
}

