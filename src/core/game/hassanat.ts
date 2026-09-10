import type { PlayerId } from "@/core/shared";
import { applyTransaction, fundDeposit, transferMoney } from "./economy";
import { holdingsOf } from "./holdings";
import { chain, playerById, step, updatePlayer, type Step } from "./step";
import type { EstablishmentFamily, GameState, HassanatCardDefinition, Outcome } from "./types";

/**
 * Cartes Hassanāt (ADR 0035) : occasion VOLONTAIRE de générosité, distincte
 * du Défi (épreuve), du Don (case) et de la Zakat (obligation hors plateau).
 * Les points Hassanāt sont une mécanique de SCORE du jeu Kounouzi ; rien ici
 * ne prétend mesurer une récompense réelle. Sélection déterministe cachée
 * (rotation par compteur, moins servie d'abord), aucun hasard.
 */

/** Un joueur possède TOUTE une famille d'établissements du plateau (au moins un site de la famille, tous à lui). */
export function ownsWholeFamily(state: GameState, playerId: PlayerId, family: EstablishmentFamily): boolean {
  const ids = Object.values(state.config.sites)
    .filter((s) => s.establishment?.family === family)
    .map((s) => s.id);
  if (ids.length === 0) return false;
  const owned = new Set(holdingsOf(state, playerId).map((h) => h.siteId));
  return ids.every((id) => owned.has(id));
}

/** Coût effectif pour ce joueur : `ownerCost` s'il possède la famille requise, sinon `cost`. */
export function hassanatCostFor(state: GameState, playerId: PlayerId, card: HassanatCardDefinition): number {
  if (card.requiresEstablishmentFamily && card.ownerCost !== undefined && ownsWholeFamily(state, playerId, card.requiresEstablishmentFamily)) return card.ownerCost;
  return card.cost;
}

export function isHassanatEligible(state: GameState, playerId: PlayerId, card: HassanatCardDefinition): boolean {
  if (card.requiresEstablishmentFamily && !ownsWholeFamily(state, playerId, card.requiresEstablishmentFamily)) return false;
  if (state.players.length < 2) return false;
  return playerById(state, playerId).money >= hassanatCostFor(state, playerId, card);
}

/**
 * Carte proposée : parmi les éligibles, la moins servie à ce joueur ; à
 * égalité, rotation dans l'ordre de la banque à partir du compteur global.
 */
export function selectHassanatCard(state: GameState, playerId: PlayerId): HassanatCardDefinition | null {
  const eligible = state.config.hassanat.definitions.filter((c) => isHassanatEligible(state, playerId, c));
  if (eligible.length === 0) return null;
  const served = state.hassanatServed[playerId] ?? {};
  const min = Math.min(...eligible.map((c) => served[c.id] ?? 0));
  const least = eligible.filter((c) => (served[c.id] ?? 0) === min);
  const start = (state.counters.hassanat + state.config.scenarioOffset) % least.length;
  return least[start]!;
}

/** Pose la phase Carte Hassanāt (ou `null` si rien n'est éligible), compteurs avancés. */
export function assignHassanat(state: GameState, playerId: PlayerId): ((queue: readonly Outcome[]) => Step) | null {
  const card = selectHassanatCard(state, playerId);
  if (!card) return null;
  return (queue) => {
    const requestId = `h${state.counters.hassanat + 1}`;
    const cost = hassanatCostFor(state, playerId, card);
    const candidates = state.players.filter((p) => p.id !== playerId).map((p) => p.id);
    const mine = state.hassanatServed[playerId] ?? {};
    const next: GameState = {
      ...state,
      counters: { ...state.counters, hassanat: state.counters.hassanat + 1 },
      hassanatServed: { ...state.hassanatServed, [playerId]: { ...mine, [card.id]: (mine[card.id] ?? 0) + 1 } },
      phase: { kind: "awaiting_hassanat", hassanat: { cardId: card.id, playerId, requestId, cost, candidates }, queue: [...queue] },
    };
    return step(next, [{ type: "HassanatOffered", playerId, cardId: card.id, kind: card.kind, cost, hassanatReward: card.hassanatReward, candidates }]);
  };
}

/** Coût réglé selon la destination déclarée par la carte, puis points crédités UNE fois (grand livre Hassanāt). */
export function acceptHassanat(state: GameState, playerId: PlayerId, card: HassanatCardDefinition, cost: number, beneficiaryId: PlayerId, requestId: string): Step {
  let result = step(state);
  if (cost > 0) {
    if (card.costDestination === "beneficiary") result = transferMoney(state, playerId, beneficiaryId, cost, "hassanat", "require_full_amount");
    else if (card.costDestination === "masakin") result = fundDeposit(state, playerId, cost, "hassanat", "hassanat_cost");
    else result = applyTransaction(state, playerId, -cost, "hassanat_cost", requestId);
    result = chain(result, (s) => {
      const giver = playerById(s, playerId);
      return step(updatePlayer(s, playerId, { solidarityActions: giver.solidarityActions + 1, solidarityGiven: giver.solidarityGiven + cost }));
    });
  }
  result = chain(result, (s) => step(s, [{ type: "HassanatAccepted", playerId, cardId: card.id, beneficiaryId, cost }]));
  if (card.hassanatReward > 0) result = chain(result, (s) => grantHassanat(s, playerId, card.hassanatReward, `${requestId}:${card.id}`, card.id));
  return result;
}

/** Attribution de points Hassanāt : refusée si la référence a déjà été créditée (jamais deux fois). */
export function grantHassanat(state: GameState, playerId: PlayerId, amount: number, ref: string, cardId: string): Step {
  if (amount <= 0 || state.hassanatLedger.some((h) => h.ref === ref)) return step(state);
  const player = playerById(state, playerId);
  const total = player.hassanatPoints + amount;
  const entry = { id: state.hassanatLedger.length + 1, turnNumber: state.turnNumber, playerId, amount, source: "hassanat_card" as const, ref };
  return step({ ...updatePlayer(state, playerId, { hassanatPoints: total }), hassanatLedger: [...state.hassanatLedger, entry] }, [{ type: "HassanatGranted", playerId, cardId, amount, ref, total }]);
}

export const hassanatCardById = (state: GameState, cardId: string): HassanatCardDefinition | undefined => state.config.hassanat.definitions.find((c) => c.id === cardId);
