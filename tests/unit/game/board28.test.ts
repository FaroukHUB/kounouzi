import { describe, expect, it } from "vitest";
import { DEFAULT_BOARD } from "@/config/board";

describe("plateau produit 28 cases", () => {
  it("a exactement la composition validée", () => {
    expect(DEFAULT_BOARD.id).toBe("board-28.v1");
    expect(DEFAULT_BOARD.cellCount).toBe(28);
    expect(DEFAULT_BOARD.cells).toHaveLength(28);

    const counts = DEFAULT_BOARD.cells.reduce<Record<string, number>>((acc, cell) => {
      acc[cell.type] = (acc[cell.type] ?? 0) + 1;
      return acc;
    }, {});

    expect(counts).toEqual({
      start: 1,
      heritage: 12,
      question: 6,
      challenge: 5,
      halt: 2,
      treasure: 1,
      donation: 1,
    });
  });

  it("réserve les quatre coins 8×8 à Départ, Halte, Trésor, Halte", () => {
    expect(DEFAULT_BOARD.cells[0]).toMatchObject({ position: 0, type: "start" });
    expect(DEFAULT_BOARD.cells[7]).toMatchObject({ position: 7, type: "halt" });
    expect(DEFAULT_BOARD.cells[14]).toMatchObject({ position: 14, type: "treasure" });
    expect(DEFAULT_BOARD.cells[21]).toMatchObject({ position: 21, type: "halt" });
  });

  it("répartit trois établissements sur chacun des quatre côtés", () => {
    const sides = [
      DEFAULT_BOARD.cells.slice(1, 7),
      DEFAULT_BOARD.cells.slice(8, 14),
      DEFAULT_BOARD.cells.slice(15, 21),
      DEFAULT_BOARD.cells.slice(22, 28),
    ];
    expect(sides.map((side) => side.filter((cell) => cell.type === "heritage").length)).toEqual([3, 3, 3, 3]);
  });
});
