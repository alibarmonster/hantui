/**
 * Day and night for line art. `tau` runs 0 to 1 over a day: 0 is midnight, 0.5 is noon.
 * By day the drawing is dark ink on warm paper; at night it inverts to pale ink on indigo paper.
 */

type Rgb = readonly [number, number, number];

const hex = (value: string): Rgb => {
  const v = value.replace("#", "");
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
};
const mix = (a: Rgb, b: Rgb, t: number) => `rgb(${a.map((value, i) => Math.round(value + (b[i] - value) * t)).join(" ")})`;
const smooth = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

const DAY = { paper: hex("#fdfcf8"), ink: hex("#1c1c1c"), skyTop: hex("#cfe4f2"), skyLow: hex("#fdf6e6") };
const DUSK = { skyTop: hex("#f0a878"), skyLow: hex("#fbe3c2") };
const NIGHT = { paper: hex("#1d2140"), ink: hex("#e9e6f2"), skyTop: hex("#10132c"), skyLow: hex("#2a2f5c") };

export interface DayPalette {
  paper: string;
  ink: string;
  /** Sky gradient stops, top then horizon. */
  sky: [string, string];
  /** 0 by day, 1 in full night. Use it for window glow, stars and lamps. */
  night: number;
  /** Height of the sun or moon above the horizon, 0 to 1. */
  height: number;
  /** True while the body in the sky is the moon. */
  moon: boolean;
}

/** How dark it is at `tau`: 0 from mid-morning to late afternoon, 1 deep at night. */
export function nightness(tau: number) {
  const t = ((tau % 1) + 1) % 1;
  return 1 - smooth(0.2, 0.3, t) * (1 - smooth(0.72, 0.82, t));
}

export function palette(tau: number): DayPalette {
  const t = ((tau % 1) + 1) % 1;
  const night = nightness(t);
  // Warm light around sunrise and sunset.
  const dusk = Math.max(0, 1 - Math.abs(night - 0.5) * 2) * 0.85;
  const top = mix(hex(mixHex(DAY.skyTop, DUSK.skyTop, dusk)), NIGHT.skyTop, night);
  const low = mix(hex(mixHex(DAY.skyLow, DUSK.skyLow, dusk)), NIGHT.skyLow, night);
  // Paper darkens gradually; ink flips quickly in the middle, so the two never meet in gray.
  const ink = mix(DAY.ink, NIGHT.ink, smooth(0.42, 0.58, night));
  const moon = t < 0.25 || t > 0.77;
  const arc = moon ? (t > 0.5 ? (t - 0.77) / 0.48 : (t + 0.23) / 0.48) : (t - 0.25) / 0.52;
  return { paper: mix(DAY.paper, NIGHT.paper, night), ink, sky: [top, low], night, height: Math.sin(Math.PI * Math.min(1, Math.max(0, arc))), moon };
}

function mixHex(a: Rgb, b: Rgb, t: number) {
  return `#${a.map((value, i) => Math.round(value + (b[i] - value) * t).toString(16).padStart(2, "0")).join("")}`;
}

/** Pushes a flat color toward the night palette: darker and bluer as night falls. */
export function nightTint(color: string, tau: number) {
  return mix(hex(color), [58, 62, 110], nightness(tau) * 0.62);
}
