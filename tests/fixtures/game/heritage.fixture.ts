import type { HeritageSite } from "@/core/game";

/** ⚠️ Monuments fictifs de test — aucun monument réel n'est défini en Phase 2. */
export const TEST_MONUMENTS: readonly HeritageSite[] = Array.from({ length: 12 }, (_, i) => ({
  id: `test-monument-${String(i + 1).padStart(2, "0")}`,
  kind: "purchasable_monument",
  price: 300 + i * 50,
  heritageValue: 250 + i * 60,
}));

/** Un lieu religieux : jamais de prix, jamais achetable. */
export const TEST_RELIGIOUS_PLACE: HeritageSite = { id: "test-religious-place", kind: "religious_place" };

/** Donnée volontairement invalide pour prouver le refus structurel. */
export const INVALID_RELIGIOUS_PLACE_WITH_PRICE = { id: "test-invalid", kind: "religious_place", price: 100, heritageValue: 100 } as const;
