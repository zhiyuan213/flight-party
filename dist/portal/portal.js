const gameOrigin=['localhost','127.0.0.1'].includes(location.hostname)?location.origin:'https://flight.joyflock.com';
const games=[
 {id:'flight',name:'飞行棋',en:'Flight Party',icon:'✈',color:'blue',image:'/assets/plane-vip-gold-body.png',detail:'2–4人 · 好友联机',live:true},
 {id:'four',image:'/assets/covers/four.jpg',name:'四子连珠',en:'Connect Four',icon:'●',color:'coral',detail:'2人 · 单机 / 联机',live:true},
 {id:'gomoku',image:'/assets/covers/gomoku.jpg',name:'五子棋',en:'Gomoku',icon:'✚',color:'amber',detail:'2人 · 单机 / 联机',live:true},
 {id:'puzzle',image:'/assets/covers/puzzle.jpg',name:'趣味拼图',en:'Puzzles',icon:'▧',color:'cyan',detail:'单机 · 双人协作',live:true},
 {id:'chess',image:'/assets/covers/chess.jpg',name:'国际象棋',en:'Chess',icon:'♞',color:'purple',detail:'2人 · 单机 / 联机',live:true},
 {id:'draw',image:'/assets/covers/draw.jpg',name:'你画我猜',en:'Draw & Guess',icon:'✎',color:'violet',detail:'2人 · 绘画 / 猜词',live:true},
 {id:'cards',image:'/assets/covers/cards.jpg',name:'欢乐纸牌',en:'Cards',icon:'♠',color:'pink',detail:'2人 · 颜色数字接龙',live:true},
 {id:'pool',image:'/assets/covers/pool.jpg',name:'欢乐台球',en:'Pool',icon:'❽',color:'green',detail:'2人 · 休闲台球',live:true},
];
const selected=new URLSearchParams(location.search).get('game'),active=games.find(g=>g.id===selected&&g.live);
const art=g=>g.image?`<img src="${g.image}" alt="" draggable="false">`:`<span class="game-symbol">${g.icon}</span>`;
document.querySelector('#cards').innerHTML=games.map(g=>`<${g.live?`a href="?game=${g.id}"`:'article'} class="game-card ${g.color} ${g.live?'live':'soon'}"><div class="card-art">${art(g)}<span class="card-label">${g.live?'立即开玩':'即将上线'}</span></div><div class="card-copy"><h3>${g.name}<span>${g.live?'↗':'＋'}</span></h3><p>${g.detail}</p></div></${g.live?'a':'article'}>`).join('');
if(active){
 document.querySelector('#home').hidden=true;document.querySelector('#play').hidden=false;document.body.classList.add('playing');document.title=active.name+' — JoyFlock';document.querySelector('#game-frame').title=active.name;document.querySelector('.stage-toolbar b').textContent=active.name;document.querySelector('.stage-caption').textContent=active.en+' · '+(active.id==='flight'?'2–4人':'2人');document.querySelector('#game-home').textContent='← 返回'+active.name+'首页';
 document.querySelector('#rail-items').innerHTML=games.map(g=>g.live?`<a href="?game=${g.id}" class="rail-game ${active.id===g.id?'selected':''} ${g.color}" title="${g.name}" aria-label="${g.name}" ${active.id===g.id?'aria-current="page"':''}>${art(g)}</a>`:`<span class="rail-game ${g.color} unavailable" title="${g.name} · 即将上线" aria-label="${g.name}，即将上线">${g.icon}</span>`).join('');
 // Keep the game origin and its own room-sharing URLs intact.
 document.querySelector('#game-frame').src=active.id==='flight'?gameOrigin+'/?embed=joyflock':gameOrigin+'/table/index.html?game='+active.id+'&embed=joyflock';document.querySelector('.stage-toolbar a').href=active.id==='flight'?gameOrigin+'/':gameOrigin+'/table/index.html?game='+active.id;
}
document.querySelector('#fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('.game-stage').requestFullscreen();}catch{window.open(document.querySelector('.stage-toolbar a').href,'_blank','noopener');}});

const controls=document.querySelector('#portal-controls'),frame=document.querySelector('#game-frame');
if(active){
 controls.hidden=false;if(active.id!=='flight'){controls.querySelector('[data-control=language]').hidden=true;controls.querySelector('[data-control=sound]').hidden=true;}document.querySelector('.topbar>.account').hidden=true;
 const hello=()=>frame.contentWindow?.postMessage({type:'joyflock:hello'},gameOrigin);frame.addEventListener('load',hello);
 controls.addEventListener('click',event=>{const action=event.target.closest('[data-control]')?.dataset.control;if(action)frame.contentWindow?.postMessage({type:'joyflock:control',action},gameOrigin);});
 window.addEventListener('message',event=>{if(event.origin!==gameOrigin||event.source!==frame.contentWindow||event.data?.type!=='joyflock:controls')return;const data=event.data;for(const key of ['account','language'])if(typeof data[key]==='string')controls.querySelector(`[data-control="${key}"]`).textContent=data[key].slice(0,80);const sound=controls.querySelector('[data-control="sound"]');sound.textContent=data.sound?'♫':'♩';sound.setAttribute('aria-pressed',String(data.sound===true));});
 hello();
}
document.querySelector('#game-home').addEventListener('click',()=>frame.contentWindow?.postMessage({type:'joyflock:control',action:'home'},gameOrigin));
