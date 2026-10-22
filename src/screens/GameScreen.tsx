// The adventure: Skia scene + touch overlays. Taps make Sam walk, hotspots open the verb menu, inventory items are
// used on hotspots, characters or other items. Engine outcomes are played as beats (lines, dialogues, keypads, the
// chess board, documents, captures, views of another place, unskippable scenes). Play time feeds the engine's timers (doorbell, dough)
// through tick inputs, sent only while nothing is being shown or walked. Rules live in src/game.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, BackHandler, GestureResponderEvent, Pressable, StatusBar, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ambience, ambienceFor, sounds } from '../audio/sound';
import { exitName, hotspotName, itemName, line } from '../content/index';
import { dialogueOptions } from '../game/dialogue';
import { findPath } from '../game/geometry';
import { addPlayTime, advanceTutorial, TutorialSignal, tutorialBubble, tutorialDone } from '../game/progress';
import { interact, nextDeadline, readNotes } from '../game/rules';
import { Beat, CharacterId, Facing, GameState, Input, ItemId, KeypadId, PlaceId, Point, Speaker, Verb } from '../game/types';
import { poseAt } from '../game/walker';
import {
  exitsIn,
  FLOORS,
  HotspotDef,
  hotspotsIn,
  inventoryPage,
  MENU_BUTTON,
  NOTEBOOK_BUTTON,
  ROOM_H,
  sceneTransform,
  slotRect,
  SLOTS,
  toLogical,
  toScreenRect,
} from '../game/world';
import { useI18n } from '../i18n/I18nProvider';
import { HeroPose, Scene } from '../render/Scene';
import { eventsFor } from '../telemetry/gameTelemetry';
import { track } from '../telemetry/telemetry';
import { isFastMode, lineDurationMs, timerScale } from '../testing/fastMode';
import {
  ActionMenu,
  CaptureFade,
  ChessBoard,
  DialogueChoices,
  DocumentsOverlay,
  Keypad,
  LineBanner,
  NotebookOverlay,
  NoteToast,
  PauseMenu,
  TutorialBubble,
  UseWithHint,
} from './game/overlays';

type Presentation =
  | { kind: 'line'; speaker: Speaker; text: string; until: number }
  | { kind: 'dialogue'; character: CharacterId }
  | { kind: 'keypad'; keypad: KeypadId }
  | { kind: 'chess' }
  | { kind: 'documents' }
  | { kind: 'capture'; until: number }
  | { kind: 'wait'; until: number };

interface Walk {
  from: Point;
  path: Point[];
  start: number;
  facing: Facing;
  then: (() => void) | null;
  lastFrame: number;
}

interface Props {
  initialState: GameState;
  startPaused: boolean;
  sfx: boolean;
  onChange: (state: GameState) => void;
  onEnding: (state: GameState) => void;
  onHome: (state: GameState) => void;
  onSettings: (state: GameState) => void;
}

const TICK_MS = 33;
const CAPTURE_MS = 900;
type PlaceView = 'door' | 'kitchen';
const TOAST_MS = 1800;

// The hero is not part of a view of another place.
const OFFSCREEN: HeroPose = { pos: { x: -100, y: -100 }, facing: 'down', frame: -1 };

export function GameScreen({ initialState, startPaused, sfx, onChange, onEnding, onHome, onSettings }: Props) {
  const { t } = useI18n();
  const { width, height } = useWindowDimensions();
  const transform = sceneTransform(width, height);

  const [game, setGame] = useState(initialState);
  const gameRef = useRef(initialState);
  const [pose, setPose] = useState<HeroPose>({ pos: initialState.pos, facing: initialState.facing, frame: -1 });
  const walkRef = useRef<Walk | null>(null);
  const [present, setPresent] = useState<Presentation | null>(null);
  const presentRef = useRef<Presentation | null>(null);
  const queue = useRef<Beat[]>([]);
  const [menu, setMenu] = useState<HotspotDef | null>(null);
  const [selected, setSelected] = useState<ItemId | null>(null);
  const [page, setPage] = useState(0);
  const [notebook, setNotebook] = useState(false);
  const [toastUntil, setToastUntil] = useState(0);
  const [paused, setPaused] = useState(startPaused);
  const pausedRef = useRef(startPaused);
  const [foreground, setForeground] = useState(true);
  const [clock, setClock] = useState(0);
  const [walking, setWalking] = useState(false);
  const endedRef = useRef(false);
  // Another place shown without control while its lines play (Papa at the front door, Papa arriving in the kitchen).
  const [view, setView] = useState<PlaceView | null>(null);
  // Play time not yet given to the engine's timers (held while a line, a walk or the notebook is on).
  const pendingRef = useRef(0);
  const notebookRef = useRef(false);
  // Scenes that cannot be skipped (captures, the front door and kitchen views): lines ignore taps meanwhile.
  const cinematicRef = useRef(false);
  const [cinematic, setCinematic] = useState(false);
  // The adult shown next to Sam during a capture scene.
  const [captor, setCaptor] = useState<CharacterId | null>(null);
  // The family gathered around Sam for the final scene.
  const [cast, setCast] = useState<CharacterId[]>([]);
  // The place on screen: it changes on the place-change beat, so that a capture scene plays where Sam was caught
  // even though the saved state is already in the cellar.
  const [shown, setShown] = useState<PlaceId>(initialState.place);

  const commit = useCallback(
    (s: GameState) => {
      gameRef.current = s;
      setGame(s);
      onChange(s);
    },
    [onChange],
  );

  const signal = useCallback(
    (sig: TutorialSignal) => {
      const before = gameRef.current;
      const after = advanceTutorial(before, sig);
      if (after === before) return;
      commit(after);
      if (tutorialDone(after)) track('tutorial_complete', {});
    },
    [commit],
  );

  const show = useCallback((p: Presentation | null) => {
    presentRef.current = p;
    setPresent(p);
  }, []);

  // Plays the next beat of the queue (sounds, notes and place changes do not wait).
  const runNext = useCallback(() => {
    for (;;) {
      const b = queue.current.shift();
      if (!b) {
        setView(null);
        setCaptor(null);
        cinematicRef.current = false;
        setCinematic(false);
        show(null);
        return;
      }
      const now = Date.now();
      switch (b.type) {
        case 'say': {
          const text = line(t, b.key);
          show({ kind: 'line', speaker: b.speaker, text, until: now + lineDurationMs(text) });
          return;
        }
        case 'dialogue':
          show({ kind: 'dialogue', character: b.character });
          return;
        case 'keypad':
          show({ kind: 'keypad', keypad: b.keypad });
          return;
        case 'chess':
          show({ kind: 'chess' });
          return;
        case 'documents':
          show({ kind: 'documents' });
          return;
        case 'capture':
          setView(null);
          show({ kind: 'capture', until: now + (isFastMode() ? 200 : CAPTURE_MS) });
          return;
        case 'view':
          setView(b.view);
          break;
        case 'cinematic':
          cinematicRef.current = b.on;
          setCinematic(b.on);
          break;
        case 'captor':
          setCaptor(b.character);
          break;
        case 'cast':
          setCast(b.characters);
          break;
        case 'wait':
          show({ kind: 'wait', until: now + (isFastMode() ? 100 : b.ms) });
          return;
        case 'sfx':
          sounds.play(b.sfx);
          break;
        case 'note':
          setToastUntil(now + TOAST_MS);
          break;
        case 'room': {
          const s = gameRef.current;
          setShown(b.place);
          walkRef.current = null;
          setWalking(false);
          setPose(b.pos ? { pos: b.pos, facing: b.facing ?? 'right', frame: -1 } : { pos: s.pos, facing: s.facing, frame: -1 });
          setSelected(null);
          setPage(0);
          break;
        }
        case 'ending':
          show(null);
          if (!endedRef.current) {
            endedRef.current = true;
            onEnding(gameRef.current);
          }
          return;
      }
    }
  }, [onEnding, show, t]);

  const play = useCallback(
    (beats: readonly Beat[]) => {
      queue.current.push(...beats);
      if (!presentRef.current) runNext();
    },
    [runNext],
  );

  const apply = useCallback(
    (input: Input) => {
      const o = interact(gameRef.current, input);
      if (!o.accepted) return;
      commit(o.state);
      if (input.kind === 'verb' || input.kind === 'item') signal('verbUsed');
      for (const e of eventsFor(o.events, o.state)) track(e.name, e.params as never);
      play(o.beats);
    },
    [commit, play, signal],
  );
  const applyRef = useRef(apply);
  applyRef.current = apply;

  // Walks to `target` along the floor; `then` runs on arrival, facing `face`.
  const walkTo = useCallback(
    (target: Point, face: Facing | null, then: (() => void) | null) => {
      const s = gameRef.current;
      const w = walkRef.current;
      const from = w ? poseAt(w.from, w.path, Date.now() - w.start, w.facing).pos : s.pos;
      const path = findPath(from, target, FLOORS[s.place]);
      signal('walked');
      const arrive = () => {
        const end = path.length ? path[path.length - 1] : from;
        const facing = face ?? walkRef.current?.facing ?? gameRef.current.facing;
        walkRef.current = null;
        setWalking(false);
        setPose({ pos: end, facing, frame: -1 });
        commit({ ...gameRef.current, pos: end, facing });
        then?.();
      };
      if (path.length === 0 || isFastMode()) {
        walkRef.current = null;
        arrive();
        return;
      }
      walkRef.current = { from, path, start: Date.now(), facing: s.facing, then: arrive, lastFrame: -1 };
      setWalking(true);
    },
    [commit, signal],
  );

  // Game loop: walking, play time, line timers, animation clock.
  useEffect(() => {
    let last = Date.now();
    const id = setInterval(() => {
      const now = Date.now();
      const dt = now - last;
      last = now;
      if (pausedRef.current) return;
      setClock((c) => c + dt);
      gameRef.current = addPlayTime(gameRef.current, dt, true);
      pendingRef.current += dt * timerScale();
      if (!presentRef.current && !walkRef.current && !notebookRef.current && !gameRef.current.finished) {
        const g = gameRef.current;
        const next = nextDeadline(g);
        const ms = pendingRef.current;
        pendingRef.current = 0;
        if (next !== null && g.clock + ms >= next) applyRef.current({ kind: 'tick', ms });
        else gameRef.current = { ...g, clock: g.clock + ms };
      }
      const w = walkRef.current;
      if (w) {
        const p = poseAt(w.from, w.path, now - w.start, w.facing);
        w.facing = p.facing;
        if (p.frame !== w.lastFrame && (p.frame === 0 || p.frame === 2)) sounds.play('step');
        w.lastFrame = p.frame;
        if (p.done) w.then?.();
        else setPose({ pos: p.pos, facing: p.facing, frame: p.frame });
      }
      const pr = presentRef.current;
      if (pr && (pr.kind === 'line' || pr.kind === 'capture' || pr.kind === 'wait') && now >= pr.until) runNext();
    }, TICK_MS);
    return () => clearInterval(id);
  }, [runNext]);

  // Activity sounds of the place (guarded rooms heard from their corridor, drums, washing machine).
  useEffect(() => {
    ambience.update(ambienceFor(game), { enabled: sfx, foreground: foreground && !paused });
  }, [game, sfx, foreground, paused]);
  useEffect(() => () => ambience.update([], { enabled: false, foreground: false }), []);

  const pause = useCallback(() => {
    pausedRef.current = true;
    setPaused(true);
    setMenu(null);
    onChange(gameRef.current);
  }, [onChange]);

  const resume = useCallback(() => {
    pausedRef.current = false;
    setPaused(false);
  }, []);

  // Background: pause and save. Coming back shows the pause menu.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      setForeground(st === 'active');
      if (st !== 'active') pause();
    });
    return () => sub.remove();
  }, [pause]);

  useEffect(() => {
    notebookRef.current = notebook;
  }, [notebook]);

  const closeNotebook = useCallback(() => {
    setNotebook(false);
    commit(readNotes(gameRef.current));
  }, [commit]);

  // Android back closes the notebook, else opens the pause menu (or closes it).
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (notebook) closeNotebook();
      else if (pausedRef.current) resume();
      else pause();
      return true;
    });
    return () => sub.remove();
  }, [notebook, closeNotebook, pause, resume]);

  const busy = present !== null;
  const blocked = busy || paused || notebook;

  const onFloor = (e: GestureResponderEvent) => {
    if (blocked) return;
    const p = toLogical(transform, e.nativeEvent.locationX, e.nativeEvent.locationY);
    if (p.y >= ROOM_H) return;
    setMenu(null);
    walkTo(p, null, null);
  };

  const onHotspot = (h: HotspotDef) => {
    if (blocked) return;
    if (selected) {
      const item = selected;
      setSelected(null);
      walkTo(h.at, h.face, () => apply({ kind: 'item', item, target: h.id }));
      return;
    }
    setMenu(h);
  };

  const onVerb = (h: HotspotDef, v: Verb) => {
    setMenu(null);
    // Looking at a thing needs no walk; everything else is done standing next to it.
    if (v === 'look' && !h.character) apply({ kind: 'verb', verb: v, target: h.id });
    else walkTo(h.at, h.face, () => apply({ kind: 'verb', verb: v, target: h.id }));
  };

  const onExit = (id: string, at: Point) => {
    if (blocked) return;
    setMenu(null);
    setSelected(null);
    walkTo(at, 'up', () => apply({ kind: 'exit', exit: id }));
  };

  const onSlot = (item: ItemId) => {
    if (blocked) return;
    setMenu(null);
    if (selected && selected !== item) {
      const first = selected;
      setSelected(null);
      apply({ kind: 'item', item: first, target: `item:${item}` });
      return;
    }
    setSelected((cur) => (cur === item ? null : item));
    signal('itemSelected');
  };

  const hotspots = hotspotsIn(game);
  const exits = exitsIn(game);
  const inv = inventoryPage(game.inventory, page);
  const bubble = !blocked ? tutorialBubble(game) : null;
  const speaker = present?.kind === 'line' ? present.speaker : null;
  const idle = !blocked && !walking && !menu;
  const menuRect = toScreenRect(transform, MENU_BUTTON);
  const notebookRect = toScreenRect(transform, NOTEBOOK_BUTTON);
  const toast = clock >= 0 && Date.now() < toastUntil && !paused;

  return (
    <View testID="game-screen" style={styles.screen}>
      <StatusBar hidden />
      <Scene
        state={shown === game.place ? game : { ...game, place: shown }}
        hero={pose}
        guests={captor ? [captor] : cast}
        transform={transform}
        width={width}
        height={height}
        speaker={speaker}
        selected={selected}
        page={inv.page}
        unread={game.unread.length > 0}
        clock={clock}
      />

      <Pressable testID="scene-floor" style={StyleSheet.absoluteFill} onPress={onFloor} accessible={false} />
      {exits.map((e) => {
        const r = toScreenRect(transform, e.rect);
        return (
          <Pressable
            key={e.id}
            testID={`exit-${e.id}`}
            accessibilityRole="button"
            accessibilityLabel={exitName(t, e.id)}
            onPress={() => onExit(e.id, e.at)}
            style={[styles.abs, { left: r.x, top: r.y, width: r.w, height: r.h }]}
          />
        );
      })}
      {hotspots.map((h) => {
        const r = toScreenRect(transform, h.rect);
        return (
          <Pressable
            key={h.id}
            testID={`hs-${h.id}`}
            accessibilityRole="button"
            accessibilityLabel={hotspotName(t, h.id)}
            onPress={() => onHotspot(h)}
            style={[styles.abs, { left: r.x, top: r.y, width: r.w, height: r.h }]}
          />
        );
      })}
      {inv.items.map((item, i) => {
        const r = toScreenRect(transform, slotRect(i));
        return (
          <Pressable
            key={item}
            testID={`inv-${item}`}
            accessibilityRole="button"
            accessibilityLabel={itemName(t, item)}
            accessibilityState={{ selected: selected === item }}
            onPress={() => onSlot(item)}
            onLongPress={() => !blocked && apply({ kind: 'lookItem', item })}
            style={[styles.abs, { left: r.x, top: r.y, width: r.w, height: r.h }]}
          />
        );
      })}
      {inv.pages > 1 &&
        (() => {
          const r = toScreenRect(transform, slotRect(SLOTS - 1));
          return (
            <Pressable
              testID="inv-more"
              accessibilityRole="button"
              accessibilityLabel={t.game.morePage}
              onPress={() => !blocked && setPage((p) => p + 1)}
              style={[styles.abs, { left: r.x, top: r.y, width: r.w, height: r.h }]}
            />
          );
        })()}
      <Pressable
        testID="game-notebook"
        accessibilityRole="button"
        accessibilityLabel={t.game.notebook}
        onPress={() => {
          if (busy || paused) return;
          setMenu(null);
          setNotebook(true);
        }}
        style={[styles.abs, { left: notebookRect.x, top: notebookRect.y, width: notebookRect.w, height: notebookRect.h }]}
      />
      <Pressable
        testID="game-menu"
        accessibilityRole="button"
        accessibilityLabel={t.game.menu}
        onPress={pause}
        style={[styles.abs, { left: menuRect.x, top: menuRect.y, width: menuRect.w, height: menuRect.h }]}
      />

      {selected && !busy && <UseWithHint text={t.game.useWith(itemName(t, selected))} />}
      {bubble && <TutorialBubble text={t.tutorial[bubble]} />}
      {toast && <NoteToast text={t.game.newNote} />}
      {/* Marker for the e2e flows: nothing is moving or being said. collapsable=false keeps it in the native tree. */}
      {idle && <View testID="scene-idle" collapsable={false} pointerEvents="none" style={styles.idle} />}
      {nextDeadline(game) === null && <View testID="timers-idle" collapsable={false} pointerEvents="none" style={styles.timersIdle} />}

      {view && (
        <View testID={`view-${view}`} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Scene
            state={{ ...game, place: view === 'door' ? 'front' : 'kitchen' }}
            hero={OFFSCREEN}
            transform={transform}
            width={width}
            height={height}
            speaker={speaker}
            selected={null}
            page={0}
            unread={false}
            clock={clock}
          />
        </View>
      )}

      {menu && (
        <ActionMenu
          title={hotspotName(t, menu.id)}
          verbs={menu.verbs}
          anchor={toScreenRect(transform, menu.rect)}
          screenW={width}
          screenH={height}
          onVerb={(v) => onVerb(menu, v)}
          onClose={() => setMenu(null)}
        />
      )}
      {present?.kind === 'line' && <LineBanner speaker={present.speaker} text={present.text} onPress={cinematic ? () => {} : runNext} />}
      {present?.kind === 'dialogue' && (
        <DialogueChoices
          choices={dialogueOptions(game, present.character)}
          onChoose={(id) => {
            show(null);
            apply({ kind: 'dialogue', character: present.character, option: id });
          }}
        />
      )}
      {present?.kind === 'keypad' && (
        <Keypad
          title={t.keypad[present.keypad]}
          onSubmit={(code) => {
            const keypad = present.keypad;
            show(null);
            apply({ kind: 'keypad', keypad, code });
          }}
          onClose={runNext}
        />
      )}
      {present?.kind === 'chess' && (
        <ChessBoard
          onSolved={(moves) => {
            show(null);
            apply({ kind: 'chess', moves });
          }}
          onClose={runNext}
        />
      )}
      {present?.kind === 'documents' && <DocumentsOverlay onClose={runNext} />}
      {present?.kind === 'capture' && <CaptureFade onPress={() => {}} />}
      {present?.kind === 'wait' && <View testID="scene-wait" collapsable={false} pointerEvents="none" style={styles.timersIdle} />}
      {notebook && <NotebookOverlay notes={game.notes} unread={game.unread} onClose={closeNotebook} />}

      {paused && <PauseMenu onResume={resume} onSettings={() => onSettings(gameRef.current)} onHome={() => onHome(gameRef.current)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  abs: { position: 'absolute' },
  idle: { position: 'absolute', right: 0, bottom: 0, width: 2, height: 2 },
  timersIdle: { position: 'absolute', left: 0, bottom: 0, width: 2, height: 2 },
});
