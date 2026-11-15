/* A seat-authenticated visual selection update. It neither submits a score
 * nor establishes ownership of a shop item. Responses update appearance only,
 * never the gameplay snapshot, which may have advanced while HTTP was pending. */
export function createRoomCosmeticSync({request,onSeat,schedule=setTimeout,cancel=clearTimeout}){
  let current=null,unavailable=false;
  function stop(){if(current?.timer)cancel(current.timer);current=null;}
  function sync(room,game,selection){
    if(!room||!['four','gomoku','xo','chess'].includes(game)||['CLOSED','SUSPENDED'].includes(room.phase)){stop();return;}
    if(unavailable)return;
    const key=JSON.stringify([room.id,room.you,selection.pieceId,selection.boardId]);
    if(current?.key===key)return;
    stop();const task=current={key,roomId:room.id,seat:Number(room.you),selection:{...selection},attempts:0,timer:0};
    async function send(){
      if(current!==task)return;task.attempts++;
      try{
        const next=await request('/api/table/rooms/'+task.roomId+'/cosmetics',task.selection);
        if(current!==task||next.id!==task.roomId)return;
        const profile=next.profiles?.[task.seat];if(profile)onSeat(task.roomId,task.seat,profile);
      }catch(error){
        if(current!==task)return;
        if([405,501].includes(error.status)){unavailable=true;return;}
        // 404 may describe a deleted room, not a missing route. Stop this
        // selection key, but let a newly joined room try its own first send.
        if([400,401,403,404,409].includes(error.status)||task.attempts>=3)return;
        task.timer=schedule(send,task.attempts*1000);
      }
    }
    send();
  }
  return {sync,stop};
}
