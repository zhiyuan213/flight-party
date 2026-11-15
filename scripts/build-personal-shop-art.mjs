// Buildless, reproducible vector shop previews. Match emblems share the same paths.
import fs from 'node:fs';
import {emblemSvg,markSvg,stoneSvg} from '../dist/table/personal-piece-art.js';
const dir=new URL('../dist/assets/shop/game-styles/',import.meta.url);
fs.mkdirSync(dir,{recursive:true});
const themes=['default','neon','jade','aurora','coral','pearl'];
const pinkThemes=['default','blossom','heart','bow','diamond','candy'];
const games=['four','gomoku','xo','chess'],only=process.argv[2];
if(only&&!games.includes(only)&&only!=='four-board')throw Error('Unknown game filter: '+only);
// Use the exact in-match material instead of a second shop-only palette.
const fourCss=fs.readFileSync(new URL('../dist/table/four-feedback.css',import.meta.url),'utf8');
const fourMaterial=decodeURIComponent(fourCss.match(/--four-one:url\("data:image\/svg\+xml,([^"\n]+)"\)/)[1]);
const fourMaterialPink=decodeURIComponent(fourCss.match(/--four-two:url\("data:image\/svg\+xml,([^"\n]+)"\)/)[1]);
const defs=`<defs><radialGradient id="counter" cx=".3" cy=".22" r=".8"><stop stop-color="#fff2b7"/><stop offset=".34" stop-color="#ffcf58"/><stop offset=".75" stop-color="#e4a32b"/><stop offset="1" stop-color="#986017"/></radialGradient><radialGradient id="stone" cx=".32" cy=".25" r=".8"><stop stop-color="#697380"/><stop offset=".4" stop-color="#2b3039"/><stop offset="1" stop-color="#0e1117"/></radialGradient><radialGradient id="stone-white" cx=".32" cy=".25" r=".8"><stop stop-color="#ffffff"/><stop offset=".4" stop-color="#e9edf1"/><stop offset="1" stop-color="#b6bec7"/></radialGradient></defs>`;
const emblem=(theme,x,y,size)=>emblemSvg(theme).replace('<svg xmlns="http://www.w3.org/2000/svg"',`<svg x="${x}" y="${y}" width="${size}" height="${size}"`);
function counter(theme){
 const base='<circle cx="120" cy="122" r="98" fill="#000" opacity=".28"/>'+fourMaterial.replace('<svg xmlns="http://www.w3.org/2000/svg"','<svg x="20" y="16" width="200" height="200"');
 return base+(theme==='default'?'':emblem(theme,64,60,112));
}
function counterPink(theme){
 const base='<circle cx="120" cy="122" r="98" fill="#000" opacity=".28"/>'+fourMaterialPink.replace('<svg xmlns="http://www.w3.org/2000/svg"','<svg x="20" y="16" width="200" height="200"');
 return base+(theme==='default'?'':emblem(theme,64,60,112));
}
function stone(theme){
 if(theme!=='default')return '<ellipse cx="122" cy="141" rx="91" ry="81" fill="#000" opacity=".3"/>'+stoneSvg(theme,1).replace('<svg xmlns="http://www.w3.org/2000/svg"','<svg x="26.25" y="22.25" width="187.5" height="187.5"');
 return '<ellipse cx="122" cy="141" rx="91" ry="81" fill="#000" opacity=".3"/><circle cx="120" cy="116" r="90" fill="url(#stone)" stroke="#03070a" stroke-width="3"/>'+
  '<ellipse cx="91" cy="70" rx="26" ry="13" fill="#fff" opacity=".16" transform="rotate(-27 91 70)"/>';
}
function stoneWhite(theme){
 if(theme!=='default')return '<ellipse cx="122" cy="141" rx="91" ry="81" fill="#000" opacity=".3"/>'+stoneSvg(theme,2).replace('<svg xmlns="http://www.w3.org/2000/svg"','<svg x="26.25" y="22.25" width="187.5" height="187.5"');
 return '<ellipse cx="122" cy="141" rx="91" ry="81" fill="#000" opacity=".3"/><circle cx="120" cy="116" r="90" fill="url(#stone-white)" stroke="#8a9099" stroke-width="3"/>'+
  '<ellipse cx="91" cy="70" rx="26" ry="13" fill="#fff" opacity=".7" transform="rotate(-27 91 70)"/>';
}
function mark(theme){
 return markSvg(theme,1).replace('<svg xmlns="http://www.w3.org/2000/svg"',
  '<svg x="20" y="20" width="200" height="200"');
}
function markO(theme){
 return markSvg(theme,2).replace('<svg xmlns="http://www.w3.org/2000/svg"',
  '<svg x="20" y="20" width="200" height="200"');
}
function xoBoard(theme){
 const p={default:['#14152b','#33364e','#17182f'],neon:['#1c2f57','#4de2ff','#131a3d'],jade:['#123a30','#7fe0b8','#0f332c'],coral:['#54222e','#ffd9c4','#341820'],pearl:['#27354c','#fff1d6','#141d2c'],aurora:['#3a2160','#d3a8ff','#241544']}[theme];
 let s=`<rect x="10" y="14" width="220" height="220" rx="14" fill="#000" opacity=".3"/><rect x="10" y="8" width="220" height="220" rx="14" fill="${p[0]}" stroke="${p[1]}" stroke-width="3"/>`;
 for(let y=0;y<3;y++)for(let x=0;x<3;x++)
  s+=`<rect x="${13+x*74}" y="${11+y*74}" width="66" height="66" rx="6" fill="${p[2]}"/>`;
 return s;
}
function board(theme){
 const palette={default:['#93c8dc','#427594','#6994b6','#254762'],neon:['#b6d9ec','#27465f','#8fbace','#183246'],coral:['#f6d8cd','#c37e72','#ef9d80','#54222e'],jade:['#c5dcc6','#28604e','#d9b45c','#184436'],pearl:['#f2ebdd','#a3b3c8','#cdb98f','#27354c'],aurora:['#ddd2ec','#51416f','#e2c582','#30213f']}[theme];
 let s=`<rect x="10" y="14" width="220" height="220" rx="12" fill="#000" opacity=".3"/><rect x="10" y="8" width="220" height="220" rx="12" fill="${palette[3]}" stroke="${palette[2]}" stroke-width="3"/><rect x="19" y="17" width="202" height="202" rx="3" fill="none" stroke="${palette[2]}" opacity=".5"/>`;
 for(let y=0;y<8;y++)for(let x=0;x<8;x++)s+=`<rect x="${24+x*24}" y="${22+y*24}" width="24" height="24" fill="${palette[(x+y)%2]}"/>`;
 if(theme==='jade')for(let i=0;i<14;i++)s+=`<path d="M24 ${30+i*13}Q80 ${10+i*13} 120 ${28+i*13}T216 ${26+i*13}" fill="none" stroke="#d3eacb" stroke-width=".7" opacity=".12"/>`;
 if(theme==='coral')for(let i=0;i<10;i++)s+=`<path d="M20 ${26+i*18}Q120 ${10+i*18} 220 ${26+i*18}" fill="none" stroke="#fff3dc" stroke-width=".7" opacity=".14"/>`;
 if(theme==='pearl')for(let i=0;i<9;i++)s+=`<path d="M18 ${22+i*22}Q120 ${6+i*22} 222 ${22+i*22}" fill="none" stroke="#fff9ed" stroke-width=".8" opacity=".15"/>`;
 if(theme==='aurora')for(const[x,y]of[[15,13],[225,13],[15,223],[225,223]])s+=`<path d="M${x-3} ${y}h6M${x} ${y-3}v6" stroke="${palette[2]}"/>`;
 return s;
}
// Four boards read the shipped finish colours and grain patterns. The same
// 7 × 6 geometry is used for all four cards; the empty wells stay unoccupied.
const fourBoardCss=fs.readFileSync(new URL('../dist/table/four-board-cosmetics.css',import.meta.url),'utf8');
function fourBoard(theme){
 const block=theme==='default'?'':fourBoardCss.match(new RegExp(`\\[data-cosmetic-board="${theme}"\\]\\{([\\s\\S]*?)\\n\\}`))[1];
 const palette=theme==='default'?{top:'#d39279',mid:'#edc1a0',bottom:'#d9947d',edge:'#9d6049',rim:'#ffead8',lip:'#ffe7ce',well:'#172638',deep:'#06121f'}:
  Object.fromEntries([...block.matchAll(/--four-board-([a-z]+):(#[a-f0-9]+);/g)].map(([,k,v])=>[k,v]));
 const p=palette;
 const grain=block.match(/url\("data:image\/svg\+xml,([^"\n]+)"\)/);
 let pattern='';
 if(grain){
  const svg=decodeURIComponent(grain[1]),vb=svg.match(/viewBox='0 0 (\d+) (\d+)'/),size=theme==='jade'?90:64;
  pattern=`<pattern id="grain" width="${size}" height="${size}" patternUnits="userSpaceOnUse" viewBox="0 0 ${vb[1]} ${vb[2]}">${svg.replace(/^<svg[^>]+>|<\/svg>$/g,'')}</pattern>`;
 }else{
  pattern=`<pattern id="grain" width="60" height="${theme==='default'?9:5}" patternUnits="userSpaceOnUse"><path d="M0 1h60M0 3h60" stroke="#fff" opacity="${theme==='default'?'.1':'.18'}" stroke-width=".5"/><path d="M0 5h60" stroke="${p.edge}" opacity=".13" stroke-width=".7"/></pattern>`;
 }
 let s=`<defs><linearGradient id="four-frame" x2=".8" y2="1"><stop stop-color="${p.top}"/><stop offset=".48" stop-color="${p.mid}"/><stop offset="1" stop-color="${p.bottom}"/></linearGradient><radialGradient id="four-well" cx=".5" cy=".68" r=".65"><stop stop-color="${p.well}"/><stop offset="1" stop-color="${p.deep}"/></radialGradient>${pattern}</defs>`;
 s+=`<rect x="10" y="32" width="220" height="190" rx="12" fill="#000" opacity=".28"/><rect x="10" y="29" width="220" height="190" rx="12" fill="${p.edge}"/><rect x="10" y="25" width="220" height="190" rx="12" fill="url(#four-frame)" stroke="${p.edge}" stroke-width="2"/><rect x="11" y="26" width="218" height="188" rx="11" fill="url(#grain)"/><rect x="13" y="28" width="214" height="184" rx="9" fill="none" stroke="${p.rim}" stroke-width="1.2" opacity=".8"/>`;
 for(let y=0;y<6;y++)for(let x=0;x<7;x++){
  const cx=30+x*30,cy=45+y*30;
  s+=`<g data-hole="${y}-${x}"><circle cx="${cx}" cy="${cy}" r="11.4" fill="url(#four-well)" stroke="${p.edge}" stroke-width="1.5"/><path d="M${cx-10.4} ${cy+5}a11.4 11.4 0 0 0 20.8 0" fill="none" stroke="${p.lip}" stroke-width="1" opacity=".9"/></g>`;
 }
 return s;
}
for(const game of games.filter(game=>!only||game===only))for(const theme of themes){
 const kind=game==='chess'?'board':'piece',id=`${game}-${kind}-${theme}`;
 const art=game==='four'?counter(theme):game==='gomoku'?stone(theme):game==='xo'?mark(theme):board(theme);
 fs.writeFileSync(new URL(`${id}.svg`,dir),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">${defs}${art}</svg>\n`);
}
if(!only||only==='gomoku')for(const theme of themes){
 fs.writeFileSync(new URL(`gomoku-white-piece-${theme}.svg`,dir),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">${defs}${stoneWhite(theme)}</svg>\n`);
}
if(!only||only==='xo')for(const theme of themes){
 fs.writeFileSync(new URL(`xo-o-piece-${theme}.svg`,dir),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">${defs}${markO(theme)}</svg>\n`);
 fs.writeFileSync(new URL(`xo-board-${theme}.svg`,dir),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">${xoBoard(theme)}</svg>\n`);
}
if(!only||only==='four')for(const theme of pinkThemes){
 fs.writeFileSync(new URL(`four-pink-piece-${theme}.svg`,dir),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">${defs}${counterPink(theme)}</svg>\n`);
}
if(!only||only==='four'||only==='four-board')for(const theme of themes){
 fs.writeFileSync(new URL(`four-board-${theme}.svg`,dir),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">${fourBoard(theme)}</svg>\n`);
}
