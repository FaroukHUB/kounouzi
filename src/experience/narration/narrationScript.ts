import type { GameEvent, GameState } from "@/core/game";
import type { Locale } from "@/core/shared";
import { t } from "@/i18n";
import type { Utterance } from "./NarrationService";

/**
 * Traduit un événement du moteur en phrase à dire : changement de joueur,
 * Chemin, arrivée (type de case), passage par le départ, Duel, Halte,
 * visites, transferts, dernier tour, fin. Le contenu des cartes est lu par
 * les cartes elles-mêmes. Jamais bloquant pour le moteur.
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
    case "DonationMade":
      return event.to.kind === "masakin" ? { text: t(locale, "narration.donation.fund", { name: name(event.playerId), amount: event.amount }), lang: locale, important: true } : null;
    case "ZakatPaid":
      return { text: t(locale, "narration.zakat.paid", { name: name(event.playerId), amount: event.amount }), lang: locale, important: true };
    case "YearCompleted":
      return { text: t(locale, "narration.year"), lang: locale };
    case "TimeTargetReached":
      return { text: t(locale, "narration.lastRound"), lang: locale, important: true };
    case "DuelStarted":
      return { text: t(locale, "narration.duel.challenge", { name: name(event.challengerId), opponent: name(event.opponentId) }), lang: locale, important: true };
    case "DuelTurn":
      return { text: t(locale, "narration.duel.turn", { name: name(event.duelistId) }), lang: locale, important: true };
    case "DuelResolved":
      return { text: event.winnerId ? t(locale, "narration.duel.win", { name: name(event.winnerId) }) : t(locale, "narration.duel.draw"), lang: locale, important: true };
    case "JourneyHalted":
      return { text: t(locale, "narration.halt"), lang: locale, important: true };
    case "HaltLifted":
      return { text: t(locale, "narration.halt.lifted"), lang: locale };
    case "HaltTurnLost":
      return { text: t(locale, "narration.halt.lost"), lang: locale };
    case "HeritageVisited":
      return { text: t(locale, "narration.visit", { owner: name(event.ownerId) }), lang: locale, important: true };
    case "HeritageRevisited":
      return { text: t(locale, "narration.revisit"), lang: locale };
    case "MoneyTransferred":
      return { text: t(locale, "narration.transfer", { from: name(event.fromPlayerId), to: name(event.toPlayerId), amount: event.amount }), lang: locale };
    case "PenaltyShielded":
      return { text: t(locale, "narration.shield"), lang: locale };
    case "SavingMatured":
      return { text: t(locale, "narration.saving", { amount: event.payout }), lang: locale };
    case "InvestmentSettled":
      return { text: event.payout > 0 ? t(locale, "narration.investment.win", { amount: event.payout }) : t(locale, "narration.investment.lose"), lang: locale };
    case "FamilyChallengeAssigned":
      return { text: event.ohNo ? `${t(locale, "narration.challenge.ohNo")} ${t(locale, "narration.challenge.assigned", { name: name(event.playerId) })}` : t(locale, "narration.challenge.assigned", { name: name(event.playerId) }), lang: locale, important: true };
    case "FamilyChallengeCompleted":
      return { text: t(locale, event.success ? "narration.challenge.success" : "narration.challenge.failure"), lang: locale };
    case "FamilyChallengeSkipped":
      return { text: t(locale, "narration.challenge.skipped"), lang: locale };
    case "RecitationMastered":
      return { text: t(locale, "narration.recitation.mastered"), lang: locale };
    case "ChallengeRewardGranted":
      return { text: t(locale, "narration.challenge.reward", { amount: event.amount }), lang: locale };
    case "GameFinished": {
      const winner = event.ranking[0];
      return winner ? { text: t(locale, "narration.finished", { name: name(winner.playerId) }), lang: locale, important: true } : null;
    }
    default:
      return null;
  }
}
