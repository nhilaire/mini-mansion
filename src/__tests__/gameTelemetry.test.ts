// T-22: the PRD telemetry events (AC-06, AC-07): only the listed events, numeric or enum params, sent after consent.
import { logEvent } from '@react-native-firebase/analytics';

import { newGame, playAll } from '../game/rules';
import { SOLUTION } from '../game/solution';
import { DOOR_SPAWN } from '../game/world';
import { sanitizeParams } from '../telemetry/events';
import { eventsFor, gameStart, languageChange, settingsChange, Tracked } from '../telemetry/gameTelemetry';
import { applyConsent, track } from '../telemetry/telemetry';

const fs = jest.requireActual('fs');
const path = jest.requireActual('path');

// PRD "Telemetry events": every event and its params.
const PRD_EVENTS: Record<string, string[]> = {
  game_start: ['mode'],
  tutorial_complete: [],
  puzzle_solved: ['puzzle', 'duration_s'],
  capture: ['room', 'count'],
  game_complete: ['duration_s', 'captures'],
  settings_change: ['setting', 'value'],
};

describe('telemetry events (AC-06, AC-07)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('the typed catalogue declares exactly the PRD events', () => {
    const src: string = fs.readFileSync(path.join(process.cwd(), 'src', 'telemetry', 'events.ts'), 'utf8');
    const start = src.indexOf('export type TelemetryEvents');
    const block = src.slice(start, src.indexOf('\n};', start));
    const names = [...block.matchAll(/^ {2}(\w+):/gm)].map((m) => m[1]);
    expect(names.sort()).toEqual(Object.keys(PRD_EVENTS).sort());
  });

  it('maps the engine facts of a whole game to puzzle_solved, capture and game_complete with numbers and enums only', () => {
    let s = { ...newGame(), playMs: 125_000 };
    const tracked: Tracked[] = [];
    // A capture first, then the whole walkthrough.
    const caught = playAll({ ...s, place: 'landing', flags: { door_unlocked: true } }, [{ kind: 'verb', verb: 'use', target: DOOR_SPAWN.julien.door }]);
    tracked.push(...caught.outcomes.flatMap((o) => eventsFor(o.events, o.state)));
    for (const input of SOLUTION) {
      const o = playAll(s, [input]).outcomes[0];
      tracked.push(...eventsFor(o.events, o.state));
      s = o.state;
    }
    expect(tracked[0]).toEqual({ name: 'capture', params: { room: 'julien', count: 1 } });
    const puzzles = tracked.filter((e) => e.name === 'puzzle_solved');
    expect(puzzles).toHaveLength(30);
    expect(puzzles[0]).toEqual({ name: 'puzzle_solved', params: { puzzle: 1, duration_s: 125 } });
    expect(tracked.filter((e) => e.name === 'game_complete')).toEqual([{ name: 'game_complete', params: { duration_s: 125, captures: 0 } }]);
    for (const e of tracked) {
      expect(Object.keys(e.params).sort()).toEqual([...PRD_EVENTS[e.name]].sort());
      expect(sanitizeParams(e.params)).toEqual(e.params);
    }
  });

  it('game_start, settings and language changes use the listed enums; turning statistics off sends nothing', () => {
    expect(gameStart('new')).toEqual({ name: 'game_start', params: { mode: 'new' } });
    expect(gameStart('continue').params).toEqual({ mode: 'continue' });
    expect(settingsChange('sfx', false)).toEqual({ name: 'settings_change', params: { setting: 'sfx', value: 'off' } });
    expect(settingsChange('music', true)?.params).toEqual({ setting: 'music', value: 'on' });
    expect(settingsChange('telemetry', true)?.params).toEqual({ setting: 'telemetry', value: 'on' });
    expect(settingsChange('telemetry', false)).toBeNull();
    expect(languageChange('en').params).toEqual({ setting: 'language', value: 'en' });
    expect(languageChange('auto').params).toEqual({ setting: 'language', value: 'auto' });
  });

  it('nothing is sent without consent; with consent the event goes out as is', async () => {
    await applyConsent(false);
    track('capture', { room: 'office', count: 2 });
    expect(logEvent).not.toHaveBeenCalled();
    await applyConsent(true);
    track('capture', { room: 'office', count: 2 });
    expect(logEvent).toHaveBeenCalledWith(expect.anything(), 'capture', { room: 'office', count: 2 });
    await applyConsent(false);
  });
});
