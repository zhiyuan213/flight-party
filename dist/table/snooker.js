import {simulateCueShot} from './pool.js?v=snooker1';

export const radius=8;
export const colours=['#fff8e6','#e34235','#edc42c','#2d9d54','#8e4728','#3979da','#e976a7','#181b23'];
export const value=id=>id>6?1:id+1;
const spots=[[245,290],[260,330],[260,170],[260,250],[500,250],[752,250],[918,250]];
const reds=cells=>Array.from({length:15},(_,i)=>i+7).filter(id=>cells[id*3+2]);
export function startSnooker(){
  const cells=spots.flatMap(([x,y])=>[x*10,y*10,1]);
  for(let col=0;col<5;col++)for(let row=0;row<=col;row++)
    cells.push(Math.round((769+col*14.2)*10),Math.round((250+(row-col/2)*16.4)*10),1);
  return {cells,turn:1,scores:[0,0],on:'red',breakScore:0,winner:0,over:false,penalty:0};
}

export function snookerTargets(state){
  if(state.on==='red')return reds(state.cells);
  if(state.on==='colour')return [1,2,3,4,5,6].filter(id=>state.cells[id*3+2]);
  return [state.on];
}

function respot(cells,id){
  const open=([x,y])=>cells.every((v,i)=>i%3!==0||i===id*3||!cells[i+2]||Math.hypot(v/10-x,cells[i+1]/10-y)>=2*radius);
  const spot=spots[id];
  let position=[spot,...spots.slice(1).reverse()].find(open);
  for(let d=1;!position&&d<1000;d++)position=[[spot[0]+d,spot[1]],[spot[0]-d,spot[1]]].find(p=>p[0]>radius&&p[0]<1000-radius&&open(p));
  if(position)cells.splice(id*3,3,position[0]*10,position[1]*10,1);
}

export function placeCue(state,x,y){
  if(!state.inHand||x>260||Math.hypot(x-260,y-250)>80)return false;
  for(let i=1;i<22;i++)if(state.cells[i*3+2]&&Math.hypot(state.cells[i*3]/10-x,state.cells[i*3+1]/10-y)<2*radius)return false;
  state.cells.splice(0,3,Math.round(x*10),Math.round(y*10),1);
  state.inHand=false;
  return true;
}

export function shootSnooker(state,command,nomination){
  if(state.over||state.inHand)throw Error('shot unavailable');
  const {c:cells,potted,firstContact,history,audioEvents}=simulateCueShot(state.cells,command,22,radius);
  const targets=snookerTargets(state);
  const nominated=targets.includes(nomination)?nomination:firstContact;
  const allowed=id=>state.on==='colour'?id===nominated&&targets.includes(id):targets.includes(id);
  const foul=!allowed(firstContact)||potted.some(id=>!allowed(id));
  const ballOn=state.on==='red'?1:state.on==='colour'?(targets.includes(nominated)?value(nominated):4):value(state.on);
  const penalty=foul?Math.max(4,ballOn,...[firstContact,...potted].filter(Boolean).map(value)):0;
  const scored=foul?0:potted.reduce((sum,id)=>sum+value(id),0);
  const scores=state.scores.slice(),other=3-state.turn;
  scores[state.turn-1]+=scored;
  scores[other-1]+=penalty;
  for(const id of potted)if(id>=1&&id<=6&&(foul||typeof state.on==='string'))respot(cells,id);
  const clearedBlack=state.on===6&&(scored||foul);
  const tied=clearedBlack&&scores[0]===scores[1];
  if(tied)respot(cells,6);
  const inHand=Boolean(tied||potted.includes(0));
  if(inHand)cells[2]=0;
  const on=clearedBlack?6:scored&&state.on==='red'?'colour':
    reds(cells).length?'red':typeof state.on==='number'?state.on+Number(Boolean(scored)):1;
  const over=Boolean(clearedBlack&&!tied);
  const next={cells,scores,on,inHand,over,winner:over?(scores[0]>scores[1]?1:2):0,
    turn:scored&&!clearedBlack?state.turn:other,penalty,
    breakScore:scored&&!clearedBlack?state.breakScore+scored:0};
  return {next,history,audioEvents};
}
