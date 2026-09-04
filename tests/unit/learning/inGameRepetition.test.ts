import { describe, expect, it } from "vitest";
import { LEARNING_CONFIG, learnerContextFor } from "@/config/learning";
import { contentRegistry } from "@/config/content";
import { applyAttempt, attemptId, emptyMemory, rankSlots, selectQuestion, type PlayerLearningMemory } from "@/core/learning";
import { pid } from "../../fixtures/game/setup.fixture";
import { T0 } from "../../fixtures/learning/resolve.fixture";

/** Joue `n` questions de maths dans la partie `gameId` en enregistrant chaque essai. */
function playGame(memory: PlayerLearningMemory, gameId: string, n: number, learner = learnerContextFor({ id: pid("p1"), profileType: "child", age: 8 })) {
  const slots = contentRegistry().slots("child").filter((s) => s.categoryId === "maths");
  const refs: string[] = [];
  let m = memory;
  for (let i = 0; i < n; i += 1) {
    const q = selectQuestion({ memory: m, learner, slots, config: LEARNING_CONFIG, now: T0, gameId })!.question;
    refs.push(JSON.stringify(q.ref));
    m = applyAttempt(m, { id: attemptId(gameId as never, `q${i + 1}`), playerId: pid("p1"), gameId: gameId as never, knowledgeNodeId: q.knowledgeNodeId, ref: q.ref, categoryId: q.categoryId, difficulty: q.difficulty, outcome: "correct", validationMode: "collective", explanationKnown: "none", rewardGranted: true, answeredAt: T0 }, learner, LEARNING_CONFIG);
  }
  return { memory: m, refs };
}

describe("anti-répétition PAR PARTIE (Phase 5.4)", () => {
  it("dans une même partie, une formulation déjà posée n'est jamais reprise tant qu'il en reste d'autres ; les notions déjà vues passent après", () => {
    const { refs, memory } = playGame(emptyMemory(pid("p1")), "game-A", 12);
    expect(new Set(refs).size).toBe(refs.length);
    const learner = learnerContextFor({ id: pid("p1"), profileType: "child", age: 8 });
    const slots = contentRegistry().slots("child").filter((s) => s.categoryId === "maths");
    const ranked = rankSlots({ memory, learner, slots, config: LEARNING_CONFIG, now: T0, gameId: "game-A" });
    // Tout ce qui a été posé dans la partie porte la raison correspondante et se trouve derrière ce qui ne l'a pas été.
    const asked = ranked.filter((r) => r.reasons.includes("déjà posée dans la partie"));
    const fresh = ranked.filter((r) => !r.reasons.includes("déjà posée dans la partie"));
    expect(asked.length).toBeGreaterThan(0);
    expect(Math.max(...asked.map((r) => r.score))).toBeLessThan(Math.min(...fresh.map((r) => r.score)));
  });

  it("la pénalité est propre à la partie : une nouvelle partie ne pénalise pas ce qui a été posé dans l'ancienne (seule la fenêtre récente habituelle joue)", () => {
    const first = playGame(emptyMemory(pid("p1")), "game-A", 3);
    const learner = learnerContextFor({ id: pid("p1"), profileType: "child", age: 8 });
    const slots = contentRegistry().slots("child").filter((s) => s.categoryId === "maths");
    const inNewGame = rankSlots({ memory: first.memory, learner, slots, config: LEARNING_CONFIG, now: T0, gameId: "game-B" });
    expect(inNewGame.some((r) => r.reasons.includes("déjà posée dans la partie"))).toBe(false);
    expect(LEARNING_CONFIG.selectionWeights.repeatInGame).toBeGreaterThan(LEARNING_CONFIG.selectionWeights.repeatQuestion);
    expect(LEARNING_CONFIG.antiRepetition.questionCooldownAttempts).toBeGreaterThanOrEqual(20);
  });
});
