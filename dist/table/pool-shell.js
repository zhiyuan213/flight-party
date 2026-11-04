// Pool-only presentation. Existing account, turn and reaction nodes keep their handlers.
let shell, current = null, roomId, cursor = 0, polling = false, timer = null, sending = false, localId = 0;
const element = (tag, className, text) => {const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
const $ = id => document.getElementById(id);

function createShell() {
  const arena=$('arena'),panel=arena.querySelector('.game-panel'),sidebar=arena.querySelector('.play-sidebar');
  const top=element('div','pool-matchup'),players=$('seats'),clock=element('div','pool-match-clock');
  clock.append(element('span','pool-clock-label','回合'),$('turn-clock'));
  top.append(players,clock);panel.insertBefore(top,$('board'));
  const strip=element('div','pool-round-strip');strip.append($('status'),$('again'));panel.insertBefore(strip,$('board'));
  const chat=element('section','pool-chat-panel'),head=element('div','pool-chat-heading'),title=element('h2','','房间聊天'),count=element('span','pool-chat-count','');
  head.append(title,count);
  const log=element('div','pool-chat-log');log.setAttribute('role','log');log.setAttribute('aria-live','polite');log.setAttribute('aria-relevant','additions');log.setAttribute('aria-label','场内聊天消息');
  const empty=element('p','pool-chat-empty','和同房间的朋友聊两句吧。');log.append(empty);
  const note=element('p','pool-chat-notice'),form=element('form','pool-chat-form'),input=element('input'),send=element('button','','发送');
  input.type='text';input.maxLength=200;input.autocomplete='off';input.placeholder='发送消息…';input.setAttribute('aria-label','聊天消息');send.type='submit';form.append(input,send);
  const reactions=arena.querySelector('.reactions-panel');
  chat.append(head,log,note,reactions,form);sidebar.prepend(chat);
  const leave=$('leave-play');leave.classList.add('pool-leave');
  form.onsubmit=sendMessage;
  shell={arena,panel,sidebar,chat,top,strip,log,empty,note,input,send,count};
  return shell;
}

function clearMessages() {
  shell.log.replaceChildren(shell.empty);shell.empty.hidden=false;cursor=0;localId=0;
}
function appendMessage(event) {
  const nearBottom=shell.log.scrollHeight-shell.log.scrollTop-shell.log.clientHeight<65;
  const row=element('div','pool-chat-message'),meta=element('div','pool-chat-meta'),name=element('strong','',String(event.name||'玩家').slice(0,64)),time=element('time'),body=element('p','',String(event.text||'').slice(0,200));
  const when=new Date(event.time||Date.now());time.textContent=when.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});time.dateTime=when.toISOString();
  meta.append(name,time);row.append(meta,body);shell.empty.hidden=true;shell.log.append(row);
  while(shell.log.querySelectorAll('.pool-chat-message').length>80)shell.log.querySelector('.pool-chat-message').remove();
  if(nearBottom)shell.log.scrollTop=shell.log.scrollHeight;
}
function acceptMessages(events) {
  for(const event of Array.isArray(events)?events:[]) {
    if(!Number.isSafeInteger(event.id)||event.id<=cursor)continue;
    cursor=event.id;appendMessage(event);
  }
}
async function pollChat() {
  if(polling||!current?.room||document.hidden||document.body.dataset.screen!=='play')return;
  const id=current.room.id;polling=true;
  try {
    const events=await current.request('/api/table/rooms/'+id+'/chat?after='+cursor);
    if(roomId===id)acceptMessages(events);
  } catch(error) {
    if(roomId===id&&![403,404].includes(error.status))shell.note.textContent='聊天暂时断开，正在重连…';
  } finally {polling=false;}
}
async function sendMessage(event) {
  event.preventDefault();const text=shell.input.value.trim();if(!text||sending)return;
  if(Array.from(text).length>200){shell.note.textContent='每条消息最多200个字符。';return;}
  sending=true;shell.send.disabled=true;const id=current.room?.id;
  try {
    if(id) {
      const events=await current.request('/api/table/rooms/'+id+'/chat',{commandId:crypto.randomUUID(),text});
      if(roomId!==id)return;acceptMessages(events);shell.note.textContent='消息仅发送给当前房间。';
    } else {
      appendMessage({id:++localId,name:current.me?.account?.displayName||'你',text,time:Date.now()});shell.note.textContent='单机聊天仅在本机显示。';
    }
    shell.input.value='';
  } catch(error) {
    shell.note.textContent=error.status===429?'发送太快，请稍后再试。':[403,404,409].includes(error.status)?'当前房间不可发送，请重新进入对局。':'发送失败，内容已保留，请重试。';
  } finally {setTimeout(()=>{sending=false;shell.send.disabled=false;},1000);}
}

export function updatePoolShell(options) {
  if(!shell)createShell();current=options;
  const nextId=options.room?.id||null;
  if(nextId!==roomId){roomId=nextId;clearMessages();shell.note.textContent=nextId?'消息仅发送给当前房间。':'单机聊天仅在本机显示。';}
  shell.count.textContent=options.room?'同房间可见':'单机 · 本机可见';
  const seats=$('seats').children;
  for(let i=0;i<seats.length;i++) {
    const seat=seats[i];let score=seat.querySelector('.pool-player-score');
    if(!score){score=element('span','pool-player-score');seat.append(score);}
    score.textContent='落袋 '+Number(options.board?.cells?.[27+i]||0);score.setAttribute('aria-label',score.textContent);
  }
  const playing=document.body.dataset.screen==='play';
  if(options.room&&playing){if(!timer)timer=setInterval(pollChat,1000);pollChat();}
  else if(timer){clearInterval(timer);timer=null;}
  shell.chat.classList.toggle('pool-chat-offline',!options.room);
}
