import type { AnswerOutcome, ExplanationMastery, GameId, PlayerId, ValidationMode } from "@/core/shared";
import type { AnsweredQuestion, CellType, EffectSpec, QueuedEffect, RankingEntry, TransactionReason } from "./types";

/** Journal de ce qui s'est produit. Sérialisable, sans aucune information visuelle. */
export type GameEvent =
  | { readonly type: "GameCreated"; readonly gameId: GameId; readonly boardId: string; readonly rulesId: string; readonly playerIds: readonly PlayerId[] }
  | { readonly type: "TurnStarted"; readonly turnNumber: number; readonly playerId: PlayerId }
  | { readonly type: "TurnSkipped"; readonly turnNumber: number; readonly playerId: PlayerId; readonly effectId: string }
  /** Le Chemin attribué par le moteur pour ce tour (jamais choisi, jamais tiré au sort). */
  | { readonly type: "MovementAssigned"; readonly playerId: PlayerId; readonly steps: number; readonly journeyIndex: number }
  | { readonly type: "PawnMoved"; readonly playerId: PlayerId; readonly from: number; readonly to: number; readonly path: readonly number[] }
  | { readonly type: "PassedStart"; readonly playerId: PlayerId; readonly bonus: number }
  | { readonly type: "CellArrived"; readonly playerId: PlayerId; readonly position: number; readonly cellType: CellType }
  | { readonly type: "ScenarioTriggered"; readonly playerId: PlayerId; readonly scenarioId: string; readonly cellType: CellType; readonly visit: number }
  | { readonly type: "QuestionRequested"; readonly requestId: string; readonly playerId: PlayerId; readonly position: number }
  /** La question est figée dans l'état : identité versionnée connue de tous (mémoire, interface). */
  | { readonly type: "QuestionServed"; readonly requestId: string; readonly playerId: PlayerId; readonly question: AnsweredQuestion }
  | {
      readonly type: "AnswerRecorded";
      readonly requestId: string;
      readonly playerId: PlayerId;
      readonly outcome: AnswerOutcome;
      readonly explanationMastery: ExplanationMastery;
      readonly validationMode: ValidationMode;
      /** Présent si une question a été servie : ce que la mémoire pédagogique enregistre (jamais le montant). */
      readonly question?: AnsweredQuestion | undefined;
    }
  | { readonly type: "RewardGranted"; readonly requestId: string; readonly playerId: PlayerId; readonly base: number; readonly multiplier: number; readonly amount: number }
  | { readonly type: "PurchaseOffered"; readonly playerId: PlayerId; readonly siteId: string; readonly price: number; readonly affordable: boolean }
  | { readonly type: "SiteAlreadyOwned"; readonly playerId: PlayerId; readonly siteId: string; readonly ownerId: PlayerId }
  | { readonly type: "SiteAcquired"; readonly playerId: PlayerId; readonly siteId: string; readonly price: number; readonly heritageValue: number }
  | { readonly type: "PurchaseDeclined"; readonly playerId: PlayerId; readonly siteId: string }
  | { readonly type: "ChoiceOffered"; readonly playerId: PlayerId; readonly choiceId: string; readonly optionIds: readonly string[] }
  | { readonly type: "ChoiceMade"; readonly playerId: PlayerId; readonly choiceId: string; readonly optionId: string }
  | { readonly type: "MoneyChanged"; readonly transactionId: number; readonly playerId: PlayerId; readonly amount: number; readonly reason: TransactionReason; readonly balanceAfter: number }
  | { readonly type: "EffectQueued"; readonly effect: QueuedEffect }
  | { readonly type: "EffectConsumed"; readonly effectId: string; readonly playerId: PlayerId; readonly effectType: EffectSpec["type"] }
  | { readonly type: "TurnEnded"; readonly turnNumber: number; readonly playerId: PlayerId }
  /** La durée cible est atteinte : le tour de table en cours sera le dernier. */
  | { readonly type: "TimeTargetReached"; readonly activePlaySeconds: number }
  | { readonly type: "GameEndRequested" }
  | { readonly type: "GameFinished"; readonly ranking: readonly RankingEntry[] };

export type GameEventType = GameEvent["type"];
