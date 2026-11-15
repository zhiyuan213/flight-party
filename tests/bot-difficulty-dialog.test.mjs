import test from 'node:test';
import assert from 'node:assert/strict';
import {BOT_LEVELS,BOT_LEVEL_KEY,DEFAULT_BOT_LEVEL,
  botDifficultyTriggerMarkup,botDifficultyDialogMarkup,bindBotDifficultyDialog,
  BOT_DIALOG_TITLE,BOT_DIALOG_SUBTITLE,BOT_NOTE} from '../dist/bot-difficulty.js';

const memoryStorage=()=>{const map=new Map();return{getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v))};};
const emit=(node,type,event)=>{for(const fn of node.handlers[type]||[])fn(event);};
const closest=selector=>{
  if(selector.includes('data-bot-close'))return {dataset:{}};
  if(selector.includes('data-bot-level'))return null;
  if(selector.includes('data-bot-open'))return {dataset:{botOpen:''}};
  return null;
};

function harness({stored=null,lang='zh',note=null,game=null}={}){
  const storage=memoryStorage();
  if(stored)storage.setItem(BOT_LEVEL_KEY,stored);
  const listeners={},changes=[];
  const dialog={
    tagName:'DIALOG',innerHTML:'',open:false,className:'',attrs:{},handlers:{},
    setAttribute(k,v){this.attrs[k]=v;},
    getAttribute(k){return this.attrs[k]??null;},
    removeAttribute(k){delete this.attrs[k];},
    addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);},
    showModal(){this.open=true;},
    close(){this.open=false;emit(this,'close',{});},
    contains(){return true;},
    querySelectorAll(selector){
      if(!selector.includes('data-bot-level'))return [];
      return [...this.innerHTML.matchAll(/data-bot-level="([a-z]+)"/g)].map(m=>({
        dataset:{botLevel:m[1]},attrs:{},setAttribute(k,v){this.attrs[k]=v;}
      }));
    }
  };
  const doc={
    body:{children:[],appendChild(node){this.children.push(node);}},
    createElement(tag){assert.equal(tag,'dialog');return dialog;}
  };
  const win={addEventListener(type,fn){(listeners[type]??=[]).push(fn);}};
  const trigger={attrs:{},setAttribute(k,v){this.attrs[k]=v;}};
  const host={
    innerHTML:'',handlers:{},
    addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);},
    querySelector(selector){return selector.includes('data-bot-open')&&this.innerHTML.includes('data-bot-open')?trigger:null;},
    querySelectorAll(){return [];},
    contains(){return true;}
  };
  const control=bindBotDifficultyDialog(host,{storage,lang,note,game,document:doc,window:win,onChange:level=>changes.push(level)});
  return {
    control,host,dialog,doc,trigger,storage,changes,
    open:()=>emit(host,'click',{target:{closest}}),
    backdrop:()=>emit(dialog,'click',{target:dialog}),
    closeButton:()=>emit(dialog,'click',{target:{closest}}),
    choose:key=>emit(dialog,'click',{target:{closest:selector=>selector.includes('data-bot-level')?{dataset:{botLevel:key}}:null}}),
    storageEvent:key=>{for(const fn of listeners.storage||[])fn({key});}
  };
}

test('trigger and dialog markup are bilingual, with four labelled choices',()=>{
  const trigger=botDifficultyTriggerMarkup('easy','zh');
  assert.ok(trigger.includes('data-bot-open')&&trigger.includes('aria-haspopup="dialog"'));
  assert.ok(trigger.includes('机器人难度')&&trigger.includes('简单'));
  assert.ok(!trigger.includes('data-bot-level="'),'the four choices are not inline any more');
  assert.ok(botDifficultyTriggerMarkup('pro','en').includes('Pro'));

  const zh=botDifficultyDialogMarkup('easy','zh');
  for(const key of BOT_LEVELS)assert.ok(zh.includes(`data-bot-level="${key}"`));
  assert.equal((zh.match(/data-bot-level=/g)||[]).length,4);
  assert.ok(zh.includes('data-bot-level="easy" aria-pressed="true"'));
  assert.ok(zh.includes('会失误，容易赢')&&zh.includes(BOT_NOTE.zh));
  assert.ok(zh.includes('data-bot-close')&&zh.includes('完成'));

  const en=botDifficultyDialogMarkup('hell','en',{zh:'合作模式无影响',en:'No effect in co-op'});
  assert.ok(en.includes('Computer difficulty')&&en.includes('Full search, almost flawless'));
  assert.ok(en.includes('data-bot-level="hell" aria-pressed="true"'));
  assert.ok(en.includes('No effect in co-op')&&!en.includes(BOT_NOTE.en),'a custom note replaces the default');
  assert.ok(en.includes('data-system-english="Done"'));
  assert.equal(BOT_DIALOG_TITLE.en,'Computer difficulty');
  assert.ok(BOT_DIALOG_SUBTITLE.zh.includes('选择'));
});

test('mounting leaves one trigger on the page and puts the dialog on <body>',()=>{
  const h=harness();
  assert.ok(h.control,'the control mounts');
  assert.deepEqual(h.doc.body.children,[h.dialog],'dialog is outside the (possibly hidden) intro screen');
  assert.equal(h.dialog.className,'bot-difficulty-dialog');
  assert.equal(h.control.get(),DEFAULT_BOT_LEVEL);
  assert.equal(h.dialog.attrs['aria-label'],'机器人难度');
  assert.equal(h.trigger.attrs['aria-expanded'],'false');
  assert.equal(h.dialog.open,false);
  assert.ok(h.host.innerHTML.includes('简单'));
  assert.equal((h.host.innerHTML.match(/data-bot-level=/g)||[]).length,0);
  assert.equal((h.dialog.innerHTML.match(/data-bot-level=/g)||[]).length,4);
});

test('open, backdrop, close button and native close event stay in sync',()=>{
  const h=harness();
  h.open();
  assert.equal(h.dialog.open,true,'showModal was called');
  assert.equal(h.control.isOpen(),true);
  assert.equal(h.trigger.attrs['aria-expanded'],'true');
  h.open();assert.equal(h.dialog.open,true,'opening twice does not stack dialogs');
  h.backdrop();
  assert.equal(h.dialog.open,false);
  assert.equal(h.trigger.attrs['aria-expanded'],'false');
  h.open();h.closeButton();
  assert.equal(h.dialog.open,false);
  h.open();h.dialog.close();           // e.g. the Escape key
  assert.equal(h.trigger.attrs['aria-expanded'],'false');
});

test('choosing a level saves it, updates the trigger, closes and notifies the game',()=>{
  const h=harness({stored:'pro'});
  assert.ok(h.host.innerHTML.includes('专业'));
  h.open();
  h.choose('hell');
  assert.equal(h.storage.getItem(BOT_LEVEL_KEY),'hell');
  assert.equal(h.control.get(),'hell');
  assert.ok(h.host.innerHTML.includes('地狱'),'trigger shows the chosen level');
  assert.ok(h.dialog.innerHTML.includes('data-bot-level="hell" aria-pressed="true"'));
  assert.equal(h.dialog.open,false,'the dialog closes after choosing');
  assert.deepEqual(h.changes,['hell']);
  h.open();h.choose('easy');
  assert.equal(h.control.get(),'easy');
  assert.deepEqual(h.changes,['hell','easy']);
});

test('language switching, external storage changes and the imperative API',()=>{
  const h=harness({note:{zh:'合作模式无影响',en:'No effect in co-op'}});
  assert.ok(h.dialog.innerHTML.includes('合作模式无影响'));
  h.control.language('en');
  assert.equal(h.dialog.attrs['aria-label'],'Computer difficulty');
  assert.ok(h.host.innerHTML.includes('Computer difficulty')&&h.host.innerHTML.includes('Easy'));
  assert.ok(h.dialog.innerHTML.includes('No effect in co-op'));
  assert.ok(h.dialog.innerHTML.includes('Makes mistakes'));

  h.storage.setItem(BOT_LEVEL_KEY,'pro');
  h.storageEvent(BOT_LEVEL_KEY);
  assert.equal(h.control.get(),'pro');
  assert.ok(h.host.innerHTML.includes('Pro'),'another tab updates the trigger');
  h.storageEvent('unrelated.key');
  assert.equal(h.control.get(),'pro');

  assert.equal(h.control.set('bogus'),'easy');
  assert.equal(h.control.get(),'easy');
  h.storage.setItem(BOT_LEVEL_KEY,'hell');
  assert.equal(h.control.refresh(),'hell');
  h.control.language('zh');
  assert.ok(h.host.innerHTML.includes('机器人难度')&&h.host.innerHTML.includes('地狱'));
  h.control.close();
  assert.equal(h.control.isOpen(),false);
});

test('a game-scoped dialog saves only its own key and syncs only on that key',()=>{
  const h=harness({game:'pool',stored:'pro'});
  assert.ok(h.host.innerHTML.includes('专业'),'the legacy shared value migrates in');
  h.open();h.choose('hell');
  assert.equal(h.storage.getItem('joyflock.bot.level.pool'),'hell','Pool writes its own key');
  assert.equal(h.storage.getItem(BOT_LEVEL_KEY),'pro','the legacy key is never rewritten');

  h.storage.setItem('joyflock.bot.level.four','easy');
  h.storageEvent('joyflock.bot.level.four');
  assert.equal(h.control.get(),'hell','another game changing its level does not affect Pool');
  h.storage.setItem('joyflock.bot.level.pool','easy');
  h.storageEvent('joyflock.bot.level.pool');
  assert.equal(h.control.get(),'easy','the Pool key syncs across tabs');
});

test('Node without a document degrades to null instead of throwing',()=>{
  const host={addEventListener(){},querySelector(){return null;},innerHTML:''};
  assert.equal(bindBotDifficultyDialog(host,{}),null);
  assert.equal(bindBotDifficultyDialog(null,{}),null);
});
