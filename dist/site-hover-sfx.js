/* JoyFlock — shared UI hover sound.
 * One tiny synthesized blip, no audio files, no network.
 * Loaded by every shell page and every game iframe so the same feedback is
 * heard on the intro buttons and in-game controls. Persistent navigation
 * chrome and game pickers (see MUTED_ZONES) are deliberately silent: they
 * are crossed constantly and a blip on every pass turns into noise.
 *
 * Voice: a short bright tick (no low-pass dulling) with two high partials and
 * a crisp high-band transient. The old lowpassed, downward-sweeping triangle
 * sounded muffled; keep this one above ~1 kHz with a fast attack.
 *
 * Zooming cards/dock icons are a separate voice: a soft rising "grow" whose
 * ~0.22s swell matches the .18–.25s scale transition. They stay muted for the
 * button tick (crossing nine covers with a click each is noise), but now get
 * one gentle upward grow + pop each time the pointer enters a zooming card.
 * The broadband air hiss was removed: its filtered white noise read as a
 * crackle ("破音") on the home covers, so the grow keeps only the clean
 * sine/triangle swell and the sine sparkle.
 * Shop product cards reuse this exact home-cover voice (slightly softer, because the shop grid is denser than nine covers).
 *
 * Browser policy: AudioContext may only start once the document has seen a
 * real user gesture (pointerdown / keydown / touchend). Hover, pointermove
 * and wheel are NOT activation events, so a freshly reloaded tab is silent
 * until one click or key press. We keep that wait as short as possible:
 *   - the context is created at load time, so its pending resume() resolves
 *     automatically on the first gesture (no need to hover first);
 *   - every activation event, focus/visibility change and pointer movement
 *     retries resume() (the last one helps when autoplay is already allowed,
 *     e.g. high Media Engagement Index or --autoplay-policy=no-user-gesture-required);
 *   - the first gesture immediately plays a blip for the control still under
 *     the pointer, so the interaction is audible instead of "silent until the
 *     next hover";
 *   - a gesture inside an iframe also unlocks its same-origin ancestors.
 */
(function(){
 'use strict';
 if(window.__joyflockHoverSfx)return;

 var SELECTOR=[
  'a[href]','button','[role="button"]','[role="tab"]','[role="menuitem"]','[role="option"]',
  'select','summary','[data-sfx-button]',
  'input[type="button"]','input[type="submit"]','input[type="reset"]',
  'input[type="checkbox"]','input[type="radio"]'
 ].join(',');
 /* Keep the hover blip on real game/action controls, but not on the
  * high-frequency navigation surfaces the pointer sweeps across:
  *   .topbar    - brand, Games, language, sign in / sign up
 *               (Membership & support lives in the footer)
  *   .game-card - the nine covers in the home grid
  *   .game-rail - the game detail view's left-hand dock (incl. its back link)
  *   .shop-card - every product card in the Joy Coin shop (see ZOOM_ZONES)
  * closest() also matches ancestors, so one selector silences a whole zone.
  * Add [data-sfx="on"] to opt a control back in if a zone ever needs one. */
 var MUTED_ZONES='.topbar,.game-card,.game-rail,.rail-game,.shop-card';
 var SKIP='[disabled],[aria-disabled="true"],.disabled,.unavailable,[data-sfx="off"],[inert]';
 var PROBE_GAP=300;
 /* Every distinct zooming-card entry plays; only child transitions are deduplicated. */
 var ZOOM_ZONES='.game-card.live,.rail-game,.shop-card';




 var ctx=null,outNode=null,current=null,currentZoom=false,enabled=true,noiseCache=null;

 var zoomOutputs=new WeakMap(),zoomGains=[];
 var volume=.8;
 var outputs=new WeakMap();
 var stats={hover:0,played:0,throttled:0,blocked:0,unlocks:0,firstTouch:0,zoom:0};
 var lastProbe=0,unlocked=false;

 // The public portal and its game iframe live on different trusted origins.
 // Share the already-unlocked portal output without accessing its JS realm.
 var PORTAL_ORIGINS=['https://joyflock.com','https://www.joyflock.com','https://flight.joyflock.com'];
 function relayHover(voice,el){
  try{
   if(ctx&&ctx.state==='running')return false;
   if(window.parent===window)return false;
   var origin=new URL(document.referrer).origin;
   if(origin===location.origin||PORTAL_ORIGINS.indexOf(origin)<0)return false;
   var zone=el.classList&&el.classList.contains('rail-game')?'dock':el.classList&&el.classList.contains('shop-card')?'shop':'home';
   window.parent.postMessage({type:'joyflock:hover-sfx',voice:voice,zone:zone},origin);
   return true;
  }catch(e){return false;}
 }
 window.addEventListener('message',function(event){
  var frame=document.getElementById('game-frame'),data=event.data;
  if(!frame||event.source!==frame.contentWindow||!data||data.type!=='joyflock:hover-sfx')return;
  try{if(event.origin!==new URL(frame.src,location.href).origin||PORTAL_ORIGINS.indexOf(event.origin)<0)return;}catch(e){return;}
  if(data.voice!=='tick'&&data.voice!=='grow')return;
  if(['home','shop','dock'].indexOf(data.zone)<0||muted())return;
  var ok=data.voice==='grow'?playZoom(frame,data.zone):play(frame);
  if(ok)stats.played++;else stats.blocked++;
 });

 function muted(){
  if(!enabled)return true;
  try{
   if(localStorage.getItem('joyflock.hoverSfx')==='0')return true;
   if(localStorage.getItem('joyflock.pool.muted')==='1')return true;
   var prefs=JSON.parse(localStorage.getItem('flight-party-prefs')||'null');
   if(prefs&&prefs.sound===false)return true;
  }catch(e){}
  // The flight-game sound switch is mirrored into the portal toolbar.
  try{
   var sw=document.querySelector('[data-control="sound"]');
   if(sw&&!sw.hidden&&sw.getAttribute('aria-pressed')==='false')return true;
  }catch(e){}
  return document.hidden;
 }

 function build(c){
  var master=c.createGain();master.gain.value=volume;
  // A high-pass removes the muddy low end; the gentle 14 kHz low-pass only
  // trims inaudible aliasing instead of cutting the overtones like the old
  // 5.2 kHz low-pass did.
  var hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=760;
  var lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=14000;
  master.connect(hp);hp.connect(lp);lp.connect(c.destination);
  return master;
 }
 function probe(){
  if(!ctx||ctx.state==='running')return;
  var now=performance.now();
  if(now-lastProbe<PROBE_GAP)return;
  lastProbe=now;
  try{var p=ctx.resume();if(p&&p.catch)p.catch(function(){});}catch(e){}
 }
 function ensure(force){
  if(!ctx){
   var AC=window.AudioContext||window.webkitAudioContext;
   if(!AC)return null;
   try{ctx=new AC();outNode=build(ctx);outputs.set(ctx,outNode);}catch(e){ctx=null;return null;}
   lastProbe=0;
  }
  // A gesture must always issue resume(); the probe throttle is for idle
  // pointer movement and would otherwise swallow the one call that matters.
  if(force)lastProbe=0;
  probe();
  return ctx;
 }
 // Same-origin frames can reuse a parent context that is already running;
 // cross-origin frames fall back to their own (postMessage access throws).
 function context(){
  if(ctx&&ctx.state==='running')return ctx;
  try{
   var parent=window.parent;
   if(parent!==window){
    var api=parent.__joyflockHoverSfx;
    if(api&&api.context&&api.context.state==='running')return api.context;
   }
  }catch(e){}
  var c=ensure();
  return c&&c.state==='running'?c:null;
 }
 function outputFor(c){
  var out=outputs.get(c);
  if(!out){out=build(c);outputs.set(c,out);}
  return out;
 }
 // The grow needs its low body (300 Hz) intact, so it bypasses the tick's
 // 760 Hz high-pass; a gentle 7 kHz low-pass keeps it bright, not boomy.
 function zoomOutputFor(c){
  var out=zoomOutputs.get(c);
  if(!out){
   var g=c.createGain();g.gain.value=volume;
   var hp=c.createBiquadFilter();hp.type='highpass';hp.frequency.value=140;
   var lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=7000;
   g.connect(hp);hp.connect(lp);lp.connect(c.destination);
   out=g;zoomOutputs.set(c,out);zoomGains.push(g);
  }
  return out;
 }
 function swell(c,out,type,from,to,duration,peak,at){
  var osc=c.createOscillator(),gain=c.createGain();
  osc.type=type;
  osc.frequency.setValueAtTime(from,at);
  osc.frequency.exponentialRampToValueAtTime(to,at+duration*.85);
  gain.gain.setValueAtTime(.0001,at);
  gain.gain.linearRampToValueAtTime(peak*.55,at+duration*.35);
  gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  osc.connect(gain);gain.connect(out);
  osc.start(at);osc.stop(at+duration+.015);
 }
 function playZoom(el,zone){
  if(muted())return false;
  if(relayHover('grow',el))return true;
  var c=context();if(!c)return false;
  var at=c.currentTime+.004,out=zoomOutputFor(c),lift=1,scale=1;
  var dock=zone==='dock'||el.classList&&el.classList.contains('rail-game');
  var shop=zone==='shop'||el.classList&&el.classList.contains('shop-card');
  // The dock is crossed continuously, so it gets a shorter, quieter grow.
  // Shop cards keep the home timbre but sit a little lower in the mix.
  var level=dock?.68:shop?.82:1,duration=dock?.18:shop?.19:.22;
  // A dock icon can be scaled anywhere between 1 and 2 by portal.js; the
  // bigger it grows, the higher the voice rises (capped so it stays soft).
  // Home covers use a fixed 1.05 scale.
  try{scale=parseFloat(el.style&&el.style.getPropertyValue('--dock-scale'))||1;}catch(e){}
  lift=1+(Math.max(1,Math.min(1.35,scale))-1)*1.1;
  swell(c,out,'sine',300,820*lift,duration,.050*level,at);
  swell(c,out,'triangle',600,1500*lift,duration*.82,.016*level,at+.006);
  tone(c,out,'sine',1180,2100*lift,.046,.021*level,at);
  return true;
 }
 function zoomTarget(node){
  if(!node||node.nodeType!==1||!node.closest)return null;
  var el=node.closest(ZOOM_ZONES);
  if(!el||el.closest(SKIP)||!el.getClientRects().length)return null;
  var style=getComputedStyle(el);
  if(style.display==='none'||style.visibility==='hidden'||style.pointerEvents==='none')return null;
  return el;
 }
 function tone(c,out,type,from,to,duration,peak,at){
  var osc=c.createOscillator(),gain=c.createGain();
  osc.type=type;
  osc.frequency.setValueAtTime(from,at);
  osc.frequency.exponentialRampToValueAtTime(to,at+duration);
  gain.gain.setValueAtTime(.0001,at);
  gain.gain.exponentialRampToValueAtTime(peak,at+.002);
  gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  osc.connect(gain);gain.connect(out);
  osc.start(at);osc.stop(at+duration+.012);
 }
 function transient(c,out,at){
  if(!noiseCache||noiseCache.sampleRate!==c.sampleRate){
   var n=Math.ceil(c.sampleRate*.008),buffer=c.createBuffer(1,n,c.sampleRate),data=buffer.getChannelData(0);
   for(var i=0;i<n;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/(c.sampleRate*.0015));
   noiseCache={buffer:buffer,sampleRate:c.sampleRate};
  }
  var src=c.createBufferSource(),band=c.createBiquadFilter(),gain=c.createGain();
  src.buffer=noiseCache.buffer;
  band.type='bandpass';band.frequency.value=5600;band.Q.value=.6;
  gain.gain.setValueAtTime(.011,at);
  gain.gain.exponentialRampToValueAtTime(.0001,at+.008);
  src.connect(band);band.connect(gain);gain.connect(out);
  src.start(at);src.stop(at+.009);
 }
 function play(el){
  if(muted())return false;
  if(relayHover('tick',el))return true;
  var c=context();if(!c)return false;
  var at=c.currentTime+.004,detune=.982+Math.random()*.036,big=false;
  try{var r=el.getBoundingClientRect();big=r.width*r.height>16000;}catch(e){}
  var base=(big?980:1300)*detune,out=outputFor(c);
  // Short bright tick: almost no downward sweep, plus 2x/3x partials that
  // give the "click" its crisp edge. Total peak stays close to the old voice.
  tone(c,out,'triangle',base,base*.9,.034,.048,at);
  tone(c,out,'sine',base*2.01,base*1.96,.028,.026,at);
  tone(c,out,'sine',base*3.04,base*2.94,.020,.010,at+.001);
  transient(c,out,at);
  return true;
 }
 function find(node){
  if(!node||node.nodeType!==1||!node.closest)return null;
  var el=node.closest(SELECTOR);
  if(!el||el.closest(SKIP)||!el.getClientRects().length)return null;
  if(el.closest(MUTED_ZONES)&&!el.closest('[data-sfx="on"]'))return null;
  var style=getComputedStyle(el);
  if(style.display==='none'||style.visibility==='hidden'||style.pointerEvents==='none')return null;
  if(el.tagName==='A'&&/^javascript:/i.test(el.getAttribute('href')||''))return null;
  return el;
 }

 // A gesture inside an iframe grants activation to its same-origin ancestors.
 // Ask them to retry resume() as well; unlock() never re-broadcasts, so this
 // cannot recurse between frames.
 function broadcast(){
  try{
   var top=window.top,list=[];
   try{list.push(top);}catch(e){}
   try{for(var i=0;i<top.frames.length;i++)list.push(top.frames[i]);}catch(e){}
   for(var j=0;j<list.length;j++){
    var w=list[j];
    if(!w||w===window)continue;
    try{var a=w.__joyflockHoverSfx;if(a&&a.unlock)a.unlock();}catch(e){}
   }
  }catch(e){}
 }
 function markUnlocked(){
  if(unlocked||!ctx||ctx.state!=='running')return;
  unlocked=true;
  stats.unlocks++;
  // Hovers before this gesture were silent. If the pointer is still on a
  // control, play its blip now rather than waiting for a second hover.
  if(stats.blocked>0&&current&&!muted()){
   if(currentZoom?playZoom(current):play(current)){
    stats.played++;stats.firstTouch++;
    if(currentZoom)stats.zoom=(stats.zoom||0)+1;
   }
  }
 }
 function onGesture(){
  ensure(true);
  broadcast();
  if(ctx&&ctx.state==='running'){markUnlocked();return;}
  // Chrome often resolves the pending resume() just *after* the gesture
  // handler returns, so retry on the next tasks. This makes the very first
  // interaction audible even when the pointer never leaves its control.
  if(!unlocked&&stats.blocked>0&&current){
   Promise.resolve().then(markUnlocked);
   setTimeout(markUnlocked,0);
   setTimeout(markUnlocked,80);
  }
 }
 function onVisible(){if(!document.hidden)probe();}

 document.addEventListener('pointerover',function(event){
  if(event.pointerType==='touch')return;
  var zoom=zoomTarget(event.target);
  var el=zoom||find(event.target);
  if(el===current)return;
  current=el;currentZoom=!!zoom;
  if(!el)return;
  stats.hover++;
  if(zoom){
   // Every real entry sounds; the current check above deduplicates children.
   if(playZoom(zoom)){
    stats.played++;stats.zoom=(stats.zoom||0)+1;
   }else stats.blocked++;
   return;
  }
  if(play(el))stats.played++;
  else stats.blocked++;
 },{passive:true});
 document.addEventListener('pointerleave',function(){current=null;},{passive:true});
 window.addEventListener('blur',function(){current=null;},{passive:true});

 // Not activation events by themselves, but they retry resume() where the
 // browser already permits autoplay (site allowed, MEI met, or an explicit
 // --autoplay-policy=no-user-gesture-required flag).
 document.addEventListener('pointermove',function(event){
  if(event.pointerType!=='touch')probe();
 },{passive:true});
 window.addEventListener('focus',onVisible,{passive:true});
 window.addEventListener('pageshow',onVisible,{passive:true});
 document.addEventListener('visibilitychange',onVisible,{passive:true});

 ['pointerdown','mousedown','pointerup','touchstart','touchend','keydown','click','auxclick','contextmenu']
  .forEach(function(type){window.addEventListener(type,onGesture,{capture:true,passive:true});});

 // Create the context immediately: Chrome resolves this suspended resume()
 // promise on the first real gesture, even if that gesture precedes a hover.
 ensure();

 var api={
  version:'20261112-gamelanes1',
  play:function(el){return play(el||document.body);},
  playZoom:function(el){return playZoom(el||document.body);},
  setEnabled:function(value){enabled=!!value;return enabled;},
  setVolume:function(value){
   volume=Math.max(0,Math.min(2,Number(value)||0));
   if(outNode)outNode.gain.setTargetAtTime(volume,ctx.currentTime,.01);
   for(var i=0;i<zoomGains.length;i++)zoomGains[i].gain.setTargetAtTime(volume,ctx.currentTime,.01);
   return volume;
  },
  unlock:function(){ensure(true);},
  get enabled(){return enabled;},
  get volume(){return volume;},
  get context(){return ctx;},
  get state(){return ctx?ctx.state:'none';},
  get muted(){return muted();},
  get stats(){return stats;},
  get activation(){
   try{var u=navigator.userActivation;return u?{active:u.isActive,hasBeenActive:u.hasBeenActive}:null;}
   catch(e){return null;}
  },
  diagnose:function(){
   return {version:api.version,state:api.state,activation:api.activation,
    muted:api.muted,stats:JSON.parse(JSON.stringify(stats)),
    note:api.state==='running'?'ready':'waiting for one click or key press (browser autoplay policy)'};
  }
 };
 try{Object.defineProperty(window,'__joyflockHoverSfx',{value:api,configurable:false});}
 catch(e){window.__joyflockHoverSfx=api;}
})();
