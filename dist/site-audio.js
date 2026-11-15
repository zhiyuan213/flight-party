/* One persisted boolean and one output gate for every sound category. */
(function(){
 'use strict';if(window.__joyflockAudio)return;
 var KEY='joyflock.audio.muted',outputs=[],byContext=new WeakMap(),muted=false;
 try{var saved=localStorage.getItem(KEY);if(saved==='true'||saved==='false')muted=saved==='true';else{var prefs=JSON.parse(localStorage.getItem('flight-party-prefs')||'null');muted=localStorage.getItem('joyflock.hoverSfx')==='0'||localStorage.getItem('joyflock.pool.muted')==='1'||!!(prefs&&prefs.sound===false);}}catch(e){}
 function syncButtons(){
  var zh=document.documentElement.getAttribute('data-locale')==='zh';
  document.querySelectorAll('[data-site-mute]').forEach(function(b){b.setAttribute('aria-pressed',String(muted));b.setAttribute('aria-label',zh?(muted?'取消静音':'静音'):(muted?'Unmute':'Mute'));b.textContent=muted?'🔇':'🔊';b.dataset.muted=String(muted);});
 }
 function setMuted(value){
  if(typeof value!=='boolean')throw new TypeError('muted must be boolean');
  muted=value;
  try{localStorage.setItem(KEY,String(muted));localStorage.setItem('joyflock.hoverSfx',muted?'0':'1');localStorage.setItem('joyflock.pool.muted',muted?'1':'0');var p=JSON.parse(localStorage.getItem('flight-party-prefs')||'{}');p.sound=!muted;localStorage.setItem('flight-party-prefs',JSON.stringify(p));}catch(e){}
  outputs.forEach(function(o){o.gate.gain.cancelScheduledValues(o.ctx.currentTime);o.gate.gain.setValueAtTime(muted?0:1,o.ctx.currentTime);});
  syncButtons();window.dispatchEvent(new CustomEvent('joyflock:audio-changed',{detail:{muted:muted}}));return muted;
 }
 function output(c,category){
  var map=byContext.get(c);if(!map){map={};byContext.set(c,map);}if(map[category])return map[category];
  var input=c.createGain(),gate=c.createGain();
  input.gain.value=category==='ui'?2.2:(category==='bubbles'||category==='four')?1.6:1;
  // Existing game compressors retain their authored envelopes. A second
  // compressor masks very short clicks; this guard is linear below -1 dBFS.
  if(c.createWaveShaper){var limit=c.createWaveShaper(),curve=new Float32Array(2049);for(var i=0;i<curve.length;i++)curve[i]=Math.max(-.89,Math.min(.89,i/1024-1));limit.curve=curve;input.connect(limit);limit.connect(gate);}else input.connect(gate);
  gate.gain.value=muted?0:1;gate.connect(c.destination);
  outputs.push({ctx:c,gate:gate});map[category]=input;return input;
 }
 window.__joyflockAudio={get muted(){return muted;},setMuted:setMuted,output:output};
 function mount(){
  var host=document.querySelector('body>.topbar .top-actions');if(host&&!host.querySelector('[data-site-mute]')){var b=document.createElement('button');b.type='button';b.className='site-mute';b.setAttribute('data-site-mute','');b.setAttribute('data-sfx','off');host.prepend(b);b.addEventListener('click',function(){setMuted(!muted);});}
  syncButtons();new MutationObserver(syncButtons).observe(document.documentElement,{attributes:true,attributeFilter:['data-locale','lang']});
 }
 window.addEventListener('storage',function(e){if(e.key===KEY&&(e.newValue==='true'||e.newValue==='false'))setMuted(e.newValue==='true');});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
