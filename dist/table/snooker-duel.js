/* Snooker in the shared room/board pipeline.
 *
 * The browser arcade used to own its own state object (scores / on / inHand /
 * breakScore ...). Hosted rooms can only carry GridRules.State, i.e. an int[]
 * plus turn/winner/over/moves/history. So the whole table is encoded here:
 *
 *   [0..65]  22 balls x (x*10, y*10, alive)      - same layout as snooker.js
 *   [66]     player 1 score
 *   [67]     player 2 score
 *   [68]     ball on: -1 red, -2 any colour, 1..6 final clearing colour
 *   [69]     current break
 *   [70]     cue ball in hand (always resolved before the state is exposed)
 *   [71]     last foul penalty (for the status line)
 *
 * A shot is one integer command, exactly like Pool's cue command:
 *   nomination * NOM_BASE + power * 3600 + angle(0..3599, tenths of a degree)
 * NOM_BASE is above Pool's largest spin-coded command, so the two never mix.
 * Local play and hosted play both call snookerMove; only the caller changes.
 */
import {startSnooker,shootSnooker,snookerTargets,placeCue} from './snooker.js?v=20261109-snooker3';

export const NOM_BASE=3600000;
export const S_SCORE1=66,S_SCORE2=67,S_ON=68,S_BREAK=69,S_INHAND=70,S_PENALTY=71;
export const STATE_SIZE=72;
const ON_RED=-1,ON_COLOUR=-2;
const encodeOn=on=>on==='red'?ON_RED:on==='colour'?ON_COLOUR:Number(on)||1;
const decodeOn=v=>v===ON_RED?'red':v===ON_COLOUR?'colour':Number(v)||1;

export function viewState(board){
  const c=board?.cells||[];
  return {
    cells:c.slice(0,66),
    scores:[c[S_SCORE1]||0,c[S_SCORE2]||0],
    on:decodeOn(c[S_ON]??ON_RED),
    breakScore:c[S_BREAK]||0,
    inHand:!!c[S_INHAND],
    penalty:c[S_PENALTY]||0,
    turn:board?.turn||1,
    winner:board?.winner||0,
    over:!!board?.over
  };
}
function toCells(state){
  const c=state.cells.slice(0,66);
  while(c.length<66)c.push(0);
  c[S_SCORE1]=state.scores?.[0]||0;
  c[S_SCORE2]=state.scores?.[1]||0;
  c[S_ON]=encodeOn(state.on);
  c[S_BREAK]=state.breakScore||0;
  c[S_INHAND]=state.inHand?1:0;
  c[S_PENALTY]=state.penalty||0;
  return c;
}
/* In a hosted room there is no extra "place the cue ball" round-trip: the
   rules put it back on a free spot inside the D right away. Local play uses
   the same path so both modes behave identically. */
function autoPlaceCue(state){
  if(!state.inHand)return;
  for(const [x,y] of [[240,250],[225,250],[210,250],[240,225],[240,275],[245,290],[235,290],[200,250]]){
    if(placeCue(state,x,y))return;
  }
  state.cells.splice(0,3,2450,2900,1);
  state.inHand=false;
}
export function snookerStart(){
  const state=startSnooker();
  return {game:'snooker',cells:toCells(state),turn:1,winner:0,over:false,moves:0,
    history:[],fen:'',shotCommand:null};
}
export function snookerMove(s,actor,command){
  if(s.over||s.turn!==actor)throw Error('turn');
  const nomination=Math.floor(command/NOM_BASE),shot=command%NOM_BASE;
  const power=Math.floor(shot/3600),angle=shot%3600;
  if(!Number.isInteger(command)||command<0||nomination<0||nomination>6||power<1||power>100)throw Error('shot');
  const state=viewState(s);
  state.turn=actor;state.over=false;state.inHand=false;
  const result=shootSnooker(state,shot,nomination);
  autoPlaceCue(result.next);
  const cells=toCells(result.next);
  /* The final replay frame must match the authoritative cells (including the
     automatically re-spotted cue ball), otherwise the table jumps at the end. */
  const history=result.history.slice();
  const lastFrame=Array.from({length:22},(_,i)=>[cells[i*3],cells[i*3+1],cells[i*3+2]]).flat().join(',');
  if(history.length)history[history.length-1]=lastFrame;else history.push(lastFrame);
  const fen=result.next.penalty?'犯规 +'+result.next.penalty:
    cells[S_SCORE1]+' : '+cells[S_SCORE2]+' · 单杆 '+cells[S_BREAK];
  return {game:'snooker',cells,turn:result.next.turn,winner:result.next.winner||0,
    over:!!result.next.over,moves:(s.moves||0)+1,history,
    fen,shotCommand:command};
}
export function snookerBot(s){
  const state=viewState(s);
  const targets=snookerTargets(state);
  const x=state.cells[0]/10,y=state.cells[1]/10;
  let best=null,distance=Infinity;
  for(const id of targets){
    const d=Math.hypot(state.cells[id*3]/10-x,state.cells[id*3+1]/10-y);
    if(d<distance){distance=d;best=id;}
  }
  const angle=best===null?0:Math.atan2(state.cells[best*3+1]/10-y,state.cells[best*3]/10-x);
  const a=(Math.round(angle*1800/Math.PI)+3600)%3600;
  const nomination=state.on==='colour'&&best!==null&&best<=6?best:0;
  return nomination*NOM_BASE+62*3600+a;
}
/* Cue sports have no discrete legal-move grid; the aim is continuous. */
export function snookerLegal(){return [];}
