import {readFileSync,writeFileSync} from 'node:fs';

// Compose the existing game documents at authoring time. Runtime stays buildless:
// one document, one origin, ordinary module imports, no fetched HTML or iframe.
const games=[['pool','Pool','欢乐台球','pool.jpg'],['flight','Flight Party','飞行棋',null],['four','Connect Four','四子连珠','four.jpg'],['gomoku','Gomoku','五子棋','gomoku.jpg'],['chess','Chess','国际象棋','chess.jpg'],['xo','Tic-tac-toe','井字棋','xo.svg'],['cards','Cards','欢乐纸牌','cards.jpg'],['snooker','Snooker','斯诺克','snooker.jpg'],['bubbles','Bubble Shooter','泡泡射击','bubbles.jpg']];
const text=(en,zh)=>`<span class="native-en">${en}</span><span class="native-zh">${zh}</span>`;
const shell=`<header class="native-topbar topbar"><a class="native-brand" href="/">✦ JoyFlock</a><nav><a href="/">${text('Games','游戏')}</a><a href="/shop.html">${text('Shop','商城')}</a></nav><div class="top-actions"><select id="native-language" aria-label="Language"><option value="en">English</option><option value="zh">中文</option></select><button id="native-account" type="button">—</button><button id="native-fullscreen" type="button" aria-pressed="false">${text('Fullscreen','全屏')}</button></div></header><aside class="native-rail" aria-label="Game list">${games.map(([id,en,zh,cover])=>`<a class="native-rail-game" data-native-link="${id}" href="/?game=${id}" aria-label="${en}">${cover?`<img src="/assets/covers/${cover}" alt="" draggable="false">`:'<img src="/assets/plane-vip-gold-body.png" alt="" draggable="false">'}<span class="native-rail-name">${text(en,zh)}</span></a>`).join('')}</aside>`;
const bootstrap=`<script>(function(){var r=document.documentElement,l=new URLSearchParams(location.search).get('locale');if(l!=='en'&&l!=='zh'){l='en';try{if(localStorage.getItem('joyflock-portal-language')==='zh')l='zh';}catch(e){}}r.lang=l==='en'?'en':'zh-CN';r.setAttribute('data-locale',l);if(r.dataset.nativeGame==='flight')r.setAttribute('data-flight-translating','1');})();</script>`;

export function composeNativeGame(source,kind){
 const base=kind==='table'?'/table/':'/';
 let html=source.replace(/\b(src|href)="([^"#][^"]*)"/g,(all,attr,value)=>{
  if(/^(?:\/|https?:|data:|mailto:)/.test(value))return all;
  return `${attr}="${new URL(value,'https://joyflock.invalid'+base).pathname}${new URL(value,'https://joyflock.invalid'+base).search}"`;
 });
 html=html.replace('<html ',`<html data-native-game="${kind}" `)
  .replace('<head>','<head>'+bootstrap)
  .replace('</head>','<link rel="stylesheet" href="/portal/native-game.css?v=20261115-native1"></head>')
  .replace(/<body([^>]*)>/,`<body$1>${shell}<div id="native-game-stage">`)
  .replace(/<header>/,'<header class="native-game-header" aria-hidden="true" inert>')
  .replace('</body>','</div><script type="module" src="/portal/native-game.js?v=20261115-native1"></script></body>');
 if(kind==='table')html=html.replace("var l=new URLSearchParams(location.search).get('locale');","var l=document.documentElement.getAttribute('data-locale');");
 html=html.replace(/(src="\/(?:app\.js|table\/table\.js)\?[^"]*)"/g,'$1&native=20261115-native1"');
 return html.trimEnd()+"\n";
}
for(const [kind,input] of [['table','dist/table/index.html'],['flight','dist/index.html']]){
 writeFileSync(`dist/portal/native-${kind}.html`,composeNativeGame(readFileSync(input,'utf8'),kind));
}
