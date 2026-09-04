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
  /** Duel : face-à-face, « à toi ! », résultat. */
  readonly duelIntroMs: number;
  readonly duelTurnMs: number;
  readonly duelResultMs: number;
  /** Halte du voyage : « Ton voyage s'interrompt ». */
  readonly haltMs: number;
  /** Transfert entre joueurs, protection, investissement, épargne : bandeaux. */
  readonly noticeMs: number;
  /** Défi famille : « OH NOOON… » avant révélation, résultat, récompense. */
  readonly ohNoMs: number;
  readonly challengeResultMs: number;
  /** Paiement / don entre joueurs : bandeau explicite, plus long qu'un simple avis. */
  readonly transferMs: number;
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
  duelIntroMs: 2000,
  duelTurnMs: 1200,
  duelResultMs: 2400,
  haltMs: 1800,
  noticeMs: 1400,
  ohNoMs: 1400,
  challengeResultMs: 1300,
  transferMs: 2600,
};

/** Mode « animations réduites » : même séquence, durées nulles. */
export const REDUCED_TIMINGS: Timings = Object.fromEntries(Object.keys(DEFAULT_TIMINGS).map((k) => [k, 0])) as unknown as Timings;

export const resolveTimings = (reduced: boolean): Timings => (reduced ? REDUCED_TIMINGS : DEFAULT_TIMINGS);

/** Garde-fou : une animation ne bloque jamais la file au-delà de sa durée × 2 + 500 ms. */
export const safetyTimeout = (ms: number): number => ms * 2 + 500;
