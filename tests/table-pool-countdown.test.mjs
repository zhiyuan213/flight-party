import test from 'node:test';
import assert from 'node:assert/strict';
import {countdownPhase,updatePoolCountdown,cancelPoolCountdown} from '../dist/table/pool-countdown.js';
import {unlockPoolAudio,setPoolMuted,countdownSamples} from '../dist/table/pool-audio.js?v=20261106-ui2';

test('countdown exposes 3,2,1,GO with an exact opening deadline and no late-join GO',()=>{
 assert.equal(countdownPhase(3000,0),'3');assert.equal(countdownPhase(3000,1000),'2');assert.equal(countdownPhase(3000,2000),'1');
 assert.equal(countdownPhase(3000,3000,true),'GO');assert.equal(countdownPhase(3000,3449,true),'GO');assert.equal(countdownPhase(3000,3450,true),null);
 assert.equal(countdownPhase(3000,3001,false),null);assert.equal(countdownPhase(0,0,true),null);
});
test('stages sound once, repeated renders preserve the deadline, and cancellation stops callbacks',()=>{
 const originals={now:Date.now,raf:globalThis.requestAnimationFrame,caf:globalThis.cancelAnimationFrame,audio:globalThis.AudioContext};
 let now=0,id=0,starts=0,animations=0,updates=0;const frames=new Map();
 Date.now=()=>now;globalThis.requestAnimationFrame=f=>{frames.set(++id,f);return id};globalThis.cancelAnimationFrame=id=>frames.delete(id);
 globalThis.AudioContext=class{state='running';currentTime=0;sampleRate=1000;destination={};createBuffer(_,n){return{getChannelData:()=>new Float32Array(n)}}createBufferSource(){return{connect(){},start(){starts++},stop(){},disconnect(){}}}};
 const label={textContent:'',animate(){animations++;return{cancel(){}}}},caption={textContent:''};const element={hidden:true,style:{},dataset:{},querySelector:s=>s==='b'?label:caption},host={isConnected:true};
 const advance=time=>{now=time;const work=[...frames.values()];frames.clear();for(const fn of work)fn()};
 try{
  unlockPoolAudio();setPoolMuted(false);updatePoolCountdown(host,element,3000,0,()=>updates++);assert.equal(label.textContent,'3');assert.equal(starts,1);
  updatePoolCountdown(host,element,3000,0,()=>updates++);assert.equal(starts,1);assert.equal(frames.size,1);
  advance(1000);assert.equal(label.textContent,'2');advance(2000);assert.equal(label.textContent,'1');advance(3000);assert.equal(label.textContent,'GO');assert.equal(element.style.pointerEvents,'none');
  assert.equal(starts,4);assert.equal(animations,4);advance(3450);assert.equal(element.hidden,true);assert.equal(frames.size,0);
  updatePoolCountdown(host,element,3000);assert.equal(starts,4);updatePoolCountdown(host,element,6000);assert.equal(frames.size,1);cancelPoolCountdown(host);assert.equal(frames.size,0);assert.equal(element.hidden,true);
  now=7000;updatePoolCountdown(host,element,6900);assert.equal(element.hidden,true);assert.equal(frames.size,0);assert.equal(starts,5);
 }finally{Date.now=originals.now;globalThis.requestAnimationFrame=originals.raf;globalThis.cancelAnimationFrame=originals.caf;globalThis.AudioContext=originals.audio;setPoolMuted(false)}
});
test('countdown audio has separate bounded tick/GO envelopes without a lingering tail',()=>{
 for(const stage of ['3','2','1','GO']){const a=countdownSamples(stage);assert.equal(a[0],0);assert.equal(a.at(-1),0);assert.equal(a.length,Math.ceil((stage==='GO'?.52:.105)*48000));assert.ok(a.every(v=>Number.isFinite(v)&&Math.abs(v)<.2))}
 assert.notEqual(countdownSamples('1').length,countdownSamples('GO').length);
 const go=countdownSamples('GO'),rms=a=>Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length);
 assert.ok(rms(go.slice(48000*.34,48000*.42))>.005,'the extended GO must remain audible beyond its previous end');
 assert.ok(rms(go.slice(-480))<rms(go.slice(4800,9600))*.001,'the longer GO must still fade to silence');
});
