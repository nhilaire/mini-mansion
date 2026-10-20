// A pixel-art picture filling the screen behind menus (the house at dusk, or a place), crisp and centred.
import { Canvas, FilterMode, Group, Image, MipmapMode, Rect, SkImage } from '@shopify/react-native-skia';
import { StyleSheet, useWindowDimensions } from 'react-native';

import { GameState } from '../game/types';
import { SCENE_H, SCENE_W } from '../game/world';
import { houseImage, placeImage } from './images';

const SAMPLING = { filter: FilterMode.Nearest, mipmap: MipmapMode.None } as const;

export function Backdrop({ place, dim = 0 }: { place?: GameState; dim?: number }) {
  const { width, height } = useWindowDimensions();
  const image: SkImage | null = place ? placeImage(place) : houseImage();
  // Cover the screen (the scene is cropped rather than letterboxed).
  const scale = Math.max(width / SCENE_W, height / SCENE_H);
  const x = (width - SCENE_W * scale) / 2;
  const y = (height - SCENE_H * scale) / 2;
  return (
    <Canvas style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      <Group transform={[{ translateX: x }, { translateY: y }, { scale }]}>
        {image && <Image image={image} x={0} y={0} width={SCENE_W} height={SCENE_H} sampling={SAMPLING} />}
      </Group>
      {dim > 0 && <Rect x={0} y={0} width={width} height={height} color={`rgba(0,0,0,${dim})`} />}
    </Canvas>
  );
}
