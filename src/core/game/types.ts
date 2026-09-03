import type { AnswerOutcome, ExplanationMastery, GameId, PlayerId, ProfileType, ValidationMode } from "@/core/shared";

/* ---------------------------------------------------------------------------
 * Plateau (configuration — jamais codé en dur dans les règles)
 * ------------------------------------------------------------------------- */

/**
 * Types de case. Correspondance avec la nomenclature de conception :
 * start=DÉPART · question=QUESTION/SAVOIR · heritage=MONUMENT achetable ·
 * event=ÉVÉNEMENT · management=GESTION · challenge=DÉFI ·
 * solidarity=SOLIDARITÉ · treasure=TRÉSOR/RÉCOMPENSE.
 */
export const CELL_TYPES = [
  "start",
  "question",
  "heritage",
  "event",
  "management",
  "challenge",
  "solidarity",
  "treasure",
] as const;
export type CellType = (typeof CELL_TYPES)[number];

export interface BoardCellConfig {
  readonly position: number;
  readonly type: CellType;
}

/** Disposition d'un plateau : uniquement des positions et des types. */
export interface BoardConfig {
  readonly id: string;
  readonly version: number;
  readonly cellCount: number;
  readonly cells: readonly BoardCellConfig[];
}

/* ---------------------------------------------------------------------------
 * Sites patrimoniaux
 * ------------------------------------------------------------------------- */

export const HERITAGE_KINDS = [
  "purchasable_monument",
  "religious_place",
  "educational_site",
  "city",
  "country",
  "event",
  "other",
] as const;
export type HeritageKind = (typeof HERITAGE_KINDS)[number];

/**
 * Un site tel que décrit par le contenu. Règle structurelle : `price` et
 * `heritageValue` existent si et seulement si `kind === "purchasable_monument"`
 * (vérifié par le schéma, refusé par `resolveBoard`).
 */
export interface HeritageSite {
  readonly id: string;
  readonly kind: HeritageKind;
  readonly price?: number;
  readonly heritageValue?: number;
}

/** Vue du moteur : un site achetable, prix et valeur garantis. */
export interface PurchasableSite {
  readonly id: string;
  readonly price: number;
  readonly heritageValue: number;
}

/** Case résolue : une case `heritage` porte toujours un `siteId`. */
export type ResolvedCell =
  | { readonly position: number; readonly type: Exclude<CellType, "heritage"> }
  | { readonly position: number; readonly type: "heritage"; readonly siteId: string };

export interface ResolvedBoard {
  readonly id: string;
  readonly version: number;
  readonly cellCount: number;
  readonly startPosition: number;
  readonly cells: readonly ResolvedCell[];
}

/* ---------------------------------------------------------------------------
 * Effets différés, résultats de case, scénarios
 * ------------------------------------------------------------------------- */

/**
 * Effets différés. La condition de consommation est EXPLICITE dans chaque
 * effet ; elle n'est jamais déduite d'une sémantique implicite commune. Un
 * futur effet (« pendant 2 tours », « prochaine question ») déclarera la sienne.
 */
export type EffectSpec =
  | { readonly type: "skip_turn"; readonly consumeOn: "turn_start" }
  | { readonly type: "extra_turn"; readonly consumeOn: "turn_end" }
  | {
      readonly type: "reward_multiplier";
      readonly multiplier: number;
      readonly uses: number;
      /** Consommé uniquement quand une récompense est effectivement versée. */
      readonly consumeOn: "reward_granted";
    };

export interface QueuedEffect {
  readonly id: string;
  readonly playerId: PlayerId;
  readonly spec: EffectSpec;
}

/**
 * Résultat élémentaire produit par la résolution d'une case. Une séquence de
 * résultats est traitée dans l'ordre ; ceux qui exigent une décision humaine
 * (`question`, `heritage_offer`, `choice`) suspendent la file.
 */
export type Outcome =
  | { readonly kind: "money"; readonly amount: number }
  | { readonly kind: "move"; readonly steps: number; readonly resolveDestination?: boolean | undefined }
  | { readonly kind: "move_to"; readonly position: number; readonly resolveDestination?: boolean | undefined }
  | { readonly kind: "effect"; readonly effect: EffectSpec }
  | { readonly kind: "question" }
  | { readonly kind: "heritage_offer"; readonly siteId: string }
  | { readonly kind: "choice"; readonly choiceId: string; readonly options: readonly ChoiceOption[] };

export interface ChoiceOption {
  readonly id: string;
  readonly outcomes: readonly Outcome[];
}

/** Scénario générique attaché à un type de case (événement, gestion, défi, solidarité, trésor). */
export interface Scenario {
  readonly id: string;
  readonly cellType: CellType;
  readonly outcomes: readonly Outcome[];
}

/* ---------------------------------------------------------------------------
 * Règles configurables
 * ------------------------------------------------------------------------- */

export type EndCondition = { readonly kind: "turns_per_player"; readonly turns: number };

export interface RulesConfig {
  readonly id: string;
  readonly version: number;
  readonly startingMoney: number;
  readonly passStartBonus: number;
  readonly wheel: { readonly min: number; readonly max: number };
  readonly rewards: {
    readonly correct: number;
    readonly partial: number;
    readonly incorrect: number;
    readonly masteryMultiplier: number;
  };
  readonly scoring: { readonly moneyWeight: number; readonly heritageWeight: number };
  readonly allowNegativeBalance: boolean;
  readonly endCondition: EndCondition;
}

/* ---------------------------------------------------------------------------
 * État de partie
 * ------------------------------------------------------------------------- */

export interface RngState {
  readonly seed: number;
  readonly state: number;
  readonly calls: number;
}

export interface PlayerState {
  readonly id: PlayerId;
  readonly displayName: string;
  readonly profileType: ProfileType;
  readonly seat: number;
  readonly position: number;
  readonly money: number;
  readonly turnsPlayed: number;
}

export const TRANSACTION_REASONS = [
  "starting_money",
  "start_bonus",
  "question_reward",
  "purchase",
  "scenario_gain",
  "scenario_loss",
] as const;
export type TransactionReason = (typeof TRANSACTION_REASONS)[number];

export interface Transaction {
  readonly id: number;
  readonly turnNumber: number;
  readonly playerId: PlayerId;
  readonly amount: number;
  readonly reason: TransactionReason;
  readonly balanceAfter: number;
  readonly ref?: string;
}

export interface Holding {
  readonly siteId: string;
  readonly ownerId: PlayerId;
  readonly price: number;
  readonly heritageValue: number;
  readonly acquiredTurn: number;
}

export interface AnswerRecord {
  readonly outcome: AnswerOutcome;
  readonly explanationMastery: ExplanationMastery;
  readonly validationMode: ValidationMode;
}

/** Phase du tour. Les phases `awaiting_*` sont les seuls points d'attente : une décision humaine. */
export type TurnPhase =
  | { readonly kind: "awaiting_spin" }
  | { readonly kind: "awaiting_answer"; readonly requestId: string; readonly position: number; readonly queue: readonly Outcome[] }
  | { readonly kind: "awaiting_purchase"; readonly siteId: string; readonly price: number; readonly queue: readonly Outcome[] }
  | {
      readonly kind: "awaiting_choice";
      readonly choiceId: string;
      readonly options: readonly ChoiceOption[];
      readonly queue: readonly Outcome[];
    }
  | { readonly kind: "finished" };

export interface RankingEntry {
  readonly rank: number;
  readonly playerId: PlayerId;
  readonly score: number;
  readonly money: number;
  readonly heritageValue: number;
}

/** Configuration figée à la création : une partie ne change pas de règles en cours de route. */
export interface GameConfig {
  readonly board: ResolvedBoard;
  readonly sites: Readonly<Record<string, PurchasableSite>>;
  readonly scenarios: readonly Scenario[];
  readonly rules: RulesConfig;
}

export const GAME_SCHEMA_VERSION = 1 as const;

export interface GameState {
  readonly schemaVersion: typeof GAME_SCHEMA_VERSION;
  readonly gameId: GameId;
  readonly config: GameConfig;
  readonly rng: RngState;
  readonly players: readonly PlayerState[];
  readonly activePlayerIndex: number;
  readonly turnNumber: number;
  readonly phase: TurnPhase;
  readonly ledger: readonly Transaction[];
  readonly holdings: readonly Holding[];
  readonly effects: readonly QueuedEffect[];
  readonly counters: { readonly transaction: number; readonly request: number; readonly effect: number };
  readonly status: "in_progress" | "finished";
  readonly ranking?: readonly RankingEntry[];
}

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
