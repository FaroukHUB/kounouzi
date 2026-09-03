import type { RulesConfig } from "@/core/game";

/**
 * ⚠️ VALEURS DE TEST — Phase 2.
 * Ces montants servent uniquement à exercer le moteur. Ils ne constituent
 * PAS l'économie de Kounouzi, qui sera équilibrée après de vraies parties.
 */
export const TEST_RULES_QUICK: RulesConfig = {
  id: "rules-test-quick",
  version: 1,
  startingMoney: 1000,
  passStartBonus: 100,
  wheel: { min: 1, max: 6 },
  rewards: { correct: 50, partial: 25, incorrect: 0, masteryMultiplier: 2 },
  scoring: { moneyWeight: 1, heritageWeight: 1 },
  allowNegativeBalance: false,
  endCondition: { kind: "turns_per_player", turns: 6 },
};

export const TEST_RULES_CLASSIC: RulesConfig = {
  ...TEST_RULES_QUICK,
  id: "rules-test-classic",
  endCondition: { kind: "turns_per_player", turns: 10 },
};
