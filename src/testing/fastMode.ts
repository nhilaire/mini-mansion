// Testing hook (PRD non-functional requirements): the deep link minimansion://test/fast makes walks instant and spoken
// lines short and timers 30 times faster for the current run only, so that the end-to-end walkthrough fits the
// verification budget.
// It changes no rule and no save.
import type { GameState } from '../game/types';

let fast = false;

export const FAST_LINK = 'minimansion://test/fast';

export function isFastMode(): boolean {
  return fast;
}

export function applyTestingLink(url: string | null): boolean {
  if (url && url.startsWith(FAST_LINK)) {
    fast = true;
    return true;
  }
  return false;
}

// How much faster the engine's timers run than play time (PRD "Timers"). While a timed window is open (Papa away from
// his desk, Maman changing), the walkthrough has to act in it: the timers then run only FAST_WINDOW_SCALE times faster.
export const FAST_TIMER_SCALE = 30;
export const FAST_WINDOW_SCALE = 1.5;

export function windowOpen(s: GameState): boolean {
  return ['outside', 'returning', 'cooking', 'fuses'].includes(s.chars.dad) || s.chars.mom === 'changing';
}

export function timerScale(s?: GameState): number {
  if (!fast) return 1;
  return s && windowOpen(s) ? FAST_WINDOW_SCALE : FAST_TIMER_SCALE;
}

export function resetFastModeForTests(): void {
  fast = false;
}

// How long a spoken line stays on screen; it cannot be tapped away (PRD AC-49: max(2.5 s, 60 ms x length)).
export function lineDurationMs(text: string): number {
  if (fast) return 250;
  return Math.max(2500, 60 * text.length);
}
