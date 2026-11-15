/**
 * JoyFlock seasonal skins for Connect Four.
 * Standalone by design: table.js / four-drop.js / the rules engine are untouched.
 * The default skin is "classic" (no theme). A picker lets the player choose a
 * festival skin before a local game, from the in-game pill, or inside a room.
 */
export const THEMES=[
  {id:'classic',zh:'无主题',en:'Classic',icon:'✦',desc:'经典深色棋盘',sw:'linear-gradient(160deg,#1a2c50,#101a30)',sw1:'radial-gradient(circle at 32% 24%,#fff1ab,#f3bd43 55%,#c67f22)',sw2:'radial-gradient(circle at 32% 24%,#ffb6c6,#e85b79 55%,#a62d54)'},
  {id:'independence',zh:'独立日',en:'Independence Day',icon:'🎆',desc:'烟花、星条旗与夏夜',sw:'linear-gradient(160deg,#20315f,#080d22)',sw1:'radial-gradient(circle at 32% 24%,#fff0d6,#e8483f 58%,#7d1226)',sw2:'radial-gradient(circle at 32% 24%,#ffffff,#6f9cf0 58%,#1b357d)'},
  {id:'thanksgiving',zh:'感恩节',en:'Thanksgiving',icon:'🦃',desc:'秋叶、火鸡与丰收宴',sw:'linear-gradient(160deg,#7a3a14,#210f08)',sw1:'radial-gradient(circle at 32% 24%,#fff1cf,#d9822b 58%,#6d3509)',sw2:'radial-gradient(circle at 32% 24%,#ffe4d0,#b8472c 58%,#4e130d)'},
  {id:'halloween',zh:'万圣节',en:'Halloween',icon:'🎃',desc:'南瓜灯与幽灵之夜',sw:'linear-gradient(160deg,#432858,#100a20)',sw1:'radial-gradient(circle at 32% 24%,#ffe9bd,#f07d1a 58%,#742a06)',sw2:'radial-gradient(circle at 32% 24%,#f7efff,#9152d8 58%,#361257)'},
  {id:'christmas',zh:'圣诞节',en:'Christmas',icon:'🎄',desc:'雪夜、圣诞老人与雪人',sw:'linear-gradient(160deg,#1d5b4a,#081c2b)',sw1:'radial-gradient(circle at 32% 24%,#ffd9d0,#d42f36 58%,#570a14)',sw2:'radial-gradient(circle at 32% 24%,#ffffff,#8dc9e6 58%,#28527d)'},
  {id:'valentine',zh:'情人节',en:"Valentine's Day",icon:'💝',desc:'爱心、玫瑰与粉红夜',sw:'linear-gradient(160deg,#7b244a,#25091e)',sw1:'radial-gradient(circle at 32% 24%,#ffe0ea,#f05c86 58%,#8a173f)',sw2:'radial-gradient(circle at 32% 24%,#ffffff,#f6a9c4 58%,#a13b6a)'},
  {id:'stpatricks',zh:'圣帕特里克节',en:"St. Patrick's Day",icon:'☘️',desc:'三叶草、彩虹与金罐',sw:'linear-gradient(160deg,#12603a,#04180f)',sw1:'radial-gradient(circle at 32% 24%,#fff4cf,#e5b83e 58%,#6d4a08)',sw2:'radial-gradient(circle at 32% 24%,#e2ffe9,#39b866 58%,#0d5a2c)'},
  {id:'easter',zh:'复活节',en:'Easter',icon:'🐰',desc:'彩蛋、春兔与花田',sw:'linear-gradient(160deg,#6a4a91,#1b1030)',sw1:'radial-gradient(circle at 32% 24%,#fffbe0,#f3c95a 58%,#9a6a13)',sw2:'radial-gradient(circle at 32% 24%,#ffffff,#b9a2ef 58%,#5a3a9c)'},
  {id:'spring',zh:'春节',en:'Spring Festival',icon:'🧧',desc:'灯笼、烟火与福字金牌',sw:'linear-gradient(160deg,#7a1e1e,#260810)',sw1:'radial-gradient(circle at 32% 24%,#fff3cf,#e5ab3c 58%,#6a3b08)',sw2:'radial-gradient(circle at 32% 24%,#ffd7c9,#cc2e28 58%,#530810)'},
  {id:'midautumn',zh:'中秋节',en:'Mid-Autumn',icon:'🌕',desc:'满月、玉兔与月饼',sw:'linear-gradient(160deg,#24406e,#060b1d)',sw1:'radial-gradient(circle at 32% 24%,#fff4d6,#d6a444 58%,#573a16)',sw2:'radial-gradient(circle at 32% 24%,#ffffff,#8fc6bb 58%,#245356)'}
];
const IDS=new Set(THEMES.map(t=>t.id));
const byId=id=>THEMES.find(t=>t.id===id)||THEMES[0];
const STORE_KEY='joyflock:four-theme';
const query=new URLSearchParams(location.search);
const fromUrl=query.get('theme');
const read=()=>{try{return localStorage.getItem(STORE_KEY);}catch{return null;}};
const write=value=>{try{localStorage.setItem(STORE_KEY,value);}catch{}};
let current=IDS.has(fromUrl)?fromUrl:(IDS.has(read())?read():'classic');
if(IDS.has(fromUrl))write(current);

/* A room shares one skin. Every tab/window of this browser follows the most
   recent explicit choice; the table.js layer also relays it through the room
   chat stream so players on different devices stay in sync. */
export const instanceId=Math.random().toString(36).replace(/[^a-z0-9]/g,'').slice(0,10)||'tab'+Date.now().toString(36);
const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel(STORE_KEY):null;
const announce=detail=>{
  try{channel?.postMessage(detail);}catch{}
  try{window.dispatchEvent(new CustomEvent('joyflock:themechange',{detail}));}catch{}
};
if(channel)channel.onmessage=event=>{
  const data=event.data;
  if(!data||data.from===instanceId||!IDS.has(data.theme))return;
  setTheme(data.theme,{silent:true});
};
window.addEventListener('storage',event=>{
  if(event.key===STORE_KEY&&IDS.has(event.newValue)&&event.newValue!==current)setTheme(event.newValue,{silent:true});
});

/* ------------------------------------------------------------ scene bits */
let seed=20261108;
const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const resetSeed=value=>{seed=value;};
const starField=(count,fill)=>{
  resetSeed(20261108);
  return `<svg class="four-scene-stars" viewBox="0 0 1000 600" preserveAspectRatio="none">${Array.from({length:count},(_,i)=>{
    const x=(rand()*1000).toFixed(1),y=(rand()*430).toFixed(1),r=(.5+rand()*1.4).toFixed(1),o=(.2+rand()*.6).toFixed(2);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" opacity="${o}"${i%5===0?' class="fp-twinkle"':''}/>`;
  }).join('')}</svg>`;
};
const particles=(count,kind,color)=>{
  resetSeed(77123);
  return Array.from({length:count},()=>{
    const x=(rand()*100).toFixed(1),size=(2+rand()*4).toFixed(1),delay=(rand()*12).toFixed(1),duration=(7+rand()*9).toFixed(1);
    return `<i class="fp-particle ${kind}" style="left:${x}%;width:${size}px;height:${size}px;background:${color};animation-delay:-${delay}s;animation-duration:${duration}s"></i>`;
  }).join('');
};
const BAT_PATH='M32 10C29 5 26 2 22 1c-1 5-4 8-9 7-4-1-7-4-11-7 2 7 4 12 7 15 3-1 6 0 8 3 4-2 8-2 11 0 1-2 3-5 4-7 1 2 3 5 4 7 3-2 7-2 11 0 2-3 5-4 8-3 3-3 5-8 7-15-4 3-7 6-11 7-5 1-8-2-9-7-4 1-7 4-10 9z';
const bat=v=>`<svg viewBox="0 0 64 32"><path fill="#070410" d="${BAT_PATH}"/></svg>`;
const WEB=`<svg viewBox="0 0 120 120" fill="none" stroke="#d9b8ff" stroke-width="1.2"><path d="M0 0 120 120M0 0 60 120M0 0 120 60M0 0 90 120M0 0 120 90"/><path d="M0 18Q26 30 36 0M18 0Q30 26 0 36M0 40Q48 52 60 0M40 0Q52 48 0 60M0 64Q70 74 84 0M64 0Q74 70 0 84"/></svg>`;
const GRAVEYARD=`<svg viewBox="0 0 1200 160" preserveAspectRatio="none"><path fill="#0b0718" d="M0 96Q150 72 300 88T600 82T900 92T1200 80V160H0Z"/><g fill="#100a20"><path d="M118 124V90a16 16 0 0 1 32 0v34z"/><rect x="112" y="120" width="44" height="8" rx="3"/><path d="M205 132V100a13 13 0 0 1 26 0v32z"/><rect x="200" y="128" width="36" height="7" rx="3"/><path d="M980 126V94a15 15 0 0 1 30 0v32z"/><rect x="974" y="122" width="42" height="8" rx="3"/></g><g stroke="#090514" stroke-width="5" fill="none" stroke-linecap="round"><path d="M870 134V58M870 84 838 60M870 98 900 68M870 72 846 48M870 76 894 46"/></g><g stroke="#150c26" stroke-width="4" fill="none"><path d="M0 140H1200M60 140V114M140 140V114M220 140V114M300 140V114M380 140V114M460 140V114M540 140V114M620 140V114M700 140V114M780 140V114M860 140V114M940 140V114M1020 140V114M1100 140V114M1180 140V114"/></g></svg>`;
const pumpkin=`<svg viewBox="0 0 100 94"><path fill="#3f7a2a" d="M46 20q2-14 12-16 2 8-4 16z"/><ellipse cx="50" cy="56" rx="42" ry="35" fill="#e9791c"/><g fill="none" stroke="#bf5410" stroke-width="2" opacity=".75"><path d="M30 23q-12 33 0 65M70 23q12 33 0 65"/></g><ellipse cx="50" cy="56" rx="42" ry="35" fill="none" stroke="#ffab4a" stroke-width="2" opacity=".55"/><g fill="#33120a"><path d="M22 44 42 50 29 62z"/><path d="M78 44 58 50 71 62z"/><path d="M46 54h8l-4 8z"/><path d="M26 68 36 78 46 68 56 78 66 68 74 74 70 82H30z"/></g></svg>`;
const ghostSvg=`<svg viewBox="0 0 64 72"><path fill="#e9dfff" d="M32 5C17 5 10 19 10 38v29l10-8 8 8 8-8 8 8 10-8V38C54 19 47 5 32 5z"/><g fill="#3a2159"><ellipse cx="24" cy="31" rx="4.5" ry="6.5"/><ellipse cx="40" cy="31" rx="4.5" ry="6.5"/><path d="M26 45q6 7 12 0-6 3-12 0z"/></g></svg>`;
const deco=(svg,style,cls='fp-bob')=>`<div class="fp-deco ${cls}" style="${style}">${svg}</div>`;

/* Christmas: snowy pines, hanging lights and falling snow. */
const XMAS_TREE=`<svg viewBox="0 0 84 120"><path fill="#4b2a17" d="M37 96h10v22H37z"/><path fill="#0f4d3c" d="M42 6 14 54h12L8 82h68L58 54h12z"/><path fill="#167057" d="M42 6 14 54h12L8 82h34z"/><g fill="#e8f6ff" opacity=".85"><path d="M42 6 31 27h22zM42 30 22 58h40zM42 58 12 84h60z"/></g><g fill="#ffd479"><circle cx="42" cy="4" r="5"/><circle cx="26" cy="50" r="3"/><circle cx="56" cy="46" r="3"/><circle cx="20" cy="76" r="3"/><circle cx="62" cy="74" r="3"/><circle cx="42" cy="68" r="3"/></g><g fill="#e0483f"><circle cx="36" cy="40" r="2.6"/><circle cx="50" cy="62" r="2.6"/><circle cx="32" cy="78" r="2.6"/></g></svg>`;
const XMAS_GROUND=`<svg viewBox="0 0 1200 160" preserveAspectRatio="none"><path fill="#dcecff" d="M0 104Q160 78 320 96T640 90T960 98T1200 86V160H0Z"/><path fill="#a9c9e8" opacity=".65" d="M0 128Q220 108 440 126T880 122T1200 116V160H0Z"/></svg>`;
const XMAS_LIGHTS=`<svg viewBox="0 0 1000 60" preserveAspectRatio="none"><path d="M0 8Q250 58 500 14T1000 10" fill="none" stroke="#7fb0a0" stroke-width="2"/><g><circle cx="120" cy="34" r="5" fill="#ffd479"/><circle cx="270" cy="40" r="5" fill="#ff7a6a"/><circle cx="420" cy="27" r="5" fill="#8fe0ff"/><circle cx="600" cy="19" r="5" fill="#ffd479"/><circle cx="760" cy="14" r="5" fill="#9fffb8"/><circle cx="900" cy="12" r="5" fill="#ff7a6a"/></g></svg>`;
const XMAS_GIFT=`<svg viewBox="0 0 60 56"><rect x="6" y="18" width="48" height="34" rx="3" fill="#c22f3c"/><rect x="4" y="12" width="52" height="10" rx="2" fill="#e34a4a"/><path d="M30 12v44M6 18h48" stroke="#ffd479" stroke-width="5"/><path d="M30 12q-12-16-18-6 0 8 18 6zM30 12q12-16 18-6 0 8-18 6z" fill="#ffd479"/></svg>`;

/* Spring Festival: lanterns, fireworks, auspicious clouds and gold ingots. */
const LANTERN=`<svg viewBox="0 0 72 124"><path d="M36 2v10" stroke="#ffd479" stroke-width="2"/><rect x="26" y="12" width="20" height="6" rx="2" fill="#ffd479"/><path d="M16 24q20-10 40 0v48q-20 10-40 0z" fill="#d8342a" stroke="#ffd479" stroke-width="2"/><path d="M36 20v56M26 21q5 28 0 54M46 21q-5 28 0 54" stroke="#ffb03a" stroke-width="2" fill="none"/><text x="36" y="60" font-family="serif" font-size="24" font-weight="700" text-anchor="middle" fill="#ffe9a8">福</text><path d="M36 78v22M28 100h16" stroke="#ffd479" stroke-width="2.4" stroke-linecap="round"/></svg>`;
const CLOUD=`<svg viewBox="0 0 160 60" fill="none" stroke="#ffd479" stroke-width="2.4" stroke-linecap="round" opacity=".55"><path d="M6 44h32c-14 0-20-10-12-16 6-5 14-2 16 4 4-14 22-18 30-8 8-10 26-6 28 8 10-4 20 2 20 12h24"/><path d="M32 44q10 8 20 0M92 44q10 8 20 0"/></svg>`;
const INGOT=`<svg viewBox="0 0 80 50"><path d="M8 34q8-20 32-20t32 20q-6 12-32 12T8 34z" fill="#e5b544" stroke="#8a5a12" stroke-width="2"/><path d="M24 30q4-12 16-12t16 12" fill="none" stroke="#fff0bd" stroke-width="3"/><path d="M8 34q24 8 64 0" fill="none" stroke="#8a5a12" stroke-width="2"/></svg>`;
let burstSeq=0;
const burst=(left,top,size,color,delay)=>{
  const id='fpburst'+(++burstSeq);
  const rays=Array.from({length:18},(_,i)=>{
    const deg=i*20,len=i%3===0?44:i%3===1?36:40,thick=i%3===0?2.6:1.5;
    return `<g transform="rotate(${deg} 50 50)"><line x1="50" y1="46" x2="50" y2="${50-len}" stroke="url(#${id}r)" stroke-width="${thick}" stroke-linecap="round"/><circle cx="50" cy="${50-len}" r="${i%3===0?2.2:1.5}" fill="${color}" opacity=".92"/></g>`;
  }).join('');
  const sparks=Array.from({length:10},(_,i)=>{
    const a=(i*36+14)*Math.PI/180,r=23+i%3*4;
    return `<circle cx="${(50+Math.cos(a)*r).toFixed(1)}" cy="${(50+Math.sin(a)*r).toFixed(1)}" r="${(1+i%2*.6).toFixed(1)}" fill="#fff" opacity=".82"/>`;
  }).join('');
  return `<svg class="fp-deco fp-burst" style="left:${left}%;top:${top}%;width:${size};animation-delay:-${delay}s;filter:drop-shadow(0 0 9px ${color}aa)" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="${id}r" gradientUnits="userSpaceOnUse" x1="50" y1="46" x2="50" y2="8"><stop offset="0" stop-color="#fff" stop-opacity=".98"/><stop offset=".3" stop-color="${color}" stop-opacity=".92"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient>
      <radialGradient id="${id}h"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset=".42" stop-color="${color}" stop-opacity=".26"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>
    </defs>
    <circle cx="50" cy="50" r="36" fill="url(#${id}h)"/>
    ${rays}${sparks}<circle cx="50" cy="50" r="3.2" fill="#fff"/>
  </svg>`;
};

/* Mid-Autumn: full moon, drifting clouds, rabbits and osmanthus petals. */
const MA_GROUND=`<svg viewBox="0 0 1200 160" preserveAspectRatio="none"><path fill="#0b1730" d="M0 96Q180 70 360 92T720 84T1200 90V160H0Z"/><path fill="#132449" d="M0 124Q240 104 480 122T960 116T1200 122V160H0Z"/></svg>`;
const RABBIT=`<svg viewBox="0 0 70 76"><path d="M27 34Q18 8 27 5q8 3 7 28zM43 34Q52 8 43 5q-8 3-7 28z" fill="#dcefe9" stroke="#5b8f92" stroke-width="1.6"/><path d="M29 31Q23 13 28 10q3 5 3 20zM41 31Q47 13 42 10q-3 5-3 20z" fill="#f0b7c4"/><ellipse cx="35" cy="50" rx="21" ry="20" fill="#e6f4ef" stroke="#5b8f92" stroke-width="1.6"/><circle cx="28" cy="46" r="2.6" fill="#315a63"/><circle cx="42" cy="46" r="2.6" fill="#315a63"/><path d="M33 54h4l-2 3z" fill="#e07a7a"/><circle cx="52" cy="60" r="7" fill="#e6f4ef" stroke="#5b8f92" stroke-width="1.4"/></svg>`;

/* American holidays: bunting + fireworks, harvest, hearts, clovers, eggs. */
const BUNTING=(()=>{
  const n=14,mid=(n-1)/2,ids=['fpbgR','fpbgW','fpbgB'];
  const flags=Array.from({length:n},(_,i)=>{
    const t=(i-mid)/mid,y=+(3+14*(1-t*t)).toFixed(1),x=5+i*17,dy=+(t*.9).toFixed(1);
    const d=`M${x} ${y}l14 ${dy}-5.5 15z`;
    const pattern=i%3===1
      ? `<path d="M${x+1} ${y+5}h12v1.6h-12zM${x+1} ${y+9}h12v1.6h-12z" fill="#cf3b3b" opacity=".6"/>`
      : `<circle cx="${x+7}" cy="${y+8}" r="1.8" fill="#fff" opacity=".9"/>`;
    return `<path d="${d}" fill="#0006" transform="translate(1,1.6)"/><path d="${d}" fill="url(#${ids[i%3]})"/><path d="M${x} ${y}l14 ${dy}" stroke="#ffffff66" stroke-width="1.4" fill="none"/>${pattern}`;
  }).join('');
  const bulbs=Array.from({length:9},(_,i)=>{
    const t=(i-4)/4,y=+(3+14*(1-t*t)).toFixed(1);
    return `<circle cx="${8+i*28}" cy="${y+1}" r="1.9" fill="#ffe9a8" opacity=".9"/>`;
  }).join('');
  return `<svg viewBox="0 0 240 30" preserveAspectRatio="none"><defs>
    <linearGradient id="fpbgR" x1="0" y1="0" x2=".85" y2="1"><stop stop-color="#f4705f"/><stop offset="1" stop-color="#9d1c2a"/></linearGradient>
    <linearGradient id="fpbgW" x1="0" y1="0" x2=".85" y2="1"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#bfcade"/></linearGradient>
    <linearGradient id="fpbgB" x1="0" y1="0" x2=".85" y2="1"><stop stop-color="#5d89dc"/><stop offset="1" stop-color="#1c3679"/></linearGradient>
  </defs><path d="M0 3Q120 31 240 3" fill="none" stroke="#4a3c27" stroke-width="3"/><path d="M0 3Q120 31 240 3" fill="none" stroke="#efe1bf" stroke-width="1.2"/>${flags}${bulbs}</svg>`;
})();
const US_FLAG=(()=>{
  const star=(cx,cy,r)=>{
    const pts=Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.46:r;return `${(cx+Math.cos(a)*rr).toFixed(1)},${(cy+Math.sin(a)*rr).toFixed(1)}`;}).join(' ');
    return `<polygon points="${pts}"/>`;
  };
  const stars=Array.from({length:9},(_,i)=>star(15+(i%3)*11,11+Math.floor(i/3)*8,2.3)).join('');
  return `<svg viewBox="0 0 100 76"><defs>
    <clipPath id="fpufClip"><path d="M9 9q21-6 42 0t40 0v40q-20 6-40 0t-42 0z"/></clipPath>
    <linearGradient id="fpufShade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0000"/><stop offset=".38" stop-color="#0000"/><stop offset=".68" stop-color="#0006"/><stop offset="1" stop-color="#0000"/></linearGradient>
  </defs>
  <rect x="6" y="5" width="3" height="66" rx="1.5" fill="#c0aa7e"/>
  <circle cx="7.5" cy="4" r="3.4" fill="#ffd479" stroke="#8a6a24" stroke-width=".8"/>
  <g clip-path="url(#fpufClip)">
    <rect x="9" y="6" width="84" height="48" fill="#f5f7fd"/>
    <g fill="#c8393b"><rect x="9" y="6" width="84" height="6"/><rect x="9" y="18" width="84" height="6"/><rect x="9" y="30" width="84" height="6"/><rect x="9" y="42" width="84" height="6"/><rect x="9" y="54" width="84" height="4"/></g>
    <rect x="9" y="6" width="38" height="27" fill="#25448c"/><g fill="#fff">${stars}</g>
    <rect x="9" y="6" width="84" height="48" fill="url(#fpufShade)"/>
  </g></svg>`;
})();
/* Real cloth bunting: CSS flags avoid the non-uniform SVG stretch that made the
   earlier strip look like flat stickers. Rope sag and flag drop share a parabola. */
const buntingBand=(n=13)=>{
  const mid=(n-1)/2;
  const flags=Array.from({length:n},(_,i)=>{
    const t=(i-mid)/mid,drop=(15*(1-t*t)).toFixed(1);
    return `<i class="fp-flag fp-flag-${i%3}" style="--drop:${drop}px;--i:${i}"></i>`;
  }).join('');
  const bulbs=Array.from({length:11},(_,i)=>{
    const t=(i-5)/5,y=(3+15*(1-t*t)).toFixed(1);
    return `<i class="fp-bulb" style="left:${(4+i*9.2).toFixed(2)}%;top:${y}px;--i:${i}"></i>`;
  }).join('');
  return `<div class="fp-bunting-band">
    <svg class="fp-bunting-rope" viewBox="0 0 1000 32" preserveAspectRatio="none"><path d="M0 3Q500 33 1000 3" fill="none" stroke="#4a3c27" stroke-width="3.4" vector-effect="non-scaling-stroke"/><path d="M0 3Q500 33 1000 3" fill="none" stroke="#efe1bf" stroke-width="1.4" vector-effect="non-scaling-stroke"/></svg>
    <div class="fp-bunting-flags">${flags}</div>${bulbs}
  </div>`;
};
const TURKEY=`<svg viewBox="0 0 96 88"><g fill="#9c5220" stroke="#5c2a0e" stroke-width="1.6"><path d="M48 44 20 14q-14 22-2 42 16 12 30 6z"/><path d="M48 44 28 8q-8 24 2 42 8 4 18 0z"/><path d="M48 44 68 8q8 24-2 42-8 4-18 0z"/><path d="M48 44 76 14q14 22 2 42-16 12-30 6z"/></g><g fill="#c47a2c" opacity=".9"><path d="M48 44 34 12q-6 20 0 36zM48 44 62 12q6 20 0 36z"/></g><ellipse cx="48" cy="58" rx="19" ry="22" fill="#7b4119" stroke="#4b2309" stroke-width="2"/><circle cx="48" cy="39" r="12" fill="#8e4d1e" stroke="#4b2309" stroke-width="1.6"/><g fill="#2d1606"><circle cx="44" cy="37" r="2"/><circle cx="52" cy="37" r="2"/></g><path d="M48 41 42 45h12z" fill="#f0a52c"/><path d="M48 45q-6 7-2 10" fill="none" stroke="#cf3b3b" stroke-width="3.4" stroke-linecap="round"/><path d="M36 78l-4 8M60 78l4 8" stroke="#e0a02c" stroke-width="3" stroke-linecap="round"/></svg>`;
const MAPLE=`<svg viewBox="0 0 44 48"><path d="M22 2 26 13 36 9 34 20 43 22 35 29 40 39 30 37 25 46 19 38 9 41 13 30 5 25 14 21 11 10 19 14Z" fill="#d9741f" stroke="#8a3a10" stroke-width="1.6" stroke-linejoin="round"/><path d="M22 22v22" stroke="#8a3a10" stroke-width="1.8"/></svg>`;
const HEART=`<svg viewBox="0 0 44 40"><path d="M22 37 3 20q-6-9 2-14 8-4 17 4 9-8 17-4 8 5 2 14z" fill="#f05c86" stroke="#ffd6e5" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
const ROSE=`<svg viewBox="0 0 56 72"><path d="M28 42v28M28 54q-12-7-17 0 9 6 17 0zM28 54q12-7 17 0-9 6-17 0z" fill="#3f8d46" stroke="#256a2e" stroke-width="1.4"/><circle cx="28" cy="26" r="19" fill="#dc3f6d" stroke="#ffd0dd" stroke-width="2"/><path d="M28 13q14 0 14 13t-14 13q-9 0-11-8 9 3 13-4 3-6-2-9-4-2-7 2" fill="none" stroke="#9d1c45" stroke-width="3" stroke-linecap="round"/></svg>`;
const CLOVER=`<svg viewBox="0 0 50 54"><g fill="#2fa85a" stroke="#0e5b2a" stroke-width="1.6"><circle cx="17" cy="18" r="10"/><circle cx="33" cy="18" r="10"/><circle cx="25" cy="33" r="10"/></g><path d="M25 40q2 8 9 12" fill="none" stroke="#0e5b2a" stroke-width="3" stroke-linecap="round"/></svg>`;
const RAINBOW=`<svg viewBox="0 0 200 100" fill="none"><path d="M10 96a90 90 0 0 1 180 0" stroke="#e8514b" stroke-width="9"/><path d="M22 96a78 78 0 0 1 156 0" stroke="#f0a52c" stroke-width="9"/><path d="M34 96a66 66 0 0 1 132 0" stroke="#f3d95c" stroke-width="9"/><path d="M46 96a54 54 0 0 1 108 0" stroke="#3fb96c" stroke-width="9"/><path d="M58 96a42 42 0 0 1 84 0" stroke="#4a8fe0" stroke-width="9"/><path d="M70 96a30 30 0 0 1 60 0" stroke="#8a63cf" stroke-width="9"/></svg>`;
const GOLD_POT=`<svg viewBox="0 0 76 64"><g fill="#ffd45c" stroke="#b57c14" stroke-width="1.6"><circle cx="24" cy="20" r="8"/><circle cx="38" cy="15" r="8"/><circle cx="52" cy="20" r="8"/><circle cx="31" cy="27" r="8"/><circle cx="46" cy="27" r="8"/></g><path d="M8 30h60l-6 26q-24 8-48 0z" fill="#2a2a33" stroke="#0e0e14" stroke-width="2"/><path d="M6 28q32-8 64 0" fill="none" stroke="#4a4a55" stroke-width="4" stroke-linecap="round"/></svg>`;
const EGG=`<svg viewBox="0 0 48 62"><path d="M24 3C13 3 6 24 6 37a18 18 0 0 0 36 0C42 24 35 3 24 3z" fill="#fff4fb" stroke="#b46ab4" stroke-width="1.8"/><path d="M7 29q8-6 17 0t17 0M8 42q8-6 16 0t16 0" fill="none" stroke="#e2679e" stroke-width="4"/><g fill="#ffd45c"><circle cx="24" cy="18" r="2.6"/><circle cx="16" cy="35" r="2"/><circle cx="32" cy="35" r="2"/></g></svg>`;
const FLOWER=`<svg viewBox="0 0 40 40"><g fill="#f7a8c8"><circle cx="20" cy="9" r="7"/><circle cx="31" cy="20" r="7"/><circle cx="20" cy="31" r="7"/><circle cx="9" cy="20" r="7"/></g><circle cx="20" cy="20" r="6" fill="#ffd45c"/></svg>`;
const fallers=(svg,count,min,max)=>{
  resetSeed(9931);
  return Array.from({length:count},()=>{
    const x=(rand()*100).toFixed(1),s=(min+rand()*(max-min)).toFixed(1),d=(rand()*12).toFixed(1),dur=(7+rand()*8).toFixed(1);
    return `<div class="fp-deco fp-fall" style="top:-8%;left:${x}%;width:${s}px;animation-delay:-${d}s;animation-duration:${dur}s">${svg}</div>`;
  }).join('');
};

const SCENES={
  halloween:()=>`
    <div class="four-scene-sky"></div>${starField(52,'#ffe9c9')}
    <div class="four-scene-orb"></div>
    ${deco(WEB,'left:0;top:5%;width:clamp(84px,11vw,140px);opacity:.2','')}
    ${deco(bat(),'left:7%;top:12%;width:clamp(26px,5%,50px);filter:drop-shadow(0 3px 6px #0009);animation:fp-float 6.5s ease-in-out infinite','')}
    ${deco(bat(),'right:13%;top:24%;width:clamp(20px,3.8%,36px);animation:fp-float 6.5s ease-in-out infinite;animation-delay:-2.7s','')}
    ${deco(bat(),'left:23%;top:25%;width:clamp(16px,2.8%,26px);opacity:.75;animation:fp-float 6.5s ease-in-out infinite;animation-delay:-4.1s','')}
    <svg class="four-scene-ground" viewBox="0 0 1200 160" preserveAspectRatio="none">${GRAVEYARD.replace(/^<svg[^>]*>|<\/svg>$/g,'')}</svg>
    <div class="four-scene-fog"></div>
    ${deco(pumpkin,'left:1.5%;bottom:2%;width:clamp(48px,9%,96px);filter:drop-shadow(0 0 16px #ff7a1a80)')}
    ${deco(pumpkin,'right:2%;bottom:2%;width:clamp(38px,7%,76px);animation-delay:-2.2s;filter:drop-shadow(0 0 16px #ff7a1a80)')}
    ${deco(ghostSvg,'left:5%;top:38%;width:clamp(30px,6%,58px);opacity:.3','fp-float')}
    ${deco(ghostSvg,'right:7%;top:46%;width:clamp(24px,4.5%,44px);opacity:.3;animation-delay:-5s','fp-float')}
    <div class="four-scene-vignette"></div>`,
  christmas:()=>`
    <div class="four-scene-sky"></div>${starField(46,'#dff1ff')}
    <div class="four-scene-orb"></div>
    ${deco(XMAS_LIGHTS,'left:0;top:1%;width:100%;height:34px','')}
    ${particles(48,'fp-fall','#ffffff')}
    <svg class="four-scene-ground" viewBox="0 0 1200 160" preserveAspectRatio="none">${XMAS_GROUND.replace(/^<svg[^>]*>|<\/svg>$/g,'')}</svg>
    ${deco(XMAS_TREE,'left:2%;bottom:3%;width:clamp(50px,9%,96px)')}
    ${deco(XMAS_TREE,'right:2.5%;bottom:2%;width:clamp(38px,7%,76px);animation-delay:-2.2s')}
    ${deco(XMAS_GIFT,'left:12%;bottom:1%;width:clamp(28px,5%,52px);animation-delay:-1.1s')}
    <div class="four-scene-fog"></div><div class="four-scene-vignette"></div>`,
  spring:()=>`
    <div class="four-scene-sky"></div>${starField(30,'#ffd9a0')}
    <div class="four-scene-orb"></div>
    ${burst(14,2,'clamp(74px,14%,150px)','#ffd479','0')}
    ${burst(72,1,'clamp(62px,12%,128px)','#ff8a5c','1.6')}
    ${burst(48,6,'clamp(52px,9%,98px)','#ffe9a8','2.9')}
    ${deco(LANTERN,'left:17%;top:0;width:clamp(34px,5.5%,58px)','fp-sway')}
    ${deco(LANTERN,'right:5%;top:0;width:clamp(30px,5%,50px);animation-delay:-2.1s','fp-sway')}
    ${deco(CLOUD,'left:2%;bottom:16%;width:clamp(70px,13%,140px)','fp-float')}
    ${deco(CLOUD,'right:4%;bottom:24%;width:clamp(60px,11%,118px);animation-delay:-4s','fp-float')}
    ${particles(22,'fp-drift','#ffd479')}
    <svg class="four-scene-ground" viewBox="0 0 1200 160" preserveAspectRatio="none"><path fill="#3a0a10" d="M0 100Q180 76 360 94T720 86T1200 92V160H0Z"/><path fill="#5c1014" d="M0 132Q240 112 480 128T960 122T1200 128V160H0Z"/></svg>
    ${deco(INGOT,'left:6%;bottom:2%;width:clamp(34px,6%,64px)','fp-bob')}
    ${deco(INGOT,'right:8%;bottom:3%;width:clamp(28px,5%,52px);animation-delay:-1.8s','fp-bob')}
    <div class="four-scene-fog"></div><div class="four-scene-vignette"></div>`,
  midautumn:()=>`
    <div class="four-scene-sky"></div>${starField(56,'#dfe9ff')}
    <div class="four-scene-orb"></div>
    ${deco(CLOUD,'left:3%;top:7%;width:clamp(80px,15%,160px)','fp-float')}
    ${deco(CLOUD,'right:24%;top:12%;width:clamp(66px,12%,130px);animation-delay:-4.4s','fp-float')}
    ${particles(26,'fp-drift','#ffe0a0')}
    <svg class="four-scene-ground" viewBox="0 0 1200 160" preserveAspectRatio="none">${MA_GROUND.replace(/^<svg[^>]*>|<\/svg>$/g,'')}</svg>
    ${deco(RABBIT,'left:5%;bottom:3%;width:clamp(38px,7%,72px)','fp-bob')}
    ${deco(RABBIT,'right:7%;bottom:2%;width:clamp(30px,5.5%,58px);animation-delay:-2.4s','fp-bob')}
    ${deco(LANTERN,'left:38%;top:0;width:clamp(26px,4%,44px);opacity:.7','fp-sway')}
    <div class="four-scene-fog"></div><div class="four-scene-vignette"></div>`,
  independence:()=>`
    <div class="four-scene-sky"></div>${starField(58,'#dbe7ff')}
    <div class="four-scene-orb"></div>
    ${buntingBand()}
    ${burst(12,4,'clamp(88px,17%,176px)','#ff7a63','0')}
    ${burst(70,1,'clamp(74px,14%,148px)','#8fb4ff','1.7')}
    ${burst(43,11,'clamp(58px,11%,116px)','#ffe6a8','3.1')}
    ${burst(86,17,'clamp(44px,8%,88px)','#ffffff','2.3')}
    ${deco(US_FLAG,'left:2%;bottom:3%;width:clamp(52px,9%,96px);opacity:.92;filter:drop-shadow(0 6px 10px #0008)','fp-sway')}
    ${deco(US_FLAG,'right:3%;bottom:5%;width:clamp(38px,7%,72px);opacity:.72;animation-delay:-2.4s;filter:drop-shadow(0 6px 10px #0008)','fp-sway')}
    ${particles(20,'fp-drift','#ffe6a8')}
    <svg class="four-scene-ground" viewBox="0 0 1200 160" preserveAspectRatio="none">
      <g fill="#080f24"><rect x="18" y="92" width="52" height="68"/><rect x="74" y="66" width="38" height="94"/><rect x="118" y="104" width="60" height="56"/><rect x="184" y="78" width="34" height="82"/><rect x="224" y="96" width="48" height="64"/><rect x="286" y="58" width="30" height="102"/><rect x="322" y="88" width="56" height="72"/><rect x="392" y="110" width="44" height="50"/><rect x="700" y="98" width="52" height="62"/><rect x="758" y="72" width="36" height="88"/><rect x="800" y="106" width="64" height="54"/><rect x="870" y="84" width="34" height="76"/><rect x="910" y="62" width="42" height="98"/><rect x="958" y="100" width="56" height="60"/><rect x="1020" y="80" width="36" height="80"/><rect x="1062" y="94" width="52" height="66"/><rect x="1120" y="70" width="40" height="90"/></g>
      <g fill="#ffd479" opacity=".42"><circle cx="90" cy="80" r="2"/><circle cx="90" cy="94" r="2"/><circle cx="199" cy="96" r="2"/><circle cx="199" cy="110" r="2"/><circle cx="300" cy="76" r="2"/><circle cx="300" cy="92" r="2"/><circle cx="774" cy="90" r="2"/><circle cx="774" cy="106" r="2"/><circle cx="928" cy="80" r="2"/><circle cx="928" cy="96" r="2"/><circle cx="1038" cy="98" r="2"/><circle cx="1038" cy="114" r="2"/><circle cx="1138" cy="88" r="2"/><circle cx="1138" cy="104" r="2"/></g>
      <path fill="#101c3c" d="M0 124Q200 104 400 120T800 112T1200 118V160H0Z"/>
      <path fill="#182a58" d="M0 142Q240 128 480 140T960 134T1200 140V160H0Z"/>
    </svg>
    <div class="four-scene-fog"></div><div class="four-scene-vignette"></div>`,
  thanksgiving:()=>`
    <div class="four-scene-sky"></div>${starField(22,'#ffe2b0')}
    <div class="four-scene-orb"></div>
    ${fallers(MAPLE,16,18,36)}
    ${particles(18,'fp-fall','#ffc46b')}
    ${deco(pumpkin,'left:2%;bottom:2%;width:clamp(46px,8%,88px)')}
    ${deco(TURKEY,'right:3%;bottom:2%;width:clamp(52px,9%,100px);animation-delay:-1.6s')}
    <svg class="four-scene-ground" viewBox="0 0 1200 160" preserveAspectRatio="none"><path fill="#3a1a0a" d="M0 100Q180 76 360 94T720 86T1200 92V160H0Z"/><path fill="#54260e" d="M0 132Q240 112 480 128T960 122T1200 128V160H0Z"/></svg>
    <div class="four-scene-fog"></div><div class="four-scene-vignette"></div>`,
  valentine:()=>`
    <div class="four-scene-sky"></div>${starField(38,'#ffd6e6')}
    <div class="four-scene-orb"></div>
    ${deco(HEART,'left:6%;top:12%;width:clamp(28px,5%,54px);opacity:.55','fp-float')}
    ${deco(HEART,'right:9%;top:20%;width:clamp(22px,4%,42px);opacity:.45;animation-delay:-3s','fp-float')}
    ${deco(HEART,'left:21%;top:31%;width:clamp(16px,3%,30px);opacity:.35;animation-delay:-5.4s','fp-float')}
    ${deco(ROSE,'left:3%;bottom:2%;width:clamp(42px,7%,76px)','fp-sway')}
    ${deco(ROSE,'right:4%;bottom:3%;width:clamp(34px,6%,62px);animation-delay:-2.2s','fp-sway')}
    ${particles(22,'fp-drift','#ffb6d2')}
    <svg class="four-scene-ground" viewBox="0 0 1200 160" preserveAspectRatio="none"><path fill="#3d0d26" d="M0 102Q180 78 360 96T720 88T1200 94V160H0Z"/><path fill="#591735" d="M0 132Q240 112 480 128T960 122T1200 128V160H0Z"/></svg>
    <div class="four-scene-fog"></div><div class="four-scene-vignette"></div>`,
  stpatricks:()=>`
    <div class="four-scene-sky"></div>${starField(34,'#d6ffe2')}
    <div class="four-scene-orb"></div>
    ${deco(RAINBOW,'left:6%;top:2%;width:clamp(120px,24%,260px);opacity:.5','fp-bob')}
    ${deco(CLOVER,'left:4%;bottom:4%;width:clamp(34px,6%,62px)','fp-bob')}
    ${deco(CLOVER,'right:6%;bottom:7%;width:clamp(26px,4.5%,48px);animation-delay:-2.1s','fp-bob')}
    ${deco(CLOVER,'left:17%;top:36%;width:clamp(20px,3.5%,36px);opacity:.6;animation-delay:-3.7s','fp-float')}
    ${deco(GOLD_POT,'right:2%;bottom:1%;width:clamp(50px,9%,94px)','fp-bob')}
    ${particles(20,'fp-drift','#ffe08a')}
    <svg class="four-scene-ground" viewBox="0 0 1200 160" preserveAspectRatio="none"><path fill="#062a19" d="M0 100Q180 76 360 94T720 86T1200 92V160H0Z"/><path fill="#0b3f26" d="M0 132Q240 112 480 128T960 122T1200 128V160H0Z"/></svg>
    <div class="four-scene-fog"></div><div class="four-scene-vignette"></div>`,
  easter:()=>`
    <div class="four-scene-sky"></div>${starField(30,'#f0e2ff')}
    <div class="four-scene-orb"></div>
    ${deco(CLOUD,'left:3%;top:8%;width:clamp(70px,13%,136px)','fp-float')}
    ${deco(CLOUD,'right:5%;top:16%;width:clamp(60px,11%,116px);animation-delay:-3.8s','fp-float')}
    ${deco(EGG,'left:3%;bottom:2%;width:clamp(32px,5.5%,58px)','fp-bob')}
    ${deco(EGG,'left:11%;bottom:1%;width:clamp(26px,4.5%,46px);animation-delay:-1.4s','fp-bob')}
    ${deco(EGG,'right:12%;bottom:2%;width:clamp(28px,5%,52px);animation-delay:-2.6s','fp-bob')}
    ${deco(RABBIT,'right:3%;bottom:1%;width:clamp(40px,7%,74px)','fp-bob')}
    ${deco(FLOWER,'left:23%;bottom:3%;width:clamp(18px,3%,30px);opacity:.85','fp-sway')}
    ${particles(18,'fp-drift','#ffe6a8')}
    <svg class="four-scene-ground" viewBox="0 0 1200 160" preserveAspectRatio="none"><path fill="#241348" d="M0 100Q180 76 360 94T720 86T1200 92V160H0Z"/><path fill="#33205e" d="M0 132Q240 112 480 128T960 122T1200 128V160H0Z"/></svg>
    <div class="four-scene-fog"></div><div class="four-scene-vignette"></div>`
};

/* -------------------------------------------------- picker preview scenes */
const embed=(svg,x,y,w,h,opacity=1)=>svg.replace(/^<svg([^>]*)>/,(_m,attrs)=>`<svg${attrs} x="${x}" y="${y}" width="${w}" height="${h}" opacity="${opacity}">`);
const pvStars=(n,color)=>{
  resetSeed(4411);
  return Array.from({length:n},()=>{
    const x=(rand()*240).toFixed(1),y=(rand()*54).toFixed(1),r=(.5+rand()*1.1).toFixed(1);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${(.35+rand()*.55).toFixed(2)}"/>`;
  }).join('');
};
const pvRays=(cx,cy,r,color)=>Array.from({length:12},(_,i)=>{
  const a=i*Math.PI/6,r1=r*.32,r2=r;
  return `<line x1="${(cx+Math.cos(a)*r1).toFixed(1)}" y1="${(cy+Math.sin(a)*r1).toFixed(1)}" x2="${(cx+Math.cos(a)*r2).toFixed(1)}" y2="${(cy+Math.sin(a)*r2).toFixed(1)}" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>`;
}).join('');
const pvHoles=Array.from({length:7},(_,i)=>`<circle cx="${34+i*29}" cy="70" r="7" fill="#0004" stroke="#ffffff14" stroke-width="1"/>`).join('');
const pvRack=`<rect x="16" y="56" width="208" height="28" rx="7" fill="#ffffff08" stroke="#ffffff1c" stroke-width="1"/>${pvHoles}`;
const pvMoon=(cx,cy,r,c1,c2)=>`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c1}" opacity=".16"/><circle cx="${cx}" cy="${cy}" r="${r*.7}" fill="${c2}"/>`;
const PREVIEW_ART={
  classic:()=>`${pvStars(18,'#cfe0ff')}${pvRack}
    <circle cx="92" cy="70" r="7" fill="#f3bd43"/><circle cx="150" cy="70" r="7" fill="#e85b79"/>`,
  halloween:()=>`${pvStars(22,'#ffe9c9')}${pvMoon(204,16,13,'#ffb45a','#ffe6ac')}
    ${embed(bat(),20,8,30,15)}${embed(bat(),98,20,22,11,.8)}
    ${embed(pumpkin,8,22,40,38)}${embed(pumpkin,188,26,34,32)}
    ${embed(ghostSvg,92,16,34,38,.7)}${pvRack}`,
  christmas:()=>`${pvStars(22,'#dff1ff')}${pvMoon(206,14,11,'#cfe8ff','#f2fbff')}
    ${embed(XMAS_LIGHTS,0,0,240,20,.9)}
    ${embed(XMAS_TREE,6,20,40,56)}${embed(XMAS_TREE,196,24,34,48)}
    ${embed(XMAS_GIFT,92,42,32,30)}
    ${Array.from({length:12},(_,i)=>`<circle cx="${(12+i*20)%236+4}" cy="${(i*13)%52+8}" r="1.7" fill="#fff" opacity=".85"/>`).join('')}${pvRack}`,
  spring:()=>`${pvStars(16,'#ffd9a0')}${pvMoon(204,16,12,'#ffc65a','#fff1c4')}
    ${pvRays(48,18,21,'#ffd479')}${pvRays(156,14,17,'#ff8a5c')}
    ${embed(LANTERN,12,0,26,44)}${embed(LANTERN,202,0,22,38,.9)}
    ${embed(INGOT,88,44,32,20)}${pvRack}`,
  midautumn:()=>`${pvStars(20,'#dfe9ff')}${pvMoon(198,20,19,'#ffd98a','#fff6de')}
    ${embed(CLOUD,4,10,56,22,.75)}${embed(CLOUD,120,36,50,20,.55)}
    ${embed(RABBIT,16,32,38,42)}${embed(LANTERN,206,22,16,28,.7)}${pvRack}`,
  independence:()=>`${pvStars(26,'#dbe7ff')}
    ${embed(BUNTING,0,0,240,24)}
    ${pvRays(48,20,20,'#ff6b5a')}${pvRays(152,16,18,'#7fa8ff')}${pvRays(104,32,13,'#ffe6a8')}
    ${embed(US_FLAG,8,38,38,24)}${embed(US_FLAG,194,40,32,20,.8)}${pvRack}`,
  thanksgiving:()=>`${pvStars(14,'#ffe2b0')}${pvMoon(204,16,12,'#ffb45a','#ffe8bc')}
    ${embed(MAPLE,20,4,20,22)}${embed(MAPLE,84,12,16,18,.85)}${embed(MAPLE,146,2,18,20,.8)}
    ${embed(pumpkin,6,32,38,36)}${embed(TURKEY,180,22,48,50)}${pvRack}`,
  valentine:()=>`${pvStars(18,'#ffd6e6')}${pvMoon(204,16,11,'#ff9ec2','#ffe7f1')}
    ${embed(HEART,18,8,28,25,.95)}${embed(HEART,148,4,20,18,.8)}${embed(HEART,104,28,14,13,.65)}
    ${embed(ROSE,10,30,36,48)}${embed(ROSE,194,32,32,42,.9)}${pvRack}`,
  stpatricks:()=>`${pvStars(16,'#d6ffe2')}${pvMoon(204,16,10,'#ffe08a','#fff4c4')}
    ${embed(RAINBOW,56,-18,128,64,.8)}
    ${embed(CLOVER,8,26,28,30)}${embed(CLOVER,208,28,22,24,.9)}
    ${embed(GOLD_POT,150,34,44,36)}${pvRack}`,
  easter:()=>`${pvStars(18,'#f0e2ff')}${pvMoon(204,16,12,'#e9b9ff','#fff4ff')}
    ${embed(CLOUD,4,8,52,20,.7)}${embed(CLOUD,148,24,46,18,.6)}
    ${embed(EGG,6,30,26,36)}${embed(EGG,34,36,20,28)}${embed(EGG,208,32,22,32,.9)}
    ${embed(RABBIT,164,26,36,42)}${embed(FLOWER,104,42,16,16,.9)}${pvRack}`
};
const previewArt=id=>`<svg class="fp-pv-art" viewBox="0 0 240 88" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${(PREVIEW_ART[id]||PREVIEW_ART.classic)()}</svg>`;

/* ------------------------------------------------------------- apply theme */
function apply(){
  const body=document.body,root=document.documentElement;
  for(const t of THEMES)body.classList.toggle('four-theme-'+t.id,t.id===current);
  body.classList.toggle('four-themed',current!=='classic');
  root.dataset.theme=current;
  const change=document.querySelector('.four-room-theme-change');
  if(change){const locked=body.dataset.screen==='play';change.hidden=locked;change.disabled=locked;}
  updatePickerCards();updateRoomChips();
  try{if(window.parent!==window)window.parent.postMessage({type:'joyflock:theme',theme:current},'*');}catch{}
}
function syncUrl(){
  // Keep the URL in step with the room skin so a refresh re-opens the same one.
  const url=new URL(location.href);
  if(!url.searchParams.has('theme')&&!url.searchParams.has('room'))return;
  url.searchParams.set('theme',current);
  history.replaceState(null,'',url);
}
function rebuildScene(){
  const panel=document.querySelector('.game-panel');
  if(!panel)return;
  const old=panel.querySelector('.four-scene');
  if(old)old.remove();
  if(current==='classic'||!SCENES[current])return;
  const scene=document.createElement('div');
  scene.className='four-scene';scene.dataset.theme=current;scene.setAttribute('aria-hidden','true');
  scene.innerHTML=SCENES[current]();
  panel.prepend(scene);
}
export function setTheme(id,{persist=true,silent=false}={}){
  if(!IDS.has(id))return;
  const changed=id!==current;
  current=id;
  if(persist)write(id);
  apply();syncUrl();
  if(changed){
    rebuildScene();
    // Both remote and local choices refresh seat art and shop gating. This
    // notification never broadcasts the choice back into a room.
    window.dispatchEvent(new CustomEvent('joyflock:theme-applied',{detail:{theme:id}}));
    // Only an explicit user choice is broadcast; applying a remote choice is
    // silent, which keeps two players from bouncing skins back and forth.
    if(!silent)announce({theme:id,from:instanceId,silent:false});
  }
}
export const getTheme=()=>current;
export const themeParam=()=>current;

/* ------------------------------------------------------------ theme picker */
let picker=null,selected=current,pendingConfirm=null;
function ensurePicker(){
  if(picker)return picker;
  picker=document.createElement('dialog');
  picker.className='four-picker';picker.id='four-picker';
  picker.innerHTML=`
    <div class="four-picker-head">
      <span class="eyebrow">SEASONAL SKINS</span>
      <h2>选择主题</h2>
      <p>默认主题可使用商城棋子和棋盘；其他主题使用整套主题外观。</p>
      <button class="four-picker-close" type="button" aria-label="关闭">×</button>
    </div>
    <div class="four-picker-grid"></div>
    <div class="four-picker-scroll-hint">10 套主题 · 向下滚动查看全部 <span aria-hidden="true">↓</span></div>
    <div class="four-picker-foot">
      <button class="four-picker-cancel" type="button">取消</button>
      <button class="four-picker-confirm" type="button">开始游戏</button>
    </div>`;
  document.body.append(picker);
  const grid=picker.querySelector('.four-picker-grid');
  const hint=picker.querySelector('.four-picker-scroll-hint');
  /* Image-only cards are short enough to fit all ten on a tall screen; only
     mention scrolling when the grid actually overflows. */
  const syncHint=()=>{hint.hidden=grid.scrollHeight<=grid.clientHeight+2;};
  picker._syncHint=syncHint;
  window.addEventListener('resize',syncHint);
  /* Cards are pure artwork now: no visible name or caption. The theme name
     survives only in aria-label so screen readers can still tell them apart. */
  grid.innerHTML=THEMES.map(t=>`<button class="four-picker-card" type="button" data-theme="${t.id}" aria-label="${t.en} · ${t.zh}" style="--sw-bg:${t.sw}"><span class="four-picker-preview" aria-hidden="true">${previewArt(t.id)}</span></button>`).join('');
  grid.addEventListener('click',event=>{
    const card=event.target.closest('.four-picker-card');
    if(!card)return;
    selected=card.dataset.theme;updatePickerCards();
  });
  picker.querySelector('.four-picker-close').addEventListener('click',()=>picker.close());
  picker.querySelector('.four-picker-cancel').addEventListener('click',()=>picker.close());
  picker.querySelector('.four-picker-confirm').addEventListener('click',()=>{
    setTheme(selected);
    const run=pendingConfirm;pendingConfirm=null;picker.close();
    if(run)run(selected);
  });
  picker.addEventListener('cancel',()=>{pendingConfirm=null;});
  return picker;
}
function updatePickerCards(){
  if(!picker)return;
  for(const card of picker.querySelectorAll('.four-picker-card'))card.setAttribute('aria-pressed',String(card.dataset.theme===selected));
}
export function openThemePicker({onConfirm=null,confirmText='开始游戏',allowInPlay=false}={}){
  // The skin is chosen before a game starts. Once the board is live it stays
  // fixed for every mode: quick match, friend room and local solo alike.
  if(!allowInPlay&&document.body.classList.contains('connect-four-game')&&document.body.dataset.screen==='play')return false;
  const dialog=ensurePicker();
  selected=current;
  pendingConfirm=onConfirm;
  dialog.querySelector('.four-picker-confirm').textContent=confirmText;
  updatePickerCards();
  if(!dialog.open)dialog.showModal();
  requestAnimationFrame(()=>dialog._syncHint&&dialog._syncHint());
  return true;
}

/* ---------------------------------------------------- create-room option */
function ensureRoomChips(){
  const tools=document.getElementById('room-tools');
  if(!tools||tools.querySelector('.four-room-theme'))return;
  const row=document.createElement('div');
  row.className='four-room-theme';
  row.innerHTML='<span class="four-room-theme-label">房间主题</span><div class="four-room-theme-current"><span class="four-room-theme-icon" aria-hidden="true"></span><b class="four-room-theme-name"></b><button type="button" class="four-room-theme-change">更换</button></div>';
  row.querySelector('.four-room-theme-change').addEventListener('click',()=>openThemePicker({confirmText:'应用主题'}));
  tools.prepend(row);
}
function updateRoomChips(){
  const row=document.querySelector('.four-room-theme');
  if(!row)return;
  const theme=byId(current),icon=row.querySelector('.four-room-theme-icon'),name=row.querySelector('.four-room-theme-name');
  if(icon)icon.textContent=theme.icon;
  // Keep the Chinese source text: bindTableLocale() translates it (and back again).
  if(name)name.textContent=theme.zh;
}

/* --------------------------------------------------------------- mount */
const LABEL_NAMES=new Set(THEMES.map(t=>t.zh));
let watchedTop=null,boardObserver=null;
function purgeBoardLabels(){
  const top=document.querySelector('.game-panel .board-top');
  if(!top)return;
  top.querySelectorAll('.four-theme-badge,.four-theme-toggle,[data-theme-label]').forEach(node=>node.remove());
  for(const node of Array.from(top.children)){
    if(node.id==='mode'||node.id==='back-home')continue;
    const text=(node.textContent||'').trim().replace(/^[◆·•\s]+/,'').trim();
    if(LABEL_NAMES.has(text))node.remove();
  }
}
function watchBoard(top){
  if(!top||top===watchedTop)return;
  boardObserver?.disconnect();
  watchedTop=top;
  boardObserver=new MutationObserver(purgeBoardLabels);
  boardObserver.observe(top,{childList:true,subtree:true,characterData:true});
}
function mount(){
  const body=document.body;
  if(!body.classList.contains('connect-four-game'))return;
  ensureRoomChips();
  const panel=document.querySelector('.game-panel');
  // The theme is chosen before a game starts. During play the board header
  // shows no theme control or status label at all. Keep purging so a label
  // left behind by an older cached script cannot reappear.
  purgeBoardLabels();
  watchBoard(panel?.querySelector('.board-top'));
  if(panel&&!panel.querySelector('.four-scene')&&current!=='classic')rebuildScene();
  apply();
}
new MutationObserver(mount).observe(document.body,{attributes:true,attributeFilter:['class','data-screen']});
mount();
