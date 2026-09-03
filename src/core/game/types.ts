import type { QuestionRef, ServedQuestion } from "@/core/content/types";
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
export const CELL_TYPES = ["start", "question", "heritage", "event", "management", "challenge", "solidarity", "treasure"] as const;
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

export const HERITAGE_KINDS = ["purchasable_monument", "religious_place", "educational_site", "city", "country", "event", "other"] as const;
export type HeritageKind = (typeof HERITAGE_KINDS)[number];

/**
 * Un site tel que décrit par le contenu. Règle structurelle : `price` et
 * `heritageValue` existent si et seulement si `kind === "purchasable_monument"`
 * (vérifié par le schéma, refusé par `resolveBoard`).
 */
export interface HeritageSite {
  readonly id: string;
  readonly kind: HeritageKind;
  readonly price?: number | undefined;
  readonly heritageValue?: number | undefined;
}

/** Vue du moteur : un site achetable, prix et valeur garantis. */
export interface PurchasableSite {
  readonly id: string;
  readonly price: number;
  readonly heritageValue: number;
}

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
 * Le Chemin — déplacement déterministe, sans hasard ni choix du joueur
 * ------------------------------------------------------------------------- */

/**
 * Cycle de voyage versionné : une suite de blocs, chacun étant une permutation
 * de 1..stepMax. Le siège d'un joueur détermine son bloc de départ ; son
 * compteur de voyages avance dans le cycle. Aucune donnée économique, aucun
 * contenu de case, aucun hasard n'intervient (voir `journeyScheduler.ts`).
 */
export interface JourneyCycle {
  readonly id: string;
  readonly version: number;
  readonly stepMax: number;
  readonly blocks: readonly (readonly number[])[];
}

/* ---------------------------------------------------------------------------
 * Effets différés, résultats de case, scénarios
 * ------------------------------------------------------------------------- */

/**
 * Effets différés. La condition de consommation est EXPLICITE dans chaque
 * effet ; elle n'est jamais déduite d'une sémantique implicite commune.
 */
export type EffectSpec =
  | { readonly type: "skip_turn"; readonly consumeOn: "turn_start" }
  | { readonly type: "extra_turn"; readonly consumeOn: "turn_end" }
  | { readonly type: "reward_multiplier"; readonly multiplier: number; readonly uses: number; readonly consumeOn: "reward_granted" };

export interface QueuedEffect {
  readonly id: string;
  readonly playerId: PlayerId;
  readonly spec: EffectSpec;
}

/**
 * Résultat élémentaire produit par la résolution d'une case. Une séquence est
 * traitée dans l'ordre ; ceux qui exigent une décision humaine (`question`,
 * `heritage_offer`, `choice`) suspendent la file.
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

/**
 * Scénario générique attaché à un type de case. Quand plusieurs scénarios
 * existent pour un type, ils sont servis dans l'ordre configuré selon le
 * compteur de visites de la case (visite 1 → premier, visite 2 → second, …).
 */
export interface Scenario {
  readonly id: string;
  readonly cellType: CellType;
  readonly outcomes: readonly Outcome[];
}

/* ---------------------------------------------------------------------------
 * Règles configurables
 * ------------------------------------------------------------------------- */

/**
 * Condition de fin. `active_time` (temps de jeu ACTIF, pas heure absolue) est
 * l'expérience principale ; `free` ne finit que sur demande ; `turns_per_player`
 * reste disponible pour les tests et simulations. Dans tous les cas la partie
 * se termine à la fin d'un tour de table complet : personne ne joue un tour de
 * plus que les autres.
 */
export type EndCondition =
  | { readonly kind: "active_time"; readonly targetSeconds: number }
  | { readonly kind: "free" }
  | { readonly kind: "turns_per_player"; readonly turns: number };

export interface RulesConfig {
  readonly id: string;
  readonly version: number;
  readonly startingMoney: number;
  readonly passStartBonus: number;
  readonly rewards: { readonly correct: number; readonly partial: number; readonly incorrect: number; readonly masteryMultiplier: number };
  readonly scoring: { readonly moneyWeight: number; readonly heritageWeight: number };
  readonly allowNegativeBalance: boolean;
  readonly endCondition: EndCondition;
}

/* ---------------------------------------------------------------------------
 * Équilibrage familial (FamilyAssist) — MODÈLE SEULEMENT, non implémenté
 * ------------------------------------------------------------------------- */

export const FAMILY_ASSIST_LEVELS = ["subtle"] as const;
export type FamilyAssistLevel = (typeof FAMILY_ASSIST_LEVELS)[number];

/**
 * Configuration PAR PARTIE (jamais sur un profil permanent), parentale et
 * secrète : l'interface de jeu ne l'affiche jamais. Aucune mécanique n'est
 * encore branchée dessus. Elle ne pourra jamais toucher au Chemin, aux
 * questions, aux réponses ni à la progression pédagogique (ADR 0015).
 */
export interface FamilyAssistConfig {
  readonly enabled: boolean;
  readonly assistedPlayers: readonly { readonly playerId: PlayerId; readonly level: FamilyAssistLevel }[];
}

export const FAMILY_ASSIST_OFF: FamilyAssistConfig = { enabled: false, assistedPlayers: [] };

/* ---------------------------------------------------------------------------
 * État de partie
 * ------------------------------------------------------------------------- */

export interface PlayerState {
  readonly id: PlayerId;
  readonly displayName: string;
  readonly profileType: ProfileType;
  readonly seat: number;
  readonly position: number;
  readonly money: number;
  readonly turnsPlayed: number;
  /** Nombre de Chemins déjà attribués (index dans le cycle de voyage). */
  readonly journeysTaken: number;
}

export const TRANSACTION_REASONS = ["starting_money", "start_bonus", "question_reward", "purchase", "scenario_gain", "scenario_loss"] as const;
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
  | { readonly kind: "awaiting_journey" }
  /** `served` : la question distribuée, figée avec sa référence versionnée (reprise exacte quel que soit le contenu). */
  | { readonly kind: "awaiting_answer"; readonly requestId: string; readonly position: number; readonly queue: readonly Outcome[]; readonly served?: ServedQuestion | undefined }
  | { readonly kind: "awaiting_purchase"; readonly siteId: string; readonly price: number; readonly queue: readonly Outcome[] }
  | { readonly kind: "awaiting_choice"; readonly choiceId: string; readonly options: readonly ChoiceOption[]; readonly queue: readonly Outcome[] }
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
  readonly journey: JourneyCycle;
  readonly familyAssist: FamilyAssistConfig;
}

/** Temps de jeu ACTIF, en secondes, alimenté par la couche session (horloge injectée). */
export interface PlayClock {
  readonly activePlaySeconds: number;
  readonly timeTargetReached: boolean;
}

/** Résumé pédagogique d'une question répondue (mémoire, Phase 5). */
export interface AnsweredQuestion {
  readonly ref: QuestionRef;
  readonly knowledgeNodeId: string;
  readonly categoryId: string;
  readonly difficulty: number;
}

export const GAME_SCHEMA_VERSION = 3 as const;

export interface GameState {
  readonly schemaVersion: typeof GAME_SCHEMA_VERSION;
  readonly gameId: GameId;
  readonly config: GameConfig;
  readonly players: readonly PlayerState[];
  readonly activePlayerIndex: number;
  readonly turnNumber: number;
  readonly phase: TurnPhase;
  readonly ledger: readonly Transaction[];
  readonly holdings: readonly Holding[];
  readonly effects: readonly QueuedEffect[];
  /** Nombre d'arrivées sur chaque case (sélection déterministe des scénarios). */
  readonly cellVisits: Readonly<Record<string, number>>;
  readonly clock: PlayClock;
  /** Demande de fin (espace parent) : la partie s'arrête à la fin du tour de table. */
  readonly endRequested: boolean;
  readonly counters: { readonly transaction: number; readonly request: number; readonly effect: number };
  readonly status: "in_progress" | "finished";
  readonly ranking?: readonly RankingEntry[];
}

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
