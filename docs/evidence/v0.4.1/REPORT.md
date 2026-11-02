# Verification report: Mini Mansion v0.4.1

Overall: PASS
Commit: b9bbc35
Date: 2026-11-02 21:01 UTC
Stack: expo
Target: emulator sdk_gphone64_x86_64, Android 16 (API 36, x86_64)
APK: mini-mansion-0.4.1-universal.apk (136.1 MB)
SHA-256: acd2ed7d866062787539c2b9c77d01a25b449709b942eaec58322be1bcf3c963

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | clean working tree | PASS | commit b9bbc35 |
| 2 | typecheck | PASS | `tsc --noEmit` exit 0 |
| 3 | unit tests (Jest) | PASS | Tests:       372 passed, 372 total |
| 4 | expo-doctor | WARN | issues reported (see raw/expo-doctor.txt) |
| 5 | secrets & personal data scan | PASS | secret-scan (worktree): clean |
| 6 | release build | PASS | mini-mansion-0.4.1-universal.apk, 136.1 MB, Firebase on |
| 7 | release signature | PASS | release signature valid; cert SHA-256 54da35e17c99b321... |
| 8 | install (adb) | PASS | Performing Streamed Install Success |
| 9 | launch, alive after 8 s, no fatal error | PASS | process alive, 0 fatal log lines |
| 10 | cold start time | PASS | median 1832 ms of 3330 / 1832 / 1130 ms after a warm-up launch (target < 3000 ms) |
| 11 | Maestro E2E flows | PASS | 8/8 flows passed, 22 screenshots in screens/ |
| 12 | no crash during e2e flows | PASS | 0 fatal log lines (crash buffer + errors, raw/logcat-e2e.txt) |
| 13 | telemetry events after consent | PASS | seen in logcat: game_start, tutorial_complete, puzzle_solved |

Screenshots: `screens/` (emulator only, no personal data). Raw logs: `raw/` (local, git-ignored).
