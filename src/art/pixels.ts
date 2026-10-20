// A tiny pixel canvas (RGBA bytes) to draw the game's art in code. Colours are 0xRRGGBB numbers; -1 is transparent.
// The RGBA buffer is handed to Skia once per image (src/render/images.ts).
export type Color = number;
export const CLEAR: Color = -1;

export class PixelBuffer {
  readonly data: Uint8Array;

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.data = new Uint8Array(w * h * 4);
  }

  set(x: number, y: number, c: Color): this {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    const i = (y * this.w + x) * 4;
    if (c < 0) {
      this.data[i] = this.data[i + 1] = this.data[i + 2] = this.data[i + 3] = 0;
      return this;
    }
    this.data[i] = (c >> 16) & 0xff;
    this.data[i + 1] = (c >> 8) & 0xff;
    this.data[i + 2] = c & 0xff;
    this.data[i + 3] = 0xff;
    return this;
  }

  // The colour at (x, y), or CLEAR when transparent or outside.
  get(x: number, y: number): Color {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return CLEAR;
    const i = (y * this.w + x) * 4;
    if (this.data[i + 3] === 0) return CLEAR;
    return (this.data[i] << 16) | (this.data[i + 1] << 8) | this.data[i + 2];
  }

  rect(x: number, y: number, w: number, h: number, c: Color): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    return this;
  }

  frame(x: number, y: number, w: number, h: number, c: Color): this {
    this.hline(x, x + w - 1, y, c).hline(x, x + w - 1, y + h - 1, c).vline(x, y, y + h - 1, c).vline(x + w - 1, y, y + h - 1, c);
    return this;
  }

  hline(x0: number, x1: number, y: number, c: Color): this {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, c);
    return this;
  }

  vline(x: number, y0: number, y1: number, c: Color): this {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, c);
    return this;
  }

  // Bresenham line.
  line(x0: number, y0: number, x1: number, y1: number, c: Color): this {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
    return this;
  }

  // Filled ellipse centred on (cx, cy).
  ellipse(cx: number, cy: number, rx: number, ry: number, c: Color): this {
    for (let y = -ry; y <= ry; y++) {
      for (let x = -rx; x <= rx; x++) {
        if ((x * x) / (rx * rx + 0.5) + (y * y) / (ry * ry + 0.5) <= 1) this.set(cx + x, cy + y, c);
      }
    }
    return this;
  }

  // Checkerboard of two colours (classic dithering for shades).
  dither(x: number, y: number, w: number, h: number, a: Color, b: Color): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, (x + i + y + j) % 2 === 0 ? a : b);
    return this;
  }

  // Vertical gradient in steps, with a dithered row between steps.
  gradient(x: number, y: number, w: number, h: number, colors: readonly Color[]): this {
    const band = h / colors.length;
    for (let j = 0; j < h; j++) {
      const k = Math.min(colors.length - 1, Math.floor(j / band));
      const edge = k < colors.length - 1 && j >= (k + 1) * band - 1;
      for (let i = 0; i < w; i++) this.set(x + i, y + j, edge && (x + i + j) % 2 === 0 ? colors[k + 1] : colors[k]);
    }
    return this;
  }

  // Copies the opaque pixels of `src` at (dx, dy), mirrored horizontally when flipX.
  blit(src: PixelBuffer, dx: number, dy: number, flipX = false): this {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const c = src.get(flipX ? src.w - 1 - x : x, y);
        if (c !== CLEAR) this.set(dx + x, dy + y, c);
      }
    }
    return this;
  }

  // Adds a 1 px outline around opaque pixels (on transparent neighbours only).
  outline(c: Color): this {
    const opaque = (x: number, y: number) => this.get(x, y) !== CLEAR;
    const marks: [number, number][] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (opaque(x, y)) continue;
        if (opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1)) marks.push([x, y]);
      }
    }
    for (const [x, y] of marks) this.set(x, y, c);
    return this;
  }

  flipped(): PixelBuffer {
    return new PixelBuffer(this.w, this.h).blit(this, 0, 0, true);
  }
}

// Small sprites written as text: one character per pixel, '.' or ' ' is transparent.
export function fromAscii(rows: readonly string[], palette: Readonly<Record<string, Color>>): PixelBuffer {
  const w = Math.max(...rows.map((r) => r.length));
  const buf = new PixelBuffer(w, rows.length);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const c = palette[ch];
      if (c === undefined) throw new Error(`fromAscii: no colour for "${ch}"`);
      buf.set(x, y, c);
    }
  });
  return buf;
}
