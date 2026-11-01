import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {avatarStyle} from '../dist/avatar.js';
import {roomInvitationUrl,isChineseMobile,shareRoomInvitation} from '../dist/room-share.js';

const roomId='661af86d-d01c-4e98-bc59-dbe5df3079f4',origin='https://flight.joyflock.com';

test('friend invitations use only the current origin, real room and selected language',()=>{
 const url=new URL(roomInvitationUrl(roomId,origin+'/private?token=secret#account','zh'));
 assert.equal(url.origin,origin);assert.equal(url.pathname,'/');assert.equal(url.searchParams.get('room'),roomId);assert.equal(url.searchParams.get('lang'),'zh');
 assert.deepEqual([...url.searchParams.keys()],['room','lang']);assert.equal(url.hash,'');
 assert.equal(new URL(roomInvitationUrl(roomId,origin,'other')).searchParams.get('lang'),'en');
 for(const invalid of ['javascript:alert(1)','file:///tmp/game','https://user:secret@flight.joyflock.com'])assert.throws(()=>roomInvitationUrl(roomId,invalid));
 assert.throws(()=>roomInvitationUrl('<script>',origin));
});

test('native share receives Chinese room data directly during the user action',async()=>{
 const calls=[],nav={canShare:data=>!!data.url,share(data){calls.push(data);return Promise.resolve();}};
 const pending=shareRoomInvitation({roomId,origin,nav});
 assert.equal(calls.length,1,'navigator.share must run before awaiting any network or clipboard operation');
 assert.equal(calls[0].url,roomInvitationUrl(roomId,origin,'zh'));assert.match(calls[0].title,/Flight Party/);assert.match(calls[0].text,/点击链接/);
 assert.equal((await pending).status,'native');
});

test('canceling native share stays quiet and never copies or sends anything else',async()=>{
 let copies=0;const nav={share:()=>Promise.reject({name:'AbortError'}),clipboard:{writeText(){copies++;}}};
 assert.equal((await shareRoomInvitation({roomId,origin,nav})).status,'cancelled');assert.equal(copies,0);
});

test('leaving while native sharing is pending prevents stale WeChat URL and clipboard fallbacks',async()=>{
 let active=true,rejectNative,copies=0,pages=0;
 const nav={userAgent:'iPhone MicroMessenger',share:()=>new Promise((resolve,reject)=>{rejectNative=reject;}),clipboard:{writeText(){copies++;}}};
 const pending=shareRoomInvitation({roomId,origin,nav,isCurrent:()=>active,prepareWeChatPage(){pages++;return true;}});
 active=false;rejectNative({name:'NotAllowedError'});
 assert.equal((await pending).status,'cancelled');assert.equal(copies,0);assert.equal(pages,0);
});

test('WeChat fallback prepares the real invitation page and copies the same URL',async()=>{
 let page,copied;const nav={userAgent:'iPhone MicroMessenger/8.0',clipboard:{writeText:async value=>{copied=value;}}};
 const result=await shareRoomInvitation({roomId,origin,nav,prepareWeChatPage:url=>{page=url;return true;}});
 assert.equal(result.status,'copied');assert.equal(result.menuReady,true);assert.equal(result.wechat,true);
 assert.equal(page,copied);assert.equal(page,roomInvitationUrl(roomId,origin,'zh'));
});

test('unsupported or denied sharing exposes a usable manual URL without claiming success',async()=>{
 for(const nav of [{},{canShare:()=>false,share(){throw Error('must not call');}},{share:()=>Promise.reject({name:'NotAllowedError'}),clipboard:{writeText:()=>Promise.reject(Error('blocked'))}}]){
  const result=await shareRoomInvitation({roomId,origin,nav});assert.equal(result.status,'manual');assert.equal(result.url,roomInvitationUrl(roomId,origin,'zh'));
 }
});

test('only Chinese mobile friend rooms display the WeChat action; quick rooms never do',()=>{
 const source=readFileSync(new URL('../dist/live-room-ui.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export function','function');
 for(const language of ['en','zh'])for(const origin of ['QUICK','FRIENDS'])for(const width of [390,1100]){
  const dialog={open:true,innerHTML:'',setAttribute(){},addEventListener(){}},social={roomDialog:dialog,getLanguage:()=>language,t:(en,zh)=>language==='zh'?zh:en,renderRoom(){}};
  const session={room:{origin,phase:'WAITING_FRIENDS',roomId,yourSeat:0,seats:[{index:0,ready:false}]},addEventListener(){}};
  const context=vm.createContext({social,session,avatarStyle,isChineseMobile:args=>isChineseMobile({...args,width,userAgent:''})});
  vm.runInContext(source+';bindLiveRooms(social,session);social.renderRoom();',context);
  assert.equal(dialog.innerHTML.includes('data-live="share-wechat"'),language==='zh'&&origin==='FRIENDS'&&width===390);
  assert.equal(dialog.innerHTML.includes('data-live="copy-link"'),origin==='FRIENDS');
 }
});

test('a stale share result or error cannot overwrite another room or leave its action disabled',async()=>{
 const source=readFileSync(new URL('../dist/live-room-ui.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export function','function');
 for(const failed of [false,true]){
  const events={},sessionEvents={};let resolveShare,rejectShare;
  const dialog={open:true,innerHTML:'',setAttribute(){},addEventListener:(type,fn)=>{events[type]=fn;}};
  const social={roomDialog:dialog,getLanguage:()=> 'zh',t:(en,zh)=>zh,renderRoom(){}};
  const room={origin:'FRIENDS',phase:'WAITING_FRIENDS',roomId,yourSeat:0,seats:[{index:0,ready:false}]};
  const session={room,addEventListener:(type,fn)=>{sessionEvents[type]=fn;}};
  const context=vm.createContext({social,session,avatarStyle,location:{origin},document:{dispatchEvent(){}},CustomEvent:class{},isChineseMobile:()=>true,shareRoomInvitation:()=>new Promise((resolve,reject)=>{resolveShare=resolve;rejectShare=reject;})});
  vm.runInContext(source+';bindLiveRooms(social,session);social.renderRoom();',context);
  events.click({stopImmediatePropagation(){},target:{closest:()=>({dataset:{live:'share-wechat'}})}});
  assert.match(dialog.innerHTML,/正在打开分享/);
  session.room={...room,roomId:'11111111-1111-1111-1111-111111111111'};sessionEvents.snapshot({detail:{room:session.room}});
  assert.ok(!dialog.innerHTML.includes('正在打开分享'),'changing rooms must immediately release its share button');
  if(failed)rejectShare(Error('old failure'));else resolveShare({status:'manual',url:'https://old-room.invalid/'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.ok(!dialog.innerHTML.includes('old-room.invalid'));assert.ok(!dialog.innerHTML.includes('暂时无法打开分享'));
  assert.ok(!dialog.innerHTML.includes('正在打开分享'));
 }
});
