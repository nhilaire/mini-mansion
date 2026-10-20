// Maps engine facts to the PRD telemetry events (duration_s = play time of the current game).
import { durationSeconds } from '../game/progress';
import { GameEvent, GameState } from '../game/types';
import { LanguageSetting } from '../i18n';
import { EventName, SettingName, TelemetryEvents } from './events';

export type Tracked = { [N in EventName]: { name: N; params: TelemetryEvents[N] } }[EventName];

export function eventsFor(events: readonly GameEvent[], state: GameState): Tracked[] {
  const duration_s = durationSeconds(state);
  return events.map((e): Tracked => {
    switch (e.type) {
      case 'puzzle':
        return { name: 'puzzle_solved', params: { puzzle: e.puzzle, duration_s } };
      case 'capture':
        return { name: 'capture', params: { room: e.room, count: e.count } };
      case 'complete':
        return { name: 'game_complete', params: { duration_s, captures: e.captures } };
    }
  });
}

export function gameStart(mode: 'new' | 'continue'): Tracked {
  return { name: 'game_start', params: { mode } };
}

// Turning statistics off sends nothing (the player just withdrew consent); turning them on is logged once consent
// is applied. Sound toggles and the language are always logged (when consent is on).
export function settingsChange(setting: Exclude<SettingName, 'language'>, on: boolean): Tracked | null {
  if (setting === 'telemetry' && !on) return null;
  return { name: 'settings_change', params: { setting, value: on ? 'on' : 'off' } };
}

export function languageChange(value: LanguageSetting): Tracked {
  return { name: 'settings_change', params: { setting: 'language', value } };
}
