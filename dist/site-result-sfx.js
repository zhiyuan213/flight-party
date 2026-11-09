/* JoyFlock — shared result jingles for win / loss / draw.
 * One tiny synthesized celebration, no audio files, no network.
 *
 * Why a separate module from site-hover-sfx.js: a result is a one-shot moment,
 * not a UI tick. It gets a longer melodic cue (rising major arpeggio + chord +
 * bells + confetti noise for a win, a soft descending minor cadence for a loss)
 * and it must fire exactly once per finished game, even though render(), the
 * result dialog and the confetti reveal all see the same "board.over" state.
 *
 * Audio policy: the hover module already owns an AudioContext that is unlocked
 * by the first real gesture. Reuse any running context in this window or in a
 * same-origin ancestor/frame, so a result arriving from a REST poll is audible
 * without a second click. If the hover module is absent, keep a local context
 * that is created up front and resumed on the first gesture.
 *
 * Respects the same mute switches as the hover blip: joyflock.hoverSfx=0,
 * joyflock.pool.muted=1, flight-party-prefs.sound=false, the portal sound
 * control, and hidden documents.
 */
(function(){
 'use strict';
 if(window.__joyflockResultSfx)return;

 var VERSION='20261109-result1';
 var volume=.9,enabled=true;
 var localCtx=null,noiseBuffer=null,outputs=new WeakMap();
 var lastKey='',lastAt=0,played=0,blocked=0,skipped=0;
 var DEDUPE_MS=900;

 function muted(){
  if(!enabled)return true;
  try{
   var hover=window.__joyflockHoverSfx;
   if(hover&&'muted'in hover)return !!hover.muted;
  }catch(e){}
  try{
   if(localStorage.getItem('joyflock.hoverSfx')==='0')return true;
   if(localStorage.getItem('joyflock.pool.muted')==='1')return true;
   var prefs=JSON.parse(localStorage.getItem('flight-party-prefs')||'null');
   if(prefs&&prefs.sound===false)return true;
  }catch(e){}
  try{
   var sw=document.querySelector('[data-control="sound"]');
   if(sw&&!sw.hidden&&sw.getAttribute('aria-pressed')==='false')return true;
  }catch(e){}
  return document.hidden;
 }

 function context(){
  // A running hover context in this document or any same-origin frame in the
  // portal wins: it has already been unlocked by a real user gesture.
  var list=[window];
  try{
   var top=window.top;
   if(top&&list.indexOf(top)<0)list.push(top);
   if(top)for(var i=0;i<top.frames.length&&i<16;i++){
    var frame=top.frames[i];
    if(frame&&list.indexOf(frame)<0)list.push(frame);
   }
  }catch(e){}
  for(var j=0;j<list.length;j++){
   try{
    var api=list[j].__joyflockHoverSfx;
    if(api&&api.context&&api.context.state==='running')return api.context;
   }catch(e){}
  }
  if(localCtx){
   if(localCtx.state==='running')return localCtx;
   try{var p=localCtx.resume();if(p&&p.catch)p.catch(function(){});}catch(e){}
   return localCtx.state==='running'?localCtx:null;
  }
  return null;
 }
 function outputFor(c){
  var out=outputs.get(c);
  if(!out){
   out=c.createGain();out.gain.value=volume;
   // Keep stacked chord + bell + applause peaks from clipping on small speakers.
   var comp=c.createDynamicsCompressor();
   comp.threshold.value=-16;comp.knee.value=18;comp.ratio.value=3;
   comp.attack.value=.003;comp.release.value=.18;
   out.connect(comp);comp.connect(c.destination);
   outputs.set(c,out);
  }
  return out;
 }
 function noise(c){
  if(noiseBuffer&&noiseBuffer.sampleRate===c.sampleRate)return noiseBuffer;
  var length=Math.ceil(c.sampleRate),buffer=c.createBuffer(1,length,c.sampleRate),data=buffer.getChannelData(0);
  for(var i=0;i<length;i++)data[i]=Math.random()*2-1;
  noiseBuffer=buffer;return buffer;
 }
 function voice(c,out,at,cfg){
  var osc=c.createOscillator(),amp=c.createGain();
  osc.type=cfg.type||'sine';
  osc.frequency.setValueAtTime(cfg.freq,at);
  if(cfg.to)osc.frequency.exponentialRampToValueAtTime(cfg.to,at+cfg.dur);
  amp.gain.setValueAtTime(.0001,at);
  amp.gain.exponentialRampToValueAtTime(cfg.peak,at+(cfg.attack||.008));
  amp.gain.exponentialRampToValueAtTime(.0001,at+cfg.dur);
  var tail=osc;
  if(cfg.lp){var lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=cfg.lp;osc.connect(lp);tail=lp;}
  tail.connect(amp);amp.connect(out);
  osc.start(at);osc.stop(at+cfg.dur+.02);
  osc.onended=function(){try{osc.disconnect();amp.disconnect();}catch(e){}};
 }
 function bell(c,out,at,freq,peak,dur){
  // Inharmonic partials give a small chime / sparkle instead of an organ tone.
  voice(c,out,at,{freq:freq,peak:peak,dur:dur,attack:.004});
  voice(c,out,at,{freq:freq*2.01,peak:peak*.42,dur:dur*.62,attack:.003});
  voice(c,out,at,{freq:freq*3.97,peak:peak*.17,dur:dur*.38,attack:.002});
 }
 function hiss(c,out,at,cfg){
  var src=c.createBufferSource(),band=c.createBiquadFilter(),amp=c.createGain();
  src.buffer=noise(c);
  band.type='bandpass';band.frequency.value=cfg.freq;band.Q.value=cfg.q||.8;
  amp.gain.setValueAtTime(.0001,at);
  amp.gain.exponentialRampToValueAtTime(cfg.peak,at+.004);
  amp.gain.exponentialRampToValueAtTime(.0001,at+cfg.dur);
  src.connect(band);band.connect(amp);amp.connect(out);
  src.start(at,Math.random()*.4);src.stop(at+cfg.dur+.01);
  src.onended=function(){try{src.disconnect();band.disconnect();amp.disconnect();}catch(e){}};
 }

 /* C major, bright and short: a rising arpeggio, a held major chord with bell
  * sparkles over it, a faint confetti / applause texture, then a quick upper
  * flourish that lands back on the tonic. Total ~1.9s. */
 function win(c,out,t){
  var arp=[523.25,659.25,783.99,1046.5];
  voice(c,out,t,{freq:150,to:58,peak:.075,dur:.17,type:'sine'});
  hiss(c,out,t,{freq:1900,peak:.035,dur:.055,q:.7});
  for(var i=0;i<arp.length;i++){
   var at=t+.02+i*.095,dur=i===3?.46:.24;
   voice(c,out,at,{freq:arp[i],peak:.082,dur:dur,type:'triangle',attack:.006});
   voice(c,out,at,{freq:arp[i]*2,peak:.026,dur:dur*.7,attack:.004});
  }
  var chord=[523.25,659.25,783.99,1046.5],ct=t+.36;
  for(var k=0;k<chord.length;k++)voice(c,out,ct,{freq:chord[k],peak:.036,dur:1.12,type:k%2?'sine':'triangle',attack:.045,lp:5200});
  bell(c,out,t+.40,2093,.024,.62);
  bell(c,out,t+.53,2637,.020,.56);
  bell(c,out,t+.66,3136,.016,.50);
  for(var n=0;n<10;n++)hiss(c,out,t+.44+n*.085+Math.random()*.035,{freq:2200+Math.random()*2200,peak:.011+Math.random()*.009,dur:.028+Math.random()*.026,q:1.1});
  var flourish=[783.99,1046.5,1318.5,1567.98];
  for(var m=0;m<flourish.length;m++)voice(c,out,t+.80+m*.075,{freq:flourish[m],peak:.045,dur:.19,type:'sine',attack:.005});
  var final=[1046.5,1318.5,1567.98],ft=t+1.12;
  for(var q=0;q<final.length;q++)voice(c,out,ft,{freq:final[q],peak:.033,dur:.78,type:'triangle',attack:.03,lp:6200});
  bell(c,out,ft+.02,2093,.022,.85);
 }

 /* A gentle falling minor cadence (A4 - F4 - D4) with a soft low thud and a
  * dark sustained tail. Deliberately understated: a loss should feel like a
  * sigh, not a cartoon "wah-wah". Total ~1.8s. */
 function loss(c,out,t){
  voice(c,out,t,{freq:180,to:74,peak:.065,dur:.30,type:'sine',lp:600});
  var notes=[440,349.23,293.66];
  for(var i=0;i<notes.length;i++){
   var at=t+.06+i*.30,f=notes[i];
   voice(c,out,at,{freq:f,to:f*.965,peak:.078,dur:i===2?.62:.40,type:'triangle',attack:.014,lp:1500});
   voice(c,out,at,{freq:f/2,peak:.026,dur:i===2?.62:.40,type:'sine',attack:.02,lp:900});
  }
  var tail=t+1.00;
  voice(c,out,tail,{freq:146.83,peak:.046,dur:.82,type:'sine',attack:.05,lp:700});
  voice(c,out,tail,{freq:220,peak:.026,dur:.76,type:'triangle',attack:.06,lp:800});
  hiss(c,out,tail,{freq:520,peak:.012,dur:.55,q:.5});
 }

 /* Two quiet, even tones: a draw has no winner to celebrate or mourn. */
 function draw(c,out,t){
  voice(c,out,t,{freq:659.25,peak:.052,dur:.30,type:'sine',attack:.01,lp:4200});
  voice(c,out,t,{freq:1318.5,peak:.016,dur:.22,type:'sine',attack:.006});
  voice(c,out,t+.24,{freq:523.25,peak:.052,dur:.42,type:'sine',attack:.01,lp:4200});
  voice(c,out,t+.24,{freq:1046.5,peak:.014,dur:.30,type:'sine',attack:.006});
 }
 function build(kind,c,out,at){
  if(kind==='loss')loss(c,out,at);
  else if(kind==='draw')draw(c,out,at);
  else win(c,out,at);
 }
 function normalize(kind){
  if(kind==='lose'||kind==='lost'||kind==='defeat')return 'loss';
  if(kind==='tie'||kind==='even')return 'draw';
  if(kind==='loss'||kind==='draw')return kind;
  return 'win';
 }

 function play(kind,key){
  var k=key==null?'':String(key),now=performance.now();
  if(muted()){if(k)lastKey=k;skipped++;return false;}
  // The same finished game is reported by render(), the result dialog and the
  // confetti reveal. Never let those stack into a doubled jingle.
  if(k&&k===lastKey){skipped++;return false;}
  if(now-lastAt<DEDUPE_MS){skipped++;return false;}
  var c=context();if(!c){blocked++;return false;}
  var out=outputFor(c),at=c.currentTime+.02;
  try{build(normalize(kind),c,out,at);}catch(e){blocked++;return false;}
  lastKey=k;lastAt=now;played++;
  return true;
 }

 // Local fallback for pages that do not load the hover module. Creating the
 // context up front means its pending resume() resolves on the first gesture.
 function ensureLocal(){
  if(localCtx)return;
  var AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return;
  try{localCtx=new AC();}catch(e){localCtx=null;return;}
  try{var p=localCtx.resume();if(p&&p.catch)p.catch(function(){});}catch(e){}
 }
 ensureLocal();
 ['pointerdown','mousedown','touchstart','touchend','keydown','click']
  .forEach(function(type){window.addEventListener(type,function(){
   if(localCtx&&localCtx.state!=='running'){
    try{var p=localCtx.resume();if(p&&p.catch)p.catch(function(){});}catch(e){}
   }
  },{capture:true,passive:true});});

 var api={
  version:VERSION,
  play:play,
  // Diagnostic / preview hook: bypasses the once-per-game de-dupe.
  preview:function(kind){
   if(muted())return false;
   var c=context();if(!c)return false;
   try{build(normalize(kind),c,outputFor(c),c.currentTime+.02);played++;return true;}
   catch(e){blocked++;return false;}
  },
  reset:function(){lastKey='';lastAt=0;},
  setEnabled:function(value){enabled=!!value;return enabled;},
  setVolume:function(value){
   volume=Math.max(0,Math.min(2,Number(value)||0));
   try{if(localCtx){var o=outputs.get(localCtx);if(o)o.gain.setTargetAtTime(volume,localCtx.currentTime,.02);}}catch(e){}
   return volume;
  },
  get enabled(){return enabled;},
  get volume(){return volume;},
  get muted(){return muted();},
  get state(){var c=context();return c?c.state:(localCtx?localCtx.state:'none');},
  get stats(){return {played:played,blocked:blocked,skipped:skipped,lastKey:lastKey};},
  diagnose:function(){
   return {version:VERSION,state:api.state,muted:api.muted,stats:api.stats,
    note:api.state==='running'?'ready':'waiting for one click or key press (browser autoplay policy)'};
  }
 };
 try{Object.defineProperty(window,'__joyflockResultSfx',{value:api,configurable:false});}
 catch(e){window.__joyflockResultSfx=api;}
})();
