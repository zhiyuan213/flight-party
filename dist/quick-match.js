/**
 * Flight Party quick matching (UI pass 2026-11-10).
 *
 * Quick match no longer opens the room dialog. Like the other JoyFlock games
 * it shows the shared top-centre matching notice while the server places this
 * guest into a public room. The notice owns the timer and the cancel action;
 * the room dialog stays reserved for invitation-only friend rooms.
 *
 * Standalone page: the notice is rendered in this document by match-box.js.
 * Inside the portal: match-box.js mirrors it to the top of the parent viewport
 * via postMessage, so it can sit above the iframe's hidden header.
 */
import {showMatchBox,hideMatchBox,updateMatchBox} from './table/match-box.js?v=20261110-home4';

const LABELS={
  zh:{title:'正在寻找对局',etaLabel:'预计等待',cancelLabel:'取消匹配'},
  en:{title:'Finding your crew',etaLabel:'Est. wait',cancelLabel:'Cancel matching'}
};

export function bindQuickMatch({session,onNotice=()=>{},getLanguage=()=> 'en'}={}){
 let active=false,generation=0;
 const t=(en,zh)=>getLanguage()==='zh'?zh:en;
 const labels=()=>LABELS[getLanguage()==='zh'?'zh':'en'];
 // Table snapshots use epoch milliseconds; Flight Party room snapshots carry
 // ISO instants. Normalise both into the shape match-box.js expects.
 const view=room=>({
  deadline:room?.matchingDeadline?Date.parse(room.matchingDeadline)||0:0,
  serverNow:room?.serverNow?Date.parse(room.serverNow)||Date.now():Date.now()
 });
 const say=text=>{try{onNotice(text);}catch{}};
 function stop(){if(!active)return;active=false;generation++;hideMatchBox();}
 async function cancel(){
  if(!active)return;
  stop();
  try{
   if(session.room&&['WAITING_FRIENDS','MATCHING'].includes(session.room.phase))await session.leave();
   else session.close();
  }catch{}
  say(t('Matching cancelled','已取消匹配'));
 }
 async function start(){
  if(active)return;
  active=true;const mine=++generation;
  showMatchBox({labels:labels(),onCancel:cancel});
  try{
   await session.quick();
   if(!active||generation!==mine){                 // cancelled while connecting
    try{if(session.room&&['WAITING_FRIENDS','MATCHING'].includes(session.room.phase))await session.leave();else session.close();}catch{}
    return;
   }
   const room=session.room;
   if(room?.phase==='MATCHING')updateMatchBox(view(room));
   else stop();
  }catch(error){
   if(generation!==mine)return;
   stop();
   say(error?.status===409?t('You are already in a room.','你已在其他房间中。'):t('Matching is unavailable right now. Please retry.','暂时无法开始匹配，请稍后重试。'));
  }
 }
 // Reloading during a public match restores the notice instead of creating a
 // second quick room.
 function restore(room){
  if(!room||room.phase!=='MATCHING')return;
  active=true;generation++;
  showMatchBox({labels:labels(),onCancel:cancel,room:view(room)});
  updateMatchBox(view(room));
 }
 session.addEventListener('snapshot',event=>{
  if(!active)return;
  const room=event.detail?.room;
  if(room?.origin==='QUICK'&&room.phase==='MATCHING')updateMatchBox(view(room));
  else stop();                                      // started, settled or left
 });
 // A language switch during matching only refreshes the notice copy; the
 // timer and the pending server request keep running.
 function relabel(){if(active)showMatchBox({labels:labels(),onCancel:cancel});}
 session.addEventListener('left',stop);
 return {start,restore,cancel,relabel,isActive:()=>active};
}
