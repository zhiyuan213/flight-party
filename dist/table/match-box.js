/**
 * Top-centre matchmaking notice.
 *
 * Standalone page: rendered inside this document.
 * Embedded in the portal: mirrored to the very top of the parent viewport via
 * postMessage — an iframe can never paint above its own top edge, which is why
 * a `position:fixed;top:0` box inside the iframe always sat below the header.
 * The parent owns the visible notice; the iframe keeps the state/timer/cancel.
 */
const embedded=window.parent!==window&&new URLSearchParams(location.search).get('embed')==='joyflock';
let box=null,ticker=null,startedAt=0,cancel=null,visible=false,eta='-',hostReady=false;

function post(payload){try{window.parent.postMessage({type:'joyflock:match',...payload},'*');}catch{}}
function timerText(){
  const seconds=Math.floor((Date.now()-startedAt)/1000);
  return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
}
function build(){
  const el=document.createElement('div');
  el.className='four-match-box';el.hidden=true;
  el.setAttribute('role','status');el.setAttribute('aria-live','polite');
  el.innerHTML=`
    <div class="mb-spinner" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="#c9d8ff" stroke-width="1.8" stroke-linecap="round">
        <circle cx="12" cy="12" r="8.5" opacity=".45"/>
        <path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5" stroke="#ffffff" stroke-width="2.4"/>
        <circle cx="12" cy="12" r="2.4" fill="#ffffff" stroke="none"/>
      </svg>
    </div>
    <div class="mb-copy">
      <div class="mb-title">正在寻找对局</div>
      <div class="mb-meta"><span class="mb-timer">0:00</span> · <span>预计等待</span> <b class="mb-eta">-</b></div>
    </div>
    <button class="mb-close" type="button" aria-label="取消匹配">×</button>`;
  el.querySelector('.mb-close').addEventListener('click',()=>{hideMatchBox();if(cancel)cancel();});
  document.body.append(el);
  return el;
}
function renderLocal(timer,show){
  if(!show){if(box)box.hidden=true;return;}
  if(!box)box=build();
  box.hidden=false;
  box.querySelector('.mb-timer').textContent=timer;
  box.querySelector('.mb-eta').textContent=eta;
}
function tick(){
  if(!visible)return;
  const timer=timerText();
  if(embedded){
    post({visible:true,title:'正在寻找对局',timer,eta});
    // Fallback for a stale cached parent: still show something locally.
    renderLocal(timer,!hostReady);
  }else renderLocal(timer,true);
}
export function showMatchBox({onCancel,room}={}){
  cancel=onCancel||null;
  if(!visible){visible=true;startedAt=Date.now();clearInterval(ticker);ticker=setInterval(tick,500);}
  updateMatchBox(room);
  tick();
}
export function updateMatchBox(room){
  const seconds=room?.deadline>0?Math.max(0,Math.ceil((room.deadline-room.serverNow)/1000)):0;
  eta=seconds>0?'~'+seconds+'s':'-';
  if(visible)tick();
}
export function hideMatchBox(){
  visible=false;clearInterval(ticker);ticker=null;
  if(box)box.hidden=true;
  if(embedded)post({visible:false});
}
if(embedded)window.addEventListener('message',event=>{
  if(event.source!==window.parent)return;
  const type=event.data?.type;
  if(type==='joyflock:match-host'){
    hostReady=true;
    if(box)box.hidden=true;   // parent took over the notice
  }else if(type==='joyflock:match-cancel'){
    hideMatchBox();
    if(cancel)cancel();
  }
});
