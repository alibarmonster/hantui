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

/**
 * Calls `onChange` when the page theme may have changed: a class or data-theme change on <html> or
 * <body> (shadcn's `.dark`, next-themes, a data-theme switch) or a change of the OS color scheme.
 * Resolved colors are cached, so re-resolve them here. Browser only; returns the unsubscribe.
 */
export function observeTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  const options = { attributes: true, attributeFilter: ["class", "data-theme"] };
  observer.observe(document.documentElement, options);
  if (document.body) observer.observe(document.body, options);
  const scheme = window.matchMedia("(prefers-color-scheme: dark)");
  scheme.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    scheme.removeEventListener("change", onChange);
  };
}

/** `cssColorToRgb` as a normalized vec3 (each channel 0–1) for shader uniforms. */
export function cssColorToVec3(color: string, element: Element): Vec3 {
  const [r, g, b] = cssColorToRgb(color, element);
  return [r / 255, g / 255, b / 255];
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** 0–255 sRGB to OKLCH: lightness 0–1, chroma, hue in radians. */
export function rgbToOklch([r, g, b]: Vec3): Vec3 {
  const [lr, lg, lb] = [r, g, b].map((v) => toLinear(v / 255));
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), Math.atan2(B, A)];
}

/** OKLCH back to 0–255 sRGB, clamped into gamut. */
export function oklchToRgb([L, C, h]: Vec3): Vec3 {
  const A = C * Math.cos(h);
  const B = C * Math.sin(h);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  return rgb.map((v) => Math.round(Math.min(1, Math.max(0, toGamma(Math.min(1, Math.max(0, v))))) * 255)) as Vec3;
}

/**
 * Mixes two 0–255 colors in OKLCH, taking the short way around the hue circle, so midpoints keep
 * their chroma instead of turning muddy the way an RGB mix does.
 */
export function mixOklch(a: Vec3, b: Vec3, t: number): Vec3 {
  const [L1, C1, h1] = rgbToOklch(a);
  const [L2, C2, h2] = rgbToOklch(b);
  // A near-gray end has no meaningful hue: borrow the other end's.
  const ha = C1 < 0.02 ? h2 : h1;
  const hb = C2 < 0.02 ? h1 : h2;
  let dh = hb - ha;
  if (dh > Math.PI) dh -= Math.PI * 2;
  if (dh < -Math.PI) dh += Math.PI * 2;
  return oklchToRgb([L1 + (L2 - L1) * t, C1 + (C2 - C1) * t, ha + dh * t]);
}
