/*
 * Ball-in-hand after a scratch.
 *
 * Placing the cue ball is a real state change, so it travels through the same
 * integer `position` channel as a shot (grid-rules / TableService.move), not
 * through a client-only overlay. The command carries the cue spot in tenths of
 * a table unit and stays below 2^31 for the Java `int position` parameter.
 *
 * pool.js and PoolRules.java both call these exact predicates; keep the two
 * implementations in step. No existing shot command changes, so the golden
 * fixtures and the JS/Java parity baseline are untouched.
 */
import {pocketIndex} from './pool-geometry.js?v=20261114-pocketdepth1';
import {BALL_COUNT,PENALTY_VISIT,PENALTY_READY,STATE_SIZE} from './pool-rules.js?v=20261110-glove2&nine=20261120-nineball1';

export const PLACE_BASE=1000000000,PLACE_STRIDE=10000,PLACE_LIMIT=100000000;
export const CUE_IN_HAND_FEN='犯规：白球落袋';
// State units are tenths of a table unit; a ball has radius 16 table units.
export const CUE_MIN=160,CUE_MAX_X=9840,CUE_MAX_Y=4840,CUE_CLEARANCE=330;

export function encodePoolPlace(x,y){
  return PLACE_BASE+Math.round(x)*PLACE_STRIDE+Math.round(y);
}
export function isPoolPlace(command){
  return Number.isInteger(command)&&command>=PLACE_BASE&&command<PLACE_BASE+PLACE_LIMIT;
}
export function decodePoolPlace(command){
  if(!isPoolPlace(command))return null;
  const body=command-PLACE_BASE;
  return {x:Math.floor(body/PLACE_STRIDE),y:body%PLACE_STRIDE};
}

/** A foul that potted the cue ball gives the next player ball in hand. */
export function poolCueInHand(s){
  if(!s||s.over||!Array.isArray(s.cells)||s.cells.length<STATE_SIZE)return false;
  if(s.cells[2]!==1||s.cells[PENALTY_VISIT]!==PENALTY_READY)return false;
  // fen is absent on some archived states; those still get the default spot.
  return !s.fen||String(s.fen).startsWith(CUE_IN_HAND_FEN);
}

/** A placeable spot: on the bed, outside a mouth, and clear of every ball. */
export function legalCueSpot(cells,x,y){
  if(!Number.isFinite(x)||!Number.isFinite(y))return false;
  if(x<CUE_MIN||x>CUE_MAX_X||y<CUE_MIN||y>CUE_MAX_Y)return false;
  if(pocketIndex(x/10,y/10)>=0)return false;
  for(let i=1;i<BALL_COUNT;i++)if(cells[i*3+2]){
    const dx=x-cells[i*3],dy=y-cells[i*3+1];
    if(dx*dx+dy*dy<CUE_CLEARANCE*CUE_CLEARANCE)return false;
  }
  return true;
}

/**
 * Slide towards the pointer but never through a rail, a mouth or a ball: walk
 * back along the segment from the last legal spot until the position clears.
 * Trying only the x / y component would let the ball jump sideways across the
 * whole table when the pointer lands on the rack.
 */
export function clampCueSpot(cells,x,y,fallback){
  const nx=Math.max(CUE_MIN,Math.min(CUE_MAX_X,Math.round(x)));
  const ny=Math.max(CUE_MIN,Math.min(CUE_MAX_Y,Math.round(y)));
  if(legalCueSpot(cells,nx,ny))return {x:nx,y:ny};
  if(!fallback||!legalCueSpot(cells,fallback.x,fallback.y))return null;
  let lo=0,hi=1;
  for(let i=0;i<14;i++){
    const mid=(lo+hi)/2;
    const px=Math.round(fallback.x+(nx-fallback.x)*mid);
    const py=Math.round(fallback.y+(ny-fallback.y)*mid);
    if(legalCueSpot(cells,px,py))lo=mid;else hi=mid;
  }
  return {x:Math.round(fallback.x+(nx-fallback.x)*lo),
    y:Math.round(fallback.y+(ny-fallback.y)*lo)};
}
