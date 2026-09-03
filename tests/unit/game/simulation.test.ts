import { describe, expect, it } from "vitest";
import { serializeGameState } from "@/core/game";
import { TEST_RULES_CLASSIC } from "../../fixtures/game/rules.fixture";
import { eventsOf, makeSetup, players, simulate } from "../../fixtures/game/setup.fixture";

describe("simulation complète d'une partie (sans React, sans navigateur, sans réseau)", () => {
  it.each([2, 3, 4, 5, 6])("joue une partie rapide à %i joueurs jusqu'au classement final", (n) => {
    const sim = simulate(makeSetup({ players: players(n), seed: 100 + n }));

    expect(sim.state.status).toBe("finished");
    expect(sim.state.ranking).toHaveLength(n);
    expect(eventsOf(sim.events, "GameFinished")).toHaveLength(1);
    expect(sim.state.players.every((p) => p.turnsPlayed >= 6)).toBe(true);

    // Toutes les mécaniques ont été exercées au moins une fois.
    expect(eventsOf(sim.events, "WheelSpun").length).toBeGreaterThanOrEqual(6 * n);
    expect(eventsOf(sim.events, "PawnMoved").length).toBeGreaterThan(0);
    expect(eventsOf(sim.events, "QuestionRequested").length).toBeGreaterThan(0);
    expect(eventsOf(sim.events, "AnswerRecorded").length).toBe(eventsOf(sim.events, "QuestionRequested").length);
    expect(eventsOf(sim.events, "MoneyChanged").length).toBeGreaterThan(n);
    expect(eventsOf(sim.events, "TurnEnded").length).toBe(eventsOf(sim.events, "TurnStarted").length);

    // Un tour n'est jamais ouvert pour un joueur hors table, et chaque joueur a joué.
    const ids = new Set(sim.state.players.map((p) => p.id));
    for (const e of eventsOf(sim.events, "TurnStarted")) expect(ids.has(e.playerId)).toBe(true);
    expect(new Set(eventsOf(sim.events, "TurnStarted").map((e) => e.playerId)).size).toBe(n);
  });

  it("exerce l'achat de monuments et le patrimoine sur une partie classique", () => {
    const sim = simulate(makeSetup({ players: players(4), seed: 7, rules: TEST_RULES_CLASSIC }));
    expect(eventsOf(sim.events, "PurchaseOffered").length).toBeGreaterThan(0);
    expect(eventsOf(sim.events, "SiteAcquired").length).toBeGreaterThan(0);
    expect(sim.state.holdings.length).toBe(eventsOf(sim.events, "SiteAcquired").length);
    const ownedTwice = new Set(sim.state.holdings.map((h) => h.siteId)).size !== sim.state.holdings.length;
    expect(ownedTwice).toBe(false);
    expect(sim.state.holdings.length).toBeLessThanOrEqual(8);
  });

  it("est déterministe : même graine et mêmes commandes ⇒ même déroulement et même état", () => {
    const a = simulate(makeSetup({ players: players(4), seed: 2024 }));
    const b = simulate(makeSetup({ players: players(4), seed: 2024 }));
    expect(a.commands).toEqual(b.commands);
    expect(a.events).toEqual(b.events);
    expect(serializeGameState(a.state)).toBe(serializeGameState(b.state));
  });

  it("une autre graine produit un autre déroulement", () => {
    const a = simulate(makeSetup({ players: players(3), seed: 1 }));
    const b = simulate(makeSetup({ players: players(3), seed: 2 }));
    expect(eventsOf(a.events, "WheelSpun").map((e) => e.value)).not.toEqual(eventsOf(b.events, "WheelSpun").map((e) => e.value));
  });

  it("le grand livre explique chaque solde final", () => {
    const sim = simulate(makeSetup({ players: players(5), seed: 55 }));
    for (const p of sim.state.players) {
      const fromLedger = sim.state.ledger.filter((t) => t.playerId === p.id).reduce((s, t) => s + t.amount, 0);
      expect(fromLedger).toBe(p.money);
    }
  });
});
