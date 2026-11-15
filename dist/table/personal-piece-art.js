/* Shared decoration only: team colours and X/O / black-white silhouettes are
 * always supplied by the game. The shop uses the exact same emblem paths. */
export const PIECE_PALETTES=Object.freeze({
  neon:Object.freeze({accent:'#4de2ff',light:'#dcfbff',deep:'#062f4a',metal:'#b9d3e8'}),
  jade:Object.freeze({accent:'#4be3a3',light:'#e0fff2',deep:'#08382a',metal:'#dec477'}),
  aurora:Object.freeze({accent:'#c79bff',light:'#f4e8ff',deep:'#2c1452',metal:'#ffda90'}),
  coral:Object.freeze({accent:'#ff9b9d',light:'#fff2df',deep:'#562b39',metal:'#efb183'}),
  pearl:Object.freeze({accent:'#c3c6f0',light:'#fffdf2',deep:'#303650',metal:'#e8ddbd'}),
  blossom:Object.freeze({accent:'#ff9ec7',light:'#fff0f6',deep:'#6e2540',metal:'#f7c4d8'}),
  heart:Object.freeze({accent:'#ff5f8f',light:'#ffe4ed',deep:'#5f1d32',metal:'#f5aec3'}),
  bow:Object.freeze({accent:'#ff7ab8',light:'#fff2f8',deep:'#64213d',metal:'#f6c3d8'}),
  diamond:Object.freeze({accent:'#ff69a9',light:'#ffecf4',deep:'#5a1f3a',metal:'#f9b9ce'}),
  candy:Object.freeze({accent:'#ff9bb5',light:'#fff1f7',deep:'#62203c',metal:'#f7c9da'})
});
const SHAPES={
  neon:[['M20 68C4 51 67 12 81 32C97 50 35 88 20 68Z','none','accent',3],
    ['M50 29L67 50L50 71L33 50Z','accent','light',2],
    ['M50 36L60 50L50 64L40 50Z','deep','none',0]],
  jade:[['M27 69C17 37 47 20 75 26C79 57 57 81 27 69Z','accent','metal',2],
    ['M28 69L66 35M39 58L36 44M49 48L63 49','none','light',2.5]],
  aurora:[['M50 14L58 34L76 24L66 42L86 50L66 58L76 76L58 66L50 86L42 66L24 76L34 58L14 50L34 42L24 24L42 34Z','accent','metal',1.8],
    ['M50 35L65 50L50 65L35 50Z','light','none',0]],
  coral:[['M50 49C17 48 19 17 36 24C47 27 50 39 50 49C50 16 79 18 77 35C75 48 63 50 50 49C83 51 81 80 65 76C52 73 49 61 50 49C49 82 20 80 24 64C27 51 39 48 50 49Z','accent','metal',2],
    ['M50 39L59 50L50 61L41 50Z','light','none',0]],
  pearl:[['M20 65C13 33 35 21 50 24C67 19 87 36 80 65L50 79Z','light','metal',2],
    ['M26 42L50 76M39 29L50 76M61 29L50 76M74 42L50 76','none','accent',2.4],
    ['M39 58A11 11 0 1 0 61 58A11 11 0 1 0 39 58','light','metal',1.4]],
  blossom:[['M50 18C45 29 33 32 23 39C33 43 42 40 45 49C38 54 30 59 27 68C38 66 46 61 50 55C54 61 62 66 73 68C70 59 62 54 55 49C58 40 67 43 77 39C67 32 55 29 50 18Z','accent','metal',2],
    ['M50 36L57 44L50 52L43 44Z','light','none',0]],
  heart:[['M50 76C46 69 40 63 32 59C24 55 21 47 24 40C27 33 36 31 42 35C45 37 48 41 50 46C52 41 55 37 58 35C64 31 73 33 76 40C79 47 76 55 68 59C60 63 54 69 50 76Z','accent','metal',2],
    ['M38 43A4 4 0 1 0 46 43A4 4 0 1 0 38 43','light','none',0]],
  bow:[['M50 50L37 36L20 40L37 49L20 60L37 64L50 50Z','accent','metal',1.6],
    ['M50 50L63 36L80 40L63 49L80 60L63 64L50 50Z','accent','metal',1.6],
    ['M50 44L55 50L50 56L45 50Z','deep','none',0]],
  diamond:[['M50 14L75 42L50 80L25 42Z','accent','metal',2],
    ['M50 14L60 42L50 80Z','light','none',0],
    ['M25 42L60 42L50 80Z','deep','none',0]],
  candy:[['M50 28A24 24 0 1 0 50 76A24 24 0 1 0 50 28','accent','metal',2],
    ['M50 34A18 18 0 1 1 50 70A18 18 0 1 1 50 34','none','light',1.3],
    ['M43 41C38 51 42 62 53 63C60 60 60 47 52 43','none','light',1.3],
    ['M46 76L43 88','metal','none',0]]
};
export function emblemSvg(theme){
  const p=PIECE_PALETTES[theme];if(!p)return '';
  const colour=k=>p[k]||k;
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'+
    `<circle cx="50" cy="50" r="46" fill="${p.deep}" stroke="${p.metal}" stroke-width="3"/>`+
    `<circle cx="50" cy="50" r="40" fill="none" stroke="${p.accent}" stroke-opacity=".55" stroke-width="1"/>`+
    SHAPES[theme].map(([d,fill,stroke,width])=>`<path d="${d}" fill="${colour(fill)}" stroke="${colour(stroke)}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`).join('')+'</svg>';
}
const urls=new Map();
export function emblemUrl(theme){
  if(!PIECE_PALETTES[theme])return '';
  if(!urls.has(theme))urls.set(theme,`url("data:image/svg+xml,${encodeURIComponent(emblemSvg(theme))}")`);
  return urls.get(theme);
}
// Broad material details, shared by the SVG shop cards and Canvas stones.
// Each tuple is path, fill key, stroke key, stroke width and opacity.
const MATERIAL_PATHS=Object.freeze({
 neon:[['M0 33L32 8L46 48L8 70Z','accent','none',0,.19],['M32 8L73 0L46 48Z','light','none',0,.12],['M46 48L92 22L100 73L63 90Z','accent','none',0,.2],['M8 70L46 48L63 90L26 104Z','light','none',0,.11],['M0 33L32 8L46 48L92 22M8 70L46 48L63 90M46 48L74 70L100 73','none','light',1.15,.52],['M19 52L32 43M25 46L26 56M71 27L82 23M76 20L77 31','none','light',1.2,.7]],
 jade:[['M-12 33C18 5 30 48 58 24S93 12 117 4L115 25C82 39 78 35 60 48S20 32-12 56Z','accent','none',0,.23],['M-9 72C21 41 48 88 68 64S94 43 112 47L112 64C85 62 89 78 65 87S20 67-9 91Z','accent','none',0,.2],['M-8 34C18 9 30 48 58 24S93 12 111 7M-8 71C21 43 48 88 68 64S94 43 110 47','none','light',1.1,.5],['M0 87C25 63 38 95 59 83S82 76 101 63','none','metal',1.3,.66],['M7 20C26 23 31 14 40 17M77 87C85 86 91 91 96 88','none','light',.7,.45]],
 aurora:[['M-10 73C10 28 65 10 107 37L103 51C64 25 25 41 7 85Z','accent','none',0,.21],['M-8 95C29 56 60 87 103 53L109 75C67 108 33 75 14 111Z','accent','none',0,.16],['M-8 78C20 31 65 17 104 41M10 100C38 70 66 90 104 63','none','metal',1.25,.85],['M71 17L73 23L79 25L73 27L71 33L69 27L63 25L69 23Z','metal','none',0,.95],['M24 61L25.5 65L30 66.5L25.5 68L24 72L22.5 68L18 66.5L22.5 65Z','light','none',0,.8],['M82 57L83 60L86 61L83 62L82 65L81 62L78 61L81 60Z','metal','none',0,.8]],
 coral:[['M50 50C12 43 11 13 29 16C46 18 50 36 50 50C58 11 87 13 84 31C81 47 64 50 50 50C88 58 87 87 69 84C53 81 50 64 50 50C42 88 13 87 16 69C19 53 36 50 50 50Z','accent','none',0,.22],['M50 50C12 43 11 13 29 16C46 18 50 36 50 50C58 11 87 13 84 31C81 47 64 50 50 50C88 58 87 87 69 84C53 81 50 64 50 50C42 88 13 87 16 69C19 53 36 50 50 50Z','none','metal',1.25,.75],['M50 38L62 50L50 62L38 50Z','light','metal',.8,.6]],
 pearl:[['M50 108L-9 20Q8 6 20 18Z','accent','none',0,.22],['M50 108L20 18Q33 1 45 12Z','light','none',0,.17],['M50 108L45 12Q58 0 70 16Z','accent','none',0,.24],['M50 108L70 16Q87 3 108 23Z','light','none',0,.19],['M50 108L-7 22M50 108L20 18M50 108L45 12M50 108L70 16M50 108L104 26','none','light',1,.53],['M1 66Q50 27 99 66M5 77Q50 43 95 77M14 88Q50 62 86 88','none','metal',.8,.56]]
});
const STONE_COLOURS=Object.freeze({
 neon:[['#5a7884','#223947','#09151f'],['#ffffff','#dceff5','#9bbdcc']],
 jade:[['#4e7361','#18372a','#081a13'],['#ffffef','#e1edda','#98b99a']],
 aurora:[['#745d7c','#302139','#140f1b'],['#fff9ff','#eadff1','#b8a3c6']],
 coral:[['#7b5d61','#3d252c','#1c1016'],['#fff9f0','#f5e1d7','#c7a29d']],
 pearl:[['#747982','#303740','#121b22'],['#ffffff','#eeeae4','#b2bbc8']]
});
function materialSvg(theme){
 const p=PIECE_PALETTES[theme];
 return MATERIAL_PATHS[theme].map(([d,fill,stroke,width,opacity])=>`<path d="${d}" fill="${p[fill]||fill}" stroke="${p[stroke]||stroke}" stroke-width="${width}" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
}
export function stoneSvg(theme,seat=1){
 if(!PIECE_PALETTES[theme])return '';
 const black=Number(seat)!==2,c=STONE_COLOURS[theme][black?0:1];
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'+
  `<defs><radialGradient id="stone-material" gradientUnits="userSpaceOnUse" cx="32" cy="27" r="73"><stop stop-color="${c[0]}"/><stop offset=".48" stop-color="${c[1]}"/><stop offset="1" stop-color="${c[2]}"/></radialGradient><clipPath id="stone-clip"><circle cx="50" cy="50" r="48"/></clipPath><radialGradient id="stone-gleam"><stop stop-color="#fff" stop-opacity="${black?.24:.75}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`+
  `<circle cx="50" cy="50" r="48" fill="url(#stone-material)" stroke="${c[2]}" stroke-width="1.1"/><g clip-path="url(#stone-clip)">${materialSvg(theme)}</g><ellipse cx="35" cy="29" rx="23" ry="16" fill="url(#stone-gleam)"/><path d="M17 25A40 40 0 0 1 46 10" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.2" stroke-linecap="round"/></svg>`;
}
export function drawStoneFinish(ctx,theme,x,y,r,black=true){
 if(!PIECE_PALETTES[theme])return;
 const p=PIECE_PALETTES[theme],c=STONE_COLOURS[theme][black?0:1];
 ctx.save();ctx.translate(x-r*50/48,y-r*50/48);ctx.scale(r/48,r/48);
 const g=ctx.createRadialGradient(32,27,0,32,27,73);g.addColorStop(0,c[0]);g.addColorStop(.48,c[1]);g.addColorStop(1,c[2]);
 ctx.beginPath();ctx.arc(50,50,48,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle=c[2];ctx.lineWidth=1.1;ctx.stroke();
 ctx.save();ctx.clip();ctx.lineCap='round';ctx.lineJoin='round';const alpha=ctx.globalAlpha;
 for(const[d,fill,stroke,width,opacity]of MATERIAL_PATHS[theme]){
  if(!paths.has(d))paths.set(d,new Path2D(d));const path=paths.get(d);ctx.globalAlpha=alpha*opacity;
  if(fill!=='none'){ctx.fillStyle=p[fill]||fill;ctx.fill(path);}
  if(stroke!=='none'){ctx.strokeStyle=p[stroke]||stroke;ctx.lineWidth=width;ctx.stroke(path);}
 }
 ctx.restore();ctx.save();ctx.translate(35,29);ctx.scale(23,16);
 const gleam=ctx.createRadialGradient(0,0,0,0,0,1);gleam.addColorStop(0,black?'rgba(255,255,255,.24)':'rgba(255,255,255,.75)');gleam.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gleam;ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();ctx.restore();
 const edge='M17 25A40 40 0 0 1 46 10';if(!paths.has(edge))paths.set(edge,new Path2D(edge));ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=1.2;ctx.lineCap='round';ctx.stroke(paths.get(edge));ctx.restore();
}
export function markSvg(theme,seat=1){
 const p=PIECE_PALETTES[theme];if(!p&&theme!=='default')return '';
 const one=Number(seat)!==2,light=one?'#e0fbff':'#fff0f1',base=one?'#65c8eb':'#f38b9d',dark=one?'#2479a5':'#b94661';
 const d=one?'M6 19L19 6L50 37L81 6L94 19L63 50L94 81L81 94L50 63L19 94L6 81L37 50Z'
  :'M50 5a45 45 0 1 1 0 90a45 45 0 1 1 0-90M50 24a26 26 0 1 0 0 52a26 26 0 1 0 0-52';
 const round=theme==='jade'||theme==='coral'||theme==='pearl';
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'+
  `<defs><linearGradient id="mark" x2=".8" y2="1"><stop stop-color="${light}"/><stop offset=".4" stop-color="${base}"/><stop offset="1" stop-color="${dark}"/></linearGradient><clipPath id="mark-clip"><path d="${d}" clip-rule="evenodd"/></clipPath></defs>`+
  `<path d="${d}" fill="url(#mark)" fill-rule="evenodd"${p?` stroke="${p.metal}" stroke-width="2.4" stroke-linejoin="${round?'round':'miter'}"`:''}/>`+
  (p?`<g clip-path="url(#mark-clip)">${materialSvg(theme)}</g>`:'')+
  (theme==='jade'?`<g fill="${one?'#b6eadb':'#ffd2dc'}" stroke="${p.metal}" stroke-width=".7">${one?'<path d="M21 32Q8 34 12 17Q27 14 21 32ZM79 68Q92 66 88 83Q73 86 79 68Z"/>':'<path d="M20 26Q8 29 15 42Q29 42 20 26ZM80 74Q92 71 85 58Q71 58 80 74Z"/>'}</g>`:'')+
  (theme==='aurora'?'<g fill="#fff5cd"><path d="M24 21L26 27L32 29L26 31L24 37L22 31L16 29L22 27Z"/><path d="M78 66L80 72L86 74L80 76L78 82L76 76L70 74L76 72Z"/></g>':'')+
  (theme==='pearl'?'<g fill="#fffaf1" stroke="#c3bdb8" stroke-width=".5"><circle cx="17" cy="18" r="3.2"/><circle cx="83" cy="82" r="3.2"/></g>':'')+'</svg>';
}
export function markUrl(theme,seat){
  if(!PIECE_PALETTES[theme])return '';const key='mark-'+theme+'-'+seat;
  if(!urls.has(key))urls.set(key,`url("data:image/svg+xml,${encodeURIComponent(markSvg(theme,seat))}")`);
  return urls.get(key);
}
export function stoneUrl(theme,seat){
  if(!PIECE_PALETTES[theme])return '';const key='stone-'+theme+'-'+seat;
  if(!urls.has(key))urls.set(key,`url("data:image/svg+xml,${encodeURIComponent(stoneSvg(theme,seat))}")`);
  return urls.get(key);
}
const paths=new Map();
export function drawPieceEmblem(ctx,theme,x,y,r){
  const p=PIECE_PALETTES[theme];if(!p)return;
  ctx.save();ctx.translate(x,y);ctx.scale(r/50,r/50);
  ctx.beginPath();ctx.arc(0,0,46,0,Math.PI*2);ctx.fillStyle=p.deep;ctx.fill();
  ctx.strokeStyle=p.metal;ctx.lineWidth=3;ctx.stroke();
  ctx.beginPath();ctx.arc(0,0,40,0,Math.PI*2);ctx.strokeStyle=p.accent;ctx.lineWidth=1;
  const alpha=ctx.globalAlpha;ctx.globalAlpha=alpha*.55;ctx.stroke();ctx.globalAlpha=alpha;
  ctx.translate(-50,-50);ctx.lineCap='round';ctx.lineJoin='round';
  for(const [d,fill,stroke,width]of SHAPES[theme]){
    if(!paths.has(d))paths.set(d,new Path2D(d));const path=paths.get(d);
    if(fill!=='none'){ctx.fillStyle=p[fill]||fill;ctx.fill(path);}
    if(stroke!=='none'){ctx.strokeStyle=p[stroke]||stroke;ctx.lineWidth=width;ctx.stroke(path);}
  }
  ctx.restore();
}
