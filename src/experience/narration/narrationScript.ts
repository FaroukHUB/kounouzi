import type { GameEvent, GameState } from "@/core/game";
import type { Locale } from "@/core/shared";
import { t } from "@/i18n";
import type { Utterance } from "./NarrationService";

/**
 * LE GUIDE DE KOUNOUZI — ce qu'il dit, et quand il se tait.
 *
 * Ce n'est plus un commentateur de mécanique : il s'adresse aux joueurs par
 * leur PRÉNOM, il félicite, il rassure quand on se trompe, et il souligne les
 * moments qui comptent — une bonne réponse, un geste généreux, un établissement
 * acquis, le dernier tour. En revanche il ne dit plus « tu es arrivé sur une
 * case Savoir » : la carte s'ouvre juste après et le dit déjà, en grand et en
 * image. Une voix qui commente tout n'encourage rien.
 *
 * ZÉRO HASARD, ici comme ailleurs : quand plusieurs formulations existent, la
 * variante est choisie par un COMPTEUR DE L'ÉTAT. Une partie rejouée dit donc
 * exactement les mêmes mots, et la voix pré-générée reste utilisable.
 *
 * Le contenu des cartes est lu par les cartes elles-mêmes. Jamais bloquant pour
 * le moteur.
 */

/**
 * Rang d'un tour pour la variation. Prendre le numéro de tour seul ne suffit
 * pas : avec trois joueurs et trois formulations, chacun entendrait TOUJOURS la
 * même phrase (son reste modulo est constant). Le rang combine donc le TOUR DE
 * TABLE, compté double, et la place dans ce tour : d'un tour de table à l'autre
 * un même joueur avance de deux formulations — ce qui change à tous les coups,
 * quel que soit le nombre de joueurs — et, dans un même tour de table, deux
 * joueurs voisins n'entendent pas la même phrase. Aucun hasard.
 */
export function rangDeTour(turnNumber: number, joueurs: number): number {
  const n = Math.max(1, Math.trunc(joueurs));
  const t = Math.max(0, Math.trunc(turnNumber));
  return Math.trunc(t / n) * 2 + (t % n);
}

/** Choisit une formulation parmi `total`, sans hasard : le rang vient de l'état. */
export function varianteDe(rang: number, total: number): number {
  if (total < 1) throw new RangeError("au moins une formulation");
  return (Math.abs(Math.trunc(rang)) % total) + 1;
}

/** Nombre de formulations disponibles, par clé (les clés sans variante n'y figurent pas). */
const VARIANTES = { "narration.turn": 3, "narration.journey": 3, "narration.result.correct": 3, "narration.result.partial": 3, "narration.result.incorrect": 3 } as const;

type CleBase = keyof typeof VARIANTES;
/** Les clés réellement produites. Le typage de `t` vérifie à la compilation qu'elles existent toutes dans le dictionnaire. */
type CleVariante = `${CleBase}.1` | `${CleBase}.2` | `${CleBase}.3`;

/** Clé d'une phrase à formulations multiples : `narration.turn` + rang → `narration.turn.2`. */
export function cleVariante(base: CleBase, rang: number): CleVariante {
  return `${base}.${varianteDe(rang, VARIANTES[base])}` as CleVariante;
}

export function utteranceFor(event: GameEvent, state: GameState, locale: Locale): Utterance | null {
  const name = (playerId: string) => state.players.find((p) => p.id === playerId)?.displayName ?? "";
  const dit = (text: string, important = false): Utterance => (important ? { text, lang: locale, important: true } : { text, lang: locale });
  switch (event.type) {
    case "TurnStarted":
      return dit(t(locale, cleVariante("narration.turn", rangDeTour(event.turnNumber, state.players.length)), { name: name(event.playerId) }), true);
    case "TurnSkipped":
      return dit(t(locale, "narration.skipped", { name: name(event.playerId) }), true);
    case "MovementAssigned":
      return dit(
        event.steps === 1
          ? t(locale, "narration.journeyOne", { name: name(event.playerId) })
          : t(locale, cleVariante("narration.journey", event.journeyIndex), { name: name(event.playerId), steps: event.steps }),
        true,
      );
    // L'arrivée sur une case n'est plus annoncée : la carte qui s'ouvre le dit déjà.
    case "PassedStart":
      return dit(t(locale, "narration.passedStart"));
    case "DonationMade":
      return event.to.kind === "masakin" ? dit(t(locale, "narration.donation.fund", { name: name(event.playerId), amount: event.amount }), true) : null;
    case "ZakatPaid":
      return dit(t(locale, "narration.zakat.paid", { name: name(event.playerId), amount: event.amount }), true);
    case "YearCompleted":
      return dit(t(locale, "narration.year"));
    case "TimeTargetReached":
      return dit(t(locale, "narration.lastRound"), true);
    case "DuelStarted":
      return dit(t(locale, "narration.duel.challenge", { name: name(event.challengerId), opponent: name(event.opponentId) }), true);
    case "DuelTurn":
      return dit(t(locale, "narration.duel.turn", { name: name(event.duelistId) }), true);
    case "DuelResolved":
      return dit(event.winnerId ? t(locale, "narration.duel.win", { name: name(event.winnerId) }) : t(locale, "narration.duel.draw"), true);
    case "JourneyHalted":
      return dit(t(locale, "narration.halt", { name: name(event.playerId) }), true);
    case "HaltLifted":
      return dit(t(locale, "narration.halt.lifted", { name: name(event.playerId) }));
    case "HaltTurnLost":
      return dit(t(locale, "narration.halt.lost"));
    case "HeritageVisited":
      return dit(t(locale, "narration.visit", { owner: name(event.ownerId) }), true);
    case "HeritageRevisited":
      return dit(t(locale, "narration.revisit"));
    // Un établissement acquis est un moment fort : il était muet.
    case "SiteAcquired":
      return dit(t(locale, "narration.site.acquired", { name: name(event.playerId), site: nomDuSite(state, event.siteId) }), true);
    // Une bonne action offerte : elle aussi était muette.
    case "HassanatGranted":
      return dit(t(locale, "narration.hassanat.granted", { name: name(event.playerId), amount: event.amount }), true);
    case "MoneyTransferred":
      return dit(t(locale, "narration.transfer", { from: name(event.fromPlayerId), to: name(event.toPlayerId), amount: event.amount }));
    case "PenaltyShielded":
      return dit(t(locale, "narration.shield"));
    case "SavingMatured":
      return dit(t(locale, "narration.saving", { amount: event.payout }));
    case "InvestmentSettled":
      return dit(event.payout > 0 ? t(locale, "narration.investment.win", { amount: event.payout }) : t(locale, "narration.investment.lose"));
    case "FamilyChallengeAssigned":
      return dit(event.ohNo ? `${t(locale, "narration.challenge.ohNo")} ${t(locale, "narration.challenge.assigned", { name: name(event.playerId) })}` : t(locale, "narration.challenge.assigned", { name: name(event.playerId) }), true);
    case "FamilyChallengeCompleted":
      return dit(event.success ? t(locale, "narration.challenge.success", { name: name(event.playerId) }) : t(locale, "narration.challenge.failure", { name: name(event.playerId) }));
    case "FamilyChallengeSkipped":
      return dit(t(locale, "narration.challenge.skipped"));
    case "RecitationMastered":
      return dit(t(locale, "narration.recitation.mastered"));
    case "ChallengeRewardGranted":
      return dit(t(locale, "narration.challenge.reward", { amount: event.amount }));
    case "GameFinished": {
      const winner = event.ranking[0];
      return winner ? dit(t(locale, "narration.finished", { name: name(winner.playerId) }), true) : null;
    }
    default:
      return null;
  }
}

/** Nom de l'établissement tel qu'il est écrit partout ailleurs ; à défaut, rien d'inventé. */
function nomDuSite(state: GameState, siteId: string): string {
  return state.config.sites[siteId]?.establishment?.name.fr ?? "";
}
