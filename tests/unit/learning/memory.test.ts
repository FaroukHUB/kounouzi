import { describe, expect, it } from "vitest";
import { LEARNING_CONFIG, ageOf, learnerContextFor, seedLevelFor } from "@/config/learning";
import type { QuestionRef } from "@/core/content";
import { addDays, applyAttempt, attemptId, deserializeMemory, emptyMemory, learningConfigSchema, serializeMemory, summarizeMemory, type Attempt, type LearnerContext, type PlayerLearningMemory } from "@/core/learning";
import type { AnswerOutcome, ExplanationMastery, GameId } from "@/core/shared";
import { pid } from "../../fixtures/game/setup.fixture";
import { T0 } from "../../fixtures/learning/resolve.fixture";

const cfg = LEARNING_CONFIG;
const game = "game-mem" as GameId;
const child: LearnerContext = { playerId: pid("maryam"), profileType: "child", seedLevel: 2 };
const adult: LearnerContext = { playerId: pid("papa"), profileType: "adult", seedLevel: 4 };

const ref = (node: string, n: number): QuestionRef => ({ origin: "algorithmic", generatorId: "maths.addition", generatorVersion: 1, knowledgeNodeId: node, difficulty: 2, params: { a: n, b: 1 } });

let counter = 0;
function attempt(learner: LearnerContext, categoryId: string, node: string, difficulty: number, outcome: AnswerOutcome, extra: Partial<Pick<Attempt, "explanationKnown" | "rewardGranted" | "answeredAt" | "validationMode">> = {}): Attempt {
  counter += 1;
  return {
    id: attemptId(game, `q${counter}`),
    playerId: learner.playerId,
    gameId: game,
    knowledgeNodeId: node,
    ref: ref(node, counter),
    categoryId,
    difficulty,
    outcome,
    validationMode: extra.validationMode ?? "collective",
    explanationKnown: extra.explanationKnown ?? "none",
    rewardGranted: extra.rewardGranted ?? outcome !== "incorrect",
    answeredAt: extra.answeredAt ?? addDays(T0, counter / 100),
  };
}

function play(memory: PlayerLearningMemory, learner: LearnerContext, plan: readonly { categoryId: string; node: string; difficulty: number; outcome: AnswerOutcome; mastery?: ExplanationMastery }[]): PlayerLearningMemory {
  return plan.reduce((m, p) => applyAttempt(m, attempt(learner, p.categoryId, p.node, p.difficulty, p.outcome, { explanationKnown: p.mastery ?? "none" }), learner, cfg), memory);
}

describe("configuration du Learning Engine (données)", () => {
  it("learning.v1.json est valide et porte les coefficients provisoires isolés", () => {
    expect(learningConfigSchema.safeParse(cfg).success).toBe(true);
    expect(cfg.outcomeWeights).toEqual({ correct: 1, partial: 0.5, incorrect: 0 });
    expect(cfg.level.step).toBe(0.5);
    expect(cfg.level.minAttempts).toBeGreaterThan(1);
  });

  it("l'amorçage vient de l'ÂGE (jamais de la classe : même point de départ en France et en Algérie) ou du niveau initial adulte", () => {
    expect(seedLevelFor({ profileType: "child", age: 6 })).toBe(1.5);
    expect(seedLevelFor({ profileType: "child", age: 7 })).toBe(2);
    expect(seedLevelFor({ profileType: "child", age: 9 })).toBe(2.5);
    expect(seedLevelFor({ profileType: "child", age: 11 })).toBe(3);
    expect(seedLevelFor({ profileType: "child", age: 15 })).toBe(4);
    expect(seedLevelFor({ profileType: "child" })).toBe(1.5);
    expect(ageOf({ profileType: "child", child: { birthYear: 2018 } }, "2026-09-04T00:00:00Z")).toBe(8);
    expect(ageOf({ profileType: "adult" }, "2026-09-04T00:00:00Z")).toBeUndefined();
    // Progression LENTE (Phase 5.4) : au moins six essais informatifs, seuil de montée relevé.
    expect(cfg.level.minAttempts).toBeGreaterThanOrEqual(6);
    expect(cfg.level.upThreshold).toBeGreaterThanOrEqual(0.85);
    expect(seedLevelFor({ profileType: "adult" })).toBe(4);
    expect(seedLevelFor({ profileType: "adult", initialLevel: "discovery" })).toBe(3);
    expect(learnerContextFor({ id: pid("x"), profileType: "adult" })).toEqual({ playerId: "x", profileType: "adult", seedLevel: 4 });
  });
});

describe("mémoire pédagogique par joueur (enfant ou adulte, même modèle)", () => {
  it("enfant de 7 ans : bonnes réponses en maths, erreurs en arabe → maths ↑, arabe ↓, indépendamment", () => {
    const plan = Array.from({ length: 12 }, (_, i) => [
      { categoryId: "maths", node: `maths.addition.d2`, difficulty: 2, outcome: "correct" as const },
      { categoryId: "arabic", node: `arabic.vocab.${i}`, difficulty: 2, outcome: "incorrect" as const },
    ]).flat();
    const m = play(emptyMemory(child.playerId), child, plan);
    expect(m.categories["maths"]!.estimatedLevel).toBeGreaterThan(2);
    expect(m.categories["arabic"]!.estimatedLevel).toBeLessThan(2);
    expect(m.categories["arabic"]!.estimatedLevel).toBeGreaterThanOrEqual(cfg.level.min);
    expect(m.categories["maths"]!.seedLevel).toBe(2);
  });

  it("le niveau évolue LENTEMENT : ni +1 sur une bonne réponse, ni −1 sur une erreur", () => {
    const one = play(emptyMemory(child.playerId), child, [{ categoryId: "maths", node: "maths.addition.d2", difficulty: 2, outcome: "correct" }]);
    expect(one.categories["maths"]!.estimatedLevel).toBe(2);
    const miss = play(emptyMemory(child.playerId), child, [{ categoryId: "maths", node: "maths.addition.d2", difficulty: 2, outcome: "incorrect" }]);
    expect(miss.categories["maths"]!.estimatedLevel).toBe(2);
    const four = play(emptyMemory(child.playerId), child, Array.from({ length: cfg.level.minAttempts }, () => ({ categoryId: "maths", node: "maths.addition.d2", difficulty: 2, outcome: "correct" as const })));
    expect(four.categories["maths"]!.estimatedLevel).toBe(2.5);
  });

  it("adulte sans classe scolaire : la mémoire fonctionne exactement de la même façon, amorcée par son niveau initial", () => {
    const m = play(emptyMemory(adult.playerId), adult, Array.from({ length: 2 * cfg.level.minAttempts }, () => ({ categoryId: "geography", node: "geo.country.dz.capital", difficulty: 4, outcome: "correct" as const })));
    expect(m.categories["geography"]!.seedLevel).toBe(4);
    expect(m.categories["geography"]!.estimatedLevel).toBe(5);
    expect(m.knowledge["geo.country.dz.capital"]!.mastery).toBeGreaterThan(cfg.mastery.masteredThreshold);
  });

  it("« explication connue = both » n'augmente pas seule la difficulté : même niveau qu'avec « none »", () => {
    const plan = (mastery: ExplanationMastery) => Array.from({ length: 3 }, () => ({ categoryId: "maths", node: "maths.addition.d2", difficulty: 2, outcome: "correct" as const, mastery }));
    const a = play(emptyMemory(child.playerId), child, plan("none"));
    const b = play(emptyMemory(child.playerId), child, plan("both"));
    expect(b.categories["maths"]!.estimatedLevel).toBe(a.categories["maths"]!.estimatedLevel);
    expect(b.knowledge["maths.addition.d2"]!.mastery).toBe(a.knowledge["maths.addition.d2"]!.mastery);
    const single = play(emptyMemory(child.playerId), child, [{ categoryId: "maths", node: "maths.addition.d2", difficulty: 2, outcome: "correct", mastery: "both" }]);
    expect(single.categories["maths"]!.estimatedLevel).toBe(2);
  });

  it("révision espacée déterministe : boîte + échéance selon les intervalles configurés, horloge injectée", () => {
    const first = applyAttempt(emptyMemory(child.playerId), attempt(child, "maths", "n", 2, "correct", { answeredAt: T0 }), child, cfg);
    const ks1 = first.knowledge["n"]!;
    expect(ks1.box).toBe(1);
    expect(ks1.nextDueAt).toBe(addDays(T0, cfg.spacing.intervalsDays[1]!));
    const second = applyAttempt(first, attempt(child, "maths", "n", 2, "partial", { answeredAt: addDays(T0, 3) }), child, cfg);
    expect(second.knowledge["n"]!.box).toBe(1);
    const third = applyAttempt(second, attempt(child, "maths", "n", 2, "incorrect", { answeredAt: addDays(T0, 4) }), child, cfg);
    expect(third.knowledge["n"]!.box).toBe(0);
    expect(third.knowledge["n"]!.nextDueAt).toBe(addDays(addDays(T0, 4), cfg.spacing.intervalsDays[0]!));
    expect(third.knowledge["n"]).toMatchObject({ attempts: 3, successes: 1, partials: 1, failures: 1, lastSeenAt: addDays(T0, 4) });
  });

  it("la maîtrise part d'un a priori neutre : une bonne réponse isolée ne « maîtrise » pas, une erreur isolée signale une faiblesse", () => {
    const one = applyAttempt(emptyMemory(child.playerId), attempt(child, "maths", "n", 2, "correct"), child, cfg);
    expect(one.knowledge["n"]!.mastery).toBeLessThan(cfg.mastery.masteredThreshold);
    const miss = applyAttempt(emptyMemory(child.playerId), attempt(child, "maths", "n", 2, "incorrect"), child, cfg);
    expect(miss.knowledge["n"]!.mastery).toBeLessThan(cfg.mastery.weakThreshold);
  });

  it("un essai est idempotent (même id) et refuse le mauvais joueur", () => {
    const a = attempt(child, "maths", "n", 2, "correct");
    const once = applyAttempt(emptyMemory(child.playerId), a, child, cfg);
    expect(applyAttempt(once, a, child, cfg)).toBe(once);
    expect(() => applyAttempt(emptyMemory(adult.playerId), a, adult, cfg)).toThrow();
  });

  it("aucune donnée économique : un essai ne porte que la réponse, la notion, la difficulté et la maîtrise déclarée", () => {
    const keys = Object.keys(attempt(child, "maths", "n", 2, "correct")).sort();
    expect(keys).toEqual(["answeredAt", "categoryId", "difficulty", "explanationKnown", "gameId", "id", "knowledgeNodeId", "outcome", "playerId", "ref", "rewardGranted", "validationMode"]);
    expect(keys.some((k) => /amount|money|balance|heritage|score/i.test(k))).toBe(false);
  });

  it("persistance : sérialisée puis relue, la progression est identique ; un essai avec montant est refusé", () => {
    const m = play(emptyMemory(child.playerId), child, [
      { categoryId: "maths", node: "maths.addition.d2", difficulty: 2, outcome: "correct", mastery: "fr" },
      { categoryId: "arabic", node: "arabic.vocab.book", difficulty: 1, outcome: "partial" },
    ]);
    const back = deserializeMemory(serializeMemory(m));
    expect(back).toEqual({ ok: true, value: m });
    const polluted = JSON.parse(serializeMemory(m)) as { attempts: Record<string, unknown>[] };
    polluted.attempts[0]!["amount"] = 100;
    expect(deserializeMemory(JSON.stringify(polluted)).ok).toBe(false);
    expect(deserializeMemory("{").ok).toBe(false);
    expect(deserializeMemory(JSON.stringify({ ...m, schemaVersion: 2 }))).toMatchObject({ ok: false, error: { code: "UNSUPPORTED_VERSION" } });
  });

  it("Mes Trésors : agrégations dérivées (notions, réussites, révisions dues, explications FR / AR, par catégorie)", () => {
    const m = play(emptyMemory(child.playerId), child, [
      { categoryId: "maths", node: "maths.addition.d2", difficulty: 2, outcome: "correct", mastery: "fr" },
      { categoryId: "maths", node: "maths.addition.d2", difficulty: 2, outcome: "correct", mastery: "both" },
      { categoryId: "maths", node: "maths.addition.d2", difficulty: 2, outcome: "correct" },
      { categoryId: "maths", node: "maths.multiplication.table-3", difficulty: 2, outcome: "partial" },
      { categoryId: "arabic", node: "arabic.vocab.book", difficulty: 1, outcome: "incorrect" },
      { categoryId: "arabic", node: "arabic.vocab.house", difficulty: 1, outcome: "correct", mastery: "ar" },
    ]);
    const s = summarizeMemory(m, cfg, addDays(T0, 2));
    expect(s).toMatchObject({ nodesEncountered: 4, questionsAnswered: 6, questionsSucceeded: 4, questionsPartial: 1, questionsFailed: 1, explanationsKnownFr: 1, explanationsKnownAr: 2 });
    expect(s.nodesMastered).toBe(1); // addition d2 : trois bonnes réponses ; une seule (maison) ne suffit pas
    expect(s.revisionsDue).toBeGreaterThanOrEqual(2); // erreur et « presque » reviennent vite
    expect(s.byCategory.map((c) => c.categoryId)).toEqual(["arabic", "maths"]);
    expect(s.byCategory[1]).toMatchObject({ categoryId: "maths", attempts: 4, successes: 3, nodesEncountered: 2, seedLevel: 2 });
    expect(summarizeMemory(m, cfg, T0).revisionsDue).toBe(0);
  });
});
