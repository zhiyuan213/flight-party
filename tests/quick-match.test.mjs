import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

/* quick-match.js drives the shared match-box component, which needs a browser.
   Strip the import and inject spies so the flight-side state machine can be
   tested in isolation (the same technique as the room-share tests). */
const source=readFileSync(new URL('../dist/quick-match.js',import.meta.url),'utf8')
 .replace(/^import .*;\r?\n/gm,'').replace('export function','function');

function setup(language='en',fail=false){
 const calls={show:[],hide:0,update:[],leave:0,close:0,quick:0,notices:[]},listeners={};
 const room=()=>({origin:'QUICK',phase:'MATCHING',matchingDeadline:new Date(Date.now()+30000).toISOString(),serverNow:new Date().toISOString()});
 const session={
  room:null,
  addEventListener:(type,fn)=>{listeners[type]=fn;},
  quick:async()=>{calls.quick++;if(fail){const error=Error('offline');error.status=503;throw error;}session.room=room();return session.room;},
  leave:async()=>{calls.leave++;session.room=null;},
  close:()=>{calls.close++;}
 };
 const context=vm.createContext({Date,session,onNotice:text=>calls.notices.push(text),getLanguage:()=>language,
  showMatchBox:options=>calls.show.push(options),hideMatchBox:()=>calls.hide++,updateMatchBox:view=>calls.update.push(view)});
 vm.runInContext(source+';globalThis.api=bindQuickMatch({session,onNotice,getLanguage});',context);
 return {api:context.api,calls,listeners,session};
}

test('quick matching opens the shared notice and never a room dialog',async()=>{
 const {api,calls,listeners}=setup();
 await api.start();
 assert.equal(calls.quick,1,'the server quick-match endpoint is used');
 assert.equal(calls.show.length,1);
 assert.equal(calls.show[0].labels.title,'Finding your crew');
 assert.equal(typeof calls.show[0].onCancel,'function');
 assert.equal(calls.update.length,1);
 assert.ok(calls.update[0].deadline>calls.update[0].serverNow,'ISO deadlines become a positive countdown');
 assert.ok(api.isActive());
 listeners.snapshot({detail:{room:{origin:'QUICK',phase:'PLAYING'}}});
 assert.equal(calls.hide,1,'the notice disappears as soon as the match starts');
 assert.equal(api.isActive(),false);
});

test('cancelling leaves the waiting room and reports it to the player',async()=>{
 const {api,calls}=setup();
 await api.start();
 await api.cancel();
 assert.equal(calls.leave,1);
 assert.equal(calls.hide,1);
 assert.equal(api.isActive(),false);
 assert.equal(calls.notices.length,1);
});

test('reloading a public match resumes the notice without creating a second room',()=>{
 const {api,calls}=setup('zh');
 api.restore({origin:'QUICK',phase:'MATCHING',matchingDeadline:new Date(Date.now()+20000).toISOString(),serverNow:new Date().toISOString()});
 assert.equal(calls.quick,0);
 assert.equal(calls.show.length,1);
 assert.equal(calls.show[0].labels.title,'正在寻找对局');
 assert.ok(api.isActive());
});

test('a failed request closes the notice and shows one honest message',async()=>{
 const {api,calls}=setup('en',true);
 await api.start();
 assert.equal(calls.hide,1);
 assert.equal(api.isActive(),false);
 assert.equal(calls.notices.length,1);
 assert.match(calls.notices[0],/unavailable/i);
});
