const ROOM_ID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export function roomInvitationUrl(roomId,origin,language='en'){
 if(!ROOM_ID.test(roomId))throw new TypeError('Invalid room identifier');
 const base=new URL(origin);
 if(!['https:','http:'].includes(base.protocol)||base.username||base.password)throw new TypeError('Invalid invitation origin');
 const url=new URL('/',base.origin);
 url.searchParams.set('room',roomId);
 url.searchParams.set('lang',language==='zh'?'zh':'en');
 return url.href;
}

export function isChineseMobile({language,width=globalThis.innerWidth??1024,userAgent=globalThis.navigator?.userAgent||''}={}){
 return language==='zh'&&(width<=700||/Android|iPhone|iPod|IEMobile|Windows Phone/i.test(userAgent));
}

// Call directly from the invitation button click: Web Share consumes transient user activation.
// Native targets (including WeChat when offered by the OS) are always chosen by the user.
export async function shareRoomInvitation({roomId,origin,language='zh',nav=globalThis.navigator,prepareWeChatPage,isCurrent=()=>true}={}){
 const url=roomInvitationUrl(roomId,origin,language),wechat=/MicroMessenger/i.test(nav?.userAgent||'');
 const data={title:language==='zh'?'来和我一起玩 Flight Party':'Join my Flight Party room',text:language==='zh'?'房间已准备好，点击链接加入，一起起飞！':'Open the link to join my room. Ready for takeoff!',url};
 if(!isCurrent())return{status:'cancelled',url,wechat};
 if(wechat&&typeof prepareWeChatPage==='function'){
  try{if(prepareWeChatPage(url)===true)return{status:'wechat-menu',url,wechat,menuReady:true};}catch{/* Clipboard fallback remains available. */}
 }
 try{
  if(typeof nav?.share==='function'&&(typeof nav.canShare!=='function'||nav.canShare(data))){
   await nav.share(data);return{status:isCurrent()?'native':'cancelled',url,wechat};
  }
 }catch(error){if(error?.name==='AbortError')return{status:'cancelled',url,wechat};}
 if(!isCurrent())return{status:'cancelled',url,wechat};
 // Without a configured WeChat JS-SDK we cannot select recipients or send a message.
 // Prepare the room URL for clients that use the current page for their menu share action.
 // Clipboard remains the reliable fallback because WeChat may cache its page-share metadata.
 let menuReady=false;
 if(wechat&&typeof prepareWeChatPage==='function'){try{menuReady=prepareWeChatPage(url)===true;}catch{/* Copying still works. */}}
 try{
  if(typeof nav?.clipboard?.writeText==='function'){await nav.clipboard.writeText(url);return{status:isCurrent()?'copied':'cancelled',url,wechat,menuReady};}
 }catch{/* Expose a selectable invitation if clipboard access is denied. */}
 return{status:isCurrent()?'manual':'cancelled',url,wechat,menuReady};
}
