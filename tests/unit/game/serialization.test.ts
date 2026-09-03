import { describe, expect, it } from "vitest";
import { deserializeGameState, reduce, serializeGameState } from "@/core/game";
import { active, answer, create, makeLineSetup, makeSetup, pid, run, seedForFirstSpin, simulate } from "../../fixtures/game/setup.fixture";

describe("sérialisation et reprise", () => {
  it("fait l'aller-retour à l'identique sur une partie en cours", () => {
    const seed = seedForFirstSpin(1);
    const { state } = create(makeLineSetup({ seed }));
    const asked = run(state, { type: "SpinWheel", playerId: pid("p1") });
    expect(asked.state.phase.kind).toBe("awaiting_answer");

    const restored = deserializeGameState(serializeGameState(asked.state));
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.value).toEqual(asked.state);
  });

  it("reprend exactement où la partie s'était arrêtée et produit la même suite", () => {
    const seed = seedForFirstSpin(1);
    const { state } = create(makeLineSetup({ seed }));
    const asked = run(state, { type: "SpinWheel", playerId: pid("p1") });
    const restored = deserializeGameState(serializeGameState(asked.state));
    if (!restored.ok) throw new Error("restore");

    const command = { type: "SubmitAnswer" as const, playerId: active(asked.state), requestId: "q1", answer: answer("correct", "fr") };
    const original = reduce(asked.state, command);
    const resumed = reduce(restored.value, command);
    expect(resumed).toEqual(original);
  });

  it("sérialise une partie terminée avec son classement", () => {
    const sim = simulate(makeSetup({ players: players2(), seed: 4 }));
    const restored = deserializeGameState(serializeGameState(sim.state));
    expect(restored.ok).toBe(true);
    if (restored.ok) expect(restored.value.ranking).toEqual(sim.state.ranking);
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

function players2() {
  return makeSetup().players.slice(0, 2);
}
