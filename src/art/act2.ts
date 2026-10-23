// Act II sprites for the outside views (PRD "Cutscenes"): the delivery van and its driver, Maman soaked by the hose,
// Florent riding his bike, the jury's car and the lady in a big hat, Papa wearing his chef's hat. Drawn once, cached.
import { ViewId } from '../game/types';
import { SPECS } from './cast';
import { C } from './palette';
import { drawPerson, PersonSpec } from './people';
import { PixelBuffer } from './pixels';

export interface Extra {
  key: string;
  buf: PixelBuffer;
  // Top-left corner in scene pixels; y also orders the drawing (the feet line is y + buf.h).
  x: number;
  y: number;
}

const DRIVER: PersonSpec = { height: 44, skin: C.skinShade, hair: C.hairBlack, hairStyle: 'cap', cap: C.wood3, top: C.wood3, topShade: C.wood1, bottom: C.wood1, shoes: C.ink };
const JURY: PersonSpec = { height: 42, skin: C.skin, hair: C.hairGrey, hairStyle: 'bun', top: C.mauve, topShade: C.plum2, bottom: C.navy, shoes: C.ink, skirt: true };

function van(): PixelBuffer {
  const b = new PixelBuffer(70, 44);
  b.rect(0, 6, 50, 30, C.white).rect(50, 14, 18, 22, C.white).frame(0, 6, 50, 30, C.stone2).frame(50, 14, 18, 22, C.stone2);
  b.rect(53, 17, 12, 8, C.glass).rect(4, 20, 42, 5, C.orange).rect(6, 26, 14, 2, C.orange);
  for (const x of [12, 56]) b.ellipse(x, 37, 6, 6, C.ink).ellipse(x, 37, 3, 3, C.stone3);
  return b;
}

function parcelInHands(person: PixelBuffer): PixelBuffer {
  const b = new PixelBuffer(person.w, person.h).blit(person, 0, 0);
  return b.rect(5, 24, 14, 10, C.wood4).frame(5, 24, 14, 10, C.wood2).vline(12, 24, 33, C.mustard);
}

function soaked(person: PixelBuffer): PixelBuffer {
  const b = new PixelBuffer(person.w + 8, person.h).blit(person, 4, 0);
  for (let i = 0; i < 14; i++) b.set(2 + ((i * 7) % 28), 4 + ((i * 11) % 40), i % 2 ? C.water2 : C.glassHi);
  return b;
}

function onBike(person: PixelBuffer): PixelBuffer {
  const b = new PixelBuffer(44, 52);
  b.blit(person, 10, 0);
  b.ellipse(8, 44, 7, 7, C.ink).ellipse(8, 44, 5, 5, C.stone3).ellipse(36, 44, 7, 7, C.ink).ellipse(36, 44, 5, 5, C.stone3);
  b.line(8, 44, 20, 34, C.red).line(20, 34, 36, 44, C.red).line(20, 34, 32, 32, C.red).rect(30, 29, 6, 2, C.ink);
  return b;
}

function bigHat(person: PixelBuffer): PixelBuffer {
  const b = new PixelBuffer(32, 56).blit(person, 4, 8);
  const top = 8 + 48 - JURY.height;
  b.rect(0, top + 2, 32, 3, C.purple).rect(8, top - 6, 16, 8, C.purple).hline(8, 23, top, C.rose);
  return b;
}

function chefHat(person: PixelBuffer, height: number): PixelBuffer {
  const b = new PixelBuffer(24, 58).blit(person, 0, 10);
  const top = 10 + 48 - height;
  b.rect(5, top - 9, 14, 10, C.white).ellipse(8, top - 9, 4, 3, C.white).ellipse(16, top - 9, 4, 3, C.white).hline(5, 18, top, C.stone3);
  return b;
}

function car(): PixelBuffer {
  const b = new PixelBuffer(64, 30);
  b.rect(0, 12, 64, 12, C.red).rect(14, 2, 32, 12, C.red).rect(17, 4, 12, 8, C.glass).rect(32, 4, 11, 8, C.glass).frame(0, 12, 64, 12, C.redDark);
  for (const x of [13, 51]) b.ellipse(x, 24, 5, 5, C.ink).ellipse(x, 24, 2, 2, C.stone3);
  return b;
}

const front = (spec: PersonSpec) => drawPerson(spec, { dir: 'down', frame: -1 });
const side = (spec: PersonSpec) => drawPerson(spec, { dir: 'side', frame: 1 });

let cache: Partial<Record<ViewId, Extra[]>> | null = null;

// The extra sprites of an outside view (none for the front door, kitchen and power cut views).
export function viewExtras(view: ViewId): Extra[] {
  if (!cache) {
    cache = {
      delivery: [
        { key: 'van', buf: van(), x: 214, y: 74 },
        { key: 'driver', buf: parcelInHands(front(DRIVER)), x: 180, y: 70 },
      ],
      hose: [{ key: 'mom', buf: soaked(drawPerson(SPECS.mom, { dir: 'down', frame: -1, talk: true })), x: 116, y: 66 }],
      ride: [{ key: 'florent', buf: onBike(side(SPECS.florent)), x: 200, y: 66 }],
      jury: [
        { key: 'car', buf: car(), x: 240, y: 90 },
        { key: 'jury', buf: bigHat(front(JURY)), x: 196, y: 62 },
        { key: 'dad', buf: chefHat(front(SPECS.dad), SPECS.dad.height), x: 150, y: 60 },
      ],
    };
  }
  return cache[view] ?? [];
}

// The place shown by an outside view: the dark view is the place where Sam is.
export function viewPlace(view: ViewId): 'front' | 'kitchen' | 'garden' | null {
  switch (view) {
    case 'door':
    case 'delivery':
    case 'ride':
    case 'jury':
      return 'front';
    case 'kitchen':
      return 'kitchen';
    case 'garden':
    case 'hose':
      return 'garden';
    case 'dark':
      return null;
  }
}
