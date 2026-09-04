import type { AnswerOutcome, PlayerId } from "@/core/shared";

/**
 * Duel Kounouzi : on compare UNIQUEMENT le résultat relatif
 * correct > presque > incorrect. Jamais le temps de réponse, jamais l'ordre
 * de réponse, jamais la maîtrise de l'explication (bonus individuel à part).
 */
const RANK: Readonly<Record<AnswerOutcome, number>> = { correct: 2, partial: 1, incorrect: 0 };

export function duelWinner(challengerId: PlayerId, challengerOutcome: AnswerOutcome, opponentId: PlayerId, opponentOutcome: AnswerOutcome): PlayerId | null {
  const a = RANK[challengerOutcome];
  const b = RANK[opponentOutcome];
  return a === b ? null : a > b ? challengerId : opponentId;
}
