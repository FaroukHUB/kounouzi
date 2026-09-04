import type { QuestionRef, ServedQuestion } from "@/core/content/types";
import type { AnswerOutcome, ExplanationMastery, GameId, PlayerId, ProfileType, ValidationMode } from "@/core/shared";

/* ---------------------------------------------------------------------------
 * Plateau (configuration — jamais codé en dur dans les règles)
 * ------------------------------------------------------------------------- */

/**
 * Types de case. Correspondance avec la nomenclature de conception :
 * start=DÉPART · question=QUESTION/SAVOIR · heritage=MONUMENT achetable ·
 * event=ÉVÉNEMENT · management=GESTION · challenge=DÉFI ·
 * solidarity=SOLIDARITÉ · treasure=TRÉSOR/RÉCOMPENSE · halt=HALTE DU VOYAGE.
 */
export const CELL_TYPES = ["start", "question", "heritage", "event", "management", "challenge", "solidarity", "treasure", "halt"] as const;
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
 * Politique déclarée par tout résultat économique négatif : jamais de
 * comportement implicite quand l'argent manque.
 * - `cap_to_balance` : on prend ce qui existe (solde à 0, jamais négatif) ;
 * - `require_full_amount` : l'action est refusée si le montant complet manque
 *   (choix du joueur : option indisponible) ;
 * - `cancel_if_insufficient` : le résultat est annulé silencieusement
 *   (résultat automatique d'un scénario).
 */
export const INSUFFICIENT_POLICIES = ["cap_to_balance", "require_full_amount", "cancel_if_insufficient"] as const;
export type InsufficientPolicy = (typeof INSUFFICIENT_POLICIES)[number];

/** Motif d'un transfert entre joueurs (traçable dans le grand livre et les événements). */
export const TRANSFER_REASONS = ["heritage_contribution", "gift", "solidarity", "collective_fund", "aid"] as const;
export type TransferReason = (typeof TRANSFER_REASONS)[number];

/** Gains d'un résultat de réponse : ce que rapporte correct / presque / incorrect. */
export interface OutcomePayout {
  readonly correct: number;
  readonly partial: number;
  readonly incorrect: number;
}

/**
 * Effets différés. Chaque effet déclare EXPLICITEMENT son déclencheur de
 * consommation (`consumeOn`) ; rien n'est déduit d'une sémantique implicite.
 * Le propriétaire, le tour d'acquisition et l'expiration éventuelle vivent
 * dans `QueuedEffect`. Aucun booléen dispersé.
 */
export type EffectSpec =
  | { readonly type: "skip_turn"; readonly consumeOn: "turn_start" }
  | { readonly type: "extra_turn"; readonly consumeOn: "turn_end" }
  /** Multiplie la prochaine récompense de réponse (consommé seulement si une récompense est versée). */
  | { readonly type: "reward_multiplier"; readonly multiplier: number; readonly uses: number; readonly consumeOn: "reward_granted" }
  /** Bonus fixe ajouté à la prochaine récompense de réponse. */
  | { readonly type: "next_reward_bonus"; readonly amount: number; readonly consumeOn: "reward_granted" }
  /** Annule la prochaine petite pénalité (perte de scénario ≤ `maxAmount`). */
  | { readonly type: "penalty_shield"; readonly maxAmount: number; readonly consumeOn: "penalty" }
  /** Réduction (en %) sur le prochain achat de monument. */
  | { readonly type: "next_purchase_discount"; readonly percent: number; readonly consumeOn: "purchase" }
  /** Investissement en attente : la prochaine réponse décide du versement (aucun hasard, le joueur décide). */
  | { readonly type: "investment_pending"; readonly payout: OutcomePayout; readonly consumeOn: "answer_recorded" }
  /** Épargne : versement après `turnsRemaining` tours du joueur consommés. */
  | { readonly type: "saving_pending"; readonly payout: number; readonly turnsRemaining: number; readonly consumeOn: "turn_end" };

export interface QueuedEffect {
  readonly id: string;
  readonly playerId: PlayerId;
  readonly spec: EffectSpec;
  /** Tour (numéro global) où l'effet a été acquis. */
  readonly queuedAtTurn: number;
  /** Expiration éventuelle : l'effet disparaît au début d'un tour du joueur postérieur à ce numéro. */
  readonly expiresAtTurn?: number | undefined;
}

/**
 * Résultat élémentaire produit par la résolution d'une case. Une séquence est
 * traitée dans l'ordre ; ceux qui exigent une décision humaine (`question`,
 * `heritage_offer`, `choice`) suspendent la file.
 */
export type Outcome =
  /** Gain (amount > 0) ou perte (amount < 0, politique obligatoire ; une perte peut être annulée par un `penalty_shield`). */
  | { readonly kind: "money"; readonly amount: number; readonly insufficient?: InsufficientPolicy | undefined }
  | { readonly kind: "move"; readonly steps: number; readonly resolveDestination?: boolean | undefined }
  | { readonly kind: "move_to"; readonly position: number; readonly resolveDestination?: boolean | undefined }
  | { readonly kind: "effect"; readonly effect: EffectSpec; readonly expiresInTurns?: number | undefined }
  | { readonly kind: "question" }
  | { readonly kind: "heritage_offer"; readonly siteId: string }
  | { readonly kind: "choice"; readonly choiceId: string; readonly options: readonly ChoiceOption[] }
  /** Duel Kounouzi : le joueur actif choisit un adversaire, chacun reçoit SA question (Learning Engine). */
  | { readonly kind: "duel" }
  /** Halte du voyage : le prochain tour commence par un Défi de reprise. */
  | { readonly kind: "halt" }
  /** Le joueur actif choisit un destinataire et lui transfère `amount`. */
  | { readonly kind: "transfer_choice"; readonly amount: number; readonly reason: TransferReason; readonly insufficient: InsufficientPolicy }
  /** Le joueur actif donne `amount` au joueur qui a le moins d'argent (autre que lui). */
  | { readonly kind: "give_to_poorest"; readonly amount: number; readonly reason: TransferReason; readonly insufficient: InsufficientPolicy }
  /** Le joueur le plus riche aide le moins riche (s'ils diffèrent). */
  | { readonly kind: "aid_from_richest"; readonly amount: number; readonly insufficient: InsufficientPolicy }
  /** Chaque joueur (sauf le bénéficiaire) contribue `amount` au joueur qui a le moins d'argent. */
  | { readonly kind: "collective_fund"; readonly amount: number; readonly insufficient: InsufficientPolicy }
  /** Entretien : coût par monument possédé. */
  | { readonly kind: "heritage_maintenance"; readonly amountPerSite: number; readonly insufficient: InsufficientPolicy }
  /** Valorisation : gain par monument possédé. */
  | { readonly kind: "heritage_bonus"; readonly amountPerSite: number }
  /** Investissement : débit immédiat, versement décidé par la prochaine réponse. */
  | { readonly kind: "invest"; readonly amount: number; readonly payout: OutcomePayout; readonly insufficient: InsufficientPolicy }
  /** Épargne : débit immédiat, versement après `turns` tours consommés. */
  | { readonly kind: "save"; readonly amount: number; readonly payout: number; readonly turns: number; readonly insufficient: InsufficientPolicy }
  /** Reprise : supprime les effets négatifs listés (et la Halte si demandé). */
  | { readonly kind: "clear_effects"; readonly types: readonly EffectSpec["type"][]; readonly liftHalt: boolean };

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
  /** Duel Kounouzi : bonus de victoire, d'égalité (petit) et de défaite (pas de grosse pénalité). */
  readonly duel: { readonly winBonus: number; readonly drawBonus: number; readonly loseBonus: number };
  /** Visite de patrimoine : contribution due au propriétaire selon la réponse au Défi Patrimoine. */
  readonly heritageVisit: { readonly contribution: OutcomePayout; readonly insufficient: InsufficientPolicy };
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
  /** Halte du voyage : le prochain tour commence par un Défi de reprise. Jamais plus d'un tour. */
  readonly halted: boolean;
  /** Dimension solidarité (tracée à part ; aucune formule de score encore). */
  readonly solidarityActions: number;
  readonly solidarityGiven: number;
}

export const TRANSACTION_REASONS = [
  "starting_money",
  "start_bonus",
  "question_reward",
  "purchase",
  "scenario_gain",
  "scenario_loss",
  "transfer_sent",
  "transfer_received",
  "duel_reward",
  "investment",
  "investment_payout",
  "saving",
  "saving_payout",
  "heritage_maintenance",
  "heritage_bonus",
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

/**
 * Pourquoi une question est posée. La question reste une VRAIE question
 * pédagogique (mémoire alimentée normalement) ; seul l'effet de jeu diffère.
 */
export type AnswerPurpose =
  | { readonly kind: "standard" }
  /** Défi de reprise après une Halte du voyage. */
  | { readonly kind: "halt" }
  /** Défi Patrimoine : la contribution due au propriétaire dépend de la réponse. */
  | { readonly kind: "heritage_visit"; readonly siteId: string; readonly ownerId: PlayerId };

export const DUEL_STAGES = ["challenger", "opponent"] as const;
export type DuelStage = (typeof DUEL_STAGES)[number];

/**
 * Duel Kounouzi — état persistant explicite. Chaque dueliste reçoit SA
 * question (choisie par le Learning Engine, même catégorie), figée ici ; on
 * compare uniquement correct > presque > incorrect. Aucun chrono, aucune
 * vitesse, jamais la maîtrise de l'explication.
 */
export interface DuelState {
  readonly challengerId: PlayerId;
  readonly opponentId: PlayerId;
  /** Catégorie commune, fixée à la distribution de la première question. */
  readonly categoryId: string | null;
  readonly challengerRequestId: string;
  readonly opponentRequestId: string;
  readonly challengerServed?: ServedQuestion | undefined;
  readonly opponentServed?: ServedQuestion | undefined;
  readonly challengerOutcome?: AnswerOutcome | undefined;
  readonly opponentOutcome?: AnswerOutcome | undefined;
  readonly stage: DuelStage;
}

/** Phase du tour. Les phases `awaiting_*` sont les seuls points d'attente : une décision humaine. */
export type TurnPhase =
  | { readonly kind: "awaiting_journey" }
  /** `served` : la question distribuée, figée avec sa référence versionnée (reprise exacte quel que soit le contenu). */
  | { readonly kind: "awaiting_answer"; readonly requestId: string; readonly position: number; readonly purpose: AnswerPurpose; readonly queue: readonly Outcome[]; readonly served?: ServedQuestion | undefined }
  | { readonly kind: "awaiting_purchase"; readonly siteId: string; readonly price: number; readonly queue: readonly Outcome[] }
  | { readonly kind: "awaiting_choice"; readonly choiceId: string; readonly options: readonly ChoiceOption[]; readonly queue: readonly Outcome[] }
  /** Le joueur actif choisit son adversaire (décision stratégique autorisée ; jamais la question ni la difficulté). */
  | { readonly kind: "awaiting_duel_opponent"; readonly candidates: readonly PlayerId[]; readonly queue: readonly Outcome[] }
  | { readonly kind: "awaiting_duel"; readonly duel: DuelState; readonly queue: readonly Outcome[] }
  /** Le joueur actif choisit à qui transférer (partage, cadeau, don). */
  | { readonly kind: "awaiting_recipient"; readonly amount: number; readonly reason: TransferReason; readonly insufficient: InsufficientPolicy; readonly candidates: readonly PlayerId[]; readonly queue: readonly Outcome[] }
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
  /** Décalage de la séquence de scénarios (rotation inter-parties par numéro de partie ; jamais un tirage). */
  readonly scenarioOffset: number;
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

export const GAME_SCHEMA_VERSION = 4 as const;

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
  readonly counters: { readonly transaction: number; readonly request: number; readonly effect: number; readonly transfer: number };
  readonly status: "in_progress" | "finished";
  readonly ranking?: readonly RankingEntry[];
}

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
