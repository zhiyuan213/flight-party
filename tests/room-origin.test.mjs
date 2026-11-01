import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('quick matching hides invitations; friends retain invitation controls',()=>{
 const source=readFileSync(new URL('../dist/live-room-ui.js',import.meta.url),'utf8').replace('export function','function');
 for(const origin of ['QUICK','FRIENDS']){
  const dialog={open:true,innerHTML:'',setAttribute(){},addEventListener(){}};
  const social={roomDialog:dialog,t:en=>en,renderRoom(){}};
  const session={room:{origin,phase:'MATCHING',roomId:'test',matchingDeadline:new Date(Date.now()+30000).toISOString(),yourSeat:0,seats:[{index:0,ready:true}]},addEventListener(){}};
  const context=vm.createContext({social,session});vm.runInContext(source+';bindLiveRooms(social,session);social.renderRoom();',context);
  assert.equal(dialog.innerHTML.includes('data-live="copy-link"'),origin==='FRIENDS');
  assert.equal(dialog.innerHTML.includes('data-live="copy-code"'),origin==='FRIENDS');
  assert.ok(dialog.innerHTML.includes('data-live="start-now"'));
  assert.ok(dialog.innerHTML.includes('data-live="leave"'),'Waiting and matching rooms expose an explicit leave action');
 }
});
test('result rematch dispatches quick matching or friend continuation by source',()=>{
 const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');
 const begin=source.lastIndexOf("$('rematch').onclick=()=>{");const end=source.indexOf('\n};',begin)+3;
 for(const origin of ['QUICK','FRIENDS']){
  const button={},calls=[];
  const context=vm.createContext({$:()=>button,onlineMode:true,onlineSession:{room:{origin,roomId:'old'}},social:{openRoom:v=>calls.push(v),rematchFriends:id=>calls.push(id)},start(){}});
  vm.runInContext(source.slice(begin,end),context);button.onclick();assert.deepEqual(calls,[origin==='QUICK'?'quick':'old']);
 }
});
