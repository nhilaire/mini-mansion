// Overlays of the game screen: action menu, spoken line banner, dialogue choices, digit keypad, chess board, clue
// notebook, Florent's console game, documents, capture fade, tutorial bubble, "use with" hint, note toast and the pause menu. Plain React
// Native views (readable by Maestro and screen readers); every text comes from the dictionaries.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { noteText, speakerName } from '../../content/index';
import { applyMove, Board, ChessSession, coords, legalFrom, newSession, playWhite, square } from '../../game/chess';
import { Board as Board2, BATTERY_ROW, BULB_ROW, COLS, connected, E, ends, lit, N, ROWS, S, START_BOARD, TILES, turn, W } from '../../game/circuit';
import { NoteId, Rect, Speaker, Verb } from '../../game/types';
import { useI18n } from '../../i18n/I18nProvider';
import { isFastMode } from '../../testing/fastMode';
import { Button } from '../../ui/Button';
import { colors, font, spacing, speakerColors } from '../../ui/theme';

export function ActionMenu({ title, verbs, anchor, screenW, screenH, onVerb, onClose }: {
  title: string;
  verbs: readonly Verb[];
  anchor: Rect;
  screenW: number;
  screenH: number;
  onVerb: (v: Verb) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const width = 170;
  const height = 34 + verbs.length * 50;
  const cx = anchor.x + anchor.w / 2;
  const left = Math.max(8, Math.min(screenW - width - 8, cx - width / 2));
  const top = Math.max(8, Math.min(screenH - height - 8, anchor.y + anchor.h / 2 - height / 2));
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable testID="menu-close" accessibilityLabel={t.game.cancel} style={StyleSheet.absoluteFill} onPress={onClose} />
      <View testID="action-menu" style={[styles.panel, { position: 'absolute', left, top, width }]}>
        <Text style={styles.menuTitle} numberOfLines={1}>
          {title}
        </Text>
        {verbs.map((v) => (
          <Pressable
            key={v}
            testID={`verb-${v}`}
            accessibilityRole="button"
            accessibilityLabel={t.verbs[v]}
            onPress={() => onVerb(v)}
            style={({ pressed }) => [styles.verb, pressed && styles.pressed]}
          >
            <Text style={styles.verbText}>{t.verbs[v]}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// A spoken line: it stays for its reading time; a tap on its frame goes to the next line, but not in its first second,
// so that nothing is missed (AC-49). Taps beside the frame go through to the scene.
export function LineBanner({ speaker, text, onPress }: { speaker: Speaker; text: string; onPress: () => void }) {
  const { t } = useI18n();
  // The narrator has no name tag.
  const name = speaker === 'narrator' ? null : speakerName(t, speaker);
  return (
    <View testID="line-banner" pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Pressable testID="line-frame" accessibilityRole="button" accessibilityHint={t.game.tapToContinue} onPress={onPress} style={[styles.panel, styles.banner]}>
        {name ? <Text style={[styles.speaker, { color: speakerColors[speaker] }]}>{name}</Text> : null}
        <Text style={[styles.lineText, { color: speakerColors[speaker] }, speaker === 'narrator' && styles.italic]}>{text}</Text>
      </Pressable>
    </View>
  );
}

// A 4-digit code pad (the computer and the safe). OK is enabled once 4 digits are typed.
export function Keypad({ title, onSubmit, onClose }: { title: string; onSubmit: (code: string) => void; onClose: () => void }) {
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const digit = (d: string) => setCode((c) => (c.length < 4 ? c + d : c));
  return (
    <View testID="keypad" style={[StyleSheet.absoluteFill, styles.center, styles.dim]}>
      <View style={[styles.panel, styles.keypad]}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text testID="keypad-display" style={styles.display}>
          {code.padEnd(4, '_').split('').join(' ')}
        </Text>
        <View style={styles.keyRows}>
          {['123', '456', '789'].map((row) => (
            <View key={row} style={styles.row}>
              {row.split('').map((d) => (
                <Key key={d} label={d} testID={`keypad-digit-${d}`} onPress={() => digit(d)} />
              ))}
            </View>
          ))}
          <View style={styles.row}>
            <Key label={t.keypad.clear} testID="keypad-clear" onPress={() => setCode('')} wide />
            <Key label="0" testID="keypad-digit-0" onPress={() => digit('0')} />
            <Key label={t.keypad.ok} testID="keypad-ok" onPress={() => code.length === 4 && onSubmit(code)} wide disabled={code.length !== 4} />
          </View>
        </View>
        <Button label={t.keypad.close} onPress={onClose} variant="secondary" testID="keypad-close" compact />
      </View>
    </View>
  );
}

// The sequence pads (PRD E21, E29): Papa's four bottles (tap them from the oldest to the youngest) and the trunk's
// colour padlock. The sequence is sent once it has as many taps as the code.
const PAD_SWATCH: Record<string, string> = { red: '#c83a32', yellow: '#e8c040', blue: '#3a6ad0', green: '#3a9a48', purple: '#8a4ab8', orange: '#e07a2a' };
const BOTTLE = '#2e6a3a';

export function SequencePad({ title, buttons, length, colours, onSubmit, onClose }: { title: string; buttons: readonly string[]; length: number; colours: boolean; onSubmit: (code: string[]) => void; onClose: () => void }) {
  const { t } = useI18n();
  const [code, setCode] = useState<string[]>([]);
  const press = (b: string) => {
    const next = [...code, b];
    if (next.length < length) setCode(next);
    else {
      setCode([]);
      onSubmit(next);
    }
  };
  const label = (b: string) => (colours ? t.colours[b as keyof typeof t.colours] : b);
  return (
    <View testID="pad" style={[StyleSheet.absoluteFill, styles.center, styles.dim]}>
      <View style={[styles.panel, styles.keypad]}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text testID="pad-display" style={styles.display}>
          {Array.from({ length }, (_, i) => (i < code.length ? '●' : '_')).join(' ')}
        </Text>
        <View style={[styles.row, styles.padRow]}>
          {buttons.map((b) => (
            <Pressable
              key={b}
              testID={`pad-${b}`}
              accessibilityRole="button"
              accessibilityLabel={label(b)}
              onPress={() => press(b)}
              style={({ pressed }) => [styles.key, styles.padKey, { backgroundColor: colours ? PAD_SWATCH[b] : BOTTLE }, pressed && styles.pressed]}
            >
              <Text style={styles.padText}>{label(b)}</Text>
            </Pressable>
          ))}
        </View>
        <Button label={t.keypad.close} onPress={onClose} variant="secondary" testID="pad-close" compact />
      </View>
    </View>
  );
}

function Key({ label, testID, onPress, wide, disabled }: { label: string; testID: string; onPress: () => void; wide?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      onPress={onPress}
      style={({ pressed }) => [styles.key, wide && styles.keyWide, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <Text style={styles.keyText}>{label}</Text>
    </Pressable>
  );
}

const GLYPHS: Record<string, string> = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };

// Théo's chess problem: tap a white piece (its legal moves light up), then a destination. Black answers by itself.
// How long the white move stays on the board before Black answers (time to see the effect of the move).
export const CHESS_REPLY_MS = 1500;

export function ChessBoard({ onSolved, onClose }: { onSolved: (moves: string[]) => void; onClose: () => void }) {
  const { t } = useI18n();
  const { height } = useWindowDimensions();
  const [session, setSession] = useState<ChessSession>(newSession);
  const [from, setFrom] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // While set, the board shows the white move just played; Black answers (or the problem resets) afterwards.
  const [shown, setShown] = useState<Board | null>(null);
  const size = Math.max(28, Math.min(40, Math.floor((height - 40) / 8)));
  const targets = from ? legalFrom(session.board, from) : [];
  const reset = () => {
    setSession(newSession());
    setFrom(null);
  };

  const later = (then: () => void) => {
    setTimeout(() => {
      setShown(null);
      then();
    }, isFastMode() ? 100 : CHESS_REPLY_MS);
  };

  const tap = (sq: string) => {
    if (session.step >= 2 || shown) return;
    const piece = session.board[sq];
    if (from && targets.includes(sq)) {
      const move = `${from}${sq}`;
      const result = playWhite(session, move);
      setFrom(null);
      if (result.kind === 'wrong') {
        setShown(applyMove(session.board, move));
        later(() => {
          setMessage(t.chess.wrong);
          reset();
        });
      } else if (result.kind === 'progress') {
        setMessage(null);
        setShown(applyMove(session.board, move));
        later(() => setSession(result.session));
      } else if (result.kind === 'solved') {
        setSession(result.session);
        setMessage(t.chess.solved);
        onSolved(result.session.moves);
      }
      return;
    }
    setFrom(piece && piece === piece.toUpperCase() ? sq : null);
  };

  const label = (board: Board, sq: string) => {
    const p = board[sq];
    return p ? t.chess.square(t.chess.pieces[p as keyof typeof t.chess.pieces], sq) : t.chess.empty(sq);
  };

  return (
    <View testID="chess" style={[StyleSheet.absoluteFill, styles.center, styles.dim]}>
      {/* Marker for the e2e flows: the white move is on show, Black has not answered yet. */}
      {shown && <View testID="chess-waiting" collapsable={false} pointerEvents="none" style={styles.marker} />}
      <View style={[styles.panel, styles.chessPanel]}>
        <View style={{ width: size * 8 }}>
          {[7, 6, 5, 4, 3, 2, 1, 0].map((rank) => (
            <View key={rank} style={styles.boardRow}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((file) => {
                const sq = square(file, rank)!;
                const piece = (shown ?? session.board)[sq];
                const dark = (file + rank) % 2 === 0;
                const [ff, rr] = coords(sq);
                return (
                  <Pressable
                    key={sq}
                    testID={`chess-sq-${sq}`}
                    accessibilityRole="button"
                    accessibilityLabel={label(shown ?? session.board, sq)}
                    onPress={() => tap(sq)}
                    style={[
                      { width: size, height: size },
                      styles.cell,
                      dark ? styles.dark : styles.light,
                      from === sq && styles.selected,
                      targets.includes(sq) && styles.target,
                    ]}
                  >
                    {piece ? <Text style={[styles.piece, { fontSize: size * 0.72 }, piece === piece.toUpperCase() ? styles.whitePiece : styles.blackPiece]}>{GLYPHS[piece]}</Text> : null}
                    {ff === 0 ? <Text style={styles.coordRank}>{rr + 1}</Text> : null}
                    {rr === 0 ? <Text style={styles.coordFile}>{'abcdefgh'[ff]}</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
        <View style={styles.chessSide}>
          <Text style={styles.chessTitle}>{t.chess.title}</Text>
          {message ? (
            <Text testID="chess-message" style={styles.chessMessage}>
              {message}
            </Text>
          ) : null}
          <Button label={t.chess.reset} onPress={reset} variant="secondary" testID="chess-reset" compact />
          <Button label={t.chess.close} onPress={onClose} variant="secondary" testID="chess-close" compact />
        </View>
      </View>
    </View>
  );
}

// Florent's console: the broken circuit game of level 99, full screen in a retro console frame (E31). A tap turns a
// tile a quarter turn; the tiles the current reaches light up; once the bulb lights, the win stays on show 1.5 s and
// the game hands its board back (the engine solves E31). Closing hands the board back as it is, so the next use goes
// on from there.
export const CIRCUIT_WIN_MS = 1500;

export function CircuitGame({ initial, onSolved, onClose }: { initial: Board2; onSolved: (board: number[]) => void; onClose: (board: number[]) => void }) {
  const { t } = useI18n();
  const { width, height } = useWindowDimensions();
  const [board, setBoard] = useState<number[]>(() => [...initial]);
  const [won, setWon] = useState(false);
  const on = lit(board);
  // The board takes the height of the screen, the side panel the rest of the width.
  const size = Math.floor(Math.max(36, Math.min((height - 48) / ROWS, (width - 260) / COLS)));
  const tapTile = (i: number) => {
    if (won) return;
    const next = [...turn(board, i)];
    setBoard(next);
    if (connected(next)) {
      setWon(true);
      setTimeout(() => onSolved(next), isFastMode() ? 100 : CIRCUIT_WIN_MS);
    }
  };
  const pipe = (m: number, glow: boolean) => {
    const c = glow ? styles.pipeOn : styles.pipeOff;
    const half = size / 2;
    const w = Math.max(6, Math.round(size * 0.22));
    const arm = { position: 'absolute' as const, backgroundColor: c.backgroundColor };
    return (
      <>
        {m & N ? <View style={[arm, { left: half - w / 2, top: 0, width: w, height: half + w / 2 }]} /> : null}
        {m & S ? <View style={[arm, { left: half - w / 2, top: half - w / 2, width: w, height: half + w / 2 }]} /> : null}
        {m & W ? <View style={[arm, { top: half - w / 2, left: 0, height: w, width: half + w / 2 }]} /> : null}
        {m & E ? <View style={[arm, { top: half - w / 2, left: half - w / 2, height: w, width: half + w / 2 }]} /> : null}
      </>
    );
  };
  // A burnt cell: a scorched component with soot marks, a crack and a small wisp of smoke, so that it reads as broken.
  const burnt = (i: number) => {
    const box = (left: number, top: number, w: number, h: number) => ({ position: 'absolute' as const, left: size * left, top: size * top, width: size * w, height: size * h });
    return (
      <>
        <View style={[box(0.12, 0.3, 0.76, 0.5), styles.soot]} />
        <View testID={`circuit-burnt-${i}`} style={[box(0.24, 0.38, 0.52, 0.34), styles.chip]} />
        <View style={[box(0.3, 0.53, 0.44, 0.04), styles.crack, { transform: [{ rotate: '-24deg' }] }]} />
        <View style={[box(0.52, 0.2, 0.1, 0.1), styles.smoke]} />
        <View style={[box(0.42, 0.08, 0.14, 0.14), styles.smoke, { opacity: 0.35 }]} />
      </>
    );
  };
  return (
    <View testID="circuit" style={[StyleSheet.absoluteFill, styles.consoleBezel]}>
      <View style={styles.consoleRow}>
        <View style={[styles.consoleSide, { height: size }, { marginTop: BATTERY_ROW * size }]}>
          <View accessibilityLabel={t.circuit.battery} style={[styles.battery, { height: size * 0.6 }]} />
        </View>
        <View style={[styles.consoleScreen, { width: size * COLS + 8, height: size * ROWS + 8 }]}>
          {Array.from({ length: ROWS }, (_, y) => (
            <View key={y} style={styles.boardRow}>
              {Array.from({ length: COLS }, (_, x) => {
                const i = y * COLS + x;
                const tile = TILES[i];
                const isOn = on.has(i);
                return (
                  <Pressable
                    key={i}
                    testID={`circuit-cell-${i}`}
                    accessibilityRole="button"
                    accessibilityLabel={t.circuit.cell(x, y, isOn, tile.fixed, tile.kind === 'O')}
                    onPress={() => tapTile(i)}
                    style={[{ width: size, height: size }, styles.tile, tile.kind === 'O' && styles.tileBurnt]}
                  >
                    {tile.kind === 'O' ? burnt(i) : pipe(ends(tile.kind, board[i]), isOn)}
                    {tile.fixed ? <View style={styles.rivet} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
        <View style={[styles.consoleSide, { height: size }, { marginTop: BULB_ROW * size }]}>
          <View accessibilityLabel={t.circuit.bulb} style={[styles.bulb, { width: size * 0.6, height: size * 0.6, borderRadius: size * 0.3 }, won && styles.bulbOn]} />
        </View>
        <View style={styles.consolePanel}>
          <Text style={styles.consoleTitle}>{t.circuit.title}</Text>
          {won ? (
            <Text testID="circuit-solved" style={styles.consoleWin}>
              {t.circuit.solved}
            </Text>
          ) : (
            <Text style={styles.consoleHint}>{t.circuit.hint}</Text>
          )}
          <Button label={t.circuit.reset} onPress={() => !won && setBoard([...START_BOARD])} variant="secondary" testID="circuit-reset" compact />
          <Button label={t.circuit.close} onPress={() => !won && onClose(board)} variant="secondary" testID="circuit-close" compact />
        </View>
      </View>
    </View>
  );
}

export function NotebookOverlay({ notes, unread, onClose }: { notes: readonly NoteId[]; unread: readonly NoteId[]; onClose: () => void }) {
  const { t } = useI18n();
  const newestFirst = [...notes].reverse();
  return (
    <View testID="notebook" style={[StyleSheet.absoluteFill, styles.center, styles.dim]}>
      <View style={[styles.panel, styles.sheet]}>
        <Text style={styles.sheetTitle}>{t.notebook.title}</Text>
        <ScrollView contentContainerStyle={styles.sheetBody}>
          {newestFirst.length === 0 ? <Text style={styles.noteText}>{t.notebook.empty}</Text> : null}
          {newestFirst.map((n) => (
            <Text key={n} testID={`note-${n}`} style={[styles.noteText, unread.includes(n) && styles.noteNew]}>
              • {noteText(t, n)}
            </Text>
          ))}
        </ScrollView>
        <Button label={t.notebook.close} onPress={onClose} variant="secondary" testID="notebook-close" compact />
      </View>
    </View>
  );
}

export function DocumentsOverlay({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  return (
    <View testID="documents" style={[StyleSheet.absoluteFill, styles.center, styles.dim]}>
      <View style={[styles.panel, styles.sheet, styles.screenPanel]}>
        <Text style={styles.sheetTitle}>{t.documents.title}</Text>
        <ScrollView contentContainerStyle={styles.sheetBody}>
          {t.story.docs.map((d) => (
            <Text key={d} style={styles.docText}>
              {d}
            </Text>
          ))}
        </ScrollView>
        <Button label={t.documents.close} onPress={onClose} variant="secondary" testID="documents-close" compact />
      </View>
    </View>
  );
}

export function CaptureFade({ onPress }: { onPress: () => void }) {
  return <Pressable testID="capture-fade" onPress={onPress} style={[StyleSheet.absoluteFill, styles.black]} />;
}

export function TutorialBubble({ text }: { text: string }) {
  return (
    <View testID="tutorial-bubble" pointerEvents="none" style={[styles.panel, styles.tutorial]}>
      <Text style={styles.tutorialText}>{text}</Text>
    </View>
  );
}

export function UseWithHint({ text }: { text: string }) {
  return (
    <View testID="use-with" pointerEvents="none" style={[styles.panel, styles.useWith]}>
      <Text style={styles.small}>{text}</Text>
    </View>
  );
}

export function NoteToast({ text }: { text: string }) {
  return (
    <View testID="note-toast" pointerEvents="none" style={[styles.panel, styles.toast]}>
      <Text style={styles.small}>{text}</Text>
    </View>
  );
}

export function PauseMenu({ onResume, onSettings, onHome }: { onResume: () => void; onSettings: () => void; onHome: () => void }) {
  const { t } = useI18n();
  return (
    <View testID="pause" style={[StyleSheet.absoluteFill, styles.center, styles.dim]}>
      <View style={[styles.panel, styles.pause]}>
        <Text style={styles.titleText}>{t.pause.title}</Text>
        <Button label={t.pause.resume} onPress={onResume} testID="pause-resume" />
        <Button label={t.pause.settings} onPress={onSettings} variant="secondary" testID="pause-settings" />
        <Button label={t.pause.home} onPress={onHome} variant="secondary" testID="pause-home" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  marker: { position: 'absolute', left: 0, top: 0, width: 2, height: 2 },
  panel: { backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 2, borderRadius: 3, padding: spacing.sm },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  center: { alignItems: 'center', justifyContent: 'center' },
  dim: { backgroundColor: 'rgba(0,0,0,0.6)' },
  black: { backgroundColor: '#000000' },
  row: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  menuTitle: { color: colors.accent, fontFamily: font.family, fontSize: font.small, fontWeight: '700', marginBottom: spacing.xs, textAlign: 'center' },
  verb: { minHeight: 46, justifyContent: 'center', paddingHorizontal: spacing.sm, borderTopWidth: 1, borderTopColor: colors.surface },
  verbText: { color: colors.text, fontFamily: font.family, fontSize: font.body, fontWeight: '700' },
  banner: { position: 'absolute', top: spacing.sm, left: '8%', right: '8%' },
  speaker: { fontFamily: font.family, fontSize: font.small, fontWeight: '700' },
  lineText: { fontFamily: font.family, fontSize: font.body, lineHeight: 22 },
  italic: { fontStyle: 'italic' },
  keypad: { alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.lg },
  display: { color: colors.accent, fontFamily: font.family, fontSize: 28, fontWeight: '700', letterSpacing: 2 },
  keyRows: { gap: spacing.xs },
  key: { width: 52, height: 44, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  keyWide: { width: 96 },
  padRow: { flexWrap: 'wrap', justifyContent: 'center', maxWidth: 420 },
  padKey: { width: 64, height: 52 },
  padText: { color: '#ffffff', fontFamily: font.family, fontSize: font.small, fontWeight: '700', textShadowColor: '#000000', textShadowRadius: 2 },
  keyText: { color: colors.text, fontFamily: font.family, fontSize: font.body, fontWeight: '700' },
  chessPanel: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  boardRow: { flexDirection: 'row' },
  cell: { alignItems: 'center', justifyContent: 'center' },
  light: { backgroundColor: '#e8d8b0' },
  dark: { backgroundColor: '#9a6a3c' },
  selected: { backgroundColor: '#d4a23a' },
  target: { borderWidth: 3, borderColor: '#5a9a48' },
  piece: { fontWeight: '700' },
  whitePiece: { color: '#ffffff', textShadowColor: '#000000', textShadowRadius: 2 },
  blackPiece: { color: '#120e18' },
  coordRank: { position: 'absolute', left: 1, top: 0, fontSize: 9, color: '#3e2414', fontFamily: font.family },
  coordFile: { position: 'absolute', right: 2, bottom: 0, fontSize: 9, color: '#3e2414', fontFamily: font.family },
  chessSide: { width: 210, gap: spacing.sm },
  chessTitle: { color: colors.text, fontFamily: font.family, fontSize: font.small, lineHeight: 18 },
  chessMessage: { color: colors.accent, fontFamily: font.family, fontSize: font.body, fontWeight: '700' },
  consoleBezel: { backgroundColor: '#2a2a33', alignItems: 'center', justifyContent: 'center', borderWidth: 6, borderColor: '#4a4a58' },
  consoleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  consoleScreen: { backgroundColor: '#0f2a1c', borderWidth: 4, borderColor: '#111118', borderRadius: 4 },
  consoleSide: { width: 28, alignItems: 'center', justifyContent: 'center' },
  battery: { width: 18, backgroundColor: '#c0303c', borderWidth: 2, borderColor: '#e8d8b0' },
  bulb: { backgroundColor: '#3a3a30', borderWidth: 2, borderColor: '#e8d8b0' },
  bulbOn: { backgroundColor: '#ffe14a' },
  tile: { borderWidth: 1, borderColor: '#1c4a32', backgroundColor: '#163a26' },
  tileBurnt: { backgroundColor: '#1b2a20' },
  soot: { backgroundColor: '#0c120e', borderRadius: 999, opacity: 0.85 },
  chip: { backgroundColor: '#3a332b', borderWidth: 2, borderColor: '#5a4c3c', borderRadius: 3 },
  crack: { backgroundColor: '#0c0a08' },
  smoke: { backgroundColor: '#9aa29c', borderRadius: 999, opacity: 0.55 },
  pipeOn: { backgroundColor: '#ffe14a' },
  pipeOff: { backgroundColor: '#7c8a80' },
  rivet: { position: 'absolute', right: 3, top: 3, width: 6, height: 6, borderRadius: 3, backgroundColor: '#c8c8d0' },
  consolePanel: { width: 200, gap: spacing.sm, marginLeft: spacing.md },
  consoleTitle: { color: '#ffe14a', fontFamily: font.family, fontSize: font.body, fontWeight: '700' },
  consoleHint: { color: colors.text, fontFamily: font.family, fontSize: font.small, lineHeight: 18 },
  consoleWin: { color: '#ffe14a', fontFamily: font.family, fontSize: font.heading, fontWeight: '700' },
  sheet: { width: '70%', maxHeight: '88%', gap: spacing.sm },
  screenPanel: { backgroundColor: 'rgba(20, 52, 54, 0.96)' },
  sheetTitle: { color: colors.accent, fontFamily: font.family, fontSize: font.heading, fontWeight: '700', textAlign: 'center' },
  sheetBody: { gap: spacing.sm, paddingBottom: spacing.sm },
  noteText: { color: colors.text, fontFamily: font.family, fontSize: font.small, lineHeight: 19 },
  noteNew: { color: colors.accent },
  docText: { color: '#9af0c0', fontFamily: font.family, fontSize: font.small, lineHeight: 19 },
  small: { color: colors.text, fontFamily: font.family, fontSize: font.small },
  titleText: { color: colors.accent, fontFamily: font.family, fontSize: font.title, fontWeight: '700', textAlign: 'center' },
  // At the top: the floor stays visible and free to tap.
  tutorial: { position: 'absolute', left: '14%', right: '14%', top: spacing.sm },
  tutorialText: { color: colors.accent, fontFamily: font.family, fontSize: font.body, textAlign: 'center' },
  useWith: { position: 'absolute', top: spacing.sm, alignSelf: 'center', left: '25%', right: '25%', alignItems: 'center' },
  toast: { position: 'absolute', bottom: '22%', right: spacing.md },
  pause: { width: 300, gap: spacing.sm, padding: spacing.md },
});
