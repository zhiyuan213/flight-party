import test from 'node:test';
import assert from 'node:assert/strict';
import {bindPoolFullscreen} from '../dist/portal/pool-fullscreen.js';

function setup({blocked=false}={}){
 const events={},attrs={},classes=new Set(),styles=[],frame={contentWindow:{}},button={setAttribute:(k,v)=>attrs[k]=v,removeAttribute:k=>delete attrs[k],addEventListener:(k,fn)=>events['button:'+k]=fn};
 let requests=0,exits=0;
 const document={fullscreenElement:null,head:{append:node=>styles.push(node)},createElement:()=>({}),addEventListener:(k,fn)=>events[k]=fn,exitFullscreen:async()=>{exits++;document.fullscreenElement=null;events.fullscreenchange();}};
 const stage={classList:{toggle:(name,on)=>on?classes.add(name):classes.delete(name)},requestFullscreen:async()=>{requests++;if(blocked)throw Error('activation required');document.fullscreenElement=stage;events.fullscreenchange();}};
 const window={navigator:{userActivation:{isActive:true}},addEventListener:(k,fn)=>events[k]=fn};
 bindPoolFullscreen({document,window,stage,button,frame,gameOrigin:'https://flight.joyflock.com'});
 const launch=(extra={})=>events.message({origin:'https://flight.joyflock.com',source:frame.contentWindow,data:{type:'joyflock:enter-game'},...extra});
 return{events,attrs,classes,styles,document,window,button,launch,requests:()=>requests,exits:()=>exits};
}
test('launch enters fullscreen and button follows exit including Escape',async()=>{
 const s=setup();assert.equal(s.button.textContent,'全屏');s.launch();await Promise.resolve();
 assert.equal(s.requests(),1);assert.equal(s.button.textContent,'退出全屏');assert.equal(s.attrs['aria-pressed'],'true');
 await s.events['button:click']();assert.equal(s.exits(),1);assert.equal(s.button.textContent,'全屏');
 await s.events['button:click']();s.document.fullscreenElement=null;s.events.fullscreenchange();assert.equal(s.button.textContent,'全屏');
});
test('untrusted messages cannot initiate fullscreen or expanded layout',()=>{
 const s=setup();s.launch({origin:'https://evil.test'});s.launch({source:{}});s.launch({data:{type:'unknown'}});
 assert.equal(s.requests(),0);assert.equal(s.classes.size,0);
});
test('blocked fullscreen expands the viewport and exits via the button or Escape',async()=>{
 const s=setup({blocked:true});s.launch();await Promise.resolve();assert.equal(s.button.textContent,'退出全屏');
 assert.equal(s.document.fullscreenElement,null);assert.ok(s.classes.has('pool-stage-expanded'));
 await s.events['button:click']();assert.equal(s.requests(),1);assert.equal(s.button.textContent,'全屏');assert.equal(s.classes.size,0);
 await s.events['button:click']();assert.equal(s.requests(),2);s.events.keydown({key:'Escape'});assert.equal(s.button.textContent,'全屏');assert.equal(s.classes.size,0);
});
test('expired activation expands without a browser request and the trusted child can exit it',()=>{
 const s=setup();s.window.navigator.userActivation.isActive=false;s.launch();assert.equal(s.requests(),0);assert.equal(s.button.textContent,'退出全屏');
 s.launch({origin:'https://evil.test',data:{type:'joyflock:exit-expanded-game'}});assert.equal(s.button.textContent,'退出全屏');
 s.launch({data:{type:'joyflock:exit-expanded-game'}});assert.equal(s.button.textContent,'全屏');assert.equal(s.classes.size,0);
});

test('async play or direct room state expands once, while repeated updates respect an explicit exit',()=>{
 const s=setup();s.window.navigator.userActivation.isActive=false;
 const screen=value=>s.launch({data:{type:'joyflock:game-screen',game:'pool',screen:value}});
 screen('waiting');assert.equal(s.classes.size,0);screen('play');assert.ok(s.classes.has('pool-stage-expanded'));assert.equal(s.requests(),0);
 s.events.keydown({key:'Escape'});screen('play');assert.equal(s.classes.size,0);
 screen('home');screen('play');assert.ok(s.classes.has('pool-stage-expanded'));
 screen('home');assert.equal(s.classes.size,0);
 const direct=setup();direct.window.navigator.userActivation.isActive=false;direct.launch({data:{type:'joyflock:game-screen',game:'pool',screen:'play'}});assert.ok(direct.classes.has('pool-stage-expanded'));
});

test('screen updates from another game, origin or frame cannot expand the stage',()=>{
 const s=setup(),data={type:'joyflock:game-screen',game:'pool',screen:'play'};
 s.launch({origin:'https://evil.test',data});s.launch({source:{},data});s.launch({data:{...data,game:'flight'}});s.launch({data:{...data,screen:'unknown'}});
 assert.equal(s.classes.size,0);assert.equal(s.requests(),0);
});

test('a pending native request does not delay expanded layout or allow duplicate requests',async()=>{
 const events={},classes=new Set(),button={setAttribute(){},removeAttribute(){},addEventListener:(k,fn)=>events[k]=fn},frame={contentWindow:{}};
 let resolveRequest,requests=0;const document={fullscreenElement:null,head:{append(){}},createElement:()=>({}),addEventListener(){}};
 const stage={classList:{toggle:(name,on)=>on?classes.add(name):classes.delete(name)},requestFullscreen:()=>{requests++;return new Promise(resolve=>{resolveRequest=resolve;});}};
 const window={navigator:{userActivation:{isActive:true}},addEventListener:(k,fn)=>events[k]=fn};
 bindPoolFullscreen({document,window,stage,button,frame,gameOrigin:'https://flight.joyflock.com'});
 const event={origin:'https://flight.joyflock.com',source:frame.contentWindow,data:{type:'joyflock:enter-game'}};events.message(event);events.message(event);
 assert.ok(classes.has('pool-stage-expanded'));assert.equal(button.textContent,'退出全屏');assert.equal(requests,1);
 document.fullscreenElement=stage;resolveRequest();await Promise.resolve();assert.equal(classes.size,0);assert.equal(button.textContent,'退出全屏');
});
