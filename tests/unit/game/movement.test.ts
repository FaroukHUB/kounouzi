import { describe, expect, it } from "vitest";
import { computePath, computePathTo, resolveBoard } from "@/core/game";
import { BOARD_32_V1 } from "@/config/board";
import { TEST_MONUMENTS } from "../../fixtures/game/heritage.fixture";

const resolved = resolveBoard(BOARD_32_V1, TEST_MONUMENTS);
if (!resolved.ok) throw new Error("fixture");
const board = resolved.value.board;

describe("déplacement", () => {
  it("avance case par case", () => {
    expect(computePath(7, 4, board)).toEqual({ from: 7, to: 11, path: [8, 9, 10, 11], passedStart: false });
  });

  it("boucle de la position 31 à 0 et signale le passage par le départ", () => {
    expect(computePath(29, 4, board)).toEqual({ from: 29, to: 1, path: [30, 31, 0, 1], passedStart: true });
    expect(computePath(31, 1, board)).toEqual({ from: 31, to: 0, path: [0], passedStart: true });
  });

  it("recule sans passer par le départ", () => {
    expect(computePath(1, -3, board)).toEqual({ from: 1, to: 30, path: [0, 31, 30], passedStart: false });
  });

  it("n'émet aucun chemin pour un déplacement nul", () => {
    expect(computePath(5, 0, board).path).toEqual([]);
  });

  it("rejoint une position cible en avançant", () => {
    expect(computePathTo(30, 2, board)).toEqual({ from: 30, to: 2, path: [31, 0, 1, 2], passedStart: true });
    expect(computePathTo(4, 4, board).path).toEqual([]);
  });
});
