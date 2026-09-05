import { describe, expect, it } from "vitest";
import { deserializeGameState, reduce, serializeGameState } from "@/core/game";
import { active, answer, create, journey, makeLineSetup, makeSetup, players, simulate } from "../../fixtures/game/setup.fixture";

describe("sérialisation et reprise", () => {
  it("fait l'aller-retour à l'identique sur une partie en cours", () => {
    const asked = journey(create(makeLineSetup()).state);
    expect(asked.state.phase.kind).toBe("awaiting_answer");
    const restored = deserializeGameState(serializeGameState(asked.state));
    expect(restored.ok).toBe(true);
    if (restored.ok) expect(restored.value).toEqual(asked.state);
  });

  it("reprend exactement où la partie s'était arrêtée et produit la même suite", () => {
    const asked = journey(create(makeLineSetup()).state);
    const restored = deserializeGameState(serializeGameState(asked.state));
    if (!restored.ok) throw new Error("restore");
    const command = { type: "SubmitAnswer" as const, playerId: active(asked.state), requestId: "q1", answer: answer("correct", "fr") };
    expect(reduce(restored.value, command)).toEqual(reduce(asked.state, command));
  });

  it("conserve le temps de jeu actif, les visites de cases et le classement final", () => {
    const sim = simulate(makeSetup({ players: players(2) }), { answer: () => answer("correct"), buy: (affordable) => affordable, choose: (o) => o[0]!.id, secondsPerTurn: 3 });
    const restored = deserializeGameState(serializeGameState(sim.state));
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.value.ranking).toEqual(sim.state.ranking);
    expect(restored.value.clock).toEqual(sim.state.clock);
    expect(restored.value.cellVisits).toEqual(sim.state.cellVisits);
  });

  it("refuse un JSON invalide, une version inconnue et un état corrompu", () => {
    expect(deserializeGameState("{").ok).toBe(false);
    const { state } = create();
    const future = deserializeGameState(JSON.stringify({ ...state, schemaVersion: 99 }));
    expect(future.ok).toBe(false);
    if (!future.ok) expect(future.error.code).toBe("UNSUPPORTED_VERSION");
    const corrupted = deserializeGameState(JSON.stringify({ ...state, players: "non" }));
    expect(corrupted.ok).toBe(false);
    if (!corrupted.ok) expect(corrupted.error.code).toBe("INVALID_STATE");
  });
});
