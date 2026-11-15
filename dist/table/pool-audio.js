// Dry impacts; wooden collection and return voices carry only a trace of cavity reflection.
// Ball-ball voice is back on the 2026-11-11 source: the CC0 ball-clack.mp3
// played through three rate variants with a strength-dependent low-pass. The
// whole 2026-11-12 "A / solid / dense" experiment stays on disk as reference
// material but is no longer loaded by the game.
import {cushionContact} from './pool-geometry.js';
let context, muted=false,recorded,loading,master,lastVariant=-1,audioPrimed=false;
const voices=new Set();
// Snooker balls are smaller and lighter than pool balls, so the cushion voice
// is chosen at playback time. 'auto' follows the table page's body class;
// createSnooker() pins it explicitly. Ball-ball impacts are never voiced by
// game: they stay on the CC0 recording the user asked to restore on 11-13.
let impactVoice='auto';
export function setImpactVoice(voice){impactVoice=voice==='snooker'?'snooker':voice==='pool'?'pool':'auto';}
export const impactVoiceName=()=>impactVoice;
const snookerVoice=()=>impactVoice==='snooker'||(impactVoice==='auto'&&!!globalThis.document?.body?.classList?.contains('snooker-game'));
// Rack chains keep the 2026-11-10 tone-lock fix: three variants cycling inside
// one volley were heard as an ascending scale, so a chain stays on one rate
// and one brightness while ordinary single hits keep their variants.
const BURST_TONE_CUTOFF=4200;
// Shorter envelope used only by the synthetic fallback while the recording
// is unavailable, and by the merged rack sample.
const BURST_CONTACT_DURATION=.038;
const RECORDED_TAIL=.11;
try{muted=localStorage.getItem('joyflock.pool.muted')==='1';}catch{}
export const poolMuted=()=>muted;
export function setPoolMuted(value){muted=value;if(value)for(const v of voices){try{v.stop();}catch{}}try{localStorage.setItem('joyflock.pool.muted',value?'1':'0');}catch{}}
export function unlockPoolAudio(){try{
 const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;
 context||=new Audio();loadRecording();
 if(context.state==='suspended')context.resume().catch(()=>{});
 // Open the device output during the user's gesture, before the first short
 // countdown beep. A zero-gain voice warms the path without an extra sound.
 if(!audioPrimed&&context.createOscillator&&context.createGain){
  const tone=context.createOscillator(),silent=context.createGain();silent.gain.value=0;
  tone.connect(silent);silent.connect(context.destination);
  tone.onended=()=>{tone.disconnect();silent.disconnect();};
  tone.start(context.currentTime);tone.stop(context.currentTime+.03);audioPrimed=true;
 }
}catch{}}
async function loadRecording(){
 if(recorded||loading||!context?.decodeAudioData)return;
 loading=true;try{const res=await fetch(new URL('../assets/audio/pool/ball-clack.mp3?v=20261112-hitbefore1',import.meta.url));if(!res.ok)throw Error('audio');recorded=await context.decodeAudioData(await res.arrayBuffer());}catch{loading=false;}
}
const ballLevel=strength=>.1+.9*Math.pow(Math.max(0,Math.min(1,strength)),.75);
function ballOutput(){
 if(!master){master=context.createDynamicsCompressor();master.threshold.value=-10;master.knee.value=6;master.ratio.value=12;master.attack.value=.002;master.release.value=.055;master.connect(context.destination);}
 return master;
}
// The CC0 mp3 opens with silence and has a longer tail than the 90 ms A WAVs.
// Trim to the first audible sample and cap at 110 ms, exactly as the 11-11
// build did, so one hit stays a short dry clack and the merged rack does not
// inherit a silent lead-in.
function recordedSlice(){
 if(!recorded)return null;
 const data=recorded.getChannelData(0);let onset=0;
 while(onset<data.length&&Math.abs(data[onset])<.012)onset++;
 const end=Math.min(data.length,onset+Math.ceil(recorded.sampleRate*RECORDED_TAIL));
 return {data:data.slice(onset,end),onset:onset/recorded.sampleRate,duration:(end-onset)/recorded.sampleRate};
}
function recordedImpact(strength,delay=0,playbackGain=1,variant=-1,toneLock=false){
 const level=Math.max(0,Math.min(1,strength));if(!recorded)return false;
 const src=context.createBufferSource(),gain=context.createGain(),filter=context.createBiquadFilter();
 // Ordinary hits pick one of three rates without repeating the previous one;
 // an explicit variant or a rack chain locks to the original rate.
 let pick=variant;
 if(pick<0||pick>2){pick=Math.floor(Math.random()*3);if(pick===lastVariant)pick=(pick+1)%3;}
 lastVariant=pick;
 const rate=toneLock?1:[.97,1,1.03][pick];
 src.buffer=recorded;src.playbackRate.value=rate;
 filter.type='lowpass';filter.frequency.value=toneLock?BURST_TONE_CUTOFF:2500+3500*level;
 const wobble=toneLock?1:(.94+Math.random()*.12);
 gain.gain.value=(.08+.55*Math.pow(level,.75))*wobble*playbackGain/Math.sqrt(1+voices.size*.3);
 src.connect(filter);filter.connect(gain);gain.connect(ballOutput());
 const slice=recordedSlice(),offset=Math.max(0,slice.onset-.001),duration=slice.duration;
 const now=context.currentTime+delay;
 gain.gain.setValueAtTime(gain.gain.value,now);gain.gain.setValueAtTime(gain.gain.value,now+.035);
 gain.gain.exponentialRampToValueAtTime(.0001,now+duration/rate);
 voices.add(src);src.onended=()=>{voices.delete(src);src.disconnect();filter.disconnect();gain.disconnect();};
 src.start(now,offset,duration);src.stop(now+duration/rate+.001);return true;
}const clamp=v=>Math.max(0,Math.min(1,v));
// Cloth over rubber absorbs the impact: a short low body pulse, not a noise bed.
// The tiny contact burst ends within 6 ms; no rubbing layer follows the rebound.
function cushionSamples(strength,sampleRate,random){
  const level=clamp(strength),pitch=.96+random()*.08,variation=.92+random()*.16;
  const duration=.058+.012*level,data=new Float32Array(Math.ceil(sampleRate*duration));
  const cutoff=500+250*level,alpha=1-Math.exp(-2*Math.PI*cutoff/sampleRate);
  const gain=(.1+.55*Math.pow(level,.8))*variation,frequency=(135+30*level)*pitch;
  let contact=0,lp1=0,lp2=0;
  for(let i=0;i<data.length;i++){
    const t=i/sampleRate,attack=Math.min(1,t/.0015),end=Math.min(1,(data.length-1-i)/(sampleRate*.008));
    contact+=alpha*((random()*2-1)-contact);
    const body=Math.sin(2*Math.PI*frequency*t)*Math.exp(-t/(.007+.001*level));
    const compression=.2*Math.sin(2*Math.PI*frequency*1.85*t)*Math.exp(-t/.0035);
    const touch=.08*contact*Math.pow(Math.max(0,1-t/.006),2);
    const value=(body+compression+touch)*attack*gain;
    lp1+=alpha*(value-lp1);lp2+=alpha*(lp1-lp2);data[i]=lp2*end;
  }
  data[data.length-1]=0;return data;
}
// Snooker: a 52.5 mm / ~142 g ball on a tighter, harder cushion. The pool rail
// voice is a 135-165 Hz body over 58-70 ms, which reads as a much larger ball.
// Here the contact is roughly half as long, about an octave higher, decays in
// ~3 ms and sits at ~55% of the pool rail's level: a light dry "tick" instead
// of a rounded low "thump". Only kind==='rail' uses this; ball, cue, pocket,
// roll and all wooden return voices are untouched.
export function snookerCushionSamples(strength,sampleRate,random=Math.random){
  const level=clamp(strength),pitch=.97+random()*.06,variation=.92+random()*.16;
  const duration=.026+.008*level,data=new Float32Array(Math.ceil(sampleRate*duration));
  const cutoff=1150+450*level,alpha=1-Math.exp(-2*Math.PI*cutoff/sampleRate);
  const gain=(.055+.30*Math.pow(level,.85))*variation,frequency=(255+55*level)*pitch;
  let contact=0,lp1=0,lp2=0;
  for(let i=0;i<data.length;i++){
    const t=i/sampleRate,attack=Math.min(1,t/.0008),end=Math.min(1,(data.length-1-i)/(sampleRate*.005));
    contact+=alpha*((random()*2-1)-contact);
    const body=Math.sin(2*Math.PI*frequency*t)*Math.exp(-t/(.0032+.0006*level));
    const compression=.16*Math.sin(2*Math.PI*frequency*2.3*t)*Math.exp(-t/.0016);
    const touch=.10*contact*Math.pow(Math.max(0,1-t/.0028),2);
    const value=(body+compression+touch)*attack*gain;
    lp1+=alpha*(value-lp1);lp2+=alpha*(lp1-lp2);data[i]=lp2*end;
  }
  data[data.length-1]=0;return data;
}
// A ball rolling through the open wooden return channel: a low continuous
// rumble from rolling friction, with regular short "tocks" where the ball
// crosses each seam between the wooden segments. The seams are evenly spaced,
// so the tocks are periodic and speed up with the ball; the trough is open on
// top, so the roll sustains into its tail without a hollow cavity echo.
function woodRollSamples(speed,sampleRate,random){
  const level=clamp(speed),duration=.22;
  const data=new Float32Array(Math.ceil(sampleRate*duration));
  if(!level)return data;
  const pitch=.94+random()*.12,variation=.9+random()*.2;
  // Continuous rolling rumble: a wooden low body plus a faint mid grain.
  const bodyCut=1-Math.exp(-2*Math.PI*(120+110*level)/sampleRate);
  const grainCut=1-Math.exp(-2*Math.PI*(400+240*level)/sampleRate);
  const rumbleGain=1.5*Math.pow(level,1.15);
  let body=0,grain=0;
  for(let i=0;i<data.length;i++){
    const noise=random()*2-1;
    body+=bodyCut*(noise-body);grain+=grainCut*(noise-grain);
    data[i]=(body*.72+grain*.28)*rumbleGain*variation;
  }
  // Regular seam taps: short wooden knocks at evenly spaced joints. A smooth
  // half-sine window keeps each tock low and click-free (no treble transient).
  const seamInterval=(.092-.032*level)*(.94+random()*.12);
  const tapLen=Math.ceil(sampleRate*.022);
  for(let t=seamInterval*.35;t<duration-seamInterval*.25;t+=seamInterval){
    const start=Math.floor(t*sampleRate),tapPitch=pitch*(.94+random()*.12),tapGain=.5*Math.pow(level,.95)*(.8+random()*.4);
    for(let k=0;k<tapLen&&start+k<data.length;k++){
      const tt=k/sampleRate,w=Math.sin(Math.PI*Math.min(1,tt/.022));
      const knock=Math.sin(2*Math.PI*150*tapPitch*tt)*Math.exp(-tt/.007)+.22*Math.sin(2*Math.PI*320*tapPitch*tt)*Math.exp(-tt/.0035)+.15*Math.sin(2*Math.PI*640*tapPitch*tt)*Math.exp(-tt/.0025);
      data[start+k]+=knock*w*tapGain;
    }
  }
  // A four-pole low-pass keeps the whole voice low and wooden: the grain and
  // tap transients roll off fast, so nothing hisses above the rumble.
  const lpCut=1-Math.exp(-2*Math.PI*640/sampleRate);
  let p1=0,p2=0,q1=0,q2=0;
  for(let i=0;i<data.length;i++){
    p1+=lpCut*(data[i]-p1);p2+=lpCut*(p1-p2);
    q1+=lpCut*(p2-q1);q2+=lpCut*(q1-q2);
    data[i]=q2;
  }
  // Fade in quickly and fade out before the last 10 ms, so the tail ends
  // cleanly instead of ringing on like a resonant cavity.
  for(let i=0;i<data.length;i++){
    const t=i/sampleRate,fadeIn=Math.min(1,t/.018),fadeOut=Math.min(1,Math.max(0,(duration-.01-t)/.05));
    data[i]*=fadeIn*fadeIn*(3-2*fadeIn)*fadeOut*fadeOut*(3-2*fadeOut);
  }
  for(let i=0;i<data.length;i++)data[i]=.15*Math.tanh(data[i]/.15);
  data[0]=0;data[data.length-1]=0;return data;
}
// Strong entry can rebound against the wooden collector below the visible well.
// These are separate short knocks, not a continuous scraping or spinning bed.
export function woodRattleContacts(strength){
  const level=clamp(strength),count=level>0?3+Math.floor(level*2.999):0,contacts=[];
  let time=0;
  for(let i=0;i<count;i++){
    contacts.push({time,strength:level*Math.pow(.58,i)});
    time+=(45-12*level)*Math.pow(1.42,i);
  }
  return contacts;
}
function woodRattleSamples(strength,sampleRate,random){
  const contacts=woodRattleContacts(strength),duration=(contacts.at(-1)?.time||0)/1000+.105;
  const data=new Float32Array(Math.ceil(sampleRate*duration));
  for(const hit of contacts){
    const dry=new Float32Array(Math.ceil(sampleRate*.042)),pitch=.95+random()*.1,variation=.92+random()*.16;
    const alpha=1-Math.exp(-2*Math.PI*780/sampleRate),gain=.58*Math.pow(hit.strength,.8)*variation;
    let contact=0,low1=0,low2=0;
    for(let i=0;i<dry.length;i++){
      const t=i/sampleRate,attack=Math.min(1,t/.0015),end=Math.min(1,(dry.length-1-i)/(sampleRate*.006));
      contact+=alpha*((random()*2-1)-contact);
      const body=Math.sin(2*Math.PI*145*pitch*t)*Math.exp(-t/.0055)+.3*Math.sin(2*Math.PI*280*pitch*t)*Math.exp(-t/.0035);
      const touch=.05*contact*Math.pow(Math.max(0,1-t/.004),2);
      low1+=alpha*((body+touch)*attack*gain-low1);low2+=alpha*(low1-low2);dry[i]=low2*end;
    }
    const start=Math.round(hit.time/1000*sampleRate),delay1=Math.round(sampleRate*.019),delay2=Math.round(sampleRate*.036);
    const echo1=1-Math.exp(-2*Math.PI*420/sampleRate),echo2=1-Math.exp(-2*Math.PI*280/sampleRate);
    let reflected1=0,reflected2=0;
    for(let i=0;i<Math.ceil(sampleRate*.095)&&start+i<data.length;i++){
      reflected1+=echo1*((dry[i-delay1]||0)-reflected1);reflected2+=echo2*((dry[i-delay2]||0)-reflected2);
      data[start+i]+=(dry[i]||0)+.13*reflected1+.055*reflected2;
    }
  }
  data[data.length-1]=0;return data;
}
// A solid knock on the wooden pocket jaw. The old voice was a 330 Hz hollow
// box: upper modes as loud as the body and three bright, clearly separated
// reflections. Here a low ~150 Hz body carries the weight, the upper partials
// die in 2-4 ms (a short wooden "tap", not a ringing "booo"), and only two
// faint dark reflections hint at the enclosed well. `echo` still scales just
// that tail, so a rapid volley stays articulate and the last hit is a touch
// more spacious - it no longer rings out like an empty crate.
function woodKnockSamples(strength,sampleRate,random,echo=1){
  const level=clamp(strength),wet=clamp(echo),pitch=.96+random()*.08,variation=.92+random()*.16;
  const dryLength=Math.ceil(sampleRate*.048),duration=Math.ceil(sampleRate*(.044+.030*wet));
  const dry=new Float32Array(dryLength),data=new Float32Array(duration);
  // Strength is applied after peak limiting. Scaling the dry shape first let a
  // fixed .82 ceiling flatten every level into the same waveform, so light and
  // hard contacts ended up equally loud.
  const loudness=.22+.78*Math.pow(level,1.15);
  const modes=[[152,1,.009],[355,.22,.005],[900,.65,.004],[1800,.26,.0022],[2600,.10,.0015]];
  const noiseAlpha=1-Math.exp(-2*Math.PI*3600/sampleRate);
  let noise=0;
  for(let i=0;i<dryLength;i++){
    const t=i/sampleRate,attack=Math.min(1,t/.0007),end=Math.min(1,(dryLength-1-i)/(sampleRate*.004));
    noise+=noiseAlpha*((random()*2-1)-noise);
    let body=0;for(const [f,a,decay] of modes)body+=a*Math.sin(2*Math.PI*f*pitch*t)*Math.exp(-t/decay);
    const thump=.38*Math.sin(2*Math.PI*92*pitch*t)*Math.exp(-t/.003);
    const click=.75*noise*Math.pow(Math.max(0,1-t/.0016),2)*attack;
    dry[i]=(body+thump+click)*attack*end;
  }
  for(let i=0;i<dryLength;i++)data[i]=dry[i];
  for(const [time,amp,cutoff] of [[.014,.10,900],[.030,.035,600]]){
    const delay=Math.round(sampleRate*(time+(random()-.5)*.001)),a=1-Math.exp(-2*Math.PI*cutoff/sampleRate);
    let lp=0;for(let i=delay;i<data.length;i++){lp+=a*((dry[i-delay]||0)-lp);data[i]+=lp*amp*wet;}
  }
  const tail=Math.round(sampleRate*.009);
  for(let i=0;i<tail;i++){const u=i/tail;data[data.length-1-i]*=u*u*(3-2*u);}
  let peak=0;for(const v of data)peak=Math.max(peak,Math.abs(v));
  const scale=peak>0?Math.min(1,.78/peak)*loudness*variation:0;
  for(let i=0;i<data.length;i++)data[i]*=scale;
  data[0]=0;data[data.length-1]=0;return data;
}
// Exposed hard rubber at the pocket guard: firmer than cloth-covered cushions,
// with a brief contact pulse and no rubbing/noise layer after the first 5 ms.
function rubberSamples(strength,sampleRate,random){
  const level=clamp(strength),pitch=.96+random()*.08,variation=.92+random()*.16;
  const data=new Float32Array(Math.ceil(sampleRate*.065));
  const alpha=1-Math.exp(-2*Math.PI*(1050+500*level)/sampleRate),gain=(.08+.58*Math.pow(level,.8))*variation;
  let touch=0,low1=0,low2=0;
  for(let i=0;i<data.length;i++){
    const t=i/sampleRate,attack=Math.min(1,t/.0013),end=Math.min(1,(data.length-1-i)/(sampleRate*.008));
    touch+=alpha*((random()*2-1)-touch);
    const body=Math.sin(2*Math.PI*(260+35*level)*pitch*t)*Math.exp(-t/.0075);
    const contact=.24*Math.sin(2*Math.PI*690*pitch*t)*Math.exp(-t/.0035)+.07*touch*Math.pow(Math.max(0,1-t/.005),2);
    low1+=alpha*((body+contact)*attack*gain-low1);low2+=alpha*(low1-low2);data[i]=low2*end;
  }
  data[data.length-1]=0;return data;
}
// The ball lands below the guard into a wooden collector. Finite cavity
// reflections share the return-channel character without a sustained hiss.
function woodDropSamples(strength,sampleRate,random){
  const level=clamp(strength),pitch=.96+random()*.08,variation=.92+random()*.16;
  const dry=new Float32Array(Math.ceil(sampleRate*.085)),data=new Float32Array(Math.ceil(sampleRate*.135));
  const alpha=1-Math.exp(-2*Math.PI*(600+250*level)/sampleRate),gain=(.1+.60*Math.pow(level,.8))*variation;
  let contact=0,low1=0,low2=0;
  for(let i=0;i<dry.length;i++){
    const t=i/sampleRate,attack=Math.min(1,t/.002),end=Math.min(1,(dry.length-1-i)/(sampleRate*.012));
    contact+=alpha*((random()*2-1)-contact);
    const body=Math.sin(2*Math.PI*125*pitch*t)*Math.exp(-t/.014)+.32*Math.sin(2*Math.PI*235*pitch*t)*Math.exp(-t/.009);
    const tap=.13*Math.sin(2*Math.PI*420*pitch*t)*Math.exp(-t/.004)+.04*contact*Math.pow(Math.max(0,1-t/.006),2);
    low1+=alpha*((body+tap)*attack*gain-low1);low2+=alpha*(low1-low2);dry[i]=low2*end;
  }
  const delay1=Math.round(sampleRate*(.024+random()*.004)),delay2=Math.round(sampleRate*(.048+random()*.006));
  const alpha1=1-Math.exp(-2*Math.PI*520/sampleRate),alpha2=1-Math.exp(-2*Math.PI*340/sampleRate);
  let reflected1=0,reflected2=0;
  for(let i=0;i<data.length;i++){
    reflected1+=alpha1*((dry[i-delay1]||0)-reflected1);reflected2+=alpha2*((dry[i-delay2]||0)-reflected2);
    const end=Math.min(1,(data.length-1-i)/(sampleRate*.015));
    data[i]=((dry[i]||0)+.10*reflected1+.035*reflected2)*end;
  }
  data[data.length-1]=0;return data;
}
export function pocketSoundStages(motion,strength=.15){
  const hits=motion.contacts||[],last=hits.length-1;
  // Exactly one wooden knock per resolved wall contact, at that contact's own
  // timestamp. The old code appended a self-generated 3-5 knock "rebound
  // group" on *lengthening* intervals after the drop: extra voices that were
  // out of sync with the accelerating visual volley. Dense volleys get a
  // shorter echo so eight hits stay distinct; the last one has a touch more well.
  const stages=hits.map((hit,i)=>{
    const gap=i<last?hits[i+1].time-hit.time:Infinity;
    const echo=i===last?1:Math.max(.35,Math.min(.8,gap/60));
    return [hit.time,'guard'+i,'wood-knock',clamp(hit.strength),echo];
  });
  stages.push([motion.dropAt,'drop','wood-drop',clamp(strength)*.26]);
  return stages;
}
// Offline/first-load fallback for a hard ball contact: inharmonic, quickly
// damped resin modes plus a sub-millisecond contact snap, without a noise tail.
function rackContactSamples(strength,sampleRate,random){
  const data=new Float32Array(Math.ceil(sampleRate*BURST_CONTACT_DURATION));
  const level=clamp(strength),gain=.12+.65*level;
  const modes=[[920,.32,.0045],[2190,.46,.0027],[3870,.26,.0016],[6420,.12,.0008]];
  for(let i=0;i<data.length;i++){
    const t=i/sampleRate,attack=Math.min(1,t/.00025),end=Math.min(1,(data.length-1-i)/(sampleRate*.004));
    let body=0;for(const [frequency,amplitude,decay] of modes)body+=amplitude*Math.sin(2*Math.PI*frequency*t)*Math.exp(-t/decay);
    const snap=(random()*2-1)*.22*Math.exp(-t/.00045);
    data[i]=(body+snap)*attack*end*gain;
  }
  data[0]=0;data[data.length-1]=0;return data;
}
export function impactSamples(kind,strength=.5,tangent=0,sampleRate=48000,random=Math.random,echo=1,toneLock=false){
  if(kind==='ball'&&toneLock)return rackContactSamples(strength,sampleRate,random);
  if(kind==='rail')return cushionSamples(strength,sampleRate,random);
  if(kind==='wood-roll')return woodRollSamples(strength,sampleRate,random);
  if(kind==='wood-knock')return woodKnockSamples(strength,sampleRate,random,echo);
  if(kind==='wood-rattle')return woodRattleSamples(strength,sampleRate,random);
  if(kind==='rubber'||kind==='pocket')return rubberSamples(strength,sampleRate,random);
  if(kind==='wood-drop')return woodDropSamples(strength,sampleRate,random);
  const level=clamp(strength),tone=toneLock?1:level;
  const pitch=toneLock?1:.96+random()*.08,variation=toneLock?1:.9+random()*.2;
  const duration=kind==='rail'?.06+.03*level:kind==='roll'?.12:kind==='pocket'?.065:kind==='cue'?.04:.03+.03*tone;
  const data=new Float32Array(Math.ceil(sampleRate*duration));
  const cutoff=kind==='ball'?1800+1200*tone:kind==='cue'?950:kind==='rail'?650:kind==='roll'?220+700*tone:800;
  const alpha=1-Math.exp(-2*Math.PI*cutoff/sampleRate),high=1-Math.exp(-2*Math.PI*800/sampleRate),cap=1-Math.exp(-2*Math.PI*5000/sampleRate);
  let low=0,base=0,lp1=0,lp2=0;
  for(let i=0;i<data.length;i++){
    const t=i/sampleRate,u=i/(data.length-1),attack=Math.min(1,t/.002),env=attack*Math.pow(1-u,3),noise=random()*2-1;
    low+=alpha*(noise-low);base+=high*(noise-base);
    const band=kind==='ball'?low-base:low;
    const modes=kind==='ball'?.055*Math.sin(2*Math.PI*1200*pitch*t)+.025*Math.sin(2*Math.PI*2400*pitch*t):0;
    const thump=kind==='roll'?0:.25*Math.sin(2*Math.PI*(kind==='ball'?185:kind==='cue'?150:125)*pitch*t)*Math.pow(Math.max(0,1-t/.018),2)*attack;
    const friction=clamp(tangent)*.12*band*Math.pow(Math.max(0,1-t/.012),2)*attack;
    let value=kind==='roll'?low*.16*Math.sin(Math.PI*u)*level:((band*.85+modes)*env+thump+friction)*(.12+.65*level)*variation;
    lp1+=cap*(value-lp1);lp2+=cap*(lp1-lp2);data[i]=lp2*Math.min(1,(1-u)*30);
  }
  data[data.length-1]=0;return data;
}
export function poolImpact(kind,strength=.5,tangent=0,playbackGain=1,delay=0,variant=-1,echo=1,toneLock=false){
  if(muted||!context||context.state!=='running'||globalThis.document?.hidden||voices.size>=32)return false;
  const lock=toneLock&&kind==='ball';
  if(kind==='ball'&&recordedImpact(strength,delay,playbackGain,variant,lock))return true;
  const samples=(kind==='rail'&&snookerVoice()?snookerCushionSamples(strength,context.sampleRate,Math.random):impactSamples(kind,strength,tangent,context.sampleRate,Math.random,echo,lock)),buffer=context.createBuffer(1,samples.length,context.sampleRate);
  buffer.getChannelData(0).set(playbackGain===1?samples:samples.map(sample=>sample*playbackGain));const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);
  // No jitter at all: scheduled stages must land on their exact visual
  // contact times, and a 12 ms volley would smear with even 4 ms of drift.
  const start=context.currentTime+delay;voices.add(source);source.onended=()=>{voices.delete(source);source.disconnect?.();};source.start(start);source.stop(start+samples.length/context.sampleRate);return true;
}
// A break shot resolves dozens of ball-ball contacts within ~4 ms of simulated
// time. Firing them all at once collapses into one thud and hits the voice cap.
// The user selected A and requested a merged rack sound: several real contacts
// overlap throughout a compact 23 ms cluster, with no separated tail hits. These
// offsets are mixed into ONE PCM voice, not ten independent scheduled voices.
// Purely presentational - no physics, state or protocol change.
const BURST_MIN_STRENGTH=.035;
const BURST_TIMES=[0,.0021,.0046,.007,.0098,.0123,.0151,.0176,.0205,.023];
export function impactBurstSchedule(events){
  const audible=(events||[]).filter(e=>e&&Number.isFinite(e.strength)&&e.strength>BURST_MIN_STRENGTH);
  const plain=e=>({kind:e.kind,strength:e.strength,tangent:e.tangent||0,delay:0,gain:1,variant:-1,toneLock:false});
  const balls=audible.filter(e=>e.kind==='ball');
  if(balls.length<3)return audible.map(plain);
  const chain=balls.sort((a,b)=>b.strength-a.strength).slice(0,BURST_TIMES.length)
    .map((e,i)=>({...plain(e),delay:BURST_TIMES[i],gain:1/(1+i*.045),variant:1,toneLock:true}));
  // Cushion and pocket contacts never inherit the artistic rack timing.
  return [...chain,...audible.filter(e=>e.kind!=='ball').map(plain)];
}
export function mixImpactSamples(sample,sampleRate,events){
  const plan=impactBurstSchedule(events).filter(e=>e.kind==='ball');
  if(!plan.length||!sample.length)return new Float32Array(0);
  const mixed=new Float32Array(sample.length+Math.ceil(plan.at(-1).delay*sampleRate));
  const envelope=new Float32Array(mixed.length);
  for(const e of plan){
    const offset=Math.round(e.delay*sampleRate),gain=ballLevel(e.strength)*e.gain;
    for(let i=0;i<sample.length;i++){
      mixed[offset+i]+=sample[i]*gain;
      envelope[offset+i]+=Math.abs(sample[i])*e.gain;
    }
  }
  // Bound the full-strength absolute envelope, then apply that SAME headroom
  // to every strength. Per-result normalisation made soft/hard racks equally
  // loud once both hit the ceiling. This stays linear and avoids clipping.
  let peak=0;for(const value of envelope)peak=Math.max(peak,value);
  if(peak>.86)for(let i=0;i<mixed.length;i++)mixed[i]*=.86/peak;
  mixed[0]=0;mixed[mixed.length-1]=0;return mixed;
}
export function poolImpactBurst(events){
  if(muted||!context||context.state!=='running'||globalThis.document?.hidden)return 0;
  const plan=impactBurstSchedule(events),balls=plan.filter(e=>e.kind==='ball'&&e.toneLock);
  let played=0;
  if(balls.length&&voices.size<32){
    const rate=recorded?.sampleRate||context.sampleRate;
    const slice=recordedSlice();
    const sample=slice?.data||impactSamples('ball',1,0,rate,Math.random,1,true);
    const samples=mixImpactSamples(sample,rate,events),buffer=context.createBuffer(1,samples.length,rate),source=context.createBufferSource();
    buffer.getChannelData(0).set(samples);source.buffer=buffer;if(source.playbackRate)source.playbackRate.value=1;source.connect(recorded?ballOutput():context.destination);
    voices.add(source);source.onended=()=>{voices.delete(source);source.disconnect?.();};
    source.start(context.currentTime);source.stop(context.currentTime+samples.length/rate);played=balls.length;
  }
  for(const e of plan)if(!e.toneLock&&poolImpact(e.kind,e.strength,e.tangent,e.gain,e.delay,e.variant))played++;
  return played;
}
// A 16 ms replay frame can contain a whole rack-break chain. Each contact then
// shows only a fraction of its real closing speed, so the reconstructed
// strengths are misleadingly quiet. Re-anchor them to the strongest measured
// contact in that frame - never above it - so the chain stays audible. Only
// applies to bursts of three or more ball contacts; ordinary shots are untouched.
export function chainLevels(events){
  const balls=events.filter(e=>e?.kind==='ball'),peak=balls.length?Math.max(...balls.map(e=>e.strength)):0;
  const boosted=new Map();
  if(balls.length>=3&&peak>0)balls.slice().sort((a,b)=>b.strength-a.strength)
    .forEach((e,i)=>boosted.set(e,Math.max(e.strength,peak*.55*Math.pow(.88,i))));
  return events.map(e=>({...e,strength:boosted.get(e)??e.strength}));
}
// Replay velocities are in tenths of table units per sample. Resolve relative normal
// and tangent components per pair, rather than treating direction changes as impacts.
export function replayImpacts(before,prev,next,count=16){
  const events=[];
  for(let i=0;i<count;i++)if(prev[i*3+2]){
    const vx=(prev[i*3]-before[i*3])/10,vy=(prev[i*3+1]-before[i*3+1])/10;
    if(!next[i*3+2]){events.push({kind:'pocket',strength:clamp(Math.hypot(vx,vy)/40),key:'p'+i});continue;}
    const nx=(next[i*3]-prev[i*3])/10,ny=(next[i*3+1]-prev[i*3+1])/10;
    for(let j=i+1;j<count;j++)if(prev[j*3+2]&&next[j*3+2]){
      const dx=(prev[j*3]-prev[i*3])/10,dy=(prev[j*3+1]-prev[i*3+1])/10,d=Math.hypot(dx,dy);if(d<1||d>65)continue;
      const rx=vx-(prev[j*3]-before[j*3])/10,ry=vy-(prev[j*3+1]-before[j*3+1])/10,normal=(rx*dx+ry*dy)/d;
      const change=Math.hypot(nx-vx,ny-vy);if(normal>.3&&change>Math.max(.4,normal*.15)&&d-normal<34)events.push({kind:'ball',strength:clamp(normal/32),tangent:clamp(Math.abs(rx*dy-ry*dx)/d/32),key:i+':'+j});
    }
  }
  const ballContacts=new Set();for(const e of events)if(e.kind==='ball')for(const id of e.key.split(':'))ballContacts.add(Number(id));
  for(let i=0;i<count;i++)if(before[i*3+2]&&prev[i*3+2]&&next[i*3+2]&&!ballContacts.has(i)){
    const vx=(prev[i*3]-before[i*3])/10,vy=(prev[i*3+1]-before[i*3+1])/10;
    const ox=(next[i*3]-prev[i*3])/10,oy=(next[i*3+1]-prev[i*3+1])/10;
    const speed=Math.hypot(vx,vy),changeX=ox-vx,changeY=oy-vy,change=Math.hypot(changeX,changeY);
    if(change<Math.max(.3,speed*.08))continue;
    const contact=cushionContact(prev[i*3]/10,prev[i*3+1]/10,18+Math.min(70,speed));
    if(!contact)continue;
    const incoming=-(vx*contact.nx+vy*contact.ny),outgoing=ox*contact.nx+oy*contact.ny,impulse=changeX*contact.nx+changeY*contact.ny;
    if(incoming>.15&&outgoing>0&&impulse>change*.65)events.push({kind:'rail',strength:clamp(impulse/1.92/80),key:'r'+i});
  }
  return events;
}
export const poolRecordingStatus=()=>recorded?'ready':loading?'loading':'unavailable';

// Countdown UI cue only. Kept separate from recorded ball impacts and material sounds.
export function countdownSamples(stage,sampleRate=48000){
 const go=stage==='GO',duration=go?.52:.105,frequency=go?880:520;
  const data=new Float32Array(Math.ceil(duration*sampleRate));
  for(let i=0;i<data.length;i++){
    const t=i/sampleRate,u=i/(data.length-1),attack=Math.min(1,t/.004),end=Math.pow(1-u,2);
    data[i]=.15*attack*end*(Math.sin(2*Math.PI*frequency*t)+.12*Math.sin(2*Math.PI*frequency*2*t));
  }
  data[data.length-1]=0;return data;
}
export function poolCountdownSound(stage){
  if(!['3','2','1','GO'].includes(String(stage))||muted||!context||context.state!=='running'||globalThis.document?.hidden)return false;
  const samples=countdownSamples(String(stage),context.sampleRate),buffer=context.createBuffer(1,samples.length,context.sampleRate),source=context.createBufferSource();
  buffer.getChannelData(0).set(samples);source.buffer=buffer;source.connect(context.destination);
  const start=context.currentTime;voices.add(source);source.onended=()=>{voices.delete(source);source.disconnect?.();};source.start(start);source.stop(start+samples.length/context.sampleRate);return true;
}

// A short rising celebration, separate from the physical collision sound bank.
export function victorySamples(sampleRate=48000){
  const data=new Float32Array(Math.ceil(1.28*sampleRate));
  for(const [at,frequency,duration,level] of [[0,523.25,.25,.12],[.16,659.25,.25,.12],[.32,783.99,.28,.12],[.50,1046.5,.78,.10],[.50,659.25,.68,.045],[.50,783.99,.72,.045]]){
    const start=Math.round(at*sampleRate),length=Math.round(duration*sampleRate);
    for(let i=0;i<length&&start+i<data.length;i++){
      const t=i/sampleRate,u=i/(length-1),envelope=Math.min(1,t/.009)*Math.pow(1-u,1.8);
      data[start+i]+=level*envelope*(Math.sin(2*Math.PI*frequency*t)+.16*Math.sin(4*Math.PI*frequency*t));
    }
  }
  data[data.length-1]=0;return data;
}
export function poolVictorySound(){
  if(muted||!context||context.state!=='running'||globalThis.document?.hidden)return false;
  const samples=victorySamples(context.sampleRate),buffer=context.createBuffer(1,samples.length,context.sampleRate),source=context.createBufferSource();
  buffer.getChannelData(0).set(samples);source.buffer=buffer;source.connect(context.destination);
  voices.add(source);source.onended=()=>{voices.delete(source);source.disconnect?.();};
  source.start(context.currentTime);source.stop(context.currentTime+samples.length/context.sampleRate);return true;
}
