import type { LearningConfig } from "./config";
import { isDue } from "./time";
import type { PlayerLearningMemory } from "./types";

/**
 * Agrégations « Mes Trésors » — première base. Uniquement des données
 * DÉRIVÉES de la mémoire (aucun compteur dupliqué), calculées à la demande.
 */
export interface CategoryStats {
  readonly categoryId: string;
  readonly estimatedLevel: number;
  readonly seedLevel: number;
  readonly attempts: number;
  readonly successes: number;
  readonly partials: number;
  readonly failures: number;
  readonly nodesEncountered: number;
  readonly nodesMastered: number;
  readonly revisionsDue: number;
}

export interface LearningSummary {
  readonly playerId: string;
  /** Notions rencontrées au moins une fois. */
  readonly nodesEncountered: number;
  /** Notions dont la maîtrise dépasse le seuil configuré. */
  readonly nodesMastered: number;
  readonly questionsAnswered: number;
  readonly questionsSucceeded: number;
  readonly questionsPartial: number;
  readonly questionsFailed: number;
  readonly revisionsDue: number;
  /** Notions distinctes dont l'explication a été déclarée connue en français (au moins une fois). */
  readonly explanationsKnownFr: number;
  /** Idem en arabe. */
  readonly explanationsKnownAr: number;
  readonly byCategory: readonly CategoryStats[];
}

export function summarizeMemory(memory: PlayerLearningMemory, config: LearningConfig, now: string): LearningSummary {
  const nodes = Object.values(memory.knowledge);
  const knownFr = new Set<string>();
  const knownAr = new Set<string>();
  for (const a of memory.attempts) {
    if (a.explanationKnown === "fr" || a.explanationKnown === "both") knownFr.add(a.knowledgeNodeId);
    if (a.explanationKnown === "ar" || a.explanationKnown === "both") knownAr.add(a.knowledgeNodeId);
  }
  const byCategory = Object.values(memory.categories)
    .map((c): CategoryStats => {
      const inCategory = nodes.filter((n) => n.categoryId === c.categoryId);
      return {
        categoryId: c.categoryId,
        estimatedLevel: c.estimatedLevel,
        seedLevel: c.seedLevel,
        attempts: c.attempts,
        successes: c.successes,
        partials: c.partials,
        failures: c.failures,
        nodesEncountered: inCategory.length,
        nodesMastered: inCategory.filter((n) => n.mastery >= config.mastery.masteredThreshold).length,
        revisionsDue: inCategory.filter((n) => isDue(n.nextDueAt, now)).length,
      };
    })
    .sort((a, b) => (a.categoryId < b.categoryId ? -1 : a.categoryId > b.categoryId ? 1 : 0));
  return {
    playerId: memory.playerId,
    nodesEncountered: nodes.length,
    nodesMastered: nodes.filter((n) => n.mastery >= config.mastery.masteredThreshold).length,
    questionsAnswered: memory.attempts.length,
    questionsSucceeded: memory.attempts.filter((a) => a.outcome === "correct").length,
    questionsPartial: memory.attempts.filter((a) => a.outcome === "partial").length,
    questionsFailed: memory.attempts.filter((a) => a.outcome === "incorrect").length,
    revisionsDue: nodes.filter((n) => isDue(n.nextDueAt, now)).length,
    explanationsKnownFr: knownFr.size,
    explanationsKnownAr: knownAr.size,
    byCategory,
  };
}
