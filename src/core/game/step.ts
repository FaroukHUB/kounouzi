import type { PlayerId } from "@/core/shared";
import type { GameEvent } from "./events";
import type { GameState, PlayerState } from "./types";

/** Résultat intermédiaire d'une règle : un nouvel état et les événements produits. */
export interface Step {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

export const step = (state: GameState, events: readonly GameEvent[] = []): Step => ({ state, events });

/** Enchaîne une règle après une autre en accumulant les événements. */
export function chain(previous: Step, rule: (state: GameState) => Step): Step {
  const next = rule(previous.state);
  return { state: next.state, events: [...previous.events, ...next.events] };
}

export function activePlayer(state: GameState): PlayerState {
  const player = state.players[state.activePlayerIndex];
  if (!player) throw new Error(`activePlayerIndex ${state.activePlayerIndex} invalide (invariant)`);
  return player;
}

export function playerById(state: GameState, playerId: PlayerId): PlayerState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error(`joueur ${playerId} inconnu (invariant)`);
  return player;
}

export function updatePlayer(state: GameState, playerId: PlayerId, patch: Partial<Omit<PlayerState, "id">>): GameState {
  return { ...state, players: state.players.map((p) => (p.id === playerId ? { ...p, ...patch } : p)) };
}
