import {avatarStyle,applyAvatar,prepareAvatar} from './avatar.js';
import {startTrailPreview} from './flight-trails.js';
import {renderVictory} from './victory-effects.js';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function bindLiveAccount(social,session){
 let identity=null,notice='',busy=false,accountSection='overview',pendingTrail=null,trailSaving=false;
 const t=(en,zh)=>social.t(en,zh),dialog=social.dialog;
 const picker=document.createElement('dialog');picker.className='avatar-picker-dialog';document.body.append(picker);
 function openAvatarPicker(){
  picker.innerHTML='<button type="button" class="close" data-avatar-picker-close aria-label="'+t('Close','关闭')+'">×</button><h2>'+t('Choose your avatar','选择头像')+'</h2><div class="system-avatar-grid">'+[0,1,2,3].map(i=>'<button type="button" class="secondary" data-system-avatar="'+i+'" aria-label="'+t('System avatar ','系统头像 ')+(i+1)+'"><span class="system-avatar-image avatar-'+i+'"></span></button>').join('')+'</div>'+(identity?.appearance?.member?'<label class="avatar-upload-picker secondary">'+t('Upload your own image','上传自己的图片')+'<input type="file" data-avatar-upload accept="image/png,image/jpeg,image/webp"></label>':'<p>'+t('Members can also upload their own image.','VIP会员还可以上传自己的图片。')+'</p>')+'<p>'+t('JPG / PNG / WebP · up to 5 MB · center crop','JPG / PNG / WebP · 最大5MB · 自动居中裁剪')+'</p>';
  picker.showModal();
 }
 picker.addEventListener('click',async event=>{if(event.target.closest('[data-avatar-picker-close]')){picker.close();return;}const button=event.target.closest('[data-system-avatar]');if(!button||busy)return;busy=true;try{await session.request('/api/account/avatar/system',{index:Number(button.dataset.systemAvatar)});update(await session.request('/api/me'));notice=t('Avatar updated','头像已更新');picker.close();}catch{notice=t('Could not update avatar. Please retry.','头像更新失败，请重试。');}finally{busy=false;social.renderDialog();}});
 picker.addEventListener('change',async event=>{if(!event.target.matches('[data-avatar-upload]'))return;const file=event.target.files?.[0];if(!file||busy)return;busy=true;try{const image=await prepareAvatar(file);await session.request('/api/account/avatar',{image});update(await session.request('/api/me'));notice=t('Avatar updated','头像已更新');picker.close();}catch{notice=t('Upload failed. Check image format, size and membership.','上传失败，请检查图片格式、大小及会员状态。');picker.close();}finally{busy=false;social.renderDialog();}});
 const originalResult=social.renderResult.bind(social);
 social.renderResult=()=>{
  if(!social.liveResult)return originalResult();
  const panel=document.getElementById('result-save-panel');if(!panel)return;panel.classList.remove('hidden');
  panel.textContent=social.liveResult.status==='COMMITTED'?t('Result confirmed. All signed-in games count automatically, including negative points.','结果已确认。所有已绑定账号的对局自动累计，正负分都计入。'):t('Saving the server-verified result…','正在保存服务器确认的结果…');
 };
 dialog.setAttribute('aria-label',t('Account','账号'));
 Object.defineProperty(social,'viewer',{get(){const account=identity?.account;return {mode:account?'free':'guest',name:account?.displayName||'You',displayName:account?.displayName||'You',isGuest:!account,isMember:!!identity?.recording?.member,authenticated:!!account,appearance:identity?.appearance,preview:false,points:account?identity.statistics?.points??0:null,games:account?identity.statistics?.completedGames??0:null,dailyLimit:null,dailyRemaining:null};}});
 function update(value,redraw=true){
  const old=JSON.stringify([identity?.account?.id,identity?.statistics,identity?.appearance]);
  if(old!==JSON.stringify([value.account?.id,value.statistics,value.appearance])){social.liveBoards={};social.liveBoardStatus={};}
  if(identity?.account?.id!==value.account?.id)accountSection='overview';
  identity=value;session.identity=value;session.dispatchEvent(new CustomEvent('profile-updated',{detail:value}));social.mode=value.account?'free':'guest';social.displayName=value.account?.displayName||'You';if(redraw)social.render();else{social.renderAccountButton();social.renderLeaderboard?.();}social.onChange(social.viewer);
 }
 social.renderAccountButton=()=>{if(!identity&&session.authState!=='ready'){social.accountButton.textContent=session.authState==='error'?t('Reconnect','重新连接'):t('Restoring…','恢复登录中…');social.accountButton.setAttribute('aria-label',t('Restore account connection','恢复账号连接'));return;}social.accountButton.innerHTML=social.viewer.isGuest?esc(t('Sign in','登录')):`<span class="header-account-avatar avatar-0" ${avatarStyle(identity?.appearance?.avatarUrl)} data-frame="${esc(identity?.appearance?.frame||'none')}" aria-hidden="true"></span><span class="header-account-name">${esc(social.viewer.name)}</span>`;social.accountButton.classList.toggle('signed-in-account',!social.viewer.isGuest);social.accountButton.setAttribute('aria-label',t('Account','账号'));};
 social.renderDialog=()=>{
  const register=social.authTab==='register',account=identity?.account;
  dialog.setAttribute('aria-label',t('Account','账号'));
  dialog.innerHTML=`<button type="button" class="close" data-account-close aria-label="${t('Close account','关闭账号')}">×</button><div class="account-dialog-heading"><span class="account-dialog-avatar avatar-0" role="button" tabindex="0" data-avatar-picker aria-label="${t('Choose avatar','选择头像')}" ${avatarStyle(identity?.appearance?.avatarUrl)} data-frame="${esc(identity?.appearance?.frame||'none')}"></span><div><span class="sample-pill">${t('ACCOUNT','账号')}</span><h2 data-member="${!!identity?.appearance?.member}">${account?esc(account.displayName):t('Keep your good flights','保存精彩战绩')}</h2></div></div><div class="account-quota"><div><b>${t('Unlimited flights for everyone','所有玩家不限次数')}</b><p>${t('Sign in before a game ends to make it eligible for account statistics.','对局结束前登录，可绑定当前游客对局并按规则累计成绩。')}</p></div></div>${notice?`<p class="social-action-notice" role="status">${esc(notice)}</p>`:''}${account?`<div class="account-sample-stats"><div><strong>${esc(identity.statistics?.points??0)}</strong><span>${t('Points','积分')}</span></div><div><strong>${esc(identity.statistics?.completedGames??0)}</strong><span>${t('Completed games','已完成局数')}</span></div></div><button class="secondary" data-live-signout>${t('Sign out','退出登录')}</button>`:`<div class="auth-tabs" role="tablist" aria-label="${t('Account access','账号操作')}"><button type="button" role="tab" aria-selected="${!register}" data-auth-tab="login">${t('Sign in','登录')}</button><button type="button" role="tab" aria-selected="${register}" data-auth-tab="register">${t('Create account','注册')}</button></div><form id="live-account-form" class="account-auth-form">${register?`<label>${t('Pilot name','昵称')}<input name="displayName" maxlength="64" required autocomplete="nickname" placeholder="${t('Your pilot name','输入你的昵称')}"></label>`:''}<label>${t('Email address','邮箱')}<input name="email" type="email" required autocomplete="username" placeholder="you@example.com"></label><label>${t('Password','密码')}<input name="password" type="password" minlength="8" required autocomplete="${register?'new-password':'current-password'}"></label>${register?`<label>${t('Confirm password','确认密码')}<input name="confirmation" type="password" required autocomplete="new-password"></label>`:''}<p class="auth-preview-disclosure">${t('Email and password. Sign in during play to bind this guest game; finished games cannot be claimed.','邮箱密码登录，无验证码。对局中登录可绑定当前游客局，已结束对局不追补。')}</p><p class="account-oauth-note">${t('Google and GitHub sign-in are not available yet.','Google / GitHub 登录暂未开放。')}</p><button class="primary auth-submit" ${busy?'disabled':''}>${register?t('Create account','注册'):t('Sign in','登录')}</button></form>`}`;
 };
 const renderAccount=social.renderDialog;
 social.renderDialog=()=>{
  renderAccount();
  dialog.classList.toggle('compact-account',!!identity?.account);
  dialog.querySelector('.account-quota p').textContent=t('Every signed-in game records automatically, including negative points. Play is unlimited.','所有登录账号每局自动记录，正负分都计入；所有玩家游玩不限次数。');
  if(identity?.account){
   const looks=document.createElement('section');looks.className='account-appearance';looks.innerHTML=`<h3>${t('Pilot style','飞行员外观')}</h3><p>${t('Preview any frame. Active members can wear it.','可预览全部头像框，有效会员可佩戴。')}</p><div class="appearance-options">${[['gold','Golden Wings','金翼领航'],['cloud','Cloud Voyager','云端漫游'],['night','Starry Flight','星夜飞行']].map(([key,en,zh])=>`<button type="button" class="appearance-option" data-appearance="${key}" aria-pressed="${identity.appearance?.selectedFrame===key}" ${busy?'disabled':''}><span class="appearance-preview avatar-0" ${avatarStyle(identity?.appearance?.avatarUrl)} data-frame="${key}"></span><b>${t(en,zh)}</b><small>${identity.appearance?.selectedFrame===key?t('Selected','已选择'):t('Preview','预览')}</small></button>`).join('')}</div><div class="appearance-preview-row" hidden><span class="appearance-preview avatar-0" ${avatarStyle(identity?.appearance?.avatarUrl)} data-frame="${identity.appearance?.selectedFrame||'gold'}"></span><b data-member="true">${esc(identity.account.displayName)}</b><small>${t('Style preview','外观预览')}</small></div>`;dialog.append(looks);
   const effects=document.createElement('div');effects.className='effect-settings';effects.innerHTML=`<h3>${t('Flight effects','飞行特效')}</h3><label>${t('Flight trail','飞行尾迹')}<select data-effect-trail aria-label="${t('Flight trail','飞行尾迹')}">${[['star','Starlight','星光尾迹'],['rainbow','Rainbow','彩虹尾迹'],['cloud','Cloud','云朵尾迹'],['none','Off','关闭']].map(([key,en,zh])=>`<option value="${key}" ${(identity.appearance?.selectedTrail||'star')===key?'selected':''}>${t(en,zh)}</option>`).join('')}</select></label><div class="effect-preview-host"><canvas width="300" height="95" aria-label="${t('Trail preview','尾迹预览')}"></canvas><div class="effect-victory-preview"><div class="trophy"></div></div></div><p>${t('Visual preview only. Reduced motion simplifies effects.','此处仅预览。减少动态效果时会简化展示。')}</p><p class="effect-save-status" role="status" aria-live="polite"></p>`;looks.append(effects);
   startTrailPreview(effects.querySelector('canvas'),identity.appearance?.selectedTrail||'star',document.body.classList.contains('reduce-motion'),true);
   renderVictory(effects.querySelector('.effect-victory-preview'),{member:true,color:0,victoryEffect:'gold',avatarFrame:identity.appearance?.selectedFrame||'gold',avatarUrl:identity.appearance?.avatarUrl},{reduced:document.body.classList.contains('reduce-motion'),label:t('Effect preview','特效预览')});
   const section=document.createElement('section');section.className='account-quota account-membership';
   const status=document.createElement('p');status.textContent=t('Every signed-in completed game records automatically. Membership adds cosmetics, with no scoring advantage.','所有登录账号每局自动记录，正负分都计入；会员提供专属外观，不增加积分优势。');section.append(status);
   if(identity.recording?.complimentaryUntil){const gift=document.createElement("p");gift.className="account-membership-note";gift.textContent=t("Complimentary membership until: ","赠送会员有效期至：")+new Date(identity.recording.complimentaryUntil).toLocaleString()+t(" · No charge or auto-renewal"," · 不扣费、不自动续费");section.append(gift);}
   if(identity.recording?.testMembership){const badge=document.createElement('p');badge.textContent=t('Sandbox membership confirmed. This does not grant paid membership or change real statistics.','沙箱会员已确认，不授予正式会员，也不改变真实统计。');section.append(badge);}
   for(const sub of identity.recording?.subscriptions||[]){const row=document.createElement('p');row.textContent=(sub.testMode?t('TEST · ','测试 · '):'')+t('Paid period ends: ','已付周期截止：')+new Date(sub.validUntil).toLocaleString();section.append(row);if(['ACTIVE','TEST_ACTIVE'].includes(sub.status)){const cancel=document.createElement('button');cancel.type='button';cancel.className='secondary';cancel.dataset.cancelSubscription=sub.id;cancel.disabled=busy||sub.cancelScheduled;cancel.textContent=sub.cancelScheduled?t('Renewal canceled · access lasts until period end','已取消续费 · 当前周期到期后结束'):t('Cancel auto-renewal','取消自动续费');section.append(cancel);}}
   const plans=document.createElement('div');plans.className='account-plan-grid';
   for(const plan of ['MONTHLY','ANNUAL']){const button=document.createElement('button');button.type='button';button.className='secondary account-plan-card';button.disabled=busy||!identity.recording?.paymentConfigured;button.dataset.billingPlan=plan;button.innerHTML=`<span>${plan==='MONTHLY'?t('Monthly membership','月会员'):t('Annual membership','年会员')}</span><strong>${plan==='MONTHLY'?'$9':'$59'}<small> USD</small></strong><span>${plan==='MONTHLY'?t('per month','每月'):t('per year','每年')}</span>${identity.recording?.paymentConfigured?`<small>${identity.recording.testMode?t('TEST payment','测试支付'):t('Subscribe','开通会员')}</small>`:''}`;plans.append(button);}section.append(plans);
   if(!identity.recording?.paymentConfigured){const pending=document.createElement('p');pending.className='account-membership-note';pending.textContent=t('Paid membership is not available yet. Free play remains unlimited.','会员购买暂未开放，免费游玩始终不限次数。');section.append(pending);}
   dialog.append(section);
   const overview=document.createElement('section');overview.className='account-overview';
   const quota=dialog.querySelector('.account-quota');const stats=dialog.querySelector('.account-sample-stats');if(stats)overview.append(stats);if(quota)overview.append(quota);
   const memberSummary=document.createElement('p');memberSummary.className='account-member-summary';memberSummary.textContent=identity.recording?.member?t('VIP active','VIP 已生效'):t('Free account · Every game counts','普通账号 · 每局成绩均记录');if(identity.recording?.complimentaryUntil)memberSummary.textContent+=' · '+t('Until ','有效期至 ')+new Date(identity.recording.complimentaryUntil).toLocaleDateString();overview.append(memberSummary);
   const signout=dialog.querySelector('[data-live-signout]');if(signout){signout.classList.add('account-signout');overview.append(signout);}
   const tabs=document.createElement('div');tabs.className='account-section-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label',t('Account sections','账号栏目'));tabs.innerHTML=[['overview','Account','账号'],['style','Appearance','外观特效'],['membership','Membership','会员']].map(([key,en,zh])=>`<button type="button" id="account-tab-${key}" role="tab" aria-selected="${accountSection===key}" aria-controls="account-panel-${key}" data-account-section="${key}">${t(en,zh)}</button>`).join('');
   dialog.querySelector('.account-dialog-heading').after(tabs);
   for(const [key,panel] of [['overview',overview],['style',looks],['membership',section]]){panel.id='account-panel-'+key;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','account-tab-'+key);panel.hidden=accountSection!==key;panel.classList.toggle('hidden',panel.hidden);dialog.append(panel);}
  }
 };
 dialog.addEventListener('keydown',event=>{if(event.target.matches('[data-avatar-picker]')&&['Enter',' '].includes(event.key)){event.preventDefault();if(identity?.account)openAvatarPicker();}});
 dialog.addEventListener('submit',async event=>{
  if(event.target.id!=='live-account-form')return;event.preventDefault();event.stopImmediatePropagation();if(busy)return;
  const values=new FormData(event.target),password=values.get('password');
  if(social.authTab==='register'&&password!==values.get('confirmation')){notice=t('Passwords must match.','两次密码需要一致。');social.renderDialog();return;}
  busy=true;notice='';const input={email:values.get('email'),password,displayName:values.get('displayName')};event.target.reset();
  try{if(!session.csrf)await session.initialize();await session.request(`/api/auth/${social.authTab==='register'?'register':'login'}`,input);update(await session.request('/api/me'));if(session.room)session.connect();}
  catch(error){notice=t('Unable to sign in or register. Check your details and try again.','登录或注册未成功，请检查信息后重试。');}
  finally{busy=false;social.renderDialog();}
 },true);
 dialog.addEventListener('change',async event=>{

  if(!event.target.matches('[data-effect-trail]'))return;const select=event.target,value=select.value,section=select.closest('.effect-settings');
  startTrailPreview(section.querySelector('canvas'),value,document.body.classList.contains('reduce-motion'),true);
  const status=section.querySelector('.effect-save-status');
  if(!identity?.appearance?.member){status.textContent=t('Preview only. Active membership is required to use it.','当前仅预览，使用需要有效会员。');return;}
  pendingTrail=value;if(trailSaving)return;trailSaving=true;
  try{while(pendingTrail!==null){const trail=pendingTrail;pendingTrail=null;status.textContent=t('Saving…','保存中…');
   try{await session.request('/api/account/appearance',{trail,victory:'gold'});const me=await session.request('/api/me');if(pendingTrail===null){update(me,false);const current=dialog.querySelector('[data-effect-trail]');if(current&&current!==select){current.value=me.appearance?.selectedTrail||trail;startTrailPreview(current.closest('.effect-settings').querySelector('canvas'),current.value,document.body.classList.contains('reduce-motion'),true);}const currentStatus=dialog.querySelector('.effect-save-status')||status;currentStatus.textContent=t('Saved automatically','已自动保存');}}
   catch(error){if(pendingTrail===null){select.value=identity.appearance?.selectedTrail||'star';status.textContent=t('Save failed. Select again to retry.','保存失败，请重新选择重试。');startTrailPreview(section.querySelector('canvas'),select.value,document.body.classList.contains('reduce-motion'),true);}}
  }}finally{trailSaving=false;}
 });
 dialog.addEventListener('click',async event=>{
  if(event.target.closest('[data-avatar-picker]')&&identity?.account){event.stopImmediatePropagation();openAvatarPicker();return;}
  const sectionTab=event.target.closest('[data-account-section]');
  if(sectionTab){event.stopImmediatePropagation();accountSection=sectionTab.dataset.accountSection;social.renderDialog();dialog.scrollTop=0;dialog.querySelector('[data-account-section="'+accountSection+'"]').focus();return;}
  const appearance=event.target.closest('[data-appearance]');
  if(appearance){event.stopImmediatePropagation();if(busy)return;const frame=appearance.dataset.appearance;
   if(!identity?.appearance?.member){const row=dialog.querySelector('.appearance-preview-row [data-frame]');if(row){row.dataset.frame=frame;row.closest('.appearance-preview-row').hidden=false;}notice=t('Preview only. Active membership is required to wear this frame.','当前仅预览，佩戴需要有效会员。');const note=dialog.querySelector('.account-appearance p');if(note)note.textContent=notice;return;}
   busy=true;try{await session.request('/api/account/appearance',{frame});update(await session.request('/api/me'));notice=t('Pilot style saved.','外观已保存。');}catch(error){notice=t('Could not save. Check your membership and retry.','未能保存，请检查会员状态后重试。');}finally{busy=false;social.renderDialog();}return;
  }
  const cancellation=event.target.closest('[data-cancel-subscription]');
  if(cancellation){event.stopImmediatePropagation();if(busy)return;busy=true;social.renderDialog();try{await session.request('/api/billing/subscriptions/'+encodeURIComponent(cancellation.dataset.cancelSubscription)+'/cancel',{});update(await session.request('/api/me'));notice=t('Auto-renewal canceled. Current paid access lasts until the period ends.','已取消自动续费，已付权益保留至当前周期结束。');}catch(error){notice=t('Cancellation was not confirmed. Please retry or contact support.','尚未确认取消成功，请重试或联系客服。');}finally{busy=false;social.renderDialog();}return;}
  const purchase=event.target.closest('[data-billing-plan]');
  if(purchase){event.stopImmediatePropagation();if(busy||!identity?.recording?.paymentConfigured)return;busy=true;social.renderDialog();try{const result=await session.request('/api/billing/checkout',{requestId:crypto.randomUUID(),plan:purchase.dataset.billingPlan});location.assign(result.checkoutUrl);}catch(error){notice=t('Checkout could not be created. No membership was granted. Please try again later.','暂时无法创建支付订单，尚未授予会员，请稍后重试。');}finally{busy=false;social.renderDialog();}return;}
  if(!event.target.closest('[data-live-signout]'))return;event.stopImmediatePropagation();
  try{await session.request('/api/auth/logout',{});update(await session.request('/api/me'));if(session.room)session.connect();}
  catch(error){notice=t('Sign-out failed. Please retry.','退出失败，请重试。');social.renderDialog();}
 },true);
 social.renderStatsNote=()=>{
  let note=document.getElementById('social-stats-note');if(!note){note=document.createElement('p');note.id='social-stats-note';document.querySelector('.crew-panel')?.append(note);}
  note.textContent=t('Account statistics come from completed server-verified games. Guest games are not accumulated.','账号统计来自服务器确认的已完成对局，匿名对局不累计。');
 };
 social.playerStats=player=>{
  const own=player.type==='human',tracked=own&&!!identity?.account,points=tracked?identity.statistics?.points??0:'—',games=tracked?identity.statistics?.completedGames??0:'—';
  return `<div class="player-social-stats"><div><b>${esc(points)}</b><span>${t('POINTS','积分')}</span></div><div><b>${esc(games)}</b><span>${t('GAMES','局数')}</span></div><small>${tracked?t('Account','账号'):t('Not recorded here','此处不记录')}</small></div>`;
 };
 session.addEventListener('authstate',()=>social.renderAccountButton());
 social.accountButton.addEventListener('click',async event=>{if(!identity&&session.authState!=='ready'){event.stopImmediatePropagation();try{await session.initialize();}catch{};}},true);
 session.addEventListener('identity',event=>update(event.detail));
 social.render();
}
