// Tutorial steps, play time and the ending time parts.
import { GameState, TutorialStep } from './types';

export type TutorialSignal = 'walked' | 'verbUsed' | 'itemSelected';
export type TutorialBubble = 'walk' | 'verbs' | 'inventory' | null;

// Each step is shown once, in order: walk, then verbs, then (once an item is held) the inventory.
export function advanceTutorial(s: GameState, signal: TutorialSignal): GameState {
  let step: TutorialStep = s.tutorial;
  if (step === 0 && signal === 'walked') step = 1;
  else if (step === 1 && signal === 'verbUsed') step = 2;
  else if (step === 2 && signal === 'itemSelected' && s.inventory.length > 0) step = 3;
  return step === s.tutorial ? s : { ...s, tutorial: step };
}

export function tutorialBubble(s: GameState): TutorialBubble {
  if (s.tutorial === 0) return 'walk';
  if (s.tutorial === 1) return 'verbs';
  if (s.tutorial === 2) return s.inventory.length > 0 ? 'inventory' : null;
  return null;
}

export function tutorialDone(s: GameState): boolean {
  return s.tutorial === 3;
}

// Play time only advances while the game screen is active (not paused, not in background).
export function addPlayTime(s: GameState, deltaMs: number, active: boolean): GameState {
  if (!active || deltaMs <= 0 || s.finished) return s;
  return { ...s, playMs: s.playMs + deltaMs };
}

export function durationSeconds(s: GameState): number {
  return Math.floor(s.playMs / 1000);
}

// "3 h 12": whole minutes rounded down, minutes on 2 digits, hours without padding. The dictionaries join the parts
// with each language's spaces.
export function playTimeParts(ms: number): { h: number; mm: string } {
  const minutes = Math.floor(Math.max(0, ms) / 60000);
  return { h: Math.floor(minutes / 60), mm: String(minutes % 60).padStart(2, '0') };
}
