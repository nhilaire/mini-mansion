# Verification report: Mini Mansion v0.2.0

Overall: PASS
Commit: 1bbaeca
Date: 2026-10-24 23:23 UTC
Stack: expo
Target: emulator sdk_gphone64_x86_64, Android 16 (API 36, x86_64)
APK: mini-mansion-0.2.0-universal.apk (136 MB)
SHA-256: 6e05c9fac252888e9bf1ea68227bcb18dfba9e66467a9a06d673fed076960310

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | clean working tree | PASS | commit 1bbaeca |
| 2 | typecheck | PASS | `tsc --noEmit` exit 0 |
| 3 | unit tests (Jest) | PASS | Tests:       341 passed, 341 total |
| 4 | expo-doctor | WARN | issues reported (see raw/expo-doctor.txt) |
| 5 | secrets & personal data scan | PASS | secret-scan (worktree): clean |
| 6 | release build | PASS | mini-mansion-0.2.0-universal.apk, 136 MB, Firebase on |
| 7 | release signature | PASS | release signature valid; cert SHA-256 54da35e17c99b321... |
| 8 | install (adb) | PASS | Performing Streamed Install Success |
| 9 | launch, alive after 8 s, no fatal error | PASS | process alive, 0 fatal log lines |
| 10 | cold start time | PASS | median 1888 ms of 2346 / 1888 / 1069 ms after a warm-up launch (target < 3000 ms) |
| 11 | Maestro E2E flows | PASS | 8/8 flows passed, 21 screenshots in screens/ |
| 12 | no crash during e2e flows | PASS | 0 fatal log lines (crash buffer + errors, raw/logcat-e2e.txt) |
| 13 | telemetry events after consent | PASS | seen in logcat: game_start, tutorial_complete, puzzle_solved |

Screenshots: `screens/` (emulator only, no personal data). Raw logs: `raw/` (local, git-ignored).
