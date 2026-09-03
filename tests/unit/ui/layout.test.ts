import { describe, expect, it } from "vitest";
import { cellCenterPercent, clusterOffset, gridSize, perimeterPosition } from "@/ui/board/layout";

describe("géométrie du plateau en anneau", () => {
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

  it("refuse un plateau dont le nombre de cases n'est pas un multiple de 4", () => {
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
