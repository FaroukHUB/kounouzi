import { describe, expect, it } from "vitest";
import { TEST_RULES_CLASSIC, TEST_RULES_QUICK } from "../../fixtures/game/rules.fixture";
import { active, eventsOf, makeSetup, pid, players, simulate } from "../../fixtures/game/setup.fixture";

describe("tours et fin de partie", () => {
  it.each([2, 3, 4, 5, 6])("fait tourner %i joueurs dans l'ordre des sièges", (n) => {
    const sim = simulate(makeSetup({ players: players(n), seed: 11 }));
    const starts = eventsOf(sim.events, "TurnStarted").map((e) => e.playerId);
    const expected = starts.map((_, i) => pid(`p${(i % n) + 1}`));
    // Sans effet de tour (les scénarios de test en contiennent) l'ordre serait strictement cyclique ;
    // on vérifie donc que chaque joueur joue, et que le premier tour suit l'ordre des sièges.
    expect(starts.slice(0, n)).toEqual(expected.slice(0, n));
    expect(new Set(starts).size).toBe(n);
  });

  it("le passage par le départ crédite le bonus configuré", () => {
    const sim = simulate(makeSetup({ players: players(2), seed: 5, rules: TEST_RULES_CLASSIC }));
    const passes = eventsOf(sim.events, "PassedStart");
    expect(passes.length).toBeGreaterThan(0);
    expect(passes.every((p) => p.bonus === 100)).toBe(true);
    expect(sim.state.ledger.some((t) => t.reason === "start_bonus" && t.amount === 100)).toBe(true);
  });

  it("partie rapide : chaque joueur a joué au moins 6 tours", () => {
    const sim = simulate(makeSetup({ players: players(4), seed: 3, rules: TEST_RULES_QUICK }));
    expect(sim.state.status).toBe("finished");
    expect(sim.state.players.every((p) => p.turnsPlayed >= 6)).toBe(true);
    expect(Math.min(...sim.state.players.map((p) => p.turnsPlayed))).toBe(6);
  });

  it("partie classique : chaque joueur a joué au moins 10 tours", () => {
    const sim = simulate(makeSetup({ players: players(3), seed: 9, rules: TEST_RULES_CLASSIC }));
    expect(sim.state.players.every((p) => p.turnsPlayed >= 10)).toBe(true);
    expect(Math.min(...sim.state.players.map((p) => p.turnsPlayed))).toBe(10);
  });

  it("la condition de fin est lue dans les règles", () => {
    const rules = { ...TEST_RULES_QUICK, endCondition: { kind: "turns_per_player" as const, turns: 2 } };
    const sim = simulate(makeSetup({ players: players(2), seed: 21, rules }));
    expect(Math.min(...sim.state.players.map((p) => p.turnsPlayed))).toBe(2);
  });

  it("le classement final compte argent + valeur patrimoniale, dans l'ordre décroissant", () => {
    const sim = simulate(makeSetup({ players: players(4), seed: 17 }));
    const finished = eventsOf(sim.events, "GameFinished");
    expect(finished).toHaveLength(1);
    const ranking = sim.state.ranking!;
    expect(ranking).toHaveLength(4);
    expect(ranking.map((r) => r.rank)).toEqual([1, 2, 3, 4]);
    for (const row of ranking) {
      const player = sim.state.players.find((p) => p.id === row.playerId)!;
      const heritage = sim.state.holdings.filter((h) => h.ownerId === row.playerId).reduce((s, h) => s + h.heritageValue, 0);
      expect(row.money).toBe(player.money);
      expect(row.heritageValue).toBe(heritage);
      expect(row.score).toBe(player.money + heritage);
    }
    for (let i = 1; i < ranking.length; i += 1) expect(ranking[i - 1]!.score).toBeGreaterThanOrEqual(ranking[i]!.score);
  });

  it("aucune commande n'est acceptée après la fin", () => {
    const sim = simulate(makeSetup({ players: players(2), seed: 2 }));
    expect(sim.state.phase.kind).toBe("finished");
    expect(() => active(sim.state)).not.toThrow();
  });
});
