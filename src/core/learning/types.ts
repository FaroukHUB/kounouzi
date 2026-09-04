import type { QuestionRef } from "@/core/content/types";
import type { AnswerOutcome, ExplanationMastery, GameId, PlayerId, ProfileType, ValidationMode } from "@/core/shared";

/**
 * Mémoire pédagogique d'un JOUEUR — enfant ou adulte, même modèle, mêmes
 * droits (jamais de `child_*`). Elle appartient au joueur, survit aux parties
 * et ne contient AUCUNE donnée économique : la donnée principale est la
 * réponse, la difficulté, la notion, la maîtrise. Jamais le montant reçu.
 */

export const LEARNING_SCHEMA_VERSION = 1 as const;

/** `player_knowledge_state` : agrégat borné par notion (knowledge node). */
export interface KnowledgeState {
  readonly knowledgeNodeId: string;
  readonly categoryId: string;
  /** Maîtrise estimée 0..1 (moyenne mobile exponentielle des résultats pondérés). */
  readonly mastery: number;
  readonly attempts: number;
  readonly successes: number;
  readonly partials: number;
  readonly failures: number;
  /** Boîte de révision espacée (0 = à revoir vite ; dernière boîte = intervalle le plus long). */
  readonly box: number;
  readonly lastSeenAt: string | null;
  readonly nextDueAt: string | null;
  readonly lastDifficulty: number | null;
}

/** `player_category_progress` : niveau estimé par catégorie, indépendant des autres catégories. */
export interface CategoryProgress {
  readonly categoryId: string;
  /** Niveau estimé sur l'échelle interne (1..5, pas configurable). Évolue lentement. */
  readonly estimatedLevel: number;
  /** Point de départ (classe ou niveau initial) : ne sert qu'à amorcer, jamais à plafonner. */
  readonly seedLevel: number;
  readonly attempts: number;
  readonly successes: number;
  readonly partials: number;
  readonly failures: number;
  /** Poids des derniers essais informatifs depuis le dernier ajustement de niveau. */
  readonly window: readonly number[];
  readonly lastAdjustedAt: string | null;
}

/** `player_attempts` : une ligne par question réellement terminée. */
export interface Attempt {
  /** `gameId:requestId` — un même essai ne peut jamais être compté deux fois. */
  readonly id: string;
  readonly playerId: PlayerId;
  readonly gameId: GameId;
  readonly knowledgeNodeId: string;
  readonly ref: QuestionRef;
  readonly categoryId: string;
  readonly difficulty: number;
  readonly outcome: AnswerOutcome;
  readonly validationMode: ValidationMode;
  /** Déclaration « je connaissais l'explication » : conservée À PART, n'influence jamais la difficulté. */
  readonly explanationKnown: ExplanationMastery;
  /** Une récompense a-t-elle été accordée ? Jamais son montant. */
  readonly rewardGranted: boolean;
  /** Horloge injectée par la couche session (le noyau ne lit jamais l'heure). */
  readonly answeredAt: string;
}

export const attemptId = (gameId: GameId, requestId: string): string => `${gameId}:${requestId}`;

export interface PlayerLearningMemory {
  readonly schemaVersion: typeof LEARNING_SCHEMA_VERSION;
  readonly playerId: PlayerId;
  readonly knowledge: Readonly<Record<string, KnowledgeState>>;
  readonly categories: Readonly<Record<string, CategoryProgress>>;
  readonly attempts: readonly Attempt[];
  readonly updatedAt: string | null;
}

/**
 * Ce que le Learning Engine sait d'un joueur en dehors de sa mémoire : son
 * type de profil (frontière d'audience) et son niveau d'amorçage, dérivé par
 * la configuration (classe scolaire ou niveau initial adulte).
 */
export interface LearnerContext {
  readonly playerId: PlayerId;
  readonly profileType: ProfileType;
  readonly seedLevel: number;
}

export function emptyMemory(playerId: PlayerId): PlayerLearningMemory {
  return { schemaVersion: LEARNING_SCHEMA_VERSION, playerId, knowledge: {}, categories: {}, attempts: [], updatedAt: null };
}
