import {SPIN_STRIDE} from './pool-input.js?v=20261110-glove2';

export const OPPONENT_CUE_DURATION = 1100;
export const REPLAY_CUE_DURATION = 650;

export function opponentShot(command) {
  const value=command%SPIN_STRIDE,power=Math.floor(value/3600);
  if(!Number.isInteger(command)||command<0||power<1||power>100||Math.floor(command/SPIN_STRIDE)>8)return null;
  return {angle:value%3600,power};
}

// An online cue is reconstructed only after an authoritative shot arrives.
// Never use a later rebound or a respotted white ball as the aiming direction.
export function replayOpponentShot(frames,command) {
  const recorded=opponentShot(command);
  if(recorded)return recorded;
  const first=frames[0];
  if(!first?.[2])return null;
  for(let i=1;i<Math.min(4,frames.length);i++) {
    const next=frames[i];
    if(!next)return null;
    const dx=next[0]-first[0],dy=next[1]-first[1],distance=Math.hypot(dx,dy);
    // Both engines record their first 2ms step, followed by 16ms samples.
    // Cells use tenths of a table unit; this is a visual strength estimate.
    if(distance>.5)return {angle:(Math.round(Math.atan2(dy,dx)*1800/Math.PI)+3600)%3600,power:Math.max(5,Math.min(100,distance/(.8+(i-1)*6.4)))};
    if(!next[2])return null;
  }
  return null;
}

export function opponentCuePose(shot,elapsed,duration=OPPONENT_CUE_DURATION) {
  const phase=Math.max(0,Math.min(1,elapsed/duration)),maxPull=shot.power*.8;
  let pull=0;
  if(phase>=.42&&phase<.84){const t=(phase-.42)/.42;pull=maxPull*(t*t*(3-2*t));}
  else if(phase>=.84){const t=(phase-.84)/.16;pull=maxPull*(1-t*t);}
  return {angle:shot.angle,pull:Math.max(0,pull),guide:phase<.84,done:phase>=1};
}
