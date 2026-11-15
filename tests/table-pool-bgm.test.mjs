import test from 'node:test';
import assert from 'node:assert/strict';
import {
  POOL_BGM_TRACKS,POOL_BGM_SCORE,DEFAULT_BGM_TRACK,poolBgmTrack,poolBgmTrackIds,
  buildPoolBgm,buildPoolBgmAsync,startPoolBgm,unlockPoolBgm,
  setPoolBgmEnabled,setPoolBgmVolume,poolBgmVolume,poolBgmPosition,poolBgmState,
  getPoolBgmTrack,setPoolBgmTrack,previewPoolBgmTrack,stopPoolBgm,
} from '../dist/table/pool-bgm.js';

const rate=22050;
const ids=poolBgmTrackIds();
const rms=a=>{let s=0;for(let i=0;i<a.length;i++)s+=a[i]*a[i];return Math.sqrt(s/a.length);};
const brightness=a=>{
  let s=0;for(let i=1;i<a.length;i++){const d=a[i]-a[i-1];s+=d*d;}
  return Math.sqrt(s/a.length)/rms(a);
};
function goertzel(a,f,sr){
  const coef=2*Math.cos(2*Math.PI*f/sr);let s1=0,s2=0;
  for(let i=0;i<a.length;i++){const s=a[i]+coef*s1-s2;s2=s1;s1=s;}
  return Math.abs(s1*s1+s2*s2-coef*s1*s2)/a.length;
}
// The loops are deterministic; building them once keeps the suite fast.
const loops=new Map(ids.map(id=>[id,buildPoolBgm(rate,id)]));

test('the library offers five distinct relaxing tracks and a sensible default',()=>{
  assert.equal(ids.length,5);
  assert.equal(new Set(ids).size,5,'track ids are unique');
  assert.ok(ids.includes('lounge'),'the original loop is still available for comparison');
  assert.ok(ids.includes(DEFAULT_BGM_TRACK));
  assert.equal(DEFAULT_BGM_TRACK,'tape','the disliked lounge loop is no longer the default');
  assert.equal(getPoolBgmTrack(),DEFAULT_BGM_TRACK,'no stored preference falls back to the default');
  assert.equal(POOL_BGM_SCORE.track,DEFAULT_BGM_TRACK);
  assert.deepEqual(POOL_BGM_SCORE.tracks,ids);
  assert.equal(POOL_BGM_SCORE.baseGain,.16);
  assert.equal(POOL_BGM_SCORE.loopSeconds,loops.get(DEFAULT_BGM_TRACK).duration);
  const tempos=new Set(POOL_BGM_TRACKS.map(t=>t.bpm));
  assert.ok(tempos.size>=4,'the choices really differ in tempo');
  assert.ok(POOL_BGM_TRACKS.every(t=>t.name&&t.en&&t.description&&t.tags.length&&t.mix.cutoff));
  assert.equal(POOL_BGM_TRACKS.find(t=>t.id==='felt').drums,null,'one choice is completely drumless');
  assert.ok(POOL_BGM_TRACKS.find(t=>t.id==='tape').mix.cutoff<POOL_BGM_TRACKS.find(t=>t.id==='bossa').mix.cutoff,
    'the lo-fi bed is darker than the bossa bed');
  assert.equal(poolBgmTrack('not-a-track').id,DEFAULT_BGM_TRACK,'unknown ids fall back safely');
});

test('every loop is deterministic, finite, stereo and loudness-matched',()=>{
  for(const id of ids){
    const a=loops.get(id),b=buildPoolBgm(rate,id),meta=poolBgmTrack(id);
    assert.equal(a.track,id);
    assert.equal(a.sampleRate,rate);
    assert.equal(a.left.length,Math.round(a.duration*rate));
    assert.equal(a.right.length,a.left.length);
    assert.equal(a.bpm,meta.bpm);
    assert.equal(a.bars,meta.bars);
    assert.ok(Math.abs(a.duration-60/meta.bpm*4*meta.bars)<1e-9,`${id}: musical length`);
    assert.ok(a.duration>18&&a.duration<34,`${id}: a short, repeatable loop`);
    assert.ok(a.peak<=.82&&a.peak>.15,`${id}: headroom without clipping`);
    assert.ok(a.left.every(Number.isFinite)&&a.right.every(Number.isFinite),`${id}: finite PCM`);
    assert.ok(rms(a.left)>.02,`${id}: audible, not silence`);
    assert.ok(Math.abs(rms(a.left)-.052)<.006,`${id}: loudness matched (${rms(a.left)})`);
    assert.ok(rms(b.left)>.02);
    assert.ok(a.left.every((v,i)=>v===b.left[i]),`${id}: deterministic left channel`);
    assert.ok(a.right.every((v,i)=>v===b.right[i]),`${id}: deterministic right channel`);
  }
});

test('every loop joins itself without a click and keeps its energy at the seam',()=>{
  for(const id of ids){
    const a=loops.get(id),n=a.left.length;
    const jump=Math.max(Math.abs(a.left[0]-a.left[n-1]),Math.abs(a.right[0]-a.right[n-1]));
    assert.ok(jump<.005,`${id}: loop click would be audible (${jump})`);
    const edge=Math.round(.05*rate),whole=rms(a.left);
    const head=rms(a.left.slice(0,edge)),tail=rms(a.left.slice(n-edge));
    // The last bar's sustained voices ring past the loop point and are folded
    // back, so neither side is silent. A downbeat is allowed to be louder
    // than the preceding tail - that is a bar line, not a gap.
    assert.ok(head>whole*.15,`${id}: the opening carries audio (${head/whole})`);
    assert.ok(tail>whole*.2,`${id}: no fade-to-silence before the loop (${tail/whole})`);
    assert.ok(Math.max(head,tail)/Math.min(head,tail)<12,
      `${id}: no sudden level jump at the seam (${head} vs ${tail})`);
  }
});

test('each track carries music in all eight bars, with audible bass and midrange',()=>{
  for(const id of ids){
    const a=loops.get(id),size=Math.floor(a.left.length/8),whole=rms(a.left),bars=[];
    for(let i=0;i<8;i++)bars.push(rms(a.left.slice(i*size,(i+1)*size)));
    assert.ok(bars.every(v=>v>whole*.45),`${id}: no silent bar inside the loop`);
    assert.ok(Math.max(...bars)/Math.min(...bars)>1.03,`${id}: some shape across the bars`);
    const low=goertzel(a.left,73.4,rate),mid=goertzel(a.left,440,rate),upper=goertzel(a.left,880,rate);
    assert.ok(low>1e-6,`${id}: a bass line is present`);
    assert.ok(mid>1e-7&&upper>1e-9,`${id}: the midrange is present`);
    assert.ok(mid/low>.0001,`${id}: it is music, not a single low hum`);
  }
});

test('the five tracks really sound different, not just relabelled',()=>{
  const signatures=new Map();
  for(const id of ids){
    const a=loops.get(id);
    signatures.set(id,{brightness:brightness(a.left),head:a.left.slice(0,2048)});
    const drums=poolBgmTrack(id).drums;
    assert.equal(!!drums,id!=='felt');
  }
  for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
    const a=loops.get(ids[i]).left,b=loops.get(ids[j]).left;
    assert.notEqual(a.length,b.length,'different tempos mean different loop lengths');
    assert.ok(a[4096]!==b[4096]||a[8192]!==b[8192],`${ids[i]} and ${ids[j]} share a waveform`);
  }
  const values=ids.map(id=>signatures.get(id).brightness);
  assert.ok(Math.max(...values)/Math.min(...values)>1.3,'timbre ranges from drumless ambient to bright brushed lounge');
  assert.ok(signatures.get('felt').brightness<signatures.get('lounge').brightness,
    'the drumless bed is measurably softer/brighter-free than the original');
});

test('resampling is clean and the async bar renderer is byte-identical for every track',async()=>{
  const hi=buildPoolBgm(44100,'tape');
  assert.equal(hi.duration,POOL_BGM_SCORE.loopSeconds,'musical length does not depend on render rate');
  assert.equal(hi.left.length,Math.round(hi.duration*44100));
  assert.ok(hi.left.every(Number.isFinite)&&rms(hi.left)>.02);
  assert.ok(Math.abs(hi.left[0]-hi.left.at(-1))<.005);
  for(const id of ids){
    const sync=loops.get(id),asyncData=await buildPoolBgmAsync(rate,id);
    assert.equal(asyncData.left.length,sync.left.length,`${id}: length`);
    assert.ok(sync.left.every((v,i)=>v===asyncData.left[i]),`${id}: per-bar yielding keeps the PRNG in step`);
    assert.ok(sync.right.every((v,i)=>v===asyncData.right[i]),`${id}: right channel too`);
  }
});

test('the player is inert outside a browser and unknown track ids are rejected',()=>{
  assert.equal(startPoolBgm(),false);
  assert.equal(poolBgmState().started,false);
  assert.equal(poolBgmState().contextState,'none');
  assert.equal(getPoolBgmTrack(),DEFAULT_BGM_TRACK);
});

test('one looping source plays the saved track, fades, and crossfades on a new choice',async()=>{
  const saved={};
  for(const key of ['window','document','localStorage','AudioContext','requestIdleCallback']){
    saved[key]=Object.getOwnPropertyDescriptor(globalThis,key);
  }
  const listeners={},sources=[],contexts=[],store=new Map();
  const param=()=>({value:0,cancelScheduledValues(){},setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;}});
  const node=()=>({connect(){},disconnect(){}});
  class MockContext{
    constructor(){this.state='running';this.currentTime=0;this.sampleRate=48000;this.destination={};contexts.push(this);}
    resume(){this.state='running';return Promise.resolve();}
    suspend(){this.state='suspended';return Promise.resolve();}
    createBuffer(channels,length,sampleRate){
      const data=Array.from({length:channels},()=>new Float32Array(length));
      return {numberOfChannels:channels,length,sampleRate,
        copyToChannel(array,channel){data[channel].set(array);},getChannelData:channel=>data[channel]};
    }
    createBufferSource(){
      const s={...node(),loop:false,buffer:null,stopped:false,
        start(){sources.push(this);},stop(){this.stopped=true;}};
      return s;
    }
    createGain(){return {...node(),gain:param()};}
    createBiquadFilter(){return {...node(),type:'',frequency:param(),Q:param()};}
    createConvolver(){return {...node(),buffer:null};}
  }
  const documentStub={hidden:false,readyState:'complete',
    addEventListener(name,fn){(listeners[name]??=[]).push(fn);},
    body:{append(){}},
    createElement(){return {style:{},setAttribute(){},addEventListener(){}};}};
  const windowStub={location:{search:''},addEventListener(name,fn){(listeners['w:'+name]??=[]).push(fn);},
    open(){},parent:null};
  windowStub.parent=windowStub;
  globalThis.window=windowStub;
  globalThis.document=documentStub;
  globalThis.localStorage={getItem:key=>store.get(key)??null,setItem(key,value){store.set(key,value);}};
  globalThis.AudioContext=MockContext;
  globalThis.requestIdleCallback=undefined;
  const settle=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  try{
    assert.equal(startPoolBgm({button:false}),true);
    assert.equal(startPoolBgm({button:false}),true,'starting twice never doubles the loop');
    unlockPoolBgm();
    await settle(700);
    const state=poolBgmState();
    assert.equal(state.playing,true,'the loop is running once the PCM is ready');
    assert.equal(state.track,DEFAULT_BGM_TRACK,'the saved/default track is the one that plays');
    assert.equal(sources.length,1);
    assert.equal(sources[0].loop,true,'the bed loops instead of stopping');
    assert.equal(sources[0].buffer.sampleRate,rate);
    assert.equal(contexts.length,1,'one AudioContext per document');
    assert.equal(poolBgmState().contextState,'running');
    setPoolBgmVolume(.5);
    assert.equal(poolBgmVolume(),.5);
    assert.ok(Math.abs(poolBgmVolume()*POOL_BGM_SCORE.baseGain-.08)<1e-9,'volume trims only the music bus');
    contexts[0].currentTime=5;
    assert.ok(Math.abs(poolBgmPosition()-5)<1e-9,'position stays inside the loop');

    // Previewing changes this document only; the game default is untouched.
    assert.equal(previewPoolBgmTrack('warm'),'warm');
    assert.equal(store.has('joyflock.pool.bgm.track'),false,'a preview is never persisted');
    await settle(950);
    assert.equal(poolBgmState().track,'warm');
    assert.equal(sources.length,2,'switching starts exactly one fresh source');
    assert.equal(sources[0].stopped,true,'the old bed is stopped after its fade-out');
    assert.equal(sources[1].loop,true);
    assert.equal(sources[1].buffer.length,Math.round(loopSeconds('warm')*rate));
    assert.equal(contexts.length,1,'no second AudioContext');

    // Persisting a choice writes the key; other game tabs follow via storage.
    assert.equal(setPoolBgmTrack('felt'),'felt');
    assert.equal(store.get('joyflock.pool.bgm.track'),'felt');
    assert.equal(getPoolBgmTrack(),'felt');
    await settle(950);
    assert.equal(sources.length,3);
    assert.equal(poolBgmState().track,'felt');
    store.set('joyflock.pool.bgm.track','bossa');
    for(const fn of listeners['w:storage']||[])fn({key:'joyflock.pool.bgm.track'});
    await settle(950);
    assert.equal(poolBgmState().track,'bossa','a storage event switches the live bed');
    assert.equal(setPoolBgmTrack('nope'),'bossa','an unknown id is refused');

    setPoolBgmEnabled(false);
    assert.equal(poolBgmState().playing,false,'the music switch fades the loop out');
    setPoolBgmEnabled(true);
    assert.equal(poolBgmState().playing,true);
    // The in-game "sound" button persists its own flag; delegating on document
    // keeps the music in step without touching pool-view.js.
    globalThis.localStorage={getItem:key=>key==='joyflock.pool.muted'?'1':store.get(key)??null,
      setItem(key,value){store.set(key,value);}};
    const clicks=listeners.click||[];
    assert.ok(clicks.length>0,'a delegated listener watches the sound button');
    clicks[0]({target:{closest:()=>({})}});
    await settle(10);
    assert.equal(poolBgmState().sfxMuted,true,'existing sound mute also mutes the music');
    assert.equal(poolBgmState().playing,false);
    stopPoolBgm();
    assert.equal(poolBgmState().started,false);
  }finally{
    for(const key of Object.keys(saved)){
      if(saved[key])Object.defineProperty(globalThis,key,saved[key]);
      else delete globalThis[key];
    }
  }
});
function loopSeconds(id){const t=poolBgmTrack(id);return 60/t.bpm*4*t.bars;}
