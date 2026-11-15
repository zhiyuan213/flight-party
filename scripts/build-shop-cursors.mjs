// Authored vector cursor set. No downloaded art, build dependency or runtime build.
import {writeFileSync} from 'node:fs';
const root=new URL('../dist/assets/shop/',import.meta.url);
const arrow='M3 2 L3 24 L9.3 18.6 L13.4 28.2 L17.6 26.4 L13.6 17.4 L22.2 17.5 Z';
const path=(d,fill,extra='')=>`<path d="${d}" fill="${fill}" ${extra}/>`;
const edge='stroke="#17283e" stroke-width="1.35" stroke-linejoin="round"';
const sets=[
  {id:'ember',tier:'rare',colour:'#f5b650',badge:path('M26.6 1.5 C27.7 4.7 30.3 5.2 30.1 8 C30 10.8 27.5 12.1 25.4 11.4 C22.1 10.4 21.8 7.6 23.6 5.2 C23.7 7 24.6 7.5 25 6.2 C25.6 4.8 25.7 3.1 26.6 1.5 Z','#ed7850',edge)+path('M26.5 6.4 C26.5 8.2 28.2 8.5 27.6 10 C27 11 25.2 10.6 25.2 9.4 C25.2 8.5 26 7.6 26.5 6.4 Z','#ffe0a2')},
  {id:'leaf',tier:'rare',colour:'#72c5a1',badge:path('M21.7 10.5 C21.2 4.6 24.8 1.7 30.4 2.6 C30.5 8.1 27.3 12 21.7 10.5 Z','#3d9c78',edge)+path('M22 11 L28.5 4.5 M24.2 8.8 L23.9 6.4 M26.2 6.8 L28.3 7','none','stroke="#e7f6ca" stroke-width="1.05" stroke-linecap="round"')},
  {id:'rainbow',tier:'epic',colour:'#dc9bbf',animation:'badge-float 2.8s ease-in-out infinite',badge:'<g class="badge-motion">'+path('M20.8 9.7 C20.8 2.2 30.3 2.2 30.3 9.7','none','stroke="#17283e" stroke-width="3.7" stroke-linecap="round"')+path('M20.8 9.7 C20.8 2.2 30.3 2.2 30.3 9.7','none','stroke="#ef8198" stroke-width="2.5" stroke-linecap="round"')+path('M23.1 9.7 C23.1 5.2 28 5.2 28 9.7','none','stroke="#ffd574" stroke-width="2" stroke-linecap="round"')+'<circle cx="21.2" cy="10.3" r="1.6" fill="#f5f5f0"/><circle cx="29.9" cy="10.3" r="1.6" fill="#f5f5f0"/></g>'},
  {id:'frost',tier:'epic',colour:'#81c8e9',animation:'badge-turn 8s linear infinite',badge:'<g class="badge-motion">'+path('M26 1.3 L26 12.2 M21.3 4 L30.7 9.5 M21.3 9.5 L30.7 4','none','stroke="#214563" stroke-width="2.7" stroke-linecap="round"')+path('M26 1.3 L26 12.2 M21.3 4 L30.7 9.5 M21.3 9.5 L30.7 4 M24.3 2.4 L26 4 L27.7 2.4 M24.3 11.2 L26 9.5 L27.7 11.2','none','stroke="#c6f4ff" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"')+'<circle cx="26" cy="6.8" r="1.3" fill="#ffffff"/></g>'},
  {id:'amethyst',tier:'legend',colour:'#ab8be8',glow:'#d9c8f7',glowMid:'#f2e9ff',animation:'badge-gem 3.2s ease-in-out infinite',badge:'<g class="badge-motion">'+path('M25.8 1.5 L30.1 5.4 L26.2 12.1 L21.8 6 Z','#a287e1',edge)+path('M25.8 1.5 L26.1 6.2 L21.8 6 Z','#e8d3ff')+path('M26.1 6.2 L30.1 5.4 L26.2 12.1 Z','#7151b5')+'</g><path class="badge-spark" d="M30.1 1 L30.5 2.1 L31.5 2.5 L30.5 2.9 L30.1 4 L29.7 2.9 L28.7 2.5 L29.7 2.1 Z" fill="#fff1be"/>'},
  {id:'comet',tier:'legend',colour:'#71cdd1',glow:'#aee9ec',glowMid:'#dffcfd',animation:'badge-orbit 4s linear infinite',badge:'<circle cx="26" cy="7" r="3.4" fill="#559eae" stroke="#193246" stroke-width="1.1"/><circle cx="25.1" cy="6" r="1" fill="#b5f5e3"/><g class="badge-motion"><ellipse cx="26" cy="7" rx="4.5" ry="2.4" fill="none" stroke="#f4dfa6" stroke-width="1.1"/><circle cx="30.4" cy="7" r="1.05" fill="#fff1b7" stroke="#39556b" stroke-width=".65"/></g>'},
  {id:'bubble',tier:'rare',colour:'#7fd0e0',badge:'<circle cx="26" cy="7" r="4.4" fill="#5fb6d8" stroke="#17283e" stroke-width="1.35"/><circle cx="24.6" cy="5.6" r="1.3" fill="#dff7ff"/><circle cx="21.3" cy="3.7" r="2" fill="#8fd8ec" stroke="#17283e" stroke-width="1.35"/><circle cx="20.7" cy="3.1" r=".65" fill="#eafaff"/><circle cx="30.3" cy="11.1" r="1.7" fill="#8fd8ec" stroke="#17283e" stroke-width="1.35"/><circle cx="29.9" cy="10.5" r=".55" fill="#eafaff"/>'},
  {id:'shell',tier:'rare',colour:'#f2a78b',badge:'<path d="M25.9 2.1 C23 2.1 21.3 3.9 21.2 6.6 C21.1 9.3 22.9 11.4 25.9 11.5 C28.9 11.4 30.7 9.3 30.6 6.6 C30.5 3.9 28.8 2.1 25.9 2.1 Z" fill="#ffd9c4" stroke="#17283e" stroke-width="1.35" stroke-linejoin="round"/><path d="M25.9 11.3 L21.9 3.8 M25.9 11.3 L23.4 2.4 M25.9 11.3 L25.9 2.1 M25.9 11.3 L28.4 2.4 M25.9 11.3 L29.9 3.8" fill="none" stroke="#e0936c" stroke-width=".9" stroke-linecap="round"/><circle cx="25.9" cy="11" r="1" fill="#f4a583"/>'},
  {id:'heart',tier:'epic',colour:'#e8799a',animation:'badge-beat 1.3s ease-in-out infinite',badge:'<g class="badge-motion"><path d="M26 11.6 C25.1 10.5 23.5 9.5 22.3 8 C20.9 6.4 20.8 4.2 22.3 3 C23.6 1.9 25.4 2.2 26 3.2 C26.6 2.2 28.4 1.9 29.7 3 C31.2 4.2 31.1 6.4 29.7 8 C28.5 9.5 26.9 10.5 26 11.6 Z" fill="#f27d9d" stroke="#17283e" stroke-width="1.35" stroke-linejoin="round"/><circle cx="23.8" cy="4.4" r=".95" fill="#ffe0ec"/></g>'},
  {id:'butterfly',tier:'epic',colour:'#b98fe0',animation:'badge-flap 1.1s ease-in-out infinite',badge:'<g class="badge-motion"><path d="M24.9 4 C23 2.5 21.2 1.9 20.3 2.6 C19.5 3.4 20 5 21.6 5.9 C23 6.7 24.3 6.3 24.9 5.4 Z" fill="#c9a4f0" stroke="#17283e" stroke-width="1.15" stroke-linejoin="round"/><path d="M26.7 4 C28.6 2.5 30.4 1.9 31.3 2.6 C32.1 3.4 31.6 5 30 5.9 C28.6 6.7 27.3 6.3 26.7 5.4 Z" fill="#c9a4f0" stroke="#17283e" stroke-width="1.15" stroke-linejoin="round"/><path d="M24.9 7.3 C23.3 6.2 21.7 6 21 6.8 C20.3 7.6 20.9 8.9 22.4 9.4 C23.7 9.8 24.8 9.1 24.9 8.2 Z" fill="#b085e6" stroke="#17283e" stroke-width="1.15" stroke-linejoin="round"/><path d="M26.7 7.3 C28.3 6.2 29.9 6 30.6 6.8 C31.3 7.6 30.7 8.9 29.2 9.4 C27.9 9.8 26.8 9.1 26.7 8.2 Z" fill="#b085e6" stroke="#17283e" stroke-width="1.15" stroke-linejoin="round"/></g><path d="M25.8 3.3 C25 3.3 24.6 4 24.6 4.9 L24.6 8.7 C24.6 9.7 25 10.5 25.8 10.5 C26.6 10.5 27 9.7 27 8.7 L27 4.9 C27 4 26.6 3.3 25.8 3.3 Z" fill="#6f4bb5" stroke="#17283e" stroke-width="1"/><path d="M25.2 3.5 C24.5 2.5 23.9 1.8 23.2 1.7 M26.4 3.5 C27.1 2.5 27.7 1.8 28.4 1.7" fill="none" stroke="#17283e" stroke-width=".9" stroke-linecap="round"/><circle cx="23.1" cy="1.6" r=".55" fill="#d8bdf6"/><circle cx="28.5" cy="1.6" r=".55" fill="#d8bdf6"/>'},
  {id:'nova',tier:'legend',colour:'#9d7bff',glow:'#cbb6ff',glowMid:'#efe7ff',animation:'badge-nova 2.8s ease-in-out infinite',badge:'<g class="badge-motion"><path d="M26 0.9 L27.3 4.6 L31 6 L27.3 7.4 L26 11.1 L24.7 7.4 L21 6 L24.7 4.6 Z" fill="#c9a9ff" stroke="#17283e" stroke-width="1.2" stroke-linejoin="round"/><circle cx="26" cy="6" r="1.6" fill="#fff3d6" stroke="#17283e" stroke-width="1"/></g><path class="badge-spark" d="M30 0.9 L30.4 2 L31.4 2.4 L30.4 2.8 L30 3.9 L29.6 2.8 L28.6 2.4 L29.6 2 Z" fill="#fff1be"/>'}
];
const styles=s=>`<style>
${s.animation?`.badge-motion{transform-box:fill-box;transform-origin:center;animation:${s.animation}}`:''}
${s.id==='comet'?'.badge-motion{transform-box:view-box;transform-origin:26px 7px}':''}
${s.tier==='legend'?`.arrow-shift{animation:arrow-colour 5s ease-in-out infinite}.arrow-glint{animation:arrow-glint 4.8s ease-in-out infinite}.badge-spark{animation:spark 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}`:''}
@keyframes badge-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.5px)}}
@keyframes badge-turn{to{transform:rotate(360deg)}}
@keyframes badge-gem{0%,100%{transform:rotate(-8deg) scale(.95)}50%{transform:rotate(8deg) scale(1.05)}}
@keyframes badge-orbit{to{transform:rotate(360deg)}}
@keyframes badge-beat{0%,100%{transform:scale(1)}14%{transform:scale(1.15)}28%{transform:scale(1)}40%{transform:scale(1.08)}}
@keyframes badge-flap{0%,100%{transform:scaleX(1)}50%{transform:scaleX(.72)}}
@keyframes badge-nova{0%,100%{transform:rotate(0) scale(.82)}50%{transform:rotate(22deg) scale(1.12)}}
@keyframes arrow-colour{0%,100%{stop-color:${s.glow||s.colour}}50%{stop-color:${s.glowMid||s.glow||s.colour}}}
@keyframes arrow-glint{0%,15%{transform:translate(-22px,0);opacity:0}25%{opacity:.95}62%{transform:translate(22px,0);opacity:0}100%{transform:translate(22px,0);opacity:0}}
@keyframes spark{0%,100%{opacity:.45;transform:scale(.8)}50%{opacity:1;transform:scale(1.1)}}
@media(prefers-reduced-motion:reduce){*{animation:none!important}.arrow-glint{display:none}}
</style>`;
for(const s of sets){
  const defs=`<defs><linearGradient id="arrowGradient" x1="0" y1="0" x2="1" y2="1"><stop class="arrow-shift" offset="0" stop-color="${s.glow||s.colour}"/><stop offset="1" stop-color="${s.colour}"/></linearGradient><clipPath id="arrowClip">${path(arrow,'#fff')}</clipPath></defs>`;
  const base=path(arrow,s.tier==='legend'?'url(#arrowGradient)':s.colour,`${edge} class="cursor-arrow" data-base-fill="${s.colour}"`);
  const glint=s.tier==='legend'?'<g clip-path="url(#arrowClip)" data-raster="skip"><path class="arrow-glint" d="M0 0 L4 0 L17 32 L13 32 Z" fill="#f5edff" opacity="0"/></g>':'';
  const badge=`<g class="cursor-badge" transform="translate(0 17)">${s.badge}</g>`;
  const svg=content=>`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" data-cursor-tier="${s.tier}">${s.tier!=='rare'?styles(s):''}${s.tier==='legend'?defs:''}${content}</svg>\n`;
  writeFileSync(new URL(`cursor-${s.id}.svg`,root),svg(base+glint+badge));
  if(s.tier!=='rare'){
    writeFileSync(new URL(`cursor-${s.id}-pointer.svg`,root),svg(base));
    writeFileSync(new URL(`cursor-${s.id}-effect.svg`,root),svg((s.tier==='legend'?base+glint:'')+badge));
  }
}
console.log('Authored eleven cursor SVGs plus animated overlays and native arrow underlays.');
