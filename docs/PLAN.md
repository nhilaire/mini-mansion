# Plan: Mini Mansion v0.1.0

Each task is small (one commit), references the acceptance criteria it serves, and names its proof.
Format: `- [x] T-01 Title (AC-01, AC-02) - proof: unit|e2e|device`. Check the box only when the proof passes.

## Tasks

- [x] T-01 Privacy guard: photos/ git-ignored and untracked, checked by a test (AC-09) - proof: unit
- [x] T-02 Engine core ported from the POC: types, context, geometry, walker, tutorial, play time, time format (AC-12, AC-13, AC-14, AC-38, AC-40) - proof: unit
- [x] T-03 World data: 24 places, canonical exits with lock rules, walkable floors, hotspots, scene transform, tap sizes (AC-15, AC-19) - proof: unit
- [x] T-04 Interaction core: verbs per hotspot, use/give/combine items, wrong lines in rotation, look item, spoken line timing (AC-17, AC-18, AC-49) - proof: unit
- [x] T-05 Character states, guarded rooms, door announcements, captures, wine cellar and shutter (AC-22, AC-23, AC-24, AC-25) - proof: unit
- [x] T-06 Puzzles E01-E05, E16, E17 with their refusals and cutscenes (AC-21) - proof: unit
- [x] T-07 Chess problem: legal-move generator, guided mate in 2, uniqueness proof, E06 (AC-26) - proof: unit
- [x] T-08 Keypads and the rest of the chain: E07-E14, E11-E13, ending (AC-21, AC-27, AC-28, AC-32) - proof: unit
- [x] T-09 Clue notebook N01-N12 and once-only cutscenes (AC-29) - proof: unit
- [x] T-10 Dialogues (Papa, Maman, Julien), busy lines, door lines (AC-20) - proof: unit
- [x] T-11 Solution walkthrough, exhaustive state-graph search, dependency order (AC-31, AC-32) - proof: unit
- [x] T-12 Save format v1 (full state), corrupt/unknown save rejected (AC-35) - proof: unit
- [x] T-13 Story content in French and English: lines, names, documents, notebook, clue map, typography (AC-03, AC-30, AC-45) - proof: unit
- [x] T-14 Art: palette, pixel buffer, 6 characters with walk/idle/talk/activity frames, 17 item icons (AC-14, AC-19) - proof: unit
- [x] T-15 Art: 24 provisional place scenes and the house at dusk (AC-15) - proof: unit
- [x] T-16 Native stack: Skia, Reanimated, expo-audio, splash, landscape, scheme, fullscreen plugin, Jest mocks; Skia scene and backdrop (AC-05) - proof: unit
- [x] T-17 Game screen: walking, hotspots, exits, action menu, line banner, inventory band with paging, use-with hint, tutorial bubbles (AC-11, AC-16, AC-17, AC-49) - proof: unit
- [x] T-18 Game overlays: dialogue choices, digit keypad, chess board, clue notebook, capture fade (AC-26, AC-27, AC-34) - proof: unit
- [x] T-19 App flow: home (title, subtitle, continue, confirm), intro, ending, pause, background pause (AC-10, AC-11, AC-36, AC-37, AC-39, AC-40) - proof: unit
- [x] T-20 Settings and About: sfx, music, statistics, language, erase; story and author text in each language (AC-04, AC-42, AC-44) - proof: unit
- [x] T-21 Persistence wiring: autosave triggers, background save, cutscene-safe save, kill during the ending (AC-35, AC-50) - proof: unit
- [x] T-22 Telemetry calls: game_start, tutorial_complete, puzzle_solved, capture, game_complete, settings_change (AC-06, AC-07, AC-08) - proof: unit
- [x] T-23 Audio: generated 8-bit effects, activity loops and music; toggles, background pause, activity sound per guarded room (AC-25, AC-43) - proof: unit
- [x] T-24 Pixel icon and splash generated from code (AC-05) - proof: device
- [x] T-25 Fast-mode deep link and walkthrough flow generated from the solution (AC-41) - proof: unit
- [x] T-26 Maestro flows: consent/home, new game/tutorial/notebook, continue/new game, pause/background, settings/about/language, walkthrough, telemetry consent (AC-01, AC-02, AC-04, AC-08, AC-10, AC-11, AC-16, AC-33, AC-34, AC-36, AC-37, AC-39, AC-41, AC-42, AC-44) - proof: e2e
- [x] T-27 Device checks prepared for verify/release: launcher name per language, landscape fullscreen, cold start, no crash, feel test on the phone (AC-05, AC-46, AC-47, AC-48) - proof: device

## Notes

- Base: the POC engine (`midnight-mansion`) is ported, not copied blindly: new ids (24 places, 17 items, 5 inhabitants
  with states), notebook, captures, chess, keypads, per-language content.
- The scene keeps the POC layout: 320x150 room + 30 px inventory band (notebook and menu buttons at the right end);
  the band pages when more items are held than slots fit.
- The exhaustive state-graph search ignores position, dialogue history and the capture count beyond 1, to stay
  finite; if it is too slow for Jest, it explores per track with the shared flags (documented in the test).
- Content (lines in fr and en) is the largest part: keys are produced by the engine, a test checks every key the
  engine can emit exists in both languages.
- Risks: art volume (24 scenes, 6 characters) and startup time (decode per place, lazily); Maestro walkthrough length
  (fast mode).
