// Builds the Maestro walkthrough flow from the engine's solution (src/game/solution.ts), so that the flow cannot drift
// from the rules: a Jest test compares it with .maestro/06-walkthrough.yaml (UPDATE_FLOWS=1 rewrites the file).
// The inventory band pages like the game screen does (page reset on every place change), so items beyond the
// first page are reached with the "more" slot. Waiting for a timer (the dough) waits until the screen shows that no
// timer runs any more (fast mode: timers 30 times faster).
import { interact, newGame } from '../game/rules';
import { SOLUTION } from '../game/solution';
import { GameState, Input, ItemId } from '../game/types';
import { inventoryPage } from '../game/world';
import { FAST_LINK } from './fastMode';

const APP_ID = 'io.github.nhilaire.minimansion';

const tap = (id: string) => `- tapOn:\n    id: "${id}"`;
const waitFor = (id: string, timeout = 15000) => `- extendedWaitUntil:\n    visible:\n      id: "${id}"\n    timeout: ${timeout}`;
const idle = () => waitFor('scene-idle');

// A screenshot for the README, taken once the step at this index is done.
const SCREENSHOTS: Record<number, string> = {
  [SOLUTION.findIndex((i) => i.kind === 'item' && i.item === 'queen')]: 'readme-2-game',
};

class Band {
  page = 0;

  // Taps on "more" until the item is on the current page.
  reach(state: GameState, item: ItemId): string[] {
    const taps: string[] = [];
    for (let guard = 0; guard < 5; guard++) {
      const view = inventoryPage(state.inventory, this.page);
      if (view.items.includes(item)) return taps;
      taps.push(tap('inv-more'));
      this.page = (this.page + 1) % view.pages;
    }
    throw new Error(`item ${item} not reachable in the band`);
  }
}

function stepFor(input: Input, state: GameState, band: Band): string[] {
  switch (input.kind) {
    case 'exit':
      return [tap(`exit-${input.exit}`), idle()];
    case 'verb': {
      const head = [tap(`hs-${input.target}`), tap(`verb-${input.verb}`)];
      if (input.verb === 'use' && input.target === 'living.chess') return [...head, waitFor('chess')];
      if (input.verb === 'use' && (input.target === 'office.computer' || input.target === 'parents.safe' || input.target === 'attic.door')) return [...head, waitFor('keypad')];
      return [...head, idle()];
    }
    case 'item': {
      const taps = [...band.reach(state, input.item), tap(`inv-${input.item}`)];
      if (input.target.startsWith('item:')) {
        const other = input.target.slice(5) as ItemId;
        return [...taps, ...band.reach(state, other), tap(`inv-${other}`), idle()];
      }
      return [...taps, tap(`hs-${input.target}`), idle()];
    }
    case 'keypad': {
      const typed = [...input.code.split('').map((d) => tap(`keypad-digit-${d}`)), tap('keypad-ok')];
      // The computer shows Papa's documents; the safe just opens.
      return input.keypad === 'computer' ? [...typed, waitFor('documents'), tap('documents-close'), idle()] : [...typed, idle()];
    }
    case 'chess':
      return input.moves.flatMap((m) => [tap(`chess-sq-${m.slice(0, 2)}`), tap(`chess-sq-${m.slice(2, 4)}`)]).concat(idle());
    case 'dialogue':
      return [tap(`dlg-${input.option}`), waitFor('dialogue'), tap('dlg-bye'), idle()];
    case 'wait':
      return [waitFor('timers-idle', 60000), idle()];
    case 'lookItem':
    case 'tick':
      return [];
  }
}

export function walkthroughYaml(): string {
  const band = new Band();
  let state = newGame();
  const steps: string[] = [];
  SOLUTION.forEach((input, i) => {
    const out = stepFor(input, state, band);
    // The last step leads to the ending: no idle marker after it.
    steps.push(...(i === SOLUTION.length - 1 ? out.filter((s) => s !== idle()) : out));
    const o = interact(state, input);
    if (o.beats.some((b) => b.type === 'room')) band.page = 0;
    state = o.state;
    if (SCREENSHOTS[i]) steps.push(`- takeScreenshot: ${SCREENSHOTS[i]}`);
  });
  return [
    `appId: ${APP_ID}`,
    'name: Walkthrough - the whole story from a new game to the ending (generated from src/game/solution.ts)',
    'tags:',
    '  - walkthrough',
    '---',
    '- launchApp:',
    '    clearState: true',
    tap('consent-refuse'),
    waitFor('home-screen'),
    `- openLink: "${FAST_LINK}"`,
    waitFor('home-screen'),
    tap('home-new-game'),
    tap('intro-skip'),
    idle(),
    ...steps,
    waitFor('ending-screen', 30000),
    '- assertVisible:',
    '    id: "ending-time"',
    '- assertVisible:',
    '    id: "ending-captures"',
    '- takeScreenshot: readme-3-ending',
    tap('ending-home'),
    waitFor('home-screen'),
    '- assertNotVisible:',
    '    id: "home-continue"',
    '',
  ].join('\n');
}
