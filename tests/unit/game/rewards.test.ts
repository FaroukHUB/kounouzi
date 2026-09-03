import { describe, expect, it } from "vitest";
import { computeReward, type AnswerRecord } from "@/core/game";
import { TEST_RULES_QUICK } from "../../fixtures/game/rules.fixture";

const record = (outcome: AnswerRecord["outcome"], explanationMastery: AnswerRecord["explanationMastery"]): AnswerRecord => ({
  outcome,
  explanationMastery,
  validationMode: "collective",
});

describe("récompenses (valeurs de test)", () => {
  it.each([
    ["correct", "none", 50],
    ["correct", "fr", 100],
    ["correct", "ar", 100],
    ["correct", "both", 100],
    ["partial", "none", 25],
    ["partial", "fr", 25],
    ["incorrect", "none", 0],
    ["incorrect", "both", 0],
  ] as const)("%s + maîtrise %s → %i", (outcome, mastery, expected) => {
    expect(computeReward(TEST_RULES_QUICK, record(outcome, mastery)).amount).toBe(expected);
  });

  it("le ×2 ne s'applique qu'à une bonne réponse dont l'explication était connue", () => {
    expect(computeReward(TEST_RULES_QUICK, record("correct", "fr")).multiplier).toBe(2);
    expect(computeReward(TEST_RULES_QUICK, record("partial", "fr")).multiplier).toBe(1);
  });

  it("cumule un multiplicateur d'effet", () => {
    expect(computeReward(TEST_RULES_QUICK, record("correct", "fr"), 2)).toEqual({ base: 50, multiplier: 4, amount: 200 });
  });

  it("lit les montants dans les règles, pas dans le moteur", () => {
    const rules = { ...TEST_RULES_QUICK, rewards: { correct: 7, partial: 3, incorrect: 1, masteryMultiplier: 3 } };
    expect(computeReward(rules, record("correct", "ar")).amount).toBe(21);
    expect(computeReward(rules, record("incorrect", "none")).amount).toBe(1);
  });
});
