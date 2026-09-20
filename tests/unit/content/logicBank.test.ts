import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { CURATED_BANK, LOGIC_BANK, categoryById, contentRegistry, difficultyBandFor } from "@/config/content";
import { LEARNING_CONFIG, learnerContextFor } from "@/config/learning";
import { isPlayable, playabilityIssues, questionRefKey, type QuestionInstance } from "@/core/content";
import { addDays, applyAttempt, attemptId, emptyMemory, selectQuestion, type LearnerContext, type PlayerLearningMemory } from "@/core/learning";
import { pid } from "../../fixtures/game/setup.fixture";
import { T0 } from "../../fixtures/learning/resolve.fixture";

const arabic = /[؀-ۿ]/;
const ids = LOGIC_BANK.map((q) => q.id);
const partie = "game-log";
/**
 * LOG-003 est la seule carte retenue : l'explication fournie par l'auteur décrit une petite boîte
 * qui entre dans une grande, alors que l'énoncé compare la taille de Lina et d'Adam. Le texte est
 * enregistré tel quel, jamais retouché, et la carte n'est pas publiée tant qu'il n'a pas tranché.
 */
const RETENUES = ["LOG-003"];
const TRANCHES: ReadonlyArray<readonly [string, number]> = [
  ["5-6", 6],
  ["7-8", 8],
  ["9-10", 10],
  ["11-12", 12],
  ["13+", 14],
];
const slotsLogique = (profil: "child" | "adult" = "child") => contentRegistry().slots(profil).filter((s) => s.categoryId === "logic");

function answerSelected(memory: PlayerLearningMemory, learner: LearnerContext, q: QuestionInstance, at: string, n: number): PlayerLearningMemory {
  return applyAttempt(
    memory,
    { id: attemptId(partie as never, `q${n}`), playerId: learner.playerId, gameId: partie as never, knowledgeNodeId: q.knowledgeNodeId, ref: q.ref, categoryId: q.categoryId, difficulty: q.difficulty, outcome: "correct", validationMode: "collective", explanationKnown: "none", rewardGranted: true, answeredAt: at },
    learner,
    LEARNING_CONFIG,
  );
}

describe("Logique V1 — banque curée de 30 cartes statiques", () => {
  it("exactement 30 cartes, identifiants uniques LOG-001…LOG-030, catégorie persistée « logic »", () => {
    expect(LOGIC_BANK).toHaveLength(30);
    expect(new Set(ids).size).toBe(30);
    expect(ids).toEqual(Array.from({ length: 30 }, (_, i) => `LOG-${String(i + 1).padStart(3, "0")}`));
    expect(LOGIC_BANK.every((q) => q.categoryId === "logic" && q.version === 1 && q.audienceScope === "all")).toBe(true);
  });

  it("six cartes par tranche d'âge, et la difficulté de chaque carte tient dans la bande d'amorçage de sa tranche", () => {
    for (const [tranche, age] of TRANCHES) {
      const cartes = LOGIC_BANK.filter((q) => q.ageBand === tranche);
      expect(cartes, tranche).toHaveLength(6);
      const bande = difficultyBandFor({ profileType: "child", age });
      for (const q of cartes) {
        expect(q.difficulty, `${q.id} (${tranche})`).toBeGreaterThanOrEqual(bande.min);
        expect(q.difficulty, `${q.id} (${tranche})`).toBeLessThanOrEqual(bande.max);
      }
    }
    expect(LOGIC_BANK.filter((q) => TRANCHES.some(([t]) => t === q.ageBand))).toHaveLength(30);
    expect(new Set(LOGIC_BANK.map((q) => q.difficulty))).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  it("énoncé et réponse présents en français ET en arabe sur les 30 cartes", () => {
    // Une réponse purement numérique (« 8. », « 236. ») s'écrit à l'identique dans les deux langues :
    // on exige alors qu'elle soit présente, pas qu'elle contienne de l'alphabet arabe.
    const numerique = /^[\d\s.,]+$/;
    for (const q of LOGIC_BANK) {
      expect(q.prompt.fr.trim(), q.id).not.toBe("");
      expect(q.answer.fr.trim(), q.id).not.toBe("");
      expect(arabic.test(q.prompt.ar ?? ""), q.id).toBe(true);
      const reponseAr = (q.answer.ar ?? "").trim();
      expect(reponseAr, q.id).not.toBe("");
      expect(arabic.test(reponseAr) || numerique.test(reponseAr), q.id).toBe(true);
    }
  });

  it("tout l'arabe de la banque est déclaré PROVISOIRE : c'est une traduction, en attente de relecture humaine", () => {
    expect(LOGIC_BANK.every((q) => q.arReview === "provisional")).toBe(true);
  });

  it("dix notions stables pour trente cartes, chacune portée par au moins deux cartes", () => {
    const parNotion = new Map<string, string[]>();
    for (const q of LOGIC_BANK) parNotion.set(q.knowledgeNodeId, [...(parNotion.get(q.knowledgeNodeId) ?? []), q.id]);
    expect(parNotion.size).toBe(10);
    expect([...parNotion].filter(([, cartes]) => cartes.length < 2).map(([n]) => n)).toEqual([]);
    for (const n of parNotion.keys()) expect(n, n).toMatch(/^logique\.[a-z-]+$/);
  });

  it("aucun générateur : les 30 cartes sont statiques, jamais tirées au hasard", () => {
    const fichier = readFileSync("src/content/questions/logic/logique.v1.json", "utf8");
    expect(fichier).not.toMatch(/Math\.random|generatorId|generatorVersion/);
    expect(fichier).not.toMatch(/https?:\/\//);
    for (const slot of slotsLogique()) {
      const a = slot.instantiate(0)!;
      for (const v of [1, 7, 42]) expect(slot.instantiate(v), slot.slotId).toEqual(a);
      expect(a.ref.origin).toBe("curated");
    }
  });
});

describe("Logique V1 — ce qui est servi et ce qui attend", () => {
  it("la catégorie garde son comportement : banque curée, sans source exigée", () => {
    const logique = categoryById("logic")!;
    expect(logique.generationMode).toBe("curated");
    expect(logique.requiresSource).toBe(false);
    expect(logique.active).toBe(true);
    expect(LOGIC_BANK.every((q) => q.sources.length === 0)).toBe(true);
  });

  it("les 30 cartes portent une explication complète en français ET en arabe", () => {
    // L'explication fait partie de l'apprentissage en logique (`showsExplanation`) :
    // une carte ne peut pas en être privée.
    expect(categoryById("logic")?.showsExplanation).toBe(true);
    for (const q of LOGIC_BANK) {
      expect(q.explanation.fr.trim(), q.id).not.toBe("");
      expect(arabic.test(q.explanation.ar), q.id).toBe(true);
    }
  });

  it("LOG-003 reste RETENUE : son explication ne décrit pas sa carte, et le texte fourni n'est pas retouché", () => {
    const q = LOGIC_BANK.find((x) => x.id === "LOG-003")!;
    expect(q.status).toBe("draft");
    expect(q.prompt.fr).toContain("Lina est plus grande qu’Adam");
    expect(q.explanation.fr).toContain("boîte");
    expect(q.reviewNotes).toContain("ne décrit pas cette carte");
    expect(playabilityIssues(q, categoryById("logic"))).toContain("statut draft ≠ validated");
    expect(isPlayable(q, categoryById("logic"))).toBe(false);
  });

  it("les vingt-neuf autres cartes sont validées, bilingues et réellement jouables", () => {
    const publiees = LOGIC_BANK.filter((q) => !RETENUES.includes(q.id));
    expect(publiees).toHaveLength(29);
    for (const q of publiees) {
      expect(q.status, q.id).toBe("validated");
      expect(q.reviewNotes, q.id).toBeUndefined();
      expect(playabilityIssues(q, categoryById("logic")), q.id).toEqual([]);
    }
    expect(slotsLogique("child")).toHaveLength(29);
    expect(slotsLogique("adult")).toHaveLength(29);
    expect(contentRegistry().availableCategories("child")).toContain("logic");
    const q = contentRegistry().resolve({ categoryId: "logic", difficulty: 2, profileType: "child", variation: 0 })!;
    expect(q.ref.origin).toBe("curated");
    expect(q.review).toEqual({ ar: "provisional" });
  });

  it("le vivier jouable couvre les cinq difficultés et les dix notions : aucune notion sans carte jouable", () => {
    expect(new Set(slotsLogique().map((s) => s.difficulty))).toEqual(new Set([1, 2, 3, 4, 5]));
    const toutes = new Set(LOGIC_BANK.map((q) => q.knowledgeNodeId));
    const servies = new Set(slotsLogique().map((s) => s.knowledgeNodeId));
    expect([...servies].sort()).toEqual([...toutes].sort());
    // La seule carte retenue ne vide pas sa notion : `comparaison` garde LOG-016 et LOG-020.
    expect(slotsLogique().filter((s) => s.knowledgeNodeId === "logique.comparaison")).toHaveLength(2);
  });
});

describe("Logique V1 — âge, progression et anti-répétition", () => {
  it("l'âge donne le niveau de DÉPART : un enfant de 6 ans démarre plus bas qu'un adolescent de 14 ans", () => {
    const slots = slotsLogique();
    const petit = learnerContextFor({ id: pid("p1"), profileType: "child", age: 6 });
    const grand = learnerContextFor({ id: pid("p2"), profileType: "child", age: 14 });
    const qPetit = selectQuestion({ memory: emptyMemory(petit.playerId), learner: petit, slots, config: LEARNING_CONFIG, now: T0 })!.question;
    const qGrand = selectQuestion({ memory: emptyMemory(grand.playerId), learner: grand, slots, config: LEARNING_CONFIG, now: T0 })!.question;
    expect(qPetit.difficulty).toBeLessThanOrEqual(2);
    expect(qGrand.difficulty).toBeGreaterThan(qPetit.difficulty);
  });

  it("l'âge n'est jamais un plafond : un enfant de 6 ans qui réussit dépasse sa bande de départ", () => {
    const slots = slotsLogique();
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
    const progres = memory.categories["logic"]!;
    expect(progres.estimatedLevel).toBeGreaterThan(progres.seedLevel);
  });

  it("anti-répétition : dans une même partie, aucune carte n'est reposée tant qu'il en reste d'autres", () => {
    const slots = slotsLogique();
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

  it("le Learning Engine ignore tout de Logique : aucune règle de progression propre à la catégorie", () => {
    const moteur = readdirSync("src/core/learning")
      .filter((f) => f.endsWith(".ts"))
      .map((f) => readFileSync(`src/core/learning/${f}`, "utf8"))
      .join("\n");
    expect(moteur).not.toMatch(/logique|LOG-/i);
  });
});

describe("Logique V1 — non-régression des autres catégories", () => {
  it("Religion, Mathématiques, Géographie et Gestion gardent exactement leur comportement", () => {
    const registry = contentRegistry();
    expect(registry.slots("child").filter((s) => s.categoryId === "religion")).toHaveLength(375);
    expect(registry.slots("child").filter((s) => s.categoryId === "maths")).toHaveLength(30);
    expect(registry.slots("child").filter((s) => s.categoryId === "management")).toHaveLength(30);
    expect(registry.slots("child").filter((s) => s.categoryId === "geography")).toHaveLength(0);
    expect(CURATED_BANK.filter((q) => q.categoryId === "geography" && q.status === "draft")).toHaveLength(30);
    expect(CURATED_BANK.filter((q) => q.categoryId === "management" && q.status === "validated")).toHaveLength(30);
    for (const id of ["history", "arabic", "culture"]) {
      expect(registry.slots("child").filter((s) => s.categoryId === id), id).toHaveLength(0);
    }
  });

  it("la progression de Logique est propre à Logique : la mémoire des autres catégories n'est pas touchée", () => {
    const learner = learnerContextFor({ id: pid("p1"), profileType: "child", age: 10 });
    let memory = emptyMemory(learner.playerId);
    const slots = slotsLogique();
    for (let i = 0; i < 10; i += 1) {
      const q = selectQuestion({ memory, learner, slots, config: LEARNING_CONFIG, now: addDays(T0, i) })!.question;
      memory = answerSelected(memory, learner, q, addDays(T0, i), i);
    }
    expect(Object.keys(memory.categories)).toEqual(["logic"]);
  });
});
