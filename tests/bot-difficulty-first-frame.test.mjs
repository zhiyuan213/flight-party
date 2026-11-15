import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {BOT_LABELS,BOT_DIALOG_TITLE,BOT_LEVEL_KEY,
  botDifficultyTriggerMarkup,bindBotDifficultyDialog} from '../dist/bot-difficulty.js';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const hosts=['../dist/table/arcade.html','../dist/index.html'];
const boot=read('../dist/bot-difficulty-boot.js');
const memoryStorage=()=>{const map=new Map();return{getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v))};};

/* Run the plain synchronous boot script against a tiny DOM, the way the
   browser does while it is still parsing the HTML. */
function bootHarness({stored='hell',key=BOT_LEVEL_KEY,locale='zh',portalLang=null,prefs=null,urlLang=null,search=null,pathname=''}={}){
  const store=new Map();
  if(stored!==null)store.set(key,stored);
  if(portalLang)store.set('joyflock-portal-language',portalLang);
  if(prefs)store.set('flight-party-prefs',JSON.stringify(prefs));
  const label={textContent:'机器人难度',attrs:{},setAttribute(k,v){this.attrs[k]=v;}};
  const value={textContent:'简单',attrs:{},setAttribute(k,v){this.attrs[k]=v;}};
  const trigger={attrs:{},setAttribute(k,v){this.attrs[k]=v;},
    querySelector(sel){return sel.includes('label')?label:value;}};
  const host={attrs:{},setAttribute(k,v){this.attrs[k]=v;},
    querySelector(sel){return sel.includes('data-bot-open')?trigger:null;}};
  const sandbox={
    document:{
      documentElement:{getAttribute:k=>k==='data-locale'?locale:null},
      getElementById:id=>id==='bot-difficulty'?host:null
    },
    localStorage:{getItem:k=>store.has(k)?store.get(k):null},
    location:{search:search??(urlLang?`?lang=${urlLang}`:''),pathname},
    URLSearchParams,console
  };
  runInNewContext(boot,sandbox);
  return {label,value,trigger,host};
}

test('the trigger is in the static HTML on the two remaining hosts, before any module runs',()=>{
  for(const file of hosts){
    const html=read(file);
    const slot=/<div id="bot-difficulty"[^>]*>([\s\S]*?)<\/div>/.exec(html);
    assert.ok(slot,`${file}: difficulty slot exists`);
    assert.ok(slot[1].includes('data-bot-open'),`${file}: trigger is present in the first paint`);
    assert.ok(slot[1].includes('bd-trigger-label')&&slot[1].includes('bd-trigger-value'),
      `${file}: label and current level are already rendered`);
    assert.ok(!slot[1].includes('data-bot-level='),`${file}: the four choices stay in the dialog`);
    assert.ok(html.includes('bot-difficulty-boot.js'),`${file}: synchronous boot script is loaded`);
    assert.ok(html.indexOf('id="bot-difficulty"')<html.indexOf('bot-difficulty-boot.js'),
      `${file}: boot runs after the slot exists`);
  }
  const table=read('../dist/table/index.html');
  assert.ok(!table.includes('id="bot-difficulty"'),'the table detail page moved difficulty into the single-player dialog');
  assert.ok(!table.includes('bot-difficulty-boot.js'),'no boot script on the table detail page');
});

test('static markup matches the module generator, boot copy stays in sync',()=>{
  const en=read('../dist/table/arcade.html');
  const parts=botDifficultyTriggerMarkup('easy','en');
  for(const fragment of ['class="bot-difficulty-trigger"','data-bot-open','aria-haspopup="dialog"',
    'aria-expanded="false"','bd-trigger-label','bd-trigger-value','bd-trigger-chevron','›'])
    assert.ok(en.includes(fragment),`static trigger keeps ${fragment}`);
  assert.ok(parts.includes('Computer difficulty')&&parts.includes('Easy'));
  for(const level of Object.keys(BOT_LABELS)){
    assert.ok(boot.includes(BOT_LABELS[level].zh)&&boot.includes(BOT_LABELS[level].en),
      `${level}: boot knows both labels`);
  }
  assert.ok(boot.includes(BOT_DIALOG_TITLE.zh)&&boot.includes(BOT_DIALOG_TITLE.en));
});

test('boot writes the saved level and the right language on the first frame',()=>{
  let h=bootHarness({stored:'hell',locale:'zh'});
  assert.equal(h.value.textContent,'地狱');
  assert.equal(h.value.attrs['data-system-english'],'Hell');
  assert.equal(h.label.textContent,'机器人难度');
  assert.equal(h.label.attrs['data-system-english'],'Computer difficulty');
  assert.equal(h.trigger.attrs.title,'机器人难度');
  assert.equal(h.host.attrs['data-booted'],'1');

  h=bootHarness({stored:'pro',locale:'en'});
  assert.equal(h.value.textContent,'Pro');
  assert.equal(h.label.textContent,'Computer difficulty');

  h=bootHarness({stored:'bogus',locale:'zh'});
  assert.equal(h.value.textContent,'简单','an invalid stored value falls back to Easy');

  h=bootHarness({stored:'hell',locale:null,portalLang:'zh'});
  assert.equal(h.value.textContent,'地狱','arcade/portal language key');
  h=bootHarness({stored:'hell',locale:null,portalLang:'en'});
  assert.equal(h.value.textContent,'Hell','arcade defaults to English');
  h=bootHarness({stored:'hell',locale:null,prefs:{lang:'zh'}});
  assert.equal(h.value.textContent,'地狱','flight lobby prefs');
  h=bootHarness({stored:'hell',locale:null,urlLang:'en'});
  assert.equal(h.value.textContent,'Hell','explicit ?lang wins');
});

test('boot reads the per-game key and leaves other games alone',()=>{
  let h=bootHarness({stored:'hell',key:'joyflock.bot.level.flight',locale:'en'});
  assert.equal(h.value.textContent,'Hell','Flight reads joyflock.bot.level.flight');
  h=bootHarness({stored:'hell',key:'joyflock.bot.level.four',locale:'en'});
  assert.equal(h.value.textContent,'Easy','a Four choice does not leak into Flight');
  h=bootHarness({stored:'pro',key:'joyflock.bot.level.snooker',locale:'en',
    search:'?game=snooker',pathname:'/table/arcade.html'});
  assert.equal(h.value.textContent,'Pro','arcade.html?game=snooker reads its own key');
  h=bootHarness({stored:'hell',key:'joyflock.bot.level.bubbles',locale:'en',
    search:'',pathname:'/table/arcade.html'});
  assert.equal(h.value.textContent,'Hell','arcade.html with no query defaults to Bubbles');
  h=bootHarness({stored:'hell',key:'joyflock.bot.level.pool',locale:'en',
    search:'?game=pool',pathname:'/table/arcade.html'});
  assert.equal(h.value.textContent,'Easy','arcade.html ignores an unsupported ?game= value');
  h=bootHarness({stored:'pro',key:BOT_LEVEL_KEY,search:'?game=pool',locale:'en'});
  assert.equal(h.value.textContent,'Pro','a legacy value still migrates for a game with no own key');
});

/* A host that already has a trigger must never have its innerHTML replaced:
   that replacement is the late pop-in this change removes. */
function reuseHarness(stored=null){
  const storage=memoryStorage();
  if(stored)storage.setItem(BOT_LEVEL_KEY,stored);
  const label={textContent:'',dataset:{}};
  const value={textContent:'',dataset:{}};
  const trigger={attrs:{},setAttribute(k,v){this.attrs[k]=v;},
    querySelector(sel){return sel.includes('label')?label:value;}};
  let writes=0,html='';
  const host={
    get innerHTML(){return html;},set innerHTML(v){writes++;html=v;},
    handlers:{},attrs:{},
    addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);},
    querySelector(sel){return sel.includes('data-bot-open')?trigger:null;},
    querySelectorAll(){return [];},contains(){return true;},
    setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k]??null;}
  };
  const listeners={};
  const dialog={innerHTML:'',open:false,className:'',attrs:{},handlers:{},
    setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k]??null;},
    removeAttribute(k){delete this.attrs[k];},
    addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);},
    showModal(){this.open=true;},close(){this.open=false;},
    contains(){return true;},
    querySelectorAll(sel){return sel.includes('data-bot-level')
      ?[...this.innerHTML.matchAll(/data-bot-level="([a-z]+)"/g)].map(m=>({
        dataset:{botLevel:m[1]},setAttribute(){}})):[];}
  };
  const doc={body:{appendChild(){}},createElement(){return dialog;}};
  const win={addEventListener(type,fn){(listeners[type]??=[]).push(fn);}};
  const control=bindBotDifficultyDialog(host,{storage,lang:'zh',document:doc,window:win});
  const emit=(node,type,event)=>{for(const fn of node.handlers[type]||[])fn(event);};
  return {control,host,label,value,trigger,dialog,storage,listeners,
    writes:()=>writes,
    choose:key=>emit(dialog,'click',{target:{closest:s=>s.includes('data-bot-level')?{dataset:{botLevel:key}}:null}}),
    storageEvent:key=>{for(const fn of listeners.storage||[])fn({key});}};
}

test('mounting on a first-painted trigger updates text in place, never rebuilds',()=>{
  const h=reuseHarness('hell');
  assert.ok(h.control);
  assert.equal(h.writes(),0,'host.innerHTML is never replaced');
  assert.equal(h.value.textContent,'地狱');
  assert.equal(h.label.textContent,'机器人难度');
  assert.equal(h.value.dataset.systemEnglish,'Hell');
  assert.equal(h.host.attrs['aria-label'],'机器人难度');

  h.choose('pro');
  assert.equal(h.value.textContent,'专业');
  assert.equal(h.writes(),0,'choosing a level still reuses the node');

  h.control.language('en');
  assert.equal(h.value.textContent,'Pro');
  assert.equal(h.label.textContent,'Computer difficulty');
  assert.equal(h.host.attrs['aria-label'],'Computer difficulty');
  assert.equal(h.writes(),0,'language switching still reuses the node');

  h.storage.setItem(BOT_LEVEL_KEY,'easy');
  h.storageEvent(BOT_LEVEL_KEY);
  assert.equal(h.value.textContent,'Easy','another tab stays in sync');
  assert.equal(h.writes(),0);

  assert.equal(h.control.set('hell'),'hell');
  assert.equal(h.control.refresh(),'hell');
  assert.equal(h.writes(),0);
});
