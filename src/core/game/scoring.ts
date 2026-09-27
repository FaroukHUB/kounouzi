import type { PlayerId } from "@/core/shared";
import { holdingsOf } from "./holdings";
import { roundMoney } from "./money";
import type { GameState, RankingEntry } from "./types";

export function heritageValueOf(state: GameState, playerId: PlayerId): number {
  return holdingsOf(state, playerId).reduce((sum, h) => sum + h.heritageValue, 0);
}

/**
 * La partie doit-elle se terminer une fois ce tour clos ? `nextIndex` est le
 * siège qui jouerait ensuite : `0` signifie qu'un tour de table complet vient
 * de s'achever — seul moment où une fin par durée ou sur demande est permise,
 * pour que tous aient joué le même nombre de tours.
 */
export function shouldEndAfterTurn(state: GameState, nextIndex: number): boolean {
  const roundComplete = nextIndex === 0;
  if (state.endRequested && roundComplete) return true;
  const condition = state.config.rules.endCondition;
  switch (condition.kind) {
    case "turns_per_player":
      return state.players.every((p) => p.turnsPlayed >= condition.turns);
    case "active_time":
      return roundComplete && (state.clock.timeTargetReached || state.clock.activePlaySeconds >= condition.targetSeconds);
    case "free":
      return false;
  }
}

/**
 * Score d'un joueur : argent + patrimoine + points Hassanāt, chaque terme
 * pondéré par une DONNÉE de règles (ADR 0042). Les trois poids sont
 * configurables ; aucun n'est codé en dur ici.
 *
 * Le poids Hassanāt fait de la générosité une vraie dimension de victoire :
 * un joueur peut gagner sans être le plus riche. Il est mesuré, pas deviné —
 * à 5, les Hassanāt d'une partie pèsent le même ordre de grandeur que l'écart
 * naturel de gestion, donc ils départagent sans écraser. Le monter davantage
 * ferait finir dernier le meilleur gestionnaire ; le laisser à 0 rendrait la
 * générosité décorative.
 */
export function scoreOf(state: GameState, playerId: PlayerId): number {
  const { moneyWeight, heritageWeight, hassanatWeight } = state.config.rules.scoring;
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error(`joueur ${playerId} inconnu (invariant)`);
  return roundMoney(player.money * moneyWeight + heritageValueOf(state, playerId) * heritageWeight + player.hassanatPoints * hassanatWeight);
}

/** Classement : score, puis argent, puis ordre de siège (déterministe, jamais un départage au hasard). */
export function computeRanking(state: GameState): readonly RankingEntry[] {
  const rows = state.players.map((p) => ({ playerId: p.id, seat: p.seat, money: p.money, heritageValue: heritageValueOf(state, p.id), hassanat: p.hassanatPoints, score: scoreOf(state, p.id) }));
  rows.sort((a, b) => b.score - a.score || b.money - a.money || a.seat - b.seat);
  return rows.map((r, i) => ({ rank: i + 1, playerId: r.playerId, score: r.score, money: r.money, heritageValue: r.heritageValue, hassanat: r.hassanat }));
}
