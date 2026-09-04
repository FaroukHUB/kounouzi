import { describe, expect, it } from "vitest";
import { LEARNING_CONFIG, learnerContextFor } from "@/config/learning";
import { contentRegistry } from "@/config/content";
import { targetLevel, emptyMemory } from "@/core/learning";
import { pendingRequest } from "@/experience/questionResolver";
import { challengesFixture } from "../../fixtures/game/challenges.fixture";
import { scenariosOf } from "../../fixtures/game/scenarios.fixture";
import { create, journey, makeLineSetup, pid, run } from "../../fixtures/game/setup.fixture";
import { resolveFor } from "../../fixtures/learning/resolve.fixture";

const players = [
  { id: pid("papa"), displayName: "Papa", profileType: "adult" as const },
  { id: pid("maryam"), displayName: "Maryam", profileType: "child" as const, age: 9 },
];
const profiles = players.map((p) => ({ id: p.id, displayName: p.displayName, profileType: p.profileType, avatarId: "teal", ...(p.profileType === "child" ? { child: { birthYear: 2017 } } : { adult: { initialLevel: "standard" as const } }) }));

const mathsChallenge = (id: string, difficultyDelta: number) => ({ id, title: "Calcul", category: "maths" as const, minAge: 5, reward: 20, text: "Résous le calcul.", variants: [], ohNo: false, boss: false, consentRequired: false, animationKey: "mental_math", contentRef: { kind: "validated_question" as const, categoryId: "maths", difficultyDelta } });

describe("Défi famille à contenu validé : la question est choisie par le Learning Engine puis figée", () => {
  it("la demande en attente porte la contrainte du défi ; la question servie est de la catégorie demandée, figée dans l'état, plus rien n'est demandé ensuite", () => {
    const config = challengesFixture({ definitions: [mathsChallenge("T-MATH", 0)], contentAvailable: ["T-MATH"] });
    const landed = journey(create(makeLineSetup({ cells: { 1: "challenge" }, scenarios: scenariosOf("challenge-family"), players, challenges: config })).state);
    expect(pendingRequest(landed.state)).toEqual({ requestId: "q1", playerId: pid("papa"), constraint: { categoryId: "maths", difficultyDelta: 0 } });
    const question = resolveFor(landed.state, profiles);
    expect(question?.categoryId).toBe("maths");
    const served = run(landed.state, { type: "ServeQuestion", requestId: "q1", question: question! });
    expect(served.state.phase.kind === "awaiting_challenge" && served.state.phase.challenge.served?.categoryId).toBe("maths");
    expect(pendingRequest(served.state)).toBeNull();
    // Même état → même question (aucun hasard).
    expect(resolveFor(landed.state, profiles)?.ref).toEqual(question?.ref);
  });

  it("« +1 niveau » : la question servie est strictement au-dessus du niveau estimé du joueur dans la catégorie", () => {
    const config = challengesFixture({ definitions: [mathsChallenge("T-MATH-PLUS", 1)], contentAvailable: ["T-MATH-PLUS"] });
    const landed = journey(create(makeLineSetup({ cells: { 1: "challenge" }, scenarios: scenariosOf("challenge-family"), players, challenges: config })).state);
    const question = resolveFor(landed.state, profiles);
    const learner = learnerContextFor({ id: pid("papa"), profileType: "adult", initialLevel: "standard" });
    expect(question).not.toBeNull();
    expect(question!.difficulty).toBeGreaterThanOrEqual(targetLevel(emptyMemory(pid("papa")), "maths", learner, LEARNING_CONFIG) + 1);
  });

  it("un défi sans contenu ne demande jamais de question ; un défi religieux n'est proposable qu'avec du contenu validé (aucun aujourd'hui)", () => {
    const landed = journey(create(makeLineSetup({ cells: { 1: "challenge" }, scenarios: scenariosOf("challenge-family"), players, challenges: challengesFixture() })).state);
    expect(pendingRequest(landed.state)).toBeNull();
    expect(resolveFor(landed.state, profiles)).toBeNull();
    expect(contentRegistry().slots("child").some((s) => s.categoryId === "religion")).toBe(false);
  });
});
