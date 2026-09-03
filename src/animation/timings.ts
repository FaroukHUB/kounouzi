/** Toutes les durées d'animation, en millisecondes. Le noyau ne les connaît pas. */
export interface Timings {
  /** Le Chemin se dévoile (« Ton chemin se dévoile… 4 étapes »). */
  readonly journeyRevealMs: number;
  readonly stepMs: number;
  readonly arrivalMs: number;
  readonly turnBannerMs: number;
  readonly passedStartMs: number;
  readonly skippedMs: number;
}

export const DEFAULT_TIMINGS: Timings = {
  journeyRevealMs: 1600,
  stepMs: 280,
  arrivalMs: 500,
  turnBannerMs: 900,
  passedStartMs: 900,
  skippedMs: 1100,
};

/** Mode « animations réduites » : même séquence, durées nulles. */
export const REDUCED_TIMINGS: Timings = {
  journeyRevealMs: 0,
  stepMs: 0,
  arrivalMs: 0,
  turnBannerMs: 0,
  passedStartMs: 0,
  skippedMs: 0,
};

export const resolveTimings = (reduced: boolean): Timings => (reduced ? REDUCED_TIMINGS : DEFAULT_TIMINGS);

/** Garde-fou : une animation ne bloque jamais la file au-delà de sa durée × 2 + 500 ms. */
export const safetyTimeout = (ms: number): number => ms * 2 + 500;
