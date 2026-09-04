import type { PlayerId } from "@/core/shared";
import type { TurnPhase } from "./types";

/** Une commande refusée laisse l'état strictement inchangé. */
export type GameError =
  | { readonly code: "GAME_FINISHED" }
  | { readonly code: "NOT_ACTIVE_PLAYER"; readonly expected: PlayerId; readonly received: PlayerId }
  | { readonly code: "INVALID_PHASE"; readonly expected: TurnPhase["kind"]; readonly actual: TurnPhase["kind"] }
  | { readonly code: "REQUEST_MISMATCH"; readonly expected: string; readonly received: string }
  | { readonly code: "SITE_MISMATCH"; readonly expected: string; readonly received: string }
  | { readonly code: "CHOICE_MISMATCH"; readonly expected: string; readonly received: string }
  | { readonly code: "UNKNOWN_OPTION"; readonly choiceId: string; readonly optionId: string }
  | { readonly code: "INSUFFICIENT_FUNDS"; readonly required: number; readonly available: number }
  | { readonly code: "SITE_ALREADY_OWNED"; readonly siteId: string; readonly ownerId: PlayerId }
  | { readonly code: "INVALID_CLOCK_DELTA"; readonly seconds: number }
  | { readonly code: "NO_PENDING_QUESTION"; readonly requestId: string }
  | { readonly code: "QUESTION_ALREADY_SERVED"; readonly requestId: string }
  | { readonly code: "INVALID_OPPONENT"; readonly opponentId: PlayerId }
  | { readonly code: "INVALID_RECIPIENT"; readonly recipientId: PlayerId }
  /** Les deux questions d'un Duel doivent appartenir à la même catégorie. */
  | { readonly code: "DUEL_CATEGORY_MISMATCH"; readonly expected: string; readonly received: string }
  /** Un défi doit être accepté avant d'être validé ; accepté, il ne peut plus l'être à nouveau. */
  | { readonly code: "CHALLENGE_STAGE"; readonly expected: "assigned" | "accepted"; readonly actual: "assigned" | "accepted" };
