import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('dist/site-audio.js','utf8');
function harness(initial={}){
 const storage=new Map(Object.entries(initial)),events={},sent=[];
 const context=vm.createContext({window:{addEventListener:(k,fn)=>events[k]=fn,dispatchEvent:e=>sent.push(e)},document:{readyState:'loading',addEventListener(){},documentElement:{getAttribute:()=> 'zh'},querySelectorAll:()=>[]},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},CustomEvent:class{constructor(type,init){this.type=type;this.detail=init.detail;}},WeakMap,MutationObserver:class{observe(){}}});
 vm.runInContext(source,context);return {api:context.window.__joyflockAudio,storage,events,sent};
}
test('global sound is one persisted boolean; an explicit value beats historical switches',()=>{
 const h=harness({'joyflock.audio.muted':'false','joyflock.pool.muted':'1','flight-party-prefs':'{"sound":false,"volume":45}'});
 assert.equal(h.api.muted,false);h.api.setMuted(true);assert.equal(h.api.muted,true);assert.equal(h.storage.get('joyflock.audio.muted'),'true');
 h.api.setMuted(false);assert.equal(h.storage.get('joyflock.pool.muted'),'0');assert.equal(JSON.parse(h.storage.get('flight-party-prefs')).volume,45);assert.equal(JSON.parse(h.storage.get('flight-party-prefs')).sound,true);
 assert.throws(()=>h.api.setMuted('false'),/boolean/);assert.equal(h.sent.at(-1).detail.muted,false);
});
test('legacy mute migrates on first use and new output nodes honour mute immediately',()=>{
 const h=harness({'joyflock.pool.muted':'1'});assert.equal(h.api.muted,true);
 const gains=[];const ctx={currentTime:4,destination:{},createGain(){const n={gain:{value:0,cancelScheduledValues(){},setValueAtTime(v){this.value=v;}},connect(){}};gains.push(n);return n;},createDynamicsCompressor(){return {threshold:{},knee:{},ratio:{},attack:{},release:{},connect(){}};}};
 const input=h.api.output(ctx,'ui');assert.equal(input.gain.value,2.2);assert.equal(gains[1].gain.value,0);
 assert.equal(h.api.output(ctx,'ui'),input,'one gate per context/category');
 h.api.setMuted(false);assert.equal(gains[1].gain.value,1);h.api.setMuted(true);assert.equal(gains[1].gain.value,0,'already-playing audio is gated too');
});
test('all live sound engines route through the shared gate',()=>{
 for(const p of ['dist/audio.js','dist/site-hover-sfx.js','dist/site-result-sfx.js','dist/table/pool-audio.js','dist/table/bubbles-audio.js','dist/table/four-audio.js','dist/table/pool-pocket-sfx.js'])assert.match(readFileSync(p,'utf8'),/__joyflockAudio[\s\S]*\.output\(/,p);
 for(const p of ['dist/portal/index.html','dist/table/index.html','dist/index.html','dist/portal/native-table.html','dist/portal/native-flight.html'])assert.match(readFileSync(p,'utf8'),/site-audio\.js\?v=20261115-levels1/,p);
});
