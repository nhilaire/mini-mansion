// T-23: sound effects, activity loops and music behind their toggles (AC-43), activity sound per guarded room (AC-25).
import { Ambience, ambienceFor, MusicBox, SoundBoard } from '../audio/sound';
import { newGame } from '../game/rules';
import { CharacterStates, GameState, PlaceId } from '../game/types';

const fs = jest.requireActual('fs');
const path = jest.requireActual('path');

function fakePlayer() {
  return { play: jest.fn(), pause: jest.fn(), seekTo: jest.fn(() => Promise.resolve()), loop: false, volume: 1 };
}

const at = (place: PlaceId, chars: Partial<CharacterStates> = {}, flags: GameState['flags'] = {}): GameState => ({
  ...newGame(),
  place,
  chars: { ...newGame().chars, ...chars },
  flags,
});

describe('sound effects (AC-43)', () => {
  it('play only when the sound effects are on', () => {
    const p = fakePlayer();
    const board = new SoundBoard(() => p);
    expect(board.play('take')).toBe(true);
    expect(p.play).toHaveBeenCalledTimes(1);
    board.enabled = false;
    expect(board.play('take')).toBe(false);
    expect(p.play).toHaveBeenCalledTimes(1);
  });

  it('never crash when a player fails', () => {
    const board = new SoundBoard(() => {
      throw new Error('no audio');
    });
    expect(board.play('door')).toBe(false);
  });
});

describe('music (AC-43)', () => {
  it('plays the house theme in front, pauses in background or when off, and the ending theme at the end', () => {
    const players: Record<string, ReturnType<typeof fakePlayer>> = {};
    const box = new MusicBox((t) => (players[t] = fakePlayer()));
    box.update({ enabled: true, foreground: true, track: 'house' });
    expect(players.house.play).toHaveBeenCalledTimes(1);
    expect(players.house.loop).toBe(true);
    box.update({ enabled: true, foreground: false, track: 'house' });
    expect(players.house.pause).toHaveBeenCalledTimes(1);
    box.update({ enabled: false, foreground: true, track: 'house' });
    expect(box.current).toBeNull();
    box.update({ enabled: true, foreground: true, track: 'ending' });
    expect(players.ending.play).toHaveBeenCalled();
    expect(players.ending.loop).toBe(false);
  });
});

describe('activity sounds (AC-25)', () => {
  it('each occupied guarded room is heard from its corridor, and only while occupied', () => {
    expect(ambienceFor(at('corridor0')).map((l) => l.loop)).toEqual(['typing']);
    expect(ambienceFor(at('corridor0', { dad: 'cooking' }))).toEqual([]);
    expect(ambienceFor(at('landing')).map((l) => l.loop).sort()).toEqual(['cube', 'game', 'humming', 'radio']);
    expect(ambienceFor(at('landing', { julien: 'football', florent: 'drumming', theo: 'chess', mom: 'gardening' }))).toEqual([]);
    expect(ambienceFor(at('hall'))).toEqual([]);
  });

  it('upstairs, the rooms are heard faintly, in the background, even all four at once', () => {
    const loops = ambienceFor(at('landing'));
    expect(loops).toHaveLength(4);
    for (const l of loops) expect(l.volume).toBeLessThanOrEqual(0.1);
  });

  it('Papa cooking is heard from the music corner, Maman humming in the garden from the football corner', () => {
    expect(ambienceFor(at('music', { dad: 'cooking' })).map((l) => l.loop)).toEqual(['cooking']);
    expect(ambienceFor(at('music'))).toEqual([]);
    expect(ambienceFor(at('football', { mom: 'gardening' })).map((l) => l.loop)).toEqual(['humming']);
    expect(ambienceFor(at('football'))).toEqual([]);
    expect(ambienceFor(at('corridor0', { dad: 'answering' })).map((l) => l.loop)).toEqual(['typing']);
    expect(ambienceFor(at('corridor0', { dad: 'outside' }))).toEqual([]);
  });

  it('the drums fill the music corner and are heard faintly next door; the washing machine hums while it runs', () => {
    expect(ambienceFor(at('music', { florent: 'drumming' }))).toEqual([{ loop: 'drums', volume: 0.7 }]);
    expect(ambienceFor(at('living', { florent: 'drumming' }))[0].volume).toBeLessThan(0.7);
    expect(ambienceFor(at('kitchen', { florent: 'drumming' }))[0].volume).toBeLessThan(0.7);
    expect(ambienceFor(at('hall', { florent: 'drumming' }))).toEqual([]);
    expect(ambienceFor(at('utility', {}, { machine_running: true })).map((l) => l.loop)).toEqual(['machineLoop']);
  });

  it('the ambience plays the requested loops only, silent when sound effects are off or in background', () => {
    const players: Record<string, ReturnType<typeof fakePlayer>> = {};
    const amb = new Ambience((l) => (players[l] = fakePlayer()));
    amb.update([{ loop: 'typing', volume: 0.5 }], { enabled: true, foreground: true });
    expect(players.typing.play).toHaveBeenCalledTimes(1);
    expect(players.typing.loop).toBe(true);
    amb.update([{ loop: 'typing', volume: 0.5 }], { enabled: true, foreground: true });
    expect(players.typing.play).toHaveBeenCalledTimes(1);
    amb.update([{ loop: 'typing', volume: 0.5 }], { enabled: true, foreground: false });
    expect(players.typing.pause).toHaveBeenCalledTimes(1);
    amb.update([{ loop: 'radio', volume: 0.3 }], { enabled: false, foreground: true });
    expect(players.radio).toBeUndefined();
  });
});

describe('generated audio files', () => {
  it('every sound, loop and track referenced exists in assets/audio', () => {
    const src: string = fs.readFileSync(path.join(process.cwd(), 'src', 'audio', 'sound.ts'), 'utf8');
    const files = [...src.matchAll(/assets\/audio\/([\w]+\.wav)/g)].map((m) => m[1]);
    expect(files.length).toBeGreaterThan(20);
    for (const f of files) expect([f, fs.existsSync(path.join(process.cwd(), 'assets', 'audio', f))]).toEqual([f, true]);
  });
});
