import { describe, expect, it } from "vitest";
import { CATEGORIES, CURATED_BANK, OUSSOUL_BANK, RAMADAN_BANK, RELIGION_BANKS, contentRegistry } from "@/config/content";
import { createContentRegistry, createCuratedProvider, isPlayable, playabilityIssues } from "@/core/content";
import { KNOWN_ANIMATION_KEYS, animationFamily } from "@/ui/cards/animations/families";

const religion = CATEGORIES.find((c) => c.id === "religion")!;

describe("banque religieuse Oussoul ath-Thalatha (import, tout en brouillon)", () => {
  it("compte 100 cartes, 20 par niveau, identifiants uniques, toutes `draft`", () => {
    expect(OUSSOUL_BANK).toHaveLength(100);
    for (const level of [1, 2, 3, 4, 5]) expect(OUSSOUL_BANK.filter((q) => q.difficulty === level)).toHaveLength(20);
    expect(new Set(OUSSOUL_BANK.map((q) => q.id)).size).toBe(100);
    expect(OUSSOUL_BANK.every((q) => q.status === "draft")).toBe(true);
    expect(OUSSOUL_BANK.every((q) => q.categoryId === "religion" && q.audienceScope === "all")).toBe(true);
  });

  it("chaque carte a un énoncé et une réponse en français, une explication FR ET AR, une source avec ouvrage, auteur et pages, une clé d'animation", () => {
    for (const q of OUSSOUL_BANK) {
      expect(q.prompt.fr.length, q.id).toBeGreaterThan(3);
      expect(q.answer.fr.length, q.id).toBeGreaterThan(0);
      expect(q.explanation.fr.length, q.id).toBeGreaterThan(3);
      expect(/[؀-ۿ]/.test(q.explanation.ar), q.id).toBe(true);
      expect(q.sources[0], q.id).toMatchObject({ title: "Sharh Thalathat al-Usul", author: "Shaykh Salih Al ash-Shaykh" });
      expect(q.sources[0]!.pages, q.id).toMatch(/^\d/);
      expect(q.animationKey, q.id).toBeTruthy();
      expect(q.title, q.id).toBeTruthy();
    }
  });

  it("le livre reste derrière le rideau : aucun énoncé ne dit « dans le livre » ou « dans la source »", () => {
    for (const q of OUSSOUL_BANK) expect(q.prompt.fr, q.id).not.toMatch(/dans (le|ce) (livre|passage|texte)|dans la source|d'après le livre|selon le livre/i);
  });

  it("aucune carte `draft` n'est jouable : la religion ne fournit rien tant que rien n'est validé", () => {
    expect(OUSSOUL_BANK.every((q) => !isPlayable(q, religion))).toBe(true);
    expect(playabilityIssues(OUSSOUL_BANK[0]!, religion)).toEqual(["statut draft ≠ validated"]);
    expect(contentRegistry().availableCategories("child")).not.toContain("religion");
    expect(contentRegistry().slots("child").some((s) => s.categoryId === "religion")).toBe(false);
    expect(CURATED_BANK.filter((q) => q.categoryId === "religion")).toHaveLength(125);
  });

  it("une carte passée à `validated` par relecture devient jouable telle quelle, avec sa source et son habillage", () => {
    const validated = OUSSOUL_BANK.map((q) => ({ ...q, status: "validated" as const }));
    const registry = createContentRegistry(CATEGORIES, [createCuratedProvider(validated, CATEGORIES)]);
    const slots = registry.slots("child").filter((s) => s.categoryId === "religion");
    expect(slots).toHaveLength(100);
    const q = slots[0]!.instantiate(0)!;
    expect(q.ref).toEqual({ origin: "curated", questionId: "REL-OSS-SAS-L1-01", contentVersion: 1 });
    expect(q.title).toBe("Mission éclair");
    expect(q.animationKey).toBe("mission_flash");
    expect(q.sources[0]!.pages).toBe("31-32");
    expect(q.prompt.ar).toBeUndefined();
  });

  it("toutes les clés d'animation des banques sont connues de la couche de présentation", () => {
    const keys = new Set(RELIGION_BANKS.flatMap((b) => b.questions.map((q) => q.animationKey!)));
    for (const k of keys) expect(KNOWN_ANIMATION_KEYS, k).toContain(k);
    expect(animationFamily("boss_chest")).toBe("chest");
    expect(animationFamily("duel_vs")).toBe("versus");
    expect(animationFamily("inconnue")).toBe("spark");
    expect(animationFamily(undefined)).toBe("spark");
  });
});

describe("banque religieuse Wa Ja'a Shahr Ramadan (import, tout en brouillon)", () => {
  it("compte 25 cartes, 5 par niveau, toutes `draft`, sourcées avec ouvrage, auteur, éditeur et pages, bilingues", () => {
    expect(RAMADAN_BANK).toHaveLength(25);
    for (const level of [1, 2, 3, 4, 5]) expect(RAMADAN_BANK.filter((q) => q.difficulty === level)).toHaveLength(5);
    expect(new Set([...RAMADAN_BANK, ...OUSSOUL_BANK].map((q) => q.id)).size).toBe(125);
    for (const q of RAMADAN_BANK) {
      expect(q.status, q.id).toBe("draft");
      expect(q.knowledgeNodeId, q.id).toMatch(/^religion\.ramadan\.wajaa\.l\d\.\d\d$/);
      // Une seule carte a une explication arabe illisible à l'extraction : laissée vide et annotée, jamais approximée.
      if (q.reviewNotes) expect(q.explanation.ar, q.id).toBe("");
      else expect(/[؀-ۿ]/.test(q.explanation.ar), q.id).toBe(true);
      expect(q.sources[0], q.id).toMatchObject({ title: "Wa Ja'a Shahr Ramadan", author: "Shaykh Abd ar-Razzaq ibn Abd al-Muhsin al-Badr", publisher: "Dar al-Fadhila, 2014", file: "waja-a-shahr-ramadan.pdf" });
      expect(q.sources[0]!.pages, q.id).toMatch(/^\d/);
      expect(q.prompt.fr, q.id).not.toMatch(/dans (le|ce) (livre|passage|texte)|dans la source|d'après le livre|selon le livre/i);
      expect(isPlayable(q, religion), q.id).toBe(false);
    }
    expect(RAMADAN_BANK.filter((q) => q.reviewNotes).map((q) => q.id)).toEqual(["REL-RAM-ARB-L5-01"]);
    // Même validée par erreur, une carte sans explication arabe reste injouable.
    const forced = { ...RAMADAN_BANK.find((q) => q.id === "REL-RAM-ARB-L5-01")!, status: "validated" as const };
    expect(playabilityIssues(forced, religion)).toContain("explication AR manquante");
  });
});
