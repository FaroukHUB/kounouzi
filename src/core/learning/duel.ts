import type { KnowledgeSlot } from "@/core/content/types";
import type { LearningConfig } from "./config";
import { rankSlots } from "./select";
import type { LearnerContext, PlayerLearningMemory } from "./types";

export interface DuelParticipant {
  readonly memory: PlayerLearningMemory;
  readonly learner: LearnerContext;
  /** Créneaux jouables pour CE joueur (audience déjà appliquée). */
  readonly slots: readonly KnowledgeSlot[];
}

export interface DuelCategoryInput {
  readonly challenger: DuelParticipant;
  readonly opponent: DuelParticipant;
  readonly config: LearningConfig;
  readonly now: string;
}

export interface DuelCategoryChoice {
  readonly categoryId: string;
  /** Score combiné (somme symétrique des deux besoins). */
  readonly score: number;
  readonly challengerScore: number;
  readonly opponentScore: number;
  /** Catégories communes candidates, dans l'ordre stable d'évaluation. */
  readonly candidates: readonly string[];
}

/** Catégories où les DEUX joueurs possèdent du contenu autorisé pour leur audience (ordre alphabétique stable). */
export function commonEligibleCategories(challenger: DuelParticipant, opponent: DuelParticipant): readonly string[] {
  const a = new Set(challenger.slots.map((s) => s.categoryId));
  const b = new Set(opponent.slots.map((s) => s.categoryId));
  return [...a].filter((c) => b.has(c)).sort();
}

/**
 * Catégorie d'un Duel : elle n'appartient ni au défieur ni à l'adversaire,
 * elle appartient au Duel. Pour chaque catégorie commune, le besoin de
 * chaque joueur est le meilleur score pédagogique de ses créneaux dans cette
 * catégorie (révision due, faiblesse, proximité de sa difficulté, notion
 * peu vue, anti-répétition, exposition récente). Le score du Duel est la
 * SOMME des deux besoins : inverser défieur et adversaire ne change rien.
 * Départage stable par identifiant de catégorie. Aucun hasard.
 */
export function selectDuelCategory({ challenger, opponent, config, now }: DuelCategoryInput): DuelCategoryChoice | null {
  const candidates = commonEligibleCategories(challenger, opponent);
  let best: DuelCategoryChoice | null = null;
  for (const categoryId of candidates) {
    const need = (p: DuelParticipant) => rankSlots({ memory: p.memory, learner: p.learner, slots: p.slots.filter((s) => s.categoryId === categoryId), config, now })[0]?.score;
    const c = need(challenger);
    const o = need(opponent);
    if (c === undefined || o === undefined) continue;
    const score = Math.round((c + o) * 1000) / 1000;
    if (!best || score > best.score) best = { categoryId, score, challengerScore: c, opponentScore: o, candidates };
  }
  return best;
}
