// Offline preview of the re-voiced wooden return-channel roll. Node only;
// the runtime stays buildless. Writes one mono PCM16 WAV that plays the new
// wood-roll grain repeatedly at the in-game visible-channel cadence (every
// 90 ms), so the file is easy to audition without loading the table page.
import {writeFileSync} from 'node:fs';
import {impactSamples} from '../dist/table/pool-audio.js';
const root=new URL('../',import.meta.url);
const rate=48000;
const seeded=(s=831)=>()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);
const grain=impactSamples('wood-roll',.228,0,rate,seeded());
const data=new Float32Array(Math.ceil(rate*2.1));
for(let i=0;i<20;i++){
  const offset=Math.round(rate*(i*.09));
  for(let k=0;k<grain.length&&offset+k<data.length;k++)data[offset+k]+=grain[k];
}
let peak=0;for(const v of data)peak=Math.max(peak,Math.abs(v));
const gain=Math.min(12,.62/peak); // normalise to a comfortable audition level
for(let i=0;i<data.length;i++)data[i]=Math.max(-1,Math.min(1,data[i]*gain));
function encode(samples){
  const out=Buffer.alloc(44+samples.length*2);
  out.write('RIFF',0);out.writeUInt32LE(out.length-8,4);out.write('WAVE',8);out.write('fmt ',12);
  out.writeUInt32LE(16,16);out.writeUInt16LE(1,20);out.writeUInt16LE(1,22);
  out.writeUInt32LE(rate,24);out.writeUInt32LE(rate*2,28);out.writeUInt16LE(2,32);out.writeUInt16LE(16,34);
  out.write('data',36);out.writeUInt32LE(samples.length*2,40);
  samples.forEach((v,i)=>out.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),44+2*i));
  return out;
}
const path=new URL('docs/verification/pool-wood-roll-20261114.wav',root);
writeFileSync(path,encode(data));
console.log('wrote',path.pathname,'('+Math.round(data.length/rate*1000)+'ms)');
