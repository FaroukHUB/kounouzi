import { describe, expect, it } from "vitest";
import { TEST_RULES_QUICK } from "../../fixtures/game/rules.fixture";
import { eventsOf, makeSetup, pid, players, simulate } from "../../fixtures/game/setup.fixture";

describe("tours et fin de partie", () => {
  it.each([2, 3, 4, 5, 6])("fait jouer %i joueurs dans l'ordre des sièges au premier tour de table", (n) => {
    const sim = simulate(makeSetup({ players: players(n), scenarios: [] }));
    const starts = eventsOf(sim.events, "TurnStarted").map((e) => e.playerId);
    expect(starts.slice(0, n)).toEqual(Array.from({ length: n }, (_, i) => pid(`p${i + 1}`)));
    expect(new Set(starts).size).toBe(n);
  });

  it("le passage par le départ crédite le bonus configuré", () => {
    const rules = { ...TEST_RULES_QUICK, endCondition: { kind: "turns_per_player" as const, turns: 12 } };
    const sim = simulate(makeSetup({ players: players(2), rules, scenarios: [] }));
    const passes = eventsOf(sim.events, "PassedStart");
    expect(passes.length).toBeGreaterThan(0);
    expect(passes.every((p) => p.bonus === 100)).toBe(true);
    expect(sim.state.ledger.some((t) => t.reason === "start_bonus" && t.amount === 100)).toBe(true);
  });

  it("partie de test à 6 tours : chaque joueur a joué exactement 6 tours", () => {
    const sim = simulate(makeSetup({ players: players(4), rules: TEST_RULES_QUICK }));
    expect(sim.state.status).toBe("finished");
    expect(sim.state.players.map((p) => p.turnsPlayed)).toEqual([6, 6, 6, 6]);
  });

  it("la condition de fin est lue dans les règles", () => {
    const rules = { ...TEST_RULES_QUICK, endCondition: { kind: "turns_per_player" as const, turns: 2 } };
    const sim = simulate(makeSetup({ players: players(2), rules }));
    expect(Math.min(...sim.state.players.map((p) => p.turnsPlayed))).toBe(2);
  });

  it("le classement final (formule provisoire) est cohérent et décroissant", () => {
    const sim = simulate(makeSetup({ players: players(4) }));
    expect(eventsOf(sim.events, "GameFinished")).toHaveLength(1);
    const ranking = sim.state.ranking!;
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
});
