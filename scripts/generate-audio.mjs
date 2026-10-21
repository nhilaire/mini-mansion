#!/usr/bin/env node
// Synthesises the game's 8-bit sound effects, activity loops and chiptune music into assets/audio/*.wav (mono, 16-bit
// PCM). No samples, no third-party audio: every sound is computed here, so the files carry no external licence.
// Deterministic (seeded noise): re-running it produces identical files. Usage: node scripts/generate-audio.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'audio');

let seed = 4747;
const noise = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed / 0x7fffffff) * 2 - 1;
};

const square = (f, t, duty = 0.5) => ((f * t) % 1 < duty ? 0.5 : -0.5);
const triangle = (f, t) => 2 * Math.abs(2 * ((f * t) % 1) - 1) - 1;

function render(rate, seconds, fn) {
  const n = Math.round(seconds * rate);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = fn(i / rate, i / n);
  return out;
}

// A one-pole low-pass filter (muffles noise into thuds and rumbles).
function lowpass(samples, k) {
  let y = 0;
  return samples.map((x) => (y += k * (x - y)));
}

// ---------- sound effects (22.05 kHz) ----------
const SFX_RATE = 22050;
const sfx = {
  // Item taken: two quick rising notes.
  take: () => render(SFX_RATE, 0.18, (t, p) => square(p < 0.5 ? 784 : 1175, t, 0.25) * (1 - p) * 0.9),
  // Door: a wooden knock and a creak.
  door: () => render(SFX_RATE, 0.35, (t, p) => (p < 0.15 ? noise() * (1 - p / 0.15) : square(180 + 60 * Math.sin(p * 20), t, 0.3) * 0.25 * (1 - p))),
  // Wrong combination: a low "bonk".
  wrong: () => render(SFX_RATE, 0.22, (t, p) => square(196 - 60 * p, t) * (1 - p) * 0.8),
  // Puzzle solved: a bright arpeggio.
  solved: () =>
    render(SFX_RATE, 0.6, (t, p) => {
      const step = Math.min(3, Math.floor(p * 4));
      return square([523, 659, 784, 1047][step], t, 0.25) * (1 - (p * 4 - step) * 0.6) * 0.8;
    }),
  // Footstep (played during walks).
  step: () => render(SFX_RATE, 0.06, (t, p) => noise() * (1 - p) ** 3 * 0.5),
  // Doorbell: ding-dong.
  bell: () => render(SFX_RATE, 0.9, (t, p) => triangle(p < 0.45 ? 988 : 784, t) * (p < 0.45 ? 1 - p / 0.45 : 1 - (p - 0.45) / 0.55) * 0.8),
  // Drums: one fill (also the loop of the music corner, see below).
  drums: () => drumLoop(1.2),
  // Washing machine starting: a rising hum.
  machine: () => render(SFX_RATE, 0.8, (t, p) => square(60 + 40 * p, t, 0.5) * 0.4 + noise() * 0.1),
  // End of the cycle: DING.
  ding: () => render(SFX_RATE, 0.7, (t, p) => (triangle(1319, t) + triangle(2637, t) * 0.3) * (1 - p) ** 2),
  // Running water: hiss.
  water: () => lowpass(render(SFX_RATE, 1.2, (t, p) => noise() * Math.sin(Math.PI * p) * 0.9), 0.5),
  // Pool pump: a gurgling motor.
  pump: () => render(SFX_RATE, 1.2, (t, p) => square(70, t, 0.4) * 0.35 * Math.sin(Math.PI * p) + noise() * 0.2 * Math.sin(p * 60) ** 2),
  // Keypad beeps.
  beep: () => render(SFX_RATE, 0.4, (t, p) => (Math.floor(p * 4) % 1 === 0 && (p * 4) % 1 < 0.6 ? square(1568, t, 0.5) * 0.6 : 0)),
  // Secret door: a stone rumble sliding upward.
  secret: () => {
    const rumble = lowpass(render(SFX_RATE, 1.4, (t, p) => noise() * Math.sin(Math.PI * p) * 0.8), 0.08);
    return rumble.map((x, i) => x * 3 + square(70 + 40 * (i / rumble.length), i / SFX_RATE, 0.5) * 0.15);
  },
  // Caught: a descending sting.
  capture: () => render(SFX_RATE, 0.7, (t, p) => square(440 * 2 ** (-p * 1.5), t, 0.5) * (1 - p) * 0.8),
  // Notebook entry written: a soft chime.
  note: () => render(SFX_RATE, 0.3, (t, p) => triangle(p < 0.5 ? 1047 : 1568, t) * (1 - p) * 0.6),
  // A heavy switch: a click then a short hum.
  breaker: () => render(SFX_RATE, 0.4, (t, p) => (p < 0.08 ? noise() * (1 - p / 0.08) : square(100, t, 0.5) * 0.3 * (1 - p))),
  // A spray of water: bright noise that fades.
  spray: () => render(SFX_RATE, 0.8, (t, p) => noise() * (p < 0.1 ? p / 0.1 : 1 - p) * 0.8),
  // A food processor: a rising motor whine.
  robot: () => render(SFX_RATE, 1.0, (t, p) => square(110 + 220 * Math.min(1, p * 3), t, 0.4) * 0.35 * Math.sin(Math.PI * p) + noise() * 0.08),
  // A small comic boing for the gags.
  gag: () => render(SFX_RATE, 0.3, (t, p) => triangle(330 + 330 * Math.sin(p * 18) * (1 - p), t) * (1 - p) * 0.7),
};

// Drum kit pattern: kick, snare (noise), hi-hat ticks.
function drumLoop(seconds) {
  const beat = 0.15;
  return render(SFX_RATE, seconds, (t) => {
    const i = Math.floor(t / beat);
    const local = t - i * beat;
    const kick = i % 4 === 0 ? Math.sin(2 * Math.PI * (60 + 80 * Math.exp(-local * 40)) * local) * Math.exp(-local * 18) : 0;
    const snare = i % 4 === 2 ? noise() * Math.exp(-local * 25) * 0.7 : 0;
    const hat = noise() * Math.exp(-local * 120) * 0.25;
    return kick + snare + hat;
  });
}

// ---------- activity loops (11.025 kHz, quiet): what is heard behind the doors and in the music corner ----------
const LOOP_RATE = 11025;
const loops = {
  drums: () => drumLoop(2.4).filter((_, i) => i % 2 === 0),
  // Papa typing.
  typing: () => render(LOOP_RATE, 2, (t) => {
    const i = Math.floor(t * 9);
    const local = t - i / 9;
    return (i * 7) % 5 !== 0 ? noise() * Math.exp(-local * 300) * 0.6 : 0;
  }),
  // Julien's radio: a muffled voice and crowd.
  radio: () => lowpass(render(LOOP_RATE, 2.4, (t) => noise() * (0.4 + 0.3 * Math.sin(t * 7)) + square(220 + 40 * Math.sin(t * 13), t, 0.5) * 0.15 * (Math.sin(t * 5) > 0 ? 1 : 0)), 0.2),
  // Florent's video game: arpeggio bleeps.
  game: () => render(LOOP_RATE, 2, (t) => square([659, 784, 988, 784][Math.floor(t * 8) % 4], t, 0.25) * 0.4),
  // Théo's Rubik's Cube: clicks.
  cube: () => render(LOOP_RATE, 2, (t) => {
    const i = Math.floor(t * 6);
    const local = t - i / 6;
    return i % 3 !== 2 ? noise() * Math.exp(-local * 400) * 0.7 : 0;
  }),
  // Maman humming.
  humming: () => render(LOOP_RATE, 2.4, (t) => triangle([392, 440, 494, 440, 392, 330][Math.floor(t * 2.5) % 6], t) * 0.4),
  // The washing machine running.
  machineLoop: () => render(LOOP_RATE, 2, (t) => square(55, t, 0.5) * 0.3 * (0.7 + 0.3 * Math.sin(t * 6)) + noise() * 0.05),
  // Cooking: pans clattering and a sizzle.
  cooking: () => render(LOOP_RATE, 2.4, (t) => noise() * 0.2 * (0.6 + 0.4 * Math.sin(t * 31)) + ((t * 2.5) % 1 < 0.05 ? triangle(1760, t) * 0.4 : 0)),
};

// ---------- music (16 kHz) ----------
const MUSIC_RATE = 16000;
const NOTE = (name) => {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  const base = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * 2 ** ((base + (Number(m[3]) - 4) * 12) / 12);
};

// Sequences of eighth notes ('-' holds the previous note, '.' is a rest).
function voice(seq, bpm, wave, gain) {
  const eighth = 60 / bpm / 2;
  const notes = [];
  seq.split(/\s+/).filter(Boolean).forEach((tok, i) => {
    if (tok === '-' && notes.length) notes[notes.length - 1].len += 1;
    else if (tok !== '.') notes.push({ f: NOTE(tok), start: i, len: 1 });
  });
  return (t) => {
    const idx = t / eighth;
    for (const n of notes) {
      if (idx >= n.start && idx < n.start + n.len) {
        const local = (idx - n.start) / n.len;
        const env = Math.min(1, local * 40) * (local > 0.8 ? (1 - local) / 0.2 : 1) * (0.75 + 0.25 * (1 - local));
        return wave(n.f, t) * env * gain;
      }
    }
    return 0;
  };
}

function song(bpm, bars, voices, ticks) {
  const seconds = (bars * 8 * 60) / bpm / 2;
  const fns = voices.map(([seq, wave, gain]) => voice(seq, bpm, wave, gain));
  const beat = 60 / bpm;
  return render(MUSIC_RATE, seconds, (t) => {
    let v = fns.reduce((s, fn) => s + fn(t), 0);
    if (ticks) {
      const local = t % beat;
      if (local < 0.012) v += noise() * 0.1 * (Math.floor(t / beat) % 2 ? 0.6 : 1);
    }
    return v;
  });
}

const lead = (f, t) => square(f, t, 0.25);
const bassWave = (f, t) => triangle(f, t) * 0.9;

// A light, sneaky tune in C major for the house.
const houseLead = [
  'E5 - G5 - C5 - G5 -',
  'A5 G5 F5 E5 D5 - . .',
  'E5 - G5 - C6 - B5 A5',
  'G5 - - - . . . .',
  'F5 - A5 - D5 - A5 -',
  'G5 F5 E5 D5 C5 - . .',
  'D5 E5 F5 G5 A5 - B5 -',
  'C6 - - - . . . .',
].join(' ');
const houseBass = ['C3 G3 C3 G3', 'F2 C3 G2 D3', 'C3 G3 A2 E3', 'G2 D3 G2 D3', 'F2 C3 F2 C3', 'C3 G3 A2 E3', 'D3 A3 G2 D3', 'C3 G3 C3 G3']
  .map((bar) => bar.split(' ').map((n) => `${n} -`).join(' '))
  .join(' ');

const endingLead = [
  'C5 E5 G5 C6 - - G5 -',
  'A5 - G5 E5 F5 - D5 -',
  'E5 G5 C6 E6 - D6 C6 -',
  'B5 - G5 - C6 - - -',
].join(' ');
const endingBass = ['C3 G3 C3 G3', 'F2 C3 G2 D3', 'C3 G3 A2 E3', 'G2 D3 C3 -'].map((bar) => bar.split(' ').map((n) => (n === '-' ? '- -' : `${n} -`)).join(' ')).join(' ');

const music = {
  house: () => song(104, 8, [[houseLead, lead, 0.3], [houseBass, bassWave, 0.4]], true),
  ending: () => song(120, 4, [[endingLead, lead, 0.35], [endingBass, bassWave, 0.4]], false),
};

// ---------- WAV writing ----------
function normalize(samples, peak) {
  const max = samples.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  return samples.map((v) => (v / max) * peak);
}

function toWav(samples, rate) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

fs.mkdirSync(OUT, { recursive: true });
const write = (name, samples, rate, peak) => {
  seed = 4747;
  const file = path.join(OUT, `${name}.wav`);
  fs.writeFileSync(file, toWav(normalize(samples(), peak), rate));
  console.log(`${name}.wav ${fs.statSync(file).size} bytes`);
};
for (const [name, make] of Object.entries(sfx)) write(name, make, SFX_RATE, 0.9);
for (const [name, make] of Object.entries(loops)) write(`loop_${name}`, make, LOOP_RATE, 0.6);
for (const [name, make] of Object.entries(music)) write(`music_${name}`, make, MUSIC_RATE, 0.8);
