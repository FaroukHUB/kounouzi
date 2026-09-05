import { applyTransaction } from "./economy";
import { expireEffects, takeEffect } from "./effects";
import { computeRanking, shouldEndAfterTurn } from "./scoring";
import { activePlayer, chain, step, updatePlayer, type Step } from "./step";
import type { GameState } from "./types";
import { completeRound } from "./zakat";

/**
 * Ouvre un tour pour le joueur actif. Ordre : expiration des effets, puis un
 * `skip_turn` en attente est consommé immédiatement (ni Chemin, ni
 * déplacement — mais le tour est COMPTÉ), puis une Halte du voyage impose un
 * Défi de reprise AVANT tout Chemin.
 */
export function startTurn(state: GameState): Step {
  const player = activePlayer(state);
  const turnNumber = state.turnNumber + 1;
  let result = step({ ...state, turnNumber, phase: { kind: "awaiting_journey" } }, [{ type: "TurnStarted", turnNumber, playerId: player.id }]);
  result = chain(result, (s) => expireEffects(s, player.id));

  const skip = takeEffect(result.state, player.id, "skip_turn");
  if (skip.effect && skip.effectId !== undefined) {
    const effectId = skip.effectId;
    result = chain(result, () => skip.step);
    result = chain(result, (s) => step(s, [{ type: "TurnSkipped", turnNumber, playerId: player.id, effectId }]));
    return chain(result, closeTurn);
  }

  if (player.halted) {
    return chain(result, (s) => {
      const requestId = `q${s.counters.request + 1}`;
      return step(
        { ...s, counters: { ...s.counters, request: s.counters.request + 1 }, phase: { kind: "awaiting_answer", requestId, position: player.position, purpose: { kind: "halt" }, queue: [] } },
        [{ type: "QuestionRequested", requestId, playerId: player.id, position: player.position, purpose: "halt" }],
      );
    });
  }
  return result;
}

/**
 * Clôt le tour du joueur actif : comptabilise le tour (joué ou sauté), fait
 * mûrir une épargne, honore un `extra_turn`, puis vérifie la condition de fin
 * au moment où la main passerait — la fin n'intervient qu'à un tour de table
 * complet.
 */
export function closeTurn(state: GameState): Step {
  const player = activePlayer(state);
  const counted = updatePlayer(state, player.id, { turnsPlayed: player.turnsPlayed + 1 });
  let result = step(counted, [{ type: "TurnEnded", turnNumber: state.turnNumber, playerId: player.id }]);
  result = chain(result, (s) => matureSavings(s, player.id));

  const extra = takeEffect(result.state, player.id, "extra_turn");
  if (extra.effect) {
    result = chain(result, () => extra.step);
    return chain(result, startTurn);
  }

  const nextIndex = (state.activePlayerIndex + 1) % state.players.length;
  // Tour de table complet : le calendrier commun avance ; à l'échéance annuelle, la Zakat al-Māl est évaluée pour tous (hors plateau).
  if (nextIndex === 0) result = chain(result, completeRound);
  if (shouldEndAfterTurn(result.state, nextIndex)) {
    return chain(result, (s) => {
      const ranking = computeRanking(s);
      return step({ ...s, status: "finished", phase: { kind: "finished" }, ranking }, [{ type: "GameFinished", ranking }]);
    });
  }

  result = chain(result, (s) => step({ ...s, activePlayerIndex: nextIndex }));
  return chain(result, startTurn);
}

/** Épargne : un tour consommé de moins à chaque clôture (hors tour d'acquisition) ; versement à zéro. */
function matureSavings(state: GameState, playerId: GameState["players"][number]["id"]): Step {
  let result = step(state);
  for (const e of state.effects) {
    if (e.playerId !== playerId || e.spec.type !== "saving_pending" || e.queuedAtTurn === state.turnNumber) continue;
    const remaining = e.spec.turnsRemaining - 1;
    if (remaining > 0) {
      const spec = { ...e.spec, turnsRemaining: remaining };
      result = chain(result, (s) => step({ ...s, effects: s.effects.map((x) => (x.id === e.id ? { ...x, spec } : x)) }));
      continue;
    }
    const payout = e.spec.payout;
    result = chain(result, (s) => step({ ...s, effects: s.effects.filter((x) => x.id !== e.id) }, [{ type: "EffectConsumed", effectId: e.id, playerId, effectType: "saving_pending" }, { type: "SavingMatured", playerId, effectId: e.id, payout }]));
    result = chain(result, (s) => applyTransaction(s, playerId, payout, "saving_payout", e.id));
  }
  return result;
}
