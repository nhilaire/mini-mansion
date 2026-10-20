// Turns pixel buffers into Skia images once and caches them. Drawing code is visual only (proven by screenshots).
// Place images are decoded lazily, when a place is first shown, to keep the cold start short.
import { AlphaType, ColorType, SkImage, Skia } from '@shopify/react-native-skia';

import { SPECS, spriteSet, SpriteSet, walkSet, WalkSet } from '../art/cast';
import { itemIcon } from '../art/items';
import { PixelBuffer } from '../art/pixels';
import { paintHouse, paintRoom, roomKey } from '../art/rooms';
import { CharacterId, GameState, ItemId } from '../game/types';

export function toSkImage(buf: PixelBuffer): SkImage | null {
  const data = Skia.Data.fromBytes(buf.data);
  return Skia.Image.MakeImage({ width: buf.w, height: buf.h, alphaType: AlphaType.Unpremul, colorType: ColorType.RGBA_8888 }, data, buf.w * 4);
}

const cache = new Map<string, SkImage | null>();
const buffers = new Map<PixelBuffer, SkImage | null>();

function cached(key: string, make: () => PixelBuffer): SkImage | null {
  if (!cache.has(key)) cache.set(key, toSkImage(make()));
  return cache.get(key) ?? null;
}

export function imageOf(buf: PixelBuffer): SkImage | null {
  if (!buffers.has(buf)) buffers.set(buf, toSkImage(buf));
  return buffers.get(buf) ?? null;
}

export function placeImage(s: GameState): SkImage | null {
  return cached(`place:${roomKey(s)}`, () => paintRoom(s));
}

export function houseImage(): SkImage | null {
  return cached('house', paintHouse);
}

let hero: WalkSet | null = null;
const flipped = new Map<PixelBuffer, PixelBuffer>();
export function heroSprites(): WalkSet {
  if (!hero) hero = walkSet(SPECS.hero);
  return hero;
}
export function flippedOf(buf: PixelBuffer): PixelBuffer {
  let f = flipped.get(buf);
  if (!f) {
    f = buf.flipped();
    flipped.set(buf, f);
  }
  return f;
}

const people = new Map<CharacterId, SpriteSet>();
export function personSprites(id: CharacterId): SpriteSet {
  let s = people.get(id);
  if (!s) {
    s = spriteSet(SPECS[id]);
    people.set(id, s);
  }
  return s;
}

const icons = new Map<ItemId, PixelBuffer>();
export function itemIconBuffer(item: ItemId): PixelBuffer {
  let b = icons.get(item);
  if (!b) {
    b = itemIcon(item);
    icons.set(item, b);
  }
  return b;
}
