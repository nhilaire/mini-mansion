// T-17 / T-18: the game screen and its overlays (walking, verbs, items, lines, notebook, keypad, chess, captures,
// pause, ending).
import { logEvent } from '@react-native-firebase/analytics';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { hotspotName, itemName, line } from '../content/index';
import { newGame, playAll } from '../game/rules';
import { SOLUTION } from '../game/solution';
import { CharacterStates, GameState, Input } from '../game/types';
import { fr } from '../i18n/fr';
import { DICTIONARIES } from '../i18n';
import { GameScreen } from '../screens/GameScreen';
import { applyConsent } from '../telemetry/telemetry';
import { applyTestingLink, FAST_LINK, resetFastModeForTests } from '../testing/fastMode';

const t = DICTIONARIES.fr;

async function mount(state: GameState, extra: { startPaused?: boolean } = {}) {
  const props = {
    initialState: state,
    startPaused: false,
    sfx: true,
    onChange: jest.fn(),
    onEnding: jest.fn(),
    onHome: jest.fn(),
    onSettings: jest.fn(),
    ...extra,
  };
  await render(<GameScreen {...props} />);
  return props;
}

// Taps the lines away; scenes that cannot be skipped (captures, views) are waited out, a little at a time.
async function dismissLines() {
  const busy = () => screen.queryByTestId('line-banner') || screen.queryByTestId('capture-fade') || screen.queryByTestId('scene-wait');
  for (let i = 0; i < 80 && busy(); i++) {
    if (screen.queryByTestId('line-banner')) await fireEvent.press(screen.getByTestId('line-banner'));
    if (busy()) {
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
    }
  }
}

const lastSaved = (props: { onChange: jest.Mock }) => props.onChange.mock.calls[props.onChange.mock.calls.length - 1][0] as GameState;
const stepOf = (pred: (i: Input) => boolean) => SOLUTION.findIndex(pred);
const stateAt = (n: number) => ({ ...playAll(newGame(), SOLUTION.slice(0, n)).state, tutorial: 3 as const });
const chars = (patch: Partial<CharacterStates>): CharacterStates => ({ ...newGame().chars, ...patch });

describe('GameScreen, Act II', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    resetFastModeForTests();
    applyTestingLink(FAST_LINK);
  });

  it('the bottle rack opens the sequence pad: the vintages in order give the second scrap (AC-65)', async () => {
    const props = await mount({ ...newGame(), place: 'cellar', notes: ['n01', 'n13'], flags: { door_unlocked: true }, tutorial: 3 });
    await fireEvent.press(screen.getByTestId('hs-cellar.bottles'));
    await fireEvent.press(screen.getByTestId('verb-use'));
    expect(screen.getByTestId('pad')).toBeTruthy();
    expect(screen.getByText(fr.pad.bottles)).toBeTruthy();
    for (const b of ['1994', '1987', '2003', '2011']) await fireEvent.press(screen.getByTestId(`pad-${b}`));
    expect(screen.getByText(line(t, 'line.bottlesWrong'))).toBeTruthy();
    await dismissLines();
    expect(lastSaved(props).inventory).toEqual([]);
    await fireEvent.press(screen.getByTestId('hs-cellar.bottles'));
    await fireEvent.press(screen.getByTestId('verb-use'));
    for (const b of ['1987', '1994', '2003', '2011']) await fireEvent.press(screen.getByTestId(`pad-${b}`));
    await dismissLines();
    expect(screen.queryByTestId('pad')).toBeNull();
    expect(lastSaved(props).inventory).toEqual(['scrap2']);
  });

  it('the trunk padlock shows the colours by name (AC-66)', async () => {
    const props = await mount({ ...newGame(), place: 'attic', notes: ['n01', 'n14'], flags: { door_unlocked: true }, tutorial: 3 });
    await fireEvent.press(screen.getByTestId('hs-attic.trunk'));
    await fireEvent.press(screen.getByTestId('verb-use'));
    expect(screen.getByLabelText('Violet')).toBeTruthy();
    for (const b of ['red', 'yellow', 'blue', 'green']) await fireEvent.press(screen.getByTestId(`pad-${b}`));
    await dismissLines();
    expect(lastSaved(props).inventory).toEqual(['hat', 'scrap3']);
  });

  it('the hose view shows Maman soaked in the garden and cannot be skipped; timers wait while it plays (AC-49, AC-61, AC-69)', async () => {
    const props = await mount({ ...newGame(), place: 'pool', chars: chars({ mom: 'gardening' }), flags: { door_unlocked: true }, tutorial: 3 });
    await fireEvent.press(screen.getByTestId('hs-pool.tap'));
    await fireEvent.press(screen.getByTestId('verb-use'));
    expect(screen.getByTestId('view-hose')).toBeTruthy();
    expect(screen.getByText(line(t, 'line.momSoaked'))).toBeTruthy();
    await fireEvent.press(screen.getByTestId('line-banner'));
    expect(screen.getByTestId('view-hose')).toBeTruthy();
    const clockDuringScene = lastSaved(props).clock;
    await act(async () => {
      jest.advanceTimersByTime(150);
    });
    expect(screen.getByTestId('mom-changing')).toBeTruthy();
    await dismissLines();
    expect(screen.queryByTestId('view-hose')).toBeNull();
    expect(lastSaved(props).clock).toBe(clockDuringScene);
  });

  it('no timer time passes while a line plays: the doorbell timer waits, without catching up afterwards (AC-69)', async () => {
    // Papa answers the door 5 s of timer time from now (fast mode: 30 times faster, about 170 ms while idle).
    await mount({ ...newGame(), place: 'hall', flags: { door_unlocked: true }, chars: chars({ dad: 'answering' }), timers: { dad: 5000, dough: null, mom: null, delivery: null }, tutorial: 3 });
    await fireEvent.press(screen.getByTestId('hs-hall.coats'));
    await fireEvent.press(screen.getByTestId('verb-look'));
    expect(screen.getByTestId('line-banner')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(240);
    });
    expect(screen.getByTestId('dad-answering')).toBeTruthy();
    // The line is gone: the 250 ms it played are not added to the timers.
    await act(async () => {
      jest.advanceTimersByTime(70);
    });
    expect(screen.queryByTestId('line-banner')).toBeNull();
    expect(screen.getByTestId('dad-answering')).toBeTruthy();
    for (let i = 0; i < 20 && !screen.queryByTestId('view-door'); i++) {
      await act(async () => {
        jest.advanceTimersByTime(50);
      });
    }
    expect(screen.getByTestId('view-door')).toBeTruthy();
  });

  it('the power cut darkens the scene while Papa goes down to the fuse box (AC-64)', async () => {
    await mount({ ...newGame(), place: 'florent', chars: chars({ florent: 'riding' }), inventory: ['hairdryer'], flags: { door_unlocked: true, computer_read: true, dad_wary: true }, tutorial: 3 });
    await fireEvent.press(screen.getByTestId('inv-hairdryer'));
    await fireEvent.press(screen.getByTestId('hs-florent.strip'));
    expect(screen.getByTestId('view-dark')).toBeTruthy();
    expect(screen.getByText(line(t, 'line.dadFuses'))).toBeTruthy();
    await dismissLines();
    expect(screen.queryByTestId('view-dark')).toBeNull();
    expect(screen.getByTestId('dad-fuses')).toBeTruthy();
  });
});

describe('GameScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    resetFastModeForTests();
    applyTestingLink(FAST_LINK);
  });

  it('a floor tap makes Sam walk and the tutorial moves to the verbs step (AC-11, AC-16)', async () => {
    const props = await mount(newGame());
    expect(screen.getByText(fr.tutorial.walk)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('scene-floor'), { nativeEvent: { locationX: 300, locationY: 230 } });
    expect(screen.getByText(fr.tutorial.verbs)).toBeTruthy();
    expect(lastSaved(props).pos).not.toEqual(newGame().pos);
  });

  it('the action menu offers the applicable verbs; the doormat gives the key and the key opens the door (AC-16, AC-17)', async () => {
    await applyConsent(true);
    await mount({ ...newGame(), tutorial: 1 });
    await fireEvent.press(screen.getByTestId('hs-front.doormat'));
    expect(screen.getByText(hotspotName(t, 'front.doormat'))).toBeTruthy();
    expect(screen.getByText('Regarder')).toBeTruthy();
    expect(screen.getByText('Prendre')).toBeTruthy();
    expect(screen.queryByText('Parler')).toBeNull();
    await fireEvent.press(screen.getByTestId('verb-take'));
    expect(screen.getByText(line(t, 'e01.key'))).toBeTruthy();
    await dismissLines();
    expect(screen.getByTestId('inv-key')).toBeTruthy();
    expect(screen.getByText(fr.tutorial.inventory)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('inv-key'));
    expect(screen.getByText(fr.game.useWith(itemName(t, 'key')))).toBeTruthy();
    expect(logEvent).toHaveBeenCalledWith(expect.anything(), 'tutorial_complete', {});
    await fireEvent.press(screen.getByTestId('hs-front.door'));
    await dismissLines();
    expect(screen.getByTestId('exit-hall.toFront')).toBeTruthy();
    expect(logEvent).toHaveBeenCalledWith(expect.anything(), 'puzzle_solved', expect.objectContaining({ puzzle: 1 }));
    await applyConsent(false);
  });

  it('a door leads to the next place (AC-16)', async () => {
    await mount({ ...newGame(), place: 'hall', flags: { door_unlocked: true }, tutorial: 3 });
    await fireEvent.press(screen.getByTestId('exit-hall.toLiving'));
    expect(screen.getByTestId('hs-living.chess')).toBeTruthy();
    expect(screen.queryByTestId('hs-hall.coats')).toBeNull();
  });

  it('combines two inventory items, and a wrong combination keeps the item (AC-18)', async () => {
    await mount({ ...newGame(), place: 'garage', inventory: ['pole', 'extension', 'sticks'], flags: { door_unlocked: true }, tutorial: 3 });
    await fireEvent.press(screen.getByTestId('inv-sticks'));
    await fireEvent.press(screen.getByTestId('hs-garage.bike'));
    expect(screen.getByText(line(t, 'wrong.0'))).toBeTruthy();
    await dismissLines();
    expect(screen.getByTestId('inv-sticks')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('inv-pole'));
    await fireEvent.press(screen.getByTestId('inv-extension'));
    expect(screen.getByText(line(t, 'combine.pole'))).toBeTruthy();
    await dismissLines();
    expect(screen.getByTestId('inv-longpole')).toBeTruthy();
    expect(screen.queryByTestId('inv-pole')).toBeNull();
  });

  it('a spoken line stays until tapped or its delay, and scene taps are ignored meanwhile (AC-49)', async () => {
    resetFastModeForTests();
    const props = await mount({ ...newGame(), tutorial: 3 });
    await fireEvent.press(screen.getByTestId('hs-front.hedge'));
    await fireEvent.press(screen.getByTestId('verb-look'));
    const text = line(t, 'front.hedge.look');
    expect(screen.getByText(text)).toBeTruthy();
    const before = props.onChange.mock.calls.length;
    await fireEvent.press(screen.getByTestId('hs-front.bell'));
    expect(screen.queryByTestId('action-menu')).toBeNull();
    expect(props.onChange.mock.calls.length).toBe(before);
    const duration = Math.max(2000, 50 * text.length);
    await act(async () => {
      jest.advanceTimersByTime(duration - 150);
    });
    expect(screen.getByText(text)).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(screen.queryByText(text)).toBeNull();
  });

  it('an inhabitant can only be looked at; "Écouter" at an occupied door plays the overheard line (AC-20)', async () => {
    await mount({ ...newGame(), place: 'football', flags: { door_unlocked: true }, chars: chars({ julien: 'football' }), tutorial: 3 });
    await fireEvent.press(screen.getByTestId('hs-julien'));
    expect(screen.getByTestId('verb-look')).toBeTruthy();
    expect(screen.queryByTestId('verb-talk')).toBeNull();
    expect(screen.queryByTestId('verb-listen')).toBeNull();
    await fireEvent.press(screen.getByTestId('verb-look'));
    await dismissLines();
    await mount({ ...newGame(), place: 'landing', flags: { door_unlocked: true }, tutorial: 3 });
    await fireEvent.press(screen.getByTestId('hs-landing.julienDoor'));
    expect(screen.getByText('Écouter')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('verb-listen'));
    expect(screen.getByText(line(t, 'julien.door'))).toBeTruthy();
    await dismissLines();
    expect(screen.queryByTestId('dialogue')).toBeNull();
    expect(screen.getByTestId('scene-idle')).toBeTruthy();
  });

  it('the notebook button lists the learnt entries, newest first, and marks them read (AC-34)', async () => {
    const props = await mount({ ...newGame(), notes: ['n01', 'n02'], unread: ['n02'], tutorial: 3 });
    await fireEvent.press(screen.getByTestId('game-notebook'));
    expect(screen.getByTestId('notebook')).toBeTruthy();
    expect(screen.getByText(fr.notebook.title)).toBeTruthy();
    expect(screen.getByText(`• ${t.story.notes.n01}`)).toBeTruthy();
    expect(screen.getByText(`• ${t.story.notes.n02}`)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('notebook-close'));
    expect(screen.queryByTestId('notebook')).toBeNull();
    expect(lastSaved(props).unread).toEqual([]);
  });

  it('the computer keypad opens once the code is known and 7867 shows the secret documents (AC-27)', async () => {
    const i = stepOf((x) => x.kind === 'keypad' && x.keypad === 'computer');
    await mount(stateAt(i - 1));
    await fireEvent.press(screen.getByTestId('hs-office.computer'));
    await fireEvent.press(screen.getByTestId('verb-use'));
    expect(screen.getByTestId('keypad')).toBeTruthy();
    for (const d of '1234') await fireEvent.press(screen.getByTestId(`keypad-digit-${d}`));
    expect(screen.getByTestId('keypad-display').props.children).toBe('1 2 3 4');
    await fireEvent.press(screen.getByTestId('keypad-ok'));
    expect(screen.getByText(line(t, 'line.codeWrong'))).toBeTruthy();
    await dismissLines();
    await fireEvent.press(screen.getByTestId('hs-office.computer'));
    await fireEvent.press(screen.getByTestId('verb-use'));
    for (const d of '7867') await fireEvent.press(screen.getByTestId(`keypad-digit-${d}`));
    await fireEvent.press(screen.getByTestId('keypad-ok'));
    expect(screen.getByTestId('documents')).toBeTruthy();
    expect(screen.getByText(t.story.docs[2])).toBeTruthy();
    await fireEvent.press(screen.getByTestId('documents-close'));
    await dismissLines();
    expect(screen.queryByTestId('documents')).toBeNull();
  });

  it("Théo's chess board: a wrong first move resets, Qg8+ Rxg8 Nf7# solves it and notes the code (AC-26)", async () => {
    const i = stepOf((x) => x.kind === 'chess');
    const props = await mount(stateAt(i - 1));
    await fireEvent.press(screen.getByTestId('hs-living.chess'));
    await fireEvent.press(screen.getByTestId('verb-use'));
    expect(screen.getByTestId('chess')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('chess-sq-c4'));
    await fireEvent.press(screen.getByTestId('chess-sq-c8'));
    // The move stays on the board a moment before the problem resets.
    expect(screen.getByLabelText(fr.chess.square(fr.chess.pieces.Q, 'c8'))).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(screen.getByText(fr.chess.wrong)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('chess-sq-c4'));
    await fireEvent.press(screen.getByTestId('chess-sq-g8'));
    // The queen stands on g8 a moment, then Black's rook takes it.
    expect(screen.getByLabelText(fr.chess.square(fr.chess.pieces.Q, 'g8'))).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    // Black took the queen: the rook now stands on g8.
    expect(screen.getByLabelText(fr.chess.square(fr.chess.pieces.r, 'g8'))).toBeTruthy();
    await fireEvent.press(screen.getByTestId('chess-sq-h6'));
    await fireEvent.press(screen.getByTestId('chess-sq-f7'));
    await dismissLines();
    expect(screen.queryByTestId('chess')).toBeNull();
    expect(lastSaved(props).notes).toContain('n08');
    expect(lastSaved(props).flags.chess_solved).toBe(true);
  });

  it('entering an occupied room plays the capture scene, which cannot be skipped, and puts Sam in the wine cellar (AC-23, AC-49)', async () => {
    const props = await mount({ ...newGame(), place: 'landing', flags: { door_unlocked: true }, tutorial: 3 });
    await fireEvent.press(screen.getByTestId('hs-landing.julienDoor'));
    await fireEvent.press(screen.getByTestId('verb-use'));
    // Julien shouts for Papa: a tap does not skip it.
    expect(screen.getByText(line(t, 'capture.julien'))).toBeTruthy();
    await fireEvent.press(screen.getByTestId('line-banner'));
    expect(screen.getByText(line(t, 'capture.julien'))).toBeTruthy();
    // Papa comes and says his line, then takes Sam to the cellar and tells Sam not to run away.
    const seen: string[] = [];
    for (let i = 0; i < 60; i++) {
      for (const key of ['capture.dad', 'capture.keep', 'capture.cellar']) if (!seen.includes(key) && screen.queryByText(line(t, key))) seen.push(key);
      if (screen.queryByTestId('line-banner')) await fireEvent.press(screen.getByTestId('line-banner'));
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
    }
    expect(seen).toEqual(['capture.dad', 'capture.keep', 'capture.cellar']);
    await dismissLines();
    expect(screen.getByTestId('hs-cellar.hatch')).toBeTruthy();
    expect(lastSaved(props).captures).toBe(1);
  });

  it('the inventory band pages when more items are held than slots fit', async () => {
    const inventory = ['pole', 'extension', 'sticks', 'queen', 'booklet', 'oring', 'wrench', 'pliers', 'detergent', 'bar'] as const;
    await mount({ ...newGame(), place: 'hall', inventory: [...inventory], flags: { door_unlocked: true }, tutorial: 3 });
    expect(screen.getByTestId('inv-pole')).toBeTruthy();
    expect(screen.queryByTestId('inv-bar')).toBeNull();
    await fireEvent.press(screen.getByTestId('inv-more'));
    expect(screen.getByTestId('inv-bar')).toBeTruthy();
    expect(screen.queryByTestId('inv-pole')).toBeNull();
  });

  it('the menu button and leaving the app pause the game and save it (AC-39, AC-50)', async () => {
    const listeners: ((s: string) => void)[] = [];
    const original = AppState.addEventListener;
    AppState.addEventListener = ((_type: string, fn: (s: string) => void) => {
      listeners.push(fn);
      return { remove: () => {} };
    }) as unknown as typeof AppState.addEventListener;
    const props = await mount({ ...newGame(), tutorial: 3 });
    await fireEvent.press(screen.getByTestId('game-menu'));
    expect(screen.getByText(fr.pause.resume)).toBeTruthy();
    expect(screen.getByText(fr.pause.settings)).toBeTruthy();
    expect(screen.getByText(fr.pause.home)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('pause-resume'));
    expect(screen.queryByTestId('pause')).toBeNull();
    const saves = props.onChange.mock.calls.length;
    await act(async () => listeners.forEach((fn) => fn('background')));
    expect(screen.getByTestId('pause')).toBeTruthy();
    expect(props.onChange.mock.calls.length).toBeGreaterThan(saves);
    await fireEvent.press(screen.getByTestId('pause-home'));
    expect(props.onHome).toHaveBeenCalled();
    AppState.addEventListener = original;
  });

  it('the doorbell: Papa answers, then the front door view plays with his line, unskippable; the timers wait while paused (AC-51, AC-58)', async () => {
    const props = await mount({ ...newGame(), place: 'front', flags: { door_unlocked: true }, tutorial: 3 });
    await fireEvent.press(screen.getByTestId('hs-front.bell'));
    await fireEvent.press(screen.getByTestId('verb-use'));
    expect(screen.getByText(line(t, 'line.dadAnswer'))).toBeTruthy();
    await dismissLines();
    expect(screen.queryByTestId('timers-idle')).toBeNull();
    await fireEvent.press(screen.getByTestId('exit-front.toHall'));
    await dismissLines();
    // Paused: no timer moves (fast mode: 30 times faster than play time).
    await fireEvent.press(screen.getByTestId('game-menu'));
    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });
    expect(lastSaved(props).chars.dad).toBe('answering');
    await fireEvent.press(screen.getByTestId('pause-resume'));
    // 30 s of play time, 30 times faster in fast mode: about 1 s.
    await act(async () => {
      jest.advanceTimersByTime(1100);
    });
    expect(screen.getByTestId('view-door')).toBeTruthy();
    expect(screen.getByText(line(t, 'line.dadAtDoor'))).toBeTruthy();
    // The view cannot be skipped by tapping its line.
    await fireEvent.press(screen.getByTestId('line-banner'));
    expect(screen.getByTestId('view-door')).toBeTruthy();
    // No control during the view (AC-49): floor and hotspot taps do nothing.
    const before = lastSaved(props).pos;
    await fireEvent.press(screen.getByTestId('scene-floor'), { nativeEvent: { locationX: 900, locationY: 600 } });
    await fireEvent.press(screen.getByTestId('hs-hall.coats'));
    expect(screen.queryByTestId('action-menu')).toBeNull();
    expect(lastSaved(props).pos).toEqual(before);
    expect(lastSaved(props).chars.dad).toBe('outside');
    expect(lastSaved(props).place).toBe('hall');
    await dismissLines();
    expect(screen.queryByTestId('view-door')).toBeNull();
  });

  it('the dough: Papa arrives in the kitchen view two minutes later and cooks (AC-52)', async () => {
    const props = await mount({ ...newGame(), place: 'kitchen', inventory: ['ricemilk', 'chestnut', 'riceflour'], flags: { door_unlocked: true }, tutorial: 3 });
    for (const item of ['ricemilk', 'chestnut', 'riceflour']) {
      await fireEvent.press(screen.getByTestId(`inv-${item}`));
      await fireEvent.press(screen.getByTestId('hs-kitchen.robot'));
      await dismissLines();
    }
    expect(lastSaved(props).flags.dough_mixed).toBe(true);
    await fireEvent.press(screen.getByTestId('exit-kitchen.toMusic'));
    await dismissLines();
    // 120 s of play time, 30 times faster in fast mode: about 4 s.
    for (let i = 0; i < 60 && !screen.queryByTestId('view-kitchen'); i++) {
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
    }
    expect(screen.getByTestId('view-kitchen')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('hs-music.piano'));
    expect(screen.queryByTestId('action-menu')).toBeNull();
    expect(screen.getByText(line(t, 'line.dadDough'))).toBeTruthy();
    // The kitchen view cannot be skipped by tapping its line either.
    await fireEvent.press(screen.getByTestId('line-banner'));
    expect(screen.getByTestId('view-kitchen')).toBeTruthy();
    expect(screen.getByText(line(t, 'line.dadDough'))).toBeTruthy();
    await dismissLines();
    expect(lastSaved(props).chars.dad).toBe('cooking');
    expect(screen.getByTestId('dad-cooking')).toBeTruthy();
  });

  it('play time does not advance while paused (AC-38)', async () => {
    const props = await mount({ ...newGame(), tutorial: 3 }, { startPaused: true });
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    await fireEvent.press(screen.getByTestId('pause-resume'));
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    await fireEvent.press(screen.getByTestId('game-menu'));
    const saved = lastSaved(props);
    expect(saved.playMs).toBeGreaterThanOrEqual(1900);
    expect(saved.playMs).toBeLessThan(2900);
  });

  it('a save during a cutscene stores the state after it: the steam on the mirror (AC-50)', async () => {
    const i = stepOf((x) => x.kind === 'verb' && x.verb === 'use' && x.target === 'parents.shower');
    const props = await mount(stateAt(i));
    await fireEvent.press(screen.getByTestId('hs-parents.shower'));
    await fireEvent.press(screen.getByTestId('verb-use'));
    expect(screen.getByText(line(t, 'cut08'))).toBeTruthy();
    // Still playing, but the saved state is already the one after CUT08.
    const saved = lastSaved(props);
    expect(saved.cuts).toContain('cut08');
    expect(saved.flags.mirror_code).toBe(true);
    expect(saved.notes).toContain('n11');
  });

  it('the last recipe scrap gathers the family in the lab and the jury rings (AC-67, AC-68)', async () => {
    const lastScrap = stepOf((i) => i.kind === 'item' && i.item === 'scrap3');
    const finale = await mount(stateAt(lastScrap));
    await fireEvent.press(screen.getByTestId('inv-scrap3'));
    await fireEvent.press(screen.getByTestId('hs-laundry.notebook'));
    expect(screen.getByText(line(t, 'line.final1'))).toBeTruthy();
    await dismissLines();
    expect(lastSaved(finale).flags.finale).toBe(true);
    expect(lastSaved(finale).finished).toBe(false);
    for (const who of ['dad', 'mom', 'julien', 'florent', 'theo']) expect(screen.getByTestId(`hs-${who}`)).toBeTruthy();
  });

  it('the hat and the tonka bean for Papa lead to the jury tasting and the ending, saved as finished (AC-32, AC-50, AC-67)', async () => {
    const props = await mount(stateAt(SOLUTION.length - 1));
    await fireEvent.press(screen.getByTestId('inv-tonka'));
    await fireEvent.press(screen.getByTestId('hs-dad'));
    // Sam walks to Papa first.
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    // The save is already finished while the tasting plays (killed now, nothing would resume).
    expect(lastSaved(props).finished).toBe(true);
    await dismissLines();
    expect(props.onEnding).toHaveBeenCalledTimes(1);
    expect((props.onEnding.mock.calls[0][0] as GameState).finished).toBe(true);
  });
});
