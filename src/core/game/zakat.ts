import { fundDeposit } from "./economy";
import { chain, step, type Step } from "./step";
import type { GameState, MoneyDestination, PlayerState } from "./types";

/**
 * Zakat al-Māl — mécanique ANNUELLE hors plateau (ADR 0033). Elle ne dépend
 * ni d'une case, ni du pion, ni du Chemin : le calendrier commun avance d'un
 * cran à chaque tour de table complet ; quand `cycleRounds` tours sont
 * écoulés, une année lunaire simulée s'achève pour TOUS les joueurs en même
 * temps et chacun est évalué. Aucun hasard, aucune décision humaine : la
 * règle est une donnée (`rules.zakat`).
 */

/** Actifs éligibles d'un joueur : uniquement les types déclarés (jamais la valeur des monuments sans décision explicite). */
export function zakatBase(state: GameState, player: PlayerState): number {
  let base = 0;
  for (const asset of state.config.rules.zakat.eligibleAssetTypes) {
    if (asset === "money") base += Math.max(0, player.money);
  }
  return base;
}

/** Montant dû : `rate` × actifs éligibles, arrondi à l'entier inférieur, seulement si le nissab est atteint. */
export function zakatDue(state: GameState, player: PlayerState): { readonly base: number; readonly amount: number; readonly due: boolean } {
  const { rate, nisabKounouz } = state.config.rules.zakat;
  const base = zakatBase(state, player);
  const reached = base >= nisabKounouz;
  const amount = reached ? Math.floor(base * rate) : 0;
  return { base, amount, due: reached && amount > 0 };
}

/**
 * Un tour de table complet vient de s'achever : le calendrier avance ; à
 * l'échéance, l'année se clôt et chaque joueur (ordre des sièges) verse sa
 * Zakat éventuelle à la Caisse Masākīn, destination sûre tant que les règles
 * d'éligibilité d'un joueur bénéficiaire ne sont pas définies.
 */
export function completeRound(state: GameState): Step {
  const zakat = state.config.rules.zakat;
  const roundsInYear = state.calendar.roundsInYear + 1;
  if (!zakat.enabled || roundsInYear < zakat.cycleRounds) return step({ ...state, calendar: { ...state.calendar, roundsInYear } });
  const year = state.calendar.year;
  let result = step({ ...state, calendar: { year: year + 1, roundsInYear: 0 } }, [{ type: "ZakatEvaluationRequested", year, nisab: zakat.nisabKounouz, rate: zakat.rate }]);
  for (const seat of [...state.players].sort((a, b) => a.seat - b.seat)) {
    result = chain(result, (s) => {
      const player = s.players.find((p) => p.id === seat.id)!;
      const { base, amount, due } = zakatDue(s, player);
      if (!due) return step(s, [{ type: "ZakatNotDue", playerId: player.id, year, base, nisab: zakat.nisabKounouz }]);
      const to: MoneyDestination = { kind: "masakin" };
      let paid = fundDeposit(s, player.id, amount, "zakat", "zakat_paid");
      paid = chain(paid, (x) => step(x, [{ type: "ZakatPaid", playerId: player.id, year, base, amount, to }]));
      return paid;
    });
  }
  return chain(result, (s) => step(s, [{ type: "YearCompleted", year }]));
}
