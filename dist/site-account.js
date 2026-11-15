/* Unified header account entry (portal home + membership/terms/privacy/contact).
   Sign-in and registration are two separate dialogs, never one form with two
   submit buttons. The same pair is used in-game: the embedded game's legacy
   #auth dialog is no longer opened from the shared header. */
(function(){
 'use strict';
 var signin=document.getElementById('chrome-account');
 var signup=document.getElementById('chrome-register');
 if(!signin)return;
 var dialogs={},csrf=null;
 var zh=function(){return document.documentElement.getAttribute('data-locale')==='zh';};
 var t=function(en,cn){return zh()?cn:en;};
 var SIGNIN_LABEL='<span class="lang-en">Sign in</span><span class="lang-cn">登录</span>';
 // The embedded game broadcasts its account button text through
 // joyflock:controls. While /api/me or the live session is unreachable that
 // button shows a transient connection state, not a nickname. Those labels
 // used to be accepted as a display name, replacing the server-confirmed name
 // with "Restoring…" / "Reconnect" and wrongly marking the shell as signed in.
 var TRANSIENT=/^(?:Restoring…|Restoring\.\.\.|恢复登录中…|Reconnect|重新连接|Connecting…|连接中…)$/;
 // The header is static HTML, so a signed-in visitor used to see "Sign in"
 // on every reload until /api/me came back. Store the last server-confirmed
 // display name (or "0" for a confirmed guest) and let the inline boot script
 // in each page render it synchronously on the very first frame.
 var CACHE_KEY='joyflock.accountName',COOKIE_KEY='joyflock_account';

 function cache(name){
  try{localStorage.setItem(CACHE_KEY,name||'0');}catch(e){}
  // Cookies are host-scoped, unlike localStorage (which is origin-scoped and
  // therefore isolated per port). This keeps the first frame correct when the
  // same site is also reached on another port. Store the display name only.
  try{document.cookie=COOKIE_KEY+'='+(name?encodeURIComponent(name):'0')+
   '; path=/; Max-Age=2592000; SameSite=Lax';}catch(e){}
 }
 function renderSigned(name){
  signin.style.removeProperty('--shop-avatar');
  signin.classList.remove('chrome-account-pending');
  document.body.classList.add('chrome-signed');
  signin.innerHTML='<span class="lang-en"></span><span class="lang-cn"></span>';
  signin.querySelector('.lang-en').textContent=name;
  signin.querySelector('.lang-cn').textContent=name;
  signin.title=name;
  // Retire the second entry from the layout: the points pill should sit
  // directly beside the nickname instead of behind a blank reserved slot.
  if(signup){signup.classList.add('chrome-account-gone');signup.tabIndex=-1;}
 }
 function renderGuest(){
  signin.style.setProperty('--shop-avatar','url("/assets/shop/avatars-v4/avatar-starling.svg?v=20261114-avatar5")');
  signin.classList.remove('chrome-account-pending');
  document.body.classList.remove('chrome-signed');
  signin.innerHTML=SIGNIN_LABEL;
  signin.removeAttribute('title');
  if(signup){signup.classList.remove('chrome-account-gone');signup.removeAttribute('tabindex');}
 }
 function announce(name){
  try{window.dispatchEvent(new CustomEvent('joyflock:account-changed',{detail:{name:name||null}}));}catch(e){}
 }
 function setLabel(name){cache(name);renderSigned(name);announce(name);}
 function resetLabel(){cache('');renderGuest();announce(null);}

 function api(path,body){
  var headers={};
  if(body!==undefined)headers['content-type']='application/json';
  if(csrf)headers[csrf.headerName]=csrf.token;
  return fetch(path,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',
   headers:headers,body:body===undefined?undefined:JSON.stringify(body)})
   .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();});
 }
 /* Opening the login dialog calls session() every time, and a static preview
    has no /api/ backend. A definitive 4xx is remembered for 30s so repeated
    opens do not emit another csrf + me pair of 404s. Network faults and 5xx
    are not cached, and a real backend recovers automatically after the window. */
 var apiDownUntil=0,apiDownError=null;
 function rememberDown(e){
  var m=/HTTP (\d{3})/.exec(e&&e.message||'');
  if(m&&Number(m[1])>=400&&Number(m[1])<500){apiDownUntil=Date.now()+30000;apiDownError=e;}
 }
 function session(){
  if(Date.now()<apiDownUntil)return Promise.reject(apiDownError||new Error('HTTP 404'));
  var p=!csrf?api('/api/csrf').then(function(c){csrf=c;return api('/api/session/guest',{});})
   .then(function(){return api('/api/me');}):api('/api/me');
  p.catch(rememberDown);
  return p;
 }
 function notifyGame(){
  var frame=document.getElementById('game-frame');
  if(frame&&frame.contentWindow)frame.contentWindow.postMessage({type:'joyflock:auth-changed'},location.origin);
 }

 var PLACEHOLDERS={
  displayName:['Pick a nickname','给自己起个名字'],
  email:['you@example.com','你的邮箱地址'],
  password:['At least 8 characters','至少 8 位密码'],
  confirmation:['Repeat your password','再输入一次密码']
 };
 function applyPlaceholders(){
  var en=!zh();
  Object.keys(dialogs).forEach(function(kind){
   var d=dialogs[kind];
   Object.keys(PLACEHOLDERS).forEach(function(name){
    var input=d.querySelector('[name="'+name+'"]');
    if(input)input.placeholder=PLACEHOLDERS[name][en?0:1];
   });
   // Error text is written in the language of the moment; never keep a stale
   // translation on screen after the visitor switches language.
   d.querySelector('.chrome-auth-error').textContent='';
  });
 }
 function field(name,label,type,extra){
  return '<label class="chrome-auth-field"><span>'+label+'</span>'+
   '<input name="'+name+'" type="'+type+'" '+(extra||'')+'></label>';
 }
 var L=function(en,cn){return '<span class="lang-en">'+en+'</span><span class="lang-cn">'+cn+'</span>';};

 function build(kind){
  var reg=kind==='register';
  var d=document.createElement('dialog');
  d.className='chrome-auth';d.dataset.kind=kind;
  d.innerHTML=
   '<button type="button" class="chrome-auth-close" aria-label="Close">×</button>'+
   '<div class="chrome-auth-brand"><span class="chrome-auth-mark">✦</span>JoyFlock</div>'+
   '<h2>'+(reg?L('Create your account','创建账号'):L('Welcome back','欢迎回来'))+'</h2>'+
   '<p class="chrome-auth-note">'+(reg
    ?L('A free account saves your nickname and scores.','注册完全免费，可保存昵称与对局成绩。')
    :L('Sign in to keep your scores. Playing stays free — no account needed.','登录后可累计对局成绩；不登录也能免费畅玩。'))+'</p>'+
   (reg?'':'<div class="chrome-auth-signed" hidden><div class="chrome-auth-avatar" style="background:url(/assets/shop/avatars-v4/avatar-starling.svg?v=20261114-avatar5) center/cover no-repeat"></div>'+
     '<p class="chrome-auth-who"></p><button type="button" class="chrome-auth-signout">'+
     L('Sign out','退出登录')+'</button></div>')+
   '<form class="chrome-auth-form" novalidate>'+
    (reg?field('displayName',L('Nickname','昵称'),'text','maxlength="64" autocomplete="nickname"'):'')+
    field('email',L('Email','邮箱'),'email','autocomplete="username"')+
    field('password',L('Password','密码'),'password',reg?'autocomplete="new-password"':'autocomplete="current-password"')+
    (reg?field('confirmation',L('Confirm password','确认密码'),'password','autocomplete="new-password"'):'')+
    '<p class="chrome-auth-error" role="alert"></p>'+
    '<button type="submit" class="chrome-auth-submit">'+
     (reg?L('Create account','创建账号'):L('Sign in','登录'))+'</button>'+
   '</form>'+
   '<p class="chrome-auth-switch">'+(reg
    ?L('Already have an account? <a href="#" data-auth-switch="login">Sign in</a>','已有账号？<a href="#" data-auth-switch="login">去登录</a>')
    :L('New to JoyFlock? <a href="#" data-auth-switch="register">Create a free account</a>','还没有账号？<a href="#" data-auth-switch="register">免费注册</a>'))+'</p>';
  document.body.append(d);
  d.querySelector('.chrome-auth-close').addEventListener('click',function(){d.close();});
  d.addEventListener('click',function(e){if(e.target===d)d.close();});
  d.querySelector('.chrome-auth-form').addEventListener('submit',submit);
  d.querySelector('.chrome-auth-switch').addEventListener('click',function(e){
   var a=e.target.closest('[data-auth-switch]');
   if(a){e.preventDefault();open(a.dataset.authSwitch);}
  });
  var so=d.querySelector('.chrome-auth-signout');
  if(so)so.addEventListener('click',signout);
  return d;
 }

 function closeAll(){
  Object.keys(dialogs).forEach(function(k){if(dialogs[k].open)dialogs[k].close();});
 }
 function checkSession(d){
  session().then(function(me){
   if(!d.open)return;
   if(me.account){
    d.querySelector('.chrome-auth-form').hidden=true;
    var s=d.querySelector('.chrome-auth-signed');s.hidden=false;
    s.querySelector('.chrome-auth-who').textContent=t('Signed in as ','已登录：')+me.account.displayName;
    var portrait=s.querySelector('.chrome-auth-avatar');portrait.textContent='';
    // This shell is a classic script; load the same resolver used by rooms.
    portrait.dataset.accountId=String(me.account.id||'');
    import('/avatar.js?v=20261114-avatar5').then(function(module){
     if(d.open&&portrait.dataset.accountId===String(me.account.id||''))
      module.applyAvatar(portrait,Object.assign({},me.appearance,{isSelf:true,signedIn:true}));
    }).catch(function(){});
    setLabel(me.account.displayName);
   }else resetLabel();
  }).catch(function(){});
 }
 function open(kind){
  kind=kind==='register'?'register':'login';
  var d=dialogs[kind]||(dialogs[kind]=build(kind));
  var other=dialogs[kind==='login'?'register':'login'];
  var form=d.querySelector('.chrome-auth-form');
  applyPlaceholders();
  d.querySelector('.chrome-auth-error').textContent='';
  if(kind==='login'){
   var signed=d.querySelector('.chrome-auth-signed');
   // An existing session opens straight into the account card, no form flash.
   form.hidden=document.body.classList.contains('chrome-signed');
   signed.hidden=!form.hidden;
  }
  // Show the new dialog first, then retire the old one: the backdrop never blinks.
  if(!d.open)d.showModal();
  if(other&&other.open)other.close();
  var first=d.querySelector('.chrome-auth-form input');
  if(first&&!form.hidden)first.focus();
  if(kind==='login')checkSession(d);
 }

 function submit(event){
  event.preventDefault();
  var form=event.currentTarget,d=form.closest('.chrome-auth'),kind=d.dataset.kind;
  var values={};new FormData(form).forEach(function(v,k){values[k]=typeof v==='string'?v:'';});
  var err=d.querySelector('.chrome-auth-error');err.textContent='';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email||'')){
   err.textContent=t('Enter a valid email address.','请输入完整的邮箱地址。');return;
  }
  if((values.password||'').length<8){
   err.textContent=t('Password must be at least 8 characters.','密码至少需要 8 位。');return;
  }
  if(kind==='register'){
   if(!(values.displayName||'').trim()){err.textContent=t('Enter a nickname to register.','注册请填写昵称。');return;}
   if(values.password!==values.confirmation){err.textContent=t('Passwords do not match.','两次输入的密码不一致。');return;}
  }
  var buttons=form.querySelectorAll('button');
  for(var i=0;i<buttons.length;i++)buttons[i].disabled=true;
  var payload={email:values.email,password:values.password};
  if(kind==='register')payload.displayName=values.displayName.trim();
  session()
   .then(function(){return api('/api/auth/'+kind,payload);})
   .then(function(){return session();})
   .then(function(me){
    setLabel(me.account?me.account.displayName:t('Account','账号'));
    closeAll();form.reset();notifyGame();
   })
   .catch(function(e){
    var status=e&&e.message==='HTTP 409'?'409':e&&e.message==='HTTP 401'?'401':'';
    err.textContent=status==='409'?t('This email is already registered.','该邮箱已被注册。'):
     status==='401'?t('Email or password is incorrect.','邮箱或密码不正确。'):
     t('Sign-in failed. Check your details and try again.','登录或注册未成功，请检查信息后重试。');
   })
   .then(function(){for(var j=0;j<buttons.length;j++)buttons[j].disabled=false;});
 }
 function signout(){
  api('/api/auth/logout',{}).catch(function(){}).then(function(){
   resetLabel();closeAll();notifyGame();
  });
 }

 signin.addEventListener('click',function(){open('login');});
 if(signup)signup.addEventListener('click',function(){open('register');});
 // Placeholders are attributes, so they cannot follow the CSS locale switch
 // on their own; keep them in sync whenever the document language changes.
 new MutationObserver(function(){applyPlaceholders();})
  .observe(document.documentElement,{attributes:true,attributeFilter:['data-locale']});

 window.addEventListener('message',function(event){
  if(event.origin!==location.origin)return;
  var data=event.data;
  // Any account entry left inside the embedded game asks the shell to open
  // this same pair of dialogs instead of its legacy #auth form.
  if(data?.type==='joyflock:auth-request'){open(data.mode==='register'?'register':'login');return;}
 if(data?.type!=='joyflock:controls'||typeof data.account!=='string')return;
 var name=data.account.trim();
 // Keep the server-confirmed label untouched until the game reports a real
 // account state; never turn a connection message into a signed-in identity.
 if(TRANSIENT.test(name))return;
 // The iframe reports its own account state for the floating controls. It is
 // only a display hint: never let a stale "Sign in" from a game overwrite the
 // server-confirmed cache that the first frame depends on.
 if(name&&!/^(登录|登录 \/ 注册|Sign in|Sign in \/ Register|游客|Guest)$/.test(name))renderSigned(name);
 else renderGuest();
 });

 // Another tab signing in or out updates the cached name; follow it without
 // writing back (which would ping-pong storage events between tabs).
 window.addEventListener('storage',function(event){
  if(event.key!==CACHE_KEY)return;
  var name=event.newValue;
  if(name&&name!=='0'){renderSigned(name);announce(name);}else{renderGuest();announce(null);}
 });

 // The server is authoritative: a quiet read-only check reconciles the first
 // frame with the real session (no guest session is created here). A stale
 // cached nickname after a sign-out on another device is corrected here.
 // The <head> bootstrap started this request before any stylesheet or defer
 // script, so on a first visit the neutral placeholder resolves quickly.
 var meLookup=window.__joyflockMe||fetch('/api/me',{credentials:'same-origin',cache:'no-store'})
  .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();});
 meLookup.then(function(me){
  if(me&&me.account&&me.account.displayName)setLabel(me.account.displayName);
  else resetLabel();
 }).catch(function(e){
  // The <head> probe already proved /api/ is absent. Reuse that verdict for
  // session() so opening the login dialog does not fire a second csrf 404.
  // Only a missing endpoint (404) is cached: 401/403 are ordinary auth
  // responses and must never block a real sign-in.
  if(/HTTP 404$/.test(e&&e.message||''))rememberDown(e);
  // A failed lookup must not erase a server-confirmed session. Only fall back
  // to the guest label when the first frame is still a neutral placeholder.
  if(signin.classList.contains('chrome-account-pending'))renderGuest();
 });
})();
