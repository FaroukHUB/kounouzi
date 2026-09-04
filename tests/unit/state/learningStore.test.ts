import { describe, expect, it } from "vitest";
import { LEARNING_CONFIG, learnerContextFor } from "@/config/learning";
import type { GameEvent } from "@/core/game";
import type { GameId } from "@/core/shared";
import type { PlayerProfileDraft } from "@/data/ports";
import { createMemoryLearningRepository, createMemoryPlayerProfileRepository } from "@/data/local";
import { createLearningStore } from "@/state/learningStore";
import { active, answer, create, journey, makeLineSetup, makeSetup, pid, run } from "../../fixtures/game/setup.fixture";
import { T0, resolveFor } from "../../fixtures/learning/resolve.fixture";

const profiles: readonly PlayerProfileDraft[] = makeSetup().players.map((p, i) => ({ id: p.id, displayName: p.displayName, profileType: p.profileType, avatarId: "teal", ...(i % 2 === 0 ? { child: { birthYear: 2018, schoolGrade: "CE2" } } : { adult: { initialLevel: "standard" as const } }) }));
const learners = profiles.map((p) => learnerContextFor({ id: p.id, profileType: p.profileType, schoolGrade: p.child?.schoolGrade, initialLevel: p.adult?.initialLevel }));

function harness(repository = createMemoryLearningRepository()) {
  let tick = 0;
  const store = createLearningStore({ repository, config: LEARNING_CONFIG, now: () => `2026-03-01T10:${String(tick++).padStart(2, "0")}:00.000Z` });
  return { repository, store };
}

describe("learningStore (mémoire pédagogique persistante)", () => {
  it("enregistre une réponse à une question servie, avec récompense accordée ou non, et persiste", async () => {
    const h = harness();
    await h.store.getState().ensureLoaded([pid("p1")]);
    const asked = journey(create(makeLineSetup()).state);
    const q = resolveFor(asked.state, profiles)!;
    const served = run(asked.state, { type: "ServeQuestion", requestId: "q1", question: q });
    const answered = run(served.state, { type: "SubmitAnswer", playerId: active(served.state), requestId: "q1", answer: answer("incorrect") });
    const recorded = h.store.getState().record(served.state.gameId, answered.events, learners);
    expect(recorded).toHaveLength(1);
    expect(recorded[0]).toMatchObject({ id: "game-test:q1", playerId: "p1", knowledgeNodeId: q.knowledgeNodeId, ref: q.ref, outcome: "incorrect", rewardGranted: false, explanationKnown: "none", answeredAt: "2026-03-01T10:00:00.000Z" });
    expect(h.store.getState().memoryOf(pid("p1"))?.attempts).toHaveLength(1);
    expect(h.store.getState().memoryOf(pid("p1"))?.categories[q.categoryId]?.attempts).toBe(1);
    // Persisté par le port, relu à l'identique par une nouvelle session.
    await Promise.resolve();
    const again = harness(h.repository);
    await again.store.getState().ensureLoaded([pid("p1")]);
    expect(again.store.getState().memoryOf(pid("p1"))).toEqual(h.store.getState().memoryOf(pid("p1")));
    // Le même lot rejoué ne compte pas deux fois.
    expect(h.store.getState().record(served.state.gameId, answered.events, learners)).toHaveLength(0);
  });

  it("ignore une réponse sans question servie (« Passer ») : rien n'est inventé", () => {
    const h = harness();
    const events: GameEvent[] = [{ type: "AnswerRecorded", requestId: "q9", playerId: pid("p1"), outcome: "incorrect", explanationMastery: "none", validationMode: "collective" }];
    expect(h.store.getState().record("g" as GameId, events, learners)).toHaveLength(0);
    expect(h.store.getState().memoryOf(pid("p1"))).toBeUndefined();
  });

  it("la progression survit à une nouvelle partie : la mémoire est chargée par identifiant de joueur stable", async () => {
    const repository = createMemoryLearningRepository();
    const first = harness(repository);
    const asked = journey(create(makeLineSetup()).state);
    const q = resolveFor(asked.state, profiles)!;
    const served = run(asked.state, { type: "ServeQuestion", requestId: "q1", question: q });
    const answered = run(served.state, { type: "SubmitAnswer", playerId: active(served.state), requestId: "q1", answer: answer("correct", "both") });
    first.store.getState().record(served.state.gameId, answered.events, learners);
    await Promise.resolve();
    const second = harness(repository);
    await second.store.getState().ensureLoaded([pid("p1"), pid("p2")]);
    expect(second.store.getState().isLoaded(pid("p2"))).toBe(true);
    expect(second.store.getState().memoryOf(pid("p2"))?.attempts).toEqual([]);
    const memory = second.store.getState().memoryOf(pid("p1"))!;
    expect(memory.attempts[0]).toMatchObject({ explanationKnown: "both", rewardGranted: true });
    // La prochaine question d'une NOUVELLE partie tient compte de cette mémoire.
    const nextGame = journey(create(makeLineSetup({ gameId: "game-2" as GameId })).state);
    expect(resolveFor(nextGame.state, profiles, undefined, { p1: memory }, T0)!.ref).not.toEqual(q.ref);
  });

  it("le dépôt de profils joueurs liste les profils persistants (identifiants stables)", async () => {
    const repo = createMemoryPlayerProfileRepository();
    await repo.save({ ...profiles[0]!, savedAt: "2026-01-01T00:00:00Z" });
    await repo.save({ ...profiles[1]!, savedAt: "2026-01-02T00:00:00Z" });
    expect((await repo.list()).map((p) => p.id)).toEqual(["p2", "p1"]);
    await repo.remove(pid("p2"));
    expect((await repo.list()).map((p) => p.id)).toEqual(["p1"]);
  });
});
