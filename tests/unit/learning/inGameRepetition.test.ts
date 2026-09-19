import { describe, expect, it } from "vitest";
import { LEARNING_CONFIG, learnerContextFor } from "@/config/learning";
import { contentRegistry } from "@/config/content";
import { MATHS_MODELS } from "@/core/content";
import { applyAttempt, attemptId, emptyMemory, rankSlots, selectQuestion, type PlayerLearningMemory } from "@/core/learning";
import { pid } from "../../fixtures/game/setup.fixture";
import { T0 } from "../../fixtures/learning/resolve.fixture";

const mathsSlotsOf = (kind?: "static" | "parametric") =>
  contentRegistry()
    .slots("child")
    .filter((s) => s.categoryId === "maths")
    .filter((s) => kind === undefined || MATHS_MODELS.some((m) => m.kind === kind && s.slotId.endsWith(m.id)));

/** Joue `n` questions de maths dans la partie `gameId` en enregistrant chaque essai. */
function playGame(memory: PlayerLearningMemory, gameId: string, n: number, learner = learnerContextFor({ id: pid("p1"), profileType: "child", age: 8 }), slotsOverride?: ReturnType<typeof mathsSlotsOf>) {
  const slots = slotsOverride ?? mathsSlotsOf();
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
  it("dans une même partie, une formulation déjà posée n'est jamais reprise tant qu'il en reste d'autres", () => {
    const { refs } = playGame(emptyMemory(pid("p1")), "game-A", 12);
    expect(new Set(refs).size).toBe(refs.length);
  });

  it("une formulation qui reviendrait à l'identique dans la partie repasse derrière toutes celles qui n'ont pas été posées", () => {
    // Les modèles STATIQUES sont le cas pur : leurs nombres SONT la démonstration,
    // la formulation suivante serait donc rigoureusement la même. Un modèle
    // paramétrique, lui, propose une variante inédite au tour d'après : il n'a
    // rien à pénaliser, et c'est le comportement recherché.
    const slots = mathsSlotsOf("static");
    expect(slots.length).toBe(MATHS_MODELS.filter((m) => m.kind === "static").length);
    const { memory } = playGame(emptyMemory(pid("p1")), "game-A", 1, undefined, slots);
    const learner = learnerContextFor({ id: pid("p1"), profileType: "child", age: 8 });
    const ranked = rankSlots({ memory, learner, slots, config: LEARNING_CONFIG, now: T0, gameId: "game-A" });
    const asked = ranked.filter((r) => r.reasons.includes("déjà posée dans la partie"));
    const fresh = ranked.filter((r) => !r.reasons.includes("déjà posée dans la partie"));
    expect(asked.length).toBe(1);
    expect(fresh.length).toBe(slots.length - 1);
    expect(Math.max(...asked.map((r) => r.score))).toBeLessThan(Math.min(...fresh.map((r) => r.score)));
  });

  it("la pénalité est propre à la partie : une nouvelle partie ne pénalise pas ce qui a été posé dans l'ancienne (seule la fenêtre récente habituelle joue)", () => {
    const first = playGame(emptyMemory(pid("p1")), "game-A", 3);
    const learner = learnerContextFor({ id: pid("p1"), profileType: "child", age: 8 });
    const slots = mathsSlotsOf();
    const inNewGame = rankSlots({ memory: first.memory, learner, slots, config: LEARNING_CONFIG, now: T0, gameId: "game-B" });
    expect(inNewGame.some((r) => r.reasons.includes("déjà posée dans la partie"))).toBe(false);
    expect(LEARNING_CONFIG.selectionWeights.repeatInGame).toBeGreaterThan(LEARNING_CONFIG.selectionWeights.repeatQuestion);
    expect(LEARNING_CONFIG.antiRepetition.questionCooldownAttempts).toBeGreaterThanOrEqual(20);
  });
});
