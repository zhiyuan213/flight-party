export const COLORS=['blue','orange','green','red'];
export const FINISH=57;
export const TRACK=[[1,6],[2,6],[3,6],[4,6],[5,6],[6,5],[6,4],[6,3],[6,2],[6,1],[6,0],[7,0],[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[9,6],[10,6],[11,6],[12,6],[13,6],[14,6],[14,7],[14,8],[13,8],[12,8],[11,8],[10,8],[9,8],[8,9],[8,10],[8,11],[8,12],[8,13],[8,14],[7,14],[6,14],[6,13],[6,12],[6,11],[6,10],[6,9],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8],[0,7],[0,6]];
export const HOMES=[[[1,7],[2,7],[3,7],[4,7],[5,7]],[[7,1],[7,2],[7,3],[7,4],[7,5]],[[13,7],[12,7],[11,7],[10,7],[9,7]],[[7,13],[7,12],[7,11],[7,10],[7,9]]];
export function coord(color,progress){if(progress>=FINISH)return [7,7];if(progress>=52)return HOMES[color][progress-52];return TRACK[(progress+color*13)%52];}
export function secureDie(){const a=new Uint32Array(1);do{crypto.getRandomValues(a);}while(a[0]>=4294967292);return a[0]%6+1;}
export class Game{
 constructor(seats,{party=false}={}){this.players=seats.map((s,i)=>({...s,color:i,pieces:[-1,-1],bumps:0,rolls:0,rank:null}));this.active=this.players.filter(p=>p.type!=='off');if(this.active.length<2||!this.active.some(p=>p.type==='human'))throw Error('At least two seats and one human are required');this.turn=this.active[0].color;this.round=1;this.turns=0;this.die=null;this.phase='roll';this.party=party;this.event=null;this.ranking=[];}
 get current(){return this.players[this.turn];}
 roll(n=secureDie()){if(this.phase!=='roll')throw Error('Cannot roll now');if(!Number.isInteger(n)||n<1||n>6)throw Error('Invalid die');this.die=n;this.current.rolls++;this.phase='choose';return n;}
 legal(){return this.phase==='choose'?this.current.pieces.map((p,i)=>p<FINISH?i:-1).filter(i=>i>=0):[];}
 destination(piece){const old=this.current.pieces[piece];return Math.min(FINISH,(old<0?-1:old)+this.die+(this.event==='tailwind'?1:0));}
 move(piece){if(!this.legal().includes(piece))throw Error('Illegal move');const p=this.current,from=p.pieces[piece],to=this.destination(piece),captured=[];p.pieces[piece]=to;if(to<52&&this.event!=='peace'){const tile=(to+p.color*13)%52;if(tile%13!==0)for(const enemy of this.active){if(enemy===p)continue;enemy.pieces.forEach((pos,j)=>{if(pos>=0&&pos<52&&(pos+enemy.color*13)%52===tile){captured.push({color:enemy.color,piece:j,from:pos});enemy.pieces[j]=-1;p.bumps++;}});}}
 if(p.pieces.every(x=>x===FINISH)&&p.rank===null){p.rank=this.ranking.length+1;this.ranking.push(p.color);}
 this.phase='animating';return {color:p.color,piece,from,to,captured};}
 advance(){if(this.phase!=='animating')throw Error('Animation is not complete');const remaining=this.active.filter(p=>p.rank===null);if(remaining.length<=1){if(remaining.length){remaining[0].rank=this.ranking.length+1;this.ranking.push(remaining[0].color);}this.phase='over';return;}
 this.turns++;const i=this.active.findIndex(p=>p.color===this.turn);let next;for(let j=1;j<=this.active.length;j++){const p=this.active[(i+j)%this.active.length];if(p.rank===null){next=p;break;}}
 const wrapped=next.color<=this.turn;this.turn=next.color;this.die=null;this.phase='roll';if(wrapped){this.round++;if(this.party)this.phase='vote';}}
 applyEvent(event){if(this.phase!=='vote'||!['tailwind','peace'].includes(event))throw Error('Invalid event');this.event=event;this.phase='roll';}
}
