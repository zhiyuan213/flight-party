/* Connect Four counter Foley. Driven by four-drop's animation clock, never
 * by the input click. Nothing is queued while audio is locked or muted. */
let enabled=true,prepared=false,localContext=null;
const noiseBuffers=new WeakMap(),liveSounds=new Set();

function windows(){
  const list=[window];
  try{
    if(window.top&&!list.includes(window.top))list.push(window.top);
    for(let i=0;i<(window.top?.frames.length||0)&&i<16;i++){
      const frame=window.top.frames[i];if(!list.includes(frame))list.push(frame);
    }
  }catch{}
  return list;
}
function sharedContext(running=true){
  for(const host of windows())try{
    const context=host.__joyflockHoverSfx?.context;
    if(context&&(!running||context.state==='running'))return context;
  }catch{}
  return null;
}
function muted(){
  if(!enabled||document.hidden)return true;
  try{if(window.__joyflockHoverSfx?.muted)return true;}catch{}
  try{
    if(localStorage.getItem('joyflock.hoverSfx')==='0'||localStorage.getItem('joyflock.pool.muted')==='1')return true;
    if(JSON.parse(localStorage.getItem('flight-party-prefs')||'null')?.sound===false)return true;
  }catch{}
  try{
    const control=document.querySelector('[data-control="sound"]');
    if(control&&!control.hidden&&control.getAttribute('aria-pressed')==='false')return true;
  }catch{}
  return false;
}
function ensureContext(){
  const shared=sharedContext(false);if(shared)return shared;
  if(!localContext)try{
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(AudioContext)localContext=new AudioContext();
  }catch{}
  return localContext;
}
function unlock(){
  const context=ensureContext();
  if(context&&context.state!=='running')try{context.resume()?.catch?.(()=>{});}catch{}
}
export function prepareFourAudio(){
  if(prepared)return;prepared=true;
  ensureContext();
  for(const event of ['pointerdown','mousedown','touchstart','touchend','keydown','click'])
    window.addEventListener(event,unlock,{capture:true,passive:true});
}
/* Preview-only switch as well as an optional page lifecycle control. Global
 * sound preferences still take precedence; this never changes saved prefs. */
export function setFourAudioEnabled(value){
  enabled=!!value;
  if(!enabled)for(const sound of [...liveSounds])sound.cancel();
  return enabled;
}
function noise(context){
  if(noiseBuffers.has(context))return noiseBuffers.get(context);
  const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*.14),context.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  noiseBuffers.set(context,buffer);return buffer;
}

export function createFourDropSound(){
  const voices=new Set(),played=new Set();let cancelled=false;
  const sound={release:()=>play('release'),land:()=>play('land'),settle:()=>play('settle'),cancel};
  function cancel(){
    cancelled=true;
    for(const voice of [...voices]){try{voice.source.stop();}catch{}voice.clean();}
    liveSounds.delete(sound);
  }
  function connect(context,source,nodes,duration){
    let previous=source;
    for(const node of nodes){previous.connect(node);previous=node;}
    previous.connect(context.destination);
    const voice={source,clean(){
      for(const node of [source,...nodes])try{node.disconnect();}catch{}
      voices.delete(voice);if(!voices.size)liveSounds.delete(sound);
    }};
    voices.add(voice);liveSounds.add(sound);source.onended=voice.clean;
    source.start(context.currentTime);source.stop(context.currentTime+duration+.008);
  }
  function tone(context,from,to,duration,level){
    const source=context.createOscillator(),gain=context.createGain(),at=context.currentTime;
    source.type='sine';source.frequency.setValueAtTime(from,at);
    source.frequency.exponentialRampToValueAtTime(to,at+duration);
    gain.gain.setValueAtTime(.0001,at);
    gain.gain.linearRampToValueAtTime(level,at+.0015);
    gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    connect(context,source,[gain],duration);
  }
  function air(context,from,to,duration,level,attack){
    const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain(),at=context.currentTime;
    source.buffer=noise(context);filter.type='bandpass';filter.Q.value=.65;
    filter.frequency.setValueAtTime(from,at);filter.frequency.exponentialRampToValueAtTime(to,at+duration);
    gain.gain.setValueAtTime(.0001,at);gain.gain.linearRampToValueAtTime(level,at+attack);
    gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    connect(context,source,[filter,gain],duration);
  }
  function play(stage){
    if(cancelled||played.has(stage))return false;played.add(stage);
    if(muted())return false;
    const context=sharedContext()||(localContext?.state==='running'?localContext:null);
    if(!context)return false;
    try{
      if(stage==='release'){
        air(context,480,1100,.095,.026,.026);
      }else{
        // Dense, short resin contact: a low body plus damped, inharmonic
        // partials. The second contact is deliberately much quieter.
        const level=stage==='settle'?.23:1;
        air(context,1750,1080,.024,.105*level,.001);
        tone(context,610,445,.061,.105*level);
        tone(context,1270,1070,.034,.031*level);
        tone(context,235,158,.075,.041*level);
      }
      return true;
    }catch{cancel();return false;}
  }
  return sound;
}
