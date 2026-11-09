# Device checks: Mini Mansion v0.4.2

Commit: dddf18c (REPORT.md Overall PASS on this commit)
APK: dist/mini-mansion-0.4.2-universal.apk, SHA-256 9960da59fe91404396ad47e1e07aff465f8f6a2da41e7887e2d1bb339b2e2bb6 (same as REPORT.md)
Device: emulator sdk_gphone64_x86_64, Android 16 (API 36), 2400x1080 landscape, cold-booted (no snapshot)
Date: 2026-11-09, right after the REPORT.md run, on the APK installed by it

Checks that `verify.mjs` does not run, done on the APK of the verified commit after the verification run. Raw outputs
in `raw/device-*.txt` (local, git-ignored). v0.4.2 changes since v0.4.1 (b9bbc35): a failed consent or erase write is
caught and reported, the consent screen always moves on (T-95, `src/App.tsx`, `src/telemetry/consentStore.ts`), and
the hose keeps working while the big nail is in the shed, the solver keeps the nail in the story (T-94, `src/game`).
Because the consent code changed, the refused run was replayed on this APK instead of carried over.

| Check | Command | Result |
|---|---|---|
| Launcher name per language (AC-05) | `aapt2 dump badging <apk>` (raw/device-badging.txt) | PASS: `application-label:'Mini Mansion'`, `application-label-fr:'Mini Mansion'`, `application-label-en:'Mini Mansion'`; `versionName='0.4.2'`, `versionCode='402'` |
| Landscape orientation (AC-05) | `aapt2 dump xmltree --file AndroidManifest.xml <apk>` (raw/device-manifest.txt) | PASS: MainActivity `screenOrientation=0` (landscape) |
| Immersive fullscreen (AC-05) | `adb shell dumpsys window` with the game in front after a launcher start (raw/device-window.txt) | PASS: `mCurrentFocus` is MainActivity, `mDisplayRotation=ROTATION_90`; `statusBars visible=false`, `navigationBars visible=false` |
| No advertising ID, few permissions (privacy) | `aapt2 dump badging <apk>` | PASS: no `AD_ID` / ad services permission; only INTERNET, VIBRATE, ACCESS_NETWORK_STATE, WAKE_LOCK, MODIFY_AUDIO_SETTINGS and the app's own dynamic receiver permission |
| Nothing sent after « Refuser » (AC-06) | `pm clear`, `setprop debug.firebase.analytics.app <pkg>`, `log.tag.FA`/`FA-SVC` VERBOSE, `logcat -c`, `maestro test .maestro/smoke.yaml` (clearState, tap consent-refuse, new game, front door reached: all steps COMPLETED, raw/device-telemetry-off-maestro.txt), then `adb logcat -d -s FA FA-SVC` (raw/device-telemetry-off.txt) | PASS: 50 FA lines, 0 `Logging event`, 0 upload; "App measurement disabled via the manifest", "Event not sent since app measurement is disabled", "User property not set since app measurement is disabled" |
| Events sent after « Accepter » (AC-08) | `verify.mjs --telemetry` (REPORT.md step 14, raw/logcat-telemetry.txt) | PASS: game_start, tutorial_complete, puzzle_solved seen |
| Cold start < 3 s (AC-46) | `verify.mjs` (REPORT.md step 11) | PASS: median 784 ms (1306 / 748 / 784 ms) |
| No crash during the flows (AC-47) | `verify.mjs` (REPORT.md step 13: crash buffer cleared before the run, empty after) | PASS: 0 fatal log lines |
| No ANR during the flows (AC-47) | `dumpsys dropbox --print data_app_anr` and `logcat -b events` `am_anr` after the 8 flows, the telemetry flow and the refused run (raw/device-anr.txt) | PASS: 0 ANR entries for the package |
| Ending in the lab, burnt console cells (AC-57, AC-67, AC-73) | screenshots of the walkthrough flow (REPORT.md step 12) | PASS: `screens/readme-3-ending.png` shows the ending over the lab; `screens/circuit-fullscreen.png` shows the burnt cells drawn |

Not checked here (on the phone at release): the arm64 phone APK size, the launcher name seen on the phone, the feel
test (AC-48) and the photographed rooms (AC-57).
