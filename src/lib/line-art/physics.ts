/**
 * Small physics for line art: a seeded generator, a spring, a pendulum for things that hang,
 * pointer speed as wind, and keyed pose timelines for reactions. Framework-free.
 */

/** A seeded generator (mulberry32): the same seed always gives the same scene. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Spring {
  value: number;
  velocity: number;
}

/** Steps a damped spring toward `target`. Stable for the frame times a canvas loop produces. */
export function spring(state: Spring, target: number, stiffness: number, damping: number, dt: number) {
  const step = Math.min(dt, 1 / 30);
  state.velocity += ((target - state.value) * stiffness - state.velocity * damping) * step;
  state.value += state.velocity * step;
  return state.value;
}

export interface Pendulum {
  /** Angle from hanging straight down, in radians. */
  angle: number;
  velocity: number;
}

/**
 * Steps something that hangs: scarves, bags, signs, lanterns. `push` is a sideways acceleration
 * (wind, or the carrier speeding up), `length` sets how slowly it swings.
 */
export function pendulum(state: Pendulum, push: number, dt: number, length = 12, damping = 2.2) {
  const step = Math.min(dt, 1 / 30);
  state.velocity += (-(60 / length) * Math.sin(state.angle) + push * Math.cos(state.angle) - state.velocity * damping) * step;
  state.angle += state.velocity * step;
  return state.angle;
}

export interface PointerWind {
  /** Signed wind right now: positive blows toward +x. Decays to 0 when the pointer rests. */
  read(dt: number): number;
  dispose(): void;
}

/** Turns pointer speed over `target` into wind. */
export function pointerWind(target: HTMLElement | SVGElement, strength = 0.02): PointerWind {
  let lastX = 0;
  let lastTime = 0;
  let gust = 0;
  const onMove = (event: Event) => {
    const pointer = event as PointerEvent;
    const now = performance.now();
    if (lastTime && now - lastTime < 120) {
      const speed = (pointer.clientX - lastX) / Math.max(1, now - lastTime);
      gust += Math.max(-1, Math.min(1, speed * strength * 16)) * 0.35;
      gust = Math.max(-1.5, Math.min(1.5, gust));
    }
    lastX = pointer.clientX;
    lastTime = now;
  };
  target.addEventListener("pointermove", onMove, { passive: true });
  return {
    read(dt) {
      gust *= Math.pow(0.08, dt);
      return gust;
    },
    dispose() {
      target.removeEventListener("pointermove", onMove);
    },
  };
}

export type Key<T extends readonly number[]> = readonly [time: number, value: T];

/**
 * A keyed timeline of poses: `sample(t)` eases between the keys on either side of `t`.
 * Times are in seconds; before the first key and after the last, the nearest key holds.
 */
export function sequence<T extends readonly number[]>(keys: readonly Key<T>[]) {
  const end = keys[keys.length - 1][0];
  return {
    duration: end,
    sample(t: number): number[] {
      if (t <= keys[0][0]) return [...keys[0][1]];
      if (t >= end) return [...keys[keys.length - 1][1]];
      let i = 1;
      while (keys[i][0] < t) i++;
      const [t0, a] = keys[i - 1];
      const [t1, b] = keys[i];
      const u = (t - t0) / (t1 - t0);
      const eased = u * u * (3 - 2 * u);
      return a.map((value, index) => value + (b[index] - value) * eased);
    },
  };
}
