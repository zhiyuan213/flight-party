// Reproducible offline voicing of the user-selected A recording. Node only;
// runtime remains buildless. No pitch shift, extra oscillator, or room reverb.
import {readFileSync,writeFileSync} from 'node:fs';
import {poolStart,poolMove} from '../dist/table/pool.js';
import {mixImpactSamples} from '../dist/table/pool-audio.js';
const root=new URL('../',import.meta.url),original=readFileSync(new URL('dist/assets/audio/pool/ball-clack-a.wav',root));
if(original.toString('ascii',0,4)!=='RIFF'||original.readUInt16LE(20)!==1||original.readUInt16LE(22)!==1||original.readUInt16LE(34)!==16)throw Error('Expected mono PCM16 source');
const rate=original.readUInt32LE(24),input=Float64Array.from({length:original.readUInt32LE(40)/2},(_,i)=>original.readInt16LE(44+i*2)/32768);
function peaking(samples,frequency,q,db){
  const a=10**(db/40),w=2*Math.PI*frequency/rate,alpha=Math.sin(w)/(2*q),cos=Math.cos(w);
  const a0=1+alpha/a,a1=-2*cos/a0,a2=(1-alpha/a)/a0;
  const b0=(1+alpha*a)/a0,b1=-2*cos/a0,b2=(1-alpha*a)/a0;
  const out=new Float64Array(samples.length);let x1=0,x2=0,y1=0,y2=0;
  for(let i=0;i<samples.length;i++){
    const x=samples[i],y=b0*x+b1*x1+b2*x2-a1*y1-a2*y2;
    out[i]=y;x2=x1;x1=x;y2=y1;y1=y;
  }
  return out;
}
const rms=samples=>Math.sqrt(samples.reduce((sum,x)=>sum+x*x,0)/samples.length);
const peak=samples=>samples.reduce((max,x)=>Math.max(max,Math.abs(x)),0);
let solid=peaking(peaking(input,2020,1.3,-11),800,.85,9);
// Equal-energy target, constrained by peak headroom. Never make the revised
// sample louder than the reference to disguise a timbre-only change.
const gain=Math.min(rms(input)/rms(solid),.78/peak(solid));
for(let i=0;i<solid.length;i++){
  const fade=Math.min(1,i/(rate*.00015),(solid.length-1-i)/(rate*.004));solid[i]*=gain*fade;
}
solid[0]=0;solid[solid.length-1]=0;
function encode(samples){
  const out=Buffer.alloc(44+samples.length*2);original.copy(out,0,0,44);
  out.writeUInt32LE(out.length-8,4);out.writeUInt32LE(samples.length*2,40);
  samples.forEach((v,i)=>out.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),44+2*i));return out;
}
const asset=encode(solid);writeFileSync(new URL('dist/assets/audio/pool/ball-clack-a-solid.wav',root),asset);
// Use quantised production PCM for every exported audition/mix.
solid=Float32Array.from({length:solid.length},(_,i)=>asset.readInt16LE(44+i*2)/32768);
const state=poolStart(),shot=poolMove(state,1,360000),events=shot.audioEvents.filter(e=>e.kind==='ball'&&e.time<=100);
const merged=mixImpactSamples(solid,rate,events);
function triplet(sample){
  const data=new Float32Array(Math.ceil(rate*2.05));
  for(const time of [.15,.85,1.55])data.set(sample,Math.round(rate*time));return data;
}
writeFileSync(new URL('docs/verification/pool-hit-A-solid-20261112.wav',root),encode(triplet(solid)));
writeFileSync(new URL('docs/verification/pool-hit-A-solid-merged-20261112.wav',root),encode(triplet(merged)));
function spectrum(samples){
  const energy={body:0,ring:0,treble:0,bass:0};
  for(let f=50;f<=16000;f+=25){let re=0,im=0;
    for(let i=0;i<samples.length;i++){const phase=2*Math.PI*f*i/rate;re+=samples[i]*Math.cos(phase);im+=samples[i]*Math.sin(phase);}
    const band=f<300?'bass':f<1500?'body':f<3000?'ring':'treble';energy[band]+=re*re+im*im;
  }
  const total=Object.values(energy).reduce((sum,e)=>sum+e,0);return Object.fromEntries(Object.entries(energy).map(([key,e])=>[key,+(e/total).toFixed(5)]));
}
const report={source:'ball-clack-a.wav',output:'ball-clack-a-solid.wav',rate,durationMs:solid.length/rate*1000,
  eq:[{frequency:2020,q:1.3,db:-11},{frequency:800,q:.85,db:9}],gain,
  original:{peak:peak(input),rms:rms(input),energy:spectrum(input)},solid:{peak:peak(solid),rms:rms(solid),energy:spectrum(solid),tailRms:rms(solid.slice(Math.round(rate*.03)))},
  merged:{peak:peak(merged),durationMs:merged.length/rate*1000}};
if(!solid.every(Number.isFinite)||peak(solid)>.781||peak(merged)>.86001||rms(solid)>rms(input)*1.001||report.solid.tailRms>.002)throw Error('Audio bounds failed');
writeFileSync(new URL('docs/verification/pool-hit-A-solid-20261112.json',root),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
