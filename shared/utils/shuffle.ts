export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Xorshift128 seeded PRNG — deterministic, fast, period 2^128-1.
 * Returns a function that produces numbers in [0, 1).
 */
export function createSeededRng(seed: number): () => number {
  // Initialize four 32-bit state values from a single seed using splitmix32
  let s0 = splitmix32(seed);
  let s1 = splitmix32(s0);
  let s2 = splitmix32(s1);
  let s3 = splitmix32(s2);

  return function xorshift128(): number {
    const t = s0 ^ (s0 << 11);
    s0 = s1;
    s1 = s2;
    s2 = s3;
    s3 = (s3 ^ (s3 >>> 19)) ^ (t ^ (t >>> 8));
    // Convert to [0, 1) by dividing unsigned 32-bit int by 2^32
    return (s3 >>> 0) / 4294967296;
  };
}

function splitmix32(seed: number): number {
  seed = (seed + 0x9e3779b9) | 0;
  let t = seed ^ (seed >>> 16);
  t = Math.imul(t, 0x21f0aaad);
  t = t ^ (t >>> 15);
  t = Math.imul(t, 0x735a2d97);
  t = t ^ (t >>> 15);
  return t >>> 0;
}

/**
 * Shuffle using a numeric seed for full determinism.
 */
export function shuffleSeeded<T>(arr: T[], seed: number): T[] {
  return shuffle(arr, createSeededRng(seed));
}
