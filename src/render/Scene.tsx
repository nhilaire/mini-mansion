// The Skia scene: the place, the inhabitants, Sam and the inventory band, in logical pixels scaled with
// nearest-neighbour sampling (crisp pixel art). Visual only: proven by Maestro screenshots.
import { Canvas, FilterMode, Group, Image, MipmapMode, Rect, SkImage } from '@shopify/react-native-skia';
import { memo } from 'react';
import { StyleSheet } from 'react-native';

import { heroFrame, personFrame } from '../art/cast';
import { C } from '../art/palette';
import { PixelBuffer } from '../art/pixels';
import { Facing, GameState, ItemId, Point, Speaker } from '../game/types';
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

function SceneView({ state, hero, transform, width, height, speaker, selected, page, unread, clock }: Props) {
  const people = charactersIn(state).map((c) => ({
    key: c.id,
    y: c.pos.y,
    buf: personFrame(personSprites(c.id), c.id, { talking: speaker === c.id, busy: c.busy, clock }),
    x: c.pos.x - 12,
    top: c.pos.y - 48,
  }));
  const frame = heroFrame(heroSprites(), hero.facing, hero.frame, speaker === 'hero' && Math.floor(clock / 140) % 2 === 0);
  const heroBuf = frame.flip ? flippedOf(frame.image) : frame.image;
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
        {inv.pages > 1 && (
          <Group>
            <Rect x={slotRect(SLOTS - 1).x + 8} y={slotRect(SLOTS - 1).y + 6} width={4} height={12} color={hex(C.gold)} />
            <Rect x={slotRect(SLOTS - 1).x + 12} y={slotRect(SLOTS - 1).y + 9} width={4} height={6} color={hex(C.gold)} />
          </Group>
        )}
        {unread && <Rect x={n.x + n.w - 6} y={n.y + 1} width={5} height={5} color={hex(C.yellow)} />}
        <Rect x={m.x + 5} y={m.y + 6} width={14} height={2} color={hex(C.gold)} />
        <Rect x={m.x + 5} y={m.y + 11} width={14} height={2} color={hex(C.gold)} />
        <Rect x={m.x + 5} y={m.y + 16} width={14} height={2} color={hex(C.gold)} />
      </Group>
    </Canvas>
  );
}

export const Scene = memo(SceneView);
