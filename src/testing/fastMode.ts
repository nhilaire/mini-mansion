// Testing hook (PRD non-functional requirements): the deep link minimansion://test/fast makes walks instant and spoken
// lines short for the current run only, so that the end-to-end walkthrough fits the verification budget.
// It changes no rule and no save.
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

export function resetFastModeForTests(): void {
  fast = false;
}

// How long a spoken line stays on screen without a tap (PRD: max(2 s, 50 ms x length)).
export function lineDurationMs(text: string): number {
  if (fast) return 250;
  return Math.max(2000, 50 * text.length);
}
