import { describe, expect, it } from "vitest";
import { addition, division, generateMaths, multiplication, pickInRange, strideFor, subtraction } from "@/core/content";

describe("parcours déterministe d'intervalle", () => {
  it("visite toutes les valeurs avant de se répéter, sans hasard", () => {
    const seen = Array.from({ length: 9 }, (_, i) => pickInRange(2, 10, i));
    expect([...seen].sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(pickInRange(2, 10, 9)).toBe(pickInRange(2, 10, 0));
    expect(strideFor(9)).toBe(8);
    expect(strideFor(2)).toBe(1);
  });
});

describe("générateurs mathématiques (explications FR + AR)", () => {
  it.each([1, 2, 3, 4, 5])("difficulté %i : opérations justes, réponses cohérentes, explications bilingues", (d) => {
    for (let v = 0; v < 40; v += 1) {
      const a = addition(d, v);
      expect(Number(a.answer.fr)).toBe(Number(a.prompt.fr.split(" + ")[0]) + Number(a.prompt.fr.split(" + ")[1]!.split(" =")[0]));
      const s = subtraction(d, v);
      expect(Number(s.answer.fr)).toBeGreaterThanOrEqual(0);
      const m = multiplication(d, v);
      const [x, y] = m.prompt.fr.split(" = ")[0]!.split(" × ").map(Number);
      expect(Number(m.answer.fr)).toBe(x! * y!);
      const q = division(d, v);
      const [num, den] = q.prompt.fr.split(" = ")[0]!.split(" ÷ ").map(Number);
      expect(num! % den!).toBe(0);
      expect(Number(q.answer.fr)).toBe(num! / den!);
      for (const g of [a, s, m, q]) {
        expect(g.explanation.fr.length).toBeGreaterThan(5);
        expect(g.explanation.ar.length).toBeGreaterThan(5);
        expect(/[؀-ۿ]/.test(g.explanation.ar)).toBe(true);
      }
    }
  });

  it("est déterministe et couvre plusieurs opérations selon la difficulté", () => {
    const req = { categoryId: "maths", difficulty: 3, profileType: "child" as const, variation: 7 };
    expect(generateMaths(req)).toEqual(generateMaths(req));
    const ids = new Set(Array.from({ length: 12 }, (_, v) => { const r = generateMaths({ ...req, variation: v }).ref; return r.origin === "algorithmic" ? r.generatorId : ""; }));
    expect(ids.size).toBeGreaterThanOrEqual(3);
    expect(generateMaths({ ...req, difficulty: 1, variation: 0 }).difficulty).toBe(1);
    expect(generateMaths({ ...req, difficulty: 9, variation: 0 }).difficulty).toBe(5);
  });

  it("les nombres grandissent avec la difficulté", () => {
    const easy = Array.from({ length: 10 }, (_, v) => Number(multiplication(1, v).answer.fr));
    const hard = Array.from({ length: 10 }, (_, v) => Number(multiplication(5, v).answer.fr));
    expect(Math.max(...easy)).toBeLessThanOrEqual(25);
    expect(Math.min(...hard)).toBeGreaterThan(25);
  });
});
