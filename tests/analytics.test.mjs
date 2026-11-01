import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../dist/analytics.js',import.meta.url),'utf8').replaceAll('export ','');
function setup(consent,hostname='flight.joyflock.com'){
 const scripts=[],cookieWrites=[],storage=new Map(consent?[['joyflock-analytics-consent',consent]]:[]);
 const document={documentElement:{lang:'en'},head:{append:s=>scripts.push(s)},querySelector:()=>null,getElementById:()=>null,createElement:()=>({}),addEventListener(){},referrer:'https://example.com/private?email=private@example.test'};
 Object.defineProperty(document,'cookie',{get:()=> '_ga=old; SESSION=private-session',set:v=>cookieWrites.push(v)});
 const window={};const context=vm.createContext({window,document,location:{hostname,origin:'https://'+hostname,pathname:'/',search:'?room=private-room&email=private@example.test'},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},MutationObserver:class{observe(){}},URL,URLSearchParams});
 vm.runInContext(source,context);return {context,window,scripts,cookieWrites};
}
test('analytics never loads before consent or for local previews',()=>{
 assert.equal(setup().scripts.length,0);assert.equal(setup('denied').scripts.length,0);assert.equal(setup('granted','127.0.0.1').scripts.length,0);
});
test('analytics strips private URLs and allows only enumerated event parameters',()=>{
 const {context,window,scripts}=setup('granted');assert.equal(scripts.length,1);
 vm.runInContext("track('game_start','friends');track('email','private@example.test');track('game_end',{accountId:'private-account'})",context);
 const text=JSON.stringify(window.dataLayer);assert.ok(!text.includes('private'));assert.ok(!text.includes('?room'));assert.ok(text.includes('https://example.com/'));assert.ok(text.includes('game_start'));assert.ok(text.includes('ad_personalization'));assert.ok(text.includes('denied'));
});
test('withdrawal disables future events and clears analytics cookies only',()=>{
 const {context,window,scripts,cookieWrites}=setup();vm.runInContext("setConsent('granted')",context);assert.equal(scripts.length,1);
 vm.runInContext("setConsent('denied')",context);const count=window.dataLayer.length;vm.runInContext("track('game_start','quick')",context);assert.equal(window.dataLayer.length,count);
 assert.equal(window['ga-disable-G-9TB87S782E'],true);assert.ok(cookieWrites.length>0);assert.ok(cookieWrites.every(v=>v.startsWith('_ga=')));
});
