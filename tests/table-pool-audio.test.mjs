import test from 'node:test';
import assert from 'node:assert/strict';
import {poolImpact,unlockPoolAudio,setPoolMuted} from '../dist/table/pool-audio.js';

test('victory flourish fades out without clipping and respects unlock, mute and source cleanup',async()=>{
 const original=globalThis.AudioContext,originalDocument=globalThis.document,sources=[];
 const audio=await import('../dist/table/pool-audio.js?victory-test');
 const samples=audio.victorySamples();
 assert.equal(samples.length,61440);assert.equal(samples[0],0);assert.equal(samples.at(-1),0);
 assert.ok(samples.every(v=>Number.isFinite(v)&&Math.abs(v)<.3));
 const rms=a=>Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length);
 assert.ok(rms(samples.slice(-480))<rms(samples.slice(24000,30000))*.01);
 globalThis.AudioContext=class{state='running';currentTime=7;sampleRate=48000;destination={};createBuffer(_,n){return{getChannelData:()=>new Float32Array(n)}}createBufferSource(){const s={connect(){},disconnect(){this.disconnected=true},start(t){this.started=t},stop(t){this.ends??=[];this.ends.push(t)}};sources.push(s);return s;}};
 try{
  audio.setPoolMuted(false);assert.equal(audio.poolVictorySound(),false);audio.unlockPoolAudio();
  assert.equal(audio.poolVictorySound(),true);assert.equal(sources.length,1);assert.equal(sources[0].started,7);assert.equal(sources[0].ends[0],8.28);
  audio.setPoolMuted(true);assert.equal(sources[0].ends.length,2);assert.equal(audio.poolVictorySound(),false);
  sources[0].onended();assert.equal(sources[0].disconnected,true);
  audio.setPoolMuted(false);globalThis.document={hidden:true};assert.equal(audio.poolVictorySound(),false);
 }finally{audio.setPoolMuted(false);globalThis.AudioContext=original;globalThis.document=originalDocument;}
});

test('pool audio requires a gesture unlock, respects mute and bounds every source lifetime',()=>{
  const original=globalThis.AudioContext,ends=[];
  const parameter={setValueAtTime(){},exponentialRampToValueAtTime(){},value:0};
  const node=()=>({connect(){},start(){},stop(time){ends.push(time);},gain:parameter,frequency:parameter});
  globalThis.AudioContext=class {state='running';currentTime=10;sampleRate=1000;destination={};createBuffer(_,n){return{getChannelData:()=>new Float32Array(n)};}createBufferSource(){return node();}createBiquadFilter(){return node();}createGain(){return node();}createOscillator(){return node();}};
  try{setPoolMuted(false);assert.equal(poolImpact('ball',1),false);unlockPoolAudio();assert.equal(poolImpact('ball',1),true);assert.equal(ends.length,1);assert.ok(ends.every(t=>t>10&&t<10.2));setPoolMuted(true);assert.equal(poolImpact('cue'),false);assert.equal(ends.length,2);}finally{setPoolMuted(false);globalThis.AudioContext=original;}
});

test('resin impacts have bounded 30–60ms envelopes, silence at end, and no clipping',async()=>{
 const {impactSamples}=await import('../dist/table/pool-audio.js');
 for(const level of [.1,.5,1]){const a=impactSamples('ball',level,0,48000);assert.ok(a.length>=1440&&a.length<=2880);assert.equal(a[0],0);assert.equal(a.at(-1),0);assert.ok(a.every(v=>Number.isFinite(v)&&Math.abs(v)<1));const rms=x=>Math.sqrt(x.reduce((s,v)=>s+v*v,0)/x.length);assert.ok(rms(a.slice(-240))<rms(a.slice(100,700))*.1);}
});

test('cushions give a short muffled body impact with little treble, not sustained cloth hiss',async()=>{
 const {impactSamples}=await import('../dist/table/pool-audio.js');
 const seeded=()=>{let s=8127;return()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);};
 const rms=a=>Math.sqrt(a.reduce((sum,v)=>sum+v*v,0)/a.length);
 const bandEnergy=(a,rate,from,to)=>{let energy=0;for(let f=from;f<=to;f+=50){let re=0,im=0;for(let i=0;i<a.length;i++){const phase=2*Math.PI*f*i/rate;re+=a[i]*Math.cos(phase);im+=a[i]*Math.sin(phase);}energy+=re*re+im*im;}return energy;};
 const levels=[.15,.5,1],amplitudes=[];
 for(const level of levels){
  const rate=48000,a=impactSamples('rail',level,0,rate,seeded());
  assert.ok(a.length/rate>=.058&&a.length/rate<=.071);
  assert.equal(a[0],0);assert.equal(a.at(-1),0);
  assert.ok(a.every(v=>Number.isFinite(v)&&Math.abs(v)<1));
  const body=rms(a.slice(0,Math.round(rate*.025))),tail=rms(a.slice(Math.round(rate*.04)));
  assert.ok(tail<body*.025,`rail tail ${tail/body} is too sustained`);
  const low=bandEnergy(a,rate,50,750),high=bandEnergy(a,rate,1500,8000);
  assert.ok(high<low*.01,`rail treble/body energy ${high/low} is too bright`);
  amplitudes.push(body);
  // A fast glancing rebound still has no continuous scraping/hissing layer.
  assert.deepEqual(impactSamples('rail',level,1,rate,seeded()),a);
 }
 assert.ok(amplitudes[1]>amplitudes[0]*1.5&&amplitudes[2]>amplitudes[1]*1.4);
});

test('enclosed wooden return rolling has a short hollow tail, separate from cloth rolling',async()=>{
 const {impactSamples}=await import('../dist/table/pool-audio.js');
 const seeded=(s=831)=>()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);
 const rate=48000,rms=a=>Math.sqrt(a.reduce((sum,v)=>sum+v*v,0)/a.length);
 const spectrum=(a,from,to)=>{let energy=0;for(let f=from;f<=to;f+=50){let re=0,im=0;for(let i=0;i<a.length;i++){const p=2*Math.PI*f*i/rate;re+=a[i]*Math.cos(p);im+=a[i]*Math.sin(p);}energy+=re*re+im*im;}return energy;};
 const low=impactSamples('wood-roll',.15,0,rate,seeded()),mid=impactSamples('wood-roll',.5,0,rate,seeded()),high=impactSamples('wood-roll',1,0,rate,seeded());
 assert.ok(impactSamples('wood-roll',0,0,rate,seeded()).every(v=>v===0));
 for(const a of [low,mid,high]){
  assert.equal(a.length,rate*.22);assert.equal(a[0],0);assert.equal(a.at(-1),0);
  assert.ok(a.every(v=>Number.isFinite(v)&&Math.abs(v)<.16));
  assert.ok(rms(a.slice(0,240))<rms(a.slice(960,2400))*.35,'roll onset must fade in');
  assert.ok(rms(a.slice(-240))<rms(a.slice(960,2400))*.35,'roll end must fade out');
  assert.ok(spectrum(a,1500,6000)<spectrum(a,50,650)*.001,'wood roll must not become a treble hiss');
 }
 assert.ok(rms(mid)>rms(low)*1.5&&rms(high)>rms(mid)*1.3,'faster rolling must have more body');
 assert.ok(rms(mid.slice(rate*.16,rate*.2))>rms(mid)*.025,'wood cavity should remain briefly audible after the dry rolling grain');
 assert.ok(rms(mid.slice(rate*.21))<rms(mid)*.001,'reflection tail must stop instead of feeding back');
 const visible=impactSamples('wood-roll',.152,0,rate,seeded()),hidden=impactSamples('wood-roll',.152*.45,0,rate,seeded());
 assert.ok(rms(visible)>.004&&rms(hidden)>.002,'actual return-speed strengths must have audible low body');
 assert.ok(rms(visible)>rms(hidden)*1.35,'wood under the table must remain quieter than the exposed slot');
 assert.notDeepEqual(mid,impactSamples('wood-roll',.5,0,rate,seeded(962)),'successive grains must vary');
 const cloth=impactSamples('roll',.5,0,rate,seeded());
 assert.ok(spectrum(mid,1500,6000)/spectrum(mid,50,650)<spectrum(cloth,1500,6000)/spectrum(cloth,50,650)*.2);
 const mix=new Float32Array(rate*.7);
 for(let j=0;j<6;j++){const a=impactSamples('wood-roll',.5,0,rate,seeded(831+j));for(let i=0;i<a.length;i++)mix[j*4320+i]+=a[i];}
 assert.ok(Math.max(...mix.map(Math.abs))<.22,'90 ms overlapping grains remain quiet');
 for(let t=.09;t<.5;t+=.09)assert.ok(rms(mix.slice(Math.round((t-.01)*rate),Math.round((t+.01)*rate)))>.0005,'overlap must not introduce gaps');
});

test('ball, cushion and pocket impacts distinguish light, medium and hard contact and vary naturally',async()=>{
 const {impactSamples}=await import('../dist/table/pool-audio.js');
 const seeded=(s=831)=>()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);
 const rms=a=>Math.sqrt(a.reduce((sum,v)=>sum+v*v,0)/a.length);
 for(const kind of ['ball','rail','pocket']){
  const samples=[.1,.5,1].map(level=>impactSamples(kind,level,0,48000,seeded()));
  assert.ok(rms(samples[1])>rms(samples[0])*1.7,`${kind}: medium must be stronger than light`);
  assert.ok(rms(samples[2])>rms(samples[1])*1.4,`${kind}: hard must be stronger than medium`);
  assert.notDeepEqual(samples[1],impactSamples(kind,.5,0,48000,seeded(954)),`${kind}: repeat timbre should vary`);
 }
});

test('recorded ball impacts preserve separate loudness levels and avoid repeating the same pitch variant',async()=>{
 const originalAudio=globalThis.AudioContext,originalFetch=globalThis.fetch,levels=[],rates=[];
 const parameter=()=>({value:0,setValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(){}});
 globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});
 globalThis.AudioContext=class{
  state='running';currentTime=10;sampleRate=48000;destination={};
  async decodeAudioData(){return{duration:.2,sampleRate:48000,getChannelData:()=>new Float32Array(9600).fill(.1)};}
  createBufferSource(){return{playbackRate:parameter(),connect(){},disconnect(){},start(){rates.push(this.playbackRate.value);},stop(){this.onended?.();}};}
  createGain(){const gain=parameter();gain.setValueAtTime=function(v){if(v>.0001)levels.push(v);this.value=v;};return{gain,connect(){},disconnect(){}};}
  createBiquadFilter(){return{frequency:parameter(),connect(){},disconnect(){}};}
  createDynamicsCompressor(){return{threshold:parameter(),knee:parameter(),ratio:parameter(),attack:parameter(),release:parameter(),connect(){}};}
 };
 try{
  const audio=await import('../dist/table/pool-audio.js?recording-strength-test');audio.setPoolMuted(false);audio.unlockPoolAudio();
  for(let i=0;i<8&&audio.poolRecordingStatus()!=='ready';i++)await Promise.resolve();
  assert.equal(audio.poolRecordingStatus(),'ready');
  for(const strength of [.1,.5,1])assert.equal(audio.poolImpact('ball',strength),true);
  assert.ok(levels[2]>levels[0]*1.8&&levels[4]>levels[2]*1.35);
  assert.notEqual(rates[0],rates[1]);assert.notEqual(rates[1],rates[2]);
 }finally{globalThis.AudioContext=originalAudio;globalThis.fetch=originalFetch;}
});

test('replayed pocket sound uses incoming speed instead of a fixed volume',async()=>{
 const {replayImpacts}=await import('../dist/table/pool-audio.js');
 const amplitudes=[];
 for(const distance of [40,200,400,800]){
  const a=Array(48).fill(0),b=a.slice(),c=a.slice();a[2]=b[2]=1;a[0]=5000;b[0]=5000+distance;a[1]=b[1]=2500;
  const pocket=replayImpacts(a,b,c).find(e=>e.kind==='pocket');assert.ok(pocket);amplitudes.push(pocket.strength);
 }
 assert.deepEqual(amplitudes,[.1,.5,1,1]);
});
test('normal approach triggers impact; pure tangential motion does not',async()=>{
 const {replayImpacts}=await import('../dist/table/pool-audio.js');
 const f=()=>Array(48).fill(0),a=f(),b=f(),c=f();for(const x of [a,b,c]){x[2]=x[5]=1;x[3]=5000;x[4]=2500;x[1]=2500;}
 a[0]=4500;b[0]=4680;c[0]=4680;c[3]=5180;
 assert.ok(replayImpacts(a,b,c).some(e=>e.kind==='ball'&&e.strength>0));a[0]=b[0];a[1]=2400;
 assert.ok(!replayImpacts(a,b,c).some(e=>e.kind==='ball'));
});

test('local collision audio is emitted by impulse resolution, not resting contact',async()=>{
 const {poolMove,poolStart}=await import('../dist/table/pool.js');const s=poolStart();const a=poolMove(s,1,360000);assert.ok(a.audioEvents.length>8);assert.ok(a.audioEvents.every(e=>e.strength>0&&e.strength<=1&&e.time>=0));
 const quiet=poolStart();for(let i=1;i<16;i++)quiet.cells[i*3+2]=0;assert.equal(poolMove(quiet,1,3600).audioEvents.filter(e=>e.kind==='ball').length,0);
});
