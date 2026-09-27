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
  it("32 cartes, identifiants uniques HISTGEO-001…HISTGEO-032, dans la catégorie geography et en version 1", () => {
    expect(HISTORY_GEOGRAPHY_BANK).toHaveLength(32);
    expect(new Set(ids).size).toBe(32);
    expect(ids).toEqual(Array.from({ length: 32 }, (_, i) => `HISTGEO-${String(i + 1).padStart(3, "0")}`));
    // Les deux cartes ajoutées pour que Le Caire et Jérusalem cessent d'être des notions à carte unique.
    expect(ids).toContain("HISTGEO-031");
    expect(ids).toContain("HISTGEO-032");
    expect(HISTORY_GEOGRAPHY_BANK.every((q) => q.categoryId === "geography" && q.version === 1 && q.audienceScope === "all")).toBe(true);
  });

  it("la catégorie devient « Histoire & Géographie » sans changer d'identifiant : les parties enregistrées restent lisibles", () => {
    expect(categoryById("geography")?.label.fr).toBe("Histoire & Géographie");
    expect(categoryById("geography")?.generationMode).toBe("curated");
  });

  it("chaque tranche d'âge est servie, et la difficulté de chaque carte tient dans la bande d'amorçage de sa tranche", () => {
    // Six cartes par tranche à l'origine ; les deux cartes ajoutées tombent en 7-8 (Le Caire) et 11-12 (Jérusalem).
    const attendu: Readonly<Record<string, number>> = { "5-6": 6, "7-8": 7, "9-10": 6, "11-12": 7, "13+": 6 };
    for (const [tranche, age] of TRANCHES) {
      const cartes = HISTORY_GEOGRAPHY_BANK.filter((q) => q.ageBand === tranche);
      expect(cartes, tranche).toHaveLength(attendu[tranche]!);
      const bande = difficultyBandFor({ profileType: "child", age });
      for (const q of cartes) {
        expect(q.difficulty, `${q.id} (${tranche})`).toBeGreaterThanOrEqual(bande.min);
        expect(q.difficulty, `${q.id} (${tranche})`).toBeLessThanOrEqual(bande.max);
      }
    }
    expect(HISTORY_GEOGRAPHY_BANK.filter((q) => TRANCHES.some(([t]) => t === q.ageBand))).toHaveLength(32);
  });

  it("les cartes portent sur les lieux de la carte du plateau, et AUCUNE notion n'est portée par une seule carte", () => {
    const parLieu = new Map<string, number>();
    for (const q of HISTORY_GEOGRAPHY_BANK) parLieu.set(q.knowledgeNodeId, (parLieu.get(q.knowledgeNodeId) ?? 0) + 1);
    expect([...parLieu.keys()].every((n) => n.startsWith("histgeo."))).toBe(true);
    for (const lieu of ["andalousie-cordoue", "maroc-marrakech", "algerie-alger", "tunisie-kairouan", "tunisie-carthage", "egypte-caire", "jerusalem", "turquie-istanbul", "ouzbekistan-samarcande"]) {
      expect(parLieu.get(`histgeo.${lieu}`) ?? 0, lieu).toBeGreaterThanOrEqual(2);
    }
    // Réviser une notion ne doit jamais revenir à reposer la même carte.
    for (const [lieu, n] of parLieu) expect(n, lieu).toBeGreaterThanOrEqual(2);
  });

  it("énoncé et réponse présents en français ET en arabe sur les 32 cartes", () => {
    for (const q of HISTORY_GEOGRAPHY_BANK) {
      expect(q.prompt.fr.trim(), q.id).not.toBe("");
      expect(q.answer.fr.trim(), q.id).not.toBe("");
      expect(arabic.test(q.prompt.ar ?? ""), q.id).toBe(true);
      expect(arabic.test(q.answer.ar ?? ""), q.id).toBe(true);
    }
  });

  it("l'arabe reste PROVISOIRE sur les 32 cartes : aucune traduction n'est tenue pour relue humainement", () => {
    expect(HISTORY_GEOGRAPHY_BANK.every((q) => q.arReview === "provisional")).toBe(true);
  });

  it("chaque carte porte au moins une source, résolue depuis le catalogue officiel", () => {
    for (const q of HISTORY_GEOGRAPHY_BANK) {
      expect(q.sources.length, q.id).toBeGreaterThanOrEqual(1);
      for (const s of q.sources) {
        expect(s.title.trim(), q.id).not.toBe("");
        // Aucune URL fictive : une source peut n'en porter aucune, jamais une inventée.
        if (s.url !== undefined) expect(s.url, q.id).toMatch(/^https:\/\/(unstats\.un\.org|whc\.unesco\.org)\//);
      }
    }
  });
});

describe("Histoire & Géographie V1 — source et arabe conditionnent la publication", () => {
  it("la catégorie exige une source, même quand le fait paraît évident, et montre son explication", () => {
    expect(categoryById("geography")?.requiresSource).toBe(true);
    expect(categoryById("geography")?.showsExplanation).toBe(true);
  });

  it("les 32 cartes franchissent la garde : explication FR et AR écrites par l'auteur, et au moins une source", () => {
    const categorie = categoryById("geography");
    expect(HISTORY_GEOGRAPHY_BANK.filter((q) => q.status === "validated")).toHaveLength(32);
    expect(HISTORY_GEOGRAPHY_BANK.filter((q) => q.status === "draft")).toHaveLength(0);
    for (const q of HISTORY_GEOGRAPHY_BANK) {
      expect(playabilityIssues(q, categorie), q.id).toEqual([]);
      expect(isPlayable(q, categorie), q.id).toBe(true);
      expect(q.explanation.fr.trim(), q.id).not.toBe("");
      expect(arabic.test(q.explanation.ar), q.id).toBe(true);
    }
  });

  it("la catégorie entre en production : 32 cartes servies, les autres banques inchangées", () => {
    const registry = contentRegistry();
    expect(registry.availableCategories("child")).toEqual(["religion", "maths", "geography", "logic", "management"]);
    expect(registry.availableCategories("adult")).toEqual(["religion", "maths", "geography", "logic", "management"]);
    expect(registry.slots("child").filter((s) => s.categoryId === "geography")).toHaveLength(32);
    expect(registry.resolve({ categoryId: "geography", difficulty: 2, profileType: "child", variation: 0 })).not.toBeNull();
    expect(CURATED_BANK.filter((q) => q.categoryId === "geography")).toHaveLength(32);
    expect(CURATED_BANK.filter((q) => q.categoryId === "religion" && q.status === "validated")).toHaveLength(375);
    expect(registry.slots("child").filter((s) => s.categoryId === "maths")).toHaveLength(30);
  });
});

describe("Histoire & Géographie V1 — servie par le Learning Engine, inchangé", () => {
  const banque = HISTORY_GEOGRAPHY_BANK;
  const categories = CATEGORIES;
  const registry = createContentRegistry(categories, [createCuratedProvider(banque, categories)]);

  it("les 32 cartes sont jouables et gardent leur arabe marqué provisoire", () => {
    expect(banque.every((q) => isPlayable(q, categoryById("geography")))).toBe(true);
    expect(registry.slots("child").filter((s) => s.categoryId === "geography")).toHaveLength(32);
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

  it("le catalogue ne porte que des sources officielles ONU et UNESCO, toutes fournies par l'auteur", () => {
    const urls = new Set(HISTORY_GEOGRAPHY_BANK.flatMap((q) => q.sources.map((s) => s.url)));
    expect(urls).toEqual(
      new Set([
        "https://unstats.un.org/unsd/methodology/m49/overview",
        "https://whc.unesco.org/en/list/313",
        "https://whc.unesco.org/en/list/331",
        "https://whc.unesco.org/en/list/37",
        "https://whc.unesco.org/en/list/499",
        "https://whc.unesco.org/en/list/565",
        "https://whc.unesco.org/en/list/89",
        "https://whc.unesco.org/en/list/148",
        "https://whc.unesco.org/en/list/356",
        "https://whc.unesco.org/en/list/603",
      ]),
    );
    // Chaque carte est couverte par au moins une source portant une URL vérifiable.
    for (const q of HISTORY_GEOGRAPHY_BANK) expect(q.sources.some((s) => s.url !== undefined), q.id).toBe(true);
  });
});
