import { fundDeposit } from "./economy";
import { percentOf } from "./money";
import { chain, step, updatePlayer, type Step } from "./step";
import type { GameState, MoneyDestination, PlayerState } from "./types";

/**
 * Zakat al-Māl — mécanique hors plateau, par ḥawl (ADR 0033, 0034). Elle ne
 * dépend ni d'une case, ni du pion, ni du Chemin. À la fin de CHAQUE tour de
 * table complet, chaque joueur est contrôlé : sous le nissab, son ḥawl est
 * remis à zéro ; au-dessus, il avance d'un tour ; après `cycleRounds` tours
 * consécutifs, la Zakat (`rate` exact, en centimes) est due sur les Kounouz
 * éligibles possédés à ce moment, puis un nouveau ḥawl commence. Aucune
 * Zakat de fin de partie sans ḥawl accompli. Aucun hasard.
 */

/** Actifs éligibles d'un joueur : uniquement les types déclarés (jamais la valeur des monuments sans décision explicite). */
export function zakatBase(state: GameState, player: PlayerState): number {
  let base = 0;
  for (const asset of state.config.rules.zakat.eligibleAssetTypes) {
    if (asset === "money") base += Math.max(0, player.money);
  }
  return base;
}

/** Montant qui serait dû aujourd'hui : `rate` × base (exact, au centime) si le nissab est atteint ; le ḥawl décide du moment. */
export function zakatDue(state: GameState, player: PlayerState): { readonly base: number; readonly amount: number; readonly reached: boolean } {
  const { rate, nisabKounouz } = state.config.rules.zakat;
  const base = zakatBase(state, player);
  const reached = base >= nisabKounouz;
  return { base, amount: reached ? percentOf(base, rate) : 0, reached };
}

/**
 * Un tour de table complet vient de s'achever : le calendrier commun avance
 * (une année = `cycleRounds` tours, pour l'affichage), puis le ḥawl de chaque
 * joueur est contrôlé dans l'ordre des sièges. Destination : la Caisse
 * Masākīn, tant que les critères d'un joueur bénéficiaire ne sont pas définis.
 */
export function completeRound(state: GameState): Step {
  const zakat = state.config.rules.zakat;
  if (!zakat.enabled) return step({ ...state, calendar: { ...state.calendar, roundsInYear: state.calendar.roundsInYear + 1 } });
  const roundsInYear = state.calendar.roundsInYear + 1;
  const yearDone = roundsInYear >= zakat.cycleRounds;
  let result = step({ ...state, calendar: yearDone ? { year: state.calendar.year + 1, roundsInYear: 0 } : { ...state.calendar, roundsInYear } });
  for (const seat of [...state.players].sort((a, b) => a.seat - b.seat)) {
    result = chain(result, (s) => {
      const player = s.players.find((p) => p.id === seat.id)!;
      const { base, amount, reached } = zakatDue(s, player);
      if (!reached) {
        const interrupted = player.hawlRounds > 0;
        return step(updatePlayer(s, player.id, { hawlRounds: 0 }), interrupted ? [{ type: "HawlInterrupted", playerId: player.id, rounds: player.hawlRounds, base, nisab: zakat.nisabKounouz }] : []);
      }
      const rounds = player.hawlRounds + 1;
      if (rounds < zakat.cycleRounds) return step(updatePlayer(s, player.id, { hawlRounds: rounds }), [{ type: "HawlAdvanced", playerId: player.id, rounds, of: zakat.cycleRounds }]);
      // Ḥawl accompli : Zakat due sur les Kounouz éligibles possédés maintenant, puis nouveau ḥawl.
      const to: MoneyDestination = { kind: "masakin" };
      let paid = step(updatePlayer(s, player.id, { hawlRounds: 0 }), [{ type: "HawlCompleted", playerId: player.id, rounds, base, amount }]);
      if (amount > 0) {
        paid = chain(paid, (x) => fundDeposit(x, player.id, amount, "zakat", "zakat_paid"));
        paid = chain(paid, (x) => step(x, [{ type: "ZakatPaid", playerId: player.id, year: x.calendar.year, base, amount, to }]));
      }
      return paid;
    });
  }
  if (yearDone) result = chain(result, (s) => step(s, [{ type: "YearCompleted", year: state.calendar.year }]));
  return result;
}
