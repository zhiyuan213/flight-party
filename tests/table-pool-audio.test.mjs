import test from 'node:test';
import assert from 'node:assert/strict';
import {poolImpact,unlockPoolAudio,setPoolMuted} from '../dist/table/pool-audio.js';

test('pool audio requires a gesture unlock, respects mute and bounds every source lifetime',()=>{
  const original=globalThis.AudioContext,ends=[];
  const parameter={setValueAtTime(){},exponentialRampToValueAtTime(){},value:0};
  const node=()=>({connect(){},start(){},stop(time){ends.push(time);},gain:parameter,frequency:parameter});
  globalThis.AudioContext=class {state='running';currentTime=10;sampleRate=1000;destination={};createBuffer(_,n){return{getChannelData:()=>new Float32Array(n)};}createBufferSource(){return node();}createBiquadFilter(){return node();}createGain(){return node();}createOscillator(){return node();}};
  try{setPoolMuted(false);assert.equal(poolImpact('ball',1),false);unlockPoolAudio();assert.equal(poolImpact('ball',1),true);assert.equal(ends.length,2);assert.ok(ends.every(t=>t>10&&t<10.2));setPoolMuted(true);assert.equal(poolImpact('cue'),false);assert.equal(ends.length,2);}finally{setPoolMuted(false);globalThis.AudioContext=original;}
});
