// Sound effects, activity loops and music (assets/audio, made by scripts/generate-audio.mjs), behind the sound
// effects and music toggles. Players are created lazily; failures are ignored (no sound is better than a crash).
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';

import { GameState, SfxName } from '../game/types';
import { occupant } from '../game/world';

export type SoundName = SfxName | 'step';
export type LoopName = 'drums' | 'typing' | 'radio' | 'game' | 'cube' | 'humming' | 'machineLoop';
export type Track = 'house' | 'ending';

const SFX: Record<SoundName, number> = {
  take: require('../../assets/audio/take.wav'),
  door: require('../../assets/audio/door.wav'),
  wrong: require('../../assets/audio/wrong.wav'),
  solved: require('../../assets/audio/solved.wav'),
  step: require('../../assets/audio/step.wav'),
  bell: require('../../assets/audio/bell.wav'),
  drums: require('../../assets/audio/drums.wav'),
  machine: require('../../assets/audio/machine.wav'),
  ding: require('../../assets/audio/ding.wav'),
  water: require('../../assets/audio/water.wav'),
  pump: require('../../assets/audio/pump.wav'),
  beep: require('../../assets/audio/beep.wav'),
  secret: require('../../assets/audio/secret.wav'),
  capture: require('../../assets/audio/capture.wav'),
  note: require('../../assets/audio/note.wav'),
};

const LOOPS: Record<LoopName, number> = {
  drums: require('../../assets/audio/loop_drums.wav'),
  typing: require('../../assets/audio/loop_typing.wav'),
  radio: require('../../assets/audio/loop_radio.wav'),
  game: require('../../assets/audio/loop_game.wav'),
  cube: require('../../assets/audio/loop_cube.wav'),
  humming: require('../../assets/audio/loop_humming.wav'),
  machineLoop: require('../../assets/audio/loop_machineLoop.wav'),
};

const TRACKS: Record<Track, number> = {
  house: require('../../assets/audio/music_house.wav'),
  ending: require('../../assets/audio/music_ending.wav'),
};

export const MUSIC_VOLUME = 0.3;
export const STEP_VOLUME = 0.35;

let modeSet = false;
function ensureMode() {
  if (modeSet) return;
  modeSet = true;
  // Mix with other audio; play whatever the ringer mode (the in-game toggles are the mute).
  setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
}

interface Player {
  play(): void;
  pause(): void;
  seekTo(s: number): Promise<void>;
  loop: boolean;
  volume: number;
}

export class SoundBoard {
  private players = new Map<SoundName, Player>();
  enabled = true;

  constructor(private create: (name: SoundName) => Player) {}

  play(name: SoundName): boolean {
    if (!this.enabled) return false;
    try {
      ensureMode();
      let p = this.players.get(name);
      if (!p) {
        p = this.create(name);
        p.volume = name === 'step' ? STEP_VOLUME : 1;
        this.players.set(name, p);
      }
      p.seekTo(0).catch(() => {});
      p.play();
      return true;
    } catch {
      return false;
    }
  }
}

// Music plays only when enabled and the app is in front; switching tracks restarts from the beginning.
export class MusicBox {
  private players = new Map<Track, Player>();
  current: Track | null = null;

  constructor(private create: (track: Track) => Player) {}

  update({ enabled, foreground, track }: { enabled: boolean; foreground: boolean; track: Track }): void {
    const target = enabled && foreground ? track : null;
    if (target === this.current) return;
    try {
      if (this.current) this.players.get(this.current)?.pause();
      if (target) {
        let p = this.players.get(target);
        if (!p) {
          p = this.create(target);
          p.loop = target === 'house';
          p.volume = MUSIC_VOLUME;
          this.players.set(target, p);
        }
        if (target === 'ending') p.seekTo(0).catch(() => {});
        p.play();
      }
      this.current = target;
    } catch {
      // ignore: music is optional
    }
  }
}

export interface AmbientLoop {
  loop: LoopName;
  volume: number;
}

// PRD: the activity sound of each occupied guarded room is heard from the corridor leading to it; the drums fill the
// music corner (and are heard faintly next door) while Florent plays; the washing machine hums while it runs.
export function ambienceFor(s: GameState): AmbientLoop[] {
  const out: AmbientLoop[] = [];
  if (s.finished) return out;
  if (s.place === 'corridor0' && occupant('office', s.chars)) out.push({ loop: 'typing', volume: 0.5 });
  if (s.place === 'landing') {
    if (occupant('julien', s.chars)) out.push({ loop: 'radio', volume: 0.3 });
    if (occupant('florent', s.chars)) out.push({ loop: 'game', volume: 0.3 });
    if (occupant('theo', s.chars)) out.push({ loop: 'cube', volume: 0.35 });
    if (occupant('parents', s.chars)) out.push({ loop: 'humming', volume: 0.3 });
  }
  if (s.chars.florent === 'drumming') {
    if (s.place === 'music') out.push({ loop: 'drums', volume: 0.7 });
    else if (s.place === 'living' || s.place === 'dining') out.push({ loop: 'drums', volume: 0.25 });
  }
  if (s.flags.machine_running && (s.place === 'utility' || s.place === 'corridor0')) out.push({ loop: 'machineLoop', volume: s.place === 'utility' ? 0.5 : 0.2 });
  return out;
}

// Plays the requested loops (and only them); silent when sound effects are off or the app is in background.
export class Ambience {
  private players = new Map<LoopName, Player>();
  playing = new Set<LoopName>();

  constructor(private create: (loop: LoopName) => Player) {}

  update(loops: readonly AmbientLoop[], { enabled, foreground }: { enabled: boolean; foreground: boolean }): void {
    const wanted = enabled && foreground ? loops : [];
    try {
      for (const name of [...this.playing]) {
        if (!wanted.some((l) => l.loop === name)) {
          this.players.get(name)?.pause();
          this.playing.delete(name);
        }
      }
      for (const { loop, volume } of wanted) {
        let p = this.players.get(loop);
        if (!p) {
          ensureMode();
          p = this.create(loop);
          p.loop = true;
          this.players.set(loop, p);
        }
        p.volume = volume;
        if (!this.playing.has(loop)) {
          p.play();
          this.playing.add(loop);
        }
      }
    } catch {
      // ignore: ambience is optional
    }
  }
}

export const sounds = new SoundBoard((name) => createAudioPlayer(SFX[name]) as unknown as AudioPlayer);
export const music = new MusicBox((track) => createAudioPlayer(TRACKS[track]) as unknown as AudioPlayer);
export const ambience = new Ambience((loop) => createAudioPlayer(LOOPS[loop]) as unknown as AudioPlayer);
