// Conversation choices with Julien at the football corner, the only inhabitant Sam can chat with (Papa and Maman
// catch Sam instead). Each option has a label key, an optional condition and a script. "Au revoir" is always last;
// chosen options stay available (greyed): no choice can block progress. Florent and Théo are too busy to talk.
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
  dad: [],
  mom: [],
  julien: [
    { id: 'julien.ball', label: 'julien.q.ball', run: (c) => c.say('julien', 'julien.a.ball1').narrator('julien.a.ball2').say('julien', 'julien.a.ball3') },
    { id: 'julien.family', label: 'julien.q.family', run: (c) => c.say('julien', 'julien.a.family1').say('julien', 'julien.a.family2') },
    { id: 'julien.pool', label: 'julien.q.pool', when: (s) => !f(s, 'thinner_taken'), run: (c) => c.say('julien', 'julien.a.pool1').say('julien', 'julien.a.pool2') },
    { id: 'julien.attic', label: 'julien.q.attic', when: (s) => f(s, 'theo_back'), run: (c) => c.say('julien', 'julien.a.attic') },
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
