import { describe, expect, it } from "vitest";
import { CATEGORIES, GEO_FACTS } from "@/config/content";
import { LEARNING_CONFIG } from "@/config/learning";
import { createAlgorithmicProvider, createContentRegistry, createCuratedProvider, createFactualProvider, type QuestionInstance } from "@/core/content";
import { addDays, applyAttempt, attemptId, commonEligibleCategories, emptyMemory, selectDuelCategory, selectQuestion, type DuelParticipant, type LearnerContext, type PlayerLearningMemory } from "@/core/learning";
import type { AnswerOutcome, GameId } from "@/core/shared";
import { TEST_ADULT_ONLY, TEST_ARABIC, TEST_CHILD_ONLY } from "../../fixtures/content/curated.fixture";
import { pid } from "../../fixtures/game/setup.fixture";
import { T0 } from "../../fixtures/learning/resolve.fixture";

const cfg = LEARNING_CONFIG;
const game = "game-duel-cat" as GameId;
const registry = createContentRegistry(CATEGORIES, [createAlgorithmicProvider(), createFactualProvider(GEO_FACTS, { allowUnverified: true }), createCuratedProvider([...TEST_ARABIC, ...TEST_CHILD_ONLY, ...TEST_ADULT_ONLY], CATEGORIES)]);

let n = 0;
/** Fait vivre à un joueur une série de réponses dans une catégorie (questions choisies par son propre moteur). */
function train(memory: PlayerLearningMemory, learner: LearnerContext, categoryId: string, outcomes: readonly AnswerOutcome[]): PlayerLearningMemory {
  const slots = registry.slots(learner.profileType).filter((s) => s.categoryId === categoryId);
  let m = memory;
  for (const outcome of outcomes) {
    n += 1;
    const q: QuestionInstance = selectQuestion({ memory: m, learner, slots, config: cfg, now: addDays(T0, n / 48) })!.question;
    m = applyAttempt(m, { id: attemptId(game, `q${n}`), playerId: learner.playerId, gameId: game, knowledgeNodeId: q.knowledgeNodeId, ref: q.ref, categoryId, difficulty: q.difficulty, outcome, validationMode: "collective", explanationKnown: "none", rewardGranted: outcome !== "incorrect", answeredAt: addDays(T0, n / 48) }, learner, cfg);
  }
  return m;
}

const maryamCtx: LearnerContext = { playerId: pid("maryam"), profileType: "child", seedLevel: 1.5 };
const papaCtx: LearnerContext = { playerId: pid("papa"), profileType: "adult", seedLevel: 4 };
const participant = (learner: LearnerContext, memory: PlayerLearningMemory): DuelParticipant => ({ learner, memory, slots: registry.slots(learner.profileType) });

describe("catégorie neutre du Duel (choisie depuis les DEUX mémoires)", () => {
  // Maryam : très faible en géographie (révisions dues), très forte en maths. Papa : fort en géographie, un peu plus faible en maths.
  // Les dernières réponses de chacun sont en maths : l'exposition récente ne favorise ni ne pénalise la géographie.
  let maryam = emptyMemory(maryamCtx.playerId);
  maryam = train(maryam, maryamCtx, "geography", Array<AnswerOutcome>(8).fill("incorrect"));
  maryam = train(maryam, maryamCtx, "maths", Array<AnswerOutcome>(8).fill("correct"));
  let papa = emptyMemory(papaCtx.playerId);
  papa = train(papa, papaCtx, "geography", Array<AnswerOutcome>(8).fill("correct"));
  papa = train(papa, papaCtx, "maths", ["correct", "incorrect", "correct", "partial", "correct", "correct"]);
  const now = addDays(T0, 2);

  it("ne retient que les catégories où les deux joueurs ont du contenu autorisé", () => {
    const common = commonEligibleCategories(participant(maryamCtx, maryam), participant(papaCtx, papa));
    expect(common).toEqual(["arabic", "geography", "maths"]);
    expect(common).not.toContain("logic"); // réservé aux enfants
    expect(common).not.toContain("culture"); // réservé aux adultes
  });

  it("inverser défieur et adversaire ne change pas la catégorie ; ce n'est pas simplement la meilleure catégorie du défieur", () => {
    const forward = selectDuelCategory({ challenger: participant(maryamCtx, maryam), opponent: participant(papaCtx, papa), config: cfg, now })!;
    const backward = selectDuelCategory({ challenger: participant(papaCtx, papa), opponent: participant(maryamCtx, maryam), config: cfg, now })!;
    expect(forward.categoryId).toBe(backward.categoryId);
    expect(forward.score).toBe(backward.score);
    expect(forward.challengerScore).toBe(backward.opponentScore);
    // Le score du Duel additionne les deux besoins : la géographie (grande faiblesse de Maryam) l'emporte.
    expect(forward.categoryId).toBe("geography");
    // Quand Papa défie, sa propre meilleure catégorie n'est PAS la géographie (il la maîtrise) : le Duel ne suit pas le défieur.
    const papaOwnBest = selectQuestion({ memory: papa, learner: papaCtx, slots: registry.slots("adult"), config: cfg, now })!.question.categoryId;
    expect(papaOwnBest).not.toBe("geography");
  });

  it("même état des deux joueurs ⇒ même catégorie, quel que soit l'ordre des créneaux", () => {
    const a = selectDuelCategory({ challenger: participant(maryamCtx, maryam), opponent: participant(papaCtx, papa), config: cfg, now });
    const b = selectDuelCategory({ challenger: { ...participant(maryamCtx, maryam), slots: [...registry.slots("child")].reverse() }, opponent: { ...participant(papaCtx, papa), slots: [...registry.slots("adult")].reverse() }, config: cfg, now });
    expect(b).toEqual(a);
  });

  it("chaque dueliste garde ensuite sa propre difficulté dans la catégorie du Duel", () => {
    const category = selectDuelCategory({ challenger: participant(maryamCtx, maryam), opponent: participant(papaCtx, papa), config: cfg, now })!.categoryId;
    const qm = selectQuestion({ memory: maryam, learner: maryamCtx, slots: registry.slots("child").filter((s) => s.categoryId === category), config: cfg, now })!.question;
    const qp = selectQuestion({ memory: papa, learner: papaCtx, slots: registry.slots("adult").filter((s) => s.categoryId === category), config: cfg, now })!.question;
    expect(qm.categoryId).toBe(category);
    expect(qp.categoryId).toBe(category);
    expect(qp.difficulty).toBeGreaterThan(qm.difficulty);
  });

  it("aucune catégorie commune ⇒ pas de Duel possible (jamais de contournement d'audience)", () => {
    const childOnly = createContentRegistry(CATEGORIES, [createCuratedProvider(TEST_CHILD_ONLY, CATEGORIES)]);
    const adultOnly = createContentRegistry(CATEGORIES, [createCuratedProvider(TEST_ADULT_ONLY, CATEGORIES)]);
    const c: DuelParticipant = { learner: maryamCtx, memory: emptyMemory(maryamCtx.playerId), slots: childOnly.slots("child") };
    const o: DuelParticipant = { learner: papaCtx, memory: emptyMemory(papaCtx.playerId), slots: adultOnly.slots("adult") };
    expect(selectDuelCategory({ challenger: c, opponent: o, config: cfg, now })).toBeNull();
  });
});
