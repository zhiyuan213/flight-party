/** Online transport only. This module never invokes the local rules engine. */
export class OnlineSession extends EventTarget {
 constructor({origin=location.origin}={}) { super();this.origin=origin;this.room=null;this.csrf=null;this.socket=null;this.closed=false;this.retry=null;this.generation=0;this.authState='loading';this.identity=null;this.initializing=null;this.apiDownUntil=0;this.apiDownError=null; }
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
    try{this.csrf=await this.request('/api/csrf');await this.request('/api/session/guest',{});
     const identity=await this.request('/api/me');this.apiDownUntil=0;this.apiDownError=null;this.identity=identity;this.authState='ready';this.emit('identity',identity);this.emit('authstate',this.authState);return identity;
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
  this.closed=false;this.room=await this.request(path,body);this.connect();this.emit('room',this.room);return this.room;
 }
 create() { return this.enter('/api/rooms',{}); }
 quick() { return this.enter('/api/rooms/quick',{}); }
 rematch(roomId) { return this.enter(`/api/rooms/${roomId}/rematch`,{}); }
 join(code) { return this.enter('/api/rooms/join',{code}); }
 ready(ready=true) { return this.request(`/api/rooms/${this.room.roomId}/ready`,{ready}); }
 startNow() { return this.request(`/api/rooms/${this.room.roomId}/start-now`,{}); }
 roll(commandId=crypto.randomUUID()) { return this.request(`/api/rooms/${this.room.roomId}/roll`,{commandId}); }
 move(planeId,commandId=crypto.randomUUID()) { return this.request(`/api/rooms/${this.room.roomId}/move`,{commandId,planeId}); }
 result() { return this.request(`/api/rooms/${this.room.roomId}/result`); }
 react(emoji,commandId=crypto.randomUUID()) { return this.request(`/api/rooms/${this.room.roomId}/reaction`,{emoji,commandId}); }
 async restore(roomId) {
  this.room=await this.request(`/api/rooms/${roomId}/snapshot`);this.closed=false;this.connect();this.emit('room',this.room);return this.room;
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
    const roomId=this.room?.roomId;if(!roomId)return;
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
 async leave() { if(!this.room)return;await this.request(`/api/rooms/${this.room.roomId}/leave`,{});this.close();this.room=null; }
 close() { this.closed=true;this.generation++;clearTimeout(this.retry);this.socket?.close();this.socket=null; }
}
