import type { PlayerId } from "@/core/shared";
import { holdingsOf } from "./holdings";
import type { GameState, RankingEntry } from "./types";

export function heritageValueOf(state: GameState, playerId: PlayerId): number {
  return holdingsOf(state, playerId).reduce((sum, h) => sum + h.heritageValue, 0);
}

/** Condition de fin configurable ; ajouter un `kind` oblige à compléter ce `switch`. */
export function isGameOver(state: GameState): boolean {
  const condition = state.config.rules.endCondition;
  switch (condition.kind) {
    case "turns_per_player":
      return state.players.every((p) => p.turnsPlayed >= condition.turns);
  }
}

export function scoreOf(state: GameState, playerId: PlayerId): number {
  const { moneyWeight, heritageWeight } = state.config.rules.scoring;
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error(`joueur ${playerId} inconnu (invariant)`);
  return player.money * moneyWeight + heritageValueOf(state, playerId) * heritageWeight;
}

/** Classement : score, puis argent, puis ordre de siège (déterministe). */
export function computeRanking(state: GameState): readonly RankingEntry[] {
  const rows = state.players.map((p) => ({
    playerId: p.id,
    seat: p.seat,
    money: p.money,
    heritageValue: heritageValueOf(state, p.id),
    score: scoreOf(state, p.id),
  }));
  rows.sort((a, b) => b.score - a.score || b.money - a.money || a.seat - b.seat);
  return rows.map((r, i) => ({ rank: i + 1, playerId: r.playerId, score: r.score, money: r.money, heritageValue: r.heritageValue }));
}
