import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('dist/table/index.html','utf8');
const boot=html.match(/<script>\(function\(\)\{var l=([\s\S]*?)<\/script>/)[0].replace(/^<script>|<\/script>$/g,'');
for(const locale of ['en','zh'])test('first paint stays gated until translation is ready: '+locale,()=>{
 const attrs=new Map(),timers=[];
 const root={setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k)};
 vm.runInNewContext(boot,{URLSearchParams,location:{search:'?embed=joyflock&locale='+locale},localStorage:{getItem:()=>locale==='en'?'zh':'en'},document:{documentElement:root},setTimeout:fn=>timers.push(fn)});
 assert.equal(attrs.get('data-locale'),locale,'explicit parent locale beats origin storage');
 assert.equal(root.lang,locale==='en'?'en':'zh-CN');
 for(const timer of timers)timer();
 assert.equal(attrs.get('data-translating'),'1','slow downloads cannot reveal untranslated source copy');
});
test('small locale entry loads independently and shares the dictionary instance with gameplay',()=>{
 const early=fs.readFileSync('dist/table/locale-boot.js','utf8');
 const main=fs.readFileSync('dist/table/table.js','utf8');
 const imported=early.match(/from '([^']+)'/)[1];
 assert.ok(main.includes("from '"+imported+"'"));
 assert.doesNotMatch(early,/import.*(?:pool|table\.js)/);
 assert.ok(html.indexOf('locale-boot.js')<html.indexOf('src="table.js'));
});

test('early and gameplay bind reuse one observer and preserve language round trips',()=>{
 const attrs=new Map([['data-locale','en']]);
 const root={lang:'en',getAttribute:k=>attrs.get(k),setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k)};
 const node={data:'玩家排行',parentElement:{dataset:{},closest:()=>null}};
 let observers=0;
 const doc={documentElement:root,body:{},querySelectorAll:()=>[],createTreeWalker:()=>{let used=false;return {nextNode:()=>used?null:(used=true,node)};}};
 const scope=vm.createContext({document:doc,NodeFilter:{SHOW_TEXT:4},MutationObserver:class{constructor(){observers++;}observe(){}}});
 vm.runInContext(fs.readFileSync('dist/table/table-locale.js','utf8').replaceAll('export function ','function ')+';globalThis.bind=bindTableLocale;',scope);
 const early=scope.bind(),gameplay=scope.bind();
 assert.equal(node.data,'Player rankings');assert.equal(early,gameplay);assert.equal(observers,1);
 gameplay('zh');assert.equal(node.data,'玩家排行');
 early('en');assert.equal(node.data,'Player rankings');
});
