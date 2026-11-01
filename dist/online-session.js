/** Online transport only. This module never invokes the local rules engine. */
export class OnlineSession extends EventTarget {
 constructor({origin=location.origin}={}) { super();this.origin=origin;this.room=null;this.csrf=null;this.socket=null;this.closed=false;this.retry=null;this.generation=0; }
 emit(type,detail) { this.dispatchEvent(new CustomEvent(type,{detail})); }
 async initialize() {
  this.csrf=await this.request('/api/csrf');
  await this.request('/api/session/guest',{});
  const identity=await this.request('/api/me');this.emit('identity',identity);return identity;
 }
 async request(path,body) {
  const response=await fetch(new URL(path,this.origin),{credentials:'same-origin',method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{'content-type':'application/json'}),...(this.csrf?{[this.csrf.headerName]:this.csrf.token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
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
  };
 }
 async leave() { if(!this.room)return;await this.request(`/api/rooms/${this.room.roomId}/leave`,{});this.close();this.room=null; }
 close() { this.closed=true;this.generation++;clearTimeout(this.retry);this.socket?.close();this.socket=null; }
}
