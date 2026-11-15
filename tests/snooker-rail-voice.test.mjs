/* Regression for 2026-11-13: "斯诺克撞墙的声音要修改，斯诺克球没那么大，
   特别是撞墙声音". Only the snooker cushion (kind==='rail') gets a smaller,
   shorter, brighter, quieter voice. Pool's rail and the restored CC0 ball-ball
   recording must stay byte-for-byte behaviourally identical. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const audio = () => read('dist/table/pool-audio.js');
const KEY = '20261113-snookerrail1';
const ref = 'pool-audio' + '.js?v=' + KEY;
const seeded = seed => {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
};
const peak = data => { let p = 0; for (const v of data) p = Math.max(p, Math.abs(v)); return p; };
const rms = data => Math.sqrt(data.reduce((sum, v) => sum + v * v, 0) / data.length);
const crossings = data => {
  let n = 0;
  for (let i = 1; i < data.length; i++) if ((data[i - 1] < 0) !== (data[i] < 0)) n++;
  return n / data.length;
};

test('the original pool rail voice and the restored ball source are preserved', () => {
  const src = audio();
  assert.match(src, /function cushionSamples\(strength,sampleRate,random\)/);
  assert.match(src, /const duration=\.058\+\.012\*level/);
  assert.match(src, /frequency=\(135\+30\*level\)\*pitch/);
  assert.match(src, /ball-clack\.mp3\?v=20261112-hitbefore1/);
  assert.match(src, /export function snookerCushionSamples/);
  assert.match(src, /export function setImpactVoice/);
  assert.match(src, /kind==='rail'&&snookerVoice\(\)\?snookerCushionSamples/);
  assert.ok(!/setImpactVoice/.test(read('dist/table/pool-view.js')),
    'pool never switches away from its original rail voice');
  assert.match(read('dist/table/snooker-view.js'), /import \{[^}]*setImpactVoice[^}]*\} from/);
  assert.match(read('dist/table/snooker-view.js'), /setImpactVoice\('snooker'\)/);
  assert.ok(read('dist/table/snooker-view.js').includes(ref));
  assert.ok(read('dist/table/pool-view.js').includes(ref));
});

test('snooker cushion samples are shorter, lighter and brighter than pool rail', async () => {
  const mod = await import('../dist/table/pool-audio.js?snooker-rail-voice-samples');
  const rate = 48000, strength = .8;
  const pool = mod.impactSamples('rail', strength, 0, rate, seeded(7));
  const snooker = mod.snookerCushionSamples(strength, rate, seeded(7));
  assert.ok(snooker.length < pool.length * .6,
    `snooker rail ${snooker.length} samples vs pool ${pool.length}`);
  assert.ok(peak(snooker) > 0 && peak(snooker) < peak(pool) * .8,
    `peak ${peak(snooker)} vs pool ${peak(pool)}`);
  assert.ok(rms(snooker) < rms(pool) * .8, `rms ${rms(snooker)} vs pool ${rms(pool)}`);
  assert.ok(crossings(snooker) > crossings(pool) * 1.25,
    `zero-crossing rate ${crossings(snooker)} vs pool ${crossings(pool)}`);
  for (const data of [pool, snooker]) {
    assert.equal(data[0], 0);
    assert.equal(data[data.length - 1], 0);
    assert.ok(data.every(Number.isFinite));
  }
  const soft = mod.snookerCushionSamples(.15, rate, seeded(11));
  const hard = mod.snookerCushionSamples(.95, rate, seeded(11));
  assert.ok(peak(hard) > peak(soft) * 1.5, 'a harder cushion contact is still louder');
  assert.ok(hard.length > soft.length, 'and slightly longer');
});

test('real module: only rail events change voice; ball, cue and roll are unaffected', async () => {
  const originalAudio = globalThis.AudioContext;
  const originalFetch = globalThis.fetch;
  const originalDocument = globalThis.document;
  const buffers = [];
  let snookerBody = false;
  const parameter = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  globalThis.document = {
    hidden: false,
    body: { classList: { contains: cls => cls === 'snooker-game' && snookerBody } }
  };
  globalThis.fetch = async () => ({ ok: false });
  globalThis.AudioContext = class {
    state = 'running'; currentTime = 10; sampleRate = 48000; destination = {};
    createBuffer(_, n, sampleRate) {
      const data = new Float32Array(n);
      const buffer = { sampleRate, length: n, getChannelData: () => data, data };
      buffers.push(buffer); return buffer;
    }
    createBufferSource() {
      return { playbackRate: parameter(), connect() {}, disconnect() {},
        start() {}, stop() { this.onended?.(); } };
    }
    createGain() { return { gain: parameter(), connect() {}, disconnect() {} }; }
    createBiquadFilter() { return { type: '', frequency: parameter(), connect() {}, disconnect() {} }; }
    createDynamicsCompressor() {
      return { threshold: parameter(), knee: parameter(), ratio: parameter(),
        attack: parameter(), release: parameter(), connect() {} };
    }
  };
  try {
    const mod = await import('../dist/table/pool-audio.js?snooker-rail-voice-runtime');
    mod.setPoolMuted(false);
    mod.unlockPoolAudio();

    mod.setImpactVoice('pool');
    assert.equal(mod.impactVoiceName(), 'pool');
    assert.equal(mod.poolImpact('rail', .8), true);
    const poolRail = buffers.at(-1);

    mod.setImpactVoice('snooker');
    assert.equal(mod.impactVoiceName(), 'snooker');
    assert.equal(mod.poolImpact('rail', .8), true);
    const snookerRail = buffers.at(-1);
    assert.ok(snookerRail.length < poolRail.length * .6,
      `playing snooker rail produced ${snookerRail.length} samples vs ${poolRail.length}`);
    assert.ok(peak(snookerRail.data) > 0 && peak(snookerRail.data) < peak(poolRail.data) * .8);

    // Ball / cue / roll use the same samples in both voices.
    for (const kind of ['ball', 'cue', 'roll']) {
      mod.setImpactVoice('pool');
      assert.equal(mod.poolImpact(kind, .7), true);
      const before = buffers.at(-1);
      mod.setImpactVoice('snooker');
      assert.equal(mod.poolImpact(kind, .7), true);
      const after = buffers.at(-1);
      assert.equal(after.length, before.length, `${kind} length is voice-independent`);
    }

    // A rail inside a mixed burst also inherits the snooker voice.
    mod.setImpactVoice('snooker');
    const played = mod.poolImpactBurst([{ kind: 'ball', strength: .3 }, { kind: 'rail', strength: .8 }]);
    assert.ok(played > 0);
    assert.ok(buffers.at(-1).length < poolRail.length * .6);

    // Auto mode follows the table page body class.
    mod.setImpactVoice('auto');
    snookerBody = true;
    assert.equal(mod.poolImpact('rail', .8), true);
    assert.ok(buffers.at(-1).length < poolRail.length * .6);
    snookerBody = false;
    assert.equal(mod.poolImpact('rail', .8), true);
    assert.equal(buffers.at(-1).length, poolRail.length);

    mod.setPoolMuted(true);
  } finally {
    globalThis.AudioContext = originalAudio;
    globalThis.fetch = originalFetch;
    globalThis.document = originalDocument;
  }
});
