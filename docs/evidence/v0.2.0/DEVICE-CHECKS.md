# Device checks: Mini Mansion v0.2.0

Commit: 1b38889 (verified with the APK built on 0faa1e4; 0faa1e4..1b38889 only changes a test and the evidence)
APK: dist/mini-mansion-0.2.0-universal.apk, SHA-256 af4a65bdbe5b782077d3c372914f4abfafb15d79c5db07698b586085ac76f15a
Device: emulator sdk_gphone64_x86_64, Android 16 (API 36), 2400x1080 landscape
Date: 2026-10-24

Checks that `verify.mjs` does not run, done on the APK of the verified commit after the verification run. Raw outputs
in `raw/device-*.txt` (local, git-ignored).

| Check | Command | Result |
|---|---|---|
| Launcher name per language (AC-05) | `aapt dump badging <apk>` (raw/device-badging.txt) | PASS: `application-label:'Mini Mansion'`, `application-label-fr:'Mini Mansion'`, `application-label-en:'Mini Mansion'` |
| Landscape orientation (AC-05) | `aapt dump xmltree <apk> AndroidManifest.xml` (raw/device-manifest.txt) | PASS: MainActivity `android:screenOrientation=0x0` (landscape) |
| Immersive fullscreen (AC-05) | `adb shell dumpsys window` with the game in front (raw/device-window.txt) | PASS: focused window is MainActivity; `statusBars visible=false`, `navigationBars visible=false` |
| No advertising ID, few permissions (privacy) | `aapt dump badging <apk>` | PASS: no `AD_ID` / ad services permission; only INTERNET, VIBRATE, ACCESS_NETWORK_STATE, WAKE_LOCK, MODIFY_AUDIO_SETTINGS and the dynamic receiver permission |
| Nothing sent after « Refuser » (AC-06) | `setprop debug.firebase.analytics.app`, `logcat -c`, `.maestro/smoke.yaml` (fresh install, refuse, new game), then `logcat -s FA FA-SVC` (raw/device-logcat-refused.txt) | PASS: 0 `Logging event` lines (run on the a0908c4 APK; the consent and telemetry code did not change since) |
| Events sent after « Accepter » (AC-08) | `verify.mjs --telemetry` (REPORT.md step 13, raw/logcat-telemetry.txt) | PASS: game_start, tutorial_complete, puzzle_solved seen |
| Cold start < 3 s (AC-46) | `verify.mjs` (REPORT.md step 10) | PASS: median 1123 ms |
| No crash during the flows (AC-47) | `verify.mjs` (REPORT.md step 12: crash buffer cleared before the run, empty after) | PASS: 0 fatal log lines |
| No ANR during the flows (AC-47) | `dumpsys dropbox --print data_app_anr` and `logcat -b events` `am_anr` (raw/device-anr.txt); the events buffer starts at the emulator boot (10-24 10:02), before this verification run | PASS: 0 ANR entries for the package |

Not checked here (on the phone at release): APK size of the arm64 phone build (the universal emulator APK is 136 MB
because it carries 4 ABIs; the phone build is arm64 only, target < 60 MB), the launcher name seen on the phone, the
feel test (AC-48) and the photographed rooms (AC-57).
