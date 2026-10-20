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

async function dismissLines() {
  for (let i = 0; i < 30 && screen.queryByTestId('line-banner'); i++) await fireEvent.press(screen.getByTestId('line-banner'));
  for (let i = 0; i < 5 && screen.queryByTestId('capture-fade'); i++) await fireEvent.press(screen.getByTestId('capture-fade'));
  for (let i = 0; i < 30 && screen.queryByTestId('line-banner'); i++) await fireEvent.press(screen.getByTestId('line-banner'));
}

const lastSaved = (props: { onChange: jest.Mock }) => props.onChange.mock.calls[props.onChange.mock.calls.length - 1][0] as GameState;
const stepOf = (pred: (i: Input) => boolean) => SOLUTION.findIndex(pred);
const stateAt = (n: number) => ({ ...playAll(newGame(), SOLUTION.slice(0, n)).state, tutorial: 3 as const });
const chars = (patch: Partial<CharacterStates>): CharacterStates => ({ ...newGame().chars, ...patch });

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

  it('a conversation shows choices with "Au revoir", reopens after an answer and closes on "Au revoir" (AC-20)', async () => {
    await mount({ ...newGame(), place: 'kitchen', flags: { door_unlocked: true }, chars: chars({ dad: 'cooking' }), tutorial: 3 });
    await fireEvent.press(screen.getByTestId('hs-dad'));
    await fireEvent.press(screen.getByTestId('verb-talk'));
    expect(screen.getByLabelText(line(t, 'dad.q.rumour'))).toBeTruthy();
    expect(screen.getByLabelText('Au revoir')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('dlg-dad.cooking'));
    expect(screen.getByText(line(t, 'dad.a.cooking'))).toBeTruthy();
    await dismissLines();
    expect(screen.getByTestId('dialogue')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('dlg-bye'));
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
    expect(screen.getByText(fr.chess.wrong)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('chess-sq-c4'));
    await fireEvent.press(screen.getByTestId('chess-sq-g8'));
    // Black took the queen: the rook now stands on g8.
    expect(screen.getByLabelText(fr.chess.square(fr.chess.pieces.r, 'g8'))).toBeTruthy();
    await fireEvent.press(screen.getByTestId('chess-sq-h6'));
    await fireEvent.press(screen.getByTestId('chess-sq-f7'));
    await dismissLines();
    expect(screen.queryByTestId('chess')).toBeNull();
    expect(lastSaved(props).notes).toContain('n08');
    expect(lastSaved(props).flags.chess_solved).toBe(true);
  });

  it('entering an occupied room shows the capture and puts Sam in the wine cellar (AC-23)', async () => {
    const props = await mount({ ...newGame(), place: 'landing', flags: { door_unlocked: true }, tutorial: 3 });
    await fireEvent.press(screen.getByTestId('hs-landing.julienDoor'));
    await fireEvent.press(screen.getByTestId('verb-use'));
    expect(screen.getByText(line(t, 'capture.julien'))).toBeTruthy();
    await dismissLines();
    expect(screen.getByTestId('hs-cellar.shutter')).toBeTruthy();
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

  it('the recipe scrap on the notebook leads to the revelation and the ending, saved as finished (AC-32, AC-50)', async () => {
    const props = await mount(stateAt(SOLUTION.length - 1));
    await fireEvent.press(screen.getByTestId('inv-scrap'));
    await fireEvent.press(screen.getByTestId('hs-laundry.notebook'));
    // The save is already finished while the revelation plays (killed now, nothing would resume).
    expect(lastSaved(props).finished).toBe(true);
    expect(screen.getByText(line(t, 'line.final1'))).toBeTruthy();
    await dismissLines();
    expect(props.onEnding).toHaveBeenCalledTimes(1);
    expect((props.onEnding.mock.calls[0][0] as GameState).finished).toBe(true);
  });
});
