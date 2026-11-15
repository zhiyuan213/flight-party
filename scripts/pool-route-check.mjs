// Billiards trajectory verification probe.
// Verifies the two things asked about:
//   (a) cue ball -> object ball at different cut angles, and
//   (b) cue ball -> cushion at different incidence angles.
// Uses the real simulateCueShot and reads velocities back from the 16 ms
// replay frames (post-impact intervals only), so it exercises shipped code.
import {simulateCueShot} from '../dist/table/pool.js';

const R = 16;
function cells(cue, obj) {
  const c = Array(48).fill(0);
  c[0] = Math.round(cue[0] * 10); c[1] = Math.round(cue[1] * 10); c[2] = 1;
  if (obj) { c[3] = Math.round(obj[0] * 10); c[4] = Math.round(obj[1] * 10); c[5] = 1; }
  return c;
}
function parse(f) { const p = f.split(',').map(Number), o = []; for (let i = 0; i < 16; i++) o.push([p[i * 3] / 10, p[i * 3 + 1] / 10, p[i * 3 + 2]]); return o; }
function vel(a, b, i) { return [(b[i][0] - a[i][0]) / 2, (b[i][1] - a[i][1]) / 2]; }
function deg(v) { return Math.atan2(v[1], v[0]) * 180 / Math.PI; }
function mag(v) { return Math.hypot(v[0], v[1]); }

function shot(cue, obj, aim, power = 60, spin = 0) {
  const cmd = spin * 363600 + power * 3600 + Math.round(aim);
  const { c, history, audioEvents } = simulateCueShot(cells(cue, obj), cmd);
  return { c, frames: history.map(parse), ball: audioEvents.filter(e => e.kind === 'ball'), rail: audioEvents.filter(e => e.kind === 'rail') };
}

console.log('A. cue -> object ball, varied cut angle (expect: object departs along line of centres,');
console.log('   cue & object separate ~90 deg; head-on transfers momentum).\n');
for (const cut of [0, 15, 30, 45, 60, 75, 80]) {
  const b = 2 * R * Math.sin(cut * Math.PI / 180);
  const { frames, ball } = shot([150, 250], [400, 250 + b], 0);
  const t = ball[0]?.time ?? Infinity;
  const m = frames.findIndex((_, i) => i * 16 > t);
  if (m < 1 || m + 1 >= frames.length) { console.log(`  cut ${cut}deg: no contact (miss)`); continue; }
  const vo = vel(frames[m], frames[m + 1], 1), vc = vel(frames[m], frames[m + 1], 0);
  const sep = Math.abs(((deg(vo) - deg(vc)) % 180 + 360) % 180);
  console.log(`  cut ${String(cut).padStart(2)}deg: obj.dir=${deg(vo).toFixed(1).padStart(6)} (expect ~${cut})  cue.dir=${deg(vc).toFixed(1).padStart(7)}  separation=${sep.toFixed(1).padStart(5)}deg (expect ~90)`);
}

console.log('\nB. cue -> top cushion, varied incidence (expect: reflected about the wall normal,');
console.log('   tangential component reduced by Coulomb friction MU_RAIL=0.20).\n');
for (const aim of [2700, 2600, 2500, 2400]) {
  const { frames, rail } = shot([250, 250], null, aim);
  const tb = rail[0]?.time ?? Infinity;
  const m = frames.findIndex((_, i) => i * 16 > tb);
  if (m < 1 || m + 1 >= frames.length) { console.log(`  aim ${aim}: no clean bounce`); continue; }
  const pre = vel(frames[m - 2], frames[m - 1], 0), post = vel(frames[m], frames[m + 1], 0);
  const inD = deg(pre), outD = deg(post);
  const fromNormalIn = Math.abs(inD) - 90; // degrees from the wall perpendicular
  console.log(`  aim ${String(aim).padStart(4)}: in=${inD.toFixed(1).padStart(7)} (${fromNormalIn.toFixed(1)}deg off normal) -> out=${outD.toFixed(1).padStart(7)}  [mirror would be ${(-inD).toFixed(1)}]`);
}

console.log('\nC. head-on momentum transfer (clean).');
{
  const { frames, ball } = shot([150, 250], [400, 250], 0);
  const m = frames.findIndex((_, i) => i * 16 > ball[0].time);
  const pre = mag(vel(frames[m - 2], frames[m - 1], 0));
  const vo = mag(vel(frames[m], frames[m + 1], 1)), vc = mag(vel(frames[m], frames[m + 1], 0));
  console.log(`  cue before=${pre.toFixed(2)}  cue after=${vc.toFixed(2)} (expect ~${(pre * 0.025).toFixed(2)})  object after=${vo.toFixed(2)} (expect ~${(pre * 0.975).toFixed(2)})`);
}
