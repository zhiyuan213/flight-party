// Infer a single authoritative move even when the short ANIMATING snapshot was missed.
// Reconnect baselines and multi-action gaps are intentionally snapped instead of replayed.
export function onlineMovement(previous,next){
 if(!previous)return null;
 const advanced=[];
 for(const player of previous.active)player.pieces.forEach((from,piece)=>{const to=next.players[player.color]?.pieces[piece];if(Number.isInteger(to)&&to>from)advanced.push({color:player.color,piece,from,to});});
 if(advanced.length!==1)return null;
 const move=advanced[0];if(move.to-move.from>6)return null;
 move.captured=[];
 for(const enemy of previous.active)if(enemy.color!==move.color)enemy.pieces.forEach((from,piece)=>{if(from>=0&&next.players[enemy.color]?.pieces[piece]===-1)move.captured.push({color:enemy.color,piece,from});});
 return move;
}
