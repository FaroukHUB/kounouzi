import { describe, expect, it } from "vitest";
import { computePath, computePathTo, resolveBoard } from "@/core/game";
import { DEFAULT_BOARD } from "@/config/board";
import { TEST_MONUMENTS } from "../../fixtures/game/heritage.fixture";

const resolved = resolveBoard(DEFAULT_BOARD, TEST_MONUMENTS);
if (!resolved.ok) throw new Error("fixture");
const board = resolved.value.board;

describe("déplacement", () => {
  it("avance case par case", () => {
    expect(computePath(7, 4, board)).toEqual({ from: 7, to: 11, path: [8, 9, 10, 11], passedStart: false });
  });

  it("boucle de la dernière case (25) à 0 et signale le passage par le départ (26 cases, lu dans le plateau)", () => {
    expect(board.cellCount).toBe(26);
    expect(computePath(23, 4, board)).toEqual({ from: 23, to: 1, path: [24, 25, 0, 1], passedStart: true });
    expect(computePath(25, 1, board)).toEqual({ from: 25, to: 0, path: [0], passedStart: true });
  });

  it("recule sans passer par le départ", () => {
    expect(computePath(1, -3, board)).toEqual({ from: 1, to: 24, path: [0, 25, 24], passedStart: false });
  });

  it("n'émet aucun chemin pour un déplacement nul", () => {
    expect(computePath(5, 0, board).path).toEqual([]);
  });

  it("rejoint une position cible en avançant", () => {
    expect(computePathTo(24, 2, board)).toEqual({ from: 24, to: 2, path: [25, 0, 1, 2], passedStart: true });
    expect(computePathTo(4, 4, board).path).toEqual([]);
  });
});
