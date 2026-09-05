import type { GameEvent } from "@/core/game";
import type { PlayerId } from "@/core/shared";
import type { CardState } from "@/ui/cards/cardState";
import { safetyTimeout, type Timings } from "./timings";

export type Banner =
  | { readonly kind: "turn"; readonly playerId: PlayerId }
  | { readonly kind: "skipped"; readonly playerId: PlayerId }
  | { readonly kind: "passed_start"; readonly playerId: PlayerId; readonly amount: number }
  | { readonly kind: "last_round" }
  | { readonly kind: "owned"; readonly ownerId: PlayerId }
  | { readonly kind: "revisit" }
  | { readonly kind: "halt_lifted"; readonly playerId: PlayerId }
  | { readonly kind: "halt_lost"; readonly playerId: PlayerId }
  | { readonly kind: "transfer"; readonly fromPlayerId: PlayerId; readonly toPlayerId: PlayerId; readonly amount: number; readonly contribution: boolean }
  | { readonly kind: "shield"; readonly amount: number }
  | { readonly kind: "investment"; readonly payout: number }
  | { readonly kind: "saving"; readonly payout: number }
  | { readonly kind: "cancelled" }
  | { readonly kind: "donation_fund"; readonly fromPlayerId: PlayerId; readonly amount: number }
  | { readonly kind: "donation_unavailable" }
  | { readonly kind: "treasure"; readonly amount: number }
  | { readonly kind: "year"; readonly year: number }
  | { readonly kind: "zakat_paid"; readonly playerId: PlayerId; readonly amount: number };

/** Ce que le rejoueur peut faire à l'interface. Rien ici ne touche au moteur. */
export interface AnimationActions {
  setPawn(playerId: PlayerId, position: number): void;
  setHighlight(position: number | null): void;
  setArrival(position: number | null): void;
  /** Le Chemin se dévoile : `steps` est la valeur attribuée par le moteur. */
  revealJourney(playerId: PlayerId, steps: number): void;
  hideJourney(): void;
  setBanner(banner: Banner | null): void;
  openCard(card: CardState): void;
  updateCard(patch: Partial<CardState>): void;
  closeCard(): void;
}

export type Sleep = (ms: number) => Promise<void>;

export const realSleep: Sleep = (ms) => (ms <= 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms)));

/**
 * Rejoue UN événement du moteur sous forme visuelle, puis rend la main.
 * L'état du jeu est déjà acquis : ceci n'est qu'un rattrapage visuel. Toute
 * séquence est bornée par un délai de sécurité pour ne jamais bloquer la file.
 */
export async function playEvent(event: GameEvent, actions: AnimationActions, timings: Timings, sleep: Sleep = realSleep): Promise<void> {
  const budget = safetyTimeout(estimateDuration(event, timings));
  await Promise.race([play(event, actions, timings, sleep), sleep(budget)]);
  settle(event, actions);
}

async function banner(actions: AnimationActions, b: Banner, ms: number, sleep: Sleep): Promise<void> {
  actions.setBanner(b);
  await sleep(ms);
  actions.setBanner(null);
}

async function play(event: GameEvent, actions: AnimationActions, t: Timings, sleep: Sleep): Promise<void> {
  switch (event.type) {
    case "TurnStarted":
      return banner(actions, { kind: "turn", playerId: event.playerId }, t.turnBannerMs, sleep);
    case "TurnSkipped":
      return banner(actions, { kind: "skipped", playerId: event.playerId }, t.skippedMs, sleep);
    case "MovementAssigned":
      actions.revealJourney(event.playerId, event.steps);
      await sleep(t.journeyRevealMs);
      actions.hideJourney();
      return;
    case "PawnMoved":
      // Le chemin vient du moteur ; l'interface ne recalcule jamais le déplacement.
      for (const position of event.path) {
        actions.setPawn(event.playerId, position);
        actions.setHighlight(position);
        await sleep(t.stepMs);
      }
      actions.setHighlight(null);
      return;
    case "PassedStart":
      return banner(actions, { kind: "passed_start", playerId: event.playerId, amount: event.bonus }, t.passedStartMs, sleep);
    case "CellArrived":
      actions.setArrival(event.position);
      await sleep(t.arrivalMs);
      actions.setArrival(null);
      return;
    case "TimeTargetReached":
      return banner(actions, { kind: "last_round" }, t.turnBannerMs, sleep);

    // ---- cartes : ouverture sur demande du moteur, progression sur ses réponses ----
    case "QuestionRequested":
      actions.openCard({ kind: "question", requestId: event.requestId, playerId: event.playerId, purpose: event.purpose, step: "dealt", validationMode: "collective" });
      return;
    case "PurchaseOffered":
      actions.openCard({ kind: "monument", siteId: event.siteId, price: event.price, affordable: event.affordable, step: "offer" });
      return;
    case "ChoiceOffered":
      actions.openCard({ kind: "choice", choiceId: event.choiceId, optionIds: event.optionIds, step: "offer" });
      return;
    case "ScenarioTriggered":
      actions.openCard({ kind: "scenario", scenarioId: event.scenarioId, cellType: event.cellType });
      await sleep(t.scenarioMs);
      actions.closeCard();
      return;
    // ---- Trésor, Don, Zakat (ADR 0033) ----
    case "TreasureFound":
      actions.openCard({ kind: "treasure", playerId: event.playerId, amount: event.amount });
      await sleep(t.scenarioMs);
      actions.closeCard();
      return;
    case "DonationOffered":
      actions.openCard({ kind: "donation", playerId: event.playerId, amounts: event.amounts, candidates: event.candidates, step: "offer" });
      return;
    case "DonationUnavailable":
      return banner(actions, { kind: "donation_unavailable" }, t.noticeMs, sleep);
    case "DonationMade":
      actions.closeCard();
      // Vers un joueur : le transfert porte déjà son bandeau (MoneyTransferred) ; vers la caisse : bandeau dédié.
      if (event.to.kind === "masakin") return banner(actions, { kind: "donation_fund", fromPlayerId: event.playerId, amount: event.amount }, t.transferMs, sleep);
      return;
    case "ZakatPaid":
      return banner(actions, { kind: "zakat_paid", playerId: event.playerId, amount: event.amount }, t.transferMs, sleep);
    case "YearCompleted":
      return banner(actions, { kind: "year", year: event.year }, t.noticeMs, sleep);
    case "SiteAlreadyOwned":
      return banner(actions, { kind: "owned", ownerId: event.ownerId }, t.passedStartMs, sleep);
    case "HeritageRevisited":
      return banner(actions, { kind: "revisit" }, t.noticeMs, sleep);
    case "AnswerRecorded":
      actions.updateCard({ step: "result", outcome: event.outcome });
      await sleep(t.resultMs);
      return;
    case "RewardGranted":
      actions.updateCard({ step: "reward", rewardAmount: event.amount, multiplier: event.multiplier });
      await sleep(t.rewardMs);
      return;
    case "SiteAcquired":
      actions.updateCard({ step: "acquired" });
      await sleep(t.purchaseMs);
      return;
    case "PurchaseDeclined":
      actions.updateCard({ step: "declined" });
      await sleep(t.purchaseMs / 2);
      return;
    case "ChoiceMade":
      actions.closeCard();
      return;

    // ---- Duel Kounouzi : tout le monde regarde ----
    case "DuelOffered":
      actions.openCard({ kind: "opponent", challengerId: event.challengerId, candidates: event.candidates, step: "offer" });
      return;
    case "DuelStarted":
      actions.openCard({ kind: "duel", challengerId: event.challengerId, opponentId: event.opponentId, stage: "intro" });
      await sleep(t.duelIntroMs);
      return;
    case "DuelTurn":
      actions.updateCard({ kind: "duel", stage: "turn", duelistId: event.duelistId, categoryId: event.categoryId });
      await sleep(t.duelTurnMs);
      return;
    case "DuelResolved":
      actions.openCard({
        kind: "duel",
        challengerId: event.challengerId,
        opponentId: event.opponentId,
        stage: "result",
        categoryId: event.categoryId,
        challengerOutcome: event.challengerOutcome,
        opponentOutcome: event.opponentOutcome,
        winnerId: event.winnerId,
      });
      await sleep(t.duelResultMs);
      return;

    // ---- Défi famille ----
    case "FamilyChallengeAssigned": {
      const base = { kind: "challenge" as const, challengeId: event.challengeId, playerId: event.playerId, requestId: event.requestId, ...(event.surahIds ? { surahIds: event.surahIds } : {}) };
      if (!event.ohNo) {
        actions.openCard({ ...base, step: "reveal" });
        return;
      }
      // « OH NOOON… » avant la révélation : présentation pure, le moteur attend déjà la décision.
      actions.openCard({ ...base, step: "ohno" });
      await sleep(t.ohNoMs);
      actions.updateCard({ step: "reveal" });
      return;
    }
    case "FamilyChallengeAccepted":
      actions.updateCard({ step: "accepted" });
      return;
    case "FamilyChallengeCompleted":
      actions.updateCard({ step: "result", success: event.success });
      await sleep(t.challengeResultMs);
      return;
    case "ChallengeRewardGranted":
      actions.updateCard({ step: "reward", rewardAmount: event.amount });
      await sleep(t.rewardMs);
      return;
    case "FamilyChallengeSkipped":
      actions.updateCard({ step: "result", skipped: event.reason });
      await sleep(t.challengeResultMs / 2);
      return;

    // ---- Halte du voyage ----
    case "JourneyHalted":
      actions.openCard({ kind: "halt", playerId: event.playerId });
      await sleep(t.haltMs);
      actions.closeCard();
      return;
    case "HaltLifted":
      return banner(actions, { kind: "halt_lifted", playerId: event.playerId }, t.noticeMs, sleep);
    case "HaltTurnLost":
      return banner(actions, { kind: "halt_lost", playerId: event.playerId }, t.noticeMs, sleep);

    // ---- transferts, protections, décisions de gestion ----
    case "RecipientChoiceOffered":
      actions.openCard({ kind: "recipient", playerId: event.playerId, candidates: event.candidates, amount: event.amount, reason: event.reason, step: "offer" });
      return;
    case "MoneyTransferred":
      actions.closeCard();
      return banner(actions, { kind: "transfer", fromPlayerId: event.fromPlayerId, toPlayerId: event.toPlayerId, amount: event.amount, contribution: event.reason === "heritage_contribution" }, t.transferMs, sleep);
    case "PenaltyShielded":
      return banner(actions, { kind: "shield", amount: event.amount }, t.noticeMs, sleep);
    case "InvestmentSettled":
      return banner(actions, { kind: "investment", payout: event.payout }, t.noticeMs, sleep);
    case "SavingMatured":
      return banner(actions, { kind: "saving", payout: event.payout }, t.noticeMs, sleep);
    case "OutcomeCancelled":
      actions.closeCard();
      return banner(actions, { kind: "cancelled" }, t.noticeMs, sleep);

    case "TurnEnded":
      actions.closeCard();
      return;
    default:
      return;
  }
}

/** Valeur finale garantie même si la séquence a été coupée par le délai de sécurité. */
function settle(event: GameEvent, actions: AnimationActions): void {
  switch (event.type) {
    case "PawnMoved":
      actions.setPawn(event.playerId, event.to);
      actions.setHighlight(null);
      return;
    case "MovementAssigned":
      actions.hideJourney();
      return;
    case "CellArrived":
      actions.setArrival(null);
      return;
    case "FamilyChallengeAssigned":
      if (event.ohNo) actions.updateCard({ step: "reveal" });
      return;
    case "TurnStarted":
    case "TurnSkipped":
    case "PassedStart":
    case "TimeTargetReached":
    case "SiteAlreadyOwned":
    case "HeritageRevisited":
    case "HaltLifted":
    case "HaltTurnLost":
    case "MoneyTransferred":
    case "PenaltyShielded":
    case "InvestmentSettled":
    case "SavingMatured":
    case "OutcomeCancelled":
    case "DonationUnavailable":
    case "DonationMade":
    case "ZakatPaid":
    case "YearCompleted":
      actions.setBanner(null);
      return;
    case "ScenarioTriggered":
    case "TreasureFound":
    case "JourneyHalted":
    case "TurnEnded":
    case "ChoiceMade":
      actions.closeCard();
      return;
    default:
      return;
  }
}

export function estimateDuration(event: GameEvent, t: Timings): number {
  switch (event.type) {
    case "TurnStarted":
    case "TimeTargetReached":
      return t.turnBannerMs;
    case "TurnSkipped":
      return t.skippedMs;
    case "MovementAssigned":
      return t.journeyRevealMs;
    case "PawnMoved":
      return t.stepMs * event.path.length;
    case "PassedStart":
    case "SiteAlreadyOwned":
      return t.passedStartMs;
    case "CellArrived":
      return t.arrivalMs;
    case "ScenarioTriggered":
    case "TreasureFound":
      return t.scenarioMs;
    case "DonationMade":
      return event.to.kind === "masakin" ? t.transferMs : 0;
    case "ZakatPaid":
      return t.transferMs;
    case "DonationUnavailable":
    case "YearCompleted":
      return t.noticeMs;
    case "AnswerRecorded":
      return t.resultMs;
    case "RewardGranted":
      return t.rewardMs;
    case "SiteAcquired":
      return t.purchaseMs;
    case "PurchaseDeclined":
      return t.purchaseMs / 2;
    case "DuelStarted":
      return t.duelIntroMs;
    case "DuelTurn":
      return t.duelTurnMs;
    case "DuelResolved":
      return t.duelResultMs;
    case "JourneyHalted":
      return t.haltMs;
    case "FamilyChallengeAssigned":
      return event.ohNo ? t.ohNoMs : 0;
    case "FamilyChallengeCompleted":
      return t.challengeResultMs;
    case "FamilyChallengeSkipped":
      return t.challengeResultMs / 2;
    case "ChallengeRewardGranted":
      return t.rewardMs;
    case "MoneyTransferred":
      return t.transferMs;
    case "HeritageRevisited":
    case "HaltLifted":
    case "HaltTurnLost":
    case "PenaltyShielded":
    case "InvestmentSettled":
    case "SavingMatured":
    case "OutcomeCancelled":
      return t.noticeMs;
    default:
      return 0;
  }
}
