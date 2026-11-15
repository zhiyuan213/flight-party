import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../dist/table/four-audio.js',import.meta.url),'utf8').replace(/export function /g,'function ');

function harness({shared=true,running=true,parent=false}={}){
  const storage=new Map(),listeners=new Map(),nodes=[],sources=[];let created=0;
  const param=()=>({value:0,changes:[],setValueAtTime(value,at){this.changes.push({value,at,kind:'set'});},
    linearRampToValueAtTime(value,at){this.changes.push({value,at,kind:'linear'});},
    exponentialRampToValueAtTime(value,at){this.changes.push({value,at,kind:'exp'});}});
  const node=type=>{const n={type,connections:[],connect(target){this.connections.push(target);},disconnect(){this.disconnected=true;}};nodes.push(n);return n;};
  const sourceNode=type=>{const n=node(type);n.starts=[];n.stops=[];n.start=(...args)=>n.starts.push(args);n.stop=(...args)=>n.stops.push(args);sources.push(n);return n;};
  const context={state:running?'running':'suspended',sampleRate:8000,currentTime:10,destination:{},resumes:0,
    resume(){this.resumes++;this.state='running';return Promise.resolve();},
    createBuffer(_,length,rate){return {sampleRate:rate,getChannelData:()=>new Float32Array(length)};},
    createGain(){const n=node('gain');n.gain=param();return n;},
    createBiquadFilter(){const n=node('filter');n.frequency=param();n.Q=param();return n;},
    createOscillator(){const n=sourceNode('oscillator');n.frequency=param();return n;},
    createBufferSource(){return sourceNode('noise');}};
  const hover={context,muted:false},document={hidden:false,querySelector:()=>null};
  const window={frames:[],AudioContext:class{constructor(){created++;return context;}},
    addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);}};
  window.top=parent?{frames:[],__joyflockHoverSfx:hover}:window;
  if(shared&&!parent)window.__joyflockHoverSfx=hover;
  const sandbox={window,document,localStorage:{getItem:key=>storage.get(key)||null}};
  runInNewContext(source+'\nglobalThis.api={prepareFourAudio,setFourAudioEnabled,createFourDropSound};',sandbox);
  return {...sandbox.api,context,window,document,hover,nodes,sources,storage,listeners,
    gesture(type='pointerdown'){for(const fn of listeners.get(type)||[])fn();},created:()=>created};
}

test('Foley plays on the current audio clock and each stage is once-only',()=>{
  const h=harness();h.prepareFourAudio();const sound=h.createFourDropSound();
  assert.equal(h.created(),0,'reuse the globally unlocked audio context');
  assert.equal(sound.release(),true);assert.equal(h.sources.length,1);assert.equal(h.sources[0].starts[0][0],10);
  h.context.currentTime=10.36;sound.land();assert.equal(h.sources.length,5);
  assert.ok(h.sources.slice(1).every(node=>node.starts[0][0]===10.36),'contact is immediate, never pre-scheduled from the click');
  assert.equal(sound.land(),false);assert.equal(h.sources.length,5);
  const start=h.nodes.length;h.context.currentTime=10.635;sound.settle();
  assert.equal(h.sources.length,9);assert.ok(h.sources.slice(5).every(node=>node.starts[0][0]===10.635));
  const endpointGains=h.nodes.slice(start).filter(node=>node.gain).flatMap(node=>node.gain.changes.map(change=>change.value));
  assert.ok(Math.max(...endpointGains)<.025,'rebound contact is a quiet residual tap');
  assert.equal(sound.settle(),false);assert.equal(h.sources.length,9);
});

test('all existing global mute preferences and page mute suppress sound without deferred replay',()=>{
  const setups=[h=>h.hover.muted=true,h=>h.document.hidden=true,
    h=>h.storage.set('joyflock.hoverSfx','0'),h=>h.storage.set('joyflock.pool.muted','1'),
    h=>h.storage.set('flight-party-prefs','{"sound":false}'),
    h=>h.document.querySelector=()=>({hidden:false,getAttribute:()=> 'false'}),h=>h.setFourAudioEnabled(false)];
  for(const setup of setups){
    const h=harness();h.prepareFourAudio();setup(h);const sound=h.createFourDropSound();
    assert.equal(sound.land(),false);assert.equal(h.sources.length,0);
    h.hover.muted=false;h.document.hidden=false;h.storage.clear();h.document.querySelector=()=>null;h.setFourAudioEnabled(true);
    assert.equal(sound.land(),false,'past contacts are not replayed after unmuting');assert.equal(h.sources.length,0);
  }
});

test('gesture unlock supports standalone pages and never accumulates historical sound',()=>{
  const h=harness({shared:false,running:false});h.prepareFourAudio();h.prepareFourAudio();
  assert.equal(h.created(),1);assert.equal(h.listeners.get('pointerdown').length,1);
  const past=h.createFourDropSound();assert.equal(past.land(),false);assert.equal(h.sources.length,0);
  h.gesture();assert.equal(h.context.state,'running');assert.equal(h.context.resumes,1);
  assert.equal(past.land(),false);assert.equal(h.sources.length,0);
  assert.equal(h.createFourDropSound().land(),true);assert.equal(h.sources.length,4);
});

test('an already unlocked same-origin parent context works for remote turns in the game frame',()=>{
  const h=harness({parent:true});h.prepareFourAudio();assert.equal(h.created(),0);
  assert.equal(h.createFourDropSound().land(),true);assert.equal(h.sources.length,4);
});

test('cancellation and page mute stop active sources and prevent later stages',()=>{
  const h=harness();h.prepareFourAudio();const first=h.createFourDropSound();first.release();first.land();first.cancel();
  assert.ok(h.sources.every(node=>node.stops.length===2&&node.disconnected),'sources are stopped and detached');
  assert.equal(first.settle(),false);assert.equal(h.sources.length,5);
  const second=h.createFourDropSound();second.land();h.setFourAudioEnabled(false);
  assert.ok(h.sources.every(node=>node.disconnected));assert.equal(second.settle(),false);
  assert.equal(h.storage.size,0,'preview mute cannot rewrite the user preference');
});
