import { describe, expect, it } from "vitest";
import { BOARD_26_V1, DEFAULT_BOARD, loadBoardConfig } from "@/config/board";
import { DEMO_HERITAGE_SITES } from "@/config/demo";
import { boardConfigSchema, countCellsByType, heritageSiteSchema, resolveBoard, type CellType } from "@/core/game";
import { INVALID_RELIGIOUS_PLACE_WITH_PRICE, TEST_MONUMENTS, TEST_RELIGIOUS_PLACE } from "../../fixtures/game/heritage.fixture";

const EXPECTED_ORDER: readonly CellType[] = ["start", "heritage", "question", "heritage", "challenge", "heritage", "halt", "heritage", "question", "heritage", "challenge", "heritage", "donation", "heritage", "question", "heritage", "challenge", "heritage", "halt", "heritage", "question", "heritage", "treasure", "challenge", "question", "heritage"];

describe("plateau 26 cases — configuration produit (ADR 0033)", () => {
  it("compte exactement 26 cases : 12 monuments, 5 Savoir, 4 Défi, 2 Halte, 1 Don, 1 Trésor, 1 Départ ; aucune case Zakat ni ancienne case", () => {
    expect(DEFAULT_BOARD).toBe(BOARD_26_V1);
    expect(BOARD_26_V1.cells.length).toBe(26);
    expect(BOARD_26_V1.cellCount).toBe(BOARD_26_V1.cells.length);
    expect(countCellsByType(BOARD_26_V1)).toEqual({ start: 1, heritage: 12, question: 5, challenge: 4, halt: 2, donation: 1, treasure: 1, event: 0, management: 0, solidarity: 0 });
    expect(JSON.stringify(BOARD_26_V1)).not.toMatch(/zakat/i);
  });

  it("suit exactement l'ordre décidé (départ en 0)", () => {
    const types = [...BOARD_26_V1.cells].sort((a, b) => a.position - b.position).map((c) => c.type);
    expect(types).toEqual(EXPECTED_ORDER);
    expect(BOARD_26_V1.cells.map((c) => c.position)).toEqual(Array.from({ length: 26 }, (_, i) => i));
  });

  it("les 12 monuments de démonstration remplissent exactement les 12 cases Monument (aucun lieu religieux)", () => {
    expect(DEMO_HERITAGE_SITES).toHaveLength(12);
    expect(DEMO_HERITAGE_SITES.every((s) => s.kind === "purchasable_monument")).toBe(true);
    const resolved = resolveBoard(BOARD_26_V1, DEMO_HERITAGE_SITES);
    expect(resolved.ok).toBe(true);
    if (resolved.ok) {
      expect(resolved.value.board.cells.filter((c) => c.type === "heritage")).toHaveLength(12);
      expect(Object.keys(resolved.value.sites)).toHaveLength(12);
      expect(resolved.value.board.startPosition).toBe(0);
    }
    // Onze sites seulement : refus structurel (le nombre de cases vient du plateau, jamais d'une constante).
    expect(resolveBoard(BOARD_26_V1, DEMO_HERITAGE_SITES.slice(0, 11)).ok).toBe(false);
  });

  it("refuse une configuration incohérente", () => {
    expect(boardConfigSchema.safeParse({ ...BOARD_26_V1, cellCount: 25 }).success).toBe(false);
    const noStart = { ...BOARD_26_V1, cells: BOARD_26_V1.cells.map((c) => (c.type === "start" ? { ...c, type: "question" as const } : c)) };
    expect(boardConfigSchema.safeParse(noStart).success).toBe(false);
    const duplicate = { ...BOARD_26_V1, cells: BOARD_26_V1.cells.map((c, i) => (i === 1 ? { ...c, position: 0 } : c)) };
    expect(boardConfigSchema.safeParse(duplicate).success).toBe(false);
    expect(boardConfigSchema.safeParse({ ...BOARD_26_V1, cells: [...BOARD_26_V1.cells.slice(0, 25), { position: 25, type: "zakat" }] }).success).toBe(false);
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
    const sites = [...TEST_MONUMENTS.slice(0, 11), TEST_RELIGIOUS_PLACE];
    const resolved = resolveBoard(BOARD_26_V1, sites);
    expect(resolved.ok).toBe(false);
    if (!resolved.ok) expect(resolved.error).toEqual({ code: "NON_PURCHASABLE_SITE", siteId: "test-religious-place", kind: "religious_place" });
  });
});
