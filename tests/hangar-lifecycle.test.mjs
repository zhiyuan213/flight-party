import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {normalizePlaneStyle,planeSkin,canUsePlaneStyle} from '../dist/plane-skin.js';

// Exercise real dialog/save event handlers, replacing only browser surfaces and artwork.
function setup(){
 const element=()=>({dataset:{},attributes:{},setAttribute(key,value){this.attributes[key]=value;},removeAttribute(key){delete this.attributes[key];}});
 let livePreviews=0,previewCount=0,resolveSave,lastPosted;
 const options=['classic','gold2d','cloud2d','night2d','obsidian2d','aurora2d'].map(plane=>Object.assign(element(),{dataset:{plane}}));
 const nodes={'.hangar-stage':element(),'.hangar-hint':element(),'[data-plane-save]':element(),'.hangar-notice':element()};
 const dialog=Object.assign(element(),{open:false,listeners:{},addEventListener(type,listener){this.listeners[type]=listener;},querySelector(key){return nodes[key];},querySelectorAll(){return options;},showModal(){this.open=true;},close(){this.open=false;this.listeners.close?.();}});
 let hero={wrap:element()},selectedStyle='classic';
 const identity=(member,plane='classic',annualMember=false)=>({appearance:{member,plane,annualMember}});
 const session={listeners:{},value:identity(true),addEventListener(type,listener){this.listeners[type]=listener;},dispatchEvent(event){this.listeners[event.type]?.(event);},request(path,body){return path==='/api/me'?Promise.resolve(this.value):new Promise(resolve=>{lastPosted=body;resolveSave=resolve;});}};
 const source=readFileSync(new URL('../dist/hangar.js',import.meta.url),'utf8').replace(/^import .*\r?\n/gm,'').replace('export function bindHangar','function bindHangar');
 const context=vm.createContext({normalizePlaneStyle,planeSkin,canUsePlaneStyle,document:{createElement:()=>dialog,body:{append(){}}},CustomEvent:class{constructor(type,values){this.type=type;this.detail=values.detail;}},HeroPlane:class{constructor(){this.wrap=element();this.disposed=false;livePreviews++;previewCount++;}dispose(){if(!this.disposed){livePreviews--;this.disposed=true;}}}});
 vm.runInContext(source,context);context.bindHangar(hero,session,en=>en,()=>false,style=>{selectedStyle=style;hero={wrap:element()};return hero;});
 const emit=(member,plane='classic',annualMember=false)=>{session.value=identity(member,plane,annualMember);session.dispatchEvent({type:'identity',detail:session.value});};
 const click=(kind,plane)=>dialog.listeners.click({target:{closest(selector){if(selector===`[${kind}]`)return plane?options.find(b=>b.dataset.plane===plane):element();return null;}}});
 return {dialog,nodes,options,session,emit,click,open:()=>hero.wrap.onclick(),completeSave:(style='gold2d',annualMember=false)=>{session.value=identity(true,style,annualMember);resolveSave();},get lastPosted(){return lastPosted;},get livePreviews(){return livePreviews;},get previewCount(){return previewCount;},get selectedStyle(){return selectedStyle;}};
}

test('selection saves immediately and closing during save never recreates hidden preview',async()=>{
 const h=setup();h.emit(true);h.open();const saving=h.click('data-plane','gold2d');
 assert.equal(h.lastPosted.plane,'gold2d');assert.ok(h.options.every(b=>b.disabled));
 h.dialog.close();const count=h.previewCount;h.completeSave();await saving;
 assert.equal(h.previewCount,count);assert.equal(h.livePreviews,0);assert.equal(h.selectedStyle,'gold2d');
});
test('reopening a pending autosave restores selection and releases controls',async()=>{
 const h=setup();h.emit(true);h.open();const saving=h.click('data-plane','gold2d');h.dialog.close();h.open();
 assert.ok(h.options.every(b=>b.disabled));h.completeSave();await saving;
 assert.equal(h.livePreviews,1);assert.ok(h.options.every(b=>!b.disabled));
 assert.equal(h.options.find(b=>b.dataset.plane==='gold2d').attributes['aria-pressed'],'true');h.dialog.close();
});
test('annual aircraft may be previewed but autosave requires verified annual entitlement',async()=>{
 for(const style of ['obsidian2d','aurora2d']){
  const h=setup();h.emit(true);h.open();await h.click('data-plane',style);assert.equal(h.lastPosted,undefined);
  h.emit(true,'classic','true');await h.click('data-plane',style);assert.equal(h.lastPosted,undefined);
  h.emit(true,'classic',true);const saving=h.click('data-plane',style);assert.equal(h.lastPosted.plane,style);h.completeSave(style,true);await saving;
  assert.equal(h.selectedStyle,style);h.emit(true,style,false);assert.equal(h.selectedStyle,'classic');h.dialog.close();
 }
});
