import {avatarStyle} from '../dist/avatar.js';
import {isChineseMobile} from '../dist/room-share.js';
import {CUSTODY_LABELS} from '../dist/online-custody.js';
import {ensureCustodyStyles} from '../dist/online-custody-ui.js';
/* live-room-ui.js is run as an import-stripped vm snippet here; supply the two
   shared custody helpers its ESM imports would normally provide. */
const custodyStubs={CUSTODY_LABELS,ensureCustodyStyles,document:{}};
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('matching rooms drop the flow note and invitation actions; only leave remains',()=>{
 const source=readFileSync(new URL('../dist/live-room-ui.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export function','function');
 for(const origin of ['QUICK','FRIENDS']){
  const dialog={open:true,innerHTML:'',setAttribute(){},addEventListener(){}};
  const social={roomDialog:dialog,t:en=>en,renderRoom(){}};
  const session={room:{origin,phase:'MATCHING',roomId:'test',matchingDeadline:new Date(Date.now()+30000).toISOString(),yourSeat:0,seats:[{index:0,ready:true}]},addEventListener(){}};
  const context=vm.createContext({social,session,avatarStyle,isChineseMobile,...custodyStubs});vm.runInContext(source+';bindLiveRooms(social,session);social.renderRoom();',context);
  assert.ok(!dialog.innerHTML.includes('data-live="copy-link"'),'no invitation link while taking off');
  assert.ok(!dialog.innerHTML.includes('data-live="share-wechat"'),'no WeChat invitation while taking off');
  assert.ok(!dialog.innerHTML.includes('data-live="copy-code"'),'room-code copying was removed');
  assert.ok(!dialog.innerHTML.includes('room-invite-strip'),'the room-code card was removed');
  assert.ok(!dialog.innerHTML.includes('room-flow-note'),'the matching flow note was removed');
  assert.ok(!dialog.innerHTML.includes('Start with the current players'),'no leftover explanatory copy');
  assert.ok(dialog.innerHTML.includes('data-live="start-now"'));
  assert.ok(dialog.innerHTML.includes('data-live="leave"'),'Matching rooms still expose an explicit leave action');
 }
});
test('waiting friend rooms still invite; quick rooms never do',()=>{
 const source=readFileSync(new URL('../dist/live-room-ui.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export function','function');
 for(const origin of ['QUICK','FRIENDS']){
  const dialog={open:true,innerHTML:'',setAttribute(){},addEventListener(){}};
  const social={roomDialog:dialog,t:en=>en,renderRoom(){}};
  const session={room:{origin,phase:'WAITING_FRIENDS',roomId:'test',yourSeat:0,seats:[{index:0,ready:false}]},addEventListener(){}};
  const context=vm.createContext({social,session,avatarStyle,isChineseMobile,...custodyStubs});vm.runInContext(source+';bindLiveRooms(social,session);social.renderRoom();',context);
  assert.equal(dialog.innerHTML.includes('class="secondary room-invite-standalone" data-live="copy-link"'),origin==='FRIENDS');
  assert.ok(!dialog.innerHTML.includes('room-flow-note'),'the flow note is gone in every phase');
 }
});
test('result rematch returns to the middle page before re-entering the original mode',()=>{
 const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
 const begin=source.lastIndexOf("$('rematch').onclick=()=>{");const end=source.indexOf('\n};',begin)+3;
 const snippet=source.slice(begin,end);
 for(const origin of ['QUICK','FRIENDS']){
  const button={},calls=[];
  const context=vm.createContext({$:()=>button,onlineMode:true,
   onlineSession:{room:{origin,roomId:'old'}},
   social:{openRoom:v=>calls.push('openRoom:'+v),rematchFriends:id=>calls.push('rematchFriends:'+id)},
   returnToModeScreen:()=>calls.push('middle'),start:()=>calls.push('start')});
  vm.runInContext(snippet,context);button.onclick();
  assert.deepEqual(calls,['middle',origin==='QUICK'?'openRoom:quick':'rematchFriends:old'],
   `${origin}: welcome first, then the same mode's entry flow`);
 }
 /* A computer match never touches the online flow or the middle page. */
 const button={},calls=[];
 const context=vm.createContext({$:()=>button,onlineMode:false,onlineSession:{room:null},
  social:{openRoom:v=>calls.push('openRoom:'+v),rematchFriends:id=>calls.push('rematchFriends:'+id)},
  returnToModeScreen:()=>calls.push('middle'),start:()=>calls.push('start')});
 vm.runInContext(snippet,context);button.onclick();
 assert.deepEqual(calls,['start']);
});
test('waiting friend rooms give copy, takeoff and leave one identical button style',()=>{
 const source=readFileSync(new URL('../dist/live-room-ui.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export function','function');
 const dialog={open:true,innerHTML:'',setAttribute(){},addEventListener(){}},social={roomDialog:dialog,t:en=>en,renderRoom(){}};
 const session={room:{origin:'FRIENDS',phase:'WAITING_FRIENDS',roomId:'test',yourSeat:0,seats:[{index:0,ready:false}]},addEventListener(){}};
 const context=vm.createContext({social,session,avatarStyle,isChineseMobile,...custodyStubs});vm.runInContext(source+';bindLiveRooms(social,session);social.renderRoom();',context);
 const buttons=Object.fromEntries([...dialog.innerHTML.matchAll(/<button[^>]*class="([^"]*)"[^>]*data-live="([^"]+)"/g)].map(m=>[m[2],m[1]]));
 assert.equal(buttons['copy-link'],'secondary room-invite-standalone');
 assert.equal(buttons.ready,'secondary room-invite-standalone');
 assert.equal(buttons.leave,'secondary room-invite-standalone room-invite-last');
 assert.ok(!dialog.innerHTML.includes('room-preview-action')&&!dialog.innerHTML.includes('room-leave-button'),'no leftover differing button styles');
});
