import type { GameEvent } from "@/core/game";
import type { PlayerId } from "@/core/shared";
import type { CardState } from "@/ui/cards/cardState";
import { safetyTimeout, type Timings } from "./timings";

export type Banner =
  | { readonly kind: "turn"; readonly playerId: PlayerId }
  | { readonly kind: "skipped"; readonly playerId: PlayerId }
  | { readonly kind: "passed_start"; readonly playerId: PlayerId; readonly amount: number }
  | { readonly kind: "last_round" }
  | { readonly kind: "owned"; readonly ownerId: PlayerId };

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

async function play(event: GameEvent, actions: AnimationActions, t: Timings, sleep: Sleep): Promise<void> {
  switch (event.type) {
    case "TurnStarted":
      actions.setBanner({ kind: "turn", playerId: event.playerId });
      await sleep(t.turnBannerMs);
      actions.setBanner(null);
      return;
    case "TurnSkipped":
      actions.setBanner({ kind: "skipped", playerId: event.playerId });
      await sleep(t.skippedMs);
      actions.setBanner(null);
      return;
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
      actions.setBanner({ kind: "passed_start", playerId: event.playerId, amount: event.bonus });
      await sleep(t.passedStartMs);
      actions.setBanner(null);
      return;
    case "CellArrived":
      actions.setArrival(event.position);
      await sleep(t.arrivalMs);
      actions.setArrival(null);
      return;
    case "TimeTargetReached":
      actions.setBanner({ kind: "last_round" });
      await sleep(t.turnBannerMs);
      actions.setBanner(null);
      return;

    // ---- cartes : ouverture sur demande du moteur, progression sur ses réponses ----
    case "QuestionRequested":
      actions.openCard({ kind: "question", requestId: event.requestId, step: "dealt", validationMode: "collective" });
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
    case "SiteAlreadyOwned":
      actions.setBanner({ kind: "owned", ownerId: event.ownerId });
      await sleep(t.passedStartMs);
      actions.setBanner(null);
      return;
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
    case "TurnStarted":
    case "TurnSkipped":
    case "PassedStart":
    case "TimeTargetReached":
    case "SiteAlreadyOwned":
      actions.setBanner(null);
      return;
    case "ScenarioTriggered":
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
      return t.passedStartMs;
    case "CellArrived":
      return t.arrivalMs;
    case "ScenarioTriggered":
      return t.scenarioMs;
    case "SiteAlreadyOwned":
      return t.passedStartMs;
    case "AnswerRecorded":
      return t.resultMs;
    case "RewardGranted":
      return t.rewardMs;
    case "SiteAcquired":
      return t.purchaseMs;
    case "PurchaseDeclined":
      return t.purchaseMs / 2;
    default:
      return 0;
  }
}
