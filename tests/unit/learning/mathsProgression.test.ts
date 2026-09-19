import { describe, expect, it } from "vitest";
import { CATEGORIES, contentRegistry, difficultyBandFor } from "@/config/content";
import { LEARNING_CONFIG, learnerContextFor, seedLevelFor } from "@/config/learning";
import { createAlgorithmicProvider, createContentRegistry, MATHS_CATEGORY_ID, MATHS_MODELS, type QuestionInstance } from "@/core/content";
import { applyAttempt, attemptId, categoryProgressOf, emptyMemory, selectQuestion, type Attempt, type LearnerContext, type PlayerLearningMemory } from "@/core/learning";
import type { AnswerOutcome, GameId } from "@/core/shared";
import { pid } from "../../fixtures/game/setup.fixture";
import { T0 } from "../../fixtures/learning/resolve.fixture";

const game = "game-maths" as GameId;
/** Registre réduit aux mathématiques : on observe la progression de CETTE catégorie, sans variété inter-catégories. */
const mathsOnly = () => createContentRegistry(CATEGORIES, [createAlgorithmicProvider()]);

function record(memory: PlayerLearningMemory, learner: LearnerContext, q: QuestionInstance, outcome: AnswerOutcome, n: number): PlayerLearningMemory {
  const a: Attempt = {
    id: attemptId(game, `q${n}`),
    playerId: learner.playerId,
    gameId: game,
    knowledgeNodeId: q.knowledgeNodeId,
    ref: q.ref,
    categoryId: q.categoryId,
    difficulty: q.difficulty,
    outcome,
    validationMode: "collective",
    explanationKnown: "none",
    rewardGranted: outcome !== "incorrect",
    answeredAt: T0,
  };
  return applyAttempt(memory, a, learner, LEARNING_CONFIG);
}

/** Joue `rounds` questions de maths avec un résultat imposé, et rend la mémoire finale. */
function play(learner: LearnerContext, outcome: AnswerOutcome, rounds: number): PlayerLearningMemory {
  const slots = mathsOnly().slots(learner.profileType);
  let memory = emptyMemory(learner.playerId);
  for (let i = 0; i < rounds; i += 1) {
    const pick = selectQuestion({ memory, learner, slots, config: LEARNING_CONFIG, now: T0 })!;
    memory = record(memory, learner, pick.question, outcome, i);
  }
  return memory;
}

const niveauMaths = (memory: PlayerLearningMemory, learner: LearnerContext) => categoryProgressOf(memory, MATHS_CATEGORY_ID, learner, LEARNING_CONFIG).estimatedLevel;

describe("l'âge donne le niveau de DÉPART en mathématiques, jamais un plafond", () => {
  it("chaque tranche d'âge amorce dans la bande décidée, et l'amorçage est un milieu de bande", () => {
    const bande = (age: number) => difficultyBandFor({ profileType: "child", age });
    expect(bande(5)).toEqual({ min: 1, max: 2 });
    expect(bande(6)).toEqual({ min: 1, max: 2 });
    expect(bande(8)).toEqual({ min: 1, max: 3 });
    expect(bande(10)).toEqual({ min: 2, max: 3 });
    expect(bande(12)).toEqual({ min: 2, max: 4 });
    expect(bande(14)).toEqual({ min: 3, max: 5 });
    expect(seedLevelFor({ profileType: "child", age: 6 })).toBe(1.5);
    expect(seedLevelFor({ profileType: "child", age: 14 })).toBe(4);
  });

  it("un enfant de 6 ans commence par des situations faciles : la première question servie reste dans le bas de l'échelle", () => {
    const petit = learnerContextFor({ id: pid("maryam"), profileType: "child", age: 6 });
    const slots = mathsOnly().slots("child");
    const first = selectQuestion({ memory: emptyMemory(petit.playerId), learner: petit, slots, config: LEARNING_CONFIG, now: T0 })!;
    expect(first.question.categoryId).toBe(MATHS_CATEGORY_ID);
    expect(first.question.difficulty).toBeLessThanOrEqual(2);
    // Un adolescent, à mémoire vide, part plus haut sur la même banque.
    const grand = learnerContextFor({ id: pid("yacine"), profileType: "child", age: 14 });
    const firstGrand = selectQuestion({ memory: emptyMemory(grand.playerId), learner: grand, slots, config: LEARNING_CONFIG, now: T0 })!;
    expect(firstGrand.question.difficulty).toBeGreaterThan(first.question.difficulty);
  });

  it("un enfant qui réussit dépasse son niveau initial : aucune barrière d'âge ne l'arrête", () => {
    const petit = learnerContextFor({ id: pid("maryam"), profileType: "child", age: 6 });
    const depart = niveauMaths(emptyMemory(petit.playerId), petit);
    expect(depart).toBe(1.5);
    const apres = play(petit, "correct", 24);
    const monte = niveauMaths(apres, petit);
    expect(monte, "le niveau doit monter après une série de réussites").toBeGreaterThan(depart);
    // Il accède ensuite à des situations que sa seule tranche d'âge n'aurait jamais servies.
    const slots = mathsOnly().slots("child");
    const suite = selectQuestion({ memory: apres, learner: petit, slots, config: LEARNING_CONFIG, now: T0 })!;
    expect(suite.question.difficulty).toBeGreaterThan(depart);
    // La banque contient bien des modèles au-dessus de sa bande d'amorçage.
    expect(MATHS_MODELS.some((m) => m.difficulty > 2)).toBe(true);
  });

  it("un enfant en difficulté répétée redescend, sans jamais passer sous le plancher", () => {
    const grand = learnerContextFor({ id: pid("yacine"), profileType: "child", age: 12 });
    const depart = niveauMaths(emptyMemory(grand.playerId), grand);
    const apres = play(grand, "incorrect", 24);
    const descendu = niveauMaths(apres, grand);
    expect(descendu, "le niveau doit baisser après une série d'échecs").toBeLessThan(depart);
    expect(descendu).toBeGreaterThanOrEqual(LEARNING_CONFIG.level.min);
  });

  it("la progression est propre aux mathématiques : une autre catégorie garde son amorçage", () => {
    const enfant = learnerContextFor({ id: pid("maryam"), profileType: "child", age: 8 });
    const apres = play(enfant, "correct", 24);
    expect(niveauMaths(apres, enfant)).toBeGreaterThan(enfant.seedLevel);
    expect(categoryProgressOf(apres, "religion", enfant, LEARNING_CONFIG).estimatedLevel).toBe(enfant.seedLevel);
    expect(Object.keys(apres.categories)).toEqual([MATHS_CATEGORY_ID]);
  });
});

describe("les adultes gardent leur profil, l'âge n'entre jamais en jeu", () => {
  it("les trois profils amorcent à trois niveaux distincts et croissants", () => {
    expect(difficultyBandFor({ profileType: "adult", initialLevel: "discovery" })).toEqual({ min: 2, max: 4 });
    expect(difficultyBandFor({ profileType: "adult", initialLevel: "standard" })).toEqual({ min: 3, max: 5 });
    expect(difficultyBandFor({ profileType: "adult", initialLevel: "advanced" })).toEqual({ min: 4, max: 5 });
    const seeds = (["discovery", "standard", "advanced"] as const).map((initialLevel) => seedLevelFor({ profileType: "adult", initialLevel }));
    expect(seeds).toEqual([3, 4, 4.5]);
    expect(seeds[0]!).toBeLessThan(seeds[1]!);
    expect(seeds[1]!).toBeLessThan(seeds[2]!);
  });

  it("un âge fourni à un adulte ne change rien : seul le profil compte", () => {
    const sansAge = seedLevelFor({ profileType: "adult", initialLevel: "standard" });
    const avecAge = seedLevelFor({ profileType: "adult", initialLevel: "standard", age: 7 });
    expect(avecAge).toBe(sansAge);
    expect(seedLevelFor({ profileType: "adult" })).toBe(sansAge);
  });

  it("un adulte découverte reçoit d'abord des situations plus simples qu'un adulte avancé, puis progresse comme les autres", () => {
    const slots = mathsOnly().slots("adult");
    const decouverte = learnerContextFor({ id: pid("maman"), profileType: "adult", initialLevel: "discovery" });
    const avance = learnerContextFor({ id: pid("papa"), profileType: "adult", initialLevel: "advanced" });
    const q1 = selectQuestion({ memory: emptyMemory(decouverte.playerId), learner: decouverte, slots, config: LEARNING_CONFIG, now: T0 })!;
    const q2 = selectQuestion({ memory: emptyMemory(avance.playerId), learner: avance, slots, config: LEARNING_CONFIG, now: T0 })!;
    expect(q1.question.difficulty).toBeLessThan(q2.question.difficulty);
    const apres = play(decouverte, "correct", 24);
    expect(niveauMaths(apres, decouverte)).toBeGreaterThan(decouverte.seedLevel);
  });
});

describe("compatibilité avec le Learning Engine existant", () => {
  it("les modèles se servent par le registre applicatif comme n'importe quel contenu, et se rejouent à l'identique", () => {
    const registry = contentRegistry();
    expect(registry.availableCategories("child")).toContain(MATHS_CATEGORY_ID);
    const q = registry.resolve({ categoryId: MATHS_CATEGORY_ID, difficulty: 3, profileType: "child", variation: 5 })!;
    expect(q).not.toBeNull();
    expect(q.categoryId).toBe(MATHS_CATEGORY_ID);
    expect(registry.resolve({ categoryId: MATHS_CATEGORY_ID, difficulty: 3, profileType: "child", variation: 5 })).toEqual(q);
    expect(registry.slots("child").filter((s) => s.categoryId === MATHS_CATEGORY_ID)).toHaveLength(30);
  });

  it("l'anti-répétition fonctionne : sur une série, la même formulation ne revient pas tout de suite", () => {
    const enfant = learnerContextFor({ id: pid("maryam"), profileType: "child", age: 10 });
    const slots = mathsOnly().slots("child");
    let memory = emptyMemory(enfant.playerId);
    const vus: string[] = [];
    for (let i = 0; i < 10; i += 1) {
      const pick = selectQuestion({ memory, learner: enfant, slots, config: LEARNING_CONFIG, now: T0, gameId: game })!;
      vus.push(pick.question.prompt.fr);
      memory = record(memory, enfant, pick.question, "correct", i);
    }
    expect(new Set(vus).size).toBe(vus.length);
  });

  it("une révision due reste prioritaire : le mécanisme pédagogique existant n'est pas court-circuité", () => {
    const enfant = learnerContextFor({ id: pid("maryam"), profileType: "child", age: 10 });
    const slots = mathsOnly().slots("child");
    const premier = selectQuestion({ memory: emptyMemory(enfant.playerId), learner: enfant, slots, config: LEARNING_CONFIG, now: T0 })!;
    const memory = record(emptyMemory(enfant.playerId), enfant, premier.question, "incorrect", 0);
    const plusTard = selectQuestion({ memory, learner: enfant, slots, config: LEARNING_CONFIG, now: "2026-03-05T10:00:00.000Z" })!;
    expect(plusTard.question.knowledgeNodeId).toBe(premier.question.knowledgeNodeId);
    expect(plusTard.reasons).toContain("révision due");
  });
});

describe("non-régression : les autres catégories ne bougent pas", () => {
  it("Religion garde ses 375 cartes validées, sa source obligatoire et son explication affichée", () => {
    const religion = CATEGORIES.find((c) => c.id === "religion")!;
    expect(religion.generationMode).toBe("curated");
    expect(religion.requiresSource).toBe(true);
    expect(religion.showsExplanation).toBe(true);
    expect(contentRegistry().slots("child").filter((s) => s.categoryId === "religion")).toHaveLength(375);
  });

  it("le catalogue de catégories est inchangé ; Religion, Mathématiques et Gestion sont servies, rien d'autre", () => {
    expect(CATEGORIES.map((c) => c.id)).toEqual(["religion", "maths", "geography", "history", "arabic", "logic", "management", "culture"]);
    expect(contentRegistry().availableCategories("child")).toEqual(["religion", MATHS_CATEGORY_ID, "management"]);
    expect(contentRegistry().availableCategories("adult")).toEqual(["religion", MATHS_CATEGORY_ID, "management"]);
    // La géographie reste en attente de ses sources, les autres catégories curées n'ont rien de validé.
    for (const id of ["geography", "history", "arabic", "logic", "culture"]) {
      expect(contentRegistry().slots("child").filter((s) => s.categoryId === id), id).toHaveLength(0);
    }
    // Les mathématiques ne perdent ni ne gagnent de créneau en accueillant une nouvelle catégorie.
    expect(contentRegistry().slots("child").filter((s) => s.categoryId === MATHS_CATEGORY_ID)).toHaveLength(30);
  });

  it("le contenu des mathématiques ne porte jamais de source : c'est du calcul, pas un fait à référencer", () => {
    for (const s of contentRegistry().slots("child").filter((x) => x.categoryId === MATHS_CATEGORY_ID)) {
      expect(s.instantiate(0)!.sources).toEqual([]);
    }
  });
});
