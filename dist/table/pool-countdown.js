import {poolCountdownSound} from './pool-audio.js?v=20261113-snookerrail1&release=20261115-polishrelease1&audio=20261115-levels1';

export const POOL_GO_DURATION=450;
export const COUNTDOWN_LEAD_IN=1000;   // one quiet second after entering the game
export const COUNTDOWN_WINDOW=3000;    // 3 · 2 · 1
export const COUNTDOWN_TOTAL=COUNTDOWN_LEAD_IN+COUNTDOWN_WINDOW;
export const COUNTDOWN_READY='READY';
export function countdownPhase(deadline,now,observedCountdown=false,readyUntil=0){
  if(!Number.isFinite(deadline)||deadline<=0)return null;
  // Hold a caption-only "get ready" card before the numbers start. Entering a
  // game costs a frame or two, so this keeps the full 3 · 2 · 1 on screen.
  if(Number.isFinite(readyUntil)&&readyUntil>0&&now<readyUntil)return COUNTDOWN_READY;
  if(now<deadline)return String(Math.min(3,Math.ceil((deadline-now)/1000)));
  return observedCountdown&&now<deadline+POOL_GO_DURATION?'GO':null;
}
export function cancelPoolCountdown(host){
  const state=host._poolCountdown;if(!state)return;
  if(state.frame!==null)cancelAnimationFrame(state.frame);
  state.animation?.cancel();
  // Archived-room teardown can run before a real DOM element was attached.
  if(state.element){state.element.hidden=true;if(state.element.dataset)state.element.dataset.phase='';}
  state.frame=null;
  host._poolCountdown=null;
}
// A deadline is authoritative. Observing its countdown arms GO; arriving after it does not.
export function updatePoolCountdown(host,element,deadline,serverOffset=0,update=()=>{},readyUntil=0){
  const lead=Number.isFinite(readyUntil)&&readyUntil>0?readyUntil:host._poolCountdownReadyUntil||0;
  let state=host._poolCountdown;
  if(!state||state.deadline!==deadline||state.element!==element||state.readyUntil!==lead){
    cancelPoolCountdown(host);
    state=host._poolCountdown={deadline,element,readyUntil:lead,phase:null,observed:false,sounded:new Set(),frame:null,animation:null};
  }
  state.offset=serverOffset;state.update=update;
  if(state.frame!==null)return;
  const tick=()=>{
    state.frame=null;
    if(host._poolCountdown!==state)return;
    if(!host.isConnected){cancelPoolCountdown(host);return;}
    const now=Date.now()+state.offset;
    if(deadline>0&&now<deadline)state.observed=true;
    const phase=countdownPhase(deadline,now,state.observed,state.readyUntil);
    element.hidden=phase===null;
    if(phase!==state.phase){
      state.phase=phase;state.animation?.cancel();state.animation=null;
      element.dataset.phase=phase||'';element.style.pointerEvents=phase==='GO'?'none':'auto';
      if(phase){
        const label=element.querySelector('b'),caption=element.querySelector('span');
        if(phase===COUNTDOWN_READY){
          label.textContent='';
          const en=document.documentElement.lang==='en';
          caption.textContent=(en?caption.dataset.readyEn:caption.dataset.ready)||(en?'Get ready':'准备开始');
        }else{
          label.textContent=phase;
          caption.textContent=phase==='GO'?'开球！':'准备开球';
          if(!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches&&label.animate){
            state.animation=label.animate([{transform:'scale(.82)',opacity:.6},{transform:'scale(1.12)',opacity:1,offset:.28},{transform:'scale(1)',opacity:1}],{duration:380,easing:'cubic-bezier(.2,.7,.2,1)',fill:'both'});
          }
        }
      }
      state.update();
    }
    // AudioContext.resume() may settle just after the initial click; retry only until this phase actually sounds.
    if(phase&&phase!==COUNTDOWN_READY&&!state.sounded.has(phase)&&poolCountdownSound(phase))state.sounded.add(phase);
    if(phase!==null)state.frame=requestAnimationFrame(tick);
  };
  tick();
}
