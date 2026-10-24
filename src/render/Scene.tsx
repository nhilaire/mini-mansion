// The Skia scene: the place, the inhabitants, Charlie and the inventory band, in logical pixels scaled with
// nearest-neighbour sampling (crisp pixel art). Visual only: proven by Maestro screenshots.
import { Canvas, FilterMode, Group, Image, MipmapMode, Rect, SkImage } from '@shopify/react-native-skia';
import { memo } from 'react';
import { StyleSheet } from 'react-native';

import { Extra } from '../art/act2';
import { heroFrame, personFrame } from '../art/cast';
import { C } from '../art/palette';
import { PixelBuffer } from '../art/pixels';
import { CharacterId, Facing, GameState, ItemId, Point, Speaker } from '../game/types';
import { charactersIn, inventoryPage, MENU_BUTTON, NOTEBOOK_BUTTON, SceneTransform, slotRect, SLOTS } from '../game/world';
import { flippedOf, heroSprites, imageOf, itemIconBuffer, personSprites, placeImage } from './images';

const SAMPLING = { filter: FilterMode.Nearest, mipmap: MipmapMode.None } as const;
const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

export interface HeroPose {
  pos: Point;
  facing: Facing;
  frame: number;
}

interface Props {
  state: GameState;
  hero: HeroPose;
  transform: SceneTransform;
  width: number;
  height: number;
  speaker: Speaker | null;
  selected: ItemId | null;
  page: number;
  unread: boolean;
  // Animation clock in ms (blinks, talking mouths, activities).
  clock: number;
  // Inhabitants standing around Charlie for a scene (the adult of a capture, the family at the end).
  guests?: readonly CharacterId[];
  // Extra sprites of an outside view (the delivery van, the jury...).
  extras?: readonly Extra[];
}

function Sprite({ buf, x, y }: { buf: PixelBuffer; x: number; y: number }) {
  const image = imageOf(buf);
  if (!image) return null;
  return <Image image={image} x={Math.round(x)} y={Math.round(y)} width={buf.w} height={buf.h} sampling={SAMPLING} />;
}

function Full({ image }: { image: SkImage | null }) {
  if (!image) return null;
  return <Image image={image} x={0} y={0} width={image.width()} height={image.height()} sampling={SAMPLING} />;
}

// The last inventory slot turns the page when more items are held than fit: a gold frame, a big arrow pointing to
// the next page and one dot per page (the current one lit).
function MoreButton({ page, pages }: { page: number; pages: number }) {
  const r = slotRect(SLOTS - 1);
  const dots = Array.from({ length: pages }, (_, i) => i);
  return (
    <Group>
      <Rect x={r.x} y={r.y} width={r.w} height={r.h} color={hex(C.gold)} />
      <Rect x={r.x + 1} y={r.y + 1} width={r.w - 2} height={r.h - 2} color={hex(C.wood1)} />
      {Array.from({ length: 8 }, (_, i) => (
        <Rect key={i} x={r.x + 8 + i} y={r.y + 3 + i} width={1} height={14 - 2 * i} color={hex(C.gold)} />
      ))}
      {dots.map((d) => (
        <Rect key={`dot${d}`} x={r.x + r.w / 2 - pages * 2 + d * 4 + 1} y={r.y + r.h - 5} width={2} height={2} color={hex(d === page ? C.yellow : C.stone2)} />
      ))}
    </Group>
  );
}

function SceneView({ state, hero, transform, width, height, speaker, selected, page, unread, clock, guests = [], extras = [] }: Props) {
  const placed = charactersIn(state).filter((c) => !guests.includes(c.id));
  const people: { key: string; y: number; buf: PixelBuffer; x: number; top: number }[] = placed.map((c) => ({
    key: c.id,
    y: c.pos.y,
    buf: personFrame(personSprites(c.id), c.id, { talking: speaker === c.id, busy: c.busy, clock }),
    x: c.pos.x - 12,
    top: c.pos.y - 48,
  }));
  const frame = heroFrame(heroSprites(), hero.facing, hero.frame, speaker === 'hero' && Math.floor(clock / 140) % 2 === 0);
  const heroBuf = frame.flip ? flippedOf(frame.image) : frame.image;
  // Guests stand on both sides of Charlie, the first one on the side with more room.
  const side = hero.pos.x > 160 ? -1 : 1;
  guests.forEach((g, i) => {
    const step = Math.floor(i / 2) + 1;
    const dir = i % 2 === 0 ? side : -side;
    const gx = Math.max(14, Math.min(306, hero.pos.x + dir * step * 26));
    const gy = hero.pos.y + (i % 2 === 0 ? 0 : 3);
    people.push({ key: g, y: gy, buf: personFrame(personSprites(g), g, { talking: speaker === g, busy: false, clock }), x: gx - 12, top: gy - 48 });
  });
  for (const e of extras) people.push({ key: `extra-${e.key}`, y: e.y + e.buf.h, buf: e.buf, x: e.x, top: e.y });
  const drawables = [...people, { key: 'hero', y: hero.pos.y, buf: heroBuf, x: hero.pos.x - 12, top: hero.pos.y - 48 }].sort((a, b) => a.y - b.y);
  const inv = inventoryPage(state.inventory, page);
  const n = NOTEBOOK_BUTTON;
  const m = MENU_BUTTON;

  return (
    <Canvas style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height} color="#000000" />
      <Group transform={[{ translateX: transform.offsetX }, { translateY: transform.offsetY }, { scale: transform.scale }]}>
        <Full image={placeImage(state)} />
        {drawables.map((d) => (
          <Sprite key={d.key} buf={d.buf} x={d.x} y={d.top} />
        ))}
        {inv.items.map((item, i) => {
          const r = slotRect(i);
          return (
            <Group key={item}>
              {selected === item && <Rect x={r.x - 1} y={r.y - 1} width={r.w + 2} height={r.h + 2} color={hex(C.gold)} />}
              {selected === item && <Rect x={r.x} y={r.y} width={r.w} height={r.h} color={hex(C.wood2)} />}
              <Sprite buf={itemIconBuffer(item)} x={r.x + 4} y={r.y + 4} />
            </Group>
          );
        })}
        {inv.pages > 1 && <MoreButton page={inv.page} pages={inv.pages} />}
        {unread && <Rect x={n.x + n.w - 6} y={n.y + 1} width={5} height={5} color={hex(C.yellow)} />}
        <Rect x={m.x + 5} y={m.y + 6} width={14} height={2} color={hex(C.gold)} />
        <Rect x={m.x + 5} y={m.y + 11} width={14} height={2} color={hex(C.gold)} />
        <Rect x={m.x + 5} y={m.y + 16} width={14} height={2} color={hex(C.gold)} />
      </Group>
    </Canvas>
  );
}

export const Scene = memo(SceneView);
