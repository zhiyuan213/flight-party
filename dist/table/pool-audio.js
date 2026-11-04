// Short, bounded synthesized impacts. Audio starts only after a player gesture.
let context, muted = false;
try { muted = localStorage.getItem('joyflock.pool.muted') === '1'; } catch {}
export const poolMuted = () => muted;
export function setPoolMuted(value) { muted = value; try { localStorage.setItem('joyflock.pool.muted', value ? '1' : '0'); } catch {} }
export function unlockPoolAudio() {
  try { const Audio = globalThis.AudioContext || globalThis.webkitAudioContext; if (!Audio) return; context ||= new Audio(); if (context.state === 'suspended') context.resume().catch(() => {}); } catch {}
}
export function poolImpact(kind, strength = .5) {
  if (muted || !context || context.state !== 'running' || globalThis.document?.hidden) return false;
  const t = context.currentTime, level = Math.max(.08, Math.min(1, strength));
  const duration = kind === 'pocket' ? .18 : kind === 'rail' ? .09 : .055;
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * .13));
  const noise = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
  noise.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = kind === 'ball' ? 4200 : kind === 'cue' ? 2600 : 950;
  gain.gain.setValueAtTime(level * .28, t); gain.gain.exponentialRampToValueAtTime(.001, t + duration);
  noise.connect(filter); filter.connect(gain); gain.connect(context.destination); noise.start(t); noise.stop(t + duration);
  const tone = context.createOscillator(), body = context.createGain();
  tone.frequency.setValueAtTime(kind === 'ball' ? 1650 : kind === 'cue' ? 900 : kind === 'rail' ? 190 : 90, t);
  tone.frequency.exponentialRampToValueAtTime(kind === 'pocket' ? 45 : 120, t + duration);
  body.gain.setValueAtTime(level * .13, t); body.gain.exponentialRampToValueAtTime(.001, t + duration);
  tone.connect(body); body.connect(context.destination); tone.start(t); tone.stop(t + duration);
  return true;
}
