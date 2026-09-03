import type { PlayerId } from "@/core/shared";
import { playerById, step, updatePlayer, type Step } from "./step";
import type { GameState, TransactionReason } from "./types";

/**
 * Toute variation d'argent passe par le grand livre. Aucune règle n'écrit un
 * solde directement. Si `allowNegativeBalance` est faux, une perte est
 * plafonnée à ce que le joueur possède.
 */
export function applyTransaction(
  state: GameState,
  playerId: PlayerId,
  requestedAmount: number,
  reason: TransactionReason,
  ref?: string,
): Step {
  const player = playerById(state, playerId);
  let amount = Math.trunc(requestedAmount);
  if (amount < 0 && !state.config.rules.allowNegativeBalance && player.money + amount < 0) {
    amount = -player.money;
  }
  if (amount === 0) return step(state);

  const id = state.counters.transaction + 1;
  const balanceAfter = player.money + amount;
  const transaction = {
    id,
    turnNumber: state.turnNumber,
    playerId,
    amount,
    reason,
    balanceAfter,
    ...(ref === undefined ? {} : { ref }),
  };
  const next: GameState = {
    ...updatePlayer(state, playerId, { money: balanceAfter }),
    ledger: [...state.ledger, transaction],
    counters: { ...state.counters, transaction: id },
  };
  return step(next, [{ type: "MoneyChanged", transactionId: id, playerId, amount, reason, balanceAfter }]);
}

/** Somme du grand livre pour un joueur — doit toujours égaler son solde. */
export function ledgerBalance(state: GameState, playerId: PlayerId): number {
  return state.ledger.filter((t) => t.playerId === playerId).reduce((sum, t) => sum + t.amount, 0);
}
