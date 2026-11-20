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
import {startSnooker,shootSnooker,snookerTargets,placeCue,radius,SNOOKER_POWER_SCALE} from './snooker.js?v=20261110-dotblack1&release=20261115-polishrelease1';
import {POOL_HOLES} from './pool-geometry.js?v=20261114-pocketdepth1';
import {botTuning,jitter,pick} from '../bot-difficulty.js?v=20261112-gamelanes1&nine=20261120-nineball1';

/* The 30%-softer stroke is a player-feel change, not an AI nerf. The bot's
   geometric lines were tuned for the old absolute cue speed, so compensate
   its command power by 1/scale (62/.7 -> 89): the physical velocity stays
   exactly what the difficulty ladder was calibrated against, while a human
   pulling the same 62% meter now gets a 30% softer shot. Hell's physics
   probe uses the same power, so its verification still matches its shots. */
export const BOT_POWER=Math.min(100,Math.round(62/SNOOKER_POWER_SCALE));
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
  const fen=result.next.penalty?'鐘 +'+result.next.penalty:
    cells[S_SCORE1]+' : '+cells[S_SCORE2]+' 路 鍗曟潌 '+cells[S_BREAK];
  // Presentation-only: the physical impact timeline produced by the shared
  // cue-shot simulator. Hosted rooms carry no audioEvents, and the renderer
  // reconstructs impacts from the replay frames in that case. It is never
  // part of the authoritative cell state or the move protocol.
  return {game:'snooker',cells,turn:result.next.turn,winner:result.next.winner||0,
    over:!!result.next.over,moves:(s.moves||0)+1,history,
    audioEvents:result.audioEvents||[],fen,shotCommand:command};
}
export function snookerBot(s,level,rng=Math.random){
  const state=viewState(s),targets=snookerTargets(state),tune=botTuning(level);
  const x=state.cells[0]/10,y=state.cells[1]/10;
  const aim=(a,nomination,power=BOT_POWER)=>nomination*NOM_BASE+power*3600+((a%3600)+3600)%3600;
  const angleTo=id=>{
    const angle=id===null?0:Math.atan2(state.cells[id*3+1]/10-y,state.cells[id*3]/10-x);
    return (Math.round(angle*1800/Math.PI)+3600)%3600;
  };
  const nominationFor=id=>state.on==='colour'&&id!==null&&id<=6?id:0;
  if(!tune||tune.level==='normal'){
    let best=null,distance=Infinity;
    for(const id of targets){
      const d=Math.hypot(state.cells[id*3]/10-x,state.cells[id*3+1]/10-y);
      if(d<distance){distance=d;best=id;}
    }
    return aim(angleTo(best),nominationFor(best));
  }
  if(tune.blunder&&rng()<tune.blunder)return aim(Math.floor(rng()*3600),0);
  if(tune.level==='easy'){
    const id=pick(targets,rng)??null;
    return aim(angleTo(id)+Math.round(jitter(tune.aimDeg*10,rng)),nominationFor(id));
  }
  /* Pro and Hell aim at a GHOST BALL on the far side of the object ball from
     the nearest pocket instead of at the ball's centre: aiming at the centre
     only ever "hits" a ball, while potting needs the cut.
     Measured over repeated 10-shot openings, the nearest-pocket line is the
     physically optimal RED-phase shot: adding all six pockets, blocked-path
     penalties or power scaling made Hell 10-25 points WORSE per opening. So
     Hell stays exactly on Pro's line while reds remain, and only becomes more
     selective in the COLOUR phase (all pockets, high-value balls, clear lanes). */
  if(tune.cue>=1){
    const precise=tune.cue>=2;
    const segmentDistance=(px,py,ax,ay,bx,by)=>{
      const dx=bx-ax,dy=by-ay,len=dx*dx+dy*dy;
      const t=len?Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/len)):0;
      return Math.hypot(px-(ax+t*dx),py-(ay+t*dy));
    };
    const colours=precise&&state.on!=='red';
    const lines=[];
    let proLine=null,proCost=Infinity;
    for(const id of targets){
      const tx=state.cells[id*3]/10,ty=state.cells[id*3+1]/10;
      const nearest=POOL_HOLES.reduce((a,b)=>
        Math.hypot(tx-a[0],ty-a[1])<Math.hypot(tx-b[0],ty-b[1])?a:b);
      const holes=colours?POOL_HOLES:[nearest];
      for(const h of holes){
        const px=tx-h[0],py=ty-h[1],pl=Math.hypot(px,py)||1;
        const gx=tx+2*radius*px/pl,gy=ty+2*radius*py/pl;   // ghost ball sits one diameter behind the target
        const dx=gx-x,dy=gy-y,cueDist=Math.hypot(dx,dy)||1;
        const a=(Math.round(Math.atan2(dy,dx)*1800/Math.PI)+3600)%3600;
        const potValue=id<=6?[0,2,3,4,5,6,7][id]||1:1;
        /* Pro's line is always the cheapest nearest-pocket shot. Hell keeps it
           as a candidate, so a wider search can never make Hell worse.
           2026-11-13: larger balls and the wider rack changed every cut angle;
           pl*.7 re-anchors the nearest-pocket preference so Pro/Hell still
           outscore Normal (with pl*.35 Pro fell 10 points below Normal). */
        const classic=cueDist+pl*.7-potValue*9;
        if(h===nearest&&classic<proCost){proCost=classic;proLine={id,a};}
        let blocked=0;
        if(colours)for(let j=1;j<22;j++){
          if(j===id||!state.cells[j*3+2])continue;
          const bx=state.cells[j*3]/10,by=state.cells[j*3+1]/10;
          if(segmentDistance(bx,by,x,y,gx,gy)<2*radius)blocked++;
          if(segmentDistance(bx,by,tx,ty,h[0],h[1])<2*radius)blocked++;
        }
        lines.push({id,a,cost:classic-potValue*(colours?9:0)+blocked*30});
      }
    }
    if(proLine){
      if(!colours)return aim(proLine.a,nominationFor(proLine.id));
      /* Hell verifies its best few lines with the REAL physics simulator.
         Geometry alone once picked a line 3.6 degrees off that turned a
         7-point colour pot into a 7-point foul; scoring the simulated result
         (own points minus foul points given away) removes that failure mode.
         Pro's line is in the list, so Hell >= Pro on every colour shot. */
      lines.sort((a,b)=>a.cost-b.cost);
      const me=s.turn,other=3-me;
      let best=proLine,bestGain=-Infinity;
      for(const line of [proLine,...lines.slice(0,3)]){
        const probe=viewState(s);
        probe.turn=me;probe.over=false;probe.inHand=false;
        let gain=-Infinity;
        try{
          const result=shootSnooker(probe,BOT_POWER*3600+line.a,nominationFor(line.id));
          gain=(result.next.scores[me-1]-probe.scores[me-1])
            -(result.next.scores[other-1]-probe.scores[other-1]);
        }catch{}
        if(gain>bestGain){bestGain=gain;best=line;}
      }
      return aim(best.a,nominationFor(best.id));
    }
  }
  // Fallback for an empty target list: weigh pot value against distance.
  let best=null,cost=Infinity;
  for(const id of targets){
    const d=Math.hypot(state.cells[id*3]/10-x,state.cells[id*3+1]/10-y);
    const value=id<=6?[0,2,3,4,5,6,7][id]||1:1;
    const c=d-value*9;
    if(c<cost){cost=c;best=id;}
  }
  return aim(angleTo(best)+Math.round(jitter(tune.aimDeg*10,rng)),nominationFor(best));
}
/* Cue sports have no discrete legal-move grid; the aim is continuous. */
export function snookerLegal(){return [];}
