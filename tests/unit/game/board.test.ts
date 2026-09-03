import { describe, expect, it } from "vitest";
import { BOARD_32_V1, loadBoardConfig } from "@/config/board";
import { boardConfigSchema, countCellsByType, heritageSiteSchema, resolveBoard } from "@/core/game";
import { INVALID_RELIGIOUS_PLACE_WITH_PRICE, TEST_MONUMENTS, TEST_RELIGIOUS_PLACE } from "../../fixtures/game/heritage.fixture";

describe("plateau 32 cases — configuration V1 de travail", () => {
  it("respecte la répartition décidée", () => {
    expect(BOARD_32_V1.cellCount).toBe(32);
    expect(countCellsByType(BOARD_32_V1)).toEqual({ start: 1, question: 10, heritage: 8, event: 4, management: 3, challenge: 2, solidarity: 2, treasure: 2 });
  });

  it("place le départ en 0 et suit l'ordre de travail fourni", () => {
    const types = [...BOARD_32_V1.cells].sort((a, b) => a.position - b.position).map((c) => c.type);
    expect(types[0]).toBe("start");
    expect(types[2]).toBe("heritage");
    expect(types[10]).toBe("treasure");
    expect(types[12]).toBe("solidarity");
    expect(types[31]).toBe("question");
  });

  it("refuse une configuration incohérente", () => {
    expect(boardConfigSchema.safeParse({ ...BOARD_32_V1, cellCount: 31 }).success).toBe(false);
    const noStart = { ...BOARD_32_V1, cells: BOARD_32_V1.cells.map((c) => (c.type === "start" ? { ...c, type: "question" as const } : c)) };
    expect(boardConfigSchema.safeParse(noStart).success).toBe(false);
    const duplicate = { ...BOARD_32_V1, cells: BOARD_32_V1.cells.map((c, i) => (i === 1 ? { ...c, position: 0 } : c)) };
    expect(boardConfigSchema.safeParse(duplicate).success).toBe(false);
    expect(() => loadBoardConfig({ id: "x" })).toThrow();
  });

  it("accepte un autre plateau valide sans changement du moteur", () => {
    const other = loadBoardConfig({
      id: "board-12",
      version: 1,
      cellCount: 12,
      cells: Array.from({ length: 12 }, (_, i) => ({ position: i, type: i === 0 ? "start" : i % 3 === 0 ? "heritage" : "question" })),
    });
    const resolved = resolveBoard(other, TEST_MONUMENTS.slice(0, 3));
    expect(resolved.ok).toBe(true);
  });
});

describe("sites patrimoniaux — règle structurelle", () => {
  it("un lieu religieux ne peut pas porter de prix (schéma)", () => {
    expect(heritageSiteSchema.safeParse(TEST_RELIGIOUS_PLACE).success).toBe(true);
    expect(heritageSiteSchema.safeParse(INVALID_RELIGIOUS_PLACE_WITH_PRICE).success).toBe(false);
  });

  it("un monument achetable exige un prix et une valeur", () => {
    expect(heritageSiteSchema.safeParse({ id: "m", kind: "purchasable_monument" }).success).toBe(false);
    expect(heritageSiteSchema.safeParse(TEST_MONUMENTS[0]).success).toBe(true);
  });

  it("le plateau refuse un lieu religieux sur une case d'achat", () => {
    const sites = [...TEST_MONUMENTS.slice(0, 7), TEST_RELIGIOUS_PLACE];
    const resolved = resolveBoard(BOARD_32_V1, sites);
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) expect(resolved.error).toEqual({ code: "NON_PURCHASABLE_SITE", siteId: "test-religious-place", kind: "religious_place" });
  });

  it("le plateau exige exactement un site par case monument", () => {
    const resolved = resolveBoard(BOARD_32_V1, TEST_MONUMENTS.slice(0, 7));
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) expect(resolved.error.code).toBe("HERITAGE_COUNT_MISMATCH");
  });

  it("associe les sites aux cases monument dans l'ordre des positions", () => {
    const resolved = resolveBoard(BOARD_32_V1, TEST_MONUMENTS);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    const heritage = resolved.value.board.cells.filter((c) => c.type === "heritage");
    expect(heritage.map((c) => c.position)).toEqual([2, 6, 9, 13, 16, 20, 24, 28]);
    expect(heritage.map((c) => (c.type === "heritage" ? c.siteId : ""))).toEqual(TEST_MONUMENTS.map((m) => m.id));
    expect(Object.keys(resolved.value.sites)).toHaveLength(8);
  });
});
