import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {normalizePlaneStyle} from '../dist/plane-skin.js';

// Exercise real dialog/save event handlers, replacing only browser surfaces and artwork.
function setup(){
 const element=()=>({dataset:{},attributes:{},setAttribute(key,value){this.attributes[key]=value;},removeAttribute(key){delete this.attributes[key];}});
 let livePreviews=0,previewCount=0,resolveSave,lastPosted;
 const options=['classic','gold2d','cloud2d','night2d'].map(plane=>Object.assign(element(),{dataset:{plane}}));
 const nodes={'.hangar-stage':element(),'.hangar-hint':element(),'[data-plane-save]':element(),'.hangar-notice':element()};
 const dialog=Object.assign(element(),{open:false,listeners:{},addEventListener(type,listener){this.listeners[type]=listener;},querySelector(key){return nodes[key];},querySelectorAll(){return options;},showModal(){this.open=true;},close(){this.open=false;this.listeners.close?.();}});
 let hero={wrap:element()},selectedStyle='classic';
 const identity=(member,plane='classic')=>({appearance:{member,plane}});
 const session={listeners:{},value:identity(true),addEventListener(type,listener){this.listeners[type]=listener;},dispatchEvent(event){this.listeners[event.type]?.(event);},request(path,body){return path==='/api/me'?Promise.resolve(this.value):new Promise(resolve=>{lastPosted=body;resolveSave=resolve;});}};
 const source=readFileSync(new URL('../dist/hangar.js',import.meta.url),'utf8').replace(/^import .*\r?\n/gm,'').replace('export function bindHangar','function bindHangar');
 const context=vm.createContext({normalizePlaneStyle,document:{createElement:()=>dialog,body:{append(){}}},CustomEvent:class{constructor(type,values){this.type=type;this.detail=values.detail;}},HeroPlane:class{constructor(){this.wrap=element();this.disposed=false;livePreviews++;previewCount++;}dispose(){if(!this.disposed){livePreviews--;this.disposed=true;}}}});
 vm.runInContext(source,context);context.bindHangar(hero,session,en=>en,()=>false,style=>{selectedStyle=style;hero={wrap:element()};return hero;});
 const emit=(member,plane='classic')=>{session.value=identity(member,plane);session.dispatchEvent({type:'identity',detail:session.value});};
 const click=(kind,plane)=>dialog.listeners.click({target:{closest(selector){if(selector===`[${kind}]`)return plane?options.find(b=>b.dataset.plane===plane):element();return null;}}});
 return {dialog,nodes,options,session,emit,click,open:()=>hero.wrap.onclick(),completeSave:(style='gold2d')=>{session.value=identity(true,style);resolveSave();},get lastPosted(){return lastPosted;},get livePreviews(){return livePreviews;},get previewCount(){return previewCount;},get selectedStyle(){return selectedStyle;}};
}

test('closing during save never recreates a hidden airplane preview',async()=>{
 const h=setup();h.emit(true);h.open();await h.click('data-plane','gold2d');
 assert.equal(h.livePreviews,1);
 const saving=h.click('data-plane-save');assert.equal(h.nodes['[data-plane-save]'].disabled,true);
 h.dialog.close();assert.equal(h.livePreviews,0);
 const count=h.previewCount;h.completeSave();await saving;
 assert.equal(h.previewCount,count,'request completion must not construct artwork in a closed dialog');
 assert.equal(h.livePreviews,0);assert.equal(h.selectedStyle,'gold2d','verified identity still updates the homepage');
});

test('membership changes update the open save control without interrupting preview',()=>{
 const h=setup();h.emit(true);h.open();const count=h.previewCount;
 assert.equal(h.nodes['[data-plane-save]'].disabled,false);
 h.emit(false);assert.equal(h.nodes['[data-plane-save]'].disabled,true);
 h.session.dispatchEvent({type:'profile-updated',detail:null});assert.equal(h.nodes['[data-plane-save]'].disabled,true);
 h.emit(true);assert.equal(h.nodes['[data-plane-save]'].disabled,false);
 assert.equal(h.previewCount,count,'identity refreshes update controls rather than restart the preview');
});

test('reopening a pending save restores the saved selection and enables controls',async()=>{
 const h=setup();h.emit(true);h.open();await h.click('data-plane','gold2d');
 const saving=h.click('data-plane-save');h.dialog.close();h.open();
 assert.equal(h.livePreviews,1);assert.equal(h.nodes['[data-plane-save]'].disabled,true);
 h.completeSave();await saving;
 assert.equal(h.livePreviews,1);assert.equal(h.nodes['[data-plane-save]'].disabled,false);
 assert.equal(h.options.find(b=>b.dataset.plane==='gold2d').attributes['aria-pressed'],'true');
 h.dialog.close();assert.equal(h.livePreviews,0);
});

test('new cloud and night selections persist their own keys and expire back to classic',async()=>{
 for(const style of ['cloud2d','night2d']){
  const h=setup();h.emit(true);h.open();await h.click('data-plane',style);
  const saving=h.click('data-plane-save');assert.equal(h.lastPosted.plane,style);
  h.completeSave(style);await saving;assert.equal(h.selectedStyle,style);
  h.dialog.close();h.open();assert.equal(h.options.find(b=>b.dataset.plane===style).attributes['aria-pressed'],'true');
  h.emit(false,style);assert.equal(h.selectedStyle,'classic');assert.equal(h.nodes['[data-plane-save]'].disabled,true);
  h.dialog.close();assert.equal(h.livePreviews,0);
 }
});
