// Dry impacts; wooden collection and return voices have short cavity reflections.
import {cushionContact} from './pool-geometry.js';
let context, muted=false,recorded,loading,master,lastVariant=-1;
const voices=new Set();
try{muted=localStorage.getItem('joyflock.pool.muted')==='1';}catch{}
export const poolMuted=()=>muted;
export function setPoolMuted(value){muted=value;if(value)for(const v of voices){try{v.stop();}catch{}}try{localStorage.setItem('joyflock.pool.muted',value?'1':'0');}catch{}}
export function unlockPoolAudio(){try{const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;context||=new Audio();loadRecording();if(context.state==='suspended')context.resume().catch(()=>{});}catch{}}
async function loadRecording(){
 if(recorded||loading||!context?.decodeAudioData)return;
 loading=true;try{const res=await fetch(new URL('../assets/audio/pool/ball-clack.mp3',import.meta.url));if(!res.ok)throw Error('audio');recorded=await context.decodeAudioData(await res.arrayBuffer());}catch{loading=false;}
}
function recordedImpact(strength){
 const level=Math.max(0,Math.min(1,strength));if(!recorded)return false;
 const src=context.createBufferSource(),gain=context.createGain(),filter=context.createBiquadFilter();
 let variant=Math.floor(Math.random()*3);if(variant===lastVariant)variant=(variant+1)%3;lastVariant=variant;
 src.buffer=recorded;src.playbackRate.value=[.97,1,1.03][variant];filter.type='lowpass';filter.frequency.value=2500+3500*level;
 gain.gain.value=(.08+.55*Math.pow(level,.75))*(.94+Math.random()*.12)/Math.sqrt(1+voices.size*.3);
 if(!master){master=context.createDynamicsCompressor();master.threshold.value=-10;master.knee.value=6;master.ratio.value=12;master.attack.value=.002;master.release.value=.055;master.connect(context.destination);}
 src.connect(filter);filter.connect(gain);gain.connect(master);
 const data=recorded.getChannelData(0);let onset=0;while(onset<data.length&&Math.abs(data[onset])<.012)onset++;
 const offset=Math.max(0,onset/recorded.sampleRate-.001),duration=Math.min(.11,recorded.duration-offset),now=context.currentTime;
 gain.gain.setValueAtTime(gain.gain.value,now);gain.gain.setValueAtTime(gain.gain.value,now+.035);gain.gain.exponentialRampToValueAtTime(.0001,now+duration/src.playbackRate.value);
 voices.add(src);src.onended=()=>{voices.delete(src);src.disconnect();filter.disconnect();gain.disconnect();};src.start(now,offset,duration);src.stop(now+duration/src.playbackRate.value+.001);return true;
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
// An enclosed wooden return: irregular low contacts plus two soft reflections.
// Finite, filtered taps give a small hollow body without a resonant feedback loop.
function woodRollSamples(speed,sampleRate,random){
  const level=clamp(speed),duration=.22,dryDuration=.16;
  const data=new Float32Array(Math.ceil(sampleRate*duration)),dry=new Float32Array(Math.ceil(sampleRate*dryDuration));
  if(!level)return data;
  const bumps=[];
  for(let t=-.01+random()*.02;t<dryDuration+.01;t+=(.023+random()*.022)/(.8+level*.7)){
    bumps.push({time:t,width:.0025+random()*.002,weight:.35+random()*.45});
  }
  const alpha=1-Math.exp(-2*Math.PI*(220+120*level)/sampleRate);
  // The visible return normally runs at strength .152; retain audible body there.
  const bass=1-Math.exp(-2*Math.PI*35/sampleRate),gain=.6*Math.pow(level,.65);
  let low=0,body=0,dc=0,out1=0,out2=0;
  for(let i=0;i<dry.length;i++){
    const t=i/sampleRate,fadeIn=Math.min(1,t/.018),fadeOut=Math.min(1,(dry.length-1-i)/(sampleRate*.028));
    const fade=fadeIn*fadeIn*(3-2*fadeIn)*fadeOut*fadeOut*(3-2*fadeOut);
    low+=alpha*((random()*2-1)-low);body+=alpha*(low-body);dc+=bass*(body-dc);
    let contacts=0;
    for(const b of bumps){const u=(t-b.time)/b.width;if(Math.abs(u)<3)contacts+=b.weight*(1-2*u*u)*Math.exp(-u*u);}
    const value=(.55*(body-dc)+.19*contacts)*gain;
    out1+=alpha*(value-out1);out2+=alpha*(out1-out2);dry[i]=out2*fade;
  }
  const delay1=Math.round(sampleRate*(.023+random()*.004)),delay2=Math.round(sampleRate*(.045+random()*.006));
  const filter1=1-Math.exp(-2*Math.PI*520/sampleRate),filter2=1-Math.exp(-2*Math.PI*340/sampleRate);
  let reflected1=0,reflected2=0;
  for(let i=0;i<data.length;i++){
    reflected1+=filter1*((dry[i-delay1]||0)-reflected1);
    reflected2+=filter2*((dry[i-delay2]||0)-reflected2);
    const end=Math.min(1,(data.length-1-i)/(sampleRate*.012));
    data[i]=((dry[i]||0)+.3*reflected1+.16*reflected2)*end*end*(3-2*end);
  }
  data[data.length-1]=0;return data;
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
  const dry=new Float32Array(Math.ceil(sampleRate*.085)),data=new Float32Array(Math.ceil(sampleRate*.18));
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
    const end=Math.min(1,(data.length-1-i)/(sampleRate*.02));
    data[i]=((dry[i]||0)+.28*reflected1+.13*reflected2)*end;
  }
  data[data.length-1]=0;return data;
}
export function pocketSoundStages(motion,strength=.15){
  const stages=motion.contacts.map((hit,i)=>[hit.time,'guard'+i,'rubber',clamp(hit.strength)]);
  stages.push([motion.dropAt,'drop','wood-drop',clamp(strength)*.32]);
  const rebound=clamp((strength-.5)/.5);
  if(rebound>0)stages.push([motion.dropAt+32,'rattle','wood-rattle',rebound*rebound*(3-2*rebound)]);
  return stages;
}
export function impactSamples(kind,strength=.5,tangent=0,sampleRate=48000,random=Math.random){
  if(kind==='rail')return cushionSamples(strength,sampleRate,random);
  if(kind==='wood-roll')return woodRollSamples(strength,sampleRate,random);
  if(kind==='wood-rattle')return woodRattleSamples(strength,sampleRate,random);
  if(kind==='rubber'||kind==='pocket')return rubberSamples(strength,sampleRate,random);
  if(kind==='wood-drop')return woodDropSamples(strength,sampleRate,random);
  const level=clamp(strength),pitch=.96+random()*.08,variation=.9+random()*.2;
  const duration=kind==='rail'?.06+.03*level:kind==='roll'?.12:kind==='pocket'?.065:kind==='cue'?.04:.03+.03*level;
  const data=new Float32Array(Math.ceil(sampleRate*duration));
  const cutoff=kind==='ball'?1800+1200*level:kind==='cue'?950:kind==='rail'?650:kind==='roll'?220+700*level:800;
  const alpha=1-Math.exp(-2*Math.PI*cutoff/sampleRate),high=1-Math.exp(-2*Math.PI*800/sampleRate),cap=1-Math.exp(-2*Math.PI*5000/sampleRate);
  let low=0,base=0,lp1=0,lp2=0;
  for(let i=0;i<data.length;i++){
    const t=i/sampleRate,u=i/(data.length-1),attack=Math.min(1,t/.002),env=attack*Math.pow(1-u,3),noise=random()*2-1;
    low+=alpha*(noise-low);base+=high*(noise-base);
    const band=kind==='ball'?low-base:low;
    const modes=kind==='ball'?.055*Math.sin(2*Math.PI*1200*pitch*t)+.025*Math.sin(2*Math.PI*2400*pitch*t):0;
    const thump=kind==='roll'?0:.25*Math.sin(2*Math.PI*(kind==='ball'?185:kind==='cue'?150:125)*pitch*t)*Math.pow(Math.max(0,1-t/.018),2)*attack;
    const friction=clamp(tangent)*.12*band*Math.pow(Math.max(0,1-t/.012),2)*attack;
    let value=kind==='roll'?low*.08*Math.sin(Math.PI*u)*level:((band*.85+modes)*env+thump+friction)*(.12+.65*level)*variation;
    lp1+=cap*(value-lp1);lp2+=cap*(lp1-lp2);data[i]=lp2*Math.min(1,(1-u)*30);
  }
  data[data.length-1]=0;return data;
}
export function poolImpact(kind,strength=.5,tangent=0,playbackGain=1){
  if(muted||!context||context.state!=='running'||globalThis.document?.hidden||voices.size>=32)return false;
  if(kind==='ball'&&recordedImpact(strength))return true;
  const samples=impactSamples(kind,strength,tangent,context.sampleRate),buffer=context.createBuffer(1,samples.length,context.sampleRate);
  buffer.getChannelData(0).set(playbackGain===1?samples:samples.map(sample=>sample*playbackGain));const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);
  const start=context.currentTime+Math.random()*.008;voices.add(source);source.onended=()=>{voices.delete(source);source.disconnect?.();};source.start(start);source.stop(start+samples.length/context.sampleRate);return true;
}
// Replay velocities are in tenths of table units per sample. Resolve relative normal
// and tangent components per pair, rather than treating direction changes as impacts.
export function replayImpacts(before,prev,next){
  const events=[];
  for(let i=0;i<16;i++)if(prev[i*3+2]){
    const vx=(prev[i*3]-before[i*3])/10,vy=(prev[i*3+1]-before[i*3+1])/10;
    if(!next[i*3+2]){events.push({kind:'pocket',strength:clamp(Math.hypot(vx,vy)/40),key:'p'+i});continue;}
    const nx=(next[i*3]-prev[i*3])/10,ny=(next[i*3+1]-prev[i*3+1])/10;
    for(let j=i+1;j<16;j++)if(prev[j*3+2]&&next[j*3+2]){
      const dx=(prev[j*3]-prev[i*3])/10,dy=(prev[j*3+1]-prev[i*3+1])/10,d=Math.hypot(dx,dy);if(d<1||d>65)continue;
      const rx=vx-(prev[j*3]-before[j*3])/10,ry=vy-(prev[j*3+1]-before[j*3+1])/10,normal=(rx*dx+ry*dy)/d;
      const change=Math.hypot(nx-vx,ny-vy);if(normal>.3&&change>Math.max(.4,normal*.15)&&d-normal<34)events.push({kind:'ball',strength:clamp(normal/32),tangent:clamp(Math.abs(rx*dy-ry*dx)/d/32),key:i+':'+j});
    }
  }
  const ballContacts=new Set();for(const e of events)if(e.kind==='ball')for(const id of e.key.split(':'))ballContacts.add(Number(id));
  for(let i=0;i<16;i++)if(before[i*3+2]&&prev[i*3+2]&&next[i*3+2]&&!ballContacts.has(i)){
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
