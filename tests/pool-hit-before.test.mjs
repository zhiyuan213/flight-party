/* Regression for the 2026-11-13 request: "改回昨天/前天的声音".
   The game's ball-ball voice is back on the pre-11-12 CC0 recording with its
   three rate variants and strength-driven low-pass. The 11-12 A-series WAVs
   stay on disk for audition pages only. The merged rack rhythm, the pocket /
   roll / cue voices and all physics are deliberately untouched. The module
   importer key was bumped again on 11-13 for the snooker-only cushion voice;
   the mp3 URL itself keeps its 20261112-hitbefore1 key because the recording
   never changed. Snooker's rail voice is covered by snooker-rail-voice.test.mjs. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const audio = () => read('dist/table/pool-audio.js');
const KEY = '20261113-snookerrail1';
const BALL_KEY = '20261112-hitbefore1';
const OLD_KEY = '20261112-hitrollback1';

test('production loads the CC0 mp3 and no longer references the A-series WAV', () => {
  const src = audio();
  assert.match(src, new RegExp('ball-clack\\.mp3\\?v=' + BALL_KEY),
    'the restored CC0 recording and its original cache key stay put');
  assert.ok(!/ball-clack-a(?:-solid)?\.wav/.test(src),
    'the A / solid WAVs are not loaded by the game module');
  assert.match(read('dist/assets/audio/pool/LICENSE.md'),
    /2026-11-13 · production source is the CC0 MP3 again/);
  assert.ok(fs.existsSync(path.join(root, 'dist/assets/audio/pool/ball-clack.mp3')));
  assert.ok(fs.existsSync(path.join(root, 'dist/assets/audio/pool/ball-clack-a-solid.wav')),
    'the 11-12 material is kept for audition, not deleted');
});

test('the 11-11 voicing is restored: three variants, lastVariant, low-pass and 110 ms trim', () => {
  const src = audio();
  assert.match(src, /lastVariant=-1/);
  assert.match(src, /\[\.97,1,1\.03\]/);
  assert.match(src, /2500\+3500\*level/);
  assert.match(src, /BURST_TONE_CUTOFF=4200/);
  assert.match(src, /RECORDED_TAIL=\.11/);
  assert.match(src, /function recordedSlice\(\)/);
  assert.match(src, /src\.start\(now,offset,duration\)/);
  assert.match(src, /lastVariant=pick/);
  assert.match(src, /Math\.sqrt\(1\+voices\.size\*\.3\)/,
    'dense voices still duck each other as they did before the A experiment');
});

test('the merged rack rhythm and all non-ball voices are untouched', () => {
  const src = audio();
  assert.match(src, /const BURST_TIMES=\[0,\.0021,\.0046,\.007,\.0098,\.0123,\.0151,\.0176,\.0205,\.023\]/,
    'the 11-12 merged 23 ms cluster stays; only the source voice changed');
  assert.match(src, /export function mixImpactSamples/);
  assert.match(src, /export function pocketSoundStages/);
  for (const voice of ['cushionSamples', 'woodRollSamples', 'woodKnockSamples', 'rubberSamples', 'woodDropSamples'])
    assert.ok(src.includes('function ' + voice), `${voice} is preserved`);
  assert.match(src, /kind==='cue'\?\.04/, 'the synthetic cue strike is unchanged');
});

test('only the pool-audio cache key was bumped; the rest of the site keeps its own chain', () => {
  const dirs = ['dist', 'tests'];
  const hits = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {walk(full); continue;}
      if (!['.js', '.mjs', '.html', '.css'].includes(path.extname(entry.name))) continue;
      const text = fs.readFileSync(full, 'utf8');
      for (const m of text.matchAll(/pool-audio\.js\?v=(\d{8}-[a-z0-9]+)/g)) hits.push({file: full, key: m[1]});
    }
  };
  for (const d of dirs) walk(path.join(root, d));
  assert.equal(hits.length, 13, 'thirteen importers of the audio module');
  assert.ok(hits.every(h => h.key === KEY), 'every importer uses the new key, forcing a cache refresh');
  assert.ok(!read('dist/table/pool-audio.js').includes(OLD_KEY));
  assert.match(read('dist/table/pool-view.js'), new RegExp('pool-audio\\.js\\?v=' + KEY));
  assert.match(read('dist/table/pool-view.js'), /20261112-gamelanes1/,
    'the shop/table version chain is not disturbed by this audio-only bump');
});

test('real module: a rack chain stays tone-locked while single hits vary', async () => {
  const originalAudio = globalThis.AudioContext, originalFetch = globalThis.fetch;
  const sources = [], filters = [], urls = [];
  const parameter = () => ({value: 0, setValueAtTime(v) {this.value = v;}, exponentialRampToValueAtTime() {}});
  let leadingSilence = new Float32Array(9600);
  for (let i = 240; i < leadingSilence.length; i++) leadingSilence[i] = .08 * Math.sin(i * .2);
  globalThis.fetch = async url => {urls.push(String(url)); return {ok: true, arrayBuffer: async () => new ArrayBuffer(8)};};
  globalThis.AudioContext = class {
    state = 'running'; currentTime = 10; sampleRate = 48000; destination = {};
    async decodeAudioData() {return {duration: .2, sampleRate: 48000, getChannelData: () => leadingSilence};}
    createBuffer(_, n, sampleRate) {return {sampleRate, length: n, getChannelData: () => new Float32Array(n)};}
    createBufferSource() {
      const s = {playbackRate: parameter(), connect() {}, disconnect() {},
        start(t, offset, duration) {this.started = t; this.offset = offset; this.duration = duration;},
        stop() {this.onended?.();}};
      sources.push(s); return s;
    }
    createGain() {return {gain: parameter(), connect() {}, disconnect() {}};}
    createBiquadFilter() {const f = {type: '', frequency: parameter(), connect() {}, disconnect() {}}; filters.push(f); return f;}
    createDynamicsCompressor() {return {threshold: parameter(), knee: parameter(), ratio: parameter(),
      attack: parameter(), release: parameter(), connect() {}};}
  };
  try {
    const mod = await import('../dist/table/pool-audio.js?hit-before-real');
    mod.setPoolMuted(false); mod.unlockPoolAudio();
    for (let i = 0; i < 8 && mod.poolRecordingStatus() !== 'ready'; i++) await Promise.resolve();
    assert.equal(mod.poolRecordingStatus(), 'ready');
    assert.ok(new URL(urls[0]).pathname.endsWith('/ball-clack.mp3'));

    for (let i = 0; i < 6; i++) assert.equal(mod.poolImpact('ball', .7), true);
    assert.ok(sources.slice(0, 6).every(s => [.97, 1, 1.03].includes(s.playbackRate.value)));
    assert.ok(new Set(sources.slice(0, 6).map(s => s.playbackRate.value)).size >= 2);
    assert.ok(sources.slice(0, 6).every(s => Math.abs(s.offset - .004) < 1e-9),
      '240 samples of leading silence are skipped (minus the 1 ms pre-roll)');
    assert.ok(filters.slice(0, 6).every(f => f.frequency.value === 4950));

    assert.equal(mod.poolImpact('ball', .7, 0, 1, 0, 1, 1, true), true);
    assert.equal(sources.at(-1).playbackRate.value, 1, 'a tone-locked chain keeps the original rate');
    assert.equal(filters.at(-1).frequency.value, 4200, 'and the fixed chain brightness');

    mod.setPoolMuted(true);
  } finally {
    globalThis.AudioContext = originalAudio; globalThis.fetch = originalFetch;
  }
});
