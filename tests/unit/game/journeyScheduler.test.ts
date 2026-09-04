import { describe, expect, it } from "vitest";
import { JOURNEY_CYCLE_V1 } from "@/config/journey";
import { assignJourneySteps, flattenCycle, journeyCycleIssues, journeyCycleSchema, MAX_PLAYERS } from "@/core/game";
import { TEST_MONUMENTS } from "../../fixtures/game/heritage.fixture";
import { TEST_RULES_CLASSIC } from "../../fixtures/game/rules.fixture";
import { eventsOf, makeSetup, pid, players, simulate } from "../../fixtures/game/setup.fixture";

const seatSequence = (seat: number, count: number) => Array.from({ length: count }, (_, k) => assignJourneySteps(JOURNEY_CYCLE_V1, seat, k));
const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

describe("le Chemin — cycle V1", () => {
  it("est un cycle valide : blocs = permutations de 1..5, jamais deux valeurs identiques consécutives (bouclage inclus)", () => {
    expect(journeyCycleIssues(JOURNEY_CYCLE_V1)).toEqual([]);
    expect(JOURNEY_CYCLE_V1.stepMax).toBe(5);
    expect(JOURNEY_CYCLE_V1.blocks.length).toBeGreaterThanOrEqual(MAX_PLAYERS);
    expect(flattenCycle(JOURNEY_CYCLE_V1)).toHaveLength(30);
  });

  it("n'est pas la suite naïve 1,2,3,4,5", () => {
    const flat = flattenCycle(JOURNEY_CYCLE_V1);
    expect(flat.slice(0, 5)).not.toEqual([1, 2, 3, 4, 5]);
    for (let i = 0; i + 5 <= flat.length; i += 1) expect(flat.slice(i, i + 5)).not.toEqual([1, 2, 3, 4, 5]);
  });

  it("le schéma refuse un bloc qui n'est pas une permutation, ou deux valeurs identiques consécutives (bouclage compris)", () => {
    expect(journeyCycleSchema.safeParse({ id: "x", version: 1, stepMax: 3, blocks: [[1, 1, 2]] }).success).toBe(false);
    expect(journeyCycleSchema.safeParse({ id: "x", version: 1, stepMax: 3, blocks: [[1, 2, 3], [3, 1, 2]] }).success).toBe(false); // 3 → 3 entre blocs
    expect(journeyCycleIssues({ id: "x", version: 1, stepMax: 3, blocks: [[1, 2, 3], [2, 3, 1]] })).toContain("valeurs identiques consécutives à la position 5"); // 1 → 1 au bouclage
    expect(journeyCycleIssues({ id: "ok", version: 1, stepMax: 3, blocks: [[1, 2, 3], [2, 1, 3]] })).toEqual([]);
  });
});

describe("le Chemin — attribution déterministe", () => {
  it("le joueur du siège s commence au bloc s et lit le cycle dans l'ordre", () => {
    expect(seatSequence(0, 5)).toEqual([3, 1, 4, 2, 5]);
    expect(seatSequence(1, 5)).toEqual([2, 4, 1, 5, 3]);
    expect(seatSequence(5, 5)).toEqual([4, 1, 5, 3, 2]);
    expect(seatSequence(0, 31)[30]).toBe(3); // retour au début du cycle
  });

  it("deux Chemins consécutifs d'un même joueur ne sont jamais identiques", () => {
    for (let seat = 0; seat < MAX_PLAYERS; seat += 1) {
      const seq = seatSequence(seat, 90);
      for (let k = 1; k < seq.length; k += 1) expect(seq[k]).not.toBe(seq[k - 1]);
    }
  });

  it("est équilibré : sur un cycle complet, chaque siège reçoit chaque valeur exactement 6 fois", () => {
    for (let seat = 0; seat < MAX_PLAYERS; seat += 1) {
      const seq = seatSequence(seat, 30);
      for (const v of [1, 2, 3, 4, 5]) expect(seq.filter((x) => x === v)).toHaveLength(6);
    }
  });

  it("ne favorise aucun siège : distance identique après tout multiple de 5 voyages, écart ≤ 4 entre-temps", () => {
    for (let k = 1; k <= 60; k += 1) {
      const totals = Array.from({ length: MAX_PLAYERS }, (_, seat) => sum(seatSequence(seat, k)));
      const spread = Math.max(...totals) - Math.min(...totals);
      if (k % 5 === 0) expect(spread).toBe(0);
      expect(spread).toBeLessThanOrEqual(JOURNEY_CYCLE_V1.stepMax - 1);
    }
  });

  it("refuse un siège ou un index invalide", () => {
    expect(() => assignJourneySteps(JOURNEY_CYCLE_V1, -1, 0)).toThrow(RangeError);
    expect(() => assignJourneySteps(JOURNEY_CYCLE_V1, 0, 1.5)).toThrow(RangeError);
  });
});

describe("le Chemin — indépendance stratégique (preuve par exécution)", () => {
  const journeysOf = (sim: ReturnType<typeof simulate>) => eventsOf(sim.events, "MovementAssigned").map((e) => [e.playerId, e.steps] as const);
  /**
   * Chaque joueur reçoit la MÊME suite de valeurs quelle que soit l'économie.
   * Une Halte perdue (réponse incorrecte au Défi de reprise) peut retirer un
   * voyage à un joueur : la liste est alors plus courte, jamais différente.
   */
  const expectSameJourneys = (a: ReturnType<typeof simulate>, b: ReturnType<typeof simulate>) => {
    for (const p of a.state.players) {
      const ja = journeysOf(a).filter(([id]) => id === p.id).map(([, s]) => s);
      const jb = journeysOf(b).filter(([id]) => id === p.id).map(([, s]) => s);
      const n = Math.min(ja.length, jb.length);
      expect(n).toBeGreaterThan(5);
      expect(ja.slice(0, n)).toEqual(jb.slice(0, n));
    }
  };

  it("changer l'argent de départ ne change aucun Chemin", () => {
    const rich = simulate(makeSetup({ players: players(4), rules: { ...TEST_RULES_CLASSIC, startingMoney: 10_000 } }));
    const poor = simulate(makeSetup({ players: players(4), rules: { ...TEST_RULES_CLASSIC, startingMoney: 10 } }));
    expectSameJourneys(rich, poor);
  });

  it("changer les prix, les valeurs patrimoniales ou les propriétaires ne change aucun Chemin", () => {
    const cheap = simulate(makeSetup({ players: players(4), rules: TEST_RULES_CLASSIC }));
    const pricey = simulate(makeSetup({ players: players(4), rules: TEST_RULES_CLASSIC, heritageSites: TEST_MONUMENTS.map((m) => ({ ...m, price: 5000, heritageValue: 9999 })) }));
    expect(eventsOf(cheap.events, "SiteAcquired").length).not.toBe(eventsOf(pricey.events, "SiteAcquired").length);
    expectSameJourneys(cheap, pricey);
  });

  it("activer FamilyAssist ne change aucun Chemin", () => {
    const off = simulate(makeSetup({ players: players(3) }));
    const on = simulate(makeSetup({ players: players(3), familyAssist: { enabled: true, assistedPlayers: [{ playerId: pid("p1"), level: "subtle" }] } }));
    expect(journeysOf(on)).toEqual(journeysOf(off));
  });

  it("le scheduler ne reçoit jamais l'état de la partie", () => {
    // Signature : (cycle, siège, index) — aucun GameState, donc aucun accès possible à l'argent, au patrimoine ou aux cases.
    expect(assignJourneySteps.length).toBe(3);
  });
});
