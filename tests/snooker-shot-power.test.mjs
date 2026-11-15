/* 2026-11-13: "斯诺克的力量减少30%，要跟台球分开".
   Snooker gets its own 70% cue-speed constant while Pool keeps the shared
   SHOT_SPEED untouched. Both the browser rules and the room-authoritative
   Java rules carry the same split; the bot compensates so its difficulty
   ladder is not silently nerfed. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {simulateCueShot,SHOT_SPEED,poolStart,poolMove} from '../dist/table/pool.js';
import {startSnooker,shootSnooker,radius,SNOOKER_POWER_SCALE,SNOOKER_SHOT_SPEED} from '../dist/table/snooker.js';
import {snookerBot,BOT_POWER,NOM_BASE} from '../dist/table/snooker-duel.js';
import {start as gridStart} from '../dist/table/grid-rules.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const pool=read('dist/table/pool.js');
const snooker=read('dist/table/snooker.js');
const duel=read('dist/table/snooker-duel.js');
const view=read('dist/table/snooker-view.js');
const javaSnooker=read('backend/src/main/java/com/flightparty/table/SnookerRules.java');
const javaPool=read('backend/src/main/java/com/flightparty/table/PoolRules.java');

const COMMAND=70*3600+1800;   // 70% power, straight left
function emptyTable(){
  const s=startSnooker();
  for(let id=1;id<22;id++)s.cells[id*3+2]=0;
  s.cells[0]=5000;s.cells[1]=2500;s.cells[2]=1;
  s.on=1;
  return s;
}
const frames=history=>history.map(f=>typeof f==='string'?f.split(',').map(Number):f);
function firstStep(history){
  const f=frames(history);
  return Math.hypot(f[1][0]/10-f[0][0]/10,f[1][1]/10-f[0][1]/10);
}
function pathLength(history){
  const f=frames(history);let sum=0;
  for(let i=1;i<f.length;i++)sum+=Math.hypot(f[i][0]/10-f[i-1][0]/10,f[i][1]/10-f[i-1][1]/10);
  return sum;
}

test('the 70% constant exists only in the Snooker branch',()=>{
  assert.equal(SNOOKER_POWER_SCALE,.7);
  assert.equal(SNOOKER_SHOT_SPEED,SHOT_SPEED*.7);
  assert.equal(SHOT_SPEED,.48,'Pool keeps its original cue-speed constant');
  assert.match(snooker,/export const SNOOKER_POWER_SCALE=\.7;/);
  assert.match(snooker,/export const SNOOKER_SHOT_SPEED=SHOT_SPEED\*SNOOKER_POWER_SCALE;/);
  assert.match(pool,/simulateCueShot\(cells,command,ballCount=16,radius=16,railTangentLoss=1,shotSpeed=SHOT_SPEED\)/);
  assert.match(pool,/vx\[0\]=Math\.cos\(angle\*Math\.PI\/1800\)\*power\*shotSpeed;/);
  assert.match(pool,/vy\[0\]=Math\.sin\(angle\*Math\.PI\/1800\)\*power\*shotSpeed;/);
  assert.match(pool,/const spinSpeed=Math\.min\(power\*shotSpeed\*Math\.abs\(top\[0\]\),incomingSpeed\)/);
  // Pool's own move path never opts into the softer speed.
  assert.match(pool,/simulateCueShot\(cells,command\);/);
  assert.doesNotMatch(pool,/SNOOKER_SHOT_SPEED/);
  // The player's meter still reads 0..100; only physics is scaled.
  assert.doesNotMatch(view,/SNOOKER_POWER_SCALE|SNOOKER_SHOT_SPEED/);
  assert.match(view,/shoot\(Number\(ui\.power\.value\)\)/);
});

test('Snooker shots really travel 30% softer, with identical replay frames',()=>{
  const cells=emptyTable().cells;
  const full=simulateCueShot(cells,COMMAND,22,radius,1);
  const scaled=simulateCueShot(cells,COMMAND,22,radius,1,SNOOKER_SHOT_SPEED);
  const shot=shootSnooker(emptyTable(),COMMAND,1);
  // Replay frames are sampled every 16 ms and quantised to tenths of a table
  // unit, so the measured first step is 70.06% rather than a floating 0.7.
  assert.ok(Math.abs(firstStep(scaled.history)/firstStep(full.history)-.7)<.002,
    'first replay step is 70% of the full-speed shot within sampling error');
  assert.ok(pathLength(scaled.history)<pathLength(full.history)*.9,
    'the softer stroke covers visibly less cloth');
  assert.deepEqual(shot.history,scaled.history,'shootSnooker consumes the Snooker speed');
  assert.notDeepEqual(shot.history,full.history,'and no longer uses the Pool speed');
  assert.ok(Array.isArray(shot.audioEvents),'audio events still follow the same simulation');
});

test('Pool is bit-for-bit unchanged by the new optional argument',()=>{
  const cells=emptyTable().cells;
  const legacy=simulateCueShot(cells,COMMAND,22,radius,1);
  const explicit=simulateCueShot(cells,COMMAND,22,radius,1,SHOT_SPEED);
  assert.deepEqual(legacy.history,explicit.history);
  assert.deepEqual(legacy.c,explicit.c);
  const moved=poolMove(poolStart(),1,COMMAND);
  assert.equal(moved.game,'pool');
  assert.ok(moved.history.length>1,'8-ball break still resolves normally');
});

test('the AI compensates its command power instead of losing strength',()=>{
  assert.equal(BOT_POWER,89,'62/.7 rounded, clamped to the 1..100 command range');
  assert.match(duel,/export const BOT_POWER=Math\.min\(100,Math\.round\(62\/SNOOKER_POWER_SCALE\)\)/);
  assert.match(duel,/const aim=\(a,nomination,power=BOT_POWER\)/);
  assert.match(duel,/shootSnooker\(probe,BOT_POWER\*3600\+line\.a,nominationFor\(line\.id\)\)/);
  // A real opening rack: every level's command must carry the compensated power.
  const opening=gridStart('snooker');
  for(const level of ['easy','normal','pro','hell']){
    const cmd=snookerBot(opening,level,()=>.5);
    assert.equal(Math.floor((cmd%NOM_BASE)/3600),BOT_POWER,`${level} command power`);
  }
});

test('both power extremes stay valid and finite',()=>{
  for(const power of [1,100]){
    const shot=shootSnooker(emptyTable(),power*3600+1800,1);
    assert.ok(shot.history.length>1);
    for(const frame of frames(shot.history))
      assert.ok(frame.slice(0,3).every(Number.isFinite),'no NaN coordinates');
    assert.ok(shot.next&&typeof shot.next==='object');
  }
});

test('the room-authoritative Java rules mirror the split, Pool included',()=>{
  assert.match(javaSnooker,/private static final double SNOOKER_SHOT_SPEED=\.48\*\.7;/);
  assert.match(javaSnooker,/private static final int BOT_POWER=89;/);
  assert.match(javaSnooker,/power\*SNOOKER_SHOT_SPEED/);
  assert.match(javaSnooker,/BOT_POWER\*3600\+a/);
  assert.match(javaPool,/private static final double SHOT_SPEED=\.48;/);
  assert.match(javaPool,/power\*SHOT_SPEED;/);
  assert.doesNotMatch(javaPool,/SNOOKER/);
  assert.doesNotMatch(javaPool,/\*\.7/);
});
