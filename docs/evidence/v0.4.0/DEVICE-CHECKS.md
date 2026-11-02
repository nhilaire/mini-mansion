# Device checks: Mini Mansion v0.4.0

Commit: 01dea9d (verified and built on this commit; the checks below carried from b3d3130 touch no code changed since: T-90 content, T-91 garden painting and power strip)
APK: dist/mini-mansion-0.4.0-universal.apk, SHA-256 3eb2a369abd4fe6a01bebfbe782c00c5e4260cddf687574d2c9a8f01609847d9
Device: emulator sdk_gphone64_x86_64, Android 16 (API 36), 2400x1080 landscape
Date: 2026-11-02

Checks that `verify.mjs` does not run, done on the APK of the verified commit after the verification run. Raw outputs
in `raw/device-*.txt` (local, git-ignored).

| Check | Command | Result |
|---|---|---|
| Launcher name per language (AC-05) | `aapt dump badging <apk>` (raw/device-badging.txt) | PASS: `application-label:'Mini Mansion'`, `application-label-fr:'Mini Mansion'`, `application-label-en:'Mini Mansion'` |
| Landscape orientation (AC-05) | `aapt dump xmltree <apk> AndroidManifest.xml` (raw/device-manifest.txt) | PASS: MainActivity `android:screenOrientation=0x0` (landscape) |
| Immersive fullscreen (AC-05) | `adb shell dumpsys window` with the game in front (raw/device-window.txt) | PASS: focused window is MainActivity; `statusBars visible=false`, `navigationBars visible=false` |
| No advertising ID, few permissions (privacy) | `aapt dump badging <apk>` | PASS: no `AD_ID` / ad services permission; only INTERNET, VIBRATE, ACCESS_NETWORK_STATE, WAKE_LOCK, MODIFY_AUDIO_SETTINGS and the dynamic receiver permission |
| Nothing sent after « Refuser » (AC-06) | v0.2.0 DEVICE-CHECKS refused run (a0908c4 APK) | PASS by carry-over: `git diff 72e2c17 01dea9d -- src/telemetry` is empty, so the consent and telemetry code is the one checked then |
| Events sent after « Accepter » (AC-08) | `verify.mjs --telemetry` (REPORT.md, raw/logcat-telemetry.txt) | PASS: game_start, tutorial_complete, puzzle_solved seen |
| Cold start < 3 s (AC-46) | `verify.mjs` (REPORT.md) | PASS: median 1135 ms |
| No crash during the flows (AC-47) | `verify.mjs` (REPORT.md: crash buffer cleared before the run, empty after) | PASS: 0 fatal log lines |
| No ANR during the flows (AC-47) | `dumpsys dropbox --print data_app_anr` and `logcat -b events` `am_anr` (raw/device-anr.txt) | PASS: 0 ANR entries for the package |
| Ending in the lab, burnt console cells (AC-57, AC-67, AC-73) | screenshots of the walkthrough flow | PASS: `screens/readme-3-ending.png` shows the ending over the lab, with the bowl of dough in the proofing cabinet; `screens/circuit-fullscreen.png` shows the burnt cells drawn (scorched chip, crack, smoke) |

A first run, right after a cold boot of the emulator, had all 8 Maestro flows blocked by an Android system dialog
(« Process system isn't responding ») over the consent screen; the dialog was dismissed (Wait), and the run with
`--skip-build` on the same commit and APK is the one this version stands on.

Not checked here (on the phone at release): the arm64 phone APK size, the launcher name seen on the phone, the feel
test (AC-48) and the photographed rooms (AC-57).
