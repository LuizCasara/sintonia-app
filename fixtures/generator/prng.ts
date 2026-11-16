/** PRNG determinístico (mulberry32): mesma seed, mesma sequência. Sem dependências. */
export function createRng(seed: number) {
  let state = seed >>> 0;

  /** Número em [0, 1). */
  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    /** Inteiro entre min e max (inclusive). */
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    /** true com probabilidade p (0 a 1). */
    chance: (p: number) => next() < p,
    /** Item aleatório de uma lista não vazia. */
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)] as T,
  };
}

export type Rng = ReturnType<typeof createRng>;
