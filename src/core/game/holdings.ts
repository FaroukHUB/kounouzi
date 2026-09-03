import { err, ok, type PlayerId, type Result } from "@/core/shared";
import { applyTransaction } from "./economy";
import type { GameError } from "./errors";
import { playerById, step, chain, type Step } from "./step";
import type { GameState, Holding } from "./types";

export function holdingOf(state: GameState, siteId: string): Holding | undefined {
  return state.holdings.find((h) => h.siteId === siteId);
}

export function holdingsOf(state: GameState, playerId: PlayerId): readonly Holding[] {
  return state.holdings.filter((h) => h.ownerId === playerId);
}

/**
 * Achat d'un monument : site libre, solde suffisant, débit, entrée au
 * patrimoine. Aucun paiement entre joueurs, aucun revenu : la possession ne
 * fait, en Phase 2, que conserver une valeur patrimoniale comptée au score.
 */
export function purchaseSite(state: GameState, playerId: PlayerId, siteId: string): Result<Step, GameError> {
  const site = state.config.sites[siteId];
  if (!site) throw new Error(`site ${siteId} inconnu de la configuration (invariant)`);
  const existing = holdingOf(state, siteId);
  if (existing) return err({ code: "SITE_ALREADY_OWNED", siteId, ownerId: existing.ownerId });
  const buyer = playerById(state, playerId);
  if (buyer.money < site.price) return err({ code: "INSUFFICIENT_FUNDS", required: site.price, available: buyer.money });

  const holding: Holding = { siteId, ownerId: playerId, price: site.price, heritageValue: site.heritageValue, acquiredTurn: state.turnNumber };
  let result = applyTransaction(state, playerId, -site.price, "purchase", siteId);
  result = chain(result, (s) =>
    step({ ...s, holdings: [...s.holdings, holding] }, [
      { type: "SiteAcquired", playerId, siteId, price: site.price, heritageValue: site.heritageValue },
    ]),
  );
  return ok(result);
}
