# Device checks: Mini Mansion v0.3.0

Commit: a833327 (verified on this commit; the APK was built on 19b6481, a833327 only changes tests under src/__tests__)
APK: dist/mini-mansion-0.3.0-universal.apk, SHA-256 00bc4aa2badd5830a3faefcb474f874be68464024fedfd14a80d9cd11279ba4d
Device: emulator sdk_gphone64_x86_64, Android 16 (API 36), 2400x1080 landscape
Date: 2026-10-28

Checks that `verify.mjs` does not run, done on the APK of the verified commit after the verification run. Raw outputs
in `raw/device-*.txt` (local, git-ignored).

| Check | Command | Result |
|---|---|---|
| Launcher name per language (AC-05) | `aapt dump badging <apk>` (raw/device-badging.txt) | PASS: `application-label:'Mini Mansion'`, `application-label-fr:'Mini Mansion'`, `application-label-en:'Mini Mansion'` |
| Landscape orientation (AC-05) | `aapt dump xmltree <apk> AndroidManifest.xml` (raw/device-manifest.txt) | PASS: MainActivity `android:screenOrientation=0x0` (landscape) |
| Immersive fullscreen (AC-05) | `adb shell dumpsys window` with the game in front (raw/device-window.txt) | PASS: focused window is MainActivity; `statusBars visible=false`, `navigationBars visible=false` |
| No advertising ID, few permissions (privacy) | `aapt dump badging <apk>` | PASS: no `AD_ID` / ad services permission; only INTERNET, VIBRATE, ACCESS_NETWORK_STATE, WAKE_LOCK, MODIFY_AUDIO_SETTINGS and the dynamic receiver permission |
| Nothing sent after « Refuser » (AC-06) | v0.2.0 DEVICE-CHECKS refused run (a0908c4 APK) | PASS by carry-over: `git diff 72e2c17 a833327 -- src/telemetry` is empty, so the consent and telemetry code is the one checked then |
| Events sent after « Accepter » (AC-08) | `verify.mjs --telemetry` (REPORT.md, raw/logcat-telemetry.txt) | PASS: game_start, tutorial_complete, puzzle_solved seen |
| Cold start < 3 s (AC-46) | `verify.mjs` (REPORT.md) | PASS: median 715 ms |
| No crash during the flows (AC-47) | `verify.mjs` (REPORT.md: crash buffer cleared before the run, empty after) | PASS: 0 fatal log lines |
| No ANR during the flows (AC-47) | `dumpsys dropbox --print data_app_anr` and `logcat -b events` `am_anr` (raw/device-anr.txt); the events buffer starts at 10-27 19:59, before this verification run | PASS: 0 ANR entries for the package |

A first run on an emulator up for over a day (2 GB RAM, 1.3 GB swap) lost the device during the telemetry flow and
measured an 11 s cold start; a run left overnight hit the Maestro 30 min timeout (PC asleep). The run of 2026-10-28 on a833327 is the one this version stands on.

Not checked here (on the phone at release): the arm64 phone APK size, the launcher name seen on the phone, the feel
test (AC-48) and the photographed rooms (AC-57).
