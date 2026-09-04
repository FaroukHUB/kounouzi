import { describe, expect, it } from "vitest";
import { CATEGORIES, CURATED_BANK, GEO_FACTS, categoryById, contentRegistry, difficultyBandFor } from "@/config/content";
import { createContentRegistry, createCuratedProvider, createFactualProvider, playabilityIssues, type CuratedQuestion } from "@/core/content";

const validReligious: CuratedQuestion = {
  id: "rel-test-1",
  version: 1,
  categoryId: "religion",
  knowledgeNodeId: "test.node",
  difficulty: 2,
  audienceScope: "all",
  status: "validated",
  prompt: { fr: "Énoncé de test", ar: "سؤال اختبار" },
  answer: { fr: "Réponse de test", ar: "جواب اختبار" },
  explanation: { fr: "Explication de test.", ar: "شرح اختبار." },
  sources: [{ title: "Source de test (fixture)", url: "https://example.org/fixture" }],
};

describe("garde-fous de la banque curée", () => {
  it("refuse une question non validée, sans explication AR, ou sans source quand la catégorie l'exige", () => {
    const religion = categoryById("religion");
    expect(playabilityIssues(validReligious, religion)).toEqual([]);
    expect(playabilityIssues({ ...validReligious, status: "to_verify" }, religion)).toContain("statut to_verify ≠ validated");
    expect(playabilityIssues({ ...validReligious, explanation: { fr: "x", ar: " " } }, religion)).toContain("explication AR manquante");
    expect(playabilityIssues({ ...validReligious, sources: [] }, religion)).toContain("source obligatoire absente");
    expect(playabilityIssues({ ...validReligious, sources: [{ title: "x", url: "pas-une-url" }] }, religion)).toContain("URL de source invalide : pas-une-url");
    expect(playabilityIssues(validReligious, undefined)).toContain("catégorie inconnue : religion");
  });

  it("aucune carte religieuse validée : la catégorie ne fournit rien plutôt qu'un contenu inventé (les 100 cartes importées restent `draft`)", () => {
    expect(CURATED_BANK.filter((q) => q.categoryId === "religion" && q.status === "validated")).toHaveLength(0);
    const registry = contentRegistry();
    expect(registry.availableCategories("child")).not.toContain("religion");
    expect(registry.resolve({ categoryId: "religion", difficulty: 2, profileType: "child", variation: 0 })).toBeNull();
  });

  it("une question curée valide devient jouable, une invalide n'est jamais servie", () => {
    const provider = createCuratedProvider([validReligious, { ...validReligious, id: "rel-bad", status: "draft" }], CATEGORIES);
    const registry = createContentRegistry(CATEGORIES, [provider]);
    expect(registry.availableCategories("adult")).toEqual(["religion"]);
    for (let v = 0; v < 10; v += 1) {
      const q = registry.resolve({ categoryId: "religion", difficulty: 2, profileType: "adult", variation: v });
      expect(q?.ref).toEqual({ origin: "curated", questionId: "rel-test-1", contentVersion: 1 });
      expect(q?.sources[0]?.title).toBe("Source de test (fixture)");
    }
  });

  it("respecte la frontière d'audience", () => {
    const adultOnly = { ...validReligious, id: "rel-adult", audienceScope: "adult" as const };
    const registry = createContentRegistry(CATEGORIES, [createCuratedProvider([adultOnly], CATEGORIES)]);
    expect(registry.resolve({ categoryId: "religion", difficulty: 2, profileType: "child", variation: 0 })).toBeNull();
    expect(registry.resolve({ categoryId: "religion", difficulty: 2, profileType: "adult", variation: 0 })?.ref).toEqual({ origin: "curated", questionId: "rel-adult", contentVersion: 1 });
  });
});

describe("catalogue géographique et gabarits", () => {
  it("chaque fait produit des questions bilingues avec explication FR + AR et source", () => {
    const provider = createFactualProvider(GEO_FACTS, { allowUnverified: true });
    for (let v = 0; v < GEO_FACTS.length * 3; v += 1) {
      const q = provider.resolve({ categoryId: "geography", difficulty: 3, profileType: "child", variation: v });
      expect(q).not.toBeNull();
      expect(q!.explanation.fr).toMatch(/\./);
      expect(/[؀-ۿ]/.test(q!.explanation.ar)).toBe(true);
      expect(q!.sources.length).toBeGreaterThan(0);
      expect(q!.ref.origin).toBe("factual");
    }
  });

  it("la difficulté demandée filtre les faits et la variation parcourt le catalogue sans hasard", () => {
    const provider = createFactualProvider(GEO_FACTS, { allowUnverified: true });
    const easy = provider.resolve({ categoryId: "geography", difficulty: 1, profileType: "child", variation: 0 });
    expect(easy!.difficulty).toBeLessThanOrEqual(2);
    const a = provider.resolve({ categoryId: "geography", difficulty: 2, profileType: "adult", variation: 5 });
    expect(a).toEqual(provider.resolve({ categoryId: "geography", difficulty: 2, profileType: "adult", variation: 5 }));
    expect(a).not.toEqual(provider.resolve({ categoryId: "geography", difficulty: 2, profileType: "adult", variation: 6 }));
  });

  it("le registre de l'application propose mathématiques et géographie, rien de curé pour l'instant", () => {
    expect(contentRegistry().availableCategories("child")).toEqual(["maths", "geography"]);
    expect(contentRegistry().availableCategories("adult")).toEqual(["maths", "geography"]);
  });
});

describe("bandes de difficulté provisoires", () => {
  it("dérivent de la classe ou du niveau initial, avec un repli sûr", () => {
    expect(difficultyBandFor({ profileType: "child", schoolGrade: "CP" })).toEqual({ min: 1, max: 2 });
    expect(difficultyBandFor({ profileType: "adult", initialLevel: "advanced" })).toEqual({ min: 4, max: 5 });
    expect(difficultyBandFor({ profileType: "adult" })).toEqual({ min: 3, max: 5 });
    expect(difficultyBandFor({ profileType: "child", schoolGrade: "inconnue" })).toEqual({ min: 2, max: 4 });
  });
});
