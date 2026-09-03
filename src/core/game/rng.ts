import type { RngState } from "./types";

/**
 * Générateur pseudo-aléatoire à graine (mulberry32). L'état complet vit dans
 * `GameState.rng` : même graine + mêmes commandes = même partie, et une
 * partie sérialisée reprend exactement la même séquence.
 */
export function createRng(seed: number): RngState {
  return { seed: seed >>> 0, state: seed >>> 0, calls: 0 };
}

export function nextUint32(rng: RngState): readonly [number, RngState] {
  const a = (rng.state + 0x6d2b79f5) >>> 0;
  let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = (t ^ (t >>> 14)) >>> 0;
  return [value, { seed: rng.seed, state: a, calls: rng.calls + 1 }];
}

/** Entier uniforme dans [min, max] (bornes incluses). */
export function nextInt(rng: RngState, min: number, max: number): readonly [number, RngState] {
  if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
    throw new RangeError(`nextInt: intervalle invalide [${min}, ${max}]`);
  }
  const span = max - min + 1;
  const [u, next] = nextUint32(rng);
  // Tirage par rejet pour éviter le biais du modulo.
  const limit = Math.floor(0x1_0000_0000 / span) * span;
  if (u >= limit) return nextInt(next, min, max);
  return [min + (u % span), next];
}
