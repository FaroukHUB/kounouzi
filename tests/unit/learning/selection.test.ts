import { describe, expect, it } from "vitest";
import { CATEGORIES, GEO_FACTS } from "@/config/content";
import { LEARNING_CONFIG } from "@/config/learning";
import { createAlgorithmicProvider, createContentRegistry, createCuratedProvider, createFactualProvider, questionRefKey, type ContentRegistry, type QuestionInstance } from "@/core/content";
import { addDays, applyAttempt, attemptId, emptyMemory, rankSlots, selectQuestion, type Attempt, type LearnerContext, type PlayerLearningMemory } from "@/core/learning";
import { isAudienceAllowed, type AnswerOutcome, type GameId } from "@/core/shared";
import { TEST_ADULT_ONLY, TEST_ARABIC, TEST_CHILD_ONLY, TEST_CURATED } from "../../fixtures/content/curated.fixture";
import { pid } from "../../fixtures/game/setup.fixture";
import { T0 } from "../../fixtures/learning/resolve.fixture";

const cfg = LEARNING_CONFIG;
const game = "game-sel" as GameId;
const child: LearnerContext = { playerId: pid("maryam"), profileType: "child", seedLevel: 2 };
const adult: LearnerContext = { playerId: pid("papa"), profileType: "adult", seedLevel: 4 };

const fullRegistry = (): ContentRegistry => createContentRegistry(CATEGORIES, [createAlgorithmicProvider(), createFactualProvider(GEO_FACTS, { allowUnverified: true }), createCuratedProvider(TEST_CURATED, CATEGORIES)]);

/** Simule une réponse à la question choisie et l'enregistre (horloge avancée d'un pas fixe). */
function answerSelected(memory: PlayerLearningMemory, learner: LearnerContext, q: QuestionInstance, outcome: AnswerOutcome, at: string, n: number): PlayerLearningMemory {
  const a: Attempt = { id: attemptId(game, `q${n}`), playerId: learner.playerId, gameId: game, knowledgeNodeId: q.knowledgeNodeId, ref: q.ref, categoryId: q.categoryId, difficulty: q.difficulty, outcome, validationMode: "collective", explanationKnown: "none", rewardGranted: outcome !== "incorrect", answeredAt: at };
  return applyAttempt(memory, a, learner, cfg);
}

/** Boucle sélection → réponse selon une politique par catégorie ; renvoie la mémoire et les questions servies. */
function simulate(learner: LearnerContext, registry: ContentRegistry, rounds: number, policy: (q: QuestionInstance, i: number) => AnswerOutcome, minutesPerRound = 2) {
  let memory = emptyMemory(learner.playerId);
  const served: QuestionInstance[] = [];
  const slots = registry.slots(learner.profileType);
  for (let i = 0; i < rounds; i += 1) {
    const now = addDays(T0, (i * minutesPerRound) / 1440);
    const pick = selectQuestion({ memory, learner, slots, config: cfg, now });
    if (!pick) break;
    served.push(pick.question);
    memory = answerSelected(memory, learner, pick.question, policy(pick.question, i), now, i);
  }
  return { memory, served };
}

describe("sélection déterministe (aucun hasard)", () => {
  it("même mémoire + même catalogue ⇒ même question, quel que soit l'ordre des créneaux", () => {
    const registry = fullRegistry();
    const { memory } = simulate(child, registry, 15, (q) => (q.categoryId === "maths" ? "correct" : "incorrect"));
    const slots = registry.slots("child");
    const a = selectQuestion({ memory, learner: child, slots, config: cfg, now: addDays(T0, 1) });
    const b = selectQuestion({ memory, learner: child, slots, config: cfg, now: addDays(T0, 1) });
    const c = selectQuestion({ memory, learner: child, slots: [...slots].reverse(), config: cfg, now: addDays(T0, 1) });
    expect(a).not.toBeNull();
    expect(b).toEqual(a);
    expect(c).toEqual(a);
    // L'ordre complet est lui aussi stable.
    const r1 = rankSlots({ memory, learner: child, slots, config: cfg, now: addDays(T0, 1) }).map((s) => s.refKey);
    const r2 = rankSlots({ memory, learner: child, slots: [...slots].reverse(), config: cfg, now: addDays(T0, 1) }).map((s) => s.refKey);
    expect(r2).toEqual(r1);
  });

  it("le premier choix d'un joueur inconnu vise sa difficulté d'amorçage", () => {
    const registry = fullRegistry();
    const first = selectQuestion({ memory: emptyMemory(child.playerId), learner: child, slots: registry.slots("child"), config: cfg, now: T0 })!;
    expect(first.question.difficulty).toBe(2);
    const adultFirst = selectQuestion({ memory: emptyMemory(adult.playerId), learner: adult, slots: registry.slots("adult"), config: cfg, now: T0 })!;
    expect(adultFirst.question.difficulty).toBe(4);
  });
});

describe("frontière d'audience absolue", () => {
  it("1 000 sélections simulées : jamais `adult` pour un enfant, jamais `child` pour un adulte", () => {
    const registry = createContentRegistry(CATEGORIES, [createCuratedProvider(TEST_CURATED, CATEGORIES), createAlgorithmicProvider()]);
    for (const learner of [child, adult]) {
      const { served } = simulate(learner, registry, 500, (_q, i) => (["correct", "partial", "incorrect"] as const)[i % 3]!, 30);
      expect(served.length).toBe(500);
      for (const q of served) {
        expect(isAudienceAllowed(q.audienceScope, learner.profileType)).toBe(true);
        expect(q.audienceScope).not.toBe(learner.profileType === "child" ? "adult" : "child");
      }
      // Les créneaux réservés à l'autre audience n'apparaissent jamais, même quand tout le reste a été vu.
      const forbidden = new Set((learner.profileType === "child" ? TEST_ADULT_ONLY : TEST_CHILD_ONLY).map((q) => q.id));
      expect(served.some((q) => q.ref.origin === "curated" && forbidden.has(q.ref.questionId))).toBe(false);
      const own = new Set((learner.profileType === "child" ? TEST_CHILD_ONLY : TEST_ADULT_ONLY).map((q) => q.id));
      expect(served.some((q) => q.ref.origin === "curated" && own.has(q.ref.questionId))).toBe(true);
    }
  });

  it("vivier vide pour son audience : rien n'est servi, jamais l'autre audience", () => {
    const adultOnly = createContentRegistry(CATEGORIES, [createCuratedProvider(TEST_ADULT_ONLY, CATEGORIES)]);
    expect(adultOnly.slots("child")).toEqual([]);
    expect(selectQuestion({ memory: emptyMemory(child.playerId), learner: child, slots: adultOnly.slots("child"), config: cfg, now: T0 })).toBeNull();
    // Même en injectant des créneaux interdits, le Learning Engine les refuse.
    expect(selectQuestion({ memory: emptyMemory(child.playerId), learner: child, slots: adultOnly.slots("adult"), config: cfg, now: T0 })).toBeNull();
  });
});

describe("révision, anti-répétition et convergence", () => {
  it("une question non due n'est pas répétée immédiatement ; une notion due remonte en priorité", () => {
    const registry = createContentRegistry(CATEGORIES, [createCuratedProvider(TEST_ARABIC, CATEGORIES), createAlgorithmicProvider()]);
    const slots = registry.slots("child");
    let memory = emptyMemory(child.playerId);
    const first = selectQuestion({ memory, learner: child, slots, config: cfg, now: T0 })!.question;
    memory = answerSelected(memory, child, first, "correct", T0, 0);
    const second = selectQuestion({ memory, learner: child, slots, config: cfg, now: addDays(T0, 0.001) })!.question;
    expect(questionRefKey(second.ref)).not.toBe(questionRefKey(first.ref));
    expect(second.knowledgeNodeId).not.toBe(first.knowledgeNodeId);
    // Quelques jours plus tard, la notion répondue est due : elle passe devant tout le reste.
    const later = selectQuestion({ memory, learner: child, slots, config: cfg, now: addDays(T0, 5) })!;
    expect(later.question.knowledgeNodeId).toBe(first.knowledgeNodeId);
    expect(later.reasons).toContain("révision due");
  });

  it("une formulation algorithmique change d'un essai à l'autre sur la même notion", () => {
    const registry = createContentRegistry(CATEGORIES, [createAlgorithmicProvider()]);
    const slots = registry.slots("child").filter((s) => s.knowledgeNodeId === "maths.addition.d2");
    let memory = emptyMemory(child.playerId);
    const keys = new Set<string>();
    for (let i = 0; i < 6; i += 1) {
      const q = selectQuestion({ memory, learner: child, slots, config: cfg, now: addDays(T0, i) })!.question;
      keys.add(questionRefKey(q.ref));
      memory = answerSelected(memory, child, q, "correct", addDays(T0, i), i);
    }
    expect(keys.size).toBe(6);
  });

  it("convergence : fort en maths, faible en arabe → difficultés différentes par catégorie, dans une seule mémoire", () => {
    const registry = createContentRegistry(CATEGORIES, [createAlgorithmicProvider(), createCuratedProvider(TEST_ARABIC, CATEGORIES)]);
    const { memory, served } = simulate(child, registry, 120, (q) => (q.categoryId === "maths" ? "correct" : "incorrect"));
    const maths = memory.categories["maths"]!;
    const arabic = memory.categories["arabic"]!;
    expect(maths.estimatedLevel).toBeGreaterThanOrEqual(4);
    expect(arabic.estimatedLevel).toBe(cfg.level.min);
    const late = served.slice(-30);
    const avg = (c: string) => late.filter((q) => q.categoryId === c).reduce((s, q, _, arr) => s + q.difficulty / arr.length, 0);
    expect(avg("maths")).toBeGreaterThan(avg("arabic") + 1);
    expect(served.filter((q) => q.categoryId === "arabic").length).toBeGreaterThan(10);
  });
});
