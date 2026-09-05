import type { PlayerId } from "@/core/shared";
import { playerById, step, chain, updatePlayer, type Step } from "./step";
import type { FundId, FundTransactionReason, GameState, InsufficientPolicy, TransactionReason, TransferReason } from "./types";

/**
 * Toute variation d'argent passe par le grand livre. Aucune règle n'écrit un
 * solde directement. Si `allowNegativeBalance` est faux, une perte est
 * plafonnée à ce que le joueur possède.
 */
export function applyTransaction(state: GameState, playerId: PlayerId, requestedAmount: number, reason: TransactionReason, ref?: string): Step {
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

/**
 * Montant réellement débitable selon la politique déclarée. `null` = refusé /
 * annulé (aucune écriture). Le solde ne devient jamais négatif par un débit.
 */
export function affordableAmount(state: GameState, playerId: PlayerId, requested: number, policy: InsufficientPolicy): number | null {
  const available = playerById(state, playerId).money;
  const wanted = Math.max(0, Math.trunc(requested));
  if (wanted === 0) return 0;
  // Si les règles autorisent un solde négatif, l'argent n'est jamais « insuffisant » : le montant complet s'applique.
  if (available >= wanted || state.config.rules.allowNegativeBalance) return wanted;
  switch (policy) {
    case "cap_to_balance":
      return Math.max(0, available);
    case "require_full_amount":
    case "cancel_if_insufficient":
      return null;
  }
}

/**
 * Transfert entre deux joueurs : UNE primitive, deux écritures liées par un
 * identifiant commun, un événement traçable. Jamais deux soldes modifiés à
 * deux endroits différents.
 */
export function transferMoney(state: GameState, fromPlayerId: PlayerId, toPlayerId: PlayerId, requested: number, reason: TransferReason, policy: InsufficientPolicy): Step {
  if (fromPlayerId === toPlayerId) return step(state);
  const amount = affordableAmount(state, fromPlayerId, requested, policy);
  if (amount === null) return step(state, [{ type: "OutcomeCancelled", playerId: fromPlayerId, kind: `transfer:${reason}`, required: requested, available: playerById(state, fromPlayerId).money }]);
  if (amount === 0) return step(state);
  const transferId = `t${state.counters.transfer + 1}`;
  let result = step({ ...state, counters: { ...state.counters, transfer: state.counters.transfer + 1 } });
  result = chain(result, (s) => applyTransaction(s, fromPlayerId, -amount, "transfer_sent", transferId));
  result = chain(result, (s) => applyTransaction(s, toPlayerId, amount, "transfer_received", transferId));
  return chain(result, (s) => step(s, [{ type: "MoneyTransferred", transferId, fromPlayerId, toPlayerId, requested, amount, reason }]));
}

/**
 * Dépôt d'un joueur vers une caisse collective (Caisse Masākīn) : UNE
 * primitive, deux écritures liées par `ref` (grand livre du joueur, grand
 * livre de la caisse). Les Kounouz d'une caisse n'appartiennent à personne.
 * Le montant est plafonné au solde du joueur (jamais négatif).
 */
export function fundDeposit(state: GameState, fromPlayerId: PlayerId, requested: number, reason: FundTransactionReason, playerReason: Extract<TransactionReason, "donation_sent" | "zakat_paid">, fund: FundId = "masakin"): Step {
  const amount = Math.min(Math.max(0, Math.trunc(requested)), Math.max(0, playerById(state, fromPlayerId).money));
  if (amount === 0) return step(state);
  const id = state.fundLedger.length + 1;
  const ref = `f${id}`;
  let result = applyTransaction(state, fromPlayerId, -amount, playerReason, ref);
  result = chain(result, (s) => {
    const balanceAfter = s.funds[fund] + amount;
    const entry = { id, turnNumber: s.turnNumber, fund, fromPlayerId, amount, reason, balanceAfter, ref };
    return step({ ...s, funds: { ...s.funds, [fund]: balanceAfter }, fundLedger: [...s.fundLedger, entry] }, [{ type: "FundChanged", fund, fromPlayerId, amount, reason, balanceAfter, ref }]);
  });
  return result;
}

/** Somme du grand livre d'une caisse — doit toujours égaler son solde. */
export function fundLedgerBalance(state: GameState, fund: FundId): number {
  return state.fundLedger.filter((t) => t.fund === fund).reduce((sum, t) => sum + t.amount, 0);
}

/** Somme du grand livre pour un joueur — doit toujours égaler son solde. */
export function ledgerBalance(state: GameState, playerId: PlayerId): number {
  return state.ledger.filter((t) => t.playerId === playerId).reduce((sum, t) => sum + t.amount, 0);
}

/** Joueur (autre que `except`) ayant le moins d'argent ; départage par siège. */
export function poorestPlayer(state: GameState, except?: PlayerId): PlayerId | null {
  const candidates = state.players.filter((p) => p.id !== except);
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => a.money - b.money || a.seat - b.seat)[0]!.id;
}

/** Joueur ayant le plus d'argent ; départage par siège. */
export function richestPlayer(state: GameState): PlayerId {
  return [...state.players].sort((a, b) => b.money - a.money || a.seat - b.seat)[0]!.id;
}
