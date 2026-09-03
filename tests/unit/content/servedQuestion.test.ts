import { describe, expect, it } from "vitest";
import { CATEGORIES, GEO_FACTS, contentRegistry } from "@/config/content";
import { createContentRegistry, createFactualProvider, factPlayabilityIssues, questionRefKey, rebuildMaths, type GeoFact } from "@/core/content";
import { deserializeGameState, reduce, serializeGameState } from "@/core/game";
import { resolveQuestion } from "@/experience/questionResolver";
import { active, answer, create, eventsOf, journey, makeLineSetup, makeSetup, pid, run } from "../../fixtures/game/setup.fixture";

const profiles = makeSetup().players.map((p) => ({ id: p.id, displayName: p.displayName, profileType: p.profileType, avatarId: "teal", child: { birthYear: 2018, schoolGrade: "CE2" } }));

describe("question figée dans l'état (ServeQuestion)", () => {
  it("fige la question distribuée avec sa référence versionnée ; refuse un double service ou un service hors demande", () => {
    const asked = journey(create(makeLineSetup()).state);
    const q = resolveQuestion(asked.state, profiles, contentRegistry())!;
    const served = run(asked.state, { type: "ServeQuestion", requestId: "q1", question: q });
    expect(served.state.phase).toMatchObject({ kind: "awaiting_answer", served: q });
    expect(eventsOf(served.events, "QuestionServed")[0]).toMatchObject({ requestId: "q1", playerId: pid("p1"), question: { ref: q.ref, knowledgeNodeId: q.knowledgeNodeId, difficulty: q.difficulty } });
    expect(reduce(served.state, { type: "ServeQuestion", requestId: "q1", question: q })).toEqual({ ok: false, error: { code: "QUESTION_ALREADY_SERVED", requestId: "q1" } });
    expect(reduce(asked.state, { type: "ServeQuestion", requestId: "autre", question: q })).toEqual({ ok: false, error: { code: "NO_PENDING_QUESTION", requestId: "autre" } });
    // La réponse enregistrée porte le résumé pédagogique de la question servie (jamais le montant).
    const answered = run(served.state, { type: "SubmitAnswer", playerId: active(served.state), requestId: "q1", answer: answer("correct", "fr") });
    expect(eventsOf(answered.events, "AnswerRecorded")[0]!.question).toEqual({ ref: q.ref, knowledgeNodeId: q.knowledgeNodeId, categoryId: q.categoryId, difficulty: q.difficulty });
  });

  it("reprise exacte : une modification du contenu ne change jamais une question déjà commencée", () => {
    // 1. distribuer une question (géographie, catalogue A)
    const asked = journey(create(makeLineSetup({ players: makeSetup().players.slice(0, 2) })).state);
    const registryA = createContentRegistry(CATEGORIES, [createFactualProvider(GEO_FACTS, { allowUnverified: true })]);
    const original = resolveQuestion(asked.state, profiles, registryA)!;
    expect(original.ref.origin).toBe("factual");
    // 2. sauvegarder en awaiting_answer avec la question figée
    const served = run(asked.state, { type: "ServeQuestion", requestId: "q1", question: original });
    const saved = serializeGameState(served.state);
    // 3. simuler une modification du catalogue : ordre inversé, fait supprimé, capitale « corrigée », nouvelle version
    const modified: GeoFact[] = [...GEO_FACTS].reverse().filter((f) => f.id !== (original.ref.origin === "factual" ? original.ref.factId : "")).map((f) => ({ ...f, version: 2, capital: { fr: `${f.capital.fr} (v2)`, ar: f.capital.ar } }));
    const registryB = createContentRegistry(CATEGORIES, [createFactualProvider(modified, { allowUnverified: true })]);
    // 4. restaurer
    const restored = deserializeGameState(saved);
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    const phase = restored.value.phase;
    // 5. même question, mêmes paramètres, même réponse, mêmes explications, même version
    expect(phase.kind === "awaiting_answer" ? phase.served : null).toEqual(original);
    // Une nouvelle résolution avec le contenu modifié donnerait autre chose : la reprise ne s'y fie pas.
    expect(resolveQuestion(restored.value, profiles, registryB)).not.toEqual(original);
  });

  it("une question algorithmique conserve ses opérandes réels et se reconstruit à l'identique", () => {
    const registry = contentRegistry();
    const q = registry.resolve({ categoryId: "maths", difficulty: 3, profileType: "child", variation: 4 })!;
    expect(q.ref.origin).toBe("algorithmic");
    if (q.ref.origin !== "algorithmic") return;
    expect(Object.keys(q.ref.params).sort()).toEqual(["a", "b"]);
    expect(q.ref.generatorVersion).toBe(1);
    expect(rebuildMaths(q.ref)).toEqual(q);
    expect(rebuildMaths({ ...q.ref, generatorVersion: 99 })).toBeNull();
    expect(questionRefKey(q.ref)).toContain(`a=${q.ref.params["a"]}`);
  });

  it("sérialisation v3 : l'état avec question servie fait l'aller-retour ; une v2 migre sans question figée", () => {
    const asked = journey(create(makeLineSetup()).state);
    const q = resolveQuestion(asked.state, profiles, contentRegistry())!;
    const served = run(asked.state, { type: "ServeQuestion", requestId: "q1", question: q });
    const back = deserializeGameState(serializeGameState(served.state));
    expect(back.ok && back.value).toEqual(served.state);
    const v2 = JSON.parse(serializeGameState(asked.state)) as Record<string, unknown>;
    v2["schemaVersion"] = 2;
    const migrated = deserializeGameState(JSON.stringify(v2));
    expect(migrated.ok).toBe(true);
    if (migrated.ok) expect(migrated.value.schemaVersion).toBe(3);
  });
});

describe("contenu factuel : démonstration ≠ validé", () => {
  it("tous les faits du catalogue de démonstration sont « unverified » et refusés sans le drapeau", () => {
    expect(GEO_FACTS.every((f) => f.status === "unverified")).toBe(true);
    const strict = createFactualProvider(GEO_FACTS);
    expect(strict.supports("geography")).toBe(false);
    expect(strict.resolve({ categoryId: "geography", difficulty: 2, profileType: "child", variation: 0 })).toBeNull();
    expect(factPlayabilityIssues(GEO_FACTS[0]!)).toContain("statut unverified ≠ validated");
  });

  it("un fait n'est jouable dans la banque réelle qu'avec statut validé, source, date de vérification et version", () => {
    const base = GEO_FACTS[0]!;
    const validated: GeoFact = { ...base, status: "validated", verifiedAt: "2026-09-03", sources: [{ title: "Référence vérifiée (fixture)" }] };
    expect(factPlayabilityIssues(validated)).toEqual([]);
    expect(factPlayabilityIssues({ ...validated, verifiedAt: undefined })).toContain("date de vérification manquante");
    expect(factPlayabilityIssues({ ...validated, sources: [] })).toContain("source manquante");
    const strict = createFactualProvider([validated, base]);
    expect(strict.supports("geography")).toBe(true);
    expect(strict.resolve({ categoryId: "geography", difficulty: 1, profileType: "child", variation: 0 })?.ref).toMatchObject({ origin: "factual", factId: base.id, factVersion: 1, templateVersion: 1 });
  });

  it("l'arabe généré est marqué provisoire, distinctement de la justesse du contenu", () => {
    const q = contentRegistry().resolve({ categoryId: "maths", difficulty: 2, profileType: "adult", variation: 1 })!;
    expect(q.review).toEqual({ ar: "provisional" });
    const g = contentRegistry().resolve({ categoryId: "geography", difficulty: 2, profileType: "adult", variation: 1 })!;
    expect(g.review).toEqual({ ar: "provisional" });
  });
});
