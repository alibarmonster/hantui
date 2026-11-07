export type Vec3 = [r: number, g: number, b: number];

/**
 * Parses #rgb, #rrggbb or #rrggbbaa (alpha is ignored) into 0–255 channels.
 * Anything else falls back to black, so a typo never crashes a shader.
 */
export function hexToRgb(hex: string): Vec3 {
  let value = hex.trim().replace(/^#/, "");
  if (value.length === 3 || value.length === 4) value = [...value.slice(0, 3)].map((c) => c + c).join("");
  if (!/^[\da-f]{6}([\da-f]{2})?$/i.test(value)) return [0, 0, 0];
  const n = Number.parseInt(value.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Hex color as a normalized vec3 (each channel 0–1) for shader uniforms. */
export function hexToVec3(hex: string): Vec3 {
  const [r, g, b] = hexToRgb(hex);
  return [r / 255, g / 255, b / 255];
}

/**
 * Any CSS color the browser understands (hex, rgb(), oklch(), color-mix() or a variable such as
 * `var(--primary)`) as 0–255 channels, computed in the context of `element` so theme variables
 * resolve. Hex takes a fast path; everything else is computed once per call, so cache the result
 * instead of calling this every frame. Browser only; unreadable values fall back to black.
 */
export function cssColorToRgb(color: string, element: Element): Vec3 {
  const value = color.trim();
  if (/^#[\da-f]{3,8}$/i.test(value)) return hexToRgb(value);
  // Children of a canvas still get computed styles, but a regular parent is the safer host.
  const host = element instanceof HTMLCanvasElement ? (element.parentElement ?? document.body) : element;
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;visibility:hidden";
  probe.style.color = value;
  host.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  // A 1×1 canvas turns any computed color space (oklch, color(srgb …)) into sRGB bytes.
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!ctx) return [0, 0, 0];
  ctx.fillStyle = "#000";
  ctx.fillStyle = computed;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

/** `cssColorToRgb` as a normalized vec3 (each channel 0–1) for shader uniforms. */
export function cssColorToVec3(color: string, element: Element): Vec3 {
  const [r, g, b] = cssColorToRgb(color, element);
  return [r / 255, g / 255, b / 255];
}
