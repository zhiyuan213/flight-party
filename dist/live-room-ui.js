import {avatarStyle} from './avatar.js';
import {roomInvitationUrl,isChineseMobile,shareRoomInvitation} from './room-share.js';
import {CUSTODY_LABELS} from './online-custody.js?v=20261115-joincoin1';
import {ensureCustodyStyles} from './online-custody-ui.js?v=20261115-joincoin1';
import {cachedDisplayName} from './account-name.js?v=20261121-accountname1';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const roomCode=value=>{try{const input=value.trim();const code=input.includes('://')?new URL(input).searchParams.get('room'):input;return /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(code||'')?code:null;}catch{return null;}};
/* Import-stripped unit harnesses run this module without its ESM helpers;
   typeof keeps the guest fallback available there too. */
function ownSeatLabel(fallback){
 const shared=typeof cachedDisplayName==='function'?cachedDisplayName():'';
 return esc(shared||fallback);
}
export function bindLiveRooms(social,session) {
 let notice='',snapshot=null,starting=false,sharing=false,sharingRoomId=null,shareFallback='',sharedPageRoomId=null,shareGeneration=0,lastMarkup='';
 ensureCustodyStyles(document);
 const t=(en,zh)=>social.t(en,zh),dialog=social.roomDialog;
 const language=()=>social.getLanguage?.()||t('en','zh');
 /* 托管状态 is visible in the crew list too; the live 30s countdown is on the
    in-game seat card. Both use the shared labels so every game reads alike. */
 function custodyTag(seat){
  if(!seat||seat.bot)return '';
  const l=CUSTODY_LABELS[language()==='en'?'en':'zh'],state=seat.custody||'active';
  if(state==='hosted')return `<em class="room-seat-custody" data-state="hosted" title="${esc(l.hostedHint)}">${esc(l.hosted)}</em>`;
  if(state==='grace')return `<em class="room-seat-custody" data-state="grace" title="${esc(l.graceHint)}">${esc(l.grace)}</em>`;
  return '';
 }
 function invitation(id){return roomInvitationUrl(id,location.origin,language());}
 function clearSharedPage(){if(!sharedPageRoomId)return;const url=new URL(location.href);if(url.searchParams.get('room')===sharedPageRoomId){url.searchParams.delete('room');history.replaceState(null,'',url);}sharedPageRoomId=null;}
 function invalidateShare(){shareGeneration++;sharing=false;sharingRoomId=null;shareFallback='';}
 /* Once matching starts the countdown has taken over: no invitation actions
    here, so sharing is eligible only while friends are still being awaited. */
 const shareEligible=()=>session.room?.origin==='FRIENDS'&&session.room.phase==='WAITING_FRIENDS';
 function render() {
  dialog.setAttribute('aria-label',t('Online room','在线房间'));
  const room=session.room,matching=room?.phase==='MATCHING',waiting=room?.phase==='WAITING_FRIENDS',mobileShare=isChineseMobile({language:language()});
  const phase=room?({WAITING_FRIENDS:t('Waiting for friends','等待好友'),MATCHING:t('Matching','匹配中'),STARTING:t('Starting','正在开始'),PLAYING:t('In flight','对局中'),SETTLED:t('Finished','已结束')})[room.phase]||room.phase:'';
  const countdown=matching?Math.max(0,Math.ceil((Date.parse(room.matchingDeadline)-Date.now())/1000))+'s':'';
  /* Room snapshots arrive several times a second. Rebuilding the whole dialog
     on each one replaced the button under the pointer, which replayed its
     :hover transform and re-fired the hover blip continuously. Keep the markup
     stable and update only the ticking clock. */
  const markup=`<button type="button" class="close" data-live="close" aria-label="${t('Close room','关闭房间')}">×</button>
   <span class="sample-pill">${t('ONLINE ROOM','在线房间')}</span><h2>${t('Your flight crew','飞行伙伴')}</h2>
   ${!room?`<p class="room-connecting">${notice?t('Could not join this room','无法加入该房间'):t('Joining the room…','正在加入房间…')}</p>${notice?`<button type="button" class="secondary room-invite-standalone" data-live="retry">${t('Create a fresh room','重新创建房间')}</button>`:''}`:`
   <div class="simple-room-meta"><span>${t('CLASSIC · 4 SEATS','经典模式 · 4 个席位')}</span><span>${esc(phase)}</span></div>
   <ol class="simple-room-seats">${Array.from({length:4},(_,i)=>{const seat=room.seats.find(s=>s.index===i);return `<li class="room-seat ${seat?'occupied':'empty'}"><span class="room-seat-avatar avatar-${i}" ${avatarStyle({...seat,isSelf:!!seat&&i===room.yourSeat,signedIn:!!session.identity?.account})} data-frame="${esc(seat?.avatarFrame||'none')}"></span><div><b data-member="${seat?.member===true}" data-annual-member="${seat?.member===true&&seat?.annualMember===true}">${seat?(seat.bot?'BOT':seat.displayName?esc(seat.displayName):i===room.yourSeat?ownSeatLabel(t('You','你')):t('Pilot','飞行员')+' '+(i+1)):t('Open seat','空闲席位')}</b><span>${custodyTag(seat)||(seat?.ready?t('Ready','已准备'):t('Waiting','等待'))}</span></div></li>`;}).join('')}</ol>
   ${matching?`<div class="room-countdown-panel"><div><b>${t('Taking off soon','即将起飞')}</b><button type="button" class="secondary room-start-now" data-live="start-now" ${starting?'disabled':''}>${starting?t('Starting…','正在开始…'):t('Start now','快速开始')}</button></div><strong data-countdown></strong></div>`:''}
   ${waiting&&room.origin==='FRIENDS'?`${mobileShare?`<button type="button" class="secondary room-invite-standalone" data-live="share-wechat" ${sharing?'disabled':''}>${sharing?'正在打开分享…':'邀请好友'}</button>`:''}<button type="button" class="secondary room-invite-standalone" data-live="copy-link">${t('Copy invitation link','复制邀请链接')}</button>`:''}
   ${waiting?`<button type="button" class="secondary room-invite-standalone" data-live="ready">${room.seats.find(s=>s.index===room.yourSeat)?.ready?t('Ready · Waiting for friends','已准备 · 等待好友'):t('Ready for takeoff','准备起飞')}</button>`:''}
   ${waiting||matching?`<button type="button" class="secondary room-invite-standalone room-invite-last" data-live="leave">${t('Leave room','退出房间')}</button>`:''}`}
   <p class="social-action-notice" role="status" ${notice?'':'hidden'}>${esc(notice)}</p>${shareFallback?`<label class="room-share-manual">邀请链接<input readonly value="${esc(shareFallback)}" aria-label="邀请链接，长按复制"></label>`:''}`;
  // dialog.innerHTML is also rewritten by the legacy preview renderer when the
  // dialog is closed, so verify our own structure before trusting the cache.
  // The dialog is a real element in the browser; lightweight unit-test doubles
  // only expose innerHTML, so keep the lookups optional.
  const find=selector=>typeof dialog.querySelector==='function'?dialog.querySelector(selector):null;
  if(!find('[data-live="close"]')||markup!==lastMarkup){dialog.innerHTML=markup;lastMarkup=markup;}
  const clock=find('[data-countdown]');
  if(clock&&clock.textContent!==countdown)clock.textContent=countdown;
 }
 function errorMessage(error){return error.status===404?t('This room was not found. Check the invitation.','未找到房间，请检查邀请链接或房间码。'):error.status===403?t('This room has ended. Create a fresh one.','房间已失效，请重新创建房间。'):error.status===409?t('The room has started, is full, or you are already in another room.','房间已开始、已满，或你已在其他房间中。'):t('Connection failed. Please retry.','连接失败，请重试。');}
 async function action(work) {try{notice='';await work();render();}catch(error){
  /* A 403/404 means the room pointer is gone. Drop the stale state so the
     "Create a fresh room" button is offered instead of a dead-end dialog. */
  if([403,404].includes(error.status))session.discard?.();
  notice=errorMessage(error);render();}}
 async function join(value){const code=roomCode(value);if(!code){notice=t('Enter a valid room code or invitation link.','请输入有效房间码或邀请链接。');render();return;}await action(async()=>{await session.join(code);const url=new URL(location.href);url.searchParams.delete('room');history.replaceState(null,'',url);});}
 /* An invitation link carries the room, so open the crew view immediately and
    join behind it. There is no join-by-code form to fill in any more. */
 social.openInvitation=async code=>{invalidateShare();notice='';if(!dialog.open)dialog.showModal();render();await join(code);};
 /* Quick matching is owned by the top-centre notice (see quick-match.js).
    openRoom('quick') stays as the single public entry point so the home CTA,
    the results rematch and legacy callers all take the same dialog-free path. */
 social.openRoom=async tab=>{
  if(tab==='quick'){invalidateShare();social.stopMatching?.();if(dialog.open)dialog.close();return social.quickMatch?.();}
  invalidateShare();notice='';social.stopMatching?.();if(!dialog.open)dialog.showModal();render();if(tab==='join')return;await action(()=>session.create());
 };
 social.rematchFriends=async roomId=>{invalidateShare();notice='';if(!dialog.open)dialog.showModal();render();await action(()=>session.rematch(roomId));};
 const originalRender=social.renderRoom.bind(social);
 social.renderRoom=()=>dialog.open?render():originalRender();
 dialog.addEventListener('click',event=>{
  if(!dialog.open)return;event.stopImmediatePropagation();const button=event.target.closest('[data-live]');if(!button)return;
  if(button.dataset.live==='retry'){action(()=>session.create());return;}
  if(button.dataset.live==='ready')action(()=>session.ready());
  if(button.dataset.live==='start-now'&&!starting){starting=true;render();action(()=>session.startNow()).finally(()=>{starting=false;if(dialog.open)render();});}
  if(button.dataset.live==='share-wechat'&&!sharing&&shareEligible()&&isChineseMobile({language:language()})){
   const roomId=session.room.roomId,generation=++shareGeneration;notice='';shareFallback='';
   const isCurrent=()=>generation===shareGeneration&&dialog.open&&session.room?.roomId===roomId&&shareEligible();
   const pending=shareRoomInvitation({roomId,origin:location.origin,language:'zh',isCurrent,prepareWeChatPage:url=>{if(!isCurrent())return false;history.replaceState(null,'',url);sharedPageRoomId=roomId;return true;}});
   sharing=true;sharingRoomId=roomId;render();
   pending.then(result=>{
    if(!isCurrent())return;
    if(result.status==='cancelled'){notice='';return;}
    if(result.status==='wechat-menu'){notice='点击微信右上角「…」→「发送给朋友」。也可以点「复制邀请链接」后粘贴给朋友。';return;}
    if(result.status==='native'){notice='已打开系统分享，选择微信即可发送给朋友。';return;}
    const menu=result.menuReady?'也可尝试微信右上角「…」→「发送给朋友」，请确认链接带有房间码。':'';
    notice=result.status==='copied'?`邀请链接已复制，打开微信粘贴给朋友。${menu}`:`请长按下方邀请链接复制，再到微信发送给朋友。${menu}`;
    if(result.status==='manual')shareFallback=result.url;
   }).catch(()=>{if(isCurrent())notice='暂时无法打开分享，请点「复制邀请链接」后到微信发送。';}).finally(()=>{if(generation===shareGeneration){sharing=false;sharingRoomId=null;if(dialog.open)render();}});
  }
  if(button.dataset.live==='copy-link'&&shareEligible()){
   const roomId=session.room.roomId,value=invitation(roomId);shareFallback='';
   const current=()=>dialog.open&&session.room?.roomId===roomId&&shareEligible();
   const copied=t('Copied. Send it to your friend.','已复制，发给朋友即可。'),manual=t('Copy this invitation: ','请复制此邀请：')+value;
   /* A standalone action needs an immediate acknowledgement: in embedded or
      permission-restricted contexts the clipboard promise may never settle.
      A real failure still replaces it with the selectable invitation URL. */
   notice=copied;render();
   if(navigator.clipboard?.writeText)navigator.clipboard.writeText(value).then(()=>{if(current()){notice=copied;render();}}).catch(()=>{if(current()){notice=manual;render();}});
   else{notice=manual;render();}
  }
  if(['close','leave'].includes(button.dataset.live)){
   invalidateShare();const room=session.room;
   /* Dismiss immediately. Awaiting /leave on a slow link used to keep the
      dialog and its buttons alive for seconds: a tap on "Start now" or a 1008
      reconnect then raced the leave and produced the 403 dead end. */
   dialog.close();clearSharedPage();
   if(room&&['WAITING_FRIENDS','MATCHING'].includes(room.phase))session.leave().catch(()=>{});
  }
 },true);
 session.addEventListener('snapshot',event=>{snapshot=event.detail;if(!shareEligible()||sharing&&sharingRoomId!==session.room?.roomId)invalidateShare();if(sharedPageRoomId&&session.room?.roomId!==sharedPageRoomId)clearSharedPage();if(dialog.open)render();document.dispatchEvent(new CustomEvent('flight-party-online-snapshot',{detail:snapshot}));});
 session.addEventListener('connection',()=>{notice=t('Connection lost. Reconnecting…','连接中断，正在重连…');if(dialog.open)render();});
 session.addEventListener('left',()=>{invalidateShare();clearSharedPage();if(dialog.open)dialog.close();document.dispatchEvent(new CustomEvent('flight-party-room-left'));});
 dialog.addEventListener('close',()=>{invalidateShare();clearSharedPage();});
 dialog.addEventListener('cancel',event=>event.preventDefault());
}
