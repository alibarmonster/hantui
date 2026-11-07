/**
 * Seeded randomness for visuals: dot layouts, characters' moods, print glitches. The same seed
 * gives the same sequence on the server and in the first client frame, so nothing shifts or
 * mismatches on hydration. Not for anything security-related.
 */

/** A 32-bit hash of a string or number, to turn a `seed` prop into a generator state. */
export function hashSeed(seed: string | number): number {
  const text = typeof seed === "number" ? `n${seed}` : seed;
  // FNV-1a, then a final avalanche so short, similar seeds still diverge.
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  return h >>> 0;
}

/** mulberry32: a small, fast generator of floats in [0, 1). */
export function mulberry32(state: number): () => number {
  let a = state >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Random {
  /** A float in [0, 1). */
  next(): number;
  /** A float in [min, max). */
  range(min: number, max: number): number;
  /** An integer from min to max, both included. */
  int(min: number, max: number): number;
  /** True with probability `p`. */
  chance(p: number): boolean;
  /** One item of a non-empty list. */
  pick<T>(list: readonly T[]): T;
  /** An independent generator derived from this seed and a salt, e.g. one per word or per coin. */
  fork(salt: string | number): Random;
}

/** A seeded generator with a few helpers on top of `mulberry32`. */
export function createRandom(seed: string | number): Random {
  const base = hashSeed(seed);
  const next = mulberry32(base);
  return {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (list) => list[Math.floor(next() * list.length)],
    fork: (salt) => createRandom(`${base}:${salt}`),
  };
}
