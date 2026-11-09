import {impactSamples} from '../../dist/table/pool-audio.js';
import {writeFileSync} from 'node:fs';
const rate=48000,pcm=new Float32Array(rate*6);
for(const [t,kind,level] of [[.3,'ball',.15],[1.1,'ball',.5],[1.9,'ball',1],[2.7,'cue',.7],[3.5,'rail',.7],[4.3,'pocket',.6]]){const s=impactSamples(kind,level,0,rate);pcm.set(s,Math.floor(t*rate));}
const out=Buffer.alloc(44+pcm.length*2);out.write('RIFF');out.writeUInt32LE(out.length-8,4);out.write('WAVEfmt ',8);out.writeUInt32LE(16,16);out.writeUInt16LE(1,20);out.writeUInt16LE(1,22);out.writeUInt32LE(rate,24);out.writeUInt32LE(rate*2,28);out.writeUInt16LE(2,32);out.writeUInt16LE(16,34);out.write('data',36);out.writeUInt32LE(pcm.length*2,40);pcm.forEach((v,i)=>out.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),44+i*2));writeFileSync(new URL('./pool-resin-audition.wav',import.meta.url),out);
