const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function bindLiveAccount(social,session){
 let identity=null,notice='',busy=false;
 const t=(en,zh)=>social.t(en,zh),dialog=social.dialog;
 const originalResult=social.renderResult.bind(social);
 social.renderResult=()=>{
  if(!social.liveResult)return originalResult();
  const panel=document.getElementById('result-save-panel');if(!panel)return;panel.classList.remove('hidden');
  panel.textContent=social.liveResult.status==='COMMITTED'?t('Result confirmed. All signed-in games count automatically, including negative points.','结果已确认。所有已绑定账号的对局自动累计，正负分都计入。'):t('Saving the server-verified result…','正在保存服务器确认的结果…');
 };
 dialog.setAttribute('aria-label',t('Account','账号'));
 Object.defineProperty(social,'viewer',{get(){const account=identity?.account;return {mode:account?'free':'guest',name:account?.displayName||'You',displayName:account?.displayName||'You',isGuest:!account,isMember:!!identity?.recording?.member,authenticated:!!account,appearance:identity?.appearance,preview:false,points:account?identity.statistics?.points??0:null,games:account?identity.statistics?.completedGames??0:null,dailyLimit:null,dailyRemaining:null};}});
 function update(value){
  const old=JSON.stringify([identity?.account?.id,identity?.statistics,identity?.appearance]);
  if(old!==JSON.stringify([value.account?.id,value.statistics,value.appearance])){social.liveBoards={};social.liveBoardStatus={};}
  identity=value;social.mode=value.account?'free':'guest';social.displayName=value.account?.displayName||'You';social.render();social.onChange(social.viewer);
 }
 social.renderAccountButton=()=>{social.accountButton.textContent=social.viewer.isGuest?t('Sign in','登录'):social.viewer.name;social.accountButton.setAttribute('aria-label',t('Account','账号'));};
 social.renderDialog=()=>{
  const register=social.authTab==='register',account=identity?.account;
  dialog.setAttribute('aria-label',t('Account','账号'));
  dialog.innerHTML=`<button type="button" class="close" data-account-close aria-label="${t('Close account','关闭账号')}">×</button><div class="account-dialog-heading"><span class="account-dialog-avatar avatar-0" data-frame="${esc(identity?.appearance?.frame||'none')}"></span><div><span class="sample-pill">${t('ACCOUNT','账号')}</span><h2 data-member="${!!identity?.appearance?.member}">${account?esc(account.displayName):t('Keep your good flights','保存精彩战绩')}</h2></div></div><div class="account-quota"><div><b>${t('Unlimited flights for everyone','所有玩家不限次数')}</b><p>${t('Sign in before a game ends to make it eligible for account statistics.','对局结束前登录，可绑定当前游客对局并按规则累计成绩。')}</p></div></div>${notice?`<p class="social-action-notice" role="status">${esc(notice)}</p>`:''}${account?`<div class="account-sample-stats"><div><strong>${esc(identity.statistics?.points??0)}</strong><span>${t('Points','积分')}</span></div><div><strong>${esc(identity.statistics?.completedGames??0)}</strong><span>${t('Completed games','已完成局数')}</span></div></div><button class="secondary" data-live-signout>${t('Sign out','退出登录')}</button>`:`<div class="auth-tabs" role="tablist" aria-label="${t('Account access','账号操作')}"><button type="button" role="tab" aria-selected="${!register}" data-auth-tab="login">${t('Sign in','登录')}</button><button type="button" role="tab" aria-selected="${register}" data-auth-tab="register">${t('Create account','注册')}</button></div><form id="live-account-form" class="account-auth-form">${register?`<label>${t('Pilot name','昵称')}<input name="displayName" maxlength="64" required autocomplete="nickname" placeholder="${t('Your pilot name','输入你的昵称')}"></label>`:''}<label>${t('Email address','邮箱')}<input name="email" type="email" required autocomplete="username" placeholder="you@example.com"></label><label>${t('Password','密码')}<input name="password" type="password" minlength="8" required autocomplete="${register?'new-password':'current-password'}"></label>${register?`<label>${t('Confirm password','确认密码')}<input name="confirmation" type="password" required autocomplete="new-password"></label>`:''}<p class="auth-preview-disclosure">${t('Email and password. Sign in during play to bind this guest game; finished games cannot be claimed.','邮箱密码登录，无验证码。对局中登录可绑定当前游客局，已结束对局不追补。')}</p><p class="account-oauth-note">${t('Google and GitHub sign-in are not available yet.','Google / GitHub 登录暂未开放。')}</p><button class="primary auth-submit" ${busy?'disabled':''}>${register?t('Create account','注册'):t('Sign in','登录')}</button></form>`}`;
 };
 const renderAccount=social.renderDialog;
 social.renderDialog=()=>{
  renderAccount();
  dialog.querySelector('.account-quota p').textContent=t('Every signed-in game records automatically, including negative points. Play is unlimited.','所有登录账号每局自动记录，正负分都计入；所有玩家游玩不限次数。');
  if(identity?.account){
   const looks=document.createElement('section');looks.className='account-appearance';looks.innerHTML=`<h3>${t('Pilot style','飞行员外观')}</h3><p>${t('Preview any frame. Active members can wear it.','可预览全部头像框，有效会员可佩戴。')}</p><div class="appearance-options">${[['gold','Golden Wings','金翼领航'],['cloud','Cloud Voyager','云端漫游'],['night','Starry Flight','星夜飞行']].map(([key,en,zh])=>`<button type="button" class="appearance-option" data-appearance="${key}" aria-pressed="${identity.appearance?.selectedFrame===key}" ${busy?'disabled':''}><span class="appearance-preview avatar-0" data-frame="${key}"></span><b>${t(en,zh)}</b><small>${identity.appearance?.selectedFrame===key?t('Selected','已选择'):t('Preview','预览')}</small></button>`).join('')}</div><div class="appearance-preview-row"><span class="appearance-preview avatar-0" data-frame="${identity.appearance?.selectedFrame||'gold'}"></span><b data-member="true">${esc(identity.account.displayName)}</b><small>${t('Style preview','外观预览')}</small></div>`;dialog.append(looks);
   const section=document.createElement('section');section.className='account-quota account-membership';
   const status=document.createElement('p');status.textContent=t('Every signed-in completed game records automatically. Membership adds cosmetics, with no scoring advantage.','所有登录账号每局自动记录，正负分都计入；会员提供专属外观，不增加积分优势。');section.append(status);
   if(identity.recording?.complimentaryUntil){const gift=document.createElement("p");gift.className="account-membership-note";gift.textContent=t("Complimentary membership until: ","赠送会员有效期至：")+new Date(identity.recording.complimentaryUntil).toLocaleString()+t(" · No charge or auto-renewal"," · 不扣费、不自动续费");section.append(gift);}
   if(identity.recording?.testMembership){const badge=document.createElement('p');badge.textContent=t('Sandbox membership confirmed. This does not grant paid membership or change real statistics.','沙箱会员已确认，不授予正式会员，也不改变真实统计。');section.append(badge);}
   for(const sub of identity.recording?.subscriptions||[]){const row=document.createElement('p');row.textContent=(sub.testMode?t('TEST · ','测试 · '):'')+t('Paid period ends: ','已付周期截止：')+new Date(sub.validUntil).toLocaleString();section.append(row);if(['ACTIVE','TEST_ACTIVE'].includes(sub.status)){const cancel=document.createElement('button');cancel.type='button';cancel.className='secondary';cancel.dataset.cancelSubscription=sub.id;cancel.disabled=busy||sub.cancelScheduled;cancel.textContent=sub.cancelScheduled?t('Renewal canceled · access lasts until period end','已取消续费 · 当前周期到期后结束'):t('Cancel auto-renewal','取消自动续费');section.append(cancel);}}
   const plans=document.createElement('div');plans.className='account-plan-grid';
   for(const plan of ['MONTHLY','ANNUAL']){const button=document.createElement('button');button.type='button';button.className='secondary account-plan-card';button.disabled=busy||!identity.recording?.paymentConfigured;button.dataset.billingPlan=plan;button.innerHTML=`<span>${plan==='MONTHLY'?t('Monthly membership','月会员'):t('Annual membership','年会员')}</span><strong>${plan==='MONTHLY'?'$9':'$59'}<small> USD</small></strong><span>${plan==='MONTHLY'?t('per month','每月'):t('per year','每年')}</span>${identity.recording?.paymentConfigured?`<small>${identity.recording.testMode?t('TEST payment','测试支付'):t('Subscribe','开通会员')}</small>`:''}`;plans.append(button);}section.append(plans);
   if(!identity.recording?.paymentConfigured){const pending=document.createElement('p');pending.className='account-membership-note';pending.textContent=t('Paid membership is not available yet. Free play remains unlimited.','会员购买暂未开放，免费游玩始终不限次数。');section.append(pending);}
   dialog.append(section);
   const signout=dialog.querySelector('[data-live-signout]');if(signout){signout.classList.add('account-signout');dialog.append(signout);}
  }
 };
 dialog.addEventListener('submit',async event=>{
  if(event.target.id!=='live-account-form')return;event.preventDefault();event.stopImmediatePropagation();if(busy)return;
  const values=new FormData(event.target),password=values.get('password');
  if(social.authTab==='register'&&password!==values.get('confirmation')){notice=t('Passwords must match.','两次密码需要一致。');social.renderDialog();return;}
  busy=true;notice='';const input={email:values.get('email'),password,displayName:values.get('displayName')};event.target.reset();
  try{if(!session.csrf)await session.initialize();await session.request(`/api/auth/${social.authTab==='register'?'register':'login'}`,input);update(await session.request('/api/me'));if(session.room)session.connect();}
  catch(error){notice=t('Unable to sign in or register. Check your details and try again.','登录或注册未成功，请检查信息后重试。');}
  finally{busy=false;social.renderDialog();}
 },true);
 dialog.addEventListener('click',async event=>{
  const appearance=event.target.closest('[data-appearance]');
  if(appearance){event.stopImmediatePropagation();if(busy)return;const frame=appearance.dataset.appearance;
   if(!identity?.appearance?.member){const row=dialog.querySelector('.appearance-preview-row [data-frame]');if(row)row.dataset.frame=frame;notice=t('Preview only. Active membership is required to wear this frame.','当前仅预览，佩戴需要有效会员。');const note=dialog.querySelector('.account-appearance p');if(note)note.textContent=notice;return;}
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
 session.addEventListener('identity',event=>update(event.detail));
 social.render();
}
