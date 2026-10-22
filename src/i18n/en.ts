// English translation of fr.ts (same keys, enforced by the Strings type). English typography: no space before
// ": ! ?", comma as thousands separator.
import { story } from '../content/en';
import type { Strings } from './types';

export const en: Strings = {
  consent: {
    title: 'Your privacy',
    body:
      'We would like to measure how the game is used, anonymously, and detect crashes in order to improve it. ' +
      'No personal data is collected and nothing is used for advertising.',
    accept: 'Accept',
    refuse: 'Decline',
    footnote: 'You can change your mind at any time in the settings.',
  },
  home: {
    subtitle: 'The House Secret',
    continue: 'Continue',
    newGame: 'New game',
    settings: 'Settings',
    about: 'About',
    confirmNew: 'Erase your current game?',
  },
  common: { yes: 'Yes', no: 'No' },
  intro: {
    skip: 'Skip',
    next: 'Next',
    cards: [
      'A rumour is going around the school: in a house of the neighbourhood, someone has invented a secret recipe with extraordinary powers…',
      'Some say it could cause a disaster in the whole town!',
      'Sam heard it in the playground and decided to investigate.',
      'Your goal: find where this famous recipe is hidden, and what it really is. It is somewhere in this house…',
      "But the family doesn't like intruders. Watch, create distractions to lure the inhabitants away… and if you get caught, off to the cellar!",
    ],
  },
  tutorial: {
    walk: 'Tap the ground to make Sam walk.',
    verbs: 'Tap an object or a person to see what you can do.',
    inventory: 'Your items are here. Tap one, then tap what to use it on.',
  },
  verbs: { look: 'Look', take: 'Take', talk: 'Talk', use: 'Use' },
  game: {
    useWith: (item: string) => `Use ${item} with…`,
    menu: 'Menu',
    notebook: 'Clue notebook',
    cancel: 'Close the menu',
    tapToContinue: 'Tap to continue',
    morePage: 'More items',
    newNote: 'Written in the notebook!',
  },
  notebook: { title: 'Clue notebook', empty: 'Nothing noted yet.', close: 'Close' },
  keypad: { computer: "Papa's computer", safe: 'The safe', lab: 'The lab door', ok: 'OK', clear: 'Clear', close: 'Close' },
  chess: {
    title: "Théo's problem: White to play and mate in 2",
    wrong: 'Missed, Black escapes. Try again!',
    solved: 'Checkmate!',
    reset: 'Restart',
    close: 'Close',
    pieces: { K: 'White king', Q: 'White queen', R: 'White rook', B: 'White bishop', N: 'White knight', P: 'White pawn', k: 'Black king', q: 'Black queen', r: 'Black rook', b: 'Black bishop', n: 'Black knight', p: 'Black pawn' },
    square: (name: string, square: string) => `${name} on ${square}`,
    empty: (square: string) => `Square ${square}`,
  },
  documents: { title: "Papa's secret documents", close: 'Close' },
  pause: { title: 'Pause', resume: 'Resume', settings: 'Settings', home: 'Main menu' },
  ending: {
    title: 'The End',
    time: (h: number, mm: string) => `Play time: ${h} h ${mm}`,
    captures: (n: number) => `Times caught: ${n}`,
    home: 'Main menu',
  },
  about: {
    title: 'About',
    storyTitle: 'The story of this game',
    story: [
      'As a child, I spent hours searching every room of the Maniac Mansion manor, home to a completely crazy family. This time, I wanted the mansion to be a real house: mine, turned into pixel art, with its zany inhabitants and a well-kept secret.',
    ],
    authorTitle: 'A word from the author',
    author: [
      "This game does not come from a studio: it was imagined and programmed in my free time, by a passionate developer, without pretension.",
      'So it is far from perfect and probably not free of bugs. If something does not work as expected, thank you in advance for your patience.',
    ],
    dataTitle: 'Your data',
    data: [
      'No account, no ads. Anonymous statistics are only sent if you agreed, and you can change your mind in the settings.',
    ],
    version: (version: string) => `Version ${version}`,
    back: 'Back',
  },
  settings: {
    title: 'Settings',
    sfx: 'Sound effects',
    music: 'Music',
    telemetry: 'Share anonymous statistics',
    telemetryHelp: 'Helps fix bugs and improve the game. No personal data is sent.',
    language: 'Language',
    languageAuto: 'Automatic (phone language)',
    erase: 'Erase the game',
    erased: 'Game erased.',
    confirmErase: 'Erase your game? You will start again from the beginning.',
    back: 'Back',
  },
  errors: {
    title: 'Oops',
    body: 'Something went wrong. Restart the game.',
    retry: 'Try again',
  },
  story,
};
