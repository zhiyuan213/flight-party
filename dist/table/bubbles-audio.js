/* Synthesised sound for Bubble Duel. No external assets: every effect is an
 * oscillator / noise burst shaped in WebAudio, so it works offline and stays
 * vendored like the rest of the prototype. A single shared context is lazily
 * created on the first unlock (a user gesture) and reused by both the arcade
 * page and the room shell. */

let ctx=null,master=null,muted=false;

function ensure(){
  if(ctx)return true;
  try{
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return false;
    ctx=new AC();
    master=ctx.createGain();master.gain.value=.5;
    const comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-16;comp.ratio.value=3;
    master.connect(comp);comp.connect(globalThis.__joyflockAudio?globalThis.__joyflockAudio.output(ctx,'bubbles'):ctx.destination);
    return true;
  }catch{return false;}
}
export function unlockBubblesAudio(){
  if(!ensure())return;
  if(ctx.state==='suspended')ctx.resume().catch(()=>{});
}
export function setBubblesMuted(on){muted=!!on;globalThis.__joyflockAudio?.setMuted(muted);}
export function bubblesMuted(){return globalThis.__joyflockAudio?.muted??muted;}

function tone({freq,end=null,dur=.12,type='sine',delay=0,gain=.12,curve='exp'}){
  if(bubblesMuted()||!ensure()||ctx.state!=='running')return;
  const t=ctx.currentTime+delay;
  const osc=ctx.createOscillator(),g=ctx.createGain();
  osc.type=type;osc.frequency.setValueAtTime(freq,t);
  const target=end==null?freq:Math.max(30,end);
  if(curve==='exp')osc.frequency.exponentialRampToValueAtTime(target,t+dur);
  else osc.frequency.linearRampToValueAtTime(target,t+dur);
  g.gain.setValueAtTime(.0001,t);
  g.gain.exponentialRampToValueAtTime(Math.max(.0001,gain),t+.008);
  g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  osc.connect(g);g.connect(master);osc.start(t);osc.stop(t+dur+.02);
}
/* A short filtered-noise burst for the "pop" transient. */
function noise({dur=.06,gain=.18,freq=1200,delay=0}){
  if(bubblesMuted()||!ensure()||ctx.state!=='running')return;
  const t=ctx.currentTime+delay;
  const len=Math.max(1,Math.floor(ctx.sampleRate*dur));
  const buf=ctx.createBuffer(1,len,ctx.sampleRate);
  const d=buf.getChannelData(0);
  for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);
  const src=ctx.createBufferSource();src.buffer=buf;
  const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=freq;filter.Q.value=.8;
  const g=ctx.createGain();g.gain.setValueAtTime(gain,t);
  g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  src.connect(filter);filter.connect(g);g.connect(master);src.start(t);
}

/* A rising "fwoop" as the bubble leaves the launcher. */
export function bubbleLaunch(){
  tone({freq:260,end:640,dur:.1,type:'triangle',gain:.16});
}
/* A light "tick" when the shot reflects off a wall. */
export function bubbleBounce(){
  tone({freq:920,end:760,dur:.04,type:'sine',gain:.07});
}
/* A juicy "bloop" for a pop. `size` lowers/richs the pitch: bigger groups pop
   deeper and are noticeably more satisfying. */
export function bubblePop(size=3){
  const f=Math.max(300,660-(size-3)*38);
  tone({freq:f,end:f*.45,dur:.16,type:'sine',gain:.22});
  noise({dur:.05,gain:.12,freq:f*1.6});
}
/* Rising arpeggio for a combo streak. */
export function bubbleCombo(level){
  const base=440+Math.min(level,5)*40;
  [0,4,7].forEach((semi,i)=>tone({freq:base*Math.pow(2,semi/12),dur:.09,type:'triangle',gain:.14,delay:i*.055}));
}
/* Descending gliss as floating bubbles drop. */
export function bubbleFall(){
  tone({freq:720,end:180,dur:.3,type:'triangle',gain:.12,curve:'linear'});
}
/* Bright ascending chime for clearing the whole board. */
export function bubbleClear(){
  [523,659,784,1046].forEach((f,i)=>tone({freq:f,dur:.14,type:'triangle',gain:.16,delay:i*.07}));
}
/* A low, weighty thud when your clear sends garbage rows to the opponent. */
export function bubbleAttack(rows=1){
  const f=110-Math.min(rows,5)*8;
  tone({freq:f,end:f*.6,dur:.22,type:'square',gain:.14,curve:'linear'});
  tone({freq:660,end:240,dur:.18,type:'sawtooth',gain:.08,curve:'linear'});
}
