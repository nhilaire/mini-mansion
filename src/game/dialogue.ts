// Conversation choices with the inhabitants met in common places (Papa in the kitchen, Maman in the garden, Julien
// at the football corner). Each option has a label key, an optional condition and a script. "Au revoir" is always
// last; chosen options stay available (greyed): no choice can block progress. Florent and Théo are too busy to talk.
import { Ctx } from './ctx';
import { CharacterId, GameState } from './types';

export interface DialogueOption {
  id: string;
  // Line key of the choice text (what the hero says).
  label: string;
  when?: (s: GameState) => boolean;
  run: (c: Ctx) => void;
}

const f = (s: GameState, flag: keyof GameState['flags']) => s.flags[flag] === true;

const TREES: Record<CharacterId, DialogueOption[]> = {
  dad: [
    { id: 'dad.rumour', label: 'dad.q.rumour', run: (c) => c.say('dad', 'dad.a.rumour1').say('dad', 'dad.a.rumour2') },
    { id: 'dad.cooking', label: 'dad.q.cooking', run: (c) => c.say('dad', 'dad.a.cooking') },
    { id: 'dad.boys', label: 'dad.q.boys', run: (c) => c.say('dad', 'dad.a.boys') },
    { id: 'dad.contest', label: 'dad.q.contest', when: (s) => f(s, 'computer_read'), run: (c) => c.say('dad', 'dad.a.contest1').say('dad', 'dad.a.contest2') },
  ],
  mom: [
    { id: 'mom.hello', label: 'mom.q.hello', run: (c) => c.say('mom', 'mom.a.hello') },
    { id: 'mom.dad', label: 'mom.q.dad', run: (c) => c.say('mom', 'mom.a.dad1').say('mom', 'mom.a.dad2') },
    { id: 'mom.pool', label: 'mom.q.pool', run: (c) => c.say('mom', 'mom.a.pool') },
  ],
  julien: [
    { id: 'julien.match', label: 'julien.q.match', run: (c) => c.say('julien', 'julien.a.match1').narrator('julien.a.match2').say('julien', 'julien.a.match3') },
    { id: 'julien.pool', label: 'julien.q.pool', run: (c) => c.say('julien', 'julien.a.pool1').say('julien', 'julien.a.pool2') },
    { id: 'julien.theo', label: 'julien.q.theo', run: (c) => c.say('julien', 'julien.a.theo') },
  ],
  florent: [],
  theo: [],
};

// Busy inhabitants answer one line and open no menu.
export const BUSY_LINE: Partial<Record<CharacterId, string>> = { florent: 'line.florentBusy', theo: 'line.theoBusy' };

export const BYE = 'bye';

export interface DialogueChoice {
  id: string;
  label: string;
  seen: boolean;
}

export function dialogueOptions(s: GameState, character: CharacterId): DialogueChoice[] {
  const options = TREES[character]
    .filter((o) => !o.when || o.when(s))
    .map((o) => ({ id: o.id, label: o.label, seen: s.seen.includes(o.id) }));
  return [...options, { id: BYE, label: 'dialogue.bye', seen: false }];
}

export function findOption(s: GameState, character: CharacterId, id: string): DialogueOption | undefined {
  return TREES[character].find((o) => o.id === id && (!o.when || o.when(s)));
}

export function allDialogueOptions(): { character: CharacterId; option: DialogueOption }[] {
  return (Object.keys(TREES) as CharacterId[]).flatMap((character) => TREES[character].map((option) => ({ character, option })));
}
