import { describe, expect, it } from "vitest";
import { CATEGORIES, CURATED_BANK, GEOGRAPHY_BANK, categoryById, contentRegistry, difficultyBandFor } from "@/config/content";
import { LEARNING_CONFIG, learnerContextFor } from "@/config/learning";
import { createContentRegistry, createCuratedProvider, isPlayable, playabilityIssues, questionRefKey, type CuratedQuestion, type QuestionInstance } from "@/core/content";
import { addDays, applyAttempt, attemptId, emptyMemory, selectQuestion, type LearnerContext, type PlayerLearningMemory } from "@/core/learning";
import { pid } from "../../fixtures/game/setup.fixture";
import { T0 } from "../../fixtures/learning/resolve.fixture";

const arabic = /[؀-ۿ]/;
const partie = "game-geo";

/** Enregistre une bonne réponse à la question choisie (même mécanique que les autres tests du Learning Engine). */
function answerSelected(memory: PlayerLearningMemory, learner: LearnerContext, q: QuestionInstance, at: string, n: number): PlayerLearningMemory {
  return applyAttempt(
    memory,
    { id: attemptId(partie as never, `q${n}`), playerId: learner.playerId, gameId: partie as never, knowledgeNodeId: q.knowledgeNodeId, ref: q.ref, categoryId: q.categoryId, difficulty: q.difficulty, outcome: "correct", validationMode: "collective", explanationKnown: "none", rewardGranted: true, answeredAt: at },
    learner,
    LEARNING_CONFIG,
  );
}

const ids = GEOGRAPHY_BANK.map((q) => q.id);
/** Les quatre cartes pour lesquelles AUCUNE explication n'a été fournie : elles restent vides, jamais inventées. */
const SANS_EXPLICATION = ["GEO-011", "GEO-021", "GEO-022", "GEO-027"];
/** Tranches d'âge déclarées par l'auteur et âge représentatif de chacune (pour confronter aux bandes de `bands.v1.json`). */
const TRANCHES: ReadonlyArray<readonly [string, number]> = [
  ["5-6", 6],
  ["7-8", 8],
  ["9-10", 10],
  ["11-12", 12],
  ["13+", 14],
];

describe("Géographie V1 — banque contrôlée", () => {
  it("30 cartes, identifiants uniques GEO-001…GEO-030, toutes en géographie et en version 1", () => {
    expect(GEOGRAPHY_BANK).toHaveLength(30);
    expect(new Set(ids).size).toBe(30);
    expect(ids).toEqual(Array.from({ length: 30 }, (_, i) => `GEO-${String(i + 1).padStart(3, "0")}`));
    expect(GEOGRAPHY_BANK.every((q) => q.categoryId === "geography" && q.version === 1 && q.audienceScope === "all")).toBe(true);
  });

  it("six cartes par tranche d'âge, et la difficulté de chaque carte tient dans la bande d'amorçage de sa tranche", () => {
    for (const [tranche, age] of TRANCHES) {
      const cartes = GEOGRAPHY_BANK.filter((q) => q.ageBand === tranche);
      expect(cartes, tranche).toHaveLength(6);
      const bande = difficultyBandFor({ profileType: "child", age });
      for (const q of cartes) {
        expect(q.difficulty, `${q.id} (${tranche})`).toBeGreaterThanOrEqual(bande.min);
        expect(q.difficulty, `${q.id} (${tranche})`).toBeLessThanOrEqual(bande.max);
      }
    }
    expect(GEOGRAPHY_BANK.filter((q) => TRANCHES.some(([t]) => t === q.ageBand))).toHaveLength(30);
  });

  it("énoncé et réponse présents en français ET en arabe sur les 30 cartes", () => {
    for (const q of GEOGRAPHY_BANK) {
      expect(q.prompt.fr.trim(), q.id).not.toBe("");
      expect(q.answer.fr.trim(), q.id).not.toBe("");
      expect(arabic.test(q.prompt.ar ?? ""), q.id).toBe(true);
      expect(arabic.test(q.answer.ar ?? ""), q.id).toBe(true);
    }
  });

  it("l'arabe est déclaré PROVISOIRE sur toutes les cartes, en attente de relecture humaine", () => {
    expect(GEOGRAPHY_BANK.every((q) => q.arReview === "provisional")).toBe(true);
  });

  it("les quatre cartes sans explication fournie restent vides — rien n'est inventé — et les 26 autres ont bien FR et AR", () => {
    expect(GEOGRAPHY_BANK.filter((q) => q.explanation.fr.trim() === "").map((q) => q.id)).toEqual(SANS_EXPLICATION);
    for (const q of GEOGRAPHY_BANK) {
      if (SANS_EXPLICATION.includes(q.id)) {
        expect(q.explanation.ar.trim(), q.id).toBe("");
        expect(q.reviewNotes, q.id).toContain("explication FR et AR à fournir");
      } else {
        expect(q.explanation.fr.trim(), q.id).not.toBe("");
        expect(arabic.test(q.explanation.ar), q.id).toBe(true);
      }
    }
  });
});

describe("Géographie V1 — la source conditionne la publication", () => {
  it("la catégorie exige une source, même quand le fait paraît évident", () => {
    expect(categoryById("geography")?.requiresSource).toBe(true);
    expect(categoryById("geography")?.generationMode).toBe("curated");
  });

  it("aucune source n'est inventée : les 30 cartes ont un tableau de sources VIDE, jamais approximatif", () => {
    expect(GEOGRAPHY_BANK.every((q) => q.sources.length === 0)).toBe(true);
  });

  it("les 30 cartes sont en brouillon et AUCUNE ne franchit la garde de jouabilité", () => {
    expect(GEOGRAPHY_BANK.every((q) => q.status === "draft")).toBe(true);
    const geographie = categoryById("geography");
    for (const q of GEOGRAPHY_BANK) {
      expect(isPlayable(q, geographie), q.id).toBe(false);
      expect(playabilityIssues(q, geographie), q.id).toContain("source obligatoire absente");
    }
  });

  it("la géographie n'est donc servie NULLE PART en production, et la banque religieuse reste intacte", () => {
    const registry = contentRegistry();
    expect(registry.availableCategories("child")).toEqual(["religion", "maths"]);
    expect(registry.availableCategories("adult")).toEqual(["religion", "maths"]);
    expect(registry.resolve({ categoryId: "geography", difficulty: 2, profileType: "child", variation: 0 })).toBeNull();
    expect(registry.slots("child").some((s) => s.categoryId === "geography")).toBe(false);
    expect(registry.slots("adult").some((s) => s.categoryId === "geography")).toBe(false);
    // Non-régression : la banque curée accueille les 30 cartes sans rien changer à la religion.
    expect(CURATED_BANK.filter((q) => q.categoryId === "geography")).toHaveLength(30);
    expect(CURATED_BANK.filter((q) => q.categoryId === "religion" && q.status === "validated")).toHaveLength(375);
    expect(registry.slots("child").filter((s) => s.categoryId === "religion")).toHaveLength(375);
    expect(registry.slots("child").filter((s) => s.categoryId === "maths")).toHaveLength(30);
  });
});

/**
 * Ce que la banque DONNERA une fois la vérification humaine faite. La source
 * et la validation sont simulées ICI, dans le test, jamais dans les données :
 * aucune source fictive n'entre dans le dépôt.
 */
const commeSiValidee = (q: CuratedQuestion): CuratedQuestion => ({
  ...q,
  status: "validated",
  explanation: q.explanation.fr.trim() === "" ? { fr: "Explication de test (fixture).", ar: "شرح اختبار." } : q.explanation,
  sources: [{ title: "Source de test (fixture)", url: "https://example.org/fixture" }],
});

describe("Géographie V1 — une fois vérifiée et sourcée", () => {
  const banque = GEOGRAPHY_BANK.map(commeSiValidee);
  const categories = CATEGORIES;
  const registry = createContentRegistry(categories, [createCuratedProvider(banque, categories)]);

  it("les 30 cartes deviennent jouables et gardent leur arabe marqué provisoire", () => {
    expect(banque.every((q) => isPlayable(q, categoryById("geography")))).toBe(true);
    expect(registry.slots("child").filter((s) => s.categoryId === "geography")).toHaveLength(30);
    const q = registry.resolve({ categoryId: "geography", difficulty: 2, profileType: "child", variation: 0 })!;
    expect(q.ref.origin).toBe("curated");
    expect(q.review).toEqual({ ar: "provisional" });
    expect(q.sources.length).toBeGreaterThan(0);
  });

  it("un enfant de 6 ans démarre dans sa tranche, un adolescent de 14 ans plus haut : l'âge amorce la difficulté", () => {
    const slots = registry.slots("child");
    const petit = learnerContextFor({ id: pid("p1"), profileType: "child", age: 6 });
    const grand = learnerContextFor({ id: pid("p2"), profileType: "child", age: 14 });
    const qPetit = selectQuestion({ memory: emptyMemory(petit.playerId), learner: petit, slots, config: LEARNING_CONFIG, now: T0 })!.question;
    const qGrand = selectQuestion({ memory: emptyMemory(grand.playerId), learner: grand, slots, config: LEARNING_CONFIG, now: T0 })!.question;
    expect(qPetit.difficulty).toBeLessThanOrEqual(2);
    expect(qGrand.difficulty).toBeGreaterThan(qPetit.difficulty);
  });

  it("l'âge n'est pas un plafond : un enfant de 6 ans qui réussit dépasse sa tranche de départ", () => {
    const slots = registry.slots("child");
    const learner = learnerContextFor({ id: pid("p1"), profileType: "child", age: 6 });
    let memory = emptyMemory(learner.playerId);
    let atteinte = 0;
    for (let i = 0; i < 40; i += 1) {
      const now = addDays(T0, i);
      const q = selectQuestion({ memory, learner, slots, config: LEARNING_CONFIG, now })!.question;
      atteinte = Math.max(atteinte, q.difficulty);
      memory = answerSelected(memory, learner, q, now, i);
    }
    // La bande d'amorçage d'un enfant de 6 ans s'arrête à 2 : le Learning Engine, lui, l'emmène plus loin.
    expect(difficultyBandFor({ profileType: "child", age: 6 }).max).toBe(2);
    expect(atteinte).toBeGreaterThan(2);
    expect(memory.categories["geography"]!.estimatedLevel).toBeGreaterThan(memory.categories["geography"]!.seedLevel);
  });

  it("la sélection reste déterministe et ne repose jamais sur une formulation déjà posée tant qu'il en reste", () => {
    const slots = registry.slots("child");
    const learner = learnerContextFor({ id: pid("p1"), profileType: "child", age: 10 });
    let memory = emptyMemory(learner.playerId);
    const vues: string[] = [];
    for (let i = 0; i < 12; i += 1) {
      const q = selectQuestion({ memory, learner, slots, config: LEARNING_CONFIG, now: T0, gameId: partie })!.question;
      vues.push(questionRefKey(q.ref));
      memory = answerSelected(memory, learner, q, T0, i);
    }
    expect(new Set(vues).size).toBe(vues.length);
  });
});
