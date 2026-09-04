import type { LearningConfig } from "./config";
import { addDays } from "./time";
import type { Attempt, CategoryProgress, KnowledgeState, LearnerContext, PlayerLearningMemory } from "./types";

const clamp = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));
const round2 = (x: number) => Math.round(x * 1000) / 1000;

export function outcomeWeight(config: LearningConfig, outcome: Attempt["outcome"]): number {
  return config.outcomeWeights[outcome];
}

export function initialCategoryProgress(categoryId: string, seedLevel: number, config: LearningConfig): CategoryProgress {
  return { categoryId, estimatedLevel: clamp(seedLevel, config.level.min, config.level.max), seedLevel, attempts: 0, successes: 0, partials: 0, failures: 0, window: [], lastAdjustedAt: null };
}

/** Progression d'une catégorie, amorcée par le niveau de départ si elle n'existe pas encore. */
export function categoryProgressOf(memory: PlayerLearningMemory, categoryId: string, learner: LearnerContext, config: LearningConfig): CategoryProgress {
  return memory.categories[categoryId] ?? initialCategoryProgress(categoryId, learner.seedLevel, config);
}

/**
 * Enregistre un essai terminé. Pure et idempotente : un essai déjà connu (même
 * `id`) ne change rien. Seuls `outcome`, `difficulty`, la notion et la date
 * comptent ; `explanationKnown` et `rewardGranted` sont conservés dans le
 * journal mais n'influencent ni la maîtrise ni le niveau.
 */
export function applyAttempt(memory: PlayerLearningMemory, attempt: Attempt, learner: LearnerContext, config: LearningConfig): PlayerLearningMemory {
  if (attempt.playerId !== memory.playerId) throw new Error(`essai du joueur ${attempt.playerId} appliqué à la mémoire de ${memory.playerId}`);
  if (memory.attempts.some((a) => a.id === attempt.id)) return memory;
  const w = outcomeWeight(config, attempt.outcome);

  const previous = memory.knowledge[attempt.knowledgeNodeId];
  const knowledge = nextKnowledge(previous, attempt, w, config);
  const category = nextCategory(categoryProgressOf(memory, attempt.categoryId, learner, config), attempt, w, config);

  return {
    ...memory,
    knowledge: { ...memory.knowledge, [attempt.knowledgeNodeId]: knowledge },
    categories: { ...memory.categories, [attempt.categoryId]: category },
    attempts: [...memory.attempts, attempt],
    updatedAt: attempt.answeredAt,
  };
}

function nextKnowledge(previous: KnowledgeState | undefined, attempt: Attempt, w: number, config: LearningConfig): KnowledgeState {
  const maxBox = config.spacing.intervalsDays.length - 1;
  const prevBox = previous?.box ?? 0;
  const box = attempt.outcome === "correct" ? Math.min(maxBox, prevBox + 1) : attempt.outcome === "partial" ? (config.spacing.partialKeepsBox ? prevBox : Math.max(0, prevBox - 1)) : 0;
  const base = previous && previous.attempts > 0 ? previous.mastery : config.mastery.prior;
  const mastery = base + config.mastery.alpha * (w - base);
  return {
    knowledgeNodeId: attempt.knowledgeNodeId,
    categoryId: attempt.categoryId,
    mastery: round2(mastery),
    attempts: (previous?.attempts ?? 0) + 1,
    successes: (previous?.successes ?? 0) + (attempt.outcome === "correct" ? 1 : 0),
    partials: (previous?.partials ?? 0) + (attempt.outcome === "partial" ? 1 : 0),
    failures: (previous?.failures ?? 0) + (attempt.outcome === "incorrect" ? 1 : 0),
    box,
    lastSeenAt: attempt.answeredAt,
    nextDueAt: addDays(attempt.answeredAt, config.spacing.intervalsDays[box]!),
    lastDifficulty: attempt.difficulty,
  };
}

/**
 * Niveau par catégorie : évolution LENTE. Seuls les essais dont la difficulté
 * est proche du niveau estimé sont informatifs ; il faut `minAttempts` essais
 * informatifs pour un ajustement d'un `step`, puis la fenêtre repart de zéro.
 */
function nextCategory(previous: CategoryProgress, attempt: Attempt, w: number, config: LearningConfig): CategoryProgress {
  const { level } = config;
  const informative = Math.abs(attempt.difficulty - previous.estimatedLevel) <= level.informativeDistance;
  let window = informative ? [...previous.window, w] : [...previous.window];
  let estimatedLevel = previous.estimatedLevel;
  let lastAdjustedAt = previous.lastAdjustedAt;
  if (window.length >= level.minAttempts) {
    const mean = window.reduce((s, x) => s + x, 0) / window.length;
    if (mean >= level.upThreshold) {
      estimatedLevel = clamp(round2(previous.estimatedLevel + level.step), level.min, level.max);
      window = [];
      lastAdjustedAt = attempt.answeredAt;
    } else if (mean <= level.downThreshold) {
      estimatedLevel = clamp(round2(previous.estimatedLevel - level.step), level.min, level.max);
      window = [];
      lastAdjustedAt = attempt.answeredAt;
    } else if (window.length > level.windowSize) {
      window = window.slice(window.length - level.windowSize);
    }
  }
  return {
    ...previous,
    estimatedLevel,
    attempts: previous.attempts + 1,
    successes: previous.successes + (attempt.outcome === "correct" ? 1 : 0),
    partials: previous.partials + (attempt.outcome === "partial" ? 1 : 0),
    failures: previous.failures + (attempt.outcome === "incorrect" ? 1 : 0),
    window,
    lastAdjustedAt,
  };
}
