/* Animated cosmetics supplement a real native PNG cursor; they never hide it.
 * Every document owns its own small layer, including same-origin game frames.
 * Badge animation uses the same SVG as the shop preview and never moves the tip.
 */
(function(){
  'use strict';
  if(window.__joyflockCursorEffects){window.__joyflockCursorEffects.refresh();return;}
  var doc=document,root=doc.documentElement;
  var animated={'cursor-rainbow':'epic','cursor-frost':'epic','cursor-heart':'epic','cursor-butterfly':'epic','cursor-amethyst':'legend','cursor-comet':'legend','cursor-nova':'legend'};
  var fine=window.matchMedia('(hover:hover) and (pointer:fine)');
  var reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  var id='',ready=false,failed=false,serial=0,layer=null,underlay=null,underlayUrl='';
  var inside=false,lastTarget=null,lastX=0,lastY=0,disposed=false;
  var exclusions='input,textarea,select,option,[contenteditable]:not([contenteditable="false"]),canvas.pool-spot,iframe,dialog[open],[popover]';

  function hide(){
    if(layer)layer.style.display='none';
    root.removeAttribute('data-joy-cursor-animated');
    root.style.removeProperty('--joy-cursor-underlay');
  }
  function removeArt(){
    hide();serial++;ready=false;failed=false;
    if(layer){layer.onload=layer.onerror=null;layer.remove();layer=null;}
    if(underlay){underlay.onload=underlay.onerror=null;underlay=null;}
  }
  function supported(){return fine.matches&&!reduced.matches&&!doc.hidden;}
  function excluded(target){
    if(!target||!target.closest||target.closest(exclusions))return true;
    var full=doc.fullscreenElement;
    if(full&&/^(CANVAS|IFRAME|VIDEO)$/.test(full.tagName))return true;
    // Respect application-specific manipulation and text cursors. A cosmetic
    // must not conceal an aim crosshair, resizing affordance or drag handle.
    var value=window.getComputedStyle?window.getComputedStyle(target).cursor:'';
    return /^(text|vertical-text|crosshair|move|grab|grabbing|not-allowed|wait|progress|none|.*-resize)$/.test(value);
  }
  function position(){
    if(!layer||!ready||!inside||!supported()||excluded(lastTarget)){hide();return;}
    // No interpolation: the decorative artwork shares the native 3,2 hotspot.
    layer.style.transform='translate3d('+(lastX-3)+'px,'+(lastY-2)+'px,0)';
    layer.style.display='block';
    root.style.setProperty('--joy-cursor-underlay','url("'+underlayUrl+'") 3 2, auto');
    root.setAttribute('data-joy-cursor-animated',id);
  }
  function hostLayer(){
    if(!layer)return;
    var host=doc.fullscreenElement;
    if(!host||/^(CANVAS|IFRAME|VIDEO)$/.test(host.tagName))host=doc.body;
    if(host&&layer.parentNode!==host)host.appendChild(layer);
  }
  function equipped(){
    var api=window.__joyflockPoints||window.__joyflockShop;
    var state=api&&(api.get?api.get():api.getState?api.getState():null);
    return state&&state.equipped&&state.equipped.cursor||'';
  }
  function refresh(){
    if(disposed)return;
    var next=equipped();
    if(!animated[next]||!supported()){removeArt();id='';return;}
    if(next===id&&!failed){position();return;}
    removeArt();id=next;
    var version=window.__joyflockShop&&window.__joyflockShop.version||'cursor-motion1';
    var base=window.__joyflockShop&&window.__joyflockShop.cursorAssetUrl
      ?window.__joyflockShop.cursorAssetUrl(id):'/assets/shop/'+id+'.png?v='+encodeURIComponent(version);
    underlayUrl=base.replace(/\.png(?=\?|$)/,'-pointer.png');
    var effectUrl=base.replace(/\.png(?=\?|$)/,'-effect.svg'),ticket=serial,loaded=0;
    function loadedOne(){if(ticket!==serial||disposed)return;if(++loaded===2){ready=true;position();}}
    function failedOne(){if(ticket!==serial)return;failed=true;ready=false;hide();}
    layer=new Image();layer.className='joy-cursor-effect';layer.alt='';layer.setAttribute('aria-hidden','true');
    layer.draggable=false;layer.width=layer.height=32;
    layer.style.cssText='position:fixed;left:0;top:0;width:32px;height:32px;max-width:none;pointer-events:none;display:none;z-index:2147483646;';
    layer.onload=loadedOne;layer.onerror=failedOne;hostLayer();
    underlay=new Image();underlay.onload=loadedOne;underlay.onerror=failedOne;
    underlay.src=underlayUrl;layer.src=effectUrl;
  }
  function move(event){
    if(event.pointerType&&event.pointerType!=='mouse'){inside=false;hide();return;}
    inside=true;lastTarget=event.target;lastX=event.clientX;lastY=event.clientY;position();
  }
  function leave(){inside=false;lastTarget=null;hide();}
  function out(event){if(!event.relatedTarget||event.relatedTarget.tagName==='IFRAME')leave();}
  function press(event){if(event.pointerType==='touch'||excluded(event.target))leave();}
  function fullscreen(){hide();hostLayer();inside=false;}
  function visibility(){if(doc.hidden)leave();else refresh();}
  function media(){leave();refresh();}
  function observe(query,listener){if(query.addEventListener)query.addEventListener('change',listener);else if(query.addListener)query.addListener(listener);}
  function unobserve(query,listener){if(query.removeEventListener)query.removeEventListener('change',listener);else if(query.removeListener)query.removeListener(listener);}
  function mount(){
    if(disposed)return;
    window.addEventListener('pointermove',move,{passive:true});
    window.addEventListener('pointerout',out,{passive:true});
    window.addEventListener('pointerleave',leave,{passive:true});
    window.addEventListener('pointerdown',press,{passive:true});
    window.addEventListener('blur',leave);window.addEventListener('pagehide',leave);
    window.addEventListener('scroll',leave,{passive:true,capture:true});
    window.addEventListener('joyflock:shop-changed',refresh);
    doc.addEventListener('visibilitychange',visibility);doc.addEventListener('fullscreenchange',fullscreen);
    observe(fine,media);observe(reduced,media);refresh();
  }
  function dispose(){
    disposed=true;removeArt();
    for(var pair of [['pointermove',move],['pointerout',out],['pointerleave',leave],['pointerdown',press],['blur',leave],['pagehide',leave],['joyflock:shop-changed',refresh]])window.removeEventListener(pair[0],pair[1]);
    window.removeEventListener('scroll',leave,true);doc.removeEventListener('visibilitychange',visibility);doc.removeEventListener('fullscreenchange',fullscreen);
    doc.removeEventListener('DOMContentLoaded',mount);unobserve(fine,media);unobserve(reduced,media);
    delete window.__joyflockCursorEffects;
  }
  window.__joyflockCursorEffects={refresh:refresh,dispose:dispose};
  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
