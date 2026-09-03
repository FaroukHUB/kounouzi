import { takeEffect } from "./effects";
import { computeRanking, isGameOver } from "./scoring";
import { activePlayer, step, chain, updatePlayer, type Step } from "./step";
import type { GameState } from "./types";

/** Ouvre un tour pour le joueur actif ; un `skip_turn` en attente le saute immédiatement. */
export function startTurn(state: GameState): Step {
  const player = activePlayer(state);
  const turnNumber = state.turnNumber + 1;
  let result = step({ ...state, turnNumber, phase: { kind: "awaiting_spin" } }, [{ type: "TurnStarted", turnNumber, playerId: player.id }]);

  const skip = takeEffect(result.state, player.id, "skip_turn");
  if (skip.effect && skip.effectId !== undefined) {
    const effectId = skip.effectId;
    result = chain(result, () => skip.step);
    result = chain(result, (s) => step(s, [{ type: "TurnSkipped", turnNumber, playerId: player.id, effectId }]));
    return chain(result, (s) => closeTurn(s, { counted: false }));
  }
  return result;
}

/**
 * Clôt le tour du joueur actif : comptabilise le tour, vérifie la condition de
 * fin, honore un `extra_turn`, sinon passe la main.
 */
export function closeTurn(state: GameState, options: { readonly counted: boolean } = { counted: true }): Step {
  const player = activePlayer(state);
  const counted = options.counted ? updatePlayer(state, player.id, { turnsPlayed: player.turnsPlayed + 1 }) : state;
  let result = step(counted, [{ type: "TurnEnded", turnNumber: state.turnNumber, playerId: player.id }]);

  if (isGameOver(result.state)) {
    return chain(result, (s) => {
      const ranking = computeRanking(s);
      return step({ ...s, status: "finished", phase: { kind: "finished" }, ranking }, [{ type: "GameFinished", ranking }]);
    });
  }

  const extra = takeEffect(result.state, player.id, "extra_turn");
  if (extra.effect) {
    result = chain(result, () => extra.step);
    return chain(result, startTurn);
  }

  const nextIndex = (state.activePlayerIndex + 1) % state.players.length;
  result = chain(result, (s) => step({ ...s, activePlayerIndex: nextIndex }));
  return chain(result, startTurn);
}
