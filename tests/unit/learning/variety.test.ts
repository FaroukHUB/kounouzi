import { describe, expect, it } from "vitest";
import { CATEGORIES, GEO_FACTS } from "@/config/content";
import { LEARNING_CONFIG } from "@/config/learning";
import { createAlgorithmicProvider, createContentRegistry, createCuratedProvider, createFactualProvider, type ContentRegistry, type QuestionInstance } from "@/core/content";
import { addDays, applyAttempt, attemptId, emptyMemory, selectQuestion, type Attempt, type LearnerContext, type LearningConfig, type PlayerLearningMemory } from "@/core/learning";
import type { AnswerOutcome, GameId } from "@/core/shared";
import { TEST_ARABIC } from "../../fixtures/content/curated.fixture";
import { pid } from "../../fixtures/game/setup.fixture";
import { T0 } from "../../fixtures/learning/resolve.fixture";

const game = "game-variety" as GameId;
const child: LearnerContext = { playerId: pid("maryam"), profileType: "child", seedLevel: 2 };
const adult: LearnerContext = { playerId: pid("papa"), profileType: "adult", seedLevel: 4 };
const registry = (): ContentRegistry => createContentRegistry(CATEGORIES, [createAlgorithmicProvider(), createFactualProvider(GEO_FACTS, { allowUnverified: true }), createCuratedProvider(TEST_ARABIC, CATEGORIES)]);

function record(memory: PlayerLearningMemory, learner: LearnerContext, q: QuestionInstance, outcome: AnswerOutcome, at: string, n: number, cfg: LearningConfig): PlayerLearningMemory {
  const a: Attempt = { id: attemptId(game, `q${n}`), playerId: learner.playerId, gameId: game, knowledgeNodeId: q.knowledgeNodeId, ref: q.ref, categoryId: q.categoryId, difficulty: q.difficulty, outcome, validationMode: "collective", explanationKnown: "none", rewardGranted: outcome !== "incorrect", answeredAt: at };
  return applyAttempt(memory, a, learner, cfg);
}

/** 200 sélections sans urgence pédagogique majeure : deux tiers de bonnes réponses, quel que soit le sujet. */
function shares(learner: LearnerContext, cfg: LearningConfig, rounds = 200) {
  const slots = registry().slots(learner.profileType);
  let memory = emptyMemory(learner.playerId);
  const counts: Record<string, number> = {};
  for (let i = 0; i < rounds; i += 1) {
    const now = addDays(T0, i / 24);
    const pick = selectQuestion({ memory, learner, slots, config: cfg, now })!;
    counts[pick.question.categoryId] = (counts[pick.question.categoryId] ?? 0) + 1;
    memory = record(memory, learner, pick.question, i % 3 === 2 ? "partial" : "correct", now, i, cfg);
  }
  return Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, v / rounds]));
}

const WITHOUT: LearningConfig = { ...LEARNING_CONFIG, selectionWeights: { ...LEARNING_CONFIG.selectionWeights, categoryExposure: 0 } };

describe("variété des catégories (exposition récente, sans quota rigide)", () => {
  it.each([child, adult])("$profileType : aucune catégorie disponible ne monopolise les 200 sélections", (learner) => {
    const after = shares(learner, LEARNING_CONFIG);
    const before = shares(learner, WITHOUT);
    const max = (s: Record<string, number>) => Math.max(...Object.values(s));
    expect(Object.keys(after).sort()).toEqual(["arabic", "geography", "maths"]);
    expect(max(after)).toBeLessThanOrEqual(0.5);
    // La banque arabe de test ne compte que 8 questions : sa part est bornée par son vivier, pas par le moteur.
    for (const c of ["arabic", "geography", "maths"]) expect(after[c]).toBeGreaterThanOrEqual(0.15);
    // Sans le mécanisme, le vivier algorithmique infini pèse nettement plus lourd.
    expect(max(before)).toBeGreaterThan(max(after));
  });

  it("une révision réellement due en maths passe devant la variété, même après une série de maths", () => {
    const slots = registry().slots("child");
    let memory = emptyMemory(child.playerId);
    // Six essais de maths d'affilée (fenêtre saturée) ; le premier concerne une notion qui sera due.
    const mathsSlots = slots.filter((s) => s.categoryId === "maths" && s.difficulty === 2);
    let dueNode = "";
    for (let i = 0; i < 6; i += 1) {
      const q = mathsSlots[i]!.instantiate(0)!;
      if (i === 0) dueNode = q.knowledgeNodeId;
      memory = record(memory, child, q, i === 0 ? "incorrect" : "correct", addDays(T0, i / 24), i, LEARNING_CONFIG);
    }
    // Juste après la série : la variété pousse vers une autre catégorie.
    const soon = selectQuestion({ memory, learner: child, slots, config: LEARNING_CONFIG, now: addDays(T0, 6 / 24) })!;
    expect(soon.question.categoryId).not.toBe("maths");
    // Deux jours plus tard, la notion ratée est due : elle passe devant tout le reste.
    const later = selectQuestion({ memory, learner: child, slots, config: LEARNING_CONFIG, now: addDays(T0, 2) })!;
    expect(later.question.knowledgeNodeId).toBe(dueNode);
    expect(later.reasons).toContain("révision due");
  });
});
