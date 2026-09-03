import { describe, expect, it } from "vitest";
import { serializeGameState } from "@/core/game";
import { TEST_RULES_CLASSIC } from "../../fixtures/game/rules.fixture";
import { eventsOf, makeSetup, players, simulate } from "../../fixtures/game/setup.fixture";

describe("simulation complète d'une partie (sans React, sans navigateur, sans réseau, sans hasard)", () => {
  it.each([2, 3, 4, 5, 6])("joue une partie de test à %i joueurs jusqu'au classement final", (n) => {
    const sim = simulate(makeSetup({ players: players(n) }));
    expect(sim.state.status).toBe("finished");
    expect(sim.state.ranking).toHaveLength(n);
    expect(eventsOf(sim.events, "GameFinished")).toHaveLength(1);
    expect(sim.state.players.every((p) => p.turnsPlayed >= 6)).toBe(true);

    const turns = eventsOf(sim.events, "TurnStarted").length;
    expect(turns).toBeGreaterThanOrEqual(6 * n);
    expect(eventsOf(sim.events, "MovementAssigned").length).toBe(turns - eventsOf(sim.events, "TurnSkipped").length);
    expect(eventsOf(sim.events, "MovementAssigned").every((e) => e.steps >= 1 && e.steps <= 5)).toBe(true);
    expect(eventsOf(sim.events, "QuestionRequested").length).toBeGreaterThan(0);
    expect(eventsOf(sim.events, "AnswerRecorded").length).toBe(eventsOf(sim.events, "QuestionRequested").length);
    expect(eventsOf(sim.events, "TurnEnded").length).toBe(turns);
    expect(new Set(eventsOf(sim.events, "TurnStarted").map((e) => e.playerId)).size).toBe(n);
  });

  it("exerce l'achat de monuments et le patrimoine sur une partie plus longue", () => {
    const sim = simulate(makeSetup({ players: players(4), rules: TEST_RULES_CLASSIC }));
    expect(eventsOf(sim.events, "PurchaseOffered").length).toBeGreaterThan(0);
    expect(eventsOf(sim.events, "SiteAcquired").length).toBeGreaterThan(0);
    expect(sim.state.holdings.length).toBe(eventsOf(sim.events, "SiteAcquired").length);
    expect(new Set(sim.state.holdings.map((h) => h.siteId)).size).toBe(sim.state.holdings.length);
  });

  it("est entièrement déterministe : même configuration et mêmes commandes ⇒ mêmes événements et même état", () => {
    const a = simulate(makeSetup({ players: players(4) }));
    const b = simulate(makeSetup({ players: players(4) }));
    expect(a.commands).toEqual(b.commands);
    expect(a.events).toEqual(b.events);
    expect(serializeGameState(a.state)).toBe(serializeGameState(b.state));
  });

  it("le grand livre explique chaque solde final", () => {
    const sim = simulate(makeSetup({ players: players(5) }));
    for (const p of sim.state.players) {
      expect(sim.state.ledger.filter((t) => t.playerId === p.id).reduce((s, t) => s + t.amount, 0)).toBe(p.money);
    }
  });
});
