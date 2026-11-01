const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function bindLiveAccount(social,session){
 let identity=null,notice='',busy=false;
 const t=(en,zh)=>social.t(en,zh),dialog=social.dialog;
 const originalResult=social.renderResult.bind(social);
 social.renderResult=()=>{
  if(!social.liveResult)return originalResult();
  const panel=document.getElementById('result-save-panel');if(!panel)return;panel.classList.remove('hidden');
  panel.textContent=social.liveResult.status==='COMMITTED'?t('Result confirmed. Only accounts signed in at match start receive cumulative statistics.','结果已确认。仅开局时登录的账号累计成绩。'):t('Saving the server-verified result…','正在保存服务器确认的结果…');
 };
 dialog.setAttribute('aria-label',t('Account','账号'));
 Object.defineProperty(social,'viewer',{get(){const account=identity?.account;return {mode:account?'free':'guest',name:account?.displayName||'You',displayName:account?.displayName||'You',isGuest:!account,isMember:!!identity?.recording?.member,authenticated:!!account,preview:false,points:account?identity.statistics?.points??0:null,games:account?identity.statistics?.completedGames??0:null,dailyLimit:null,dailyRemaining:null};}});
 function update(value){
  const old=JSON.stringify([identity?.account?.id,identity?.statistics]);
  if(old!==JSON.stringify([value.account?.id,value.statistics])){social.liveBoards={};social.liveBoardStatus={};}
  identity=value;social.mode=value.account?'free':'guest';social.displayName=value.account?.displayName||'You';social.render();social.onChange(social.viewer);
 }
 social.renderAccountButton=()=>{social.accountButton.textContent=social.viewer.isGuest?t('Sign in','登录'):social.viewer.name;social.accountButton.setAttribute('aria-label',t('Account','账号'));};
 social.renderDialog=()=>{
  const register=social.authTab==='register',account=identity?.account;
  dialog.setAttribute('aria-label',t('Account','账号'));
  dialog.innerHTML=`<button type="button" class="close" data-account-close aria-label="${t('Close account','关闭账号')}">×</button><div class="account-dialog-heading"><span class="account-dialog-avatar avatar-0"></span><div><span class="sample-pill">${t('ACCOUNT','账号')}</span><h2>${account?esc(account.displayName):t('Keep your good flights','保存精彩战绩')}</h2></div></div><div class="account-quota"><div><b>${t('Unlimited flights for everyone','所有玩家不限次数')}</b><p>${t('Only games started while signed in add account statistics.','仅登录后开局的对局累计账号成绩。')}</p></div></div>${notice?`<p class="social-action-notice" role="status">${esc(notice)}</p>`:''}${account?`<div class="account-sample-stats"><div><strong>${esc(identity.statistics?.points??0)}</strong><span>${t('Points','积分')}</span></div><div><strong>${esc(identity.statistics?.completedGames??0)}</strong><span>${t('Completed games','已完成局数')}</span></div></div><button class="secondary" data-live-signout>${t('Sign out','退出登录')}</button>`:`<div class="auth-tabs" role="tablist" aria-label="${t('Account access','账号操作')}"><button type="button" role="tab" aria-selected="${!register}" data-auth-tab="login">${t('Sign in','登录')}</button><button type="button" role="tab" aria-selected="${register}" data-auth-tab="register">${t('Create account','注册')}</button></div><form id="live-account-form" class="account-auth-form">${register?`<label>${t('Pilot name','昵称')}<input name="displayName" maxlength="64" required autocomplete="nickname" placeholder="${t('Your pilot name','输入你的昵称')}"></label>`:''}<label>${t('Email address','邮箱')}<input name="email" type="email" required autocomplete="username" placeholder="you@example.com"></label><label>${t('Password','密码')}<input name="password" type="password" minlength="8" required autocomplete="${register?'new-password':'current-password'}"></label>${register?`<label>${t('Confirm password','确认密码')}<input name="confirmation" type="password" required autocomplete="new-password"></label>`:''}<p class="auth-preview-disclosure">${t('Email and password. No verification code. Guest games are not claimed later.','邮箱密码登录，无验证码。匿名对局成绩不能事后认领。')}</p><p class="account-oauth-note">${t('Google and GitHub sign-in are not available yet.','Google / GitHub 登录暂未开放。')}</p><button class="primary auth-submit" ${busy?'disabled':''}>${register?t('Create account','注册'):t('Sign in','登录')}</button></form>`}`;
 };
 const renderAccount=social.renderDialog;
 social.renderDialog=()=>{
  renderAccount();
  dialog.querySelector('.account-quota p').textContent=t('One automatic score record per day free. Members record every completed game. Playing is always unlimited.','每天首局登录完成对局免费记录，正负分都计入；会员不限记录次数，游玩始终不限。');
  if(identity?.account){
   const section=document.createElement('section');section.className='account-quota account-membership';
   const status=document.createElement('p');status.textContent=identity.recording?.member?t('Membership active · Unlimited score records','会员有效 · 不限成绩记录次数'):t(`Free score records remaining today: ${identity.recording?.freeRemaining??1} (UTC reset)`,`今日剩余免费记录：${identity.recording?.freeRemaining??1} 次（UTC 日重置）`);section.append(status);
   if(identity.recording?.testMembership){const badge=document.createElement('p');badge.textContent=t('Sandbox membership confirmed. This does not grant paid membership or change real statistics.','沙箱会员已确认，不授予正式会员，也不改变真实统计。');section.append(badge);}
   for(const sub of identity.recording?.subscriptions||[]){const row=document.createElement('p');row.textContent=(sub.testMode?t('TEST · ','测试 · '):'')+t('Paid period ends: ','已付周期截止：')+new Date(sub.validUntil).toLocaleString();section.append(row);if(['ACTIVE','TEST_ACTIVE'].includes(sub.status)){const cancel=document.createElement('button');cancel.type='button';cancel.className='secondary';cancel.dataset.cancelSubscription=sub.id;cancel.disabled=busy||sub.cancelScheduled;cancel.textContent=sub.cancelScheduled?t('Renewal canceled · access lasts until period end','已取消续费 · 当前周期到期后结束'):t('Cancel auto-renewal','取消自动续费');section.append(cancel);}}
   for(const [plan,label] of [['MONTHLY',t('$9 USD / month','$9 美元 / 月')],['ANNUAL',t('$59 USD / year','$59 美元 / 年')]]){const button=document.createElement('button');button.type='button';button.className='secondary';button.disabled=busy||!identity.recording?.paymentConfigured;button.dataset.billingPlan=plan;button.textContent=label+' · '+(identity.recording?.paymentConfigured?(identity.recording.testMode?t('TEST payment','测试支付'):t('Subscribe','订阅')):t('Creem setup pending','Creem 待配置'));section.append(button);}
   dialog.append(section);
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
