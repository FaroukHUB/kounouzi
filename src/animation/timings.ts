/** Toutes les durées d'animation, en millisecondes. Le noyau ne les connaît pas. */
export interface Timings {
  /** Le Chemin se dévoile (« Ton chemin se dévoile… 4 étapes »). */
  readonly journeyRevealMs: number;
  readonly stepMs: number;
  readonly arrivalMs: number;
  readonly turnBannerMs: number;
  readonly passedStartMs: number;
  readonly skippedMs: number;
  /** Révélation d'un scénario (événement, gestion, défi, solidarité, trésor). */
  readonly scenarioMs: number;
  /** Résultat d'une réponse affiché sur la carte. */
  readonly resultMs: number;
  /** Récompense (+N) affichée sur la carte. */
  readonly rewardMs: number;
  /** Achat conclu / refusé. */
  readonly purchaseMs: number;
}

export const DEFAULT_TIMINGS: Timings = {
  journeyRevealMs: 1600,
  stepMs: 280,
  arrivalMs: 500,
  turnBannerMs: 900,
  passedStartMs: 900,
  skippedMs: 1100,
  scenarioMs: 1900,
  resultMs: 1000,
  rewardMs: 1500,
  purchaseMs: 1200,
};

/** Mode « animations réduites » : même séquence, durées nulles. */
export const REDUCED_TIMINGS: Timings = {
  journeyRevealMs: 0,
  stepMs: 0,
  arrivalMs: 0,
  turnBannerMs: 0,
  passedStartMs: 0,
  skippedMs: 0,
  scenarioMs: 0,
  resultMs: 0,
  rewardMs: 0,
  purchaseMs: 0,
};

export const resolveTimings = (reduced: boolean): Timings => (reduced ? REDUCED_TIMINGS : DEFAULT_TIMINGS);

/** Garde-fou : une animation ne bloque jamais la file au-delà de sa durée × 2 + 500 ms. */
export const safetyTimeout = (ms: number): number => ms * 2 + 500;
