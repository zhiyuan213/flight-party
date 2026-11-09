import {bindPoolFullscreen} from './pool-fullscreen.js?v=20261106-layout';
const gameOrigin=['localhost','127.0.0.1'].includes(location.hostname)?location.origin:'https://flight.joyflock.com';
const games=[
 {id:'pool',image:'/assets/covers/pool.jpg?v=20261109-poolorig1',name:'欢乐台球',en:'Pool',icon:'❽',color:'green',detail:'2人 · 休闲台球',live:true},
 {id:'flight',name:'飞行棋',en:'Flight Party',icon:'✈',color:'blue',image:'/assets/plane-vip-gold-body.png',detail:'2–4人 · 好友联机',live:true},
 {id:'four',image:'/assets/covers/four.jpg',name:'四子连珠',en:'Connect Four',icon:'●',color:'coral',detail:'2人 · 单机 / 联机',live:true},
 {id:'gomoku',image:'/assets/covers/gomoku.jpg',name:'五子棋',en:'Gomoku',icon:'✚',color:'amber',detail:'2人 · 单机 / 联机',live:true},
 {id:'chess',image:'/assets/covers/chess.jpg',name:'国际象棋',en:'Chess',icon:'♞',color:'purple',detail:'2人 · 单机 / 联机',live:true},
 {id:'xo',image:'/assets/covers/xo.svg?v=20261109-xofull2',name:'井字棋',en:'Tic-tac-toe',icon:'×',color:'violet',detail:'2人 · 单机 / 联机',live:true},
 {id:'cards',image:'/assets/covers/cards.jpg',name:'欢乐纸牌',en:'Cards',icon:'♠',color:'pink',detail:'2人 · 颜色数字接龙',live:true},
 {id:'snooker',image:'/assets/covers/snooker.jpg',name:'斯诺克',en:'Snooker',icon:'●',color:'green',detail:'2人 · 单机 / 联机',live:true},
 {id:'bubbles',image:'/assets/covers/bubbles.jpg?v=20261109-coverhd1',name:'泡泡射击',en:'Bubble Shooter',icon:'●',color:'violet',detail:'双人对战 · 电脑 / 联机',live:true},
];
const selected=new URLSearchParams(location.search).get('game'),active=games.find(g=>g.id===selected&&g.live);
const languageMenu=document.querySelector('#portal-language');
// The synchronous <head> bootstrap resolves the stored language before the
// first paint; both translations are already in the HTML and switched by CSS.
let language=document.documentElement.getAttribute('data-locale')==='zh'?'zh':'en';
if(!document.documentElement.getAttribute('data-locale')){
  try{if(localStorage.getItem('joyflock-portal-language')==='zh')language='zh';}catch{}
}
const translate=(en,zh)=>language==='zh'?zh:en;
const gameName=game=>translate(game.en,game.name);
const fullscreenLabels=full=>full
 ?[translate('Exit fullscreen','退出全屏'),translate('Exit fullscreen (Esc)','退出全屏（Esc）')]
 :[translate('Fullscreen','全屏'),translate('Fullscreen','全屏')];
let syncFullscreen=()=>{
 const button=document.querySelector('#fullscreen');
 const full=Boolean(document.fullscreenElement);
 [button.textContent,button.title]=fullscreenLabels(full);
 button.setAttribute('aria-pressed',String(full));
};
// Mirror the header's first-frame account state so the floating in-game
// control never flashes "Sign in" for a visitor who is already signed in.
const cachedAccount=()=>{try{const n=localStorage.getItem('joyflock.accountName');return n&&n!=='0'?n:null;}catch{return null;}};
let accountLabel=cachedAccount()||'';
function updateLanguage(){
 document.documentElement.lang=translate('en','zh-CN');
 document.documentElement.setAttribute('data-locale',language);
 languageMenu.value=language;
 languageMenu.setAttribute('aria-label',translate('Language','语言'));
 document.title=active?gameName(active)+' — JoyFlock':translate('JoyFlock — Nine games in your browser','JoyFlock — 九款游戏，打开就能玩');
 const account=document.querySelector('[data-control=account]');
 account.textContent=accountLabel==='登录'?translate('Sign in','登录'):accountLabel==='登录 / 注册'?translate('Sign in / Register','登录 / 注册'):accountLabel;
 document.querySelector('[data-control=sound]').setAttribute('aria-label',translate('Toggle sound','开关音效'));
 if(!active)return;
 document.querySelector('#game-frame').title=gameName(active);
 document.querySelector('.stage-toolbar b').textContent=gameName(active);
 const players=active.id==='flight'?['2–4 players','2–4人']:['2 players','2人'];
 document.querySelector('.stage-caption').textContent=translate(players[0],active.en+' · '+players[1]);
 document.querySelector('.game-rail').setAttribute('aria-label',translate('Game list','游戏列表'));
 document.querySelector('.game-rail .back').title=translate('Back to game lobby','返回游戏大厅');
 Array.from(document.querySelector('#rail-items').children).forEach((item,i)=>{
  item.title=gameName(games[i]);
  item.setAttribute('aria-label',item.title);
 });
 syncFullscreen();
}
// The shared header announces a confirmed sign-in/out; keep the floating
// control in step without waiting for the iframe to re-report its state.
const syncAccountLabel=name=>{accountLabel=name||'登录';updateLanguage();};
window.addEventListener('joyflock:account-changed',event=>syncAccountLabel(event.detail?.name));
window.addEventListener('storage',event=>{
 if(event.key!=='joyflock.accountName')return;
 syncAccountLabel(cachedAccount());
});
const art=g=>g.image?`<img src="${g.image}" alt="" draggable="false">`:`<span class="game-symbol">${g.icon}</span>`;
// Game covers are static HTML, so the lobby is complete on the first frame.
if(active){
 document.querySelector('#home').hidden=true;document.querySelector('#play').hidden=false;document.body.classList.add('playing');
 document.querySelector('#rail-items').innerHTML=games.map(g=>g.live?`<a href="?game=${g.id}" class="rail-game ${active.id===g.id?'selected':''} ${g.color}" title="${g.name}" aria-label="${g.name}" ${active.id===g.id?'aria-current="page"':''}>${art(g)}</a>`:`<span class="rail-game ${g.color} unavailable" title="${g.name} · 即将上线" aria-label="${g.name}，即将上线">${g.icon}</span>`).join('');
 bindRailMagnification(document.querySelector('#rail-items'));
 const sharedTheme=new URLSearchParams(location.search).get('theme');
 const themeSuffix=sharedTheme?'&theme='+encodeURIComponent(sharedTheme):'';
 const localeSuffix='&locale='+language;
 document.querySelector('#game-frame').src=active.id==='flight'?gameOrigin+'/?embed=joyflock'+themeSuffix+localeSuffix:gameOrigin+'/table/index.html?game='+active.id+'&embed=joyflock'+themeSuffix+localeSuffix;
}
if(active){
 syncFullscreen=bindPoolFullscreen({document,window,stage:document.querySelector('.game-stage'),button:document.querySelector('#fullscreen'),frame:document.querySelector('#game-frame'),gameOrigin,game:active.id,labels:fullscreenLabels});
}

const controls=document.querySelector('#portal-controls'),frame=document.querySelector('#game-frame');
if(active){
 controls.hidden=false;
 // The shared header already owns language and account. This floating
 // in-game language/sound pair was a duplicate, so never show either button.
 // Keep the nodes in the DOM: the iframe still reports its locale/sound state
 // into them, and site-hover-sfx reads the sound switch's hidden flag.
 controls.querySelector('[data-control=language]').hidden=true;
 controls.querySelector('[data-control=sound]').hidden=true;
 // The matchmaking notice lives in the portal, not in the iframe: only here
 // can it be pinned to the very top of the viewport, above the header.
 const matchBox=document.createElement('div');
 matchBox.className='portal-match-box';matchBox.hidden=true;
 matchBox.setAttribute('role','status');matchBox.setAttribute('aria-live','polite');
 matchBox.innerHTML=`
    <div class="pm-spinner" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="#c9d8ff" stroke-width="1.8" stroke-linecap="round">
        <circle cx="12" cy="12" r="8.5" opacity=".45"/>
        <path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5" stroke="#ffffff" stroke-width="2.4"/>
        <circle cx="12" cy="12" r="2.4" fill="#ffffff" stroke="none"/>
      </svg>
    </div>
    <div class="pm-copy">
      <div class="pm-title">正在寻找对局</div>
      <div class="pm-meta"><span class="pm-timer">0:00</span> · <span>预计等待</span> <b class="pm-eta">-</b></div>
    </div>
    <button class="pm-close" type="button" aria-label="取消匹配">×</button>`;
 document.body.append(matchBox);
 matchBox.querySelector('.pm-close').addEventListener('click',()=>{
  matchBox.hidden=true;
  frame.contentWindow?.postMessage({type:'joyflock:match-cancel'},gameOrigin);
 });
 window.addEventListener('message',event=>{
  if(event.origin!==gameOrigin||event.source!==frame.contentWindow)return;
  const data=event.data;
  if(data?.type!=='joyflock:match')return;
  if(data.visible===false){matchBox.hidden=true;return;}
  if(typeof data.title==='string')matchBox.querySelector('.pm-title').textContent=data.title.slice(0,60);
  matchBox.querySelector('.pm-timer').textContent=String(data.timer??'0:00').slice(0,12);
  matchBox.querySelector('.pm-eta').textContent=String(data.eta??'-').slice(0,12);
  matchBox.hidden=false;
 });
 const hello=()=>{frame.contentWindow?.postMessage({type:'joyflock:hello',locale:language},gameOrigin);frame.contentWindow?.postMessage({type:'joyflock:match-host'},gameOrigin);};frame.addEventListener('load',hello);
 controls.addEventListener('click',event=>{const action=event.target.closest('[data-control]')?.dataset.control;if(action)frame.contentWindow?.postMessage({type:'joyflock:control',action},gameOrigin);});
 window.addEventListener('message',event=>{if(event.origin!==gameOrigin||event.source!==frame.contentWindow||event.data?.type!=='joyflock:controls')return;const data=event.data;if(typeof data.account==='string'&&accountLabel!==data.account.slice(0,80)){accountLabel=data.account.slice(0,80);updateLanguage();}if(typeof data.language==='string')controls.querySelector('[data-control=language]').textContent=data.language.slice(0,80);const sound=controls.querySelector('[data-control="sound"]');sound.textContent=data.sound?'♫':'♩';sound.setAttribute('aria-pressed',String(data.sound===true));});
 hello();
 window.addEventListener('message',event=>{
  if(event.origin!==gameOrigin||event.source!==frame.contentWindow)return;
  if(event.data?.type!=='joyflock:theme'||typeof event.data.theme!=='string')return;
  const value=event.data.theme;
  if(value==='classic')delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme=value;
 });
}


languageMenu.addEventListener('change',()=>{
 language=languageMenu.value==='zh'?'zh':'en';
 try{localStorage.setItem('joyflock-portal-language',language);}catch{}
 updateLanguage();
 if(active)frame.contentWindow?.postMessage({type:'joyflock:locale',locale:language},gameOrigin);
});
updateLanguage();

function bindRailMagnification(rail) {
 const desktop=matchMedia('(min-width: 601px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
 const icons=Array.from(rail.children);
 const reset=()=>icons.forEach(icon=>{
  icon.style.removeProperty('--dock-scale');
  icon.style.removeProperty('--dock-shift');
  icon.style.removeProperty('--dock-layer');
 });
 rail.addEventListener('pointermove',event=>{
  if(!desktop.matches||event.pointerType==='touch')return;
  const y=event.clientY-rail.getBoundingClientRect().top;
  const centers=icons.map(icon=>icon.offsetTop+icon.offsetHeight/2);
  const scales=centers.map(center=>1+Math.max(0,1-Math.abs(y-center)/130)**2);
  const expansion=scales.map((scale,i)=>(scale-1)*icons[i].offsetHeight);
  const anchor=centers.reduce((nearest,center,i)=>Math.abs(center-y)<Math.abs(centers[nearest]-y)?i:nearest,0);
  let shift=-expansion.slice(0,anchor).reduce((sum,height)=>sum+height,0)-expansion[anchor]/2;
  icons.forEach((icon,i)=>{
   icon.style.setProperty('--dock-scale',scales[i]);
   icon.style.setProperty('--dock-shift',(shift+expansion[i]/2)+'px');
   icon.style.setProperty('--dock-layer',Math.round(scales[i]*100));
   shift+=expansion[i];
  });
 });
 rail.addEventListener('pointerleave',reset);
 rail.addEventListener('pointercancel',reset);
 desktop.addEventListener('change',reset);
}
