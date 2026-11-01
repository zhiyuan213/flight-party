import test from 'node:test';
import assert from 'node:assert/strict';
import {HeroPlane} from '../dist/hero-plane.js';
import {planeSkin} from '../dist/plane-skin.js';

test('homepage preview loads each authored sprite and falls back once when a VIP asset fails',()=>{
 const saved={document:globalThis.document,Image:globalThis.Image,ResizeObserver:globalThis.ResizeObserver};
 const context={setTransform(){}};
 const element=()=>({dataset:{},classList:{add(){}},clientWidth:130,clientHeight:105,setAttribute(){},append(){},remove(){},getContext:()=>context});
 globalThis.document={hidden:false,createElement:element,addEventListener(){},removeEventListener(){}};
 globalThis.Image=class{constructor(){this.complete=false;this.assignments=[];}set src(value){this.assignments.push(value);this._src=value;}get src(){return this._src;}};
 globalThis.ResizeObserver=class{observe(){}disconnect(){}};
 try{
  for(const style of ['classic','gold2d','cloud2d','night2d']){
   const parent={prepend(){},classList:{add(){}}},hero=new HeroPlane(parent,{style,reduced:true});
   assert.equal(hero.image.src,planeSkin(style).asset);
   assert.equal(hero.style,style);
   assert.equal(hero.wrap.dataset.heroRenderer,'illustrated-animated');
   if(style!=='classic'){
    hero.image.onerror();assert.equal(hero.style,'classic');assert.equal(hero.image.src,planeSkin('classic').asset);
    const attempts=hero.image.assignments.length;hero.image.onerror();assert.equal(hero.image.assignments.length,attempts,'failed fallback never enters an image retry loop');
   }
   hero.dispose();
  }
 }finally{for(const [key,value] of Object.entries(saved)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
});
