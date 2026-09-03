import type { GameEvent, GameState } from "@/core/game";
import type { Locale } from "@/core/shared";
import { t } from "@/i18n";
import type { Utterance } from "./NarrationService";

/**
 * Traduit un événement du moteur en phrase à dire — Phase 3 uniquement :
 * changement de joueur, Chemin, arrivée (type de case), passage par le
 * départ, dernier tour, fin. Aucune question, réponse, explication ni
 * contenu réel n'est lu avant la Phase 4.
 */
export function utteranceFor(event: GameEvent, state: GameState, locale: Locale): Utterance | null {
  const name = (playerId: string) => state.players.find((p) => p.id === playerId)?.displayName ?? "";
  switch (event.type) {
    case "TurnStarted":
      return { text: t(locale, "narration.turn", { name: name(event.playerId) }), lang: locale, important: true };
    case "TurnSkipped":
      return { text: t(locale, "narration.skipped", { name: name(event.playerId) }), lang: locale, important: true };
    case "MovementAssigned":
      return {
        text: event.steps === 1 ? t(locale, "narration.journeyOne", { name: name(event.playerId) }) : t(locale, "narration.journey", { name: name(event.playerId), steps: event.steps }),
        lang: locale,
        important: true,
      };
    case "CellArrived":
      return { text: t(locale, `narration.arrived.${event.cellType}`), lang: locale };
    case "PassedStart":
      return { text: t(locale, "narration.passedStart"), lang: locale };
    case "TimeTargetReached":
      return { text: t(locale, "narration.lastRound"), lang: locale, important: true };
    case "GameFinished": {
      const winner = event.ranking[0];
      return winner ? { text: t(locale, "narration.finished", { name: name(winner.playerId) }), lang: locale, important: true } : null;
    }
    default:
      return null;
  }
}
