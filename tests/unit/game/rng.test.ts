import { describe, expect, it } from "vitest";
import { createRng, nextInt, nextUint32 } from "@/core/game";

describe("RNG à graine", () => {
  it("est déterministe : même graine, même séquence", () => {
    const a = Array.from({ length: 20 }, (() => { let r = createRng(7); return () => { const [v, n] = nextInt(r, 1, 6); r = n; return v; }; })());
    const b = Array.from({ length: 20 }, (() => { let r = createRng(7); return () => { const [v, n] = nextInt(r, 1, 6); r = n; return v; }; })());
    expect(a).toEqual(b);
  });

  it("reste dans l'intervalle et couvre toutes les valeurs de la roue", () => {
    let r = createRng(123);
    const seen = new Set<number>();
    for (let i = 0; i < 500; i += 1) {
      const [v, n] = nextInt(r, 1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
      r = n;
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("compte ses appels et ne mute jamais l'état d'entrée", () => {
    const r0 = createRng(1);
    const [, r1] = nextUint32(r0);
    expect(r0.calls).toBe(0);
    expect(r1.calls).toBe(1);
    expect(r1.seed).toBe(r0.seed);
  });

  it("refuse un intervalle invalide", () => {
    expect(() => nextInt(createRng(1), 6, 1)).toThrow(RangeError);
  });
});
