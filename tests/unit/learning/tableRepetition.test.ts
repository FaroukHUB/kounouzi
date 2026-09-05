import { describe, expect, it } from "vitest";
import { contentRegistry } from "@/config/content";
import { LEARNING_CONFIG, learnerContextFor } from "@/config/learning";
import { applyAttempt, attemptId, emptyMemory, rankSlots, selectQuestion, type Attempt, type LearnerContext, type PlayerLearningMemory } from "@/core/learning";
import { questionRefKey } from "@/core/content";
import type { GameId, PlayerId } from "@/core/shared";
import { T0 } from "../../fixtures/learning/resolve.fixture";

const GAME = "game-table" as GameId;
const slotsFor = (learner: LearnerContext) => contentRegistry().slots(learner.profileType);

function attemptOf(memory: PlayerLearningMemory, learner: LearnerContext, i: number, q: { knowledgeNodeId: string; ref: Attempt["ref"]; categoryId: string; difficulty: number }): PlayerLearningMemory {
  const attempt: Attempt = { id: attemptId(GAME, `${learner.playerId}-q${i}`), playerId: learner.playerId, gameId: GAME, knowledgeNodeId: q.knowledgeNodeId, ref: q.ref, categoryId: q.categoryId, difficulty: q.difficulty, outcome: "correct", validationMode: "collective", explanationKnown: "none", rewardGranted: true, answeredAt: T0 };
  return applyAttempt(memory, attempt, learner, LEARNING_CONFIG);
}

describe("anti-répétition PAR TABLÉE : deux joueurs semblables ne reçoivent jamais la même question dans une partie", () => {
  const maryam = learnerContextFor({ id: "maryam" as PlayerId, profileType: "child", age: 6 });
  const yacine = learnerContextFor({ id: "yacine" as PlayerId, profileType: "child", age: 6 });

  it("sans la tablée, deux enfants neufs du même âge auraient exactement la même suite (le défaut observé en playtest)", () => {
    const a = selectQuestion({ memory: emptyMemory(maryam.playerId), learner: maryam, slots: slotsFor(maryam), config: LEARNING_CONFIG, now: T0, gameId: GAME })!;
    const b = selectQuestion({ memory: emptyMemory(yacine.playerId), learner: yacine, slots: slotsFor(yacine), config: LEARNING_CONFIG, now: T0, gameId: GAME })!;
    expect(questionRefKey(a.question.ref)).toBe(questionRefKey(b.question.ref));
  });

  it("en alternant les deux enfants sur 24 questions avec les essais de l'autre, aucune formulation n'est posée deux fois à la tablée", () => {
    let mm = emptyMemory(maryam.playerId);
    let my = emptyMemory(yacine.playerId);
    const asked: string[] = [];
    for (let i = 0; i < 12; i += 1) {
      const qa = selectQuestion({ memory: mm, learner: maryam, slots: slotsFor(maryam), config: LEARNING_CONFIG, now: T0, gameId: GAME, tableAttempts: my.attempts })!.question;
      asked.push(questionRefKey(qa.ref));
      mm = attemptOf(mm, maryam, i, qa);
      const qb = selectQuestion({ memory: my, learner: yacine, slots: slotsFor(yacine), config: LEARNING_CONFIG, now: T0, gameId: GAME, tableAttempts: mm.attempts })!.question;
      asked.push(questionRefKey(qb.ref));
      my = attemptOf(my, yacine, i, qb);
    }
    expect(new Set(asked).size).toBe(asked.length);
  });

  it("ce qui a été posé à un autre joueur porte la raison « déjà posée à la tablée » et passe derrière le reste ; une autre partie n'est pas concernée", () => {
    const first = selectQuestion({ memory: emptyMemory(maryam.playerId), learner: maryam, slots: slotsFor(maryam), config: LEARNING_CONFIG, now: T0, gameId: GAME })!.question;
    const mm = attemptOf(emptyMemory(maryam.playerId), maryam, 0, first);
    const ranked = rankSlots({ memory: emptyMemory(yacine.playerId), learner: yacine, slots: slotsFor(yacine), config: LEARNING_CONFIG, now: T0, gameId: GAME, tableAttempts: mm.attempts });
    const hit = ranked.find((r) => r.refKey === questionRefKey(first.ref))!;
    expect(hit.reasons).toContain("déjà posée à la tablée");
    expect(hit.score).toBeLessThan(ranked[0]!.score);
    const other = rankSlots({ memory: emptyMemory(yacine.playerId), learner: yacine, slots: slotsFor(yacine), config: LEARNING_CONFIG, now: T0, gameId: "game-autre", tableAttempts: mm.attempts });
    expect(other.some((r) => r.reasons.includes("déjà posée à la tablée"))).toBe(false);
    expect(LEARNING_CONFIG.selectionWeights.repeatAtTable).toBeGreaterThanOrEqual(LEARNING_CONFIG.selectionWeights.repeatQuestion);
  });
});

describe("clé de départage (quiz) : le noyau ne tire rien, la clé fournie choisit seulement entre questions équivalentes", () => {
  const papa = learnerContextFor({ id: "papa" as PlayerId, profileType: "adult", initialLevel: "standard" });
  const base = { memory: emptyMemory(papa.playerId), learner: papa, slots: slotsFor(papa), config: LEARNING_CONFIG, now: T0, gameId: GAME };

  it("sans clé ou avec la même clé, la question est toujours la même (déterminisme conservé)", () => {
    expect(selectQuestion(base)!.question.ref).toEqual(selectQuestion({ ...base, tieBreak: 0 })!.question.ref);
    expect(selectQuestion({ ...base, tieBreak: 0.37 })!.question.ref).toEqual(selectQuestion({ ...base, tieBreak: 0.37 })!.question.ref);
  });

  it("des clés différentes donnent des premières questions différentes, toutes parmi les meilleurs créneaux (à la marge près)", () => {
    const ranked = rankSlots(base);
    const top = ranked[0]!.score;
    const seen = new Set<string>();
    for (const key of [0, 0.2, 0.4, 0.6, 0.8, 0.999]) {
      const r = selectQuestion({ ...base, tieBreak: key })!;
      seen.add(questionRefKey(r.question.ref));
      expect(r.score).toBeGreaterThanOrEqual(top - LEARNING_CONFIG.variety.tieBreakMargin);
    }
    expect(seen.size).toBeGreaterThan(1);
    // Clés hors [0, 1) : bornées, jamais d'exception ni de résultat vide.
    expect(selectQuestion({ ...base, tieBreak: 1 })).not.toBeNull();
    expect(selectQuestion({ ...base, tieBreak: -3 })!.question.ref).toEqual(selectQuestion({ ...base, tieBreak: 0 })!.question.ref);
  });

  it("une révision due l'emporte toujours sur la clé : la priorité pédagogique n'est pas tirée au sort", () => {
    const first = selectQuestion(base)!.question;
    // Rencontrée il y a longtemps et ratée : due depuis des jours.
    const old = "2026-01-01T10:00:00.000Z";
    const memory = applyAttempt(emptyMemory(papa.playerId), { id: attemptId("game-ancienne" as GameId, "q1"), playerId: papa.playerId, gameId: "game-ancienne" as GameId, knowledgeNodeId: first.knowledgeNodeId, ref: first.ref, categoryId: first.categoryId, difficulty: first.difficulty, outcome: "incorrect", validationMode: "collective", explanationKnown: "none", rewardGranted: false, answeredAt: old }, papa, LEARNING_CONFIG);
    for (const key of [0, 0.5, 0.999]) {
      const r = selectQuestion({ ...base, memory, tieBreak: key })!;
      expect(r.question.knowledgeNodeId).toBe(first.knowledgeNodeId);
      expect(r.reasons).toContain("révision due");
    }
  });
});
