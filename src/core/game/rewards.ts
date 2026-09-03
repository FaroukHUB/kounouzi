import type { AnswerRecord, RulesConfig } from "./types";

export interface RewardComputation {
  readonly base: number;
  readonly multiplier: number;
  readonly amount: number;
}

/**
 * Gain d'une réponse. Le ×2 de maîtrise ne s'applique qu'à une bonne réponse
 * dont l'explication était déjà connue (FR, AR ou les deux). Un multiplicateur
 * d'effet éventuel s'y ajoute. Les montants viennent des règles, jamais d'ici.
 */
export function computeReward(rules: RulesConfig, answer: AnswerRecord, effectMultiplier = 1): RewardComputation {
  const base = rules.rewards[answer.outcome];
  const masteryApplies = answer.outcome === "correct" && answer.explanationMastery !== "none";
  const multiplier = (masteryApplies ? rules.rewards.masteryMultiplier : 1) * effectMultiplier;
  return { base, multiplier, amount: Math.round(base * multiplier) };
}
