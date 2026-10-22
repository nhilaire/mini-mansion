// Every player-facing string lives in a dictionary, French first (the reference, "tu"). Components never inline text:
// they read `t` from useI18n(). The story (lines, names, notebook, documents) is in src/content/<lang>.ts and is part
// of the dictionary, so every language must provide every key. Written with plain spaces where typo() is applied.
import { story } from '../content/fr';
import { NBSP } from './format';
import { typo } from './typo';

export const fr = {
  consent: {
    title: 'Ta vie privée',
    body:
      "On aimerait mesurer de façon anonyme l'utilisation du jeu et détecter les plantages afin de l'améliorer. " +
      "Aucune donnée personnelle n'est collectée et rien n'est utilisé à des fins publicitaires.",
    accept: 'Accepter',
    refuse: 'Refuser',
    footnote: "Tu pourras changer d'avis à tout moment dans les paramètres.",
  },
  home: {
    subtitle: 'Le Secret de la Maison',
    continue: 'Continuer',
    newGame: 'Nouvelle partie',
    settings: 'Paramètres',
    about: 'À propos',
    confirmNew: typo('Effacer ta partie en cours ?'),
  },
  common: { yes: 'Oui', no: 'Non' },
  intro: {
    skip: 'Passer',
    next: 'Suite',
    cards: [
      typo("Une rumeur court à l'école : dans une maison du quartier, quelqu'un aurait inventé une recette secrète aux pouvoirs extraordinaires…"),
      typo("Certains disent qu'elle pourrait provoquer une catastrophe dans toute la ville !"),
      "Sam l'a entendue dans la cour de récré et a décidé de mener l'enquête.",
      typo('Ton objectif : trouver où se cache cette fameuse recette, et découvrir ce qu\'elle est vraiment. Elle est quelque part dans cette maison…'),
      typo("Mais la famille n'aime pas les intrus. Observe, fais diversion pour éloigner les habitants… et si tu te fais attraper, direction la cave !"),
    ],
  },
  tutorial: {
    walk: 'Touche le sol pour faire marcher Sam.',
    verbs: 'Touche un objet ou une personne pour voir ce que tu peux faire.',
    inventory: "Tes objets sont ici. Touche-en un, puis touche ce sur quoi l'utiliser.",
  },
  verbs: { look: 'Regarder', take: 'Prendre', listen: 'Écouter', use: 'Utiliser' },
  game: {
    useWith: (item: string) => `Utiliser ${item} avec…`,
    menu: 'Menu',
    notebook: "Carnet d'indices",
    cancel: 'Fermer le menu',
    tapToContinue: 'Touche pour continuer',
    morePage: "Autres objets",
    newNote: typo('Noté dans le carnet !'),
  },
  notebook: { title: "Carnet d'indices", empty: "Rien noté pour l'instant.", close: 'Fermer' },
  keypad: { computer: "L'ordinateur de Papa", safe: 'Le coffre-fort', lab: 'La porte du labo', ok: 'Valider', clear: 'Effacer', close: 'Fermer' },
  chess: {
    title: typo('Problème de Théo : les Blancs jouent et font mat en 2 coups'),
    wrong: typo('Raté, les Noirs s\'en sortent. On recommence !'),
    solved: typo('Échec et mat !'),
    reset: 'Recommencer',
    close: 'Fermer',
    // Board coordinates for accessibility labels: "Dame blanche en c4".
    pieces: { K: 'Roi blanc', Q: 'Dame blanche', R: 'Tour blanche', B: 'Fou blanc', N: 'Cavalier blanc', P: 'Pion blanc', k: 'Roi noir', q: 'Dame noire', r: 'Tour noire', b: 'Fou noir', n: 'Cavalier noir', p: 'Pion noir' },
    square: (name: string, square: string) => `${name} en ${square}`,
    empty: (square: string) => `Case ${square}`,
  },
  documents: { title: "Les documents secrets de Papa", close: 'Fermer' },
  pause: { title: 'Pause', resume: 'Reprendre', settings: 'Paramètres', home: 'Menu principal' },
  ending: {
    title: 'Fin',
    time: (h: number, mm: string) => typo(`Temps de jeu : ${h}${NBSP}h${NBSP}${mm}`),
    captures: (n: number) => typo(`Captures : ${n}`),
    home: 'Menu principal',
  },
  // « À propos ». The story comes from the discovery brief (docs/BRIEF.md, "Story (About screen)"), quoted in the PRD.
  about: {
    title: 'À propos',
    storyTitle: "L'histoire de ce jeu",
    story: [
      typo(
        "Enfant, je passais des heures à fouiller chaque pièce du manoir de Maniac Mansion, chez une famille complètement folle. Cette fois, j'ai voulu que le manoir soit une vraie maison : la mienne, transformée en pixel art, avec ses habitants loufoques et un secret bien gardé.",
      ),
    ],
    authorTitle: "Un mot de l'auteur",
    author: [
      `Ce jeu ne sort pas d'un studio${NBSP}: il a été imaginé et programmé sur mon temps libre, par un développeur passionné, sans prétention.`,
      "Il est donc perfectible et sans doute pas exempt de bugs. Si quelque chose ne marche pas comme prévu, merci d'avance pour ton indulgence.",
    ],
    dataTitle: 'Tes données',
    data: [
      "Aucun compte, aucune publicité. Des statistiques anonymes ne sont envoyées que si tu l'as accepté, et tu peux changer d'avis dans les paramètres.",
    ],
    version: (version: string) => `Version ${version}`,
    back: 'Retour',
  },
  settings: {
    title: 'Paramètres',
    sfx: 'Bruitages',
    music: 'Musique',
    telemetry: 'Partager des statistiques anonymes',
    telemetryHelp: "Aide à corriger les bugs et à améliorer le jeu. Aucune donnée personnelle n'est envoyée.",
    language: 'Langue',
    languageAuto: 'Automatique (langue du téléphone)',
    erase: 'Effacer la partie',
    erased: 'Partie effacée.',
    confirmErase: typo('Effacer ta partie ? Tu recommenceras depuis le début.'),
    back: 'Retour',
  },
  errors: {
    title: 'Oups',
    body: 'Un problème est survenu. Relance le jeu.',
    retry: 'Réessayer',
  },
  story,
} as const;
