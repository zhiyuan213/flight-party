import test from 'node:test';
import assert from 'node:assert/strict';
import {startSnooker,shootSnooker,radius} from '../dist/table/snooker.js';
import {simulateCueShot} from '../dist/table/pool.js';

/* Regression for a real bug: a snooker cue ball aimed at a cushion with a
   slight upward angle came back perfectly horizontal and then bounced
   left/right until it stopped. The culprit was the cushion's Coulomb friction
   cap, min(|vt|, MU_RAIL*railSpeed), which can erase the whole along-rail
   velocity when the hit is near-perpendicular. Snooker has no side-spin field
   to rebuild it, so it now caps the loss at 25% of |vt| instead. */
function emptyTable(){
  const state=startSnooker();
  for(let id=1;id<22;id++)state.cells[id*3+2]=0;
  state.cells[0]=9000;state.cells[1]=2500;state.cells[2]=1;
  state.on=1;
  return state;
}
// 70% power, 3520 tenths of a degree (=-8 degrees): rightward with a small
// upward component, straight into the right cushion.
const COMMAND=70*3600+3520;
const heights=history=>history.map(frame=>Number(frame.split(',')[1])/10);

test('snooker rebound keeps its upward component instead of sliding sideways',()=>{
  const {history}=shootSnooker(emptyTable(),COMMAND,1);
  const path=heights(history);
  const span=Math.max(...path)-Math.min(...path);
  assert.ok(span>150,`cue ball must climb away from the rail, vertical span was ${span.toFixed(1)}`);
  assert.ok(new Set(path.map(Math.round)).size>60,'trajectory must not collapse onto one horizontal line');
});

test('pool keeps its original cushion friction when the new parameter is omitted',()=>{
  const cells=emptyTable().cells;
  const legacy=simulateCueShot(cells,COMMAND,22,radius);
  const explicit=simulateCueShot(cells,COMMAND,22,radius,1);
  assert.deepEqual(legacy.history,explicit.history,'default railTangentLoss must be 1');
  assert.deepEqual(legacy.c,explicit.c);
  // The snooker cap is a real behavioural change, not a dead parameter.
  const capped=simulateCueShot(cells,COMMAND,22,radius,.25);
  assert.notDeepEqual(capped.history,legacy.history);
});
