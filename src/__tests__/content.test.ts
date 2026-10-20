// T-13: the story content in French and English (AC-03, AC-30, AC-45).
import { CLUES } from '../content/clues';
import { hasLine, hotspotName, itemName, line } from '../content/index';
import { allDialogueOptions } from '../game/dialogue';
import { allInputs } from '../game/explore';
import { interact, newGame } from '../game/rules';
import { SOLUTION } from '../game/solution';
import { EXITS, HOTSPOTS, ITEMS } from '../game/world';
import { DICTIONARIES, LANGUAGES } from '../i18n';
import { fr } from '../i18n/fr';
import { typographyErrors } from '../i18n/typo';
import { Strings } from '../i18n/types';

const N = ' ';

// Every text of a dictionary (functions called with sample arguments).
function texts(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value === 'function') return texts(value(...Array(value.length).fill(1)));
  if (value && typeof value === 'object') return Object.values(value).flatMap(texts);
  return [];
}

// Every line key heard along the walkthrough, trying every input in every state (refusals and looks included).
function walkthroughKeys(): { keys: Set<string>; heardBefore: Map<number, Set<string>> } {
  const keys = new Set<string>();
  const heardBefore = new Map<number, Set<string>>();
  let s = newGame();
  for (const input of SOLUTION) {
    for (const tried of allInputs(s)) for (const b of interact(s, tried).beats) if (b.type === 'say') keys.add(b.key);
    const o = interact(s, input);
    for (const b of o.beats) if (b.type === 'say') keys.add(b.key);
    for (const e of o.events) if (e.type === 'puzzle') heardBefore.set(e.puzzle, new Set(keys));
    s = o.state;
  }
  return { keys, heardBefore };
}

describe('story content in every language', () => {
  const { keys, heardBefore } = walkthroughKeys();

  it('hears a large part of the story along the walkthrough', () => {
    expect(keys.size).toBeGreaterThan(200);
  });

  it.each(LANGUAGES)('%s has every line the engine says along the walkthrough and every dialogue line', (language) => {
    const t = DICTIONARIES[language];
    const dialogue = allDialogueOptions().map((d) => d.option.label);
    const missing = [...keys, ...dialogue, 'dialogue.bye'].filter((k) => !hasLine(t, k));
    expect(missing).toEqual([]);
  });

  it.each(LANGUAGES)('%s names every hotspot, character, exit and item', (language) => {
    const t: Strings = DICTIONARIES[language];
    for (const h of HOTSPOTS) expect([h.id, hotspotName(t, h.id) !== h.id]).toEqual([h.id, true]);
    for (const c of ['dad', 'mom', 'julien', 'florent', 'theo']) expect(hotspotName(t, c)).toBeTruthy();
    for (const e of EXITS) expect([e.id, (t.story.names.exits as Record<string, string>)[e.id]]).not.toEqual([e.id, undefined]);
    for (const i of ITEMS) expect(itemName(t, i)).toBeTruthy();
  });

  it('switches the game content with the language', () => {
    expect(line(DICTIONARIES.fr, 'line.codeWrong')).toBe('Code incorrect.');
    expect(line(DICTIONARIES.en, 'line.codeWrong')).toBe('Wrong code.');
    expect(itemName(DICTIONARIES.en, 'sticks')).toBe('Drumsticks');
  });

  it('has no empty or placeholder text', () => {
    for (const language of LANGUAGES) for (const s of texts(DICTIONARIES[language])) expect([s, /TODO|\{\{|undefined/.test(s)]).toEqual([s, false]);
  });
});

describe('clues, no hint system (AC-30)', () => {
  const { heardBefore } = walkthroughKeys();

  it.each(LANGUAGES)('every clue key exists in %s', (language) => {
    const missing = Object.values(CLUES)
      .flat()
      .filter((k) => !hasLine(DICTIONARIES[language], k));
    expect(missing).toEqual([]);
  });

  it('along the walkthrough, at least one clue of each puzzle is reachable before or at its step', () => {
    for (const [puzzle, clues] of Object.entries(CLUES)) {
      const n = Number(puzzle);
      if (n === 15) continue; // optional, not on the walkthrough
      const heard = heardBefore.get(n);
      expect([n, heard !== undefined && clues.some((k) => heard.has(k))]).toEqual([n, true]);
    }
  });
});

describe('French typography and tone (AC-45)', () => {
  const frTexts = texts(DICTIONARIES.fr);

  it('uses a no-break space before : ; ! ? and inside « » everywhere', () => {
    const bad = frTexts.map((s) => [s, typographyErrors(s)] as const).filter(([, e]) => e.length > 0);
    expect(bad).toEqual([]);
  });

  it('English has no space before ! ? : and no French quotes', () => {
    const bad = texts(DICTIONARIES.en).filter((s) => /[   ][!?:;]/.test(s) || /[«»]/.test(s));
    expect(bad).toEqual([]);
  });

  it('speaks to the player with "tu" in the interface', () => {
    const { story: _story, ...ui } = DICTIONARIES.fr;
    for (const s of texts(ui)) expect([s, /\b(vous|votre|vos)\b/i.test(s)]).toEqual([s, false]);
  });

  it('matches the Player copy table of the PRD', () => {
    expect(fr.home.subtitle).toBe('Le Secret de la Maison');
    expect([fr.home.continue, fr.home.newGame, fr.home.settings, fr.home.about]).toEqual(['Continuer', 'Nouvelle partie', 'Paramètres', 'À propos']);
    expect(fr.home.confirmNew).toBe(`Effacer ta partie en cours${N}?`);
    expect([fr.common.yes, fr.common.no, fr.intro.skip]).toEqual(['Oui', 'Non', 'Passer']);
    expect(fr.intro.cards[0]).toBe(`Une rumeur court dans le quartier${N}: Papa aurait inventé une recette secrète aux pouvoirs extraordinaires…`);
    expect(fr.intro.cards[1]).toBe(`Certains disent qu'elle pourrait provoquer une catastrophe dans toute la ville${N}!`);
    expect(fr.intro.cards[2]).toBe("Sam, copain des garçons de la maison, décide d'enquêter. Discrètement.");
    expect(fr.tutorial).toEqual({
      walk: 'Touche le sol pour faire marcher Sam.',
      verbs: 'Touche un objet ou une personne pour voir ce que tu peux faire.',
      inventory: "Tes objets sont ici. Touche-en un, puis touche ce sur quoi l'utiliser.",
    });
    expect(fr.verbs).toEqual({ look: 'Regarder', take: 'Prendre', talk: 'Parler', use: 'Utiliser' });
    expect(fr.game.useWith('Perche')).toBe('Utiliser Perche avec…');
    expect(line(DICTIONARIES.fr, 'dialogue.bye')).toBe('Au revoir');
    expect([fr.notebook.title, fr.notebook.empty, fr.notebook.close]).toEqual(["Carnet d'indices", "Rien noté pour l'instant.", 'Fermer']);
    expect([fr.keypad.ok, fr.keypad.clear, fr.keypad.close]).toEqual(['Valider', 'Effacer', 'Fermer']);
    expect(fr.chess.title).toBe(`Problème de Théo${N}: les Blancs jouent et font mat en 2 coups`);
    expect(fr.chess.wrong).toBe(`Raté, les Noirs s'en sortent. On recommence${N}!`);
    expect(fr.chess.solved).toBe(`Échec et mat${N}!`);
    expect([fr.chess.reset, fr.chess.close]).toEqual(['Recommencer', 'Fermer']);
    expect(line(DICTIONARIES.fr, 'line.captureAgain')).toBe(`Encore toi${N}?! Allez, à la cave${N}!`);
    expect(line(DICTIONARIES.fr, 'line.codeUnknown')).toBe('Je ne connais pas le code. Inutile de taper au hasard.');
    expect([fr.pause.resume, fr.pause.settings, fr.pause.home]).toEqual(['Reprendre', 'Paramètres', 'Menu principal']);
    expect(fr.ending.title).toBe('Fin');
    expect(fr.ending.time(3, '12')).toBe(`Temps de jeu${N}: 3${N}h${N}12`);
    expect(fr.ending.captures(2)).toBe(`Captures${N}: 2`);
    expect(fr.ending.home).toBe('Menu principal');
    expect([fr.settings.sfx, fr.settings.music, fr.settings.telemetry, fr.settings.language, fr.settings.languageAuto, fr.settings.erase]).toEqual([
      'Bruitages',
      'Musique',
      'Partager des statistiques anonymes',
      'Langue',
      'Automatique (langue du téléphone)',
      'Effacer la partie',
    ]);
    expect(fr.settings.confirmErase).toBe(`Effacer ta partie${N}? Tu recommenceras depuis le début.`);
    expect([fr.about.storyTitle, fr.about.authorTitle, fr.about.dataTitle]).toEqual(["L'histoire de ce jeu", "Un mot de l'auteur", 'Tes données']);
    expect(fr.about.story[0]).toBe(
      `Enfant, je passais des heures à fouiller chaque pièce du manoir de Maniac Mansion, chez une famille complètement folle. Cette fois, j'ai voulu que le manoir soit une vraie maison${N}: la mienne, transformée en pixel art, avec ses habitants loufoques et un secret bien gardé.`,
    );
    expect(Object.values(fr.story.names.items)).toEqual([
      'Clé de la maison',
      'Perche',
      'Rallonge',
      'Perche rallongée',
      'Baguettes',
      'Dame blanche',
      "Livret du Rubik's Cube",
      'Joint torique',
      'Clé à molette',
      'Pince',
      'Lessive',
      'Dissolvant',
      'Clé ancienne',
      'Photo du gâteau',
      'Fragment de recette',
      'Mot de Papa',
      'Barre de fer',
    ]);
  });

  it('matches the English column of the Player copy table', () => {
    const en = DICTIONARIES.en;
    expect([en.home.subtitle, en.home.newGame, en.home.confirmNew]).toEqual(['The House Secret', 'New game', 'Erase your current game?']);
    expect([en.ending.title, en.ending.time(3, '12'), en.ending.captures(2)]).toEqual(['The End', 'Play time: 3 h 12', 'Times caught: 2']);
    expect(en.chess.title).toBe("Théo's problem: White to play and mate in 2");
    expect(Object.values(en.story.names.items)).toEqual([
      'House key',
      'Pole',
      'Extension',
      'Extended pole',
      'Drumsticks',
      'White queen',
      "Rubik's Cube booklet",
      'O-ring',
      'Adjustable wrench',
      'Pliers',
      'Detergent',
      'Paint thinner',
      'Old key',
      'Cake photo',
      'Recipe scrap',
      "Papa's note",
      'Iron bar',
    ]);
  });
});
