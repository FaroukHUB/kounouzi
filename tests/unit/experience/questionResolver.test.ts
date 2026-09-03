import { describe, expect, it } from "vitest";
import { contentRegistry } from "@/config/content";
import { reduce } from "@/core/game";
import { resolveQuestion } from "@/experience/questionResolver";
import { create, journey, makeLineSetup, makeSetup, players } from "../../fixtures/game/setup.fixture";

const profiles = makeSetup().players.map((p, i) => ({ id: p.id, displayName: p.displayName, profileType: p.profileType, avatarId: "teal", ...(i % 2 === 0 ? { child: { birthYear: 2018, schoolGrade: "CE1" } } : { adult: { initialLevel: "standard" as const } }) }));

describe("résolution d'une question pour une demande du moteur (provisoire, avant Learning Engine)", () => {
  it("ne résout rien hors phase de question", () => {
    expect(resolveQuestion(create(makeLineSetup()).state, profiles, contentRegistry())).toBeNull();
  });

  it("résout une question déterministe, bilingue, adaptée au profil, identique après rechargement", () => {
    const asked = journey(create(makeLineSetup()).state);
    const q1 = resolveQuestion(asked.state, profiles, contentRegistry());
    const q2 = resolveQuestion(asked.state, profiles, contentRegistry());
    expect(q1).not.toBeNull();
    expect(q1).toEqual(q2);
    expect(q1!.explanation.ar.length).toBeGreaterThan(0);
    expect(["maths", "geography"]).toContain(q1!.categoryId);
    expect(q1!.difficulty).toBeLessThanOrEqual(3); // enfant CE1 : bande [1,3]
  });

  it("fait tourner les catégories disponibles au fil des demandes", () => {
    const { state } = create(makeLineSetup({ cells: { 1: "question", 2: "question", 3: "question", 4: "question" }, players: players(2) }));
    const seen: string[] = [];
    let s = state;
    for (let i = 0; i < 4; i += 1) {
      const asked = journey(s);
      seen.push(resolveQuestion(asked.state, profiles, contentRegistry())!.categoryId);
      const playerId = asked.state.players[asked.state.activePlayerIndex]!.id;
      const requestId = asked.state.phase.kind === "awaiting_answer" ? asked.state.phase.requestId : "";
      const r = reduce(asked.state, { type: "SubmitAnswer", playerId, requestId, answer: { outcome: "correct", explanationMastery: "none", validationMode: "collective" } });
      if (!r.ok) throw new Error("reduce");
      s = r.value.state;
    }
    expect(new Set(seen).size).toBe(2);
  });
});
