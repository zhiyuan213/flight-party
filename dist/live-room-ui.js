const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function bindLiveRooms(social,session) {
 let mode='invite',notice='',snapshot=null;
 const t=(en,zh)=>social.t(en,zh),dialog=social.roomDialog;
 function render() {
  const room=session.room;
  dialog.innerHTML=`<button class="close" data-live="close">×</button><span class="sample-pill">${t('ONLINE ROOM · GUEST','在线房间 · 匿名')}</span><h2>${t('Your flight crew','飞行伙伴')}</h2>${mode==='join'&&!room?`<label>${t('ROOM CODE','房间码')}</label><input id="live-room-code" maxlength="36" autocomplete="off"><button class="primary room-preview-action" data-live="join">${t('Join room','加入房间')}</button>`:room?`<div class="simple-room-meta"><span>CLASSIC · 4 SEATS</span><span>${esc(room.phase)}</span></div><ol class="simple-room-seats">${Array.from({length:4},(_,i)=>{const seat=room.seats.find(s=>s.index===i);return `<li class="room-seat ${seat?'occupied':'empty'}"><span class="room-seat-avatar avatar-${i}"></span><div><b>${seat?(seat.bot?'BOT':i===room.yourSeat?t('You','你'):t('Pilot','飞行员')+' '+(i+1)):t('Open seat','空闲席位')}</b><span>${seat?.ready?t('Ready','已准备'):t('Waiting','等待')}</span></div></li>`;}).join('')}</ol>${room.matchingDeadline&&room.phase==='MATCHING'?`<div class="room-countdown-panel"><b>${t('Taking off soon','即将起飞')}</b><strong>${Math.max(0,Math.ceil((Date.parse(room.matchingDeadline)-Date.now())/1000))}s</strong></div>`:''}${room.phase==='WAITING_FRIENDS'?`<div class="room-invite-strip"><div><span>${t('ROOM CODE','房间码')}</span><b>${esc(room.roomId)}</b></div></div><button class="primary room-preview-action" data-live="ready">${t('Ready for takeoff','准备起飞')}</button>`:''}${room.phase==='PLAYING'?`<p>${t('Server game active. Board connection is still being integrated.','服务端对局已开始，棋盘连接仍在开发。')}</p>`:''}`:`<p>${t('Connecting…','连接中…')}</p>`}<p class="social-action-notice" role="status">${esc(notice)}</p>`;
 }
 async function action(work) { try { notice='';await work();render(); } catch(error) { notice=t('Connection failed. Please retry.','连接失败，请重试。');render(); } }
 social.openRoom=async tab=>{
  mode=tab;notice='';social.stopMatching();
  if(!dialog.open)dialog.showModal();render();
  if(tab==='join')return;
  await action(()=>tab==='quick'?session.quick():session.create());
 };
 const originalRender=social.renderRoom.bind(social);
 social.renderRoom=()=>dialog.open?render():originalRender();
 dialog.addEventListener('click',event=>{
  if(!dialog.open)return;event.stopImmediatePropagation();
  const button=event.target.closest('[data-live]');if(!button)return;
  if(button.dataset.live==='join')action(()=>session.join(dialog.querySelector('#live-room-code').value.trim()));
  if(button.dataset.live==='ready')action(()=>session.ready());
  if(button.dataset.live==='close')action(async()=>{if(session.room&&['WAITING_FRIENDS','MATCHING'].includes(session.room.phase))await session.leave();dialog.close();});
 },true);
 session.addEventListener('snapshot',event=>{snapshot=event.detail;if(dialog.open)render();document.dispatchEvent(new CustomEvent('flight-party-online-snapshot',{detail:snapshot}));});
 session.addEventListener('connection',()=>{notice=t('Connection lost. Reconnecting…','连接中断，正在重连…');if(dialog.open)render();});
 dialog.addEventListener('cancel',event=>{event.preventDefault();});
}
