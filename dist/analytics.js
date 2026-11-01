// Optional first-party product measurement. No account, room, email or score data is sent.
export const MEASUREMENT_ID='G-9TB87S782E';
const preferenceKey='joyflock-analytics-consent';
const live=location.hostname==='flight.joyflock.com';
const allowedEvents=new Set(['quick_match','create_room','local_practice','game_start','game_end']);
let consent='unknown',loaded=false;
try{consent=localStorage.getItem(preferenceKey)||'unknown';}catch{}
function gtag(){window.dataLayer=window.dataLayer||[];window.dataLayer.push(arguments);}
function safeLocation(){return location.origin+(['/', '/membership.html','/terms.html','/privacy.html'].includes(location.pathname)?location.pathname:'/');}
function start(){
 if(!live||loaded||consent!=='granted')return;
 loaded=true;window['ga-disable-'+MEASUREMENT_ID]=false;
 window.gtag=gtag;
 gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
 gtag('js',new Date());
 let referrer='';try{referrer=new URL(document.referrer).origin+'/';}catch{}
 gtag('set',{page_location:safeLocation(),page_referrer:referrer});
 gtag('config',MEASUREMENT_ID,{page_location:safeLocation(),page_referrer:referrer,allow_google_signals:false,allow_ad_personalization_signals:false,cookie_expires:60*60*24*30,debug_mode:new URLSearchParams(location.search).get('analytics_debug')==='1'});
 const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+MEASUREMENT_ID;document.head.append(script);
}
function clearAnalyticsCookies(){
 for(const item of document.cookie.split(';')){
  const name=item.trim().split('=')[0];if(!/^_ga(?:_|$)/.test(name))continue;
  for(const domain of ['',location.hostname,'.'+location.hostname,'.joyflock.com'])document.cookie=name+'=; Max-Age=0; Path=/'+(domain?'; Domain='+domain:'')+'; SameSite=Lax; Secure';
 }
}
function setConsent(value){
 consent=value;try{localStorage.setItem(preferenceKey,value);}catch{}
 if(value==='granted'){
  window['ga-disable-'+MEASUREMENT_ID]=false;
  if(loaded)gtag('consent','update',{analytics_storage:'granted'});else start();
 }else{
  if(loaded)gtag('consent','update',{analytics_storage:'denied'});
  window['ga-disable-'+MEASUREMENT_ID]=true;clearAnalyticsCookies();
 }
 render();
}
export function track(name,mode){
 if(!live||consent!=='granted'||!loaded||!allowedEvents.has(name))return;
 const params={};if(['quick','friends','local'].includes(mode))params.game_mode=mode;
 gtag('event',name,params);
}
function render(){
 const zh=document.documentElement.lang.startsWith('zh');
 let panel=document.getElementById('analytics-choice');
 if(!panel&&document.querySelector('.hero-copy')){
  panel=document.createElement('section');panel.id='analytics-choice';panel.className='analytics-choice';
  panel.innerHTML='<p></p><div><button type="button" data-analytics="granted"></button><button type="button" data-analytics="denied"></button></div>';
  document.querySelector('.hero-copy').append(panel);
  panel.addEventListener('click',e=>{const value=e.target.closest('[data-analytics]')?.dataset.analytics;if(value)setConsent(value);});
 }
 if(panel){panel.hidden=consent!=='unknown';panel.querySelector('p').textContent=zh?'允许 Google Analytics 统计访问和游戏使用情况？不发送账号、昵称或房间信息。':'Allow Google Analytics to measure visits and game usage? Account, nickname and room data are excluded.';panel.querySelector('[data-analytics="granted"]').textContent=zh?'允许统计':'Allow analytics';panel.querySelector('[data-analytics="denied"]').textContent=zh?'仅必要功能':'Essential only';}
 let row=document.getElementById('analytics-setting');
 if(!row&&document.querySelector('#settings-dialog form')){
  row=document.createElement('label');row.id='analytics-setting';row.className='setting-row';row.innerHTML='<span></span><input id="analytics-enabled" type="checkbox">';
  const form=document.querySelector('#settings-dialog form');form.insertBefore(row,form.querySelector('button.primary'));
  row.querySelector('input').addEventListener('change',e=>setConsent(e.target.checked?'granted':'denied'));
 }
 if(row){row.querySelector('span').textContent=zh?'可选访问统计（Google Analytics）':'Optional usage analytics (Google Analytics)';row.querySelector('input').checked=consent==='granted';}
}
if(live){
 start();render();new MutationObserver(render).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
 document.addEventListener('click',e=>{const id=e.target.closest('button')?.id;if(id==='quick-match-preview')track('quick_match');if(id==='create')track('create_room');if(id==='practice')track('local_practice');});
}
