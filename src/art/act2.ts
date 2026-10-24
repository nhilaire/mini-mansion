// Act II sprites for the outside views (PRD "Cutscenes"): the delivery van and its driver, Maman soaked by the hose,
// Florent riding his bike. Drawn once, cached.
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
    };
  }
  return cache[view] ?? [];
}

// The place shown by an outside view: the dark view is the place where Charlie is.
export function viewPlace(view: ViewId): 'front' | 'kitchen' | 'garden' | null {
  switch (view) {
    case 'door':
    case 'delivery':
    case 'ride':
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
