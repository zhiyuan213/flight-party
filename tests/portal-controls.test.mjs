import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../dist/portal-controls.js',import.meta.url),'utf8').replace('export function','function');
function setup(referrer='https://joyflock.com/?game=flight',game='flight',initialScreen='home'){
 const events={},sent=[],clicked=[],styles=[],classes=[],observed=[],locales=[];const parent={postMessage:(data,origin)=>sent.push({data,origin})},body={dataset:{screen:initialScreen},classList:{add:value=>classes.push(value)}};
 const nodes=Object.fromEntries(['account-open','language','sound','computer','local','quick','friends','ready','again','join'].map(id=>[id,{textContent:id,getAttribute:()=> 'true',click:()=>clicked.push(id),addEventListener:(type,fn)=>events[id+':'+type]=fn}]));
 const context=vm.createContext({URL,URLSearchParams,location:{search:'?embed=joyflock&game='+game},window:{parent,addEventListener:(type,fn)=>events[type]=fn},document:{referrer,body,head:{append:node=>styles.push(node)},createElement:()=>({}),getElementById:id=>nodes[id],addEventListener:(type,fn)=>events['document:'+type]=fn},MutationObserver:class{constructor(fn){this.fn=fn;}observe(node,options){observed.push({node,options,fn:this.fn});}}});vm.runInContext(source,context);context.bindPortalControls({onLocale:value=>locales.push(value)});
 const changeScreen=screen=>{body.dataset.screen=screen;for(const entry of observed)if(entry.node===body&&entry.options.attributeFilter.includes('data-screen'))entry.fn();};
 return{events,sent,clicked,parent,styles,classes,changeScreen,locales};
}
test('portal controls accept only the named parent origin and window',()=>{const s=setup();s.events.message({origin:'https://evil.test',source:s.parent,data:{type:'joyflock:control',action:'account'}});s.events.message({origin:'https://joyflock.com',source:{},data:{type:'joyflock:control',action:'account'}});assert.deepEqual(s.clicked,[]);s.events.message({origin:'https://joyflock.com',source:s.parent,data:{type:'joyflock:control',action:'account'}});assert.deepEqual(s.clicked,['account-open']);assert.equal(s.sent[0].origin,'https://joyflock.com');});
test('unknown commands cannot invoke settings or arbitrary game actions',()=>{const s=setup();s.events.message({origin:'https://joyflock.com',source:s.parent,data:{type:'joyflock:control',action:'settings'}});assert.deepEqual(s.clicked,[]);assert.match(s.styles[0].textContent,/min-width:769px/);assert.match(s.styles[0].textContent,/#settings\{display:none/);});
test('untrusted embedding cannot enable the bridge',()=>{const s=setup('https://evil.test/');assert.equal(s.sent.length,0);assert.equal(s.events.message,undefined);});

test('table games request fullscreen only by reporting play, and can exit with Escape',()=>{
 const s=setup('https://joyflock.com/portal/index.html?game=chess','chess');
 assert.equal(s.events['computer:click'],undefined);
 assert.equal(s.events['join:submit'],undefined);
 s.changeScreen('play');
 assert.equal(s.sent.at(-1).data.game,'chess');
 assert.equal(s.sent.at(-1).data.screen,'play');
 s.events['document:keydown']({key:'Escape'});
 assert.equal(s.sent.at(-1).data.type,'joyflock:exit-expanded-game');
 assert.ok(s.sent.every(x=>x.origin==='https://joyflock.com'));
});

test('pool reports actual asynchronous play transitions once and retransmits on trusted hello',()=>{
 const s=setup('https://joyflock.com/portal/index.html?game=pool','pool');
 const screens=()=>s.sent.filter(x=>x.data.type==='joyflock:game-screen').map(x=>x.data.screen);
 assert.deepEqual(screens(),['home']);s.changeScreen('waiting');s.changeScreen('play');s.changeScreen('play');
 assert.deepEqual(screens(),['home','waiting','play']);
 s.events.message({origin:'https://joyflock.com',source:s.parent,data:{type:'joyflock:hello'}});
 assert.deepEqual(screens(),['home','waiting','play','play']);
});

test('pool already in play on a direct room load announces play without needing a launch click',()=>{
 const s=setup('https://joyflock.com/portal/index.html?game=pool','pool','play');
 const screens=s.sent.filter(x=>x.data.type==='joyflock:game-screen');assert.equal(screens.length,1);assert.equal(screens[0].data.screen,'play');
 assert.equal(setup().sent.some(x=>x.data.type==='joyflock:game-screen'),false);
});

test('all production portal origins deliver locale changes to the game callback',()=>{
 for(const origin of ['https://joyflock.com','https://www.joyflock.com','https://flight.joyflock.com']){
  const s=setup(origin+'/portal/index.html');
  for(const locale of ['en','zh'])s.events.message({origin,source:s.parent,data:{type:'joyflock:locale',locale}});
  assert.deepEqual(s.locales,['en','zh']);
 }
});
