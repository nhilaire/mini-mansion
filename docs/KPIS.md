# KPIs and monitoring: Mini Mansion

Firebase project: `mini-mansion` (free Spark plan, never upgraded to Blaze), connected on 2026-10-20.
Android app: io.github.nhilaire.minimansion (`firebase/google-services.json`, local only, git-ignored)
Data collection: opt-in only (consent screen). Analytics data retention: 2 months. Google signals: off.

Events (PRD "Telemetry events", typed in `src/telemetry/events.ts`): `game_start {mode}`, `tutorial_complete`,
`puzzle_solved {puzzle 1-17, duration_s}`, `capture {room, count}`, `game_complete {duration_s, captures}`,
`settings_change {setting, value}`. No identifiers, no free text; the language is never sent as a parameter
(Analytics reports the device language itself).

## Business KPIs

| KPI | Definition | Where to read it | Target |
|---|---|---|---|
| Completion rate | users with `game_complete` / users with `game_start` mode=new | Analytics > Events (game_complete; game_start by `mode`) | >= 25% |
| Puzzle funnel | users per `puzzle_solved` puzzle 1-17 (15 = optional cellar escape, excluded); the biggest drop is where players get stuck (no hint system) | Analytics > Events > puzzle_solved (custom dimension `puzzle`), or an Explore funnel | no single drop > 40% |
| Median time to finish | median `duration_s` on `game_complete` | Analytics > Events > game_complete (custom metric `duration_s`) | 3 h - 5 h |
| Captures per game | median `captures` on `game_complete`; share of `capture` events per `room` | Analytics > Events > capture (dimension `room`), game_complete (metric `captures`) | median 1-4, no room > 50% of captures |
| Tutorial completion | `tutorial_complete` users / `game_start` mode=new users | Analytics > Events | >= 90% |
| Sound settings usage | share of players sending `settings_change` sfx/music off | Analytics > Events > settings_change (dimensions `setting`, `value`) | < 30% |
| D1 / D7 retention | % of new users back on day 1 / day 7 | Analytics > Reports > Retention | D1 >= 30%, D7 >= 15% |

## Technical KPIs

| KPI | Definition | Where to read it | Target |
|---|---|---|---|
| Crash-free users | % users without a fatal crash | Crashlytics > Dashboard | >= 99% |
| ANR rate | app not responding events | Crashlytics > Dashboard (filter ANR) | ~0 |
| Non-fatal errors | `reportError()` calls (e.g. corrupt save) | Crashlytics > Non-fatals | low and stable |
| APK size | arm64 release APK size | docs/evidence/v*/REPORT.md | < 60 MB |
| Cold start | launch to home screen | evidence report (device check) | < 3 s |

## Custom definitions to register in Analytics

Analytics > Admin > Custom definitions (free, up to 50 dimensions / 50 metrics):

| Name | Scope | Param | Type |
|---|---|---|---|
| puzzle | Event | puzzle | dimension |
| mode | Event | mode | dimension |
| room | Event | room | dimension |
| setting | Event | setting | dimension |
| value | Event | value | dimension |
| duration_s | Event | duration_s | metric (seconds) |
| captures | Event | captures | metric (standard) |
| count | Event | count | metric (standard) |

## How to check that events arrive

1. Build with `firebase/google-services.json` present, accept the consent screen.
2. `adb shell setprop debug.firebase.analytics.app io.github.nhilaire.minimansion` then open Analytics > DebugView.
3. The factory's `verify.mjs --telemetry` captures the `Logging event` lines from logcat as evidence.
Standard reports update within ~24 h; DebugView is real time.
