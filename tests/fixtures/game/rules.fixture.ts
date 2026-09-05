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
  treasure: { amount: 100 },
  donation: { amounts: [10, 20, 50, 100] },
  zakat: { enabled: true, rate: 0.025, nisabKounouz: 1000, cycleRounds: 3, eligibleAssetTypes: ["money"] },
  rewards: { correct: 50, partial: 25, incorrect: 0, masteryMultiplier: 2 },
  scoring: { moneyWeight: 1, heritageWeight: 1 },
  allowNegativeBalance: false,
  endCondition: { kind: "turns_per_player", turns: 6 },
  duel: { winBonus: 60, drawBonus: 20, loseBonus: 0 },
  heritageVisit: { contribution: { correct: 25, partial: 50, incorrect: 100 }, insufficient: "cap_to_balance" },
};

/** Trésor à 0 : la case Trésor sert ses scénarios (tests des effets génériques ; comportement des parties anciennes). */
export const TEST_RULES_SCENARIO_TREASURE: RulesConfig = { ...TEST_RULES_QUICK, id: "rules-test-scenario-treasure", treasure: { amount: 0 } };

export const TEST_RULES_CLASSIC: RulesConfig = { ...TEST_RULES_QUICK, id: "rules-test-classic", endCondition: { kind: "turns_per_player", turns: 10 } };

/** Durée active de test : 60 secondes (l'horloge est injectée par commande, jamais lue sur le système). */
export const TEST_RULES_TIMED: RulesConfig = { ...TEST_RULES_QUICK, id: "rules-test-timed", endCondition: { kind: "active_time", targetSeconds: 60 } };

export const TEST_RULES_FREE: RulesConfig = { ...TEST_RULES_QUICK, id: "rules-test-free", endCondition: { kind: "free" } };
