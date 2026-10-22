// T-13: the story content in French and English (AC-03, AC-30, AC-45).
import { CLUES } from '../content/clues';
import { hasLine, hotspotName, itemName, line } from '../content/index';
import { allInputs } from '../game/explore';
import { interact, newGame, playAll } from '../game/rules';
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

  it.each(LANGUAGES)('%s has every line the engine says along the walkthrough', (language) => {
    const t = DICTIONARIES[language];
    const missing = [...keys].filter((k) => !hasLine(t, k));
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
      const heard = heardBefore.get(n);
      if (n === 15 || n === 16) continue; // not on the walkthrough (the cellar, the doorbell): checked by the explorer below
      expect([n, heard !== undefined && clues.some((k) => heard.has(k))]).toEqual([n, true]);
    }
  });
});

describe('clues of the puzzles off the walkthrough (AC-30)', () => {
  const said = (s: Parameters<typeof interact>[0], input: Parameters<typeof interact>[1]) =>
    interact(s, input).beats.flatMap((b) => (b.type === 'say' ? [b.key] : []));

  it('E16: right after E01, Papa says through his door that he opens when someone rings; the doorbell says so too', () => {
    const inside = playAll(newGame(), SOLUTION.slice(0, 2)).state;
    const corridor = interact(inside, { kind: 'exit', exit: 'hall.toCorridor' }).state;
    expect(said(corridor, { kind: 'verb', verb: 'listen', target: 'corridor0.officeDoor' })).toContain('dad.door');
    expect(said({ ...corridor, place: 'front' }, { kind: 'verb', verb: 'look', target: 'front.bell' })).toContain('front.bell.look');
    expect(CLUES[16]).toEqual(expect.arrayContaining(['dad.door', 'front.bell.look']));
  });

  it('E15: in the cellar, the hatch and the wine rack tell about the iron bar before it is needed', () => {
    const inside = playAll(newGame(), SOLUTION.slice(0, 2)).state;
    const cellar = playAll(inside, [
      { kind: 'exit', exit: 'hall.toCorridor' },
      { kind: 'exit', exit: 'corridor0.toGarage' },
      { kind: 'exit', exit: 'garage.toCellar' },
    ]).state;
    expect(cellar.place).toBe('cellar');
    expect(said(cellar, { kind: 'verb', verb: 'look', target: 'cellar.hatch' })).toContain('cellar.hatch.look');
    expect(said(cellar, { kind: 'verb', verb: 'look', target: 'cellar.rack' })).toContain('cellar.rack.look');
  });
});

describe('the rumour comes from school (AC-56)', () => {
  it.each(LANGUAGES)('in %s, the intro and N01 name nobody of the family and Sam is not a friend of the boys', (language) => {
    const t = DICTIONARIES[language];
    const texts = [...t.intro.cards, t.story.notes.n01].join(' ');
    expect(texts).toMatch(language === 'fr' ? /école/ : /school/);
    expect(texts).not.toMatch(/Papa|Maman|Julien|Florent|Théo|copain|friend/);
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

  it('speaks to the player with "tu" in the story too (vous only for Papa calling an unknown visitor, and the mail)', () => {
    const story = DICTIONARIES.fr.story;
    const allowed = ['line.dadAtDoor'];
    const lines = Object.entries(story.lines).filter(([k, s]) => !allowed.includes(k) && /\b(vous|votre|vos)\b/i.test(s));
    expect(lines).toEqual([]);
    expect(Object.values(story.notes).filter((s) => /\b(vous|votre|vos)\b/i.test(s))).toEqual([]);
    // The documents are Papa's papers: only the town hall's mail, written to him, says "votre".
    expect(story.docs.filter((s, i) => i !== 1 && /\b(vous|votre|vos)\b/i.test(s))).toEqual([]);
  });

  it('matches the Player copy table of the PRD', () => {
    expect(fr.home.subtitle).toBe('Le Secret de la Maison');
    expect([fr.home.continue, fr.home.newGame, fr.home.settings, fr.home.about]).toEqual(['Continuer', 'Nouvelle partie', 'Paramètres', 'À propos']);
    expect(fr.home.confirmNew).toBe(`Effacer ta partie en cours${N}?`);
    expect([fr.common.yes, fr.common.no, fr.intro.skip]).toEqual(['Oui', 'Non', 'Passer']);
    expect(fr.intro.cards[0]).toBe(`Une rumeur court à l'école${N}: dans une maison du quartier, quelqu'un aurait inventé une recette secrète aux pouvoirs extraordinaires…`);
    expect(fr.intro.cards[1]).toBe(`Certains disent qu'elle pourrait provoquer une catastrophe dans toute la ville${N}!`);
    expect(fr.intro.cards[2]).toBe("Sam l'a entendue dans la cour de récré et a décidé de mener l'enquête.");
    expect(fr.intro.cards[3]).toBe(`Ton objectif${N}: trouver où se cache cette fameuse recette, et découvrir ce qu'elle est vraiment. Elle est quelque part dans cette maison…`);
    expect(fr.intro.cards[4]).toBe(`Mais la famille n'aime pas les intrus. Observe, fais diversion pour éloigner les habitants… et si tu te fais attraper, direction la cave${N}!`);
    expect(fr.tutorial).toEqual({
      walk: 'Touche le sol pour faire marcher Sam.',
      verbs: 'Touche un objet ou une personne pour voir ce que tu peux faire.',
      inventory: "Tes objets sont ici. Touche-en un, puis touche ce sur quoi l'utiliser.",
    });
    expect(fr.verbs).toEqual({ look: 'Regarder', take: 'Prendre', listen: 'Écouter', use: 'Utiliser' });
    expect(fr.game.useWith('Perche')).toBe('Utiliser Perche avec…');
    expect(hasLine(DICTIONARIES.fr, 'dialogue.bye')).toBe(false);
    expect([fr.notebook.title, fr.notebook.empty, fr.notebook.close]).toEqual(["Carnet d'indices", "Rien noté pour l'instant.", 'Fermer']);
    expect([fr.keypad.ok, fr.keypad.clear, fr.keypad.close]).toEqual(['Valider', 'Effacer', 'Fermer']);
    expect(fr.chess.title).toBe(`Problème de Théo${N}: les Blancs jouent et font mat en 2 coups`);
    expect(fr.chess.wrong).toBe(`Raté, les Noirs s'en sortent. On recommence${N}!`);
    expect(fr.chess.solved).toBe(`Échec et mat${N}!`);
    expect([fr.chess.reset, fr.chess.close]).toEqual(['Recommencer', 'Fermer']);
    expect(line(DICTIONARIES.fr, 'line.captureAgain')).toBe(`Encore toi${N}?! Allez, à la cave${N}!`);
    expect(line(DICTIONARIES.fr, 'line.codeUnknown')).toBe('Je ne connais pas le code. Inutile de taper au hasard.');
    expect(line(DICTIONARIES.fr, 'capture.keep')).toBe(`Ne t'échappe pas${N}!`);
    expect(fr.keypad.lab).toBe('La porte du labo');
    expect(line(DICTIONARIES.fr, 'line.dadAnswer')).toBe(`Qui sonne à cette heure-là${N}? Oui, deux minutes, j'arrive${N}!`);
    expect(line(DICTIONARIES.fr, 'line.dadAtDoor')).toBe(`Il y a quelqu'un${N}? Qui est là${N}? Je dois vous chercher${N}?`);
    expect(line(DICTIONARIES.fr, 'line.dadGoingBack')).toBe('Bon, je ne vois personne, je rentre.');
    expect(line(DICTIONARIES.fr, 'line.showerLoose')).toBe(`Le joint n'est pas serré${N}: ça fuit de partout.`);
    expect(line(DICTIONARIES.fr, 'parents.shower.look')).toBe('Il manque un joint.');
    expect(line(DICTIONARIES.fr, 'line.theoMono1')).toBe(`Comment se fait-il que mon Rubik's Cube se soit résolu tout seul${N}? Il y en a, des mystères ici.`);
    expect(line(DICTIONARIES.fr, 'line.theoMono2')).toBe(`C'est comme ce passage secret du grenier${N}: je suis sûr qu'il existe, mais je n'ai jamais réussi à le découvrir…`);
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
      'Clé du portail',
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
      'Lait de riz',
      'Farine de châtaigne',
      'Farine de riz',
    ]);
  });

  it('matches the English column of the Player copy table', () => {
    const en = DICTIONARIES.en;
    expect([en.home.subtitle, en.home.newGame, en.home.confirmNew]).toEqual(['The House Secret', 'New game', 'Erase your current game?']);
    expect([en.ending.title, en.ending.time(3, '12'), en.ending.captures(2)]).toEqual(['The End', 'Play time: 3 h 12', 'Times caught: 2']);
    expect(en.chess.title).toBe("Théo's problem: White to play and mate in 2");
    expect(Object.values(en.story.names.items)).toEqual([
      'House key',
      'Gate key',
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
      'Rice milk',
      'Chestnut flour',
      'Rice flour',
    ]);
    expect(en.intro.cards[2]).toBe('Sam heard it in the playground and decided to investigate.');
    expect(en.intro.cards[3]).toBe('Your goal: find where this famous recipe is hidden, and what it really is. It is somewhere in this house…');
    expect(en.intro.cards[4]).toBe("But the family doesn't like intruders. Watch, create distractions to lure the inhabitants away… and if you get caught, off to the cellar!");
    expect([en.home.continue, en.home.settings, en.home.about, en.common.yes, en.common.no, en.intro.skip]).toEqual(['Continue', 'Settings', 'About', 'Yes', 'No', 'Skip']);
    expect(en.intro.cards[0]).toBe('A rumour is going around the school: in a house of the neighbourhood, someone has invented a secret recipe with extraordinary powers…');
    expect(en.intro.cards[1]).toBe('Some say it could cause a disaster in the whole town!');
    expect(en.tutorial).toEqual({
      walk: 'Tap the ground to make Sam walk.',
      verbs: 'Tap an object or a person to see what you can do.',
      inventory: 'Your items are here. Tap one, then tap what to use it on.',
    });
    expect(en.verbs).toEqual({ look: 'Look', take: 'Take', listen: 'Listen', use: 'Use' });
    expect(en.game.useWith('Pole')).toBe('Use Pole with…');
    expect([en.notebook.title, en.notebook.empty, en.notebook.close]).toEqual(['Clue notebook', 'Nothing noted yet.', 'Close']);
    expect([en.keypad.ok, en.keypad.clear, en.keypad.close]).toEqual(['OK', 'Clear', 'Close']);
    expect([en.chess.wrong, en.chess.solved, en.chess.reset, en.chess.close]).toEqual(['Missed, Black escapes. Try again!', 'Checkmate!', 'Restart', 'Close']);
    expect(line(en, 'line.captureAgain')).toBe('You again?! Off to the cellar!');
    expect(line(en, 'capture.keep')).toBe("Don't you run away!");
    expect(line(en, 'line.codeUnknown')).toBe("I don't know the code. No point typing at random.");
    expect(line(en, 'line.dadAnswer')).toBe("Who's ringing at this hour? Yes, two minutes, I'm coming!");
    expect(line(en, 'line.dadAtDoor')).toBe('Anybody there? Who is it? Do I have to come and look for you?');
    expect(line(en, 'line.dadGoingBack')).toBe("Well, I can't see anybody, I'm going back in.");
    expect(line(en, 'line.showerLoose')).toBe("The seal isn't tightened: it leaks everywhere.");
    expect(line(en, 'parents.shower.look')).toBe('A seal is missing.');
    expect(line(en, 'line.theoMono1')).toBe("How come my Rubik's Cube solved itself? There are mysteries in this house.");
    expect(line(en, 'line.theoMono2')).toBe("Like that secret passage in the attic: I'm sure it exists, but I've never managed to find it…");
    expect([en.pause.resume, en.pause.settings, en.pause.home, en.ending.home]).toEqual(['Resume', 'Settings', 'Main menu', 'Main menu']);
    expect([en.settings.sfx, en.settings.music, en.settings.telemetry, en.settings.language, en.settings.languageAuto, en.settings.erase]).toEqual([
      'Sound effects',
      'Music',
      'Share anonymous statistics',
      'Language',
      'Automatic (phone language)',
      'Erase the game',
    ]);
    expect(en.settings.confirmErase).toBe('Erase your game? You will start again from the beginning.');
    expect([en.about.storyTitle, en.about.authorTitle, en.about.dataTitle]).toEqual(['The story of this game', 'A word from the author', 'Your data']);
    expect(en.about.story[0]).toBe(
      'As a child, I spent hours searching every room of the Maniac Mansion manor, home to a completely crazy family. This time, I wanted the mansion to be a real house: mine, turned into pixel art, with its zany inhabitants and a well-kept secret.',
    );
    expect(en.keypad.lab).toBe('The lab door');
  });
});
