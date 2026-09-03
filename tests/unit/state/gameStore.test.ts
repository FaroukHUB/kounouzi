import { describe, expect, it } from "vitest";
import type { GameEvent } from "@/core/game";
import { createMemoryGameRepository } from "@/data/local";
import { createGameStore } from "@/state/gameStore";
import { resolvePhase3DemoInteraction } from "@/dev/phase3DemoResolver";
import { makeSetup, pid } from "../../fixtures/game/setup.fixture";

function harness() {
  const repository = createMemoryGameRepository();
  const emitted: GameEvent[][] = [];
  let tick = 0;
  const store = createGameStore({ repository, now: () => `2026-01-01T00:00:${String(tick++).padStart(2, "0")}Z`, onEvents: (events) => emitted.push([...events]) });
  const profiles = makeSetup().players.map((p, i) => ({ id: p.id, displayName: p.displayName, profileType: p.profileType, avatarId: i % 2 === 0 ? "amber" : "teal" }));
  return { repository, emitted, store, profiles };
}

describe("gameStore (état persistant issu du moteur)", () => {
  it("crée une partie, la persiste et transmet les événements à la couche expérience", async () => {
    const h = harness();
    expect(h.store.getState().create(makeSetup(), h.profiles, 1)).toBe(true);
    expect(h.store.getState().status).toBe("ready");
    expect(h.emitted[0]?.[0]?.type).toBe("GameCreated");
    expect(h.repository.size()).toBe(1);
    const list = await h.store.getState().listSaved();
    expect(list[0]).toMatchObject({ gameId: "game-test", status: "in_progress", turnNumber: 1 });
    expect(list[0]?.players.map((p) => p.avatarId)).toEqual(["amber", "teal", "amber"]);
  });

  it("dispatch applique le moteur, persiste, et refuse une commande invalide sans changer l'état", () => {
    const h = harness();
    h.store.getState().create(makeSetup(), h.profiles, 1);
    const before = h.store.getState().state;
    expect(h.store.getState().dispatch({ type: "StartJourney", playerId: pid("p2") }).ok).toBe(false);
    expect(h.store.getState().state).toBe(before);
    expect(h.store.getState().lastError).toMatchObject({ code: "NOT_ACTIVE_PLAYER" });

    const moved = h.store.getState().dispatch({ type: "StartJourney", playerId: pid("p1") });
    expect(moved.ok).toBe(true);
    if (moved.ok) expect(moved.events.some((e) => e.type === "MovementAssigned")).toBe(true);
    expect(h.store.getState().state?.players[0]?.position).toBe(3);
    expect(h.emitted.at(-1)?.some((e) => e.type === "MovementAssigned")).toBe(true);
  });

  it("reprend exactement une partie sauvegardée, sans rejouer d'animation", async () => {
    const h = harness();
    h.store.getState().create(makeSetup(), h.profiles, 1);
    h.store.getState().dispatch({ type: "StartJourney", playerId: pid("p1") });
    h.store.getState().dispatch({ type: "AdvanceClock", seconds: 42 });
    const snapshot = h.store.getState().state;
    const emittedBefore = h.emitted.length;

    // Nouvelle « session » sur le même dépôt : rechargement.
    const fresh = createGameStore({ repository: h.repository, now: () => "2026-01-02T00:00:00Z", onEvents: (events) => h.emitted.push([...events]) });
    expect(await fresh.getState().load(snapshot!.gameId)).toBe("ready");
    expect(fresh.getState().state).toEqual(snapshot);
    expect(fresh.getState().profiles).toEqual(h.profiles);
    expect(h.emitted.length).toBe(emittedBefore);
    expect(fresh.getState().state?.clock.activePlaySeconds).toBe(42);
  });

  it("le numéro de partie familiale est monotone : créer puis abandonner ne le rend jamais", async () => {
    const h = harness();
    expect(await h.store.getState().allocateFamilyGameOrdinal()).toBe(1);
    expect(await h.store.getState().allocateFamilyGameOrdinal()).toBe(2); // partie 1 « abandonnée » : son numéro est consommé
    h.store.getState().create(makeSetup(), h.profiles, 2);
    const list = await h.store.getState().listSaved();
    expect(list).toHaveLength(1);
    expect(await h.store.getState().allocateFamilyGameOrdinal()).toBe(3);
    const fresh = createGameStore({ repository: h.repository, now: () => "x" });
    await fresh.getState().load("game-test" as never);
    expect(fresh.getState().familyGameOrdinal).toBe(2);
  });

  it("signale une partie absente ou corrompue", async () => {
    const h = harness();
    expect(await h.store.getState().load("nope" as never)).toBe("missing");
    await h.repository.save({ gameId: "bad" as never, savedAt: "x", status: "in_progress", turnNumber: 1, players: [], familyGameOrdinal: 1, profiles: [], state: "{" });
    expect(await h.store.getState().load("bad" as never)).toBe("corrupted");
  });

  it("le résolveur de démonstration Phase 3 n'émet que des commandes ordinaires, déterministes", () => {
    const h = harness();
    h.store.getState().create(makeSetup({ scenarios: [] }), h.profiles, 1);
    let guard = 0;
    while (h.store.getState().state?.phase.kind !== "awaiting_answer" && guard++ < 50) {
      const s = h.store.getState().state!;
      const demo = resolvePhase3DemoInteraction(s);
      h.store.getState().dispatch(demo ?? { type: "StartJourney", playerId: s.players[s.activePlayerIndex]!.id });
    }
    const s = h.store.getState().state!;
    expect(resolvePhase3DemoInteraction(s)).toMatchObject({ type: "SubmitAnswer", answer: { outcome: "correct", explanationMastery: "none", validationMode: "collective" } });
    expect(resolvePhase3DemoInteraction(s)).toEqual(resolvePhase3DemoInteraction(s));
  });
});
