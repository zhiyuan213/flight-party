import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const audio=read('dist/site-hover-sfx.js');
const bridge=audio.slice(audio.indexOf(' var PORTAL_ORIGINS='),audio.indexOf(' function muted()'));
test('cross-origin game hover relays only to a named trusted portal',()=>{
 const sent=[],parent={postMessage:(data,origin)=>sent.push({data,origin})};
 const scope=vm.createContext({URL,ctx:null,location:{origin:'https://flight.joyflock.com'},document:{referrer:'https://joyflock.com/portal/index.html'},window:{parent,addEventListener(){}},muted:()=>false});
 vm.runInContext(bridge,scope);assert.equal(scope.relayHover('tick',{}),true);
 assert.equal(sent[0].origin,'https://joyflock.com');assert.equal(sent[0].data.voice,'tick');
 scope.ctx={state:'running'};assert.equal(scope.relayHover('tick',{}),false);assert.equal(sent.length,1);scope.ctx=null;
 scope.document.referrer='https://evil.test/';assert.equal(scope.relayHover('tick',{}),false);assert.equal(sent.length,1);
});
test('portal accepts sound only from its game iframe and exact game origin',()=>{
 let handler;const child={},played=[],frame={contentWindow:child,src:'https://flight.joyflock.com/table/index.html'};
 const root={addEventListener:(_type,fn)=>handler=fn};root.parent=root;
 const scope=vm.createContext({URL,location:{href:'https://joyflock.com/portal/index.html'},window:root,document:{getElementById:()=>frame},muted:()=>false,play:el=>{played.push(el);return true;},playZoom:()=>true,stats:{played:0,blocked:0}});
 vm.runInContext(bridge,scope);
 const data={type:'joyflock:hover-sfx',voice:'tick',zone:'home'};
 handler({source:{},origin:'https://flight.joyflock.com',data});handler({source:child,origin:'https://evil.test',data});
 assert.equal(played.length,0);handler({source:child,origin:'https://flight.joyflock.com',data});assert.equal(played.length,1);
 scope.muted=()=>true;handler({source:child,origin:'https://flight.joyflock.com',data});assert.equal(played.length,1);
});
test('current table intro headings and descriptions have complete English translations',()=>{
 const source=read('dist/table/table-locale.js'),scope=vm.createContext({});
 vm.runInContext(source.slice(0,source.indexOf('// Translate interface'))+';globalThis.translate=english',scope);
 const html=read('dist/table/index.html');
 const texts=['玩家排行','会员与支持','登录联机可记录 · UTC时间 · 前10',html.match(/id="score-note">([^<]+)/)[1],html.match(/class="member-note"><h2>[^<]+<\/h2><p>([^<]+)/)[1]];
 for(const text of texts)assert.doesNotMatch(scope.translate(text),/[\u3400-\u9fff]/,text);
});
