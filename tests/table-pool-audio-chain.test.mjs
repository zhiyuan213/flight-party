import test from 'node:test';
import assert from 'node:assert/strict';
import {poolStart,poolMove} from '../dist/table/pool.js';
import {replayImpacts,impactBurstSchedule,chainLevels,mixImpactSamples} from '../dist/table/pool-audio.js';

// A real 80% break: dozens of ball-ball contacts resolve within a few
// milliseconds as the impulse runs through the rack. At the 30% stronger cue
// speed a 100% break spreads the chain across ~52 ms, so 80% keeps the
// simultaneous rack impact that this fixture measures.
function breakShot(){
  const state=poolStart(),result=poolMove(state,1,80*3600+0);
  const frames=[state.cells.slice(0,48),...result.history.map(h=>h.split(',').map(Number))];
  const exact=result.audioEvents.filter(e=>e.kind!=='pocket');
  const chain=exact.filter(e=>e.kind==='ball'&&e.time<=100);
  const reconstructed=replayImpacts(frames[0],frames[5],frames[6]).filter(e=>e.kind==='ball');
  return {exact,chain,frames,reconstructed};
}

test('a break really does resolve a long chain of contacts inside a few milliseconds',()=>{
  const {chain}=breakShot();
  assert.ok(chain.length>=20,'the rack produces dozens of ball contacts');
  assert.ok(Math.max(...chain.map(e=>e.time))-Math.min(...chain.map(e=>e.time))<20,
    'they are simultaneous, not naturally spread out');
});

test('a burst overlaps the opening contacts and leaves a short decaying tail',()=>{
  const {chain}=breakShot(),snapshot=chain.map(e=>({...e}));
  const plan=impactBurstSchedule(chain);
  assert.ok(plan.length>=8&&plan.length<=10,'a rack has a small set of distinct representative knocks');
  assert.equal(plan[0].delay,0);
  assert.ok(plan[4].delay<=.02,'the first five contacts merge into the rack impact');
  assert.ok(plan.at(-1).delay<=.024,'all contacts merge into a compact continuous cluster');
  for(let i=1;i<plan.length;i++){
    assert.ok(plan[i].delay>plan[i-1].delay,'each knock has its own moment');
    assert.ok(plan[i].strength<=plan[i-1].strength,'strongest contact leads');
    assert.ok(plan[i].gain<plan[i-1].gain,'the tail is quieter');
    assert.ok(plan[i].delay-plan[i-1].delay<=.003,
      'no separated tail hits: every attack overlaps the preceding short body');
  }
  assert.ok(plan.every(e=>e.strength>0&&e.strength<=1&&Number.isFinite(e.delay)));
  assert.ok(plan.every(e=>e.variant===1&&e.toneLock===true),'the whole chain shares one unshifted pitch variant');
  assert.deepEqual(chain,snapshot,'scheduling never mutates the source events');
});

test('single and double contacts keep their ordinary voices and immediate timing',()=>{
  assert.deepEqual(impactBurstSchedule([]),[]);
  for(const events of [
    [{kind:'ball',strength:.4,tangent:0}],
    [{kind:'ball',strength:.4},{kind:'ball',strength:.7}],
    [{kind:'ball',strength:.4},{kind:'ball',strength:.7},{kind:'ball',strength:.001},{kind:'rail',strength:.8}]
  ]){
    const plan=impactBurstSchedule(events);
    assert.equal(plan.length,events.filter(e=>e.strength>.035).length);
    for(const e of plan){
      assert.equal(e.delay,0);assert.equal(e.gain,1);
      assert.equal(e.variant,-1,'ordinary contacts do not request chain processing');
      assert.equal(e.toneLock,false,'one weak contact or a rail cannot turn a double hit into a rack');
    }
  }
  assert.equal(impactBurstSchedule([{kind:'ball',strength:.001}]).length,0,'inaudible contacts are skipped');
});

test('a mixed burst leaves cushion contacts outside the ball chain',()=>{
  const events=[{kind:'rail',strength:1,tangent:.2},...Array.from({length:15},(_,i)=>({kind:'ball',strength:.9-i*.04}))];
  const original=structuredClone(events),plan=impactBurstSchedule(events);
  const rails=plan.filter(e=>e.kind==='rail'),balls=plan.filter(e=>e.kind==='ball');
  assert.equal(rails.length,1);assert.equal(balls.length,10,'the cap counts balls, not the louder cushion');
  assert.equal(rails[0].delay,0);assert.equal(rails[0].gain,1);
  assert.equal(rails[0].variant,-1);assert.equal(rails[0].toneLock,false);
  assert.equal(rails[0].strength,1);assert.equal(rails[0].tangent,.2);
  assert.ok(balls.every(e=>e.toneLock));assert.equal(balls[0].strength,.9);
  assert.deepEqual(events,original);
});

test('frame reconstruction is re-anchored to its measured peak so the chain stays audible',()=>{
  const {reconstructed}=breakShot();
  assert.ok(reconstructed.length>=8,'one 16 ms frame holds the whole chain');
  const original=reconstructed.map(e=>({...e}));
  const peak=Math.max(...reconstructed.map(e=>e.strength));
  assert.ok(peak>0);
  const before=impactBurstSchedule(reconstructed).length;
  const leveled=chainLevels(reconstructed),after=impactBurstSchedule(leveled).length;
  assert.ok(after>before,`more of the chain is audible (${before} -> ${after})`);
  assert.ok(leveled.every(e=>e.strength<=peak&&e.strength>0),'never louder than the measured peak');
  assert.deepEqual(reconstructed,original,'chainLevels does not mutate its input');
  const spread=impactBurstSchedule(leveled);
  assert.ok(spread.length>=8&&spread.length<=10);
  assert.ok(spread.at(-1).delay<=.15);
  // Ordinary shots (fewer than three ball contacts) must be untouched.
  const quiet=[{kind:'ball',strength:.2},{kind:'rail',strength:.1}];
  assert.deepEqual(chainLevels(quiet),quiet);
});

test('the PCM mix contains shifted contacts and genuine overlapping samples, not one louder hit',()=>{
  const rate=10000,events=Array.from({length:3},()=>({kind:'ball',strength:.5}));
  const pulse=new Float32Array(10);pulse[1]=.08;pulse[2]=-.04;
  const original=pulse.slice(),snapshot=structuredClone(events),plan=impactBurstSchedule(events);
  const mixed=mixImpactSamples(pulse,rate,events);
  assert.equal(mixed.length,pulse.length+Math.ceil(plan.at(-1).delay*rate));
  for(const contact of plan){
    const start=Math.round(contact.delay*rate);
    assert.ok(mixed[start+1]>0,'each shifted collision introduces its own attack');
    assert.ok(Math.abs(mixed[start+2]/mixed[start+1]+.5)<1e-6,'the original waveform shape and pitch are preserved');
  }
  assert.equal(mixed.filter(v=>v!==0).length,6,'all three contacts are present at their own offsets');
  const body=new Float32Array(200).fill(.02);body[0]=body[199]=0;
  const overlapped=mixImpactSamples(body,rate,events),single=mixImpactSamples(body,rate,events.slice(0,1));
  assert.ok(overlapped[100]>single[100]*2.7,'three contact bodies really sum in the overlap window');
  assert.ok(overlapped.slice(single.length).some(v=>v!==0),'later contact tails extend beyond a single recording');
  assert.deepEqual(pulse,original);assert.deepEqual(events,snapshot);
  assert.equal(mixImpactSamples(pulse,rate,[]).length,0);
  assert.equal(mixImpactSamples(new Float32Array(0),rate,events).length,0);
});

test('PCM headroom is linear without clipping and contact strength remains meaningful',()=>{
  const rate=10000,sample=Float32Array.from({length:900},(_,i)=>.9*Math.abs(Math.sin(i*.63))*Math.exp(-i/600));
  sample[0]=sample[sample.length-1]=0;
  const events=Array.from({length:10},()=>({kind:'ball',strength:1}));
  const mixed=mixImpactSamples(sample,rate,events);
  const quiet=mixImpactSamples(sample.map(v=>v*.05),rate,events);
  const peak=a=>a.reduce((p,v)=>Math.max(p,Math.abs(v)),0),rms=a=>Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length);
  assert.ok(mixed.every(v=>Number.isFinite(v)&&Math.abs(v)<=.860001));
  assert.ok(peak(mixed)>.85,'the test exercises headroom limiting');
  const scale=peak(mixed)/peak(quiet);
  assert.ok(mixed.every((v,i)=>Math.abs(v-quiet[i]*scale)<2e-6),'one linear gain preserves the summed transient instead of hard-clipping it');
  assert.equal(Math.abs(mixed[0]),0);assert.equal(Math.abs(mixed.at(-1)),0);
  for(const input of [sample,sample.map(v=>v*.015)]){
    const levels=[.1,.5,1].map(strength=>rms(mixImpactSamples(input,rate,events.map(e=>({...e,strength})))));
    assert.ok(levels[1]>levels[0]*2&&levels[2]>levels[1]*1.4,'headroom control must not make soft and hard groups equally loud');
  }
});

test('fallback contacts merge into one voice and muting cancels its tail and releases the source',async()=>{
  const originalAudio=globalThis.AudioContext,sources=[];
  const parameter=()=>({value:0,setValueAtTime(v){this.value=v;},exponentialRampToValueAtTime(){}});
  globalThis.AudioContext=class{state='running';currentTime=10;sampleRate=48000;destination={};
    createBuffer(_,n){const samples=new Float32Array(n);return{length:n,getChannelData:()=>samples};}
    createBufferSource(){const source={stops:[],connect(){},disconnect(){this.disconnected=true;},
      start(t){this.started=t;},stop(t){this.stops.push(t);}};sources.push(source);return source;}
    createGain(){return{gain:parameter(),connect(){},disconnect(){}};}
    createBiquadFilter(){return{frequency:parameter(),connect(){},disconnect(){}};}
  };
  try{
    const audio=await import('../dist/table/pool-audio.js?chain-burst-test');
    audio.setPoolMuted(false);audio.unlockPoolAudio();
    const events=Array.from({length:6},(_,i)=>({kind:'ball',strength:1-i*.12}));
    const played=audio.poolImpactBurst(events);
    assert.equal(played,6);
    assert.equal(sources.length,1,'six fallback contacts share one composite source');
    for(const source of sources){
      const samples=source.buffer.getChannelData(0);
      assert.equal(source.started,10);
      assert.ok(samples.length/48000>.04&&samples.length/48000<.2,'the whole chain has a bounded tail');
      assert.equal(Math.abs(samples[0]),0);assert.equal(Math.abs(samples.at(-1)),0);
      assert.ok(samples.every(v=>Number.isFinite(v)&&Math.abs(v)<1));
      assert.ok(samples.some(v=>Math.abs(v)>.001),'fallback is audible before the recording loads');
      assert.ok(Math.abs(source.stops[0]-source.started-samples.length/48000)<1e-9);
    }
    audio.setPoolMuted(true);
    for(const source of sources){
      assert.equal(source.stops.length,2,'mute stops the remaining composite tail');
      assert.equal(source.stops[1],undefined,'cancellation is immediate');
      source.onended();assert.equal(source.disconnected,true);
    }
    assert.equal(audio.poolImpactBurst(events),0,'muting blocks new chains');
    audio.setPoolMuted(false);
    // More than the 32-voice ceiling cumulatively: completed sources must be removed.
    for(let round=0;round<40;round++){
      const offset=sources.length;assert.equal(audio.poolImpactBurst(events),6);
      for(const source of sources.slice(offset))source.onended();
    }
  }finally{globalThis.AudioContext=originalAudio;}
});

test('pre-A CC0 contacts merge into one trimmed source; singles and doubles keep three rate variants',async()=>{
  const originalAudio=globalThis.AudioContext,originalFetch=globalThis.fetch;
  const sources=[],gains=[],urls=[],filters=[];
  const rate=24000,pcm=Float32Array.from({length:2160},(_,i)=>.03*Math.sin(i*.37)*Math.exp(-i/500));
  pcm[0]=pcm[pcm.length-1]=0;
  let onset=0;while(onset<pcm.length&&Math.abs(pcm[onset])<.012)onset++;
  const trimmed=pcm.slice(onset,Math.min(pcm.length,onset+Math.ceil(rate*.11)));
  const recording={duration:.09,sampleRate:rate,getChannelData:()=>pcm};
  const parameter=()=>({value:0,steps:[],ramps:[],setValueAtTime(v,t){this.value=v;this.steps.push([v,t]);},
    exponentialRampToValueAtTime(v,t){this.ramps.push([v,t]);}});
  globalThis.AudioContext=class{
    state='running';currentTime=10;sampleRate=48000;destination={};
    decodeAudioData(){return recording;}
    createBuffer(_,n,sampleRate){const data=new Float32Array(n);return{sampleRate,length:n,getChannelData:()=>data};}
    createBufferSource(){const source={playbackRate:{...parameter(),value:1},stops:[],connect(){},disconnect(){this.disconnected=true;},
      start(t,offset,duration){this.started=t;this.offset=offset;this.duration=duration;},stop(t){this.stops.push(t);}};sources.push(source);return source;}
    createGain(){const node={gain:parameter(),connect(){},disconnect(){this.disconnected=true;}};gains.push(node);return node;}
    createBiquadFilter(){const node={type:'',frequency:parameter(),connect(){},disconnect(){}};filters.push(node);return node;}
    createDynamicsCompressor(){return{threshold:parameter(),knee:parameter(),ratio:parameter(),
      attack:parameter(),release:parameter(),connect(){}};}
  };
  globalThis.fetch=async url=>{urls.push(String(url));return{ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};};
  try{
    const audio=await import('../dist/table/pool-audio.js?chain-tone-test');
    audio.setPoolMuted(false);audio.unlockPoolAudio();await new Promise(r=>setTimeout(r,0));
    assert.equal(audio.poolRecordingStatus(),'ready','the recorded clack is loaded');
    assert.ok(new URL(urls[0]).pathname.endsWith('/assets/audio/pool/ball-clack.mp3'),'production is back on the CC0 recording');
    const events=Array.from({length:12},()=>({kind:'ball',strength:.8}));
    assert.equal(audio.poolImpactBurst(events),10);
    assert.equal(sources.length,1,'ten contacts are mixed into one PCM buffer');
    assert.equal(sources[0].playbackRate.value,1);
    assert.equal(sources[0].buffer.sampleRate,rate,'recording sample rate is preserved even when the device uses 48 kHz');
    assert.deepEqual(sources[0].buffer.getChannelData(0),audio.mixImpactSamples(trimmed,rate,events),'playback and preview share the same trimmed mix');
    assert.equal(sources[0].started,10);
    assert.ok(Math.abs(sources[0].stops[0]-10-sources[0].buffer.length/rate)<1e-9);
    sources[0].onended();assert.equal(sources[0].disconnected,true);
    const beforeMixed=sources.length;
    assert.equal(audio.poolImpactBurst([...events,{kind:'rail',strength:.5}]),11);
    assert.equal(sources.length-beforeMixed,2,'a cushion hit remains a separate voice beside the merged balls');
    for(const source of sources.slice(beforeMixed))source.onended();
    audio.poolImpactBurst([{kind:'ball',strength:.8}]);
    assert.equal(sources.at(-1).buffer,recording,'a single collision uses the exact selected recording');
    assert.ok([.97,1,1.03].includes(sources.at(-1).playbackRate.value),'a single hit keeps one of the three CC0 rate variants');
    assert.equal(filters.at(-1).frequency.value,5300,'a single hit is low-passed by its strength');
    assert.ok(Math.abs(gains.at(-1).gain.steps[1][1]-10-.035)<1e-9,'the 35 ms plateau precedes the fade');
    sources.at(-1).onended();assert.equal(gains.at(-1).disconnected,true);
    const beforeDouble=sources.length;
    audio.poolImpactBurst([{kind:'ball',strength:.8},{kind:'ball',strength:.8}]);
    assert.equal(sources.length-beforeDouble,2);
    assert.ok(sources.slice(-2).every(s=>s.started===10&&s.buffer===recording&&[.97,1,1.03].includes(s.playbackRate.value)),'double contacts remain immediate recording hits with CC0 variants');
    audio.setPoolMuted(true);
    assert.ok(sources.slice(-2).every(s=>s.stops.length===2&&s.stops[1]===undefined),'recorded sources are cancelled on mute');
    for(const source of sources.slice(-2))source.onended();
  }finally{globalThis.AudioContext=originalAudio;globalThis.fetch=originalFetch;}
});
