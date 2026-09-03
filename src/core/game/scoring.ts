import type { PlayerId } from "@/core/shared";
import { holdingsOf } from "./holdings";
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

export function scoreOf(state: GameState, playerId: PlayerId): number {
  const { moneyWeight, heritageWeight } = state.config.rules.scoring;
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error(`joueur ${playerId} inconnu (invariant)`);
  return player.money * moneyWeight + heritageValueOf(state, playerId) * heritageWeight;
}

/**
 * Classement : score, puis argent, puis ordre de siège (déterministe).
 * ⚠️ Formule provisoire (fixtures de test) : le scoring définitif de Kounouzi
 * intégrera plusieurs dimensions (patrimoine, gestion, savoir, solidarité).
 */
export function computeRanking(state: GameState): readonly RankingEntry[] {
  const rows = state.players.map((p) => ({ playerId: p.id, seat: p.seat, money: p.money, heritageValue: heritageValueOf(state, p.id), score: scoreOf(state, p.id) }));
  rows.sort((a, b) => b.score - a.score || b.money - a.money || a.seat - b.seat);
  return rows.map((r, i) => ({ rank: i + 1, playerId: r.playerId, score: r.score, money: r.money, heritageValue: r.heritageValue }));
}
