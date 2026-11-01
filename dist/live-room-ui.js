import {avatarStyle} from './avatar.js';
import {roomInvitationUrl,isChineseMobile,shareRoomInvitation} from './room-share.js';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const roomCode=value=>{try{const input=value.trim();const code=input.includes('://')?new URL(input).searchParams.get('room'):input;return /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(code||'')?code:null;}catch{return null;}};
export function bindLiveRooms(social,session) {
 let mode='invite',notice='',snapshot=null,starting=false,joinCode='',sharing=false,sharingRoomId=null,shareFallback='',sharedPageRoomId=null,shareGeneration=0;
 const t=(en,zh)=>social.t(en,zh),dialog=social.roomDialog;
 const language=()=>social.getLanguage?.()||t('en','zh');
 function invitation(id){return roomInvitationUrl(id,location.origin,language());}
 function clearSharedPage(){if(!sharedPageRoomId)return;const url=new URL(location.href);if(url.searchParams.get('room')===sharedPageRoomId){url.searchParams.delete('room');history.replaceState(null,'',url);}sharedPageRoomId=null;}
 function invalidateShare(){shareGeneration++;sharing=false;sharingRoomId=null;shareFallback='';}
 const shareEligible=()=>session.room?.origin==='FRIENDS'&&['WAITING_FRIENDS','MATCHING'].includes(session.room.phase);
 function render() {
  dialog.setAttribute('aria-label',t('Online room','在线房间'));
  const room=session.room,matching=room?.phase==='MATCHING',waiting=room?.phase==='WAITING_FRIENDS',mobileShare=isChineseMobile({language:language()});
  const phase=room?({WAITING_FRIENDS:t('Waiting for friends','等待好友'),MATCHING:t('Matching','匹配中'),STARTING:t('Starting','正在开始'),PLAYING:t('In flight','对局中'),SETTLED:t('Finished','已结束')})[room.phase]||room.phase:'';
  dialog.innerHTML=`<button type="button" class="close" data-live="close" aria-label="${t('Close room','关闭房间')}">×</button>
   <span class="sample-pill">${t('ONLINE ROOM','在线房间')}</span><h2>${mode==='join'&&!room?t('Join your friends','加入好友房间'):t('Your flight crew','飞行伙伴')}</h2>
   ${!room?mode==='join'?`<form id="live-room-join-form" class="account-auth-form"><label>${t('Room code or invitation link','房间码或邀请链接')}<input id="live-room-code" value="${esc(joinCode)}" required maxlength="200" autocomplete="off" spellcheck="false" placeholder="${t('Paste a code or link','粘贴房间码或邀请链接')}"></label><button type="submit" class="primary room-preview-action">${t('Join room','加入房间')}</button></form>`:`<p>${t('Connecting…','连接中…')}</p>`:`
   <div class="simple-room-meta"><span>${t('CLASSIC · 4 SEATS','经典模式 · 4 个席位')}</span><span>${esc(phase)}</span></div>
   <ol class="simple-room-seats">${Array.from({length:4},(_,i)=>{const seat=room.seats.find(s=>s.index===i);return `<li class="room-seat ${seat?'occupied':'empty'}"><span class="room-seat-avatar avatar-${i}" ${avatarStyle(seat?.avatarUrl)} data-frame="${esc(seat?.avatarFrame||'none')}"></span><div><b data-member="${seat?.member===true}" data-annual-member="${seat?.member===true&&seat?.annualMember===true}">${seat?(seat.bot?'BOT':seat.displayName?esc(seat.displayName):i===room.yourSeat?t('You','你'):t('Pilot','飞行员')+' '+(i+1)):t('Open seat','空闲席位')}</b><span>${seat?.ready?t('Ready','已准备'):t('Waiting','等待')}</span></div></li>`;}).join('')}</ol>
   ${matching?`<div class="room-countdown-panel"><div><b>${t('Taking off soon','即将起飞')}</b><button type="button" class="secondary room-start-now" data-live="start-now" ${starting?'disabled':''}>${starting?t('Starting…','正在开始…'):t('Start now','快速开始')}</button></div><strong>${Math.max(0,Math.ceil((Date.parse(room.matchingDeadline)-Date.now())/1000))}s</strong></div><p class="room-flow-note">${t('Start with the current players. Empty seats become computer pilots.','与当前玩家直接开局，空闲席位由电脑控制。')}</p>`:''}
   ${(waiting||matching)&&room.origin==='FRIENDS'?`<div class="room-invite-strip live-room-invitation"><div><span>${t('ROOM CODE','房间码')}</span><b>${esc(room.roomId)}</b></div>${mobileShare?`<button type="button" class="primary room-share-wechat" data-live="share-wechat" ${sharing?'disabled':''}>${sharing?'正在打开分享…':'分享给微信好友'}</button>`:''}<div class="room-invite-actions"><button type="button" class="secondary" data-live="copy-link">${t('Copy invitation link','复制邀请链接')}</button><button type="button" class="secondary" data-live="copy-code">${t('Copy room code','复制房间码')}</button></div></div><p class="room-flow-note">${mobileShare?'选择微信分享给朋友；朋友打开链接即可加入。':t('Send the link to a friend. They can open it to join this room.','把邀请链接发给朋友，对方打开即可加入房间。')}</p>`:''}
   ${waiting?`<button type="button" class="primary room-preview-action" data-live="ready">${room.seats.find(s=>s.index===room.yourSeat)?.ready?t('Ready · Waiting for friends','已准备 · 等待好友'):t('Ready for takeoff','准备起飞')}</button>`:''}
   ${waiting||matching?`<button type="button" class="secondary room-leave-button" data-live="leave">${t('Leave room','退出房间')}</button>`:''}`}
   <p class="social-action-notice" role="status" ${notice?'':'hidden'}>${esc(notice)}</p>${shareFallback?`<label class="room-share-manual">邀请链接<input readonly value="${esc(shareFallback)}" aria-label="邀请链接，长按复制"></label>`:''}`;
 }
 function errorMessage(error){return error.status===404?t('This room was not found. Check the invitation.','未找到房间，请检查邀请链接或房间码。'):error.status===409?t('The room has started, is full, or you are already in another room.','房间已开始、已满，或你已在其他房间中。'):t('Connection failed. Please retry.','连接失败，请重试。');}
 async function action(work) {try{notice='';await work();render();}catch(error){notice=errorMessage(error);render();}}
 async function join(value){const code=roomCode(value);if(!code){notice=t('Enter a valid room code or invitation link.','请输入有效房间码或邀请链接。');render();return;}await action(async()=>{await session.join(code);const url=new URL(location.href);url.searchParams.delete('room');history.replaceState(null,'',url);});}
 social.openInvitation=async code=>{invalidateShare();mode='join';joinCode=code;if(!dialog.open)dialog.showModal();render();await join(code);};
 social.openRoom=async tab=>{invalidateShare();mode=tab;notice='';social.stopMatching();if(!dialog.open)dialog.showModal();render();if(tab==='join')return;await action(()=>tab==='quick'?session.quick():session.create());};
 social.rematchFriends=async roomId=>{invalidateShare();mode='invite';notice='';if(!dialog.open)dialog.showModal();render();await action(()=>session.rematch(roomId));};
 const originalRender=social.renderRoom.bind(social);
 social.renderRoom=()=>dialog.open?render():originalRender();
 dialog.addEventListener('input',event=>{if(event.target.id==='live-room-code')joinCode=event.target.value;});
 dialog.addEventListener('submit',event=>{if(event.target.id!=='live-room-join-form')return;event.preventDefault();event.stopImmediatePropagation();join(joinCode);},true);
 dialog.addEventListener('click',event=>{
  if(!dialog.open)return;event.stopImmediatePropagation();const button=event.target.closest('[data-live]');if(!button)return;
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
    if(result.status==='native'){notice='已打开系统分享，选择微信即可发送给朋友。';return;}
    const menu=result.menuReady?'也可尝试微信右上角「…」→「发送给朋友」，请确认链接带有房间码。':'';
    notice=result.status==='copied'?`邀请链接已复制，打开微信粘贴给朋友。${menu}`:`请长按下方邀请链接复制，再到微信发送给朋友。${menu}`;
    if(result.status==='manual')shareFallback=result.url;
   }).catch(()=>{if(isCurrent())notice='暂时无法打开分享，请点「复制邀请链接」后到微信发送。';}).finally(()=>{if(generation===shareGeneration){sharing=false;sharingRoomId=null;if(dialog.open)render();}});
  }
  if(['copy-link','copy-code'].includes(button.dataset.live)&&shareEligible()){
   const roomId=session.room.roomId,value=button.dataset.live==='copy-link'?invitation(roomId):roomId;shareFallback='';
   const current=()=>dialog.open&&session.room?.roomId===roomId&&shareEligible();
   if(navigator.clipboard?.writeText)navigator.clipboard.writeText(value).then(()=>{if(current()){notice=t('Copied. Send it to your friend.','已复制，发给朋友即可。');render();}}).catch(()=>{if(current()){notice=t('Copy this invitation: ','请复制此邀请：')+value;render();}});
   else{notice=t('Copy this invitation: ','请复制此邀请：')+value;render();}
  }
  if(['close','leave'].includes(button.dataset.live)){invalidateShare();action(async()=>{if(session.room&&['WAITING_FRIENDS','MATCHING'].includes(session.room.phase))await session.leave();clearSharedPage();dialog.close();});}
 },true);
 session.addEventListener('snapshot',event=>{snapshot=event.detail;if(!shareEligible()||sharing&&sharingRoomId!==session.room?.roomId)invalidateShare();if(sharedPageRoomId&&session.room?.roomId!==sharedPageRoomId)clearSharedPage();if(dialog.open)render();document.dispatchEvent(new CustomEvent('flight-party-online-snapshot',{detail:snapshot}));});
 session.addEventListener('connection',()=>{notice=t('Connection lost. Reconnecting…','连接中断，正在重连…');if(dialog.open)render();});
 session.addEventListener('left',()=>{invalidateShare();clearSharedPage();if(dialog.open)dialog.close();document.dispatchEvent(new CustomEvent('flight-party-room-left'));});
 dialog.addEventListener('close',()=>{invalidateShare();clearSharedPage();});
 dialog.addEventListener('cancel',event=>event.preventDefault());
}
