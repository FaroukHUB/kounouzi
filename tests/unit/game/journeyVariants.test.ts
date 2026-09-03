import { describe, expect, it } from "vitest";
import { JOURNEY_VARIANTS, journeyCycleForOrdinal } from "@/config/journey";
import { assignJourneySteps, flattenCycle, journeyCycleIssues, MAX_PLAYERS } from "@/core/game";
import { eventsOf, makeSetup, players, simulate } from "../../fixtures/game/setup.fixture";

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
const seq = (cycle: (typeof JOURNEY_VARIANTS)[number], seat: number, n: number) => Array.from({ length: n }, (_, k) => assignJourneySteps(cycle, seat, k));

describe("variantes du Chemin (ADR 0018)", () => {
  it("il existe plusieurs variantes, toutes valides et distinctes (aucune n'est une rotation d'une autre)", () => {
    expect(JOURNEY_VARIANTS.length).toBeGreaterThanOrEqual(4);
    for (const v of JOURNEY_VARIANTS) {
      expect(journeyCycleIssues(v)).toEqual([]);
      expect(v.stepMax).toBe(5);
      expect(v.blocks.length).toBeGreaterThanOrEqual(MAX_PLAYERS);
    }
    const flats = JOURNEY_VARIANTS.map((v) => flattenCycle(v).join(","));
    expect(new Set(flats).size).toBe(flats.length);
    for (const a of JOURNEY_VARIANTS) {
      for (const b of JOURNEY_VARIANTS) {
        if (a === b) continue;
        const fa = flattenCycle(a);
        const fb = flattenCycle(b);
        for (let i = 0; i < fb.length; i += 1) expect(fa.join(",")).not.toBe([...fb.slice(i), ...fb.slice(0, i)].join(","));
      }
    }
  });

  it.each(JOURNEY_VARIANTS.map((v) => [v.id, v] as const))("%s : équilibre, absence d'avantage de siège, pas de répétition consécutive", (_id, cycle) => {
    for (let seat = 0; seat < MAX_PLAYERS; seat += 1) {
      const s = seq(cycle, seat, 30);
      for (const v of [1, 2, 3, 4, 5]) expect(s.filter((x) => x === v)).toHaveLength(6);
      expect(sum(s) / 30).toBe(3);
      for (let k = 1; k < 90; k += 1) expect(assignJourneySteps(cycle, seat, k)).not.toBe(assignJourneySteps(cycle, seat, k - 1));
    }
    for (let k = 1; k <= 60; k += 1) {
      const totals = Array.from({ length: MAX_PLAYERS }, (_, seat) => sum(seq(cycle, seat, k)));
      const spread = Math.max(...totals) - Math.min(...totals);
      expect(spread).toBeLessThanOrEqual(cycle.stepMax - 1);
      if (k % 5 === 0) expect(spread).toBe(0);
    }
  });

  it("test transversal : N variantes × 2 à 6 joueurs — distance moyenne comparable, aucun siège favorisé, distribution identique", () => {
    for (const cycle of JOURNEY_VARIANTS) {
      for (let n = 2; n <= 6; n += 1) {
        const means = Array.from({ length: n }, (_, seat) => sum(seq(cycle, seat, 10)) / 10);
        // Sur 10 voyages (deux blocs), chaque siège parcourt exactement 30 cases : moyenne 3 pour tous.
        expect(means.every((m) => m === 3)).toBe(true);
        for (let k = 1; k <= 7; k += 1) {
          const totals = Array.from({ length: n }, (_, seat) => sum(seq(cycle, seat, k)));
          expect(Math.max(...totals) - Math.min(...totals)).toBeLessThanOrEqual(4);
        }
      }
    }
    // Les premières valeurs des blocs sont diversifiées : les joueurs ne démarrent pas tous du même pas.
    for (const cycle of JOURNEY_VARIANTS) expect(new Set(cycle.blocks.map((b) => b[0])).size).toBeGreaterThanOrEqual(4);
  });

  it("variable entre les parties, parfaitement déterministe à l'intérieur d'une partie", () => {
    const a1 = simulate(makeSetup({ players: players(3), journey: journeyCycleForOrdinal(1) }));
    const a2 = simulate(makeSetup({ players: players(3), journey: journeyCycleForOrdinal(1) }));
    const b = simulate(makeSetup({ players: players(3), journey: journeyCycleForOrdinal(2) }));
    expect(a1.events).toEqual(a2.events);
    expect(eventsOf(a1.events, "MovementAssigned").map((e) => e.steps)).not.toEqual(eventsOf(b.events, "MovementAssigned").map((e) => e.steps));
  });

  it("rotation : partie n°1 → A, n°2 → B, …, puis retour à A ; numéro invalide refusé", () => {
    const n = JOURNEY_VARIANTS.length;
    expect(journeyCycleForOrdinal(1).id).toBe("journey-cycle-A.v1");
    expect(journeyCycleForOrdinal(2).id).toBe("journey-cycle-B.v1");
    expect(journeyCycleForOrdinal(n + 1).id).toBe("journey-cycle-A.v1");
    expect(() => journeyCycleForOrdinal(0)).toThrow(RangeError);
  });
});
