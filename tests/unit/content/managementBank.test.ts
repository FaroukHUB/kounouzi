import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { CATEGORIES, CURATED_BANK, MANAGEMENT_BANK, categoryById, contentRegistry, difficultyBandFor } from "@/config/content";
import { LEARNING_CONFIG, learnerContextFor } from "@/config/learning";
import { isPlayable, playabilityIssues, questionRefKey, type QuestionInstance } from "@/core/content";
import { addDays, applyAttempt, attemptId, emptyMemory, selectQuestion, type LearnerContext, type PlayerLearningMemory } from "@/core/learning";
import { pid } from "../../fixtures/game/setup.fixture";
import { T0 } from "../../fixtures/learning/resolve.fixture";

const arabic = /[؀-ۿ]/;
const ids = MANAGEMENT_BANK.map((q) => q.id);
const partie = "game-gest";
/** Tranches déclarées par l'auteur et âge représentatif de chacune (confrontation aux bandes de `bands.v1.json`). */
const TRANCHES: ReadonlyArray<readonly [string, number]> = [
  ["5-6", 6],
  ["7-8", 8],
  ["9-10", 10],
  ["11-12", 12],
  ["13+", 14],
];
const slotsGestion = (profil: "child" | "adult" = "child") => contentRegistry().slots(profil).filter((s) => s.categoryId === "management");

function answerSelected(memory: PlayerLearningMemory, learner: LearnerContext, q: QuestionInstance, at: string, n: number): PlayerLearningMemory {
  return applyAttempt(
    memory,
    { id: attemptId(partie as never, `q${n}`), playerId: learner.playerId, gameId: partie as never, knowledgeNodeId: q.knowledgeNodeId, ref: q.ref, categoryId: q.categoryId, difficulty: q.difficulty, outcome: "correct", validationMode: "collective", explanationKnown: "none", rewardGranted: true, answeredAt: at },
    learner,
    LEARNING_CONFIG,
  );
}

describe("Gestion V1 — banque curée de 30 cartes statiques", () => {
  it("exactement 30 cartes, identifiants uniques GEST-001…GEST-030, catégorie persistée « management »", () => {
    expect(MANAGEMENT_BANK).toHaveLength(30);
    expect(new Set(ids).size).toBe(30);
    expect(ids).toEqual(Array.from({ length: 30 }, (_, i) => `GEST-${String(i + 1).padStart(3, "0")}`));
    // L'identifiant de catégorie est celui déjà persisté dans les mémoires : aucun renommage.
    expect(MANAGEMENT_BANK.every((q) => q.categoryId === "management" && q.version === 1 && q.audienceScope === "all")).toBe(true);
    expect(CATEGORIES.map((c) => c.id)).toContain("management");
  });

  it("six cartes par tranche d'âge, et la difficulté de chaque carte tient dans la bande d'amorçage de sa tranche", () => {
    for (const [tranche, age] of TRANCHES) {
      const cartes = MANAGEMENT_BANK.filter((q) => q.ageBand === tranche);
      expect(cartes, tranche).toHaveLength(6);
      const bande = difficultyBandFor({ profileType: "child", age });
      for (const q of cartes) {
        expect(q.difficulty, `${q.id} (${tranche})`).toBeGreaterThanOrEqual(bande.min);
        expect(q.difficulty, `${q.id} (${tranche})`).toBeLessThanOrEqual(bande.max);
      }
    }
    expect(MANAGEMENT_BANK.filter((q) => TRANCHES.some(([t]) => t === q.ageBand))).toHaveLength(30);
    expect(MANAGEMENT_BANK.every((q) => q.difficulty >= 1 && q.difficulty <= 5)).toBe(true);
    expect(new Set(MANAGEMENT_BANK.map((q) => q.difficulty))).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  it("énoncé, réponse et explication présents en français ET en arabe sur les 30 cartes", () => {
    for (const q of MANAGEMENT_BANK) {
      expect(q.prompt.fr.trim(), q.id).not.toBe("");
      expect(q.answer.fr.trim(), q.id).not.toBe("");
      expect(q.explanation.fr.trim(), q.id).not.toBe("");
      expect(arabic.test(q.prompt.ar ?? ""), q.id).toBe(true);
      expect(arabic.test(q.answer.ar ?? ""), q.id).toBe(true);
      expect(arabic.test(q.explanation.ar), q.id).toBe(true);
    }
  });

  it("l'arabe est déclaré PROVISOIRE sur les 30 cartes, en attente de relecture humaine", () => {
    expect(MANAGEMENT_BANK.every((q) => q.arReview === "provisional")).toBe(true);
  });

  it("les notions sont regroupées : 10 notions stables pour 30 cartes, aucune créée artificiellement", () => {
    const nodes = new Set(MANAGEMENT_BANK.map((q) => q.knowledgeNodeId));
    expect(nodes.size).toBe(10);
    expect(nodes.size).toBeLessThan(MANAGEMENT_BANK.length);
    // Convention du dépôt : identifiants en français, minuscules, segments séparés par un point.
    for (const n of nodes) expect(n, n).toMatch(/^gestion\.[a-z-]+$/);
  });

  it("aucune notion ne repose sur une carte unique : une révision ne peut pas reposer la même carte", () => {
    const cartesParNotion = new Map<string, string[]>();
    for (const q of MANAGEMENT_BANK) cartesParNotion.set(q.knowledgeNodeId, [...(cartesParNotion.get(q.knowledgeNodeId) ?? []), q.id]);
    const seules = [...cartesParNotion].filter(([, cartes]) => cartes.length < 2).map(([n]) => n);
    expect(seules).toEqual([]);
    // Une même notion est travaillée à plusieurs difficultés (comme `gestion.cout-opportunite` en d3 puis d5).
    const parNotion = new Map<string, Set<number>>();
    for (const q of MANAGEMENT_BANK) parNotion.set(q.knowledgeNodeId, (parNotion.get(q.knowledgeNodeId) ?? new Set()).add(q.difficulty));
    expect([...parNotion.values()].some((d) => d.size > 1)).toBe(true);
  });
});

describe("Gestion V1 — régime documentaire et jouabilité", () => {
  it("la catégorie garde son comportement : banque curée, sans source exigée, explication affichée", () => {
    const gestion = categoryById("management")!;
    expect(gestion.generationMode).toBe("curated");
    expect(gestion.requiresSource).toBe(false);
    expect(gestion.showsExplanation).toBe(true);
    expect(gestion.active).toBe(true);
  });

  it("aucune source n'est inventée : le tableau de sources reste vide et le fichier ne contient aucune URL", () => {
    expect(MANAGEMENT_BANK.every((q) => q.sources.length === 0)).toBe(true);
    expect(readFileSync("src/content/questions/management/gestion.v1.json", "utf8")).not.toMatch(/https?:\/\//);
  });

  it("aucun générateur : les 30 cartes sont statiques, servies telles quelles, jamais tirées au hasard", () => {
    const fichier = readFileSync("src/content/questions/management/gestion.v1.json", "utf8");
    expect(fichier).not.toMatch(/Math\.random|generatorId|generatorVersion/);
    for (const slot of slotsGestion()) {
      const a = slot.instantiate(0)!;
      // La variation est un compteur ; une carte curée ne s'en sert pas et rend toujours la même formulation.
      for (const v of [1, 7, 42]) expect(slot.instantiate(v), slot.slotId).toEqual(a);
      expect(a.ref.origin).toBe("curated");
    }
  });

  it("les 30 cartes franchissent la garde et sont réellement jouables, pour l'enfant comme pour l'adulte", () => {
    const gestion = categoryById("management");
    for (const q of MANAGEMENT_BANK) {
      expect(playabilityIssues(q, gestion), q.id).toEqual([]);
      expect(isPlayable(q, gestion), q.id).toBe(true);
    }
    expect(slotsGestion("child")).toHaveLength(30);
    expect(slotsGestion("adult")).toHaveLength(30);
    expect(contentRegistry().availableCategories("child")).toContain("management");
    const q = contentRegistry().resolve({ categoryId: "management", difficulty: 2, profileType: "child", variation: 0 })!;
    expect(q.ref.origin).toBe("curated");
    expect(q.review).toEqual({ ar: "provisional" });
  });
});

describe("Gestion V1 — âge, progression et anti-répétition", () => {
  it("l'âge donne le niveau de DÉPART : un enfant de 6 ans démarre plus bas qu'un adolescent de 14 ans", () => {
    const slots = slotsGestion();
    const petit = learnerContextFor({ id: pid("p1"), profileType: "child", age: 6 });
    const grand = learnerContextFor({ id: pid("p2"), profileType: "child", age: 14 });
    const qPetit = selectQuestion({ memory: emptyMemory(petit.playerId), learner: petit, slots, config: LEARNING_CONFIG, now: T0 })!.question;
    const qGrand = selectQuestion({ memory: emptyMemory(grand.playerId), learner: grand, slots, config: LEARNING_CONFIG, now: T0 })!.question;
    expect(qPetit.difficulty).toBeLessThanOrEqual(2);
    expect(qGrand.difficulty).toBeGreaterThan(qPetit.difficulty);
  });

  it("l'âge n'est jamais un plafond : un enfant de 6 ans qui réussit dépasse sa bande de départ", () => {
    const slots = slotsGestion();
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
    const progres = memory.categories["management"]!;
    expect(progres.estimatedLevel).toBeGreaterThan(progres.seedLevel);
  });

  it("le niveau peut aussi redescendre : l'échec répété ramène le joueur plus bas, sans passer sous le minimum", () => {
    const slots = slotsGestion();
    const learner = learnerContextFor({ id: pid("p2"), profileType: "child", age: 12 });
    let memory = emptyMemory(learner.playerId);
    for (let i = 0; i < 30; i += 1) {
      const now = addDays(T0, i);
      const q = selectQuestion({ memory, learner, slots, config: LEARNING_CONFIG, now })!.question;
      memory = applyAttempt(
        memory,
        { id: attemptId(partie as never, `f${i}`), playerId: learner.playerId, gameId: partie as never, knowledgeNodeId: q.knowledgeNodeId, ref: q.ref, categoryId: q.categoryId, difficulty: q.difficulty, outcome: "incorrect", validationMode: "collective", explanationKnown: "none", rewardGranted: false, answeredAt: now },
        learner,
        LEARNING_CONFIG,
      );
    }
    const progres = memory.categories["management"]!;
    expect(progres.estimatedLevel).toBeLessThan(progres.seedLevel);
    expect(progres.estimatedLevel).toBeGreaterThanOrEqual(LEARNING_CONFIG.level.min);
  });

  it("anti-répétition : dans une même partie, aucune carte n'est reposée tant qu'il en reste d'autres", () => {
    const slots = slotsGestion();
    const learner = learnerContextFor({ id: pid("p1"), profileType: "child", age: 10 });
    let memory = emptyMemory(learner.playerId);
    const vues: string[] = [];
    for (let i = 0; i < 15; i += 1) {
      const q = selectQuestion({ memory, learner, slots, config: LEARNING_CONFIG, now: T0, gameId: partie })!.question;
      vues.push(questionRefKey(q.ref));
      memory = answerSelected(memory, learner, q, T0, i);
    }
    expect(new Set(vues).size).toBe(vues.length);
  });

  it("un profil adulte reste piloté par son niveau initial, jamais par un âge", () => {
    const slots = slotsGestion("adult");
    const debutant = learnerContextFor({ id: pid("p1"), profileType: "adult", initialLevel: "discovery" });
    const confirme = learnerContextFor({ id: pid("p2"), profileType: "adult", initialLevel: "advanced" });
    const qd = selectQuestion({ memory: emptyMemory(debutant.playerId), learner: debutant, slots, config: LEARNING_CONFIG, now: T0 })!.question;
    const qc = selectQuestion({ memory: emptyMemory(confirme.playerId), learner: confirme, slots, config: LEARNING_CONFIG, now: T0 })!.question;
    expect(qd.difficulty).toBeLessThan(qc.difficulty);
  });
});

describe("Gestion V1 — non-régression des autres catégories", () => {
  it("Religion, Mathématiques et Géographie gardent exactement leur comportement", () => {
    const registry = contentRegistry();
    // Religion : 375 cartes validées, source obligatoire, explication affichée.
    expect(registry.slots("child").filter((s) => s.categoryId === "religion")).toHaveLength(375);
    expect(categoryById("religion")).toMatchObject({ requiresSource: true, showsExplanation: true, generationMode: "curated" });
    // Mathématiques : 30 créneaux algorithmiques, sans source.
    expect(registry.slots("child").filter((s) => s.categoryId === "maths")).toHaveLength(30);
    expect(categoryById("maths")).toMatchObject({ requiresSource: false, generationMode: "algorithmic" });
    // Géographie : toujours en attente de ses sources, donc toujours rien de servi.
    expect(categoryById("geography")).toMatchObject({ requiresSource: true, generationMode: "curated" });
    expect(registry.slots("child").filter((s) => s.categoryId === "geography")).toHaveLength(0);
    expect(CURATED_BANK.filter((q) => q.categoryId === "geography" && q.status === "draft")).toHaveLength(30);
    // Les catégories sans contenu validé ne servent toujours rien.
    for (const id of ["history", "arabic", "culture"]) {
      expect(registry.slots("child").filter((s) => s.categoryId === id), id).toHaveLength(0);
    }
  });

  it("le Learning Engine ignore tout de Gestion : aucune règle de progression propre à la catégorie", () => {
    // Le noyau d'apprentissage ne doit connaître ni cette catégorie ni ses notions :
    // Gestion passe par le MÊME chemin que les autres, sans cas particulier.
    const moteur = readdirSync("src/core/learning")
      .filter((f) => f.endsWith(".ts"))
      .map((f) => readFileSync(`src/core/learning/${f}`, "utf8"))
      .join("\n");
    expect(moteur).not.toMatch(/management|gestion|GEST-/i);
  });

  it("la progression de Gestion est propre à Gestion : la mémoire des autres catégories n'est pas touchée", () => {
    const learner = learnerContextFor({ id: pid("p1"), profileType: "child", age: 10 });
    let memory = emptyMemory(learner.playerId);
    const slots = slotsGestion();
    for (let i = 0; i < 10; i += 1) {
      const q = selectQuestion({ memory, learner, slots, config: LEARNING_CONFIG, now: addDays(T0, i) })!.question;
      memory = answerSelected(memory, learner, q, addDays(T0, i), i);
    }
    expect(Object.keys(memory.categories)).toEqual(["management"]);
    expect(memory.attempts.every((a) => a.categoryId === "management")).toBe(true);
  });
});
