import test from 'node:test';
import assert from 'node:assert/strict';
import {poolStart,poolMove} from '../dist/table/pool.js';
import {TABLE_PAD} from '../dist/table/pool-table.js';
import {pocketMotion} from '../dist/table/pool-return.js';
import {impactSamples,pocketSoundStages} from '../dist/table/pool-audio.js';

const rate=48000;
const seeded=(s=831)=>()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);
const rms=a=>a.length?Math.sqrt(a.reduce((s,v)=>s+v*v,0)/a.length):0;
const diffRms=(a,b)=>rms(Float32Array.from({length:Math.min(a.length,b.length)},(_,i)=>a[i]-b[i]));
function band(a,from,to){
  let e=0;
  for(let f=from;f<=to;f+=50){let re=0,im=0;for(let i=0;i<a.length;i++){const p=2*Math.PI*f*i/rate;re+=a[i]*Math.cos(p);im+=a[i]*Math.sin(p);}e+=re*re+im*im;}
  return e;
}
function shot(x,y,angle,power){
  const s=poolStart();for(let i=1;i<16;i++)s.cells[i*3+2]=0;s.cells[0]=x*10;s.cells[1]=y*10;
  const r=poolMove(s,1,power*3600+angle),c=r.audioEvents.find(e=>e.kind==='pocket'),
    f=r.history.map(v=>v.split(',').map(Number)).find(v=>!v[2]);
  return {...c,id:3,start:0,scratch:true,shotPower:power,x:f[0]/10+TABLE_PAD,y:f[1]/10+TABLE_PAD};
}

test('the pocket knock is solid low-frequency wood with only a trace of well echo',()=>{
  const old=impactSamples('rubber',1,0,rate,seeded()),wood=impactSamples('wood-knock',1,0,rate,seeded(),1),
    dry=impactSamples('wood-knock',1,0,rate,seeded(),0);
  const brightness=a=>band(a,800,3000)/band(a,50,650);
  // Still clearly wood rather than the old 260 Hz rubber thud...
  assert.ok(brightness(wood)>brightness(old)*50,`wood mid/low ${brightness(wood).toExponential(2)} vs rubber ${brightness(old).toExponential(2)}`);
  assert.ok(rms(wood)>rms(old)*.8,'the new knock is not quieter than the old thud');
  // ...but the hollow 330 Hz box is gone: low body dominates, upper partials
  // are only a short tap (old voice: low share .58, mid/low .73, 130 ms).
  const low=band(wood,50,300),mid=band(wood,800,3000),high=band(wood,3000,6000);
  assert.ok(low/(low+mid+high)>.85,`low-frequency body must dominate (${(low/(low+mid+high)).toFixed(3)})`);
  assert.ok(mid/low<.2,`upper partials stay a short tap, not a hollow ring (${(mid/low).toFixed(3)})`);
  assert.ok(wood.length/rate>.07&&wood.length/rate<.082,`short well tail (${wood.length/rate}s)`);
  assert.equal(wood[0],0);assert.equal(wood.at(-1),0);
  assert.ok(wood.every(v=>Number.isFinite(v)&&Math.abs(v)<1),'never clips');
  // A little echo really is there, but it is a trace, and it stops quickly.
  const reflection=diffRms(wood,dry);
  assert.ok(reflection>rms(dry)*.02,'there is still a hint of the enclosed well');
  assert.ok(reflection<rms(dry)*.16,`echo is only a trace (${(reflection/rms(dry)).toFixed(3)} of dry)`);
  assert.ok(rms(wood.slice(rate*.055))<rms(wood)*.01,'the well stops within ~55 ms');
  assert.equal(rms(wood.slice(rate*.075)),0,'no long hollow tail after the sample ends');
  const levels=[.15,.5,1].map(level=>impactSamples('wood-knock',level,0,rate,seeded(),1));
  assert.ok(rms(levels[1])>rms(levels[0])*1.6&&rms(levels[2])>rms(levels[1])*1.3,'harder contact is louder');
  assert.notDeepEqual(levels[1],impactSamples('wood-knock',.5,0,rate,seeded(954),1),'timbre varies');
});

test('a full-power eight-hit volley stays thick instead of building a hollow boom',()=>{
  const m=pocketMotion(shot(500,100,2700,100)),stages=pocketSoundStages(m,1);
  const knocks=stages.filter(s=>s[2]==='wood-knock');
  assert.equal(knocks.length,8);
  const first=knocks[0][0],last=knocks.at(-1)[0];
  const mix=new Float32Array(Math.ceil((last+140)/1000*rate));
  knocks.forEach((s,i)=>{
    const a=impactSamples(s[2],s[3],0,rate,seeded(831+i),s[4]),offset=Math.round((s[0]-first)/1000*rate);
    for(let j=0;j<a.length&&offset+j<mix.length;j++)mix[offset+j]+=a[j];
  });
  const hits=rms(mix.slice(0,Math.round((last-first+40)/1000*rate)));
  assert.ok(hits>0,'the volley is audible');
  assert.ok(rms(mix.slice(Math.round((last-first+55)/1000*rate)))<hits*.01,'no resonant cavity tail after the last knock');
  assert.ok(mix.every(v=>Number.isFinite(v)&&Math.abs(v)<3),'eight overlapping wooden knocks never blow up');
});

test('dense volleys shorten the echo; only the final hit has the longer well tail',()=>{
  const short=impactSamples('wood-knock',1,0,rate,seeded(),.35),full=impactSamples('wood-knock',1,0,rate,seeded(),1),
    dry=impactSamples('wood-knock',1,0,rate,seeded(),0);
  assert.ok(short.length<full.length*.75,'a short echo really shortens the sample');
  assert.ok(diffRms(short,dry)<diffRms(full,dry)*.6,'reflection energy is cut inside a dense volley');
  const m=pocketMotion(shot(500,100,2700,100)),st=pocketSoundStages(m,1),knocks=st.filter(s=>s[2]==='wood-knock');
  assert.equal(knocks.length,8,'full power produces eight knocks');
  assert.equal(knocks.at(-1)[4],1);
  assert.ok(knocks.slice(0,-1).every(s=>s[4]<1));
});

test('audio stages match the rendered wall contacts exactly, for both branches and every pocket shape',()=>{
  const cases=[
    ['straight full power',shot(500,100,2700,100)],
    ['straight medium',shot(500,100,2700,70)],
    ['corner full power',shot(100,100,2250,100)],
    ['glancing rattle',shot(410,70,3200,100)],
    ['gentle pot',shot(500,100,2700,30)]
  ];
  for(const [label,item] of cases){
    const m=pocketMotion(item),st=pocketSoundStages(m,item.strength??1),knocks=st.filter(s=>s[2]==='wood-knock');
    assert.equal(knocks.length,m.contacts.length,`${label}: one voice per contact`);
    assert.deepEqual(knocks.map(s=>s[0]),m.contacts.map(c=>c.time),`${label}: exact timestamps`);
    assert.ok(knocks.every((s,i)=>s[3]===Math.min(1,Math.max(0,m.contacts[i].strength))),`${label}: same strengths`);
    assert.ok(!st.some(s=>s[2]==='wood-rattle'),`${label}: no invented rebound group`);
    assert.ok(!st.some(s=>s[2]==='rubber'),`${label}: no muffled guard voice`);
    assert.equal(st.filter(s=>s[2]==='wood-drop').length,1,`${label}: one landing`);
    assert.equal(st.find(s=>s[2]==='wood-drop')[0],m.dropAt,`${label}: landing at dropAt`);
  }
});

test('wooden return rolling is clearly audible, has wood grain, and stays distinct from cloth',()=>{
  const a=impactSamples('wood-roll',.228,0,rate,seeded()),cloth=impactSamples('roll',.228,0,rate,seeded());
  assert.ok(rms(a)>.008,`return roll must be audible (rms ${rms(a).toFixed(4)})`);
  assert.ok(rms(a)>rms(cloth)*2,'the wooden channel is louder than the cloth bed');
  assert.ok(band(a,400,1200)/band(a,50,650)>.002,'wooden grain has mid-band body');
  assert.ok(band(a,1500,6000)<band(a,50,650)*.001,'still not a treble hiss');
  assert.equal(a.length,rate*.22);assert.equal(a[0],0);assert.equal(a.at(-1),0);
  assert.ok(a.every(v=>Number.isFinite(v)&&Math.abs(v)<.16),'soft saturation prevents clipping');
  assert.ok(rms(a.slice(rate*.16,rate*.2))>rms(a)*.02,'the roll sustains into its tail as a continuous rumble');
  const low=impactSamples('wood-roll',.15,0,rate,seeded()),mid=impactSamples('wood-roll',.5,0,rate,seeded()),high=impactSamples('wood-roll',1,0,rate,seeded());
  assert.ok(rms(mid)>rms(low)*1.5&&rms(high)>rms(mid)*1.3,'faster rolling is louder');
  const vis=impactSamples('wood-roll',.152,0,rate,seeded()),hidden=impactSamples('wood-roll',.152*.45,0,rate,seeded());
  assert.ok(rms(vis)>rms(hidden)*1.35,'the exposed slot is louder than the under-table section');
  assert.notDeepEqual(mid,impactSamples('wood-roll',.5,0,rate,seeded(962)),'successive grains vary');
});

test('scheduled stages keep their exact spacing instead of being re-jittered onto one tick',async()=>{
  const originalAudio=globalThis.AudioContext,originalFetch=globalThis.fetch,starts=[];
  globalThis.fetch=async()=>{throw Error('no recording in this test');};
  globalThis.AudioContext=class{
    state='running';currentTime=20;sampleRate=rate;destination={};
    createBuffer(_,n){return{getChannelData:()=>new Float32Array(n)};}
    createBufferSource(){return{connect(){},disconnect(){},start(t){starts.push(t);},stop(){this.onended?.();}};}
  };
  try{
    const audio=await import('../dist/table/pool-audio.js?wood-schedule-test');
    audio.setPoolMuted(false);audio.unlockPoolAudio();
    const m=pocketMotion(shot(500,100,2700,100)),stages=pocketSoundStages(m,1);
    const knocks=stages.filter(s=>s[2]==='wood-knock'),first=knocks[0][0];
    for(const s of knocks)assert.equal(audio.poolImpact(s[2],s[3],0,1,(s[0]-first)/1000,-1,s[4]),true);
    assert.equal(starts.length,8);
    for(let i=0;i<starts.length;i++)
      assert.ok(Math.abs(starts[i]-(20+(knocks[i][0]-first)/1000))<1e-9,`hit ${i} keeps its exact offset`);
  }finally{globalThis.AudioContext=originalAudio;globalThis.fetch=originalFetch;}
});
