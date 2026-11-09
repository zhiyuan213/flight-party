import test from 'node:test';
import assert from 'node:assert/strict';
import {impactSamples,pocketSoundStages,woodRattleContacts} from '../dist/table/pool-audio.js';
import {pocketMotion} from '../dist/table/pool-return.js';
import {TABLE_PAD} from '../dist/table/pool-table.js';

const rate=48000;
const seeded=(s=831)=>()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);
const rms=a=>Math.sqrt(a.reduce((sum,v)=>sum+v*v,0)/a.length);
function bandEnergy(a,from,to){
  let energy=0;
  for(let f=from;f<=to;f+=50){let re=0,im=0;for(let i=0;i<a.length;i++){const p=2*Math.PI*f*i/rate;re+=a[i]*Math.cos(p);im+=a[i]*Math.sin(p);}energy+=re*re+im*im;}
  return energy;
}

test('hard-rubber pocket guard is a short solid impact, distinct from cloth-covered rail',()=>{
  const samples=[.15,.5,1].map(level=>impactSamples('rubber',level,0,rate,seeded()));
  for(const a of samples){
    assert.equal(a.length,rate*.065);assert.equal(a[0],0);assert.equal(a.at(-1),0);
    assert.ok(a.every(v=>Number.isFinite(v)&&Math.abs(v)<1));
    assert.ok(rms(a.slice(rate*.04))<rms(a)*.02,'rubber cannot have a sustained rubbing tail');
    assert.ok(bandEnergy(a,1500,6000)<bandEnergy(a,50,750)*.001,'contact must not sound like treble hiss');
  }
  assert.ok(rms(samples[1])>rms(samples[0])*1.7&&rms(samples[2])>rms(samples[1])*1.4);
  assert.notDeepEqual(samples[1],impactSamples('rubber',.5,0,rate,seeded(954)));
  assert.notDeepEqual(samples[1],impactSamples('rail',.5,0,rate,seeded()));
  assert.deepEqual(samples[1],impactSamples('pocket',.5,0,rate,seeded()),'legacy pocket voice must not retain the old noise burst');
});

test('wooden pocket landing has a low hollow body and finite quiet reflections, without hiss',()=>{
  const samples=[.15,.5,1].map(level=>impactSamples('wood-drop',level,0,rate,seeded()));
  for(const a of samples){
    assert.equal(a.length,rate*.18);assert.equal(a[0],0);assert.equal(a.at(-1),0);
    assert.ok(a.every(v=>Number.isFinite(v)&&Math.abs(v)<1));
    assert.ok(bandEnergy(a,1500,6000)<bandEnergy(a,50,750)*.001,'wooden landing must not have a sandy upper noise bed');
    assert.ok(rms(a.slice(rate*.06,rate*.1))>rms(a)*.05,'short wooden cavity reflection should survive the initial impact');
    assert.ok(rms(a.slice(rate*.15))<rms(a)*.001,'finite reflections must end instead of ringing');
  }
  assert.ok(rms(samples[1])>rms(samples[0])*1.7&&rms(samples[2])>rms(samples[1])*1.4);
  assert.notDeepEqual(samples[1],impactSamples('wood-drop',.5,0,rate,seeded(954)));
  assert.notDeepEqual(samples[1],impactSamples('rubber',.5,0,rate,seeded()));
  assert.notDeepEqual(samples[1],impactSamples('wood-roll',.5,0,rate,seeded()));
});

test('pocket audio follows actual wall contacts, then wooden landing, without compulsory side impacts',()=>{
  const direct=pocketSoundStages({contacts:[],dropAt:420},.5);
  assert.deepEqual(direct,[[420,'drop','wood-drop',.16]],'clean entry must not invent guard contacts');
  const hit=pocketSoundStages({contacts:[{time:82,strength:.7},{time:198,strength:.3}],dropAt:488},.8);
  assert.deepEqual(hit.slice(0,3),[[82,'guard0','rubber',.7],[198,'guard1','rubber',.3],[488,'drop','wood-drop',.256]]);
  const quiet=pocketSoundStages({contacts:[{time:82,strength:.1}],dropAt:488},.15);
  assert.ok(quiet[0][3]<hit[0][3]&&quiet[1][3]<hit[2][3],'both contact and landing follow incoming strength');
});

test('real pocket motion produces one voice per resolved contact and a separate wooden drop',()=>{
  for(const [vx,vy] of [[0,0],[0,-8],[8,-24],[-8,-24]]){
    const item={id:1,holeIndex:1,x:TABLE_PAD+500,y:TABLE_PAD-11,vx,vy,strength:Math.min(1,Math.hypot(vx,vy)/40)};
    const motion=pocketMotion(item),stages=pocketSoundStages(motion,item.strength);
    assert.equal(stages.filter(s=>s[2]==='rubber').length,motion.contacts.length);
    assert.equal(stages.filter(s=>s[2]==='wood-drop').length,1);
    assert.equal(stages.find(s=>s[2]==='wood-drop')[0],motion.dropAt);
    assert.ok(stages.filter(s=>s[2]==='rubber').every((s,i)=>s[0]===motion.contacts[i].time&&s[3]===motion.contacts[i].strength));
    if(!vx&&!vy)assert.equal(stages.length,1,'stationary falling ball must not generate imaginary rubber hits');
  }
});

test('only strong entries add one wooden rebound group after landing, with a smooth threshold',()=>{
  const motion={contacts:[],dropAt:300};
  for(const strength of [0,.15,.5])assert.ok(!pocketSoundStages(motion,strength).some(s=>s[2]==='wood-rattle'));
  const levels=[.5001,.6,.75,1].map(strength=>pocketSoundStages(motion,strength).filter(s=>s[2]==='wood-rattle'));
  assert.ok(levels.every(stages=>stages.length===1&&stages[0][0]===332&&stages[0][1]==='rattle'));
  assert.ok(levels[0][0][3]<.000001,'crossing the strength threshold must not suddenly become loud');
  assert.ok(levels.every((s,i)=>!i||s[0][3]>levels[i-1][0][3]));
  assert.equal(levels.at(-1)[0][3],1);
  assert.ok(pocketSoundStages(motion,1).every(s=>s[2]!=='rubber'),'deep wooden rebounds must not invent gray-guard contacts');
});

test('wooden rebound group has 3–5 distinct knocks that spread out and decay without a friction hiss',()=>{
  assert.deepEqual(woodRattleContacts(0),[]);
  assert.ok(impactSamples('wood-rattle',0,0,rate,seeded()).every(v=>v===0));
  const levels=[.1,.5,1],amplitudes=[];
  for(const level of levels){
    const contacts=woodRattleContacts(level),a=impactSamples('wood-rattle',level,0,rate,seeded());
    assert.ok(contacts.length>=3&&contacts.length<=5);
    assert.ok(contacts.every((hit,i)=>!i||hit.strength<contacts[i-1].strength));
    const gaps=contacts.slice(1).map((hit,i)=>hit.time-contacts[i].time);
    assert.ok(gaps.every((gap,i)=>!i||gap>gaps[i-1]),'successive rebound intervals must lengthen');
    assert.ok(a.length/rate<.4&&a.length/rate>.15);assert.equal(a[0],0);assert.equal(a.at(-1),0);
    assert.ok(a.every(v=>Number.isFinite(v)&&Math.abs(v)<.6));
    assert.ok(bandEnergy(a,1500,6000)<bandEnergy(a,50,750)*.001,'wooden rebounds must not become a bright sand-like texture');
    const hits=contacts.map(hit=>rms(a.slice(Math.round((hit.time/1000+.001)*rate),Math.round((hit.time/1000+.013)*rate))));
    assert.ok(hits.every((peak,i)=>!i||peak<hits[i-1]),'each later knock should be quieter');
    assert.ok(rms(a.slice(-480))<hits[0]*.001,'short cavity reflections must end');
    if(level===1){
      const previous=contacts.at(-2),last=contacts.at(-1),gap=rms(a.slice(Math.round((previous.time/1000+.06)*rate),Math.round((last.time/1000-.005)*rate)));
      assert.ok(gap<hits.at(-1)*.1,'there must be audible separation rather than a continuous rubbing bed');
    }
    amplitudes.push(rms(a));
  }
  assert.deepEqual(levels.map(level=>woodRattleContacts(level).length),[3,4,5]);
  assert.ok(woodRattleContacts(1)[1].time<woodRattleContacts(.1)[1].time,'harder entries begin with a denser rebound cluster');
  assert.ok(amplitudes[1]>amplitudes[0]*2&&amplitudes[2]>amplitudes[1]*1.3);
  assert.notDeepEqual(impactSamples('wood-rattle',.5,0,rate,seeded()),impactSamples('wood-rattle',.5,0,rate,seeded(954)));
});

test('new material voices retain audio unlock, mute, hidden-tab and source cleanup protections',async()=>{
  const originalAudio=globalThis.AudioContext,originalDocument=globalThis.document,sources=[];
  const audio=await import('../dist/table/pool-audio.js?material-gates-test');
  globalThis.AudioContext=class{
    state='running';currentTime=4;sampleRate=48000;destination={};
    createBuffer(_,n){return{getChannelData:()=>new Float32Array(n)};}
    createBufferSource(){const source={connect(){},disconnect(){this.disconnected=true;},start(t){this.started=t;},stop(t){this.ends??=[];this.ends.push(t);}};sources.push(source);return source;}
  };
  try{
    audio.setPoolMuted(false);assert.equal(audio.poolImpact('wood-drop',.5),false);audio.unlockPoolAudio();
    for(const kind of ['rubber','wood-drop','wood-rattle'])assert.equal(audio.poolImpact(kind,.5),true);
    assert.equal(sources.length,3);assert.ok(sources.every(s=>s.started>=4&&s.ends[0]<4.4));
    audio.setPoolMuted(true);assert.equal(audio.poolImpact('wood-drop',.5),false);
    for(const source of sources){assert.equal(source.ends.length,2);source.onended();assert.equal(source.disconnected,true);}
    audio.setPoolMuted(false);globalThis.document={hidden:true};assert.equal(audio.poolImpact('rubber',.5),false);
  }finally{audio.setPoolMuted(false);globalThis.AudioContext=originalAudio;globalThis.document=originalDocument;}
});
