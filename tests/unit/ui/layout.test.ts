import { describe, expect, it } from "vitest";
import { cellCenterPercent, clusterOffset, gridDims, gridSize, perimeterPosition } from "@/ui/board/layout";

describe("géométrie du plateau en anneau", () => {
  it("28 cases → grille 8 × 8 : 4 coins + 6 cases par côté, toutes de mêmes dimensions", () => {
    expect(gridDims(28)).toEqual({ cols: 8, rows: 8 });
    expect(gridSize(28)).toBe(8);

    const seen = new Set<string>();
    for (let p = 0; p < 28; p += 1) {
      const { row, col } = perimeterPosition(p, 28);
      expect(row === 0 || row === 7 || col === 0 || col === 7).toBe(true);
      seen.add(`${row},${col}`);
    }

    expect(seen.size).toBe(28);
    expect(perimeterPosition(0, 28)).toEqual({ row: 7, col: 7, side: "bottom" });
    expect(perimeterPosition(7, 28)).toEqual({ row: 7, col: 0, side: "bottom" });
    expect(perimeterPosition(14, 28)).toEqual({ row: 0, col: 0, side: "start" });
    expect(perimeterPosition(21, 28)).toEqual({ row: 0, col: 7, side: "top" });
    expect(perimeterPosition(27, 28)).toEqual({ row: 6, col: 7, side: "end" });
    expect(cellCenterPercent(0, 28)).toEqual({ x: (7.5 / 8) * 100, y: (7.5 / 8) * 100 });
  });

  it("conserve la compatibilité avec l'ancien plateau 26 et les autres tailles paires", () => {
    expect(gridDims(26)).toEqual({ cols: 8, rows: 7 });
    expect(gridDims(8)).toEqual({ cols: 3, rows: 3 });
    expect(() => gridDims(27)).toThrow(RangeError);
  });

  it("32 cases → grille 9×9, périmètre couvert une seule fois", () => {
    expect(gridSize(32)).toBe(9);
    const seen = new Set<string>();
    for (let p = 0; p < 32; p += 1) {
      const { row, col } = perimeterPosition(p, 32);
      expect(row === 0 || row === 8 || col === 0 || col === 8).toBe(true);
      seen.add(`${row},${col}`);
    }
    expect(seen.size).toBe(32);
  });

  it("place le départ au coin inférieur droit et suit le sens du parcours", () => {
    expect(perimeterPosition(0, 32)).toEqual({ row: 8, col: 8, side: "bottom" });
    expect(perimeterPosition(8, 32)).toEqual({ row: 8, col: 0, side: "bottom" });
    expect(perimeterPosition(16, 32)).toEqual({ row: 0, col: 0, side: "start" });
    expect(perimeterPosition(24, 32)).toEqual({ row: 0, col: 8, side: "top" });
    expect(perimeterPosition(31, 32)).toEqual({ row: 7, col: 8, side: "end" });
  });

  it("refuse une grille carrée quand le périmètre ne forme pas un carré", () => {
    expect(() => gridSize(30)).toThrow(RangeError);
    expect(() => perimeterPosition(40, 32)).toThrow(RangeError);
  });

  it("calcule le centre d'une case en pourcentage et étale une grappe de pions", () => {
    const c = cellCenterPercent(0, 32);
    expect(c.x).toBeCloseTo((8.5 / 9) * 100);
    expect(clusterOffset(0, 1)).toEqual({ dx: 0, dy: 0 });
    const a = clusterOffset(0, 3);
    const b = clusterOffset(1, 3);
    expect(Math.hypot(a.dx - b.dx, a.dy - b.dy)).toBeGreaterThan(0.2);
  });
});
