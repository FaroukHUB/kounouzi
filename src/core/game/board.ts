import { err, ok, type Result } from "@/core/shared";
import type { BoardConfig, CellType, HeritageSite, PurchasableSite, ResolvedBoard, ResolvedCell } from "./types";

export type BoardError =
  | { readonly code: "NO_START_CELL" }
  | { readonly code: "HERITAGE_COUNT_MISMATCH"; readonly expected: number; readonly received: number }
  | { readonly code: "NON_PURCHASABLE_SITE"; readonly siteId: string; readonly kind: string }
  | { readonly code: "DUPLICATE_SITE"; readonly siteId: string };

/**
 * Associe les sites aux cases `heritage`, dans l'ordre des positions.
 * Refuse structurellement tout site qui n'est pas un monument achetable :
 * un lieu religieux ne peut jamais se retrouver sur une case d'achat.
 */
export function resolveBoard(
  config: BoardConfig,
  sites: readonly HeritageSite[],
): Result<{ board: ResolvedBoard; sites: Readonly<Record<string, PurchasableSite>> }, BoardError> {
  const ordered = [...config.cells].sort((a, b) => a.position - b.position);
  const start = ordered.find((c) => c.type === "start");
  if (!start) return err({ code: "NO_START_CELL" });

  const heritageCells = ordered.filter((c) => c.type === "heritage");
  if (heritageCells.length !== sites.length) {
    return err({ code: "HERITAGE_COUNT_MISMATCH", expected: heritageCells.length, received: sites.length });
  }

  const purchasable: Record<string, PurchasableSite> = {};
  for (const site of sites) {
    if (site.kind !== "purchasable_monument" || site.price === undefined || site.heritageValue === undefined) {
      return err({ code: "NON_PURCHASABLE_SITE", siteId: site.id, kind: site.kind });
    }
    if (purchasable[site.id]) return err({ code: "DUPLICATE_SITE", siteId: site.id });
    purchasable[site.id] = { id: site.id, price: site.price, heritageValue: site.heritageValue };
  }

  let siteIndex = 0;
  const cells: ResolvedCell[] = ordered.map((c) => {
    if (c.type === "heritage") {
      const site = sites[siteIndex++];
      if (!site) throw new Error("resolveBoard: site manquant (invariant)");
      return { position: c.position, type: "heritage", siteId: site.id };
    }
    return { position: c.position, type: c.type };
  });

  return ok({
    board: { id: config.id, version: config.version, cellCount: config.cellCount, startPosition: start.position, cells },
    sites: purchasable,
  });
}

export function cellAt(board: ResolvedBoard, position: number): ResolvedCell {
  const cell = board.cells[position];
  if (!cell || cell.position !== position) throw new Error(`cellAt: position ${position} invalide (invariant)`);
  return cell;
}

export function countCellsByType(config: BoardConfig): Readonly<Record<CellType, number>> {
  const counts = { start: 0, question: 0, heritage: 0, event: 0, management: 0, challenge: 0, solidarity: 0, treasure: 0, halt: 0 };
  for (const c of config.cells) counts[c.type] += 1;
  return counts;
}
