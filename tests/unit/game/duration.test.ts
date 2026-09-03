import { describe, expect, it } from "vitest";
import { deserializeGameState, reduce, serializeGameState } from "@/core/game";
import { TEST_RULES_FREE, TEST_RULES_QUICK, TEST_RULES_TIMED } from "../../fixtures/game/rules.fixture";
import { active, advanceUntil, create, eventsOf, makeSetup, pid, players, run, simulate } from "../../fixtures/game/setup.fixture";

describe("durée de jeu active (horloge injectée)", () => {
  it("accumule uniquement les secondes transmises : une pause de 3 h ne compte pas", () => {
    const { state } = create(makeSetup({ rules: TEST_RULES_TIMED }));
    let s = run(state, { type: "AdvanceClock", seconds: 900 }).state; // 15 min jouées
    // … application fermée 3 heures : aucune commande AdvanceClock n'est envoyée …
    const restored = deserializeGameState(serializeGameState(s));
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    s = restored.value;
    expect(s.clock.activePlaySeconds).toBe(900);
    s = run(s, { type: "AdvanceClock", seconds: 5 }).state;
    expect(s.clock.activePlaySeconds).toBe(905);
  });

  it("refuse un delta négatif ou non fini sans modifier l'état", () => {
    const { state } = create(makeSetup({ rules: TEST_RULES_TIMED }));
    expect(reduce(state, { type: "AdvanceClock", seconds: -1 }).ok).toBe(false);
    expect(reduce(state, { type: "AdvanceClock", seconds: Number.NaN }).ok).toBe(false);
  });

  it("signale une seule fois l'atteinte de la durée cible", () => {
    const { state } = create(makeSetup({ rules: TEST_RULES_TIMED }));
    const first = run(state, { type: "AdvanceClock", seconds: 60 });
    expect(eventsOf(first.events, "TimeTargetReached")).toEqual([{ type: "TimeTargetReached", activePlaySeconds: 60 }]);
    const second = run(first.state, { type: "AdvanceClock", seconds: 10 });
    expect(eventsOf(second.events, "TimeTargetReached")).toHaveLength(0);
    expect(second.state.clock.timeTargetReached).toBe(true);
  });

  it("fin équitable : le temps expire pendant B sur A B C D → la partie se termine après D, avant que A rejoue", () => {
    const { state } = create(makeSetup({ players: players(4), rules: TEST_RULES_TIMED, scenarios: [] }));
    // Aller au tour de B (siège 1) en attente de Chemin.
    const atB = advanceUntil(state, (s) => active(s) === pid("p2") && s.phase.kind === "awaiting_journey");
    expect(atB.state.status).toBe("in_progress");
    const expired = run(atB.state, { type: "AdvanceClock", seconds: 60 });
    expect(expired.state.status).toBe("in_progress"); // rien ne s'arrête au milieu du tour de table

    const finished = advanceUntil(expired.state, (s) => s.status === "finished");
    expect(finished.state.status).toBe("finished");
    const turns = finished.state.players.map((p) => p.turnsPlayed);
    expect(new Set(turns).size).toBe(1); // tous ont joué le même nombre de tours
    // B avait déjà commencé son tour ; ensuite seuls C et D jouent — jamais A.
    const starts = eventsOf(finished.events, "TurnStarted").map((e) => e.playerId);
    expect(starts).toEqual([pid("p3"), pid("p4")]);
    expect(eventsOf(finished.events, "TurnEnded").map((e) => e.playerId)).toEqual([pid("p2"), pid("p3"), pid("p4")]);
  });

  it("une partie libre ne se termine jamais d'elle-même", () => {
    const { state } = create(makeSetup({ players: players(2), rules: TEST_RULES_FREE }));
    const later = advanceUntil(state, (s) => s.players.every((p) => p.turnsPlayed >= 30), undefined, 2000);
    expect(later.state.status).toBe("in_progress");
    const clocked = run(later.state, { type: "AdvanceClock", seconds: 100_000 });
    expect(clocked.state.status).toBe("in_progress");
  });

  it("une demande de fin (espace parent) termine proprement à la fin du tour de table", () => {
    const { state } = create(makeSetup({ players: players(3), rules: TEST_RULES_FREE, scenarios: [] }));
    const atC = advanceUntil(state, (s) => active(s) === pid("p3") && s.phase.kind === "awaiting_journey" && s.turnNumber > 3);
    const requested = run(atC.state, { type: "RequestGameEnd" });
    expect(eventsOf(requested.events, "GameEndRequested")).toHaveLength(1);
    expect(requested.state.status).toBe("in_progress");
    expect(run(requested.state, { type: "RequestGameEnd" }).events).toHaveLength(0); // idempotent

    const finished = advanceUntil(requested.state, (s) => s.status === "finished");
    expect(finished.state.status).toBe("finished");
    expect(new Set(finished.state.players.map((p) => p.turnsPlayed)).size).toBe(1);
    // C avait déjà commencé son tour : personne d'autre ne rejoue.
    expect(eventsOf(finished.events, "TurnStarted")).toHaveLength(0);
    expect(eventsOf(finished.events, "TurnEnded").map((e) => e.playerId)).toEqual([pid("p3")]);
  });

  it("une partie chronométrée simulée se termine avec un nombre de tours égal pour tous", () => {
    const sim = simulate(makeSetup({ players: players(5), rules: TEST_RULES_TIMED }), { answer: () => ({ outcome: "correct", explanationMastery: "none", validationMode: "collective" }), buy: () => false, choose: (o) => o[0]!.id, secondsPerTurn: 7 });
    expect(sim.state.status).toBe("finished");
    expect(new Set(sim.state.players.map((p) => p.turnsPlayed)).size).toBe(1);
    expect(sim.state.clock.activePlaySeconds).toBeGreaterThanOrEqual(60);
  });

  it("le mode tours par joueur reste disponible pour les tests", () => {
    const sim = simulate(makeSetup({ players: players(2), rules: TEST_RULES_QUICK }));
    expect(Math.min(...sim.state.players.map((p) => p.turnsPlayed))).toBe(6);
  });
});
