# Verification report: Mini Mansion v0.2.0

Overall: FAIL
Commit: 0800356
Date: 2026-10-25 10:56 UTC
Stack: expo
Target: emulator-5554
APK: mini-mansion-0.2.0-universal.apk (136.1 MB)
SHA-256: a50fb5c10838e22332594c8236ab085c03327a270d57e7ce77012846013ddcf7

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | clean working tree | PASS | commit 0800356 |
| 2 | typecheck | PASS | `tsc --noEmit` exit 0 |
| 3 | unit tests (Jest) | PASS | Tests:       343 passed, 343 total |
| 4 | expo-doctor | WARN | issues reported (see raw/expo-doctor.txt) |
| 5 | secrets & personal data scan | PASS | secret-scan (worktree): clean |
| 6 | release build | PASS | mini-mansion-0.2.0-universal.apk, 136.1 MB, Firebase on |
| 7 | release signature | PASS | release signature valid; cert SHA-256 54da35e17c99b321... |
| 8 | device available | FAIL | no emulator-5554 device connected (0 device(s) seen): plug the phone over USB, enable USB debugging and accept the RSA prompt |

Screenshots: `screens/` (emulator only, no personal data). Raw logs: `raw/` (local, git-ignored).
