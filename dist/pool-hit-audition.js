// A was selected by the user. Candidates remain as a historical comparison;
// the merged A example uses the exact production mixer and real rack events.
import {mixImpactSamples,impactBurstSchedule} from './table/pool-audio.js?v=20261113-snookerrail1&release=20261115-polishrelease1&audio=20261115-levels1&power=20261120-poolpower30';
import {poolStart,poolMove} from './table/pool.js?v=20261113-pooldiff1&release=20261115-polishrelease1&nine=20261120-nineball1&fix=20261120-nineball-return1&power=20261120-poolpower30';
const ROOT='./assets/audio/pool/audition/';
const choices=[
  {id:'A',name:'干脆短击',file:'juskiddink-108615.mp3',author:'juskiddink',sound:108615,ms:90,license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/'},
  {id:'B',name:'紧实短击',file:'ironlink15-353796.mp3',author:'Ironlink15',sound:353796,ms:75,license:'CC0',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/'},
  {id:'C',name:'自然碰撞一',file:'hankof-655629.mp3',author:'Hankof',sound:655629,ms:65,license:'CC0',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/'},
  {id:'D',name:'自然碰撞声',file:'hankof-655628.mp3',author:'Hankof',sound:655628,ms:65,license:'CC0',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/'}
];
const status=document.querySelector('#status'),buffers=new Map(),sources=new Set(),timers=new Set(),urls=[];
let context,preparing,ready=false,generation=0;
const show=message=>status.textContent=message;
const credits=document.querySelector('#credits');
credits.innerHTML=choices.map(c=>`<p>${c.id} · <a href="https://freesound.org/people/${c.author}/sounds/${c.sound}/" target="_blank" rel="noreferrer">${c.author} / ${c.sound}</a> · <a href="${c.licenseUrl}" target="_blank" rel="noreferrer">${c.license}</a></p>`).join('')+
  '<p>四款来自四段不同的两球碰撞录音；仅截取接触、裁短尾音、淡出和控制响度，没有变调。A 素材 CC BY 4.0 署名，其余三款为 CC0。名称表示试听方向，具体听感以你试听为准。</p>'+
  '<p>当前 A 加厚版：A juskiddink 在 A 实录上压低尖锐共振、增强已有中低频；没有变调或额外混响。单击及多球叠加保留 CC BY 4.0 署名。最早的改前声音对照来自 <a href="https://freesound.org/people/Za-Games/sounds/539854/" target="_blank" rel="noreferrer">Za-Games / 539854</a>（CC0）。</p>';

function mono(buffer){
  const data=new Float32Array(buffer.length);
  for(let ch=0;ch<buffer.numberOfChannels;ch++){
    const channel=buffer.getChannelData(ch);
    for(let i=0;i<data.length;i++)data[i]+=channel[i]/buffer.numberOfChannels;
  }
  return data;
}
function contact(buffer,milliseconds){
  const data=mono(buffer),rate=buffer.sampleRate;
  let peakIndex=0;for(let i=1;i<data.length;i++)if(Math.abs(data[i])>Math.abs(data[peakIndex]))peakIndex=i;
  const peak=Math.abs(data[peakIndex]);if(peak<.00001)throw Error('素材没有可用的撞击波形');
  // Isolate the principal collision, retaining its onset and a millisecond of
  // lead-in. A remote handling sound must not become the selected transient.
  let start=Math.max(0,peakIndex-Math.round(rate*.006));
  while(start<peakIndex&&Math.abs(data[start])<peak*.06)start++;
  start=Math.max(0,start-Math.round(rate*.001));
  const length=Math.min(data.length-start,Math.round(rate*milliseconds/1000));
  const output=context.createBuffer(1,length,rate),samples=output.getChannelData(0);
  for(let i=0;i<length;i++){
    const attack=Math.min(1,i/(rate*.0002)),tail=Math.min(1,(length-1-i)/(rate*.015));
    samples[i]=data[start+i]*attack*tail;
  }
  let energy=0,outPeak=0;const window=Math.min(length,Math.round(rate*.06));
  for(let i=0;i<length;i++){outPeak=Math.max(outPeak,Math.abs(samples[i]));if(i<window)energy+=samples[i]**2;}
  // Comparable short-window loudness, with peak headroom to avoid clipping.
  const gain=Math.min(.075/Math.sqrt(energy/window),.7/outPeak);
  for(let i=0;i<length;i++)samples[i]*=gain;
  samples[0]=0;samples[length-1]=0;
  return {buffer:output,info:{sourceMs:Math.round(buffer.duration*1000),startMs:+(start/rate*1000).toFixed(2),contactMs:+(length/rate*1000).toFixed(2),peak:+(outPeak*gain).toFixed(3),gain:+gain.toFixed(3)}};
}
function wav(buffer){
  // Three isolated examples in exported files, with room to hear the tail.
  const rate=buffer.sampleRate,pcm=buffer.getChannelData(0),length=Math.ceil(rate*2.05);
  const bytes=new ArrayBuffer(44+length*2),view=new DataView(bytes);
  const text=(at,value)=>[...value].forEach((c,i)=>view.setUint8(at+i,c.charCodeAt(0)));
  text(0,'RIFF');view.setUint32(4,bytes.byteLength-8,true);text(8,'WAVE');text(12,'fmt ');
  view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,rate,true);view.setUint32(28,rate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,length*2,true);
  for(const time of [.15,.85,1.55]){
    const at=Math.round(time*rate);for(let i=0;i<pcm.length&&at+i<length;i++)view.setInt16(44+(at+i)*2,Math.round(Math.max(-1,Math.min(1,pcm[i]))*32767),true);
  }
  return new Blob([bytes],{type:'audio/wav'});
}
function waveform(id,buffer){
  const svg=document.querySelector('#wave-'+id),pcm=buffer.getChannelData(0);let path='';
  for(let x=0;x<360;x++){
    let peak=0;for(let i=Math.floor(x/360*pcm.length);i<Math.floor((x+1)/360*pcm.length);i++)peak=Math.max(peak,Math.abs(pcm[i]));
    const amplitude=Math.max(.3,peak/.7*28);path+=`M${x} ${32-amplitude}v${2*amplitude}`;
  }
  const line=document.createElementNS('http://www.w3.org/2000/svg','path');line.setAttribute('d',path);line.setAttribute('stroke','currentColor');line.setAttribute('stroke-width','1');svg.replaceChildren(line);
}
async function prepare(){
  context??=new (window.AudioContext||window.webkitAudioContext)();
  await context.resume();if(ready)return;if(preparing)return preparing;
  show('正在准备 4 款不同录音');
  preparing=(async()=>{
    const decoded=await Promise.all([...choices.map(c=>ROOT+c.file),'./assets/audio/pool/ball-clack.mp3','./assets/audio/pool/ball-clack-a-solid.wav?v=20261112-hitbefore1','./assets/audio/pool/ball-clack-a.wav'].map(async url=>{
      const response=await fetch(url);if(!response.ok)throw Error('录音加载失败'+url);return context.decodeAudioData(await response.arrayBuffer());
    }));
    const diagnostics=[];
    choices.forEach((c,i)=>{
      const sample=contact(decoded[i],c.ms);buffers.set(c.id,sample.buffer);diagnostics.push({id:c.id,source:c.file,...sample.info});waveform(c.id,sample.buffer);
      const url=URL.createObjectURL(wav(sample.buffer));urls.push(url);
      document.querySelector('#audio-'+c.id).src=url;
      const link=document.querySelector('#download-'+c.id);link.href=url;link.download=`pool-hit-${c.id}-20261112.wav`;link.hidden=false;
    });
    buffers.set('current',decoded[4]);buffers.set('selected',decoded[5]);buffers.set('original-A',decoded[6]);
    const singleUrl=URL.createObjectURL(wav(decoded[5]));urls.push(singleUrl);
    document.querySelector('#audio-selected').src=singleUrl;
    const singleLink=document.querySelector('#download-selected');singleLink.href=singleUrl;singleLink.download='pool-hit-A-solid-20261112.wav';singleLink.hidden=false;
    const state=poolStart(),shot=poolMove(state,1,100*3600),events=shot.audioEvents.filter(e=>e.kind==='ball'&&e.time<=100);
    const selected=decoded[5],mixed=mixImpactSamples(selected.getChannelData(0),selected.sampleRate,events);
    const merged=context.createBuffer(1,mixed.length,selected.sampleRate);merged.getChannelData(0).set(mixed);buffers.set('merged',merged);
    const mergedUrl=URL.createObjectURL(wav(merged));urls.push(mergedUrl);
    document.querySelector('#audio-merged').src=mergedUrl;
    const mergedLink=document.querySelector('#download-merged');mergedLink.href=mergedUrl;mergedLink.download='pool-hit-A-solid-merged-20261112.wav';mergedLink.hidden=false;
    const plan=impactBurstSchedule(events);diagnostics.push({id:'merged-A',contacts:plan.length,startsMs:plan.map(e=>+(e.delay*1000).toFixed(1)),durationMs:Math.round(merged.duration*1000),peak:Math.max(...mixed.map(Math.abs))});
    document.querySelector('#diagnostics').textContent=JSON.stringify(diagnostics,null,2);
    ready=true;document.querySelector('#prepare').textContent='试听已就绪';show('A 加厚版已就绪，可对比改前单击与新版单击');
  })().finally(()=>preparing=null);
  return preparing;
}
function stop(except){
  generation++;
  for(const source of sources){try{source.stop();}catch{}}sources.clear();
  for(const timer of timers)clearTimeout(timer);timers.clear();
  document.querySelectorAll('audio').forEach(audio=>{if(audio!==except){audio.pause();audio.currentTime=0;}});
  document.querySelectorAll('[data-audition-active]').forEach(card=>card.removeAttribute('data-audition-active'));
}
function voice(id,at){
  const source=context.createBufferSource();source.buffer=buffers.get(id);source.playbackRate.value=1;
  let nodes=[];
  if(id==='current'){
    const filter=context.createBiquadFilter(),gain=context.createGain(),compressor=context.createDynamicsCompressor();
    filter.type='lowpass';filter.frequency.value=5300;
    Object.entries({threshold:-10,knee:6,ratio:12,attack:.002,release:.055}).forEach(([k,v])=>compressor[k].value=v);
    const data=source.buffer.getChannelData(0);let onset=0;while(onset<data.length&&Math.abs(data[onset])<.012)onset++;
    const offset=Math.max(0,onset/source.buffer.sampleRate-.001),duration=Math.min(.11,source.buffer.duration-offset),level=.08+.55*Math.pow(.8,.75);
    gain.gain.setValueAtTime(level,at);gain.gain.setValueAtTime(level,at+.035);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
    source.connect(filter);filter.connect(gain);gain.connect(compressor);compressor.connect(context.destination);nodes=[filter,gain,compressor];
    source.start(at,offset,duration);source.stop(at+duration+.001);
  }else{source.connect(context.destination);source.start(at);source.stop(at+source.buffer.duration);}
  sources.add(source);source.onended=()=>{sources.delete(source);source.disconnect();nodes.forEach(node=>node.disconnect());};
}
async function play(ids){
  stop();const token=generation;
  try{
    await prepare();if(token!==generation)return;
    const start=context.currentTime+.05;
    ids.forEach((id,i)=>{
      voice(id,start+i*.8);
      const timer=setTimeout(()=>{
        timers.delete(timer);if(token!==generation)return;
        const choice=choices.find(c=>c.id===id);const label=id==='merged'?'A 加厚版· 多球叠加':id==='selected'?'A 加厚版· 单次撞击':id==='original-A'?'改前 A · 较脆':'最早游戏声音';show('正在试听'+choice.id+' · '+choice.name+':'+label);
        document.querySelectorAll('[data-audition-active]').forEach(card=>card.removeAttribute('data-audition-active'));
        document.querySelector('#wave-'+id)?.closest('article')?.setAttribute('data-audition-active','');
      },50+i*800);timers.add(timer);
    });
    const timer=setTimeout(()=>{timers.delete(timer);if(token===generation)show('播放完成。可以对比原版 A、加厚单击与多球叠加');},(ids.length-1)*800+550);timers.add(timer);
  }catch(error){if(token===generation)show('试听未启动：'+error.message);}
}
document.querySelector('#prepare').onclick=()=>prepare().catch(error=>show(error.message));
document.querySelector('#compare').onclick=()=>play(['original-A','selected']);
document.querySelector('#stop').onclick=()=>{stop();show('已停止');};
document.querySelectorAll('[data-play]').forEach(button=>button.onclick=()=>play([button.dataset.play]));
document.querySelectorAll('[data-repeat]').forEach(button=>button.onclick=()=>play(Array(3).fill(button.dataset.repeat)));
document.querySelectorAll('audio').forEach(audio=>audio.addEventListener('play',()=>{stop(audio);show(audio.id==='audio-merged'?'正在播放 A 加厚版· 多球叠加（重复三次）':audio.id==='audio-selected'?'正在播放 A 加厚版· 单击（重复三次）':`正在播放 ${audio.id.slice(-1)} · 三次单独碰撞`);}));
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('pagehide',()=>{stop();urls.forEach(url=>URL.revokeObjectURL(url));});
