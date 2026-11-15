import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import vm from 'node:vm';
import {composeNativeGame} from '../scripts/build-native-games.mjs';
const read=p=>readFileSync(p,'utf8');

for(const [kind,input] of [['table','dist/table/index.html'],['flight','dist/index.html']])test(kind+' direct document preserves game scripts and contains no frame',()=>{
 const html=read('dist/portal/native-'+kind+'.html');
 assert.equal(html,composeNativeGame(read(input),kind),'committed composition matches its source');
 assert.doesNotMatch(html,/<iframe\b/i);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,new Set(ids).size,'no duplicate game/chrome IDs');
 assert.ok(ids.includes('account-open')&&ids.includes('native-account'));
 assert.equal([...html.matchAll(/data-native-link=/g)].length,9);
 for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){
  const value=match[1];if(/^(https?:|data:)/.test(value))continue;
  assert.ok(value.startsWith('/'),value+' is root-relative');
  const pathname=new URL(value,'https://example.test').pathname;
  if(pathname!=='/')assert.ok(existsSync('dist'+pathname),pathname+' exists');
 }
 assert.match(html,kind==='table'?/src="\/table\/table\.js\?/ : /src="\/app\.js\?/);
});

test('native language uses direct callbacks without any parent window',()=>{
 const events={},locales=[];
 const source=read('dist/portal-controls.js').replace('export function','function');
 const context=vm.createContext({document:{documentElement:{hasAttribute:k=>k==='data-native-game',getAttribute:()=> 'zh'}},window:{addEventListener:(type,fn)=>events[type]=fn}});
 vm.runInContext(source,context);context.bindPortalControls({onLocale:value=>locales.push(value)});
 assert.deepEqual(locales,['zh']);
 events['joyflock:native-locale']({detail:'en'});events['joyflock:native-locale']({detail:'invalid'});
 assert.deepEqual(locales,['zh','en']);assert.equal(events.message,undefined);
});

test('root and legacy portal routes serve a direct document for every game',async()=>{
 const probe=createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 const child=spawn(process.execPath,['server.mjs','--port',String(port)],{stdio:['ignore','pipe','pipe']});
 try{
  await new Promise((resolve,reject)=>{child.once('error',reject);child.stdout.once('data',resolve);child.once('exit',code=>reject(Error('server exited '+code)));});
  for(const game of ['pool','flight','four','gomoku','chess','xo','cards','snooker','bubbles'])for(const entry of ['/','/portal/index.html']){
   const response=await fetch(`http://127.0.0.1:${port}${entry}?game=${game}`);assert.equal(response.status,200);
   const html=await response.text();assert.match(html,/data-native-game=/);assert.doesNotMatch(html,/<iframe\b/i);
  }
  const poolRoom=await (await fetch(`http://127.0.0.1:${port}/?game=pool&room=example`)).text();assert.match(poolRoom,/data-native-game="table"/);
  for(const suffix of ['?embed=joyflock','?room=example']){
   const html=await (await fetch(`http://127.0.0.1:${port}/${suffix}`)).text();assert.match(html,/id="canvas-wrap"/);assert.doesNotMatch(html,/data-native-game=/);
  }
  const home=await (await fetch(`http://127.0.0.1:${port}/`)).text();assert.match(home,/id="home"/);
 }finally{child.kill();}
});
