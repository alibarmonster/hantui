import type { Point } from "@/lib/line-art/ink";

/**
 * A walk and run solver in figure space: about 95 units tall, feet on y = 120, facing +x.
 * Feet are placed first and everything else follows from them: a planted toe never slides, the
 * hip's height comes from the planted leg, and knees are solved with two-bone IK.
 */

export const GROUND = 120;
export const THIGH = 22;
export const SHIN = 22;
/** How high the ankle sits above the sole, and how far behind the toe. */
const ANKLE_UP = 3.2;
const FOOT = 6.5;

/**
 * Two-bone IK: the middle joint between `a` and `b` for bones of length `l1` and `l2`.
 * `bend` picks the side the joint folds to (1 or -1). Out of reach, the chain straightens.
 */
export function joint(a: Point, b: Point, l1: number, l2: number, bend = 1): Point {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const distance = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.001) || 0.001;
  const along = (l1 * l1 - l2 * l2 + distance * distance) / (2 * distance);
  const off = Math.sqrt(Math.max(0, l1 * l1 - along * along)) * bend;
  const length = Math.hypot(dx, dy) || 0.001;
  const nx = dx / length;
  const ny = dy / length;
  return [a[0] + nx * along - ny * off, a[1] + ny * along + nx * off];
}

/** Minimum-jerk easing: starts and ends with zero velocity and acceleration. */
const minJerk = (u: number) => u * u * u * (10 - 15 * u + 6 * u * u);

export interface GaitOptions {
  /** Distance a foot travels per step, in figure units. @default 26 */
  stride?: number;
  /** Share of the cycle each foot spends on the ground: about 0.62 walking, 0.36 running. @default 0.62 */
  duty?: number;
  /** How high a swinging foot lifts. Kept low. @default 3.2 */
  lift?: number;
}

export interface Leg {
  hip: Point;
  knee: Point;
  ankle: Point;
  toe: Point;
  /** True while the toe is on the ground. */
  planted: boolean;
}

export interface GaitPose {
  /** Hip joint, x relative to the figure's origin. */
  hip: Point;
  near: Leg;
  far: Leg;
  /** -1 to 1, in step with the near leg: drive the arms against it. */
  swing: number;
}

function foot(phase: number, stride: number, duty: number, lift: number) {
  const p = ((phase % 1) + 1) % 1;
  if (p < duty) {
    // Stance: the toe is fixed on the ground, so relative to the hip it slides straight back.
    const u = p / duty;
    const toeX = stride / 2 - stride * u + FOOT * 0.5;
    // Heel-off: over the last 14% of stance the foot pivots on the toe and the heel rises.
    const heel = Math.max(0, (u - 0.86) / 0.14);
    const angle = heel * heel * 0.7;
    return { toe: [toeX, GROUND] as Point, ankle: [toeX - FOOT * Math.cos(angle) + ANKLE_UP * Math.sin(angle) * 0.4, GROUND - ANKLE_UP - FOOT * Math.sin(angle)] as Point, planted: true };
  }
  // Swing: a minimum-jerk reach from behind to in front, with a low lift.
  const u = (p - duty) / (1 - duty);
  const reach = minJerk(u);
  const toeX = -stride / 2 + stride * reach + FOOT * 0.5;
  const raise = Math.sin(Math.PI * u) * lift;
  const angle = 0.7 * (1 - u) * (1 - u) - 0.18 * Math.sin(Math.PI * u) * u;
  return { toe: [toeX, GROUND - raise] as Point, ankle: [toeX - FOOT * Math.cos(angle), GROUND - raise - ANKLE_UP - FOOT * Math.sin(angle)] as Point, planted: false };
}

/** Solves one instant of the cycle. `phase` runs 0 to 1 per two steps. */
export function gait(phase: number, options: GaitOptions = {}): GaitPose {
  const stride = options.stride ?? 26;
  const duty = options.duty ?? 0.62;
  const lift = options.lift ?? 3.2;
  const near = foot(phase, stride, duty, lift);
  const far = foot(phase + 0.5, stride, duty, lift);
  // The hip is as high as the planted leg allows when almost straight, and never higher.
  const reach = (THIGH + SHIN) * 0.985;
  const hipOver = (ankle: Point) => ankle[1] - Math.sqrt(Math.max(reach * reach - ankle[0] * ankle[0], 1));
  let hipY = -Infinity;
  for (const leg of [near, far]) if (leg.planted) hipY = Math.max(hipY, hipOver(leg.ankle));
  if (hipY === -Infinity) {
    // Flight (running): both feet are off the ground. The hip rides a shallow arc from where the
    // pushing leg left it to where the landing leg will take it.
    const p = ((phase % 0.5) + 0.5) % 0.5;
    const u = Math.min(1, Math.max(0, (p - duty) / (0.5 - duty)));
    const takeoff = hipOver(foot(duty - 1e-6, stride, duty, lift).ankle);
    const landing = hipOver(foot(0, stride, duty, lift).ankle);
    hipY = takeoff + (landing - takeoff) * u - Math.sin(Math.PI * u) * 2.2;
  }
  const hip: Point = [0, hipY];
  const leg = (f: typeof near): Leg => {
    // A swinging foot that reaches past the leg's length is pulled back in, so bones never stretch.
    const dx = f.ankle[0] - hip[0];
    const dy = f.ankle[1] - hip[1];
    const over = Math.hypot(dx, dy) / (THIGH + SHIN - 0.05);
    if (f.planted || over <= 1) return { hip, knee: joint(hip, f.ankle, THIGH, SHIN, -1), ankle: f.ankle, toe: f.toe, planted: f.planted };
    const ankle: Point = [hip[0] + dx / over, hip[1] + dy / over];
    const toe: Point = [f.toe[0] + ankle[0] - f.ankle[0], f.toe[1] + ankle[1] - f.ankle[1]];
    return { hip, knee: joint(hip, ankle, THIGH, SHIN, -1), ankle, toe, planted: false };
  };
  return { hip, near: leg(near), far: leg(far), swing: Math.sin(phase * Math.PI * 2 + Math.PI * duty) };
}

/** Standing still, feet a little apart. */
export function standing(): GaitPose {
  const reach = (THIGH + SHIN) * 0.992;
  const hip: Point = [0, GROUND - ANKLE_UP - reach];
  const leg = (toeX: number): Leg => {
    const ankle: Point = [toeX - FOOT, GROUND - ANKLE_UP];
    return { hip, knee: joint(hip, ankle, THIGH, SHIN, -1), ankle, toe: [toeX, GROUND], planted: true };
  };
  return { hip, near: leg(6), far: leg(3), swing: 0 };
}
