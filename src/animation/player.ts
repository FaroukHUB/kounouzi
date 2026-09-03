import type { GameEvent } from "@/core/game";
import type { PlayerId } from "@/core/shared";
import { safetyTimeout, type Timings } from "./timings";

export type Banner =
  | { readonly kind: "turn"; readonly playerId: PlayerId }
  | { readonly kind: "skipped"; readonly playerId: PlayerId }
  | { readonly kind: "passed_start"; readonly playerId: PlayerId; readonly amount: number }
  | { readonly kind: "last_round" };

/** Ce que le rejoueur peut faire à l'interface. Rien ici ne touche au moteur. */
export interface AnimationActions {
  setPawn(playerId: PlayerId, position: number): void;
  setHighlight(position: number | null): void;
  setArrival(position: number | null): void;
  /** Le Chemin se dévoile : `steps` est la valeur attribuée par le moteur. */
  revealJourney(playerId: PlayerId, steps: number): void;
  hideJourney(): void;
  setBanner(banner: Banner | null): void;
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
      actions.setBanner(null);
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
    default:
      return 0;
  }
}
