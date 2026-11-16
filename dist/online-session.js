/** Online transport only. This module never invokes the local rules engine. */
export class OnlineSession extends EventTarget {
 constructor({origin=location.origin}={}) { super();this.origin=origin;this.room=null;this.csrf=null;this.socket=null;this.closed=false;this.retry=null;this.generation=0;this.authState='loading';this.identity=null;this.initializing=null;this.apiDownUntil=0;this.apiDownError=null;this.leaving=null; }
 emit(type,detail) { this.dispatchEvent(new CustomEvent(type,{detail})); }
 /* A static preview has no /api/ backend. Once one request has returned a
    definitive 4xx, remember it briefly: focus / visibility / login-dialog
    events call initialize() again, and without this guard every one of them
    emits another red 404. 30s is long enough to stop the flood but short
    enough that starting the backend still recovers without a reload. */
 down(){return this.apiDownUntil>Date.now()?(this.apiDownError||new Error('API unavailable')):null;}
 async initialize() {
  if(this.initializing)return this.initializing;
  const down=this.down();if(down)throw down;
  this.authState='loading';this.emit('authstate',this.authState);
  this.initializing=(async()=>{
   let last;for(let attempt=0;attempt<4;attempt++){
    try{
     /* /api/csrf has to run first because it establishes the session cookie.
        Once that cookie exists the guest probe and /api/me are independent:
        running them together removes one whole round trip per page load on a
        high-latency link. A brand-new browser (kind "none") needs one more
        /api/me after the guest principal has been written. */
     this.csrf=await this.request('/api/csrf');
     const [,identity]=await Promise.all([this.request('/api/session/guest',{}),this.request('/api/me')]);
     let me=identity;
     if(!me||me.kind==='none')me=await this.request('/api/me');
     this.apiDownUntil=0;this.apiDownError=null;this.identity=me;this.authState='ready';this.emit('identity',me);this.emit('authstate',this.authState);return me;
    }catch(error){last=error;
     // A 4xx is definitive: the endpoint is missing or the request was rejected
     // (for example a static preview with no backend behind /api/). Retrying it
     // cannot succeed, but it floods the network panel with identical 404s and
     // keeps the room dialog stuck on "Joining the room…". Network failures and
     // 5xx still use the exponential backoff below.
     if(error&&error.status>=400&&error.status<500){this.apiDownUntil=Date.now()+30000;this.apiDownError=error;break;}
     if(attempt<3)await new Promise(resolve=>setTimeout(resolve,800*Math.pow(2,attempt)));}
   }
   this.authState='error';this.emit('authstate',this.authState);throw last;
  })();
  try{return await this.initializing;}finally{this.initializing=null;}
 }
 async refreshIdentity(){
  const down=this.down();if(down)throw down;
  try{const identity=await this.request('/api/me');this.identity=identity;this.authState='ready';this.emit('identity',identity);this.emit('authstate',this.authState);return identity;}
  catch(error){this.authState='error';this.emit('authstate',this.authState);throw error;}
 }
 async request(path,body) {
  const response=await fetch(new URL(path,this.origin),{credentials:'same-origin',cache:'no-store',method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'content-type':'application/json'}),...(this.csrf?{[this.csrf.headerName]:this.csrf.token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  if(!response.ok) { const error=new Error(`Online request failed (${response.status})`);error.status=response.status;throw error; }
  const text=await response.text();return text?JSON.parse(text):null;
 }
 async enter(path,body) {
  if(!this.csrf)await this.initialize();
  this.closed=false;const room=await this.request(path,body);this.room=room;this.connect();this.emit('room',room);return room;
 }
 create() { return this.enter('/api/rooms',{}); }
 quick() { return this.enter('/api/rooms/quick',{}); }
 rematch(roomId) { return this.enter(`/api/rooms/${roomId}/rematch`,{}); }
 join(code) { return this.enter('/api/rooms/join',{code}); }
 /* Room-scoped commands must not outlive the room. The server removes the seat
    as soon as /leave lands, so a late command would return 403 and turn the
    crew dialog into a dead end. Reject locally instead: no wasted round trip
    and no stale 403 on a slow connection. */
 live(action,body){
  const roomId=this.room?.roomId;
  if(this.closed||!roomId||this.leaving===roomId){const error=new Error('Room is no longer active');error.status=403;return Promise.reject(error);}
  return this.request(`/api/rooms/${roomId}${action}`,body);
 }
 ready(ready=true) { return this.live('/ready',{ready}); }
 startNow() { return this.live('/start-now',{}); }
 roll(commandId=crypto.randomUUID()) { return this.live('/roll',{commandId}); }
 move(planeId,commandId=crypto.randomUUID()) { return this.live('/move',{commandId,planeId}); }
 result() { return this.live('/result'); }
 react(emoji,commandId=crypto.randomUUID()) { return this.live('/reaction',{emoji,commandId}); }
 async restore(roomId) {
  try{
   const room=await this.request(`/api/rooms/${roomId}/snapshot`);
   this.room=room;this.closed=false;this.connect();this.emit('room',room);return room;
  }catch(error){
   /* An invitation or /api/me pointer can outlive the room it names. Treat a
      403/404 as "no active room", not as a failed page load, so the welcome
      screen stays usable and the next CTA creates a fresh room. */
   if([403,404].includes(error.status)){this.close();this.room=null;this.emit('left',{roomId,stale:true});}
   throw error;
  }
 }
 connect() {
  clearTimeout(this.retry);const generation=++this.generation;
  this.socket?.close();const url=new URL('/ws',this.origin);url.protocol=url.protocol==='https:'?'wss:':'ws:';
  const socket=this.socket=new WebSocket(url);
  socket.onopen=()=>{if(generation===this.generation)socket.send(JSON.stringify({type:'SUBSCRIBE',roomId:this.room.roomId}));};
  socket.onmessage=event=>{
   if(generation!==this.generation)return;
   try { const message=JSON.parse(event.data);if(message.type!=='SNAPSHOT'||message.room.roomId!==this.room.roomId)return;this.room=message.room;this.emit('snapshot',message); }
   catch(error) { this.emit('error',error); }
  };
  socket.onclose=event=>{
   if(generation!==this.generation||this.closed)return;
   this.emit('connection',{connected:false,code:event.code});
   if(event.code!==1008)this.retry=setTimeout(()=>this.connect(),1500);
   else {
    const roomId=this.room?.roomId;if(!roomId||this.leaving===roomId)return;
    this.request(`/api/rooms/${roomId}/snapshot`).then(room=>{
     if(generation!==this.generation||this.closed)return;
     this.room=room;this.retry=setTimeout(()=>this.connect(),250);
    }).catch(error=>{
     if(generation!==this.generation||this.closed)return;
     if([403,404].includes(error.status)){this.close();this.room=null;this.emit('left',{roomId});}
    });
   }
  };
 }
 async leave() {
  const roomId=this.room?.roomId;if(!roomId)return;
  /* Detach BEFORE the request. Dropping the seat makes RoomSocket close the
     socket with 1008; the old reconnect path immediately re-requested
     /snapshot for that same room, got a 403 and left the dialog stuck on
     "Could not join this room". Bumping the generation here also makes any
     in-flight close handler a no-op. */
  this.close();this.leaving=roomId;
  try{await this.request(`/api/rooms/${roomId}/leave`,{});}
  finally{
   // A newer enter() may already own another room; never clear it.
   if(this.room?.roomId===roomId)this.room=null;
   if(this.leaving===roomId)this.leaving=null;
  }
 }
 discard(){this.close();this.room=null;this.leaving=null;}
 close() { this.closed=true;this.generation++;clearTimeout(this.retry);this.socket?.close();this.socket=null; }
}
