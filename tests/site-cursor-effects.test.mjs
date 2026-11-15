import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../dist/site-cursor-effects.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../dist/site-cursor.css',import.meta.url),'utf8');

function harness(cursor='cursor-rainbow',{fine=true,reduced=false,embedded=false}={}){
  const images=[],listeners=new Map(),docListeners=new Map(),queries=[];
  const on=(map,key,fn)=>{if(!map.has(key))map.set(key,new Set());map.get(key).add(fn);};
  const off=(map,key,fn)=>map.get(key)?.delete(fn);
  const emit=(map,key,event={})=>{for(const fn of map.get(key)||[])fn(event);};
  function element(tagName='DIV',blocked=false,cursor='auto'){
    const attrs=new Map(),properties=new Map();
    return {tagName,blocked,cursor,attrs,children:[],parentNode:null,
      style:{setProperty:(k,v)=>properties.set(k,v),removeProperty:k=>properties.delete(k),getPropertyValue:k=>properties.get(k)},
      closest(){return this.blocked?this:null;},setAttribute:(k,v)=>attrs.set(k,v),getAttribute:k=>attrs.get(k),removeAttribute:k=>attrs.delete(k),
      appendChild(child){child.remove();this.children.push(child);child.parentNode=this;},
      remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(child=>child!==this);this.parentNode=null;}
    };
  }
  const root=element('HTML'),body=element('BODY');root.setAttribute('data-shop-cursor','1');
  const document={documentElement:root,body,readyState:'complete',hidden:false,fullscreenElement:null,
    addEventListener:(k,fn)=>on(docListeners,k,fn),removeEventListener:(k,fn)=>off(docListeners,k,fn)};
  const state={cursor};
  const window={__joyflockPoints:{get:()=>({equipped:{cursor:state.cursor}})},
    __joyflockShop:{version:'legacy-chain',cursorAssetUrl:id=>'/assets/shop/'+id+'.png?v=pointer-test'},
    addEventListener:(k,fn)=>on(listeners,k,fn),removeEventListener:(k,fn)=>off(listeners,k,fn),
    getComputedStyle:target=>({cursor:target.cursor}),matchMedia:text=>{
      const q={matches:text.includes('reduced-motion')?reduced:fine,handlers:new Set(),
        addEventListener:(_,fn)=>q.handlers.add(fn),removeEventListener:(_,fn)=>q.handlers.delete(fn),
        set(value){q.matches=value;for(const fn of q.handlers)fn();}};queries.push(q);return q;
    }};
  window.parent=embedded?{}:window;
  function Image(){const image=element('IMG');images.push(image);return image;}
  const sandbox={window,document,Image,encodeURIComponent};runInNewContext(source,sandbox);
  const target=element('BUTTON');
  return {window,document,root,body,images,queries,state,element,target,listeners,
    move:(targetArg=target,x=103,y=202,pointerType='mouse')=>emit(listeners,'pointermove',{target:targetArg,clientX:x,clientY:y,pointerType}),
    event:(name,event)=>emit(listeners,name,event),docEvent:name=>emit(docListeners,name),
    load(){for(const image of images.slice(-2))image.onload?.();},
    change(id){state.cursor=id;emit(listeners,'joyflock:shop-changed');},
    rerun:()=>runInNewContext(source,sandbox)};
}

test('animated cosmetics only replace the complete fallback after both images load',()=>{
  const h=harness();h.move();
  assert.equal(h.images.length,2);
  assert.match(h.images[0].src,/cursor-rainbow-effect\.svg\?v=pointer-test$/);
  assert.match(h.images[1].src,/cursor-rainbow-pointer\.png\?v=pointer-test$/);
  assert.equal(h.root.getAttribute('data-joy-cursor-animated'),undefined);
  h.images[0].onload();assert.equal(h.root.getAttribute('data-joy-cursor-animated'),undefined);
  h.images[1].onload();assert.equal(h.root.getAttribute('data-joy-cursor-animated'),'cursor-rainbow');
  assert.equal(h.images[0].style.transform,'translate3d(100px,200px,0)','the tip remains at the native 3,2 hotspot');
  assert.equal(h.images[0].style.display,'block');
  assert.match(h.root.style.getPropertyValue('--joy-cursor-underlay'),/3 2, auto$/);
  assert.match(h.images[0].style.cssText,/pointer-events:none/,'the decoration cannot swallow clicks');
  assert.doesNotMatch(css,/cursor\s*:\s*none\s*[;}]/,'a real native pointer always remains available');
});

test('missing artwork and stale image loads retain a visible native fallback',()=>{
  const h=harness();h.move();h.images[1].onerror();h.images[0].onload();
  assert.equal(h.root.getAttribute('data-joy-cursor-animated'),undefined);
  assert.equal(h.images[0].style.display,'none');
  h.change('cursor-frost');const late=h.images.at(-1).onload;
  h.change('cursor-comet');late();
  assert.equal(h.root.getAttribute('data-joy-cursor-animated'),undefined,'old requests cannot activate a newer skin');
  h.load();h.move();assert.equal(h.root.getAttribute('data-joy-cursor-animated'),'cursor-comet');
});

test('rare, default, coarse and reduced-motion modes never create an animated layer',()=>{
  for(const id of ['cursor-ember','cursor-leaf','cursor-bubble','cursor-shell','cursor-star','cursor-candy']){
    const h=harness(id);h.move();assert.equal(h.images.length,0,id);
  }
  for(const options of [{fine:false},{reduced:true}]){
    const h=harness('cursor-amethyst',options);h.move();assert.equal(h.images.length,0);
  }
  const h=harness('cursor-amethyst');h.load();h.move();
  h.queries[1].set(true);assert.equal(h.body.children.length,0);assert.equal(h.root.getAttribute('data-joy-cursor-animated'),undefined);
  h.queries[1].set(false);h.load();h.move();assert.equal(h.root.getAttribute('data-joy-cursor-animated'),'cursor-amethyst');
});

test('text and native controls, touch, crosshairs and window exits restore the complete PNG',()=>{
  const h=harness();h.load();h.move();
  for(const target of [h.element('INPUT',true),h.element('TEXTAREA',true),h.element('SELECT',true),h.element('DIV',true),
    h.element('CANVAS',false,'crosshair'),h.element('DIV',false,'ew-resize'),h.element('DIV',false,'grab')]){
    h.move(target);assert.equal(h.root.getAttribute('data-joy-cursor-animated'),undefined);
    h.move();assert.equal(h.root.getAttribute('data-joy-cursor-animated'),'cursor-rainbow');
  }
  h.move(h.target,10,20,'touch');assert.equal(h.root.getAttribute('data-joy-cursor-animated'),undefined);
  for(const event of ['blur','pointerleave','pagehide','scroll']){
    h.move();h.event(event);assert.equal(h.root.getAttribute('data-joy-cursor-animated'),undefined,event);
  }
  h.move();h.document.hidden=true;h.docEvent('visibilitychange');
  assert.equal(h.root.getAttribute('data-joy-cursor-animated'),undefined);
});

test('embedded documents own one layer and clear it when crossing a frame boundary',()=>{
  const h=harness('cursor-comet',{embedded:true});h.load();h.move();
  assert.equal(h.body.children.length,1);
  h.rerun();assert.equal(h.body.children.length,1);assert.equal(h.listeners.get('pointermove').size,1);
  h.event('pointerout',{relatedTarget:{tagName:'IFRAME'}});
  assert.equal(h.root.getAttribute('data-joy-cursor-animated'),undefined);
  h.move();const full=h.element('DIV');h.document.fullscreenElement=full;h.docEvent('fullscreenchange');h.move();
  assert.equal(full.children.length,1,'the overlay remains inside a fullscreen game container');
  h.document.fullscreenElement=h.element('CANVAS');h.docEvent('fullscreenchange');h.move();
  assert.equal(h.root.getAttribute('data-joy-cursor-animated'),undefined,'direct fullscreen canvas keeps native fallback');
  h.window.__joyflockCursorEffects.dispose();assert.equal(h.body.children.length,0);
  assert.equal(h.listeners.get('pointermove').size,0);
});
