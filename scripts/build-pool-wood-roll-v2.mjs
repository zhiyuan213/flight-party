// Offline preview of a re-voiced wooden return-channel roll (candidate v2).
// Node only. Synthesises "a ball rolling in a wooden trough": a low warm
// continuous rumble with regular soft wooden tocks at the seams. Writes two
// variants as WAV so the user can A/B them without loading the table page.
import {writeFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const rate=48000;
const seeded=(s=831)=>()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);
const clamp=v=>Math.max(0,Math.min(1,v));

function grain(level,random,variant){
  const dur=.22,data=new Float32Array(Math.ceil(rate*dur));
  const pitch=.95+random()*.1,variation=.9+random()*.2;
  const gain=1.5*Math.pow(level,1.15)*variation;
  // 1) Continuous low rumble: a warm wooden body (low sine + 2nd harmonic)
  //    plus a very low grain. No hiss: everything sits under ~100 Hz.
  const bodyFreq=58+26*level;
  const grainCut=1-Math.exp(-2*Math.PI*(80+50*level)/rate);
  let g=0;
  for(let i=0;i<data.length;i++){
    const t=i/rate;
    g+=grainCut*((random()*2-1)-g);
    const wobble=.25*Math.sin(2*Math.PI*(1.4+1.6*level)*t);
    const body=Math.sin(2*Math.PI*bodyFreq*pitch*t+wobble);
    const h2=.32*Math.sin(2*Math.PI*bodyFreq*2*pitch*t);
    data[i]=(body+h2+g*.6)*gain;
  }
  // 2) Regular seam tocks: soft wooden knocks at evenly spaced joints.
  const interval=(.092-.03*level)*(.94+random()*.12);
  const tapLen=Math.ceil(rate*.02);
  for(let t=interval*.35;t<dur-interval*.2;t+=interval){
    const start=Math.floor(t*rate),tp=pitch*(.94+random()*.12);
    const tg=.5*Math.pow(level,.95)*(.8+random()*.4)*(variant==='soft'?.55:1);
    for(let k=0;k<tapLen&&start+k<data.length;k++){
      const tt=k/rate,w=Math.sin(Math.PI*Math.min(1,tt/.02));
      const knock=Math.sin(2*Math.PI*150*tp*tt)*Math.exp(-tt/.007)
        +.3*Math.sin(2*Math.PI*300*tp*tt)*Math.exp(-tt/.0035)
        +.16*Math.sin(2*Math.PI*520*tp*tt)*Math.exp(-tt/.0022);
      data[start+k]+=knock*w*tg;
    }
  }
  // 3) Four-pole low-pass (wood, no treble), fade, soft saturation.
  const lpCut=1-Math.exp(-2*Math.PI*620/rate);
  let p1=0,p2=0,q1=0,q2=0;
  for(let i=0;i<data.length;i++){
    p1+=lpCut*(data[i]-p1);p2+=lpCut*(p1-p2);
    q1+=lpCut*(p2-q1);q2+=lpCut*(q1-q2);
    data[i]=q2;
  }
  for(let i=0;i<data.length;i++){
    const t=i/rate,fadeIn=Math.min(1,t/.018),fadeOut=Math.min(1,Math.max(0,(dur-.01-t)/.05));
    data[i]*=fadeIn*fadeIn*(3-2*fadeIn)*fadeOut*fadeOut*(3-2*fadeOut);
  }
  for(let i=0;i<data.length;i++)data[i]=.15*Math.tanh(data[i]/.15);
  data[0]=0;data[data.length-1]=0;return data;
}

// Simulate the in-game continuous roll: fresh grains every 90 ms.
function roll(variant){
  const mix=new Float32Array(Math.ceil(rate*2.1));
  for(let i=0;i<20;i++){
    const g=grain(.228,seeded(900+i*37),variant),offset=Math.round(rate*(i*.09));
    for(let k=0;k<g.length&&offset+k<mix.length;k++)mix[offset+k]+=g[k];
  }
  let peak=0;for(const v of mix)peak=Math.max(peak,Math.abs(v));
  const gain=Math.min(12,.62/peak);
  for(let i=0;i<mix.length;i++)mix[i]=Math.max(-1,Math.min(1,mix[i]*gain));
  return mix;
}
function encode(samples){
  const out=Buffer.alloc(44+samples.length*2);
  out.write('RIFF',0);out.writeUInt32LE(out.length-8,4);out.write('WAVE',8);out.write('fmt ',12);
  out.writeUInt32LE(16,16);out.writeUInt16LE(1,20);out.writeUInt16LE(1,22);
  out.writeUInt32LE(rate,24);out.writeUInt32LE(rate*2,28);out.writeUInt16LE(2,32);out.writeUInt16LE(16,34);
  out.write('data',36);out.writeUInt32LE(samples.length*2,40);
  samples.forEach((v,i)=>out.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),44+2*i));
  return out;
}
for(const v of ['soft','clear']){
  const path=new URL(`docs/verification/pool-wood-roll-v2-${v}-20261114.wav`,root);
  writeFileSync(path,encode(roll(v)));
  console.log('wrote',path.pathname);
}
