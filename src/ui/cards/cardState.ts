import type { AnswerOutcome, ValidationMode } from "@/core/shared";
import type { CellType, GameState } from "@/core/game";

export type QuestionStep = "dealt" | "opening" | "question" | "revealed" | "explanation" | "mastery" | "submitted" | "result" | "reward";

/**
 * État TRANSITOIRE de la carte affichée. Le moteur ne le connaît pas ; la
 * vérité (phase, demande, prix) reste dans `GameState`. Reconstruit depuis
 * la phase à la reprise (`cardForPhase`).
 */
export type CardState =
  | { readonly kind: "question"; readonly requestId: string; readonly step: QuestionStep; readonly validationMode: ValidationMode; readonly outcome?: AnswerOutcome | undefined; readonly rewardAmount?: number | undefined; readonly multiplier?: number | undefined }
  | { readonly kind: "monument"; readonly siteId: string; readonly price: number; readonly affordable: boolean; readonly step: "offer" | "submitted" | "acquired" | "declined" }
  | { readonly kind: "choice"; readonly choiceId: string; readonly optionIds: readonly string[]; readonly step: "offer" | "submitted" }
  | { readonly kind: "scenario"; readonly scenarioId: string; readonly cellType: CellType };

/** À la reprise (aucun événement rejoué), la carte correspondant à la phase en attente. */
export function cardForPhase(state: GameState): CardState | null {
  switch (state.phase.kind) {
    case "awaiting_answer":
      return { kind: "question", requestId: state.phase.requestId, step: "dealt", validationMode: "collective" };
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
