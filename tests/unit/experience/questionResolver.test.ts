import { describe, expect, it } from "vitest";
import { CATEGORIES } from "@/config/content";
import { LEARNING_CONFIG } from "@/config/learning";
import { createAlgorithmicProvider, createContentRegistry, createCuratedProvider } from "@/core/content";
import { applyAttempt, attemptId, emptyMemory, type PlayerLearningMemory } from "@/core/learning";
import { pid } from "../../fixtures/game/setup.fixture";
import { create, journey, makeLineSetup, makeSetup } from "../../fixtures/game/setup.fixture";
import { TEST_ARABIC } from "../../fixtures/content/curated.fixture";
import { T0, resolveFor } from "../../fixtures/learning/resolve.fixture";

const profiles = makeSetup().players.map((p, i) => ({ id: p.id, displayName: p.displayName, profileType: p.profileType, avatarId: "teal", ...(i % 2 === 0 ? { child: { birthYear: 2018, schoolGrade: "CE1" } } : { adult: { initialLevel: "standard" as const } }) }));

describe("résolution d'une question pour une demande du moteur (Learning Engine)", () => {
  it("ne résout rien hors phase de question", () => {
    expect(resolveFor(create(makeLineSetup()).state, profiles)).toBeNull();
  });

  it("résout une question déterministe, bilingue, amorcée par le profil, identique à chaque appel", () => {
    const asked = journey(create(makeLineSetup()).state);
    const q1 = resolveFor(asked.state, profiles);
    const q2 = resolveFor(asked.state, profiles);
    expect(q1).not.toBeNull();
    expect(q1).toEqual(q2);
    expect(q1!.explanation.ar.length).toBeGreaterThan(0);
    expect(["maths", "geography"]).toContain(q1!.categoryId);
    expect(q1!.difficulty).toBe(2); // enfant CE1 : bande [1,3] → amorçage 2
  });

  it("la mémoire du joueur actif change la question ; celle des autres joueurs n'y change rien", () => {
    const registry = createContentRegistry(CATEGORIES, [createAlgorithmicProvider(), createCuratedProvider(TEST_ARABIC, CATEGORIES)]);
    const asked = journey(create(makeLineSetup()).state);
    const fresh = resolveFor(asked.state, profiles, registry)!;
    let memory: PlayerLearningMemory = emptyMemory(pid("p1"));
    const learner = { playerId: pid("p1"), profileType: "child" as const, seedLevel: 2 };
    memory = applyAttempt(memory, { id: attemptId(asked.state.gameId, "x1"), playerId: pid("p1"), gameId: asked.state.gameId, knowledgeNodeId: fresh.knowledgeNodeId, ref: fresh.ref, categoryId: fresh.categoryId, difficulty: fresh.difficulty, outcome: "correct", validationMode: "collective", explanationKnown: "none", rewardGranted: true, answeredAt: T0 }, learner, LEARNING_CONFIG);
    const next = resolveFor(asked.state, profiles, registry, { p1: memory })!;
    expect(next.ref).not.toEqual(fresh.ref);
    // La mémoire d'un autre joueur ne modifie pas la sélection du joueur actif.
    expect(resolveFor(asked.state, profiles, registry, { p2: memory })).toEqual(fresh);
  });
});
