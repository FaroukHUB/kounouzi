import { questionRefKey, type KnowledgeSlot, type QuestionInstance } from "@/core/content/types";
import { isAudienceAllowed } from "@/core/shared";
import type { LearningConfig } from "./config";
import { daysBetween, isDue } from "./time";
import type { LearnerContext, PlayerLearningMemory } from "./types";
import { categoryProgressOf } from "./update";

/**
 * Sélection de la prochaine question : ZÉRO HASARD. Chaque créneau reçoit un
 * score pédagogique (révision due, faiblesse, proximité de la difficulté
 * cible, notion peu rencontrée, anti-répétition, nouveauté) puis un départage
 * STABLE : score → prochaine échéance → dernière rencontre → notion →
 * référence. Même mémoire + même catalogue ⇒ même question, quel que soit
 * l'ordre d'entrée des créneaux.
 */
export interface SelectionInput {
  readonly memory: PlayerLearningMemory;
  readonly learner: LearnerContext;
  readonly slots: readonly KnowledgeSlot[];
  readonly config: LearningConfig;
  /** Horloge injectée (ISO). */
  readonly now: string;
  /** Partie en cours : ce qui y a déjà été posé est fortement pénalisé (anti-répétition par partie). */
  readonly gameId?: string | undefined;
}

export interface ScoredSlot {
  readonly slot: KnowledgeSlot;
  readonly question: QuestionInstance;
  readonly refKey: string;
  readonly score: number;
  readonly reasons: readonly string[];
  readonly nextDueAt: string | null;
  readonly lastSeenAt: string | null;
}

export interface SelectionResult {
  readonly question: QuestionInstance;
  readonly slot: KnowledgeSlot;
  readonly score: number;
  readonly reasons: readonly string[];
}

/** Difficulté cible d'une catégorie pour ce joueur : son niveau estimé (amorcé par le niveau de départ). */
export function targetLevel(memory: PlayerLearningMemory, categoryId: string, learner: LearnerContext, config: LearningConfig): number {
  return categoryProgressOf(memory, categoryId, learner, config).estimatedLevel;
}

export function rankSlots(input: SelectionInput): readonly ScoredSlot[] {
  const { memory, learner, config, now } = input;
  const w = config.selectionWeights;
  const recent = memory.attempts.slice(-Math.max(config.antiRepetition.questionCooldownAttempts, config.antiRepetition.nodeCooldownAttempts, config.antiRepetition.categoryCooldownAttempts, 1));
  const recentRefs = new Set(recent.slice(-config.antiRepetition.questionCooldownAttempts).map((a) => questionRefKey(a.ref)));
  const recentNodes = new Set(recent.slice(-config.antiRepetition.nodeCooldownAttempts).map((a) => a.knowledgeNodeId));
  const recentCategories = new Set(recent.slice(-config.antiRepetition.categoryCooldownAttempts).map((a) => a.categoryId));
  // Exposition récente par catégorie : nombre d'essais de la catégorie dans la fenêtre (variété sans quota).
  const exposure = new Map<string, number>();
  for (const a of memory.attempts.slice(-config.antiRepetition.recentCategoryWindow)) exposure.set(a.categoryId, (exposure.get(a.categoryId) ?? 0) + 1);
  const inGame = input.gameId === undefined ? [] : memory.attempts.filter((a) => a.gameId === input.gameId);
  const gameRefs = new Set(inGame.map((a) => questionRefKey(a.ref)));
  const gameNodes = new Set(inGame.map((a) => a.knowledgeNodeId));

  const scored: ScoredSlot[] = [];
  for (const slot of input.slots) {
    // Frontière d'audience ABSOLUE, revérifiée ici : aucun moteur ne peut la contourner.
    if (!isAudienceAllowed(slot.audienceScope, learner.profileType)) continue;
    const ks = memory.knowledge[slot.knowledgeNodeId];
    const question = slot.instantiate(ks?.attempts ?? 0);
    if (!question || !isAudienceAllowed(question.audienceScope, learner.profileType)) continue;
    const refKey = questionRefKey(question.ref);
    const target = targetLevel(memory, slot.categoryId, learner, config);
    const reasons: string[] = [];
    let score = 0;

    const due = ks ? isDue(ks.nextDueAt, now) : false;
    if (due && ks) {
      score += w.due + Math.min(w.overdueDayCap, Math.max(0, daysBetween(ks.nextDueAt!, now))) * w.overdueDayBonus;
      reasons.push("révision due");
    }
    if (ks && ks.mastery < config.mastery.weakThreshold) {
      score += w.weakness * (1 - ks.mastery);
      reasons.push("faiblesse");
    }
    score -= w.distance * Math.abs(slot.difficulty - target);
    if (ks) {
      score += w.rarelySeen / (1 + ks.attempts);
      if (ks.mastery >= config.mastery.masteredThreshold && !due) {
        score -= w.mastered;
        reasons.push("déjà maîtrisée");
      }
    } else {
      score += w.rarelySeen + w.novelty;
      reasons.push("nouveauté");
    }
    if (recentRefs.has(refKey)) {
      score -= w.repeatQuestion;
      reasons.push("formulation récente");
    }
    if (gameRefs.has(refKey)) {
      score -= w.repeatInGame;
      reasons.push("déjà posée dans la partie");
    }
    if (!due && gameNodes.has(slot.knowledgeNodeId)) {
      score -= w.repeatNodeInGame;
      reasons.push("notion déjà vue dans la partie");
    }
    if (!due && recentNodes.has(slot.knowledgeNodeId)) {
      score -= w.repeatNode;
      reasons.push("notion récente");
    }
    if (!due && recentCategories.has(slot.categoryId)) {
      score -= w.sameCategory;
      reasons.push("catégorie récente");
    }
    const seenInWindow = exposure.get(slot.categoryId) ?? 0;
    if (!due && seenInWindow > 0 && w.categoryExposure > 0) {
      score -= w.categoryExposure * seenInWindow;
      reasons.push("catégorie sur-exposée");
    }
    scored.push({ slot, question, refKey, score: Math.round(score * 1000) / 1000, reasons, nextDueAt: ks?.nextDueAt ?? null, lastSeenAt: ks?.lastSeenAt ?? null });
  }
  return [...scored].sort(compareScored);
}

/** Ordre total et stable : indépendant de l'ordre d'entrée. */
export function compareScored(a: ScoredSlot, b: ScoredSlot): number {
  if (a.score !== b.score) return b.score - a.score;
  const due = compareNullable(a.nextDueAt, b.nextDueAt, "last");
  if (due !== 0) return due;
  const seen = compareNullable(a.lastSeenAt, b.lastSeenAt, "first");
  if (seen !== 0) return seen;
  if (a.slot.knowledgeNodeId !== b.slot.knowledgeNodeId) return a.slot.knowledgeNodeId < b.slot.knowledgeNodeId ? -1 : 1;
  if (a.refKey !== b.refKey) return a.refKey < b.refKey ? -1 : 1;
  return a.slot.slotId < b.slot.slotId ? -1 : a.slot.slotId > b.slot.slotId ? 1 : 0;
}

function compareNullable(a: string | null, b: string | null, nulls: "first" | "last"): number {
  if (a === b) return 0;
  if (a === null) return nulls === "first" ? -1 : 1;
  if (b === null) return nulls === "first" ? 1 : -1;
  return a < b ? -1 : 1;
}

export function selectQuestion(input: SelectionInput): SelectionResult | null {
  const best = rankSlots(input)[0];
  return best ? { question: best.question, slot: best.slot, score: best.score, reasons: best.reasons } : null;
}
