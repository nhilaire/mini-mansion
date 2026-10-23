// Dusk palette of the house (matches src/art/palette.ts) and a retro, square UI.
import { Speaker } from '../game/types';

export const colors = {
  background: '#1c1d40',
  surface: '#2e3070',
  panel: 'rgba(20, 20, 46, 0.93)',
  text: '#f4ecd8',
  muted: '#a0a4c4',
  accent: '#d4a23a',
  accentText: '#120e18',
  border: '#8e6a22',
  danger: '#c0303c',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 } as const;

export const font = { title: 30, heading: 22, body: 16, small: 13, family: 'monospace' } as const;

// Speaker colours of the line banner (the colour of each inhabitant's clothes).
export const speakerColors: Record<Speaker, string> = {
  hero: '#f4ecd8',
  narrator: '#9ab8d8',
  dad: '#8ab0ff',
  mom: '#f0a0b8',
  julien: '#8ad08c',
  florent: '#c8a0f0',
  theo: '#f0d060',
  driver: '#d8c8a0',
};
