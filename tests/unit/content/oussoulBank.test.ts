import { describe, expect, it } from "vitest";
import { CATEGORIES, CURATED_BANK, DUROUS_BANK, OUSSOUL_BANK, QAWAID_BANK, RAMADAN_BANK, RELIGION_BANKS, SIRAH_BANK, contentRegistry } from "@/config/content";
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
    expect(CURATED_BANK.filter((q) => q.categoryId === "religion")).toHaveLength(350);
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

describe("banque religieuse Ad-Durous al-Muhimmah (import DOCX, tout en brouillon)", () => {
  const CURTAIN = /\b(le texte|l[’']explication|le commentaire|le livre|la source)\b/i;
  it("compte 100 cartes, 20 par niveau, identifiants uniques sur les trois banques, toutes `draft`, bilingues et sourcées avec pages", () => {
    expect(DUROUS_BANK).toHaveLength(100);
    for (const level of [1, 2, 3, 4, 5]) expect(DUROUS_BANK.filter((q) => q.difficulty === level)).toHaveLength(20);
    expect(new Set(RELIGION_BANKS.flatMap((b) => b.questions.map((q) => q.id))).size).toBe(350);
    for (const q of DUROUS_BANK) {
      expect(q.status, q.id).toBe("draft");
      expect(q.id, q.id).toMatch(/^REL-DRS-ARB-L\d-\d\d$/);
      expect(q.knowledgeNodeId, q.id).toMatch(/^religion\.bases\.durous\.l\d\.\d\d$/);
      expect(q.title, q.id).toBeTruthy();
      expect(q.prompt.fr.length, q.id).toBeGreaterThan(10);
      // Jamais une lettre seule en réponse : le texte du choix est repris tel quel.
      expect(q.answer.fr, q.id).not.toMatch(/^[A-D]\.?$/);
      expect(q.explanation.fr.length, q.id).toBeGreaterThan(5);
      expect(/[؀-ۿ]/.test(q.explanation.ar), q.id).toBe(true);
      expect(q.sources[0], q.id).toMatchObject({ title: "Sharḥ ad-Durūs al-Muhimmah li-ʿĀmmat al-Ummah", author: "Shaykh ʿAbd ar-Razzāq al-Badr" });
      expect(q.sources[0]!.pages, q.id).toMatch(/^\d/);
      expect(q.animationHint, q.id).toBeTruthy();
      expect(isPlayable(q, religion), q.id).toBe(false);
    }
  });
  it("les énoncés qui laissent voir le texte ou le commentaire sont annotés pour reformulation, jamais réécrits par le code", () => {
    const flagged = DUROUS_BANK.filter((q) => CURTAIN.test(q.prompt.fr)).map((q) => q.id);
    expect(flagged).toEqual(["REL-DRS-ARB-L3-14", "REL-DRS-ARB-L3-17", "REL-DRS-ARB-L4-02", "REL-DRS-ARB-L4-09", "REL-DRS-ARB-L4-19", "REL-DRS-ARB-L5-02"]);
    expect(DUROUS_BANK.filter((q) => q.reviewNotes).map((q) => q.id)).toEqual(flagged);
  });
});

describe("banque religieuse Sirah — al-Urjuzah al-Mi'iyyah (import PDF, tout en brouillon)", () => {
  it("compte 100 cartes, 20 par niveau, toutes `draft`, sourcées avec ouvrage, auteur, page et repère de vers ; arabe présent ou vide et annoté", () => {
    expect(SIRAH_BANK).toHaveLength(100);
    for (const level of [1, 2, 3, 4, 5]) expect(SIRAH_BANK.filter((q) => q.difficulty === level)).toHaveLength(20);
    for (const q of SIRAH_BANK) {
      expect(q.status, q.id).toBe("draft");
      expect(q.id, q.id).toMatch(/^REL-SIR-ARB-L\d-\d\d$/);
      expect(q.knowledgeNodeId, q.id).toMatch(/^religion\.sirah\.urjuzah\.l\d\.\d\d$/);
      expect(q.answer.fr, q.id).not.toMatch(/^[A-D]\.?$/);
      expect(q.explanation.fr, q.id).toMatch(/[.!?]$/);
      // Un arabe recollé se termine toujours par une ponctuation finale ; sinon il est laissé vide et annoté, jamais approximé.
      if (q.explanation.ar === "") expect(q.reviewNotes, q.id).toMatch(/arabe illisible/);
      else expect(q.explanation.ar, q.id).toMatch(/^[^A-Za-z]*[.؟!]$/);
      expect(q.sources[0], q.id).toMatchObject({ title: "Sharḥ al-Urjūzah al-Mi’iyyah fī Dhikr Ḥāl Ashraf al-Bariyyah", author: "Shaykh ʿAbd ar-Razzāq ibn ʿAbd al-Muḥsin al-Badr" });
      expect(q.sources[0]!.pages, q.id).toMatch(/^1[2-6]$/);
      expect(q.sources[0]!.locator, q.id).toMatch(/^Matn, vers \d/);
      expect(q.prompt.fr, q.id).not.toMatch(/dans (le|ce) (livre|passage|texte)|dans la source|d'après le livre|selon le livre/i);
      expect(isPlayable(q, religion), q.id).toBe(false);
    }
    expect(SIRAH_BANK.filter((q) => q.explanation.ar === "")).toHaveLength(23);
    // Deux chronologies dont l'extraction a déplacé les flèches sont annotées, jamais réordonnées par le code.
    expect(SIRAH_BANK.filter((q) => /→/.test(q.prompt.fr)).map((q) => q.id)).toEqual(["REL-SIR-ARB-L2-20", "REL-SIR-ARB-L4-20"]);
    for (const q of SIRAH_BANK.filter((q) => /→/.test(q.prompt.fr))) expect(q.reviewNotes, q.id).toMatch(/Flèches de chronologie/);
    // Même validée par erreur, une carte sans explication arabe reste injouable.
    const forced = { ...SIRAH_BANK.find((q) => q.explanation.ar === "")!, status: "validated" as const };
    expect(playabilityIssues(forced, religion)).toContain("explication AR manquante");
  });
});

describe("banque religieuse Al-Qawaid al-Arba (import PDF, tout en brouillon)", () => {
  it("compte 25 cartes, 5 par niveau, toutes `draft`, bilingues, sourcées avec ouvrage, auteur, éditeur et pages", () => {
    expect(QAWAID_BANK).toHaveLength(25);
    for (const level of [1, 2, 3, 4, 5]) expect(QAWAID_BANK.filter((q) => q.difficulty === level)).toHaveLength(5);
    for (const q of QAWAID_BANK) {
      expect(q.status, q.id).toBe("draft");
      expect(q.id, q.id).toMatch(/^REL-QAW-ARB-L\d-\d\d$/);
      expect(q.knowledgeNodeId, q.id).toMatch(/^religion\.tawhid\.qawaid\.l\d\.\d\d$/);
      expect(q.answer.fr, q.id).not.toMatch(/^[A-D]\.?$/);
      expect(q.explanation.ar, q.id).toMatch(/^[^A-Za-z]*[.؟!]$/);
      expect(q.sources[0], q.id).toMatchObject({ title: "Sharḥ al-Qawāʿid al-Arbaʿ", author: "Shaykh ʿAbd ar-Razzāq ibn ʿAbd al-Muḥsin al-Badr", publisher: "Dār al-Imām Muslim, 1441 H / 2020" });
      expect(q.sources[0]!.pages, q.id).toMatch(/^\d/);
      expect(isPlayable(q, religion), q.id).toBe(false);
    }
  });
  it("les jonctions où un signe diacritique a été perdu et l'énoncé qui laisse voir le texte sont annotés, jamais corrigés par le code", () => {
    expect(QAWAID_BANK.filter((q) => /Signe diacritique perdu/.test(q.reviewNotes ?? "")).map((q) => q.id)).toEqual(["REL-QAW-ARB-L2-02", "REL-QAW-ARB-L2-04", "REL-QAW-ARB-L3-02", "REL-QAW-ARB-L5-01", "REL-QAW-ARB-L5-03"]);
    expect(QAWAID_BANK.filter((q) => /derrière le rideau/.test(q.reviewNotes ?? "")).map((q) => q.id)).toEqual(["REL-QAW-ARB-L4-03"]);
  });
});
