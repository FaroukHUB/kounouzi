import { takeEffect } from "./effects";
import { computeRanking, shouldEndAfterTurn } from "./scoring";
import { activePlayer, chain, step, updatePlayer, type Step } from "./step";
import type { GameState } from "./types";

/**
 * Ouvre un tour pour le joueur actif. Un `skip_turn` en attente est consommé
 * immédiatement : ni Chemin, ni déplacement, ni résolution — mais le tour est
 * COMPTÉ (le joueur perd l'un de ses tours, il n'en récupère pas un autre).
 */
export function startTurn(state: GameState): Step {
  const player = activePlayer(state);
  const turnNumber = state.turnNumber + 1;
  let result = step({ ...state, turnNumber, phase: { kind: "awaiting_journey" } }, [{ type: "TurnStarted", turnNumber, playerId: player.id }]);

  const skip = takeEffect(result.state, player.id, "skip_turn");
  if (skip.effect && skip.effectId !== undefined) {
    const effectId = skip.effectId;
    result = chain(result, () => skip.step);
    result = chain(result, (s) => step(s, [{ type: "TurnSkipped", turnNumber, playerId: player.id, effectId }]));
    return chain(result, closeTurn);
  }
  return result;
}

/**
 * Clôt le tour du joueur actif : comptabilise le tour (joué ou sauté),
 * honore un `extra_turn`, puis vérifie la condition de fin au moment où la
 * main passerait — la fin n'intervient qu'à un tour de table complet.
 */
export function closeTurn(state: GameState): Step {
  const player = activePlayer(state);
  const counted = updatePlayer(state, player.id, { turnsPlayed: player.turnsPlayed + 1 });
  let result = step(counted, [{ type: "TurnEnded", turnNumber: state.turnNumber, playerId: player.id }]);

  const extra = takeEffect(result.state, player.id, "extra_turn");
  if (extra.effect) {
    result = chain(result, () => extra.step);
    return chain(result, startTurn);
  }

  const nextIndex = (state.activePlayerIndex + 1) % state.players.length;
  if (shouldEndAfterTurn(result.state, nextIndex)) {
    return chain(result, (s) => {
      const ranking = computeRanking(s);
      return step({ ...s, status: "finished", phase: { kind: "finished" }, ranking }, [{ type: "GameFinished", ranking }]);
    });
  }

  result = chain(result, (s) => step({ ...s, activePlayerIndex: nextIndex }));
  return chain(result, startTurn);
}
