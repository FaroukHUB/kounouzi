import type { QuestionInstance } from "@/core/content";
import type { AnswerOutcome, PlayerId, ValidationMode } from "@/core/shared";
import type { CellType, ChallengeSkipReason, GameState, QuestionPurposeKind, TransferReason } from "@/core/game";

export type QuestionStep = "dealt" | "opening" | "question" | "revealed" | "explanation" | "mastery" | "submitted" | "result" | "reward";

/**
 * État TRANSITOIRE de la carte affichée. Le moteur ne le connaît pas ; la
 * vérité (phase, demande, prix, duel) reste dans `GameState`. Reconstruit
 * depuis la phase à la reprise (`cardForPhase`).
 */
export type CardState =
  | {
      readonly kind: "question";
      readonly requestId: string;
      /** Le joueur qui répond : le joueur actif, ou le dueliste en cours. */
      readonly playerId: PlayerId;
      readonly purpose: QuestionPurposeKind;
      readonly step: QuestionStep;
      readonly validationMode: ValidationMode;
      readonly outcome?: AnswerOutcome | undefined;
      readonly rewardAmount?: number | undefined;
      readonly multiplier?: number | undefined;
      /** Instantané de la question servie, conservé le temps du résultat et de la récompense (l'état réel est déjà passé à la suite). */
      readonly question?: QuestionInstance | undefined;
    }
  | { readonly kind: "monument"; readonly siteId: string; readonly price: number; readonly affordable: boolean; readonly step: "offer" | "submitted" | "acquired" | "declined" }
  | { readonly kind: "choice"; readonly choiceId: string; readonly optionIds: readonly string[]; readonly step: "offer" | "submitted" }
  | { readonly kind: "scenario"; readonly scenarioId: string; readonly cellType: CellType }
  | { readonly kind: "opponent"; readonly challengerId: PlayerId; readonly candidates: readonly PlayerId[]; readonly step: "offer" | "submitted" }
  | { readonly kind: "recipient"; readonly playerId: PlayerId; readonly candidates: readonly PlayerId[]; readonly amount: number; readonly reason: TransferReason; readonly step: "offer" | "submitted" }
  | {
      readonly kind: "duel";
      readonly challengerId: PlayerId;
      readonly opponentId: PlayerId;
      readonly stage: "intro" | "turn" | "result";
      readonly duelistId?: PlayerId | undefined;
      readonly categoryId?: string | null | undefined;
      readonly challengerOutcome?: AnswerOutcome | undefined;
      readonly opponentOutcome?: AnswerOutcome | undefined;
      readonly winnerId?: PlayerId | null | undefined;
    }
  | { readonly kind: "halt"; readonly playerId: PlayerId }
  /** Défi famille : « OH NON » éventuel → révélation → accepté → validation → résultat → gain. */
  | {
      readonly kind: "challenge";
      readonly challengeId: string;
      readonly playerId: PlayerId;
      readonly requestId: string;
      readonly step: "ohno" | "reveal" | "accepted" | "submitted" | "result" | "reward";
      readonly success?: boolean | undefined;
      readonly skipped?: ChallengeSkipReason | undefined;
      readonly rewardAmount?: number | undefined;
      /** Instantané de la question figée (défi à contenu validé), conservé pour le résultat. */
      readonly question?: QuestionInstance | undefined;
      /** Sourates à réciter (références), figées dans l'état. */
      readonly surahIds?: readonly string[] | undefined;
    };

/** À la reprise (aucun événement rejoué), la carte correspondant à la phase en attente. */
export function cardForPhase(state: GameState): CardState | null {
  const activeId = state.players[state.activePlayerIndex]?.id ?? ("" as PlayerId);
  switch (state.phase.kind) {
    case "awaiting_answer":
      return { kind: "question", requestId: state.phase.requestId, playerId: activeId, purpose: state.phase.purpose.kind, step: "dealt", validationMode: "collective" };
    case "awaiting_duel": {
      const d = state.phase.duel;
      const challenger = d.stage === "challenger";
      return { kind: "question", requestId: challenger ? d.challengerRequestId : d.opponentRequestId, playerId: challenger ? d.challengerId : d.opponentId, purpose: "duel", step: "dealt", validationMode: "collective" };
    }
    case "awaiting_duel_opponent":
      return { kind: "opponent", challengerId: activeId, candidates: state.phase.candidates, step: "offer" };
    case "awaiting_challenge": {
      const c = state.phase.challenge;
      // Reprise en plein défi : à l'étape exacte (accepté ou non), sans rejouer « OH NON ».
      return { kind: "challenge", challengeId: c.challengeId, playerId: c.playerId, requestId: c.requestId, step: c.stage === "accepted" ? "accepted" : "reveal", ...(c.surahIds ? { surahIds: c.surahIds } : {}) };
    }
    case "awaiting_recipient":
      return { kind: "recipient", playerId: activeId, candidates: state.phase.candidates, amount: state.phase.amount, reason: state.phase.reason, step: "offer" };
    case "awaiting_purchase": {
      const player = state.players[state.activePlayerIndex];
      return { kind: "monument", siteId: state.phase.siteId, price: state.phase.price, affordable: (player?.money ?? 0) >= state.phase.price, step: "offer" };
    }
    case "awaiting_choice":
      return { kind: "choice", choiceId: state.phase.choiceId, optionIds: state.phase.options.map((o) => o.id), step: "offer" };
    default:
      return null;
  }
}

/** La question figée pour une demande, où qu'elle vive dans la phase (question simple ou Duel). */
export function servedFor(state: GameState, requestId: string) {
  if (state.phase.kind === "awaiting_answer" && state.phase.requestId === requestId) return { served: state.phase.served ?? null, pending: !state.phase.served };
  if (state.phase.kind === "awaiting_duel") {
    const d = state.phase.duel;
    if (requestId === d.challengerRequestId) return { served: d.challengerServed ?? null, pending: !d.challengerServed };
    if (requestId === d.opponentRequestId) return { served: d.opponentServed ?? null, pending: !d.opponentServed };
  }
  if (state.phase.kind === "awaiting_challenge" && state.phase.challenge.requestId === requestId) {
    const c = state.phase.challenge;
    const ref = state.config.challenges.definitions.find((d) => d.id === c.challengeId)?.contentRef;
    const needs = ref?.kind === "validated_question";
    return { served: c.served ?? null, pending: needs && !c.served };
  }
  return { served: null, pending: false };
}
