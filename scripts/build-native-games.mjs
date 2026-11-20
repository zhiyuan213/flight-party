import {readFileSync,writeFileSync} from 'node:fs';

// Compose the existing game documents at authoring time. Runtime stays buildless:
// one document, one origin, ordinary module imports, no fetched HTML or iframe.
const games=[['pool','Pool','欢乐台球','pool.jpg'],['nineball','Nine-ball','欢乐九球','nineball.jpg'],['flight','Flight Party','飞行棋',null],['four','Connect Four','四子连珠','four.jpg'],['gomoku','Gomoku','五子棋','gomoku.jpg'],['chess','Chess','国际象棋','chess.jpg'],['xo','Tic-tac-toe','井字棋','xo.svg'],['cards','Cards','欢乐纸牌','cards.jpg'],['snooker','Snooker','斯诺克','snooker.jpg'],['bubbles','Bubble Shooter','泡泡射击','bubbles.jpg']];
const text=(en,zh)=>`<span class="native-en">${en}</span><span class="native-zh">${zh}</span>`;
const shell=`<header class="native-topbar topbar"><a class="native-brand brand" href="/"><span class="brand-mark">✦</span>JoyFlock</a><nav><a class="active" href="/">${text('Games','游戏')}</a><a href="/shop.html">${text('Shop','商城')}</a></nav><div class="top-actions"><select id="portal-language" class="portal-language" aria-label="Language"><option value="en">English</option><option value="zh">中文</option></select><button id="chrome-account" class="chrome-account" type="button"><span class="lang-en">Sign in</span><span class="lang-cn">登录</span></button><script>(function(){var n='';try{n=localStorage.getItem('joyflock.accountName')||'';}catch(e){}if(!n||n==='0'){n='';try{var p=document.cookie.split(';');for(var i=0;i<p.length;i++){var q=p[i].trim();if(q.indexOf('joyflock_account=')===0){n=decodeURIComponent(q.slice(17));break;}}}catch(e){}}if(n&&n!=='0'){var b=document.getElementById('chrome-account');if(b){b.textContent=n;b.title=n;}document.body.classList.add('chrome-signed');}})();</script><button id="fullscreen" class="site-fullscreen" type="button" aria-pressed="false">${text('Fullscreen','全屏')}</button></div></header><aside class="native-rail game-rail" aria-label="Game list"><div id="rail-items">${games.map(([id,en,zh,cover])=>`<a class="native-rail-game rail-game" data-native-link="${id}" href="/?game=${id}" aria-label="${en}">${cover?`<img src="/assets/covers/${cover}" alt="" draggable="false">`:'<img src="/assets/plane-vip-gold-body.png" alt="" draggable="false">'}<span class="native-rail-name">${text(en,zh)}</span></a>`).join('')}</div></aside>`;
const bootstrap=`<script>(function(){var r=document.documentElement,l=new URLSearchParams(location.search).get('locale');if(l!=='en'&&l!=='zh'){l='en';try{if(localStorage.getItem('joyflock-portal-language')==='zh')l='zh';}catch(e){}}r.lang=l==='en'?'en':'zh-CN';r.setAttribute('data-locale',l);if(r.dataset.nativeGame==='flight')r.setAttribute('data-flight-translating','1');})();</script>`;

export function composeNativeGame(source,kind){
 const base=kind==='table'?'/table/':'/';
 let html=source.replace(/\b(src|href)="([^"#][^"]*)"/g,(all,attr,value)=>{
  if(/^(?:\/|https?:|data:|mailto:)/.test(value))return all;
  return `${attr}="${new URL(value,'https://joyflock.invalid'+base).pathname}${new URL(value,'https://joyflock.invalid'+base).search}"`;
 });
 html=html.replace('<html ',`<html data-native-game="${kind}" `)
  .replace('<head>','<head>'+bootstrap)
  .replace('</head>','<link rel="stylesheet" href="/portal/native-game.css?v=20261115-restore1&nl=20261117-noline1"><link rel="stylesheet" href="/site-chrome.css?v=20261112-gamelanes1&d=20261115-topbar1&r=20261115-squareall1&p=20261116-nospace1&f=20261116-noframe1&pre=20261117-prelive1"><link rel="stylesheet" href="/site-language.css?v=20261114-noarrow1"><link rel="stylesheet" href="/site-fullscreen.css?v=20261115-joincoin1&d=20261115-fspill1"><script defer src="/portal-language-ui.js?v=20261114-noarrow1&audio=20261115-levels1"></script><script defer src="/site-pointer-fx.js?v=20261110-glove2"></script><script defer src="/site-account.js?v=20261112-gamelanes1&p=20261116-nospace1&pre=20261117-prelive1"></script></head>')
  .replace(/<body([^>]*)>/,`<body$1>${shell}<div id="native-game-stage">`)
  .replace(/<header>/,'<header class="native-game-header" aria-hidden="true" inert>')
  .replace('</body>','</div><script type="module" src="/portal/native-game.js?v=20261117-chrome1"></script></body>');
 if(kind==='table')html=html.replace("var l=new URLSearchParams(location.search).get('locale');","var l=document.documentElement.getAttribute('data-locale');");
 html=html.replace(/(src="\/(?:app\.js|table\/table\.js)\?[^"]*)"/g,'$1&native=20261115-native1"');
 return html.trimEnd()+"\n";
}
for(const [kind,input] of [['table','dist/table/index.html'],['flight','dist/index.html']]){
 writeFileSync(`dist/portal/native-${kind}.html`,composeNativeGame(readFileSync(input,'utf8'),kind));
}
