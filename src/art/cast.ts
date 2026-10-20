// The cast: one spec per person (the hero Sam and the five inhabitants) and the sprite sets the renderer uses.
// Each inhabitant has a distinct colour and silhouette (PRD "Look, sound and feel").
import { CharacterId, Facing } from '../game/types';
import { C } from './palette';
import { drawPerson, PersonSpec, Pose } from './people';
import { PixelBuffer } from './pixels';

export const SPECS: Record<'hero' | CharacterId, PersonSpec> = {
  // Teenager from the neighbourhood: detective cap, teal hoodie, jeans, white sneakers.
  hero: { height: 40, skin: C.skin, hair: C.hairChestnut, hairStyle: 'cap', cap: C.orange, top: C.teal2, topShade: C.teal1, bottom: C.blueDark, shoes: C.white },
  // The father: tall, glasses, apron over a blue shirt.
  dad: { height: 47, skin: C.skin, hair: C.hairBrown, hairStyle: 'slick', glasses: true, top: C.blue, topShade: C.blueDark, apron: C.white, bottom: C.stone1, shoes: C.wood1 },
  // The mother: ponytail, pink top, jeans.
  mom: { height: 44, skin: C.skinShade, hair: C.hairChestnut, hairStyle: 'ponytail', top: C.pink, topShade: C.wallPinkDark, bottom: C.blue, shoes: C.white },
  // Julien: football jersey with stripes, white shorts.
  julien: { height: 40, skin: C.skin, hair: C.hairBlond, hairStyle: 'messy', top: C.green3, topShade: C.green2, stripes: C.white, bottom: C.white, shoes: C.ink },
  // Florent: spiky black hair, purple tee, dark jeans.
  florent: { height: 39, skin: C.skinDark, hair: C.hairBlack, hairStyle: 'spiky', top: C.purple, topShade: C.plum2, bottom: C.blueDark, shoes: C.red },
  // Théo: the youngest, glasses, yellow sweater, brown trousers.
  theo: { height: 36, skin: C.skin, hair: C.hairRed, hairStyle: 'messy', glasses: true, top: C.yellow, topShade: C.gold, bottom: C.wood3, shoes: C.wood1 },
};

export interface SpriteSet {
  // Standing frames: [idle, blink], talk, and the two frames of the activity pose (arms raised / standing).
  idle: PixelBuffer[];
  talk: PixelBuffer;
  activity: PixelBuffer[];
}

// The hero's frames by direction: standing + 4 walk frames. Left is drawn mirrored from right.
export interface WalkSet {
  stand: Record<'down' | 'up' | 'side', PixelBuffer>;
  walk: Record<'down' | 'up' | 'side', PixelBuffer[]>;
  talk: PixelBuffer;
}

export function walkSet(spec: PersonSpec): WalkSet {
  const dirs = ['down', 'up', 'side'] as const;
  const pose = (dir: Pose['dir'], frame: number, talk = false) => drawPerson(spec, { dir, frame, talk });
  return {
    stand: { down: pose('down', -1), up: pose('up', -1), side: pose('side', -1) },
    walk: Object.fromEntries(dirs.map((d) => [d, [0, 1, 2, 3].map((f) => pose(d, f))])) as WalkSet['walk'],
    talk: pose('down', -1, true),
  };
}

export function spriteSet(spec: PersonSpec): SpriteSet {
  const idle = drawPerson(spec, { dir: 'down', frame: -1 });
  return {
    idle: [idle, drawPerson(spec, { dir: 'down', frame: -2 })],
    talk: drawPerson(spec, { dir: 'down', frame: -1, talk: true }),
    activity: [drawPerson(spec, { dir: 'down', frame: -1, activity: true }), idle],
  };
}

// Which frame of the hero to draw, and whether to mirror it.
export function heroFrame(set: WalkSet, facing: Facing, frame: number, talking: boolean): { image: PixelBuffer; flip: boolean } {
  const dir = facing === 'left' || facing === 'right' ? 'side' : facing;
  const flip = facing === 'left';
  if (frame < 0) return { image: talking && dir === 'down' ? set.talk : set.stand[dir], flip };
  return { image: set.walk[dir][frame % 4], flip };
}

// Which frame of an inhabitant to draw at a given animation time: talking mouth, activity pose, or blinking.
export function personFrame(set: SpriteSet, id: CharacterId, opts: { talking: boolean; busy: boolean; clock: number }): PixelBuffer {
  const { talking, busy, clock } = opts;
  if (talking) return Math.floor(clock / 140) % 2 === 0 ? set.talk : set.idle[0];
  if (busy) return set.activity[Math.floor(clock / 300) % 2];
  // Blink for 150 ms every 3.2 s (each person at a different phase).
  const phase = (clock + id.length * 700) % 3200;
  return phase < 150 ? set.idle[1] : set.idle[0];
}
