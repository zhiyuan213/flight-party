// Local audition only. The old voice below freezes the pre-2026-11-12 chain;
// the new buttons call the same module used by actual pool/snooker playback.
import {poolStart,poolMove} from './table/pool.js?v=20261113-pooldiff1';
import {replayImpacts,poolImpactBurst,chainLevels,impactBurstSchedule,unlockPoolAudio,poolRecordingStatus,poolMuted} from './table/pool-audio.js?v=20261113-snookerrail1';
const state=poolStart(),result=poolMove(state,1,100*3600);
const frames=[state.cells.slice(0,48),...result.history.map(h=>h.split(',').map(Number))];
const exact=result.audioEvents.filter(e=>e.kind==='ball'&&e.time<=100);
let rebuilt=[];
for(let k=1;k<frames.length;k++){
  const hits=replayImpacts(frames[Math.max(0,k-2)],frames[k-1],frames[k]).filter(e=>e.kind==='ball');
  if(hits.length>rebuilt.length)rebuilt=hits;
}
const reconstructed=chainLevels(rebuilt);
const legacyPlan=events=>{
  const hits=events.filter(e=>e.strength>.035).sort((a,b)=>b.strength-a.strength).slice(0,24);
  return hits.map((e,i)=>({...e,delay:i*Math.min(.008,.12/Math.max(1,hits.length-1)),gain:1/(1+i*.1)}));
};
const oldPlan=legacyPlan(exact),newPlan=impactBurstSchedule(exact),framePlan=impactBurstSchedule(reconstructed);
const stats=document.querySelector('#stats'),status=document.querySelector('#status');
const duration=plan=>Math.round((plan.at(-1)?.delay||0)*1000);
stats.innerHTML=`<div>开球实际接触b>${exact.length} 次 / ${Math.max(...exact.map(e=>e.time))-Math.min(...exact.map(e=>e.time))}ms</b></div>`+
  `<div>旧版<b>${oldPlan.length} 次 / ${duration(oldPlan)}ms</b></div>`+
  `<div>新版<b>${newPlan.length} 次 / ${duration(newPlan)}ms</b></div>`+
  `<div>新版回放重建<b>${framePlan.length} 次 / ${duration(framePlan)}ms</b></div>`+
  '<div>实录素材<b id="recording">点击后加载/b></div>';
const svg=document.querySelector('#chart'),NS='http://www.w3.org/2000/svg';
const make=(tag,attrs)=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n;};
for(let ms=0;ms<=300;ms+=50){const x=140+ms/300*810;
  svg.append(make('line',{x1:x,y1:24,x2:x,y2:174,class:'axis'}));
  const label=make('text',{x,y:188,'text-anchor':'middle',class:'label'});label.textContent=ms+'ms';svg.append(label);
}
[['旧版连发',oldPlan,'#ff6b5e'],['新版硬球',newPlan,'#ffd75e'],['旧回放重建',legacyPlan(reconstructed),'#ff6b5e'],['新回放重建',framePlan,'#8fe4d8']]
  .forEach(([name,plan,color],row)=>{
    const y=40+row*36,label=make('text',{x:8,y:y+4,class:'title'});label.textContent=name;svg.append(label);
    for(const e of plan)svg.append(make('circle',{cx:140+e.delay/.3*810,cy:y,r:2.5+e.strength*e.gain*5,fill:color}));
  });
let legacyContext,recording,legacyMaster;
async function prepareLegacy(){
  legacyContext??=new AudioContext();await legacyContext.resume();
  if(!recording){
    const response=await fetch('./assets/audio/pool/ball-clack.mp3');if(!response.ok)throw Error('素材加载失败');recording=await legacyContext.decodeAudioData(await response.arrayBuffer());
    const pcm=recording.getChannelData(0),rate=recording.sampleRate;let onset=0,peak=0;
    while(onset<pcm.length&&Math.abs(pcm[onset])<.012)onset++;
    for(let i=0;i<pcm.length;i++)if(Math.abs(pcm[i])>Math.abs(pcm[peak]))peak=i;
    const details=document.createElement('details'),summary=document.createElement('summary'),text=document.createElement('p');
    summary.textContent='改前录音素材检查';text.textContent=`旧素材采样率 ${rate}Hz；接触起点${(onset/rate*1000).toFixed(2)}ms；峰值距接触起点 ${((peak-onset)/rate*1000).toFixed(2)}ms。新版使用已用 A，完整素材见单球试听页。`;
    details.append(summary,text);document.body.append(details);
  }
  if(!legacyMaster){legacyMaster=legacyContext.createDynamicsCompressor();Object.entries({threshold:-10,knee:6,ratio:12,attack:.002,release:.055}).forEach(([k,v])=>legacyMaster[k].value=v);legacyMaster.connect(legacyContext.destination);}
}
function playLegacy(plan){
  const pcm=recording.getChannelData(0);let onset=0;while(onset<pcm.length&&Math.abs(pcm[onset])<.012)onset++;
  const offset=Math.max(0,onset/recording.sampleRate-.001),length=Math.min(.11,recording.duration-offset),now=legacyContext.currentTime;
  plan.forEach((e,i)=>{
    const source=legacyContext.createBufferSource(),filter=legacyContext.createBiquadFilter(),gain=legacyContext.createGain();
    source.buffer=recording;source.playbackRate.value=1;filter.type='lowpass';filter.frequency.value=4200;
    const at=now+e.delay,level=(.08+.55*Math.pow(e.strength,.75))/Math.sqrt(1+i*.3)*e.gain;
    gain.gain.setValueAtTime(level,at);gain.gain.setValueAtTime(level,at+.035);gain.gain.exponentialRampToValueAtTime(.0001,at+length);
    source.connect(filter);filter.connect(gain);gain.connect(legacyMaster);
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};source.start(at,offset,length);source.stop(at+length+.001);
  });
}
let playing=false;
async function play(mode){
  if(playing)return;
  if(poolMuted()){status.textContent='游戏音效当前已静音，请先在游戏中开启音效再试听。';return;}
  playing=true;const buttons=[...document.querySelectorAll('[data-play]')];buttons.forEach(b=>b.disabled=true);
  try{
    unlockPoolAudio();status.textContent='正在加载真实球碰球录音…';
    // A click must unlock both contexts before any async loading finishes.
    const oldReady=prepareLegacy();
    for(let i=0;i<80&&poolRecordingStatus()==='loading';i++)await new Promise(resolve=>setTimeout(resolve,25));
    await oldReady;
    const ready=poolRecordingStatus()==='ready';document.querySelector('#recording').textContent=ready?'实录已加载':'合成备用音色';
    const isFrame=mode.startsWith('frame'),isNew=mode.endsWith('new'),events=isFrame?reconstructed:exact;
    const plan=isNew?impactBurstSchedule(events):legacyPlan(events);
    if(isNew){
      const rendered=poolImpactBurst(events);
      if(rendered!==plan.length)throw Error('音频未完整启动，请保持试听页可见后重试');
    }else playLegacy(plan);
    status.textContent=`${isNew?'新版短撞声':'旧版密集连发'} · ${isFrame?'回放重建':'单机精确事件'} 次${plan.length} 次 / ${duration(plan)}ms · ${ready?'实录已加载':'合成备用音色'}`;
    await new Promise(resolve=>setTimeout(resolve,450));
  }catch(error){status.textContent='试听未启动：'+error.message;}
  finally{playing=false;buttons.forEach(b=>b.disabled=false);}
}
document.querySelectorAll('[data-play]').forEach(button=>button.onclick=()=>play(button.dataset.play));
