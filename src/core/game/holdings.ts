import { err, ok, type PlayerId, type Result } from "@/core/shared";
import { applyTransaction } from "./economy";
import { takeEffect } from "./effects";
import type { GameError } from "./errors";
import { playerById, step, chain, type Step } from "./step";
import type { GameState, Holding } from "./types";

export function holdingOf(state: GameState, siteId: string): Holding | undefined {
  return state.holdings.find((h) => h.siteId === siteId);
}

export function holdingsOf(state: GameState, playerId: PlayerId): readonly Holding[] {
  return state.holdings.filter((h) => h.ownerId === playerId);
}

/** Prix effectif d'un site pour un joueur : une réduction en attente s'applique (sans être consommée ici). */
export function effectivePrice(state: GameState, playerId: PlayerId, siteId: string): number {
  const site = state.config.sites[siteId];
  if (!site) throw new Error(`site ${siteId} inconnu de la configuration (invariant)`);
  const discount = state.effects.find((e) => e.playerId === playerId && e.spec.type === "next_purchase_discount");
  const percent = discount?.spec.type === "next_purchase_discount" ? discount.spec.percent : 0;
  return Math.max(0, Math.round(site.price * (1 - percent / 100)));
}

/**
 * Achat d'un monument : site libre, solde suffisant (prix effectif), débit,
 * entrée au patrimoine, réduction consommée si elle a servi.
 */
export function purchaseSite(state: GameState, playerId: PlayerId, siteId: string): Result<Step, GameError> {
  const site = state.config.sites[siteId];
  if (!site) throw new Error(`site ${siteId} inconnu de la configuration (invariant)`);
  const existing = holdingOf(state, siteId);
  if (existing) return err({ code: "SITE_ALREADY_OWNED", siteId, ownerId: existing.ownerId });
  const buyer = playerById(state, playerId);
  const price = effectivePrice(state, playerId, siteId);
  if (buyer.money < price) return err({ code: "INSUFFICIENT_FUNDS", required: price, available: buyer.money });

  const holding: Holding = { siteId, ownerId: playerId, price, heritageValue: site.heritageValue, acquiredTurn: state.turnNumber };
  let result = step(state);
  if (price !== site.price) {
    const discount = takeEffect(state, playerId, "next_purchase_discount");
    result = chain(result, () => discount.step);
  }
  result = chain(result, (s) => applyTransaction(s, playerId, -price, "purchase", siteId));
  result = chain(result, (s) => step({ ...s, holdings: [...s.holdings, holding] }, [{ type: "SiteAcquired", playerId, siteId, price, heritageValue: site.heritageValue }]));
  return ok(result);
}
