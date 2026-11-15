// One document: share the game's existing account UI, language, wallet and audio.
const root=document.documentElement,stage=document.getElementById('native-game-stage');
const language=document.getElementById('native-language'),account=document.getElementById('native-account');
const fullscreen=document.getElementById('native-fullscreen');
const kind=root.dataset.nativeGame,game=kind==='flight'?'flight':new URLSearchParams(location.search).get('game')||'four';
for(const link of document.querySelectorAll('[data-native-link]'))if(link.dataset.nativeLink===game)link.setAttribute('aria-current','page');
function sync(){
 const locale=root.dataset.locale==='zh'?'zh':'en';language.value=locale;
 language.setAttribute('aria-label',locale==='zh'?'语言':'Language');
 account.textContent=document.getElementById('account-open')?.textContent.trim()||'—';
 document.querySelector('.native-rail').setAttribute('aria-label',locale==='zh'?'游戏列表':'Game list');
 for(const link of document.querySelectorAll('[data-native-link]'))link.setAttribute('aria-label',link.querySelector(locale==='zh'?'.native-zh':'.native-en').textContent);
 const current=document.querySelector('[data-native-link][aria-current="page"]');
 if(current)document.title=current.getAttribute('aria-label')+' — JoyFlock';
}
language.addEventListener('change',()=>{
 const locale=language.value==='zh'?'zh':'en';
 try{localStorage.setItem('joyflock-portal-language',locale);}catch{}
 root.dataset.locale=locale;root.lang=locale==='zh'?'zh-CN':'en';
 window.dispatchEvent(new CustomEvent('joyflock:native-locale',{detail:locale}));
 sync();
});
account.addEventListener('click',()=>document.getElementById('account-open')?.click());
const observer=new MutationObserver(sync);
observer.observe(root,{attributes:true,attributeFilter:['data-locale']});
const nativeAccount=document.getElementById('account-open');
if(nativeAccount)observer.observe(nativeAccount,{subtree:true,childList:true,characterData:true});
let expanded=false,lastScreen;
function syncFullscreen(){
 const full=Boolean(document.fullscreenElement)||expanded;
 fullscreen.setAttribute('aria-pressed',String(full));
 const zh=root.dataset.locale==='zh';fullscreen.textContent=full?(zh?'退出全屏':'Exit fullscreen'):(zh?'全屏':'Fullscreen');
 if(full)document.body.dataset.gameFullscreen='1';else delete document.body.dataset.gameFullscreen;
 window.dispatchEvent(new CustomEvent('joyflock:native-fullscreen',{detail:full}));
}
async function exit(){expanded=false;stage.classList.remove('native-expanded');if(document.fullscreenElement===stage)try{await document.exitFullscreen();}catch{}syncFullscreen();}
async function enter(){expanded=true;stage.classList.add('native-expanded');syncFullscreen();
 if(!document.fullscreenElement&&document.fullscreenEnabled&&navigator.userActivation?.isActive)try{await stage.requestFullscreen();expanded=false;stage.classList.remove('native-expanded');}catch{}
 syncFullscreen();
}
function toggle(){if(expanded||document.fullscreenElement)void exit();else void enter();}
fullscreen.addEventListener('click',toggle);
window.addEventListener('joyflock:native-toggle-fullscreen',toggle);
document.addEventListener('fullscreenchange',syncFullscreen);
document.addEventListener('keydown',event=>{if(event.key==='Escape')void exit();});
function syncScreen(){
 const play=kind==='flight'?!document.getElementById('play')?.classList.contains('hidden'):document.body.dataset.screen==='play';
 if(play===lastScreen)return;lastScreen=play;if(play)void enter();else void exit();
}
new MutationObserver(syncScreen).observe(kind==='flight'?document.getElementById('play'):document.body,{attributes:true,attributeFilter:kind==='flight'?['class']:['data-screen']});
new MutationObserver(syncFullscreen).observe(root,{attributes:true,attributeFilter:['data-locale']});
sync();syncScreen();syncFullscreen();
