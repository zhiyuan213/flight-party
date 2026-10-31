import test from 'node:test';
import assert from 'node:assert/strict';
import {Die3D} from '../dist/die3d.js';
import {quaternionForResult} from '../dist/die-geometry.js';

// Exercise the real lifecycle without a DOM, GPU, or substituted animation logic.
function harness(t,{value=1,reduced=false}={}){
 const jobs=new Map();let nextId=1;
 for(const [name,implementation] of [
  ['requestAnimationFrame',callback=>{const id=nextId++;jobs.set(id,callback);return id;}],
  ['cancelAnimationFrame',id=>jobs.delete(id)],
 ]){
  const previous=Object.getOwnPropertyDescriptor(globalThis,name);
  Object.defineProperty(globalThis,name,{configurable:true,writable:true,value:implementation});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,name,previous);else delete globalThis[name];});
 }
 const die=Object.create(Die3D.prototype);
 Object.assign(die,{value,reduced,pose:quaternionForResult(value),lift:0,squash:0,serial:0,pending:null,drawCount:0,draw(){this.drawCount++;}});
 const frame=offset=>{const callbacks=[...jobs.values()];jobs.clear();const now=performance.now()+offset;callbacks.forEach(callback=>callback(now));};
 return {die,jobs,frame};
}

function assertSettled(die,value){
 assert.equal(die.value,value);
 assert.ok(die.pose.angleTo(quaternionForResult(value))<1e-6,'settled orientation exposes the requested fixed face');
 assert.equal(die.lift,0);assert.equal(die.squash,0);assert.equal(die.pending,null);
}

test('3D rolls animate then settle on each of the six authoritative result faces',async t=>{
 const {die,jobs,frame}=harness(t);
 for(let value=1;value<=6;value++){
  let resolved=false;
  const roll=die.rollTo(value).then(()=>{resolved=true;});
  assert.equal(jobs.size,1);
  frame(250);
  await Promise.resolve();
  assert.equal(resolved,false,'a mid-roll frame must not unblock the next game action');
  assert.ok(die.lift>0,'roll includes actual vertical displacement');
  assert.ok(die.pose.angleTo(quaternionForResult(value))>.05,'rolling mesh orientation differs from its result pose');
  frame(2000);await roll;
  assertSettled(die,value);assert.equal(jobs.size,0,'settled dice do not leave an animation loop running');
 }
});

test('cancelling a roll resolves its wait and stale frames cannot overwrite a later result',async t=>{
 const {die,jobs,frame}=harness(t,{value:3});
 const oldRoll=die.rollTo(6);frame(300);
 const staleFrame=[...jobs.values()][0];
 die.cancel();await oldRoll;
 assertSettled(die,3);assert.equal(jobs.size,0);
 const newRoll=die.rollTo(2);
 staleFrame(performance.now()+2000);
 assert.equal(die.pending.value,2,'old animation must not complete the new request');
 assert.equal(die.value,3);
 frame(2000);await newRoll;
 assertSettled(die,2);assert.equal(jobs.size,0);
});

test('enabling reduced motion during a roll immediately preserves its actual result',async t=>{
 const {die,jobs,frame}=harness(t);
 const roll=die.rollTo(5);frame(240);
 die.setReduced(true);await roll;
 assertSettled(die,5);assert.equal(jobs.size,0);
 await die.rollTo(4);
 assertSettled(die,4);assert.equal(jobs.size,0,'reduced motion schedules no animation');
 die.setReduced(false);
 const next=die.rollTo(6);assert.equal(jobs.size,1);frame(2000);await next;
 assertSettled(die,6);
});

test('invalid die values are rejected without cancelling a valid in-flight result',async t=>{
 const {die,jobs,frame}=harness(t);
 const pending=die.rollTo(3),serial=die.serial;
 for(const value of [0,7,-1,1.5,NaN,Infinity,'4',null,undefined]){
  assert.throws(()=>die.rollTo(value),RangeError);
  assert.throws(()=>die.setValue(value),RangeError);
 }
 assert.equal(die.serial,serial);
 assert.equal(die.pending.value,3);assert.equal(jobs.size,1);
 frame(2000);await pending;assertSettled(die,3);
});
