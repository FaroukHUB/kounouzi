import { describe, expect, it } from "vitest";
import { CATEGORIES, CURATED_BANK, HISTORY_GEOGRAPHY_BANK, categoryById, contentRegistry, curatedBankSchema, difficultyBandFor } from "@/config/content";
import { LEARNING_CONFIG, learnerContextFor } from "@/config/learning";
import { createContentRegistry, createCuratedProvider, isPlayable, playabilityIssues, questionRefKey, type CuratedQuestion, type QuestionInstance } from "@/core/content";
import { addDays, applyAttempt, attemptId, emptyMemory, selectQuestion, type LearnerContext, type PlayerLearningMemory } from "@/core/learning";
import { pid } from "../../fixtures/game/setup.fixture";
import { T0 } from "../../fixtures/learning/resolve.fixture";

const arabic = /[؀-ۿ]/;
const partie = "game-histgeo";

/** Enregistre une bonne réponse à la question choisie (même mécanique que les autres tests du Learning Engine). */
function answerSelected(memory: PlayerLearningMemory, learner: LearnerContext, q: QuestionInstance, at: string, n: number): PlayerLearningMemory {
  return applyAttempt(
    memory,
    { id: attemptId(partie as never, `q${n}`), playerId: learner.playerId, gameId: partie as never, knowledgeNodeId: q.knowledgeNodeId, ref: q.ref, categoryId: q.categoryId, difficulty: q.difficulty, outcome: "correct", validationMode: "collective", explanationKnown: "none", rewardGranted: true, answeredAt: at },
    learner,
    LEARNING_CONFIG,
  );
}

const ids = HISTORY_GEOGRAPHY_BANK.map((q) => q.id);
/** Tranches d'âge déclarées par l'auteur et âge représentatif de chacune (pour confronter aux bandes de `bands.v1.json`). */
const TRANCHES: ReadonlyArray<readonly [string, number]> = [
  ["5-6", 6],
  ["7-8", 8],
  ["9-10", 10],
  ["11-12", 12],
  ["13+", 14],
];

describe("Histoire & Géographie V1 — banque contrôlée", () => {
  it("30 cartes, identifiants uniques HISTGEO-001…HISTGEO-030, dans la catégorie geography et en version 1", () => {
    expect(HISTORY_GEOGRAPHY_BANK).toHaveLength(30);
    expect(new Set(ids).size).toBe(30);
    expect(ids).toEqual(Array.from({ length: 30 }, (_, i) => `HISTGEO-${String(i + 1).padStart(3, "0")}`));
    expect(HISTORY_GEOGRAPHY_BANK.every((q) => q.categoryId === "geography" && q.version === 1 && q.audienceScope === "all")).toBe(true);
  });

  it("la catégorie devient « Histoire & Géographie » sans changer d'identifiant : les parties enregistrées restent lisibles", () => {
    expect(categoryById("geography")?.label.fr).toBe("Histoire & Géographie");
    expect(categoryById("geography")?.generationMode).toBe("curated");
  });

  it("six cartes par tranche d'âge, et la difficulté de chaque carte tient dans la bande d'amorçage de sa tranche", () => {
    for (const [tranche, age] of TRANCHES) {
      const cartes = HISTORY_GEOGRAPHY_BANK.filter((q) => q.ageBand === tranche);
      expect(cartes, tranche).toHaveLength(6);
      const bande = difficultyBandFor({ profileType: "child", age });
      for (const q of cartes) {
        expect(q.difficulty, `${q.id} (${tranche})`).toBeGreaterThanOrEqual(bande.min);
        expect(q.difficulty, `${q.id} (${tranche})`).toBeLessThanOrEqual(bande.max);
      }
    }
    expect(HISTORY_GEOGRAPHY_BANK.filter((q) => TRANCHES.some(([t]) => t === q.ageBand))).toHaveLength(30);
  });

  it("les cartes portent sur les lieux de la carte du plateau, et chaque lieu est une notion révisable", () => {
    const lieux = new Set(HISTORY_GEOGRAPHY_BANK.map((q) => q.knowledgeNodeId));
    expect([...lieux].every((n) => n.startsWith("histgeo."))).toBe(true);
    for (const lieu of ["andalousie-cordoue", "maroc-marrakech", "algerie-alger", "tunisie-kairouan", "tunisie-carthage", "egypte-caire", "palestine-jerusalem", "turquie-istanbul", "ouzbekistan-samarcande"]) {
      expect(lieux, lieu).toContain(`histgeo.${lieu}`);
    }
  });

  it("énoncé et réponse en français sur les 30 cartes ; l'arabe est ABSENT et n'est pas inventé ici", () => {
    for (const q of HISTORY_GEOGRAPHY_BANK) {
      expect(q.prompt.fr.trim(), q.id).not.toBe("");
      expect(q.answer.fr.trim(), q.id).not.toBe("");
      expect(arabic.test(q.prompt.ar ?? ""), q.id).toBe(false);
      expect(arabic.test(q.answer.ar ?? ""), q.id).toBe(false);
      expect(q.explanation.ar.trim(), q.id).toBe("");
    }
    expect(HISTORY_GEOGRAPHY_BANK.every((q) => q.arReview === "provisional")).toBe(true);
  });
});

describe("Histoire & Géographie V1 — source et arabe conditionnent la publication", () => {
  it("la catégorie exige une source, même quand le fait paraît évident, et montre son explication", () => {
    expect(categoryById("geography")?.requiresSource).toBe(true);
    expect(categoryById("geography")?.showsExplanation).toBe(true);
  });

  it("aucune source n'est inventée : les 30 cartes ont un tableau de sources VIDE, jamais approximatif", () => {
    expect(HISTORY_GEOGRAPHY_BANK.every((q) => q.sources.length === 0)).toBe(true);
  });

  it("les 30 cartes sont en brouillon et AUCUNE ne franchit la garde : source absente ET explication arabe absente", () => {
    expect(HISTORY_GEOGRAPHY_BANK.every((q) => q.status === "draft")).toBe(true);
    const categorie = categoryById("geography");
    for (const q of HISTORY_GEOGRAPHY_BANK) {
      expect(isPlayable(q, categorie), q.id).toBe(false);
      const manques = playabilityIssues(q, categorie);
      expect(manques, q.id).toContain("source obligatoire absente");
      expect(manques, q.id).toContain("explication AR manquante");
    }
  });

  it("la catégorie n'est donc servie NULLE PART en production, et les autres banques restent intactes", () => {
    const registry = contentRegistry();
    expect(registry.availableCategories("child")).toEqual(["religion", "maths", "logic", "management"]);
    expect(registry.availableCategories("adult")).toEqual(["religion", "maths", "logic", "management"]);
    expect(registry.resolve({ categoryId: "geography", difficulty: 2, profileType: "child", variation: 0 })).toBeNull();
    expect(registry.slots("child").some((s) => s.categoryId === "geography")).toBe(false);
    expect(CURATED_BANK.filter((q) => q.categoryId === "geography")).toHaveLength(30);
    expect(CURATED_BANK.filter((q) => q.categoryId === "religion" && q.status === "validated")).toHaveLength(375);
    expect(registry.slots("child").filter((s) => s.categoryId === "maths")).toHaveLength(30);
  });
});

/**
 * Ce que la banque DONNERA une fois la vérification humaine faite : source
 * fournie et arabe écrit. Les deux sont simulés ICI, dans le test, jamais dans
 * les données — aucune source fictive, aucune traduction inventée n'entre dans
 * le dépôt.
 */
const commeSiValidee = (q: CuratedQuestion): CuratedQuestion => ({
  ...q,
  status: "validated",
  explanation: { fr: q.explanation.fr.trim() === "" ? "Explication de test (fixture)." : q.explanation.fr, ar: "شرح اختبار." },
  sources: [{ title: "Source de test (fixture)", url: "https://example.org/fixture" }],
});

describe("Histoire & Géographie V1 — une fois vérifiée, sourcée et traduite", () => {
  const banque = HISTORY_GEOGRAPHY_BANK.map(commeSiValidee);
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

describe("catalogue de sources : une source institutionnelle peut couvrir plusieurs cartes", () => {
  /** Banque de test minimale : le catalogue et les clés sont exercés ici, jamais avec une vraie source. */
  const carte = (id: string, sourceKeys: readonly string[]) => ({
    id,
    version: 1,
    categoryId: "geography",
    knowledgeNodeId: `test.${id}`,
    difficulty: 2,
    audienceScope: "all" as const,
    status: "draft" as const,
    prompt: { fr: "Énoncé de test", ar: "سؤال اختبار" },
    answer: { fr: "Réponse de test", ar: "جواب اختبار" },
    explanation: { fr: "Explication de test.", ar: "شرح اختبار." },
    sources: [],
    sourceKeys,
  });
  const doc = {
    version: 1,
    sources: [
      { key: "inst-a", title: "Source institutionnelle A (fixture)", publisher: "Éditeur de test", url: "https://example.org/a" },
      { key: "inst-b", title: "Source institutionnelle B (fixture)", publisher: "Éditeur de test" },
    ],
    questions: [carte("T-001", ["inst-a"]), carte("T-002", ["inst-a", "inst-b"]), carte("T-003", [])],
  };

  it("une même clé rattache la même source à plusieurs cartes, sans la recopier", () => {
    const banque = curatedBankSchema.parse(doc);
    expect(banque.sources).toHaveLength(2);
    expect(banque.questions.filter((q) => (q.sourceKeys ?? []).includes("inst-a"))).toHaveLength(2);
  });

  it("une carte qui cite une clé absente du catalogue fait ÉCHOUER le chargement : aucune référence fantôme", () => {
    expect(() => curatedBankSchema.parse({ ...doc, questions: [carte("T-004", ["inconnue"])] })).toThrow(/T-004 cite la source/);
  });

  it("le catalogue de la banque Histoire & Géographie est prêt mais VIDE : aucune source inventée, aucune URL devinée", () => {
    expect(HISTORY_GEOGRAPHY_BANK.every((q) => q.sources.length === 0)).toBe(true);
  });
});
