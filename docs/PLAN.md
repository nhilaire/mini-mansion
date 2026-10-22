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

### Amendment after the phone test (PRD of 2026-10-21)

- [x] T-28 Engine timers: play clock, doorbell phases of Papa, dough timer, tick and wait inputs, fast-mode scale, save v2 (AC-35, AC-38, AC-51, AC-52, AC-58) - proof: unit
- [x] T-29 World rework: 23 places (music corner + dining room), side gates, cellar hatch, breaker, richer rooms (>= 5 hotspots), gags, Julien's ball (AC-15, AC-19, AC-24, AC-53, AC-54) - proof: unit
- [x] T-30 Puzzle rework: E02 extension at the football corner, E08 shower states, E12 lab code + old key, E16 ring again, E17 breaker, E18 gates, E19 dough (AC-21, AC-27, AC-28, AC-55) - proof: unit
- [x] T-31 Captures at the front door, in the kitchen and in the garden, occupant arrivals, announcements (AC-22, AC-23, AC-25) - proof: unit
- [x] T-32 Dialogues: only Julien talks, his options and conditions (AC-20) - proof: unit
- [x] T-33 Notebook and clues: N01 rumour, N07 attic passage, N10 lab code, clue map for E18/E19 and the new steps (AC-29, AC-30, AC-56) - proof: unit
- [x] T-34 Story content in French and English: intro, new lines, Théo's monologue, electronic chess, vous only for Papa at the door (AC-03, AC-45, AC-56) - proof: unit
- [x] T-35 Solver and walkthrough: timers in the exhaustive search, new dependencies, solution, generated Maestro walkthrough (AC-31, AC-32, AC-41) - proof: unit
- [x] T-36 Game screen: timer ticks while playing, front door view and kitchen view, timers frozen in pause (AC-38, AC-49, AC-50, AC-51, AC-52, AC-58) - proof: unit
- [x] T-37 Telemetry: puzzle 1-19 and the new capture places (AC-06, AC-07, AC-08) - proof: unit
- [x] T-38 Audio: breaker, toilet spray, food processor; activity sounds for the kitchen and the garden (AC-25, AC-43) - proof: unit
- [x] T-39 Art: rooms redrawn after the author's photos, front-facing stairs in a doorway, gates, hatch, cluttered attic, wet toilet floor (AC-15, AC-57) - proof: unit
- [x] T-40 Art: Florent drumming from the back, Julien's ball on the grass, electronic chess set, Papa at the front door (AC-14, AC-57) - proof: unit
- [x] T-41 Maestro flows updated and rerun on the emulator, walkthrough included (AC-11, AC-16, AC-33, AC-34, AC-36, AC-41) - proof: e2e
- [x] T-42 Device checks of the amended build prepared for verify/release (AC-05, AC-46, AC-47, AC-48, AC-57) - proof: device

### Second phone test (2026-10-22)

- [x] T-43 Papa answers the doorbell after 30 s; the front door and kitchen views cannot be skipped (AC-49, AC-51) - proof: unit
- [x] T-44 Capture scene that cannot be skipped: a boy shouts for Papa, Papa comes, takes Sam to the cellar, says "don't run away" and leaves (AC-23, AC-49) - proof: unit
- [x] T-45 The capture scene plays inside the guarded room, after Sam steps in (AC-23) - proof: unit
- [x] T-46 Papa stays 90 s outside; the pliers move to Papa's toolbox on the office shelves (AC-21, AC-31, AC-51) - proof: unit
- [x] T-47 The first capture asks who Sam is; "Encore toi ?!" only from the second one (AC-24) - proof: unit
- [x] T-48 Design pass after the phone test: hose on the ground, no washing line or hammock at the pool, hall cabinet on the floor, bookshelf above the sofa, dining part left of the music corner, clearer drums, bowl and processor on the worktop, fridge to open, lamps on the desk and on the attic floor, contrasted shower head, Théo from the back, no lamp in his room (AC-15, AC-19, AC-57) - proof: unit
- [x] T-49 Florent and Théo heard going back once Sam is out of their room; the white chess move stays 1.5 s before Black answers; the whole family gathers in the lab at the end (AC-22, AC-26, AC-32) - proof: unit
- [x] T-50 Papa outside 60 s and back at his desk 30 s later; the upstairs room sounds stay faint in the background (AC-25, AC-51) - proof: unit

## Notes

- Base: the POC engine (`midnight-mansion`) is ported, not copied blindly: new ids (24 places, 17 items, 5 inhabitants
  with states), notebook, captures, chess, keypads, per-language content.
- The scene keeps the POC layout: 320x150 room + 30 px inventory band (notebook and menu buttons at the right end);
  the band pages when more items are held than slots fit.
- The exhaustive state-graph search ignores position, dialogue history and the capture count beyond 1, to stay
  finite; if it is too slow for Jest, it explores per track with the shared flags (documented in the test).
- Content (lines in fr and en) is the largest part: keys are produced by the engine, a test checks every key the
  engine can emit exists in both languages.
- T-26 proof (2026-10-20): x86_64 release APK on the emulator, 7/7 short flows and the full walkthrough passed
  (walkthrough reached the ending screen and home without "continue"). The telemetry flow runs in `/verify-app
  --telemetry`.
- T-27 is preparation only: its device proofs (launcher name per language, landscape fullscreen, cold start, no crash,
  feel test) are produced by `/verify-app` and `/release-apk`.
- T-41 proof (2026-10-21, commit f383657): x86_64 release APK on the emulator, 7/7 short flows and the generated walkthrough passed (the dough timer reached CUT12 in fast mode; ending screen then home without "continue").
- T-42 is preparation only, as T-27: the device proofs come from /verify-app and /release-apk.
- Risks: art volume (24 scenes, 6 characters) and startup time (decode per place, lazily); Maestro walkthrough length
  (fast mode).
