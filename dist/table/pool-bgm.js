/*
 * Pool hall background music - a small library of seamless, procedurally
 * synthesised loops. No audio files are fetched at runtime, so every track
 * follows the same "programmatic audio" approach as pool-audio.js, has no
 * codec/licence dependency and can be verified in plain Node.
 *
 * The player is document-scoped, not screen-scoped: the intro/detail page and
 * the play arena are the same document (table.js only toggles hidden), so the
 * loop started on the detail page keeps running while the player is shooting.
 * Switching tracks crossfades one looping source into the next; it never
 * leaves two beds running.
 */
const TAIL=2.6, XFADE=.025, SYNTH_RATE=22050, TARGET_RMS=.052, WRAP=1.2;
const BASE_GAIN=.16, FADE_IN=1.6, FADE_OUT=.35;
const BGM_KEY='joyflock.pool.bgm', MUTED_KEY='joyflock.pool.muted', TRACK_KEY='joyflock.pool.bgm.track';
const TABLE=4096;
const INHARM=[1,2.002,3.006,4.013];
const SINE=new Float32Array(TABLE+1);
for(let i=0;i<=TABLE;i++)SINE[i]=Math.sin(2*Math.PI*i/TABLE);

const C=(root,...notes)=>({root,notes});
const DM9=C(38,62,65,69,72), Dm7=C(38,62,65,69,72), DmAdd9=C(38,62,65,69,76);
const G13=C(43,59,65,69,76), G7=C(43,59,62,65,71);
const Cmaj9=C(36,64,67,71,74), Cmaj7=C(36,60,64,67,71), Cadd9=C(36,62,64,67,74);
const A7b9=C(45,61,67,70,76), A7=C(45,61,64,67,73), A7sus=C(45,61,64,69,76);
const Bbmaj7=C(34,62,65,69,74), Bb7=C(34,58,62,65,70);
const Fmaj7=C(41,60,64,69,72), Fmaj9=C(41,60,64,69,72);
const Em7=C(40,59,62,64,67), Gm9=C(43,62,65,67,74);

/* ------------------------------------------------------------------ *
 * Track definitions. Everything audible is data here; the synthesiser
 * below is shared, so adding a track never touches the player or the
 * physics/protocol layers.
 * ------------------------------------------------------------------ */
const LOUNGE_CHORDS=[DM9,G13,Cmaj9,A7b9,DM9,G13,{...Cmaj9,alt:{root:45,notes:[61,64,67,73]}},C(38,62,65,69,74)];
const LOUNGE_MELODY=[
 [[.5,69],[1.5,72],[2.75,74]],[[.5,76],[1.75,74],[3,71]],
 [[.25,72],[1.5,74],[2.75,76]],[[.5,73],[1.5,70],[3,69]],
 [[.5,77],[1.5,76],[2.75,74]],[[.25,74],[1.5,71],[3,69]],
 [[.5,71],[1.75,72],[3,73]],[[.5,74],[1.5,69],[3,62]],
];

export const POOL_BGM_TRACKS=[
 {
   id:'tape',name:'慢拍磁带',en:'Tape Deck',key:'D 小调',mood:'lo-fi · 放松 · 最安静',
   description:'68 BPM 的慢拍 lo-fi：电钢和弦只轻轻落一次，软底鼓与沙锤带一点摇摆，低通压暗、加一点磁带饱和。最不抢注意力的一首，适合长时间打球。',
   tags:['慢','暗','低干扰','推荐'],bpm:68,bars:8,seed:20261111,
   chords:[DM9,Bbmaj7,Fmaj7,Cadd9,DM9,Bbmaj7,Gm9,A7sus],
   melody:[[[1.5,74]],[[2.5,72]],[[1,69]],[[2.25,76]],[[1.5,77]],[[2.5,74]],[[1,72]],[[2,69]]],
   compStyle:'sparse',voiceSet:'sparse',bassStyle:'two',
   voice:{pad:.036,comp:.072,lead:.050,bass:.17,compKind:'rhodes',leadKind:'bell',bassKind:'bass'},
   drums:{kick:[0,2],kickAmp:.20,snare:[1,3],snareAmp:.055,hat:true,hatAmp:.020,swing:.14},
   mix:{cutoff:3400,wet:.30,trim:.95,drive:.30,wow:.006},
 },
 {
   id:'bossa',name:'午后 Bossa',en:'Sunday Bossa',key:'D 小调',mood:'bossa · 轻快 · 有阳光',
   description:'96 BPM 的 Bossa Nova：尼龙吉他切分和弦、沙锤与轻底鼓，钢片琴点几个音。五首里最有律动、最明亮，适合想让球厅热闹一点的时候。',
   tags:['轻快','明亮','律动'],bpm:96,bars:8,seed:20261112,
   chords:[Dm7,G7,Cmaj7,A7,Dm7,G7,Em7,A7],
   melody:[[[.5,74],[2.5,77]],[[1,76],[3,71]],[[.5,72],[2.5,76]],[[1,73],[3,69]],
           [[.5,77],[2.5,74]],[[1,71],[3,74]],[[.5,72],[2.5,69]],[[1,73],[3,76]]],
   compStyle:'bossa',voiceSet:'bossa',bassStyle:'bossa',
   voice:{pad:.022,comp:.082,lead:.055,bass:.14,compKind:'guitar',leadKind:'bell',bassKind:'upright'},
   drums:{kick:[0,2],kickAmp:.13,snare:[1,3],snareAmp:.032,hat:true,hatAmp:.026,swing:0},
   mix:{cutoff:7200,wet:.16,trim:1,drive:.12,wow:0},
 },
 {
   id:'felt',name:'呢面余韵',en:'Felt & Wood',key:'D 小调',mood:'ambient · 无鼓 · 极简',
   description:'60 BPM 的氛围铺底：完全没有鼓，只有长和弦垫音、稀疏钢片琴和一条低音。留白最多、最不打断思路，几乎像球厅的环境声。',
   tags:['无鼓','极简','专注'],bpm:60,bars:8,seed:20261113,
   chords:[DmAdd9,Bbmaj7,Fmaj9,Cmaj9,DmAdd9,Bbmaj7,Gm9,A7sus],
   melody:[[[1,74]],[[2,72]],[[1,69]],[[2,76]],[[1,77]],[[2,74]],[[1,72]],[[2,69]]],
   compStyle:'none',voiceSet:'none',bassStyle:'sustained',
   voice:{pad:.052,comp:0,lead:.046,bass:.115,compKind:'guitar',leadKind:'bell',bassKind:'sub'},
   drums:null,
   mix:{cutoff:4800,wet:.45,trim:.9,drive:0,wow:.004},
 },
 {
   id:'warm',name:'暖灯爵士',en:'Warm Lights',key:'D 小调',mood:'jazz · 摇摆 · 温厚',
   description:'76 BPM 的小编制爵士：walking bass 每拍走一个音，切分电钢与刷鼓轻轻摇摆。比原版 lounge 更暖、低频更厚，也更像真的球厅。',
   tags:['爵士','摇摆','厚实'],bpm:76,bars:8,seed:20261114,
   chords:[Dm7,G7,Cmaj7,Cmaj7,Fmaj7,Bb7,Em7,A7],
   melody:[[[.5,72],[2,74]],[[1.5,71],[3,69]],[[.5,76],[2.5,74]],[[1,72],[3,71]],
           [[.5,77],[2,76]],[[1.5,74],[3,72]],[[.5,71],[2,74]],[[1,73],[3,69]]],
   compStyle:'swing',voiceSet:'swing',bassStyle:'walking',
   voice:{pad:.026,comp:.090,lead:.048,bass:.155,compKind:'rhodes',leadKind:'melody',bassKind:'upright'},
   drums:{kick:[0,2],kickAmp:.14,brush:true,brushAmp:.070,swing:.12},
   mix:{cutoff:5600,wet:.24,trim:1,drive:.18,wow:0},
 },
 {
   id:'lounge',name:'夜色球厅（原版）',en:'After Hours (original)',key:'D 小调',mood:'lounge · 原版',
   description:'82 BPM 的 D 小调 lounge 循环，电钢 + 贝斯 + 刷鼓 + 极轻垫音。这是之前那首；保留在这里方便对比，若不喜欢直接选另外四首。',
   tags:['原版','电钢','刷鼓'],bpm:82,bars:8,seed:20261110,
   chords:LOUNGE_CHORDS,melody:LOUNGE_MELODY,
   compStyle:'lounge',voiceSet:'lounge',bassStyle:'lounge',
   voice:{pad:.030,comp:.105,lead:.062,bass:.20,compKind:'rhodes',leadKind:'melody',bassKind:'bass'},
   drums:{kick:[0,2],kickAmp:.30,snare:[1,3],snareAmp:.105,brush:true,brushAmp:.088,swing:0},
   mix:{cutoff:6200,wet:.20,trim:1,drive:0,wow:0},
 },
];
export const DEFAULT_BGM_TRACK='tape';
const TRACK_BY_ID=new Map(POOL_BGM_TRACKS.map(track=>[track.id,track]));
export const poolBgmTrack=id=>TRACK_BY_ID.get(id)||TRACK_BY_ID.get(DEFAULT_BGM_TRACK);
export const poolBgmTrackIds=()=>POOL_BGM_TRACKS.map(track=>track.id);
const timing=track=>{const beat=60/track.bpm,bar=beat*4;return {beat,bar,loop:track.bars*bar};};
const DEFAULT_SCORE=poolBgmTrack(DEFAULT_BGM_TRACK);
export const POOL_BGM_SCORE={bpm:DEFAULT_SCORE.bpm,bars:DEFAULT_SCORE.bars,
  loopSeconds:timing(DEFAULT_SCORE).loop,sampleRate:SYNTH_RATE,baseGain:BASE_GAIN,
  track:DEFAULT_BGM_TRACK,tracks:poolBgmTrackIds()};

/* -------------------------------- synthesiser -------------------------------- */
function seeded(seed){let s=seed>>>0;return()=>((s=Math.imul(s,1664525)+1013904223>>>0)/4294967296);}
const panGains=pan=>[Math.sqrt((1-pan)/2),Math.sqrt((1+pan)/2)];

const VOICES={
  pad:    {harmonics:[1,.24,.09],decay:3.2,attack:.35,release:.6,trem:0,inharm:'detune'},
  rhodes: {harmonics:[1,.33,.12,.05],decay:1.15,attack:.006,release:0,trem:.06,inharm:true},
  melody: {harmonics:[1,.34,.12,.05],decay:.62,attack:.006,release:0,trem:.06,inharm:true},
  bass:   {harmonics:[1,.18,.06],decay:.42,attack:.006,release:0,trem:0,inharm:true},
  upright:{harmonics:[1,.12,.04],decay:.30,attack:.004,release:0,trem:0,inharm:true},
  guitar: {harmonics:[1,.42,.18,.07],decay:.55,attack:.003,release:0,trem:0,inharm:'mild'},
  bell:   {harmonics:[1,.34,.12,.05],decay:1.45,attack:.004,release:0,trem:.04,inharm:true},
  sub:    {harmonics:[1,.1],decay:1.6,attack:.25,release:.6,trem:0,inharm:true},
};
const COMP={
  lounge:bar=>bar%2?[.25,2.25]:[0,2.5],
  sparse:()=>[0],
  bossa:()=>[0,.75,1.5,2.25,3],
  swing:()=>[.5,2.25],
  none:()=>[],
};

function addNote(st,start,dur,midi,amp,pan,kind){
  const {L,R,len,sr}=st,voice=VOICES[kind]||VOICES.rhodes;
  const s0=Math.round(start*sr);
  if(s0>=len||s0<0||amp<=0)return;
  const count=Math.min(Math.round(dur*sr),len-s0);
  if(count<=0)return;
  const harmonics=voice.harmonics,step=440*Math.pow(2,(midi-69)/12)*TABLE/sr;
  const [gl,gr]=panGains(pan),jitter=st.rnd()*TABLE;
  // Envelopes and tremolo are recursions, not per-sample Math.exp/Math.sin:
  // rendering a whole 30 s loop costs well under one frame of main thread.
  const decayMul=Math.exp(-1/(voice.decay*sr)),invAttack=1/(voice.attack*sr);
  const invRelease=voice.release?1/(voice.release*sr):0;
  const tremStep=4.6*TABLE/sr,inharm=voice.inharm;
  let phase=0,envelope=1,tremPhase=0;
  for(let i=0;i<count;i++){
    const attackGain=i*invAttack<1?i*invAttack:1;
    const release=invRelease?(count-i)*invRelease<1?(count-i)*invRelease:1:1;
    const env=attackGain*envelope*release;
    let wave=0;
    for(let h=0;h<harmonics.length;h++){
      const factor=inharm===true?INHARM[h]:inharm==='detune'?1.0015:inharm==='mild'?1.0004:1;
      const ph=(jitter+phase*(h+1)*factor)%TABLE;
      const ix=ph|0,frac=ph-ix;
      wave+=harmonics[h]*(SINE[ix]+(SINE[ix+1]-SINE[ix])*frac);
    }
    phase+=step;if(phase>=TABLE)phase-=TABLE;
    envelope*=decayMul;
    let trem=1;
    if(voice.trem){trem=1+voice.trem*SINE[tremPhase|0];tremPhase+=tremStep;if(tremPhase>=TABLE)tremPhase-=TABLE;}
    const v=wave*env*trem;
    L[s0+i]+=v*gl*amp;R[s0+i]+=v*gr*amp;
  }
}
function addKick(st,start,amp){
  const {L,R,len,sr}=st,s0=Math.round(start*sr),count=Math.min(Math.round(.28*sr),len-s0);
  let phase=0;
  for(let i=0;i<count;i++){
    const t=i/sr;
    phase+=(48+65*Math.exp(-t/.035))*TABLE/sr;if(phase>=TABLE)phase-=TABLE;
    const ix=phase|0,frac=phase-ix;
    const v=(SINE[ix]+(SINE[ix+1]-SINE[ix])*frac)*amp*Math.exp(-t/.11)*Math.min(1,t/.002);
    L[s0+i]+=v;R[s0+i]+=v;
  }
}
function addNoise(st,start,amp,decay,cut,pan){
  const {L,R,len,sr,rnd}=st,s0=Math.round(start*sr);
  const count=Math.min(Math.round(Math.max(.16,decay*5)*sr),len-s0);
  if(count<=0||amp<=0)return;
  const [gl,gr]=panGains(pan);let low=0;
  for(let i=0;i<count;i++){
    const t=i/sr,white=rnd()*2-1;
    low+=cut*(white-low);
    const v=(white-low)*amp*Math.exp(-t/decay)*Math.min(1,t/.001);
    L[s0+i]+=v*gl;R[s0+i]+=v*gr;
  }
}
function renderDrums(st,t0){
  const d=st.track.drums;if(!d)return;
  const {beat}=st;
  for(let b=0;b<4;b++){
    const t=t0+b*beat;
    if(d.kick?.includes(b))addKick(st,t,d.kickAmp??.25);
    if(d.snare?.includes(b))addNoise(st,t,d.snareAmp??.09,.075,.16,.08);
    if(d.brush){
      addNoise(st,t,d.brushAmp*(b%2?.66:1),.032,.58,-.18);
      addNoise(st,t+(.62+(d.swing||0)*.4)*beat,d.brushAmp*.52,.028,.62,.22);
    }
    if(d.hat){
      addNoise(st,t,d.hatAmp,.014,.88,.30);
      addNoise(st,t+(.5+(d.swing||0))*beat,d.hatAmp*.72,.012,.9,-.26);
    }
  }
}
function renderBar(st,bar){
  const {track,beat,bar:BAR}=st,t0=bar*BAR;
  const chord=track.chords[bar%track.chords.length],v=track.voice;
  // In the last bar let the sustained voices ring past the loop point. Their
  // tail is folded back into the opening 25 ms by finishLoop(), so the join
  // carries sound on both sides instead of a short silence before bar one.
  const wrap=bar===track.bars-1?WRAP:0;
  for(let k=0;k<4;k++)addNote(st,t0,BAR*.98+wrap,chord.notes[k],v.pad,((chord.notes[k]%3)-1)*.22,'pad');
  const hits=(COMP[track.compStyle]||COMP.sparse)(bar);
  hits.forEach((hit,i)=>{
    let notes;
    if(i===1&&chord.alt)notes=chord.alt.notes;
    else if(track.voiceSet==='bossa')notes=[chord.notes[i%4],chord.notes[(i+2)%4]];
    else if(track.voiceSet==='sparse')notes=chord.notes.slice(0,3);
    else if(track.voiceSet==='swing')notes=chord.notes.slice(1,4);
    else notes=i?chord.notes.slice(1,4):chord.notes;
    for(const midi of notes)addNote(st,t0+hit*beat,1.7,midi,v.comp,((midi%4)-1.5)*.1,v.compKind);
  });
  for(const [at,midi] of track.melody[bar%track.melody.length])
    addNote(st,t0+at*beat,.95,midi,v.lead,.12,v.leadKind);
  const style=track.bassStyle;
  if(style==='walking'){
    for(let b=0;b<4;b++)addNote(st,t0+b*beat,.70,chord.root+[0,7,12,7][b],v.bass,0,v.bassKind);
  }else if(style==='sustained'){
    addNote(st,t0,BAR*.9+wrap,chord.root,v.bass,0,v.bassKind);
    if(wrap)addNote(st,t0+3*beat,1.4,chord.notes[3]+12,.030,.18,'bell');
  }else if(style==='bossa'){
    addNote(st,t0,.8,chord.root,v.bass,0,v.bassKind);
    addNote(st,t0+2*beat,.6,chord.root+7,v.bass*.8,0,v.bassKind);
  }else{
    addNote(st,t0,.78,chord.root,v.bass,0,v.bassKind);
    addNote(st,t0+2.5*beat,.5,chord.alt?chord.alt.root:chord.root+7,v.bass*.65,0,v.bassKind);
    if(bar%4===3)addNote(st,t0+3.5*beat,.42,chord.root+10,v.bass*.5,0,v.bassKind);
  }
  renderDrums(st,t0);
}
function finishLoop(st){
  const {L,R,n,sr,track,loop}=st;
  const outL=new Float32Array(n),outR=new Float32Array(n),xf=Math.max(1,Math.round(XFADE*sr));
  for(let i=0;i<n;i++){outL[i]=L[i];outR[i]=R[i];}
  // The tail beyond the loop point is folded back into the first 25 ms, so the
  // last sample joins the first without a click and every voice keeps its tail.
  for(let i=0;i<xf;i++){
    const a=i/xf;
    outL[i]=L[i]*a+L[n+i]*(1-a);
    outR[i]=R[i]*a+R[n+i]*(1-a);
  }
  const drive=track.mix.drive||0,wow=track.mix.wow||0;
  if(drive||wow){
    // tanh(k*x)/k keeps quiet passages at their original level and only
    // rounds the peaks, so saturation never clips or makes the bed louder.
    const k=1+drive*2;
    for(let i=0;i<n;i++){
      // An integer number of wow cycles keeps the loop point in phase.
      const wobble=wow?1+wow*SINE[Math.round(3*i/n*TABLE)%TABLE]:1;
      if(drive){outL[i]=Math.tanh(outL[i]*k)/k*wobble;outR[i]=Math.tanh(outR[i]*k)/k*wobble;}
      else{outL[i]*=wobble;outR[i]*=wobble;}
    }
  }
  // Loudness-match every track to the same RMS, capped by the headroom limit.
  // Without this an ambient bed is half as loud as the lounge loop, so simply
  // choosing another track would feel like the volume knob moved.
  let peak=0,energy=0;
  for(let i=0;i<n;i++){
    const a=Math.abs(outL[i]),b=Math.abs(outR[i]);
    peak=Math.max(peak,a,b);energy+=outL[i]*outL[i]+outR[i]*outR[i];
  }
  const rms=Math.sqrt(energy/(2*n)),scale=Math.min(TARGET_RMS/(rms||1),.82/(peak||1));
  if(Math.abs(scale-1)>1e-6)for(let i=0;i<n;i++){outL[i]*=scale;outR[i]*=scale;}
  // Fold the last 2 ms towards the first sample. The wrapped tail already
  // supplies the material at the join, but a hi-hat noise grain can still
  // leave a one-sample step; easing into sample 0 removes the click.
  const edge=Math.max(2,Math.round(.002*sr));
  for(let i=0;i<edge;i++){
    const j=n-edge+i,u=(i+1)/edge;
    outL[j]=outL[j]*(1-u)+outL[0]*u;outR[j]=outR[j]*(1-u)+outR[0]*u;
  }
  return {left:outL,right:outR,sampleRate:sr,duration:loop,bpm:track.bpm,bars:track.bars,
    track:track.id,peak:Math.min(peak*scale,.82)};
}
function renderState(sampleRate,trackId){
  const track=poolBgmTrack(trackId),sr=Math.max(8000,Math.round(sampleRate)),{beat,bar,loop}=timing(track);
  const n=Math.round(loop*sr),len=n+Math.ceil(TAIL*sr);
  return {track,sr,n,len,beat,bar,loop,L:new Float64Array(len),R:new Float64Array(len),rnd:seeded(track.seed)};
}
/** Pure, deterministic PCM builder (one synchronous call, used by the tests). */
export function buildPoolBgm(sampleRate=SYNTH_RATE,trackId=DEFAULT_BGM_TRACK){
  const st=renderState(sampleRate,trackId);
  for(let bar=0;bar<st.track.bars;bar++)renderBar(st,bar);
  return finishLoop(st);
}
/**
 * Same PCM, one bar per task: the first frame of the detail page is never
 * blocked by the waveform maths, and the music fades in as soon as the loop
 * is ready. Yields are ordered, so the seeded PRNG stays in step and the
 * result is byte-identical to buildPoolBgm().
 */
export async function buildPoolBgmAsync(sampleRate=SYNTH_RATE,trackId=DEFAULT_BGM_TRACK){
  const st=renderState(sampleRate,trackId);
  for(let bar=0;bar<st.track.bars;bar++){
    renderBar(st,bar);
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  return finishLoop(st);
}

/* ------------------------------- player -------------------------------- */
let started=false,musicOn=true,sfxMuted=false,hidden=false,unlocked=false;
let ctx=null,graph=null,graphTrack=null,building=null,buildingTrack=null;
let source=null,button=null,stopTimer=null,volume=1,startedAt=0,bound=false,trackId=DEFAULT_BGM_TRACK,
  renderToken=0,everGraph=false;
const level=()=>BASE_GAIN*(poolBgmTrack(trackId).mix.trim??1)*volume;
const isBrowser=()=>typeof window!=='undefined'&&typeof document!=='undefined';
function readPrefs(){
  try{musicOn=localStorage.getItem(BGM_KEY)!=='0';}catch{musicOn=true;}
  sfxMuted=readSfxMuted();
  trackId=readTrack();
}
function readSfxMuted(){try{return localStorage.getItem(MUTED_KEY)==='1';}catch{return false;}}
function readTrack(){try{const id=localStorage.getItem(TRACK_KEY);return TRACK_BY_ID.has(id)?id:DEFAULT_BGM_TRACK;}catch{return DEFAULT_BGM_TRACK;}}
function savePref(){try{localStorage.setItem(BGM_KEY,musicOn?'1':'0');}catch{}}
function saveTrack(){try{localStorage.setItem(TRACK_KEY,trackId);}catch{}}

function impulse(context){
  const sr=context.sampleRate,n=Math.round(sr*.9),buf=context.createBuffer(2,n,sr),rnd=seeded(90210);
  for(let c=0;c<2;c++){
    const data=buf.getChannelData(c);let low=0;
    for(let i=0;i<n;i++){
      const t=i/sr;
      low+=.42*((rnd()*2-1)-low);
      data[i]=low*Math.exp(-t/.22)*(1-Math.exp(-t/.006));
    }
  }
  return buf;
}
function buildGraph(context,data,track){
  const buffer=context.createBuffer(2,data.left.length,data.sampleRate);
  buffer.copyToChannel(data.left,0);buffer.copyToChannel(data.right,1);
  const tone=context.createBiquadFilter();tone.type='lowpass';tone.frequency.value=track.mix.cutoff;tone.Q.value=.4;
  const gain=context.createGain();gain.gain.value=0;
  const dry=context.createGain();dry.gain.value=.9;
  const wet=context.createGain();wet.gain.value=track.mix.wet;
  const room=context.createConvolver();room.buffer=impulse(context);
  tone.connect(gain);gain.connect(dry);dry.connect(context.destination);
  gain.connect(room);room.connect(wet);wet.connect(context.destination);
  return {buffer,tone,gain,dry,wet,room};
}
function rampTo(value,seconds,target=graph){
  if(!ctx||!target)return;
  const p=target.gain.gain,now=ctx.currentTime,from=Math.max(0,Math.min(1,p.value||0));
  p.cancelScheduledValues(now);p.setValueAtTime(from,now);p.linearRampToValueAtTime(value,now+seconds);
}
function launchSource(fade=FADE_IN){
  if(source||!ctx||!graph)return;
  source=ctx.createBufferSource();source.buffer=graph.buffer;source.loop=true;source.connect(graph.tone);
  startedAt=ctx.currentTime;source.start();
  rampTo(level(),fade);
}
function retireSource(){
  if(!source)return;
  const dying=source,old=graph;source=null;
  rampTo(0,FADE_OUT,old);
  clearTimeout(stopTimer);
  stopTimer=setTimeout(()=>{
    try{dying.stop();dying.disconnect();}catch{}
    if(old&&old!==graph)for(const key of ['tone','gain','dry','wet','room'])try{old[key]?.disconnect?.();}catch{}
  },FADE_OUT*1000+80);
}
function apply(fade=FADE_IN){
  if(!ctx||!graph)return;
  const want=musicOn&&!sfxMuted&&!hidden&&unlocked;
  if(want){
    if(ctx.state==='suspended')ctx.resume().catch(()=>{});
    if(source)rampTo(level(),.4);else launchSource(fade);
  }else if(source)retireSource();
  updateButton();
}
/** Render (or re-render) the current track and crossfade the looping source. */
function ensureGraph(){
  if(!ctx)return;
  if(graph&&graphTrack===trackId)return;
  if(building&&buildingTrack===trackId)return;
  const id=trackId,token=++renderToken;
  buildingTrack=id;
  building=buildPoolBgmAsync(SYNTH_RATE,id).then(data=>{
    if(token!==renderToken)return;             // a newer selection won the race
    building=null;buildingTrack=null;
    if(!ctx||id!==trackId)return;
    const first=!everGraph;
    if(source)retireSource();                  // fade the old bed out
    graph=buildGraph(ctx,data,poolBgmTrack(id));graphTrack=id;everGraph=true;
    apply(first?FADE_IN:.8);                   // switching fades in faster than a cold start
  }).catch(()=>{if(token===renderToken){building=null;buildingTrack=null;}});
}

/** Create/resume the AudioContext. Called on load and after any user gesture. */
export function unlockPoolBgm(){
  if(!started||!isBrowser())return false;
  try{
    if(!ctx){
      const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
      if(!Audio)return false;
      ctx=new Audio();
    }
    ensureGraph();
    const check=()=>{unlocked=ctx?.state==='running';apply();};
    if(ctx.state==='suspended')ctx.resume().then(check,check);else check();
    setTimeout(check,120);
    return true;
  }catch{return false;}
}
export function setPoolBgmEnabled(value){
  musicOn=!!value;savePref();
  if(musicOn&&!unlocked)unlockPoolBgm();
  apply();
  return musicOn;
}
export const poolBgmEnabled=()=>musicOn;
/** Relative trim for the music bus (0..1); impacts keep their own level. */
export function setPoolBgmVolume(value){
  volume=Math.max(0,Math.min(1,Number(value)||0));
  if(source)rampTo(level(),.12);
  return volume;
}
export const poolBgmVolume=()=>volume;
export const poolBgmPosition=()=>source&&ctx?(ctx.currentTime-startedAt)%timing(poolBgmTrack(trackId)).loop:0;
/** The track persisted for the game pages (falls back to the default).
 *  This is the saved choice, not the currently previewed track: previews use
 *  persist:false and are visible only through poolBgmState().track. */
export const getPoolBgmTrack=()=>readTrack();
/**
 * Select a track. `persist:false` previews it in this document only; the game
 * keeps the previously chosen default. Switching while playing crossfades.
 */
export function setPoolBgmTrack(id,{persist=true}={}){
  if(!TRACK_BY_ID.has(id))return trackId;
  const changed=id!==trackId;
  trackId=id;
  if(persist)saveTrack();
  if(changed&&ctx)ensureGraph();
  updateButton();
  return trackId;
}
export const previewPoolBgmTrack=id=>setPoolBgmTrack(id,{persist:false});
export function poolBgmState(){
  const track=poolBgmTrack(trackId);
  return {started,unlocked,musicOn,sfxMuted,hidden,playing:!!source,volume,
    track:trackId,tracks:poolBgmTrackIds(),defaultTrack:DEFAULT_BGM_TRACK,
    contextState:ctx?.state||'none',loopSeconds:timing(track).loop,bpm:track.bpm,bars:track.bars,
    baseGain:BASE_GAIN};
}
export function stopPoolBgm(){
  hidden=true;apply();started=false;
  return true;
}

function updateButton(){
  if(!button)return;
  const active=musicOn&&!sfxMuted,track=poolBgmTrack(trackId);
  button.setAttribute('aria-pressed',String(active));
  button.textContent='♫';
  button.style.opacity=active?'.92':'.42';
  button.style.textDecoration=active?'none':'line-through';
  button.title=unlocked?(active?`背景音乐：${track.name}（点击关闭 · 双击换曲）`:'背景音乐：关（点击开启 · 双击换曲）'):'点击开启背景音乐（双击可换曲）';
  button.setAttribute('aria-label',button.title);
}
function mountButton(){
  if(button)return;
  const node=document.createElement('button');
  node.type='button';node.className='pool-bgm-toggle';
  Object.assign(node.style,{position:'fixed',left:'14px',bottom:'14px',width:'36px',height:'36px',
    padding:'0',borderRadius:'50%',border:'1px solid rgba(170,205,235,.38)',
    background:'rgba(16,28,42,.72)',color:'#d5e8f7',fontSize:'17px',lineHeight:'34px',
    textAlign:'center',cursor:'pointer',zIndex:'9999',backdropFilter:'blur(6px)',
    boxShadow:'0 2px 10px rgba(0,0,0,.28)',userSelect:'none',transition:'opacity .2s'});
  node.addEventListener('click',event=>{
    event.stopPropagation();
    setPoolBgmEnabled(!musicOn);
    if(musicOn)unlockPoolBgm();
  });
  // A quiet shortcut so the player can change the mood without leaving the
  // arena; the two clicks of a double click cancel each other's toggle.
  node.addEventListener('dblclick',event=>{
    event.preventDefault();event.stopPropagation();
    try{window.open('/pool-bgm-select.html','_blank','noopener');}catch{}
  });
  document.body.append(node);button=node;updateButton();
}
function bindEvents(){
  if(bound)return;bound=true;
  const wake=()=>{if(!unlocked)unlockPoolBgm();};
  for(const name of ['pointerdown','keydown','touchstart'])document.addEventListener(name,wake,{capture:true,passive:true});
  document.addEventListener('visibilitychange',()=>{
    hidden=!!document.hidden;
    if(hidden){
      apply();
      setTimeout(()=>{if(hidden&&ctx?.state==='running')ctx.suspend().catch(()=>{});},FADE_OUT*1000+120);
    }else{
      sfxMuted=readSfxMuted();
      if(ctx?.state==='suspended')ctx.resume().catch(()=>{});
      apply();
    }
  });
  window.addEventListener('pagehide',()=>{hidden=true;apply();});
  window.addEventListener('message',event=>{
    if(event.source===window.parent&&event.data?.type==='joyflock:hello')unlockPoolBgm();
  });
  // The existing .pool-sound button mutes the impact effects. Keep the music
  // in step with it without editing pool-view.js: delegate on document and
  // read the persisted flag after its own handler has run.
  document.addEventListener('click',event=>{
    if(event.target?.closest?.('.pool-sound'))setTimeout(()=>{sfxMuted=readSfxMuted();apply();},0);
  },true);
  window.addEventListener('storage',event=>{
    if(event.key===BGM_KEY){musicOn=localStorage.getItem(BGM_KEY)!=='0';apply();}
    if(event.key===MUTED_KEY){sfxMuted=readSfxMuted();apply();}
    if(event.key===TRACK_KEY){
      const id=readTrack();
      if(id!==trackId){trackId=id;if(ctx)ensureGraph();updateButton();}
    }
  });
}

/**
 * Start the page-scoped player. Idempotent: entering the arena does not call
 * it again, so the loop never restarts or doubles up mid-shot.
 */
export function startPoolBgm(options={}){
  if(!isBrowser())return false;
  if(started)return true;
  started=true;
  readPrefs();hidden=!!document.hidden;
  if(options.track&&TRACK_BY_ID.has(options.track))trackId=options.track;
  if(options.button!==false)mountButton();
  bindEvents();
  const boot=()=>unlockPoolBgm();
  if(globalThis.requestIdleCallback)globalThis.requestIdleCallback(boot,{timeout:800});
  else setTimeout(boot,30);
  return true;
}

// The game detail page is table/index.html?game=pool (also used for snooker).
// Loading that document starts the music; the arena is a screen toggle inside
// the same document, so nothing has to be restarted when a shot is played.
if(isBrowser()){
  const game=new URLSearchParams(window.location.search).get('game');
  if(game==='pool'||game==='snooker'){
    const boot=()=>startPoolBgm();
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
    else boot();
  }
}
