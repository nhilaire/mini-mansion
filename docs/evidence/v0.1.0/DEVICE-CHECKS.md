# Device checks: Mini Mansion v0.1.0

Commit: 2174049
APK: dist/mini-mansion-0.1.0-universal.apk, SHA-256 ad32a9762e0151931ae57a3042c4cf76ced40fce1d087e904bd2c164ef0765e5
Device: emulator sdk_gphone64_x86_64, Android 16 (API 36), 2400x1080 landscape
Date: 2026-10-21

Checks that `verify.mjs` does not run, done on the APK of the verified commit after the verification run. Raw outputs
in `raw/device-*.txt` (local, git-ignored).

| Check | Command | Result |
|---|---|---|
| Launcher name per language (AC-05) | `aapt dump badging <apk>` (raw/device-badging.txt) | PASS: `application-label:'Mini Mansion'`, `application-label-fr:'Mini Mansion'`, `application-label-en:'Mini Mansion'` |
| Landscape orientation (AC-05) | `aapt dump xmltree <apk> AndroidManifest.xml` (raw/device-manifest.txt) | PASS: MainActivity `android:screenOrientation=0x0` (landscape) |
| Immersive fullscreen (AC-05) | `adb shell dumpsys window` with the game in front (raw/device-window.txt) | PASS: focused window is MainActivity; `statusBars visible=false`, `navigationBars visible=false` |
| No advertising ID, few permissions (privacy) | `aapt dump badging <apk>` | PASS: no `AD_ID` / ad services permission; only INTERNET, ACCESS_NETWORK_STATE, WAKE_LOCK, VIBRATE, MODIFY_AUDIO_SETTINGS and the dynamic receiver permission |
| Nothing sent after « Refuser » (AC-06) | `pm clear`, `setprop debug.firebase.analytics.app`, refuse consent, new game, then `logcat -s FA FA-SVC` (raw/device-logcat-refused.txt) | PASS: 0 `Logging event` lines |
| Events sent after « Accepter » (AC-08) | `verify.mjs --telemetry` (REPORT.md step 13, raw/logcat-telemetry.txt) | PASS: game_start, tutorial_complete, puzzle_solved seen |
| Cold start < 3 s (AC-46) | `verify.mjs` (REPORT.md step 10) | PASS: median 647 ms |
| No crash during the flows (AC-47) | `verify.mjs` (REPORT.md step 12: crash buffer cleared before the run, empty after) | PASS: 0 fatal log lines |
| No ANR during the flows (AC-47) | `dumpsys dropbox --print data_app_anr` and `logcat -b events` `am_anr` (raw/device-anr.txt); the events buffer starts at 10-20 20:13, before this verification run (2026-10-21 06:03 UTC) | PASS: 0 ANR entries for the package |

Not checked here (on the phone at release): APK size of the arm64 phone build (the universal emulator APK is 135.4 MB
because it carries 4 ABIs; the phone build is arm64 only, target < 60 MB), the launcher name seen on the phone, and
the feel test (AC-48).
