/**
 * Palette-indexed sprite sheets for canvas pixel art, and a low-res buffer that is drawn at a
 * logical pixel size and blitted at a whole-number scale, so pixels stay square and crisp.
 * Framework-free. The canvas helpers are browser only: call them from effects.
 */

export interface SpriteSheet {
  /** Frame width in logical pixels. */
  w: number;
  /** Frame height in logical pixels. */
  h: number;
  /** One palette index per pixel, row by row. Index 0 is transparent. */
  frames: Uint8Array[];
  /** CSS colors by index. Entry 0 is unused (transparent). */
  palette: readonly string[];
}

/**
 * Builds a sheet from character maps, the same authoring format as the pixel icons: one string
 * per row, one character per pixel, `.` for transparent. `colors` maps each character to a CSS
 * color, and its key order becomes the palette order (starting at index 1).
 */
export function spriteSheet(frames: readonly (readonly string[])[], colors: Readonly<Record<string, string>>): SpriteSheet {
  const keys = Object.keys(colors);
  const h = frames[0]?.length ?? 0;
  const w = frames[0]?.[0]?.length ?? 0;
  return {
    w,
    h,
    palette: ["transparent", ...keys.map((key) => colors[key])],
    frames: frames.map((rows) => {
      const data = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) {
        const row = rows[y] ?? "";
        for (let x = 0; x < w; x++) data[y * w + x] = keys.indexOf(row[x] ?? ".") + 1;
      }
      return data;
    }),
  };
}

export interface DrawSpriteOptions {
  /** Mirror the frame horizontally. */
  flip?: boolean;
  /** Palette to use instead of the sheet's, e.g. a recolored vest. Same indices. */
  palette?: readonly string[];
}

/**
 * Draws one frame at a whole-pixel position (x and y are rounded, so sprites never land between
 * pixels). Horizontal runs of one color are filled as a single rect.
 */
export function drawSprite(ctx: CanvasRenderingContext2D, sheet: SpriteSheet, frame: number, x: number, y: number, options: DrawSpriteOptions = {}) {
  const data = sheet.frames[((frame % sheet.frames.length) + sheet.frames.length) % sheet.frames.length];
  if (!data) return;
  const palette = options.palette ?? sheet.palette;
  const { w, h } = sheet;
  const ox = Math.round(x);
  const oy = Math.round(y);
  let fill = "";
  for (let row = 0; row < h; row++) {
    let col = 0;
    while (col < w) {
      const index = data[row * w + (options.flip ? w - 1 - col : col)];
      if (!index) {
        col++;
        continue;
      }
      let run = 1;
      while (col + run < w && data[row * w + (options.flip ? w - 1 - col - run : col + run)] === index) run++;
      const color = palette[index] ?? sheet.palette[index];
      if (color !== fill) {
        fill = color;
        ctx.fillStyle = color;
      }
      ctx.fillRect(ox + col, oy + row, run, 1);
      col += run;
    }
  }
}

export interface PixelBuffer {
  /** Offscreen canvas at the logical size. Draw sprites here. */
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
}

/** An offscreen canvas at a logical pixel size. Returns null when 2D canvas is unavailable. */
export function createPixelBuffer(width: number, height: number): PixelBuffer | null {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx, width, height };
}

/** The largest whole-number scale at which a logical size fits the target (at least 1). */
export function integerScale(logicalWidth: number, logicalHeight: number, targetWidth: number, targetHeight: number, max = Infinity) {
  return Math.max(1, Math.min(max, Math.floor(Math.min(targetWidth / logicalWidth, targetHeight / logicalHeight))));
}

export interface BlitOptions {
  /** Scale to use instead of the largest that fits. Rounded to a whole number. */
  scale?: number;
  /** Horizontal anchor inside the target, 0 (left) to 1 (right). @default 0.5 */
  alignX?: number;
  /** Vertical anchor inside the target, 0 (top) to 1 (bottom). @default 0.5 */
  alignY?: number;
}

/**
 * Draws a pixel buffer onto a canvas context at a whole-number scale with smoothing off.
 * `targetWidth` and `targetHeight` are in the context's own pixels (device pixels for a canvas
 * sized by the shared canvas loop). Returns the scale and offset used, for pointer mapping.
 */
export function blitPixelBuffer(ctx: CanvasRenderingContext2D, buffer: PixelBuffer, targetWidth: number, targetHeight: number, options: BlitOptions = {}) {
  const scale = Math.max(1, Math.round(options.scale ?? integerScale(buffer.width, buffer.height, targetWidth, targetHeight)));
  const width = buffer.width * scale;
  const height = buffer.height * scale;
  const x = Math.round((targetWidth - width) * (options.alignX ?? 0.5));
  const y = Math.round((targetHeight - height) * (options.alignY ?? 0.5));
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buffer.canvas, 0, 0, buffer.width, buffer.height, x, y, width, height);
  return { scale, x, y, width, height };
}

/**
 * Sizes a visible canvas to a logical pixel size and scales it with CSS by a whole number, for
 * scenes that draw straight to the canvas without a separate buffer. Returns the scale.
 */
export function fitPixelCanvas(canvas: HTMLCanvasElement, logicalWidth: number, logicalHeight: number, scale: number) {
  const whole = Math.max(1, Math.round(scale));
  if (canvas.width !== logicalWidth) canvas.width = logicalWidth;
  if (canvas.height !== logicalHeight) canvas.height = logicalHeight;
  canvas.style.width = `${logicalWidth * whole}px`;
  canvas.style.height = `${logicalHeight * whole}px`;
  canvas.style.imageRendering = "pixelated";
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.imageSmoothingEnabled = false;
  return whole;
}
