import type { AnswerOutcome, ExplanationMastery, GameId, PlayerId, ValidationMode } from "@/core/shared";
import type { AnsweredQuestion, CellType, ChallengeCategory, ChallengeSettings, ChallengeSkipReason, EffectSpec, OutcomePayout, QueuedEffect, RankingEntry, TransactionReason, TransferReason } from "./types";

export type QuestionPurposeKind = "standard" | "halt" | "heritage_visit" | "duel";

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
  /** Une question est demandée pour `playerId` (pas forcément le joueur actif : l'adversaire d'un Duel répond aussi). */
  | { readonly type: "QuestionRequested"; readonly requestId: string; readonly playerId: PlayerId; readonly position: number; readonly purpose: QuestionPurposeKind }
  /** La question est figée dans l'état : identité versionnée connue de tous (mémoire, interface). */
  | { readonly type: "QuestionServed"; readonly requestId: string; readonly playerId: PlayerId; readonly question: AnsweredQuestion }
  | {
      readonly type: "AnswerRecorded";
      readonly requestId: string;
      readonly playerId: PlayerId;
      readonly outcome: AnswerOutcome;
      readonly explanationMastery: ExplanationMastery;
      readonly validationMode: ValidationMode;
      readonly purpose: QuestionPurposeKind;
      /** Présent si une question a été servie : ce que la mémoire pédagogique enregistre (jamais le montant). */
      readonly question?: AnsweredQuestion | undefined;
    }
  | { readonly type: "RewardGranted"; readonly requestId: string; readonly playerId: PlayerId; readonly base: number; readonly multiplier: number; readonly bonus: number; readonly amount: number }
  | { readonly type: "PurchaseOffered"; readonly playerId: PlayerId; readonly siteId: string; readonly price: number; readonly affordable: boolean }
  | { readonly type: "SiteAlreadyOwned"; readonly playerId: PlayerId; readonly siteId: string; readonly ownerId: PlayerId }
  | { readonly type: "SiteAcquired"; readonly playerId: PlayerId; readonly siteId: string; readonly price: number; readonly heritageValue: number }
  | { readonly type: "PurchaseDeclined"; readonly playerId: PlayerId; readonly siteId: string }
  /** Le joueur revient sur son propre monument : rien à payer, rien à acheter. */
  | { readonly type: "HeritageRevisited"; readonly playerId: PlayerId; readonly siteId: string }
  /** Visite du monument d'un autre joueur : un Défi Patrimoine décide de la contribution. */
  | { readonly type: "HeritageVisited"; readonly visitorId: PlayerId; readonly ownerId: PlayerId; readonly siteId: string; readonly contribution: OutcomePayout }
  | { readonly type: "ChoiceOffered"; readonly playerId: PlayerId; readonly choiceId: string; readonly optionIds: readonly string[] }
  | { readonly type: "ChoiceMade"; readonly playerId: PlayerId; readonly choiceId: string; readonly optionId: string }
  | { readonly type: "MoneyChanged"; readonly transactionId: number; readonly playerId: PlayerId; readonly amount: number; readonly reason: TransactionReason; readonly balanceAfter: number }
  /** Transfert traçable entre deux joueurs (deux écritures liées par `transferId`). */
  | { readonly type: "MoneyTransferred"; readonly transferId: string; readonly fromPlayerId: PlayerId; readonly toPlayerId: PlayerId; readonly requested: number; readonly amount: number; readonly reason: TransferReason }
  /** Un résultat économique n'a pas pu s'appliquer (politique déclarée). */
  | { readonly type: "OutcomeCancelled"; readonly playerId: PlayerId; readonly kind: string; readonly required: number; readonly available: number }
  | { readonly type: "RecipientChoiceOffered"; readonly playerId: PlayerId; readonly amount: number; readonly reason: TransferReason; readonly candidates: readonly PlayerId[] }
  | { readonly type: "SolidarityActionRecorded"; readonly playerId: PlayerId; readonly beneficiaryId: PlayerId; readonly amount: number; readonly reason: TransferReason }
  | { readonly type: "EffectQueued"; readonly effect: QueuedEffect }
  | { readonly type: "EffectConsumed"; readonly effectId: string; readonly playerId: PlayerId; readonly effectType: EffectSpec["type"] }
  | { readonly type: "EffectExpired"; readonly effectId: string; readonly playerId: PlayerId; readonly effectType: EffectSpec["type"] }
  | { readonly type: "PenaltyShielded"; readonly playerId: PlayerId; readonly effectId: string; readonly amount: number }
  | { readonly type: "InvestmentSettled"; readonly playerId: PlayerId; readonly effectId: string; readonly outcome: AnswerOutcome; readonly payout: number }
  | { readonly type: "SavingMatured"; readonly playerId: PlayerId; readonly effectId: string; readonly payout: number }
  /* ---- Halte du voyage ---- */
  | { readonly type: "JourneyHalted"; readonly playerId: PlayerId; readonly position: number }
  | { readonly type: "HaltLifted"; readonly playerId: PlayerId; readonly outcome: AnswerOutcome }
  | { readonly type: "HaltTurnLost"; readonly playerId: PlayerId }
  /* ---- Duel Kounouzi ---- */
  | { readonly type: "DuelOffered"; readonly challengerId: PlayerId; readonly candidates: readonly PlayerId[] }
  | { readonly type: "DuelStarted"; readonly challengerId: PlayerId; readonly opponentId: PlayerId }
  | { readonly type: "DuelTurn"; readonly duelistId: PlayerId; readonly requestId: string; readonly categoryId: string | null }
  | {
      readonly type: "DuelResolved";
      readonly challengerId: PlayerId;
      readonly opponentId: PlayerId;
      readonly categoryId: string | null;
      readonly challengerOutcome: AnswerOutcome;
      readonly opponentOutcome: AnswerOutcome;
      /** `null` = match nul. */
      readonly winnerId: PlayerId | null;
    }
  /* ---- Défi famille ---- */
  | { readonly type: "FamilyChallengeAssigned"; readonly playerId: PlayerId; readonly challengeId: string; readonly requestId: string; readonly category: ChallengeCategory; readonly reward: number; readonly ohNo: boolean; readonly consentRequired: boolean }
  | { readonly type: "FamilyChallengeAccepted"; readonly playerId: PlayerId; readonly challengeId: string }
  | { readonly type: "FamilyChallengeCompleted"; readonly playerId: PlayerId; readonly challengeId: string; readonly success: boolean }
  | { readonly type: "FamilyChallengeSkipped"; readonly playerId: PlayerId; readonly challengeId: string; readonly reason: ChallengeSkipReason }
  | { readonly type: "ChallengeRewardGranted"; readonly playerId: PlayerId; readonly challengeId: string; readonly amount: number }
  /** Aucun défi éligible (banque vide, réglages, âge) : la case ne propose rien, le tour continue. */
  | { readonly type: "FamilyChallengeUnavailable"; readonly playerId: PlayerId }
  | { readonly type: "ChallengeSettingsChanged"; readonly settings: ChallengeSettings }
  | { readonly type: "TurnEnded"; readonly turnNumber: number; readonly playerId: PlayerId }
  /** La durée cible est atteinte : le tour de table en cours sera le dernier. */
  | { readonly type: "TimeTargetReached"; readonly activePlaySeconds: number }
  | { readonly type: "GameEndRequested" }
  | { readonly type: "GameFinished"; readonly ranking: readonly RankingEntry[] };

export type GameEventType = GameEvent["type"];
