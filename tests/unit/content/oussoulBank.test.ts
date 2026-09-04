import { describe, expect, it } from "vitest";
import { CATEGORIES, CURATED_BANK, DUROUS_BANK, KALIMAH_BANK, OUSSOUL_BANK, QAWAID_BANK, RAMADAN_BANK, RELIGION_BANKS, SIRAH_BANK, contentRegistry } from "@/config/content";
import { createContentRegistry, createCuratedProvider, isPlayable, playabilityIssues } from "@/core/content";
import { KNOWN_ANIMATION_KEYS, animationFamily } from "@/ui/cards/animations/families";

const religion = CATEGORIES.find((c) => c.id === "religion")!;

describe("banque religieuse Oussoul ath-Thalatha (import, validée humainement)", () => {
  it("compte 100 cartes, 20 par niveau, identifiants uniques, toutes `validated`", () => {
    expect(OUSSOUL_BANK).toHaveLength(100);
    for (const level of [1, 2, 3, 4, 5]) expect(OUSSOUL_BANK.filter((q) => q.difficulty === level)).toHaveLength(20);
    expect(new Set(OUSSOUL_BANK.map((q) => q.id)).size).toBe(100);
    expect(OUSSOUL_BANK.every((q) => q.status === "validated")).toBe(true);
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

  it("les 375 cartes religieuses validées sont jouables ; une carte remise en brouillon ne l'est plus (la garde reste la seule porte)", () => {
    expect(OUSSOUL_BANK.every((q) => isPlayable(q, religion))).toBe(true);
    expect(playabilityIssues({ ...OUSSOUL_BANK[0]!, status: "draft" }, religion)).toEqual(["statut draft ≠ validated"]);
    expect(contentRegistry().availableCategories("child")).toContain("religion");
    expect(contentRegistry().slots("child").filter((s) => s.categoryId === "religion")).toHaveLength(375);
    expect(CURATED_BANK.filter((q) => q.categoryId === "religion")).toHaveLength(375);
  });

  it("une carte validée est servie telle quelle, avec sa source et son habillage", () => {
    const registry = createContentRegistry(CATEGORIES, [createCuratedProvider(OUSSOUL_BANK, CATEGORIES)]);
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

describe("banque religieuse Wa Ja'a Shahr Ramadan (import, validée humainement)", () => {
  it("compte 25 cartes, 5 par niveau, toutes `validated`, sourcées avec ouvrage, auteur, éditeur et pages, bilingues", () => {
    expect(RAMADAN_BANK).toHaveLength(25);
    for (const level of [1, 2, 3, 4, 5]) expect(RAMADAN_BANK.filter((q) => q.difficulty === level)).toHaveLength(5);
    expect(new Set([...RAMADAN_BANK, ...OUSSOUL_BANK].map((q) => q.id)).size).toBe(125);
    for (const q of RAMADAN_BANK) {
      expect(q.status, q.id).toBe("validated");
      expect(q.knowledgeNodeId, q.id).toMatch(/^religion\.ramadan\.wajaa\.l\d\.\d\d$/);
      // Toutes les explications arabes sont présentes (L5-01 relue caractère par caractère sur le PDF de contrôle, jamais approximée).
      expect(/[؀-ۿ]/.test(q.explanation.ar), q.id).toBe(true);
      expect(q.sources[0], q.id).toMatchObject({ title: "Wa Ja'a Shahr Ramadan", author: "Shaykh Abd ar-Razzaq ibn Abd al-Muhsin al-Badr", publisher: "Dar al-Fadhila, 2014", file: "waja-a-shahr-ramadan.pdf" });
      expect(q.sources[0]!.pages, q.id).toMatch(/^\d/);
      expect(q.prompt.fr, q.id).not.toMatch(/dans (le|ce) (livre|passage|texte)|dans la source|d'après le livre|selon le livre/i);
      expect(isPlayable(q, religion), q.id).toBe(true);
    }
    // Plus aucune note d'import : L5-01 (verset) et le titre arabe de L4-02 ont été vérifiés dans la source.
    expect(RAMADAN_BANK.filter((q) => q.reviewNotes)).toEqual([]);
    expect(RAMADAN_BANK.find((q) => q.id === "REL-RAM-ARB-L5-01")!.explanation.ar).toMatch(/^شُرع الصيام لتحقيق التقوى: ﴿.+﴾\.$/);
    expect(RAMADAN_BANK.find((q) => q.id === "REL-RAM-ARB-L4-02")!.title).toBe("Mission « إيمانًا واحتسابًا »");
    // Même validée par erreur, une carte sans explication arabe reste injouable.
    const l501 = RAMADAN_BANK.find((q) => q.id === "REL-RAM-ARB-L5-01")!;
    const forced = { ...l501, explanation: { ...l501.explanation, ar: "" }, status: "validated" as const };
    expect(playabilityIssues(forced, religion)).toContain("explication AR manquante");
  });
});

describe("banque religieuse Ad-Durous al-Muhimmah (import DOCX, validée humainement)", () => {
  const CURTAIN = /\b(le texte|l[’']explication|le commentaire|le livre|la source)\b/i;
  it("compte 100 cartes, 20 par niveau, identifiants uniques sur les trois banques, toutes `validated`, bilingues et sourcées avec pages", () => {
    expect(DUROUS_BANK).toHaveLength(100);
    for (const level of [1, 2, 3, 4, 5]) expect(DUROUS_BANK.filter((q) => q.difficulty === level)).toHaveLength(20);
    expect(new Set(RELIGION_BANKS.flatMap((b) => b.questions.map((q) => q.id))).size).toBe(375);
    for (const q of DUROUS_BANK) {
      expect(q.status, q.id).toBe("validated");
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
      expect(isPlayable(q, religion), q.id).toBe(true);
    }
  });
  it("plus aucun énoncé ne laisse voir le texte ou le commentaire : les reformulations validées en relecture sont appliquées (corrections humaines)", () => {
    expect(DUROUS_BANK.filter((q) => CURTAIN.test(q.prompt.fr) || /ce passage/i.test(q.prompt.fr)).map((q) => q.id)).toEqual([]);
    expect(DUROUS_BANK.filter((q) => q.reviewNotes)).toEqual([]);
    expect(DUROUS_BANK.find((q) => q.id === "REL-DRS-ARB-L5-02")?.answer.fr).toBe("Qui adorais-tu ? et qu’as-tu répondu aux Messagers ?");
  });
});

describe("banque religieuse Sirah — al-Urjuzah al-Mi'iyyah (import DOCX, validée humainement)", () => {
  it("compte 100 cartes, 20 par niveau, toutes `validated`, sourcées avec ouvrage, auteur, page et repère de vers ; arabe intact partout", () => {
    expect(SIRAH_BANK).toHaveLength(100);
    for (const level of [1, 2, 3, 4, 5]) expect(SIRAH_BANK.filter((q) => q.difficulty === level)).toHaveLength(20);
    for (const q of SIRAH_BANK) {
      expect(q.status, q.id).toBe("validated");
      expect(q.id, q.id).toMatch(/^REL-SIR-ARB-L\d-\d\d$/);
      expect(q.knowledgeNodeId, q.id).toMatch(/^religion\.sirah\.urjuzah\.l\d\.\d\d$/);
      expect(q.answer.fr, q.id).not.toMatch(/^[A-D]\.?$/);
      expect(q.explanation.fr, q.id).toMatch(/[.!?]$/);
      // Import DOCX : l'arabe est intact (aucun recollage, aucune saisie manuelle).
      expect(q.explanation.ar, q.id).toMatch(/^[^A-Za-z]*[.؟!]$/);
      expect(q.reviewNotes, q.id).toBeUndefined();
      expect(q.sources[0], q.id).toMatchObject({ title: "Sharḥ al-Urjūzah al-Mi’iyyah fī Dhikr Ḥāl Ashraf al-Bariyyah", author: "Shaykh ʿAbd ar-Razzāq ibn ʿAbd al-Muḥsin al-Badr" });
      expect(q.sources[0]!.pages, q.id).toMatch(/^1[2-6]$/);
      expect(q.sources[0]!.locator, q.id).toMatch(/^Matn, vers \d/);
      expect(q.prompt.fr, q.id).not.toMatch(/dans (le|ce) (livre|passage|texte)|dans la source|d'après le livre|selon le livre/i);
      expect(isPlayable(q, religion), q.id).toBe(true);
    }
    // Les deux chronologies portent leurs flèches entre les étapes (« A. Hijrah → construction … »), jamais regroupées en fin de choix.
    for (const id of ["REL-SIR-ARB-L2-20", "REL-SIR-ARB-L4-20"]) {
      const prompt = SIRAH_BANK.find((q) => q.id === id)!.prompt.fr;
      expect(prompt, id).toMatch(/\S → \S/);
      expect(prompt, id).not.toMatch(/→→/);
    }
    // Même validée par erreur, une carte dont l'arabe serait vidé reste injouable.
    const forced = { ...SIRAH_BANK[0]!, status: "validated" as const, explanation: { ...SIRAH_BANK[0]!.explanation, ar: "" } };
    expect(playabilityIssues(forced, religion)).toContain("explication AR manquante");
  });
});

describe("banque religieuse Al-Qawaid al-Arba (import PDF, validée humainement)", () => {
  it("compte 25 cartes, 5 par niveau, toutes `validated`, bilingues, sourcées avec ouvrage, auteur, éditeur et pages", () => {
    expect(QAWAID_BANK).toHaveLength(25);
    for (const level of [1, 2, 3, 4, 5]) expect(QAWAID_BANK.filter((q) => q.difficulty === level)).toHaveLength(5);
    for (const q of QAWAID_BANK) {
      expect(q.status, q.id).toBe("validated");
      expect(q.id, q.id).toMatch(/^REL-QAW-ARB-L\d-\d\d$/);
      expect(q.knowledgeNodeId, q.id).toMatch(/^religion\.tawhid\.qawaid\.l\d\.\d\d$/);
      expect(q.answer.fr, q.id).not.toMatch(/^[A-D]\.?$/);
      expect(q.explanation.ar, q.id).toMatch(/^[^A-Za-z]*[.؟!]$/);
      expect(q.sources[0], q.id).toMatchObject({ title: "Sharḥ al-Qawāʿid al-Arbaʿ", author: "Shaykh ʿAbd ar-Razzāq ibn ʿAbd al-Muḥsin al-Badr", publisher: "Dār al-Imām Muslim, 1441 H / 2020" });
      expect(q.sources[0]!.pages, q.id).toMatch(/^\d/);
      expect(isPlayable(q, religion), q.id).toBe(true);
    }
  });
  it("les cinq signes perdus à l'extraction ont été rétablis depuis la source (damma visible) et plus rien n'est annoté ; l'énoncé « rideau » est reformulé", () => {
    expect(QAWAID_BANK.filter((q) => q.reviewNotes)).toEqual([]);
    const damma = { "REL-QAW-ARB-L2-02": "تُطلب", "REL-QAW-ARB-L2-04": "يُطلب", "REL-QAW-ARB-L3-02": "ذُكر", "REL-QAW-ARB-L5-01": "يُفرد", "REL-QAW-ARB-L5-03": "صُرفت" };
    for (const [id, word] of Object.entries(damma)) expect(QAWAID_BANK.find((q) => q.id === id)!.explanation.ar, id).toContain(word);
    expect(QAWAID_BANK.filter((q) => /derrière le rideau/.test(q.reviewNotes ?? ""))).toEqual([]);
    expect(QAWAID_BANK.filter((q) => /le livre/i.test(q.explanation.fr) || /le commentaire/i.test(q.prompt.fr))).toEqual([]);
  });
});

describe("banque religieuse Kalimah at-Tawhid (import DOCX, validée humainement)", () => {
  it("compte 25 cartes, 5 par niveau, toutes `validated`, sourcées avec ouvrage, auteur, thème et page ; arabe intact partout", () => {
    expect(KALIMAH_BANK).toHaveLength(25);
    for (const level of [1, 2, 3, 4, 5]) expect(KALIMAH_BANK.filter((q) => q.difficulty === level)).toHaveLength(5);
    for (const q of KALIMAH_BANK) {
      expect(q.status, q.id).toBe("validated");
      expect(q.id, q.id).toMatch(/^REL-KAL-ARB-L\d-\d\d$/);
      expect(q.knowledgeNodeId, q.id).toMatch(/^religion\.tawhid\.kalimah\.l\d\.\d\d$/);
      expect(q.answer.fr, q.id).not.toMatch(/^[A-D]\.?$/);
      expect(q.explanation.ar, q.id).toMatch(/^[^A-Za-z]*[.؟!]$/);
      expect(q.sources[0], q.id).toMatchObject({ title: "Kalimah at-Tawhid: Lā ilāha illā Allāh - ses mérites, son sens, ses conditions et ses annulatifs", author: "Shaykh ʿAbd ar-Razzāq ibn ʿAbd al-Muḥsin al-Badr" });
      expect(q.sources[0]!.pages, q.id).toMatch(/^\d+$/);
      expect(q.sources[0]!.locator, q.id).toBeTruthy();
      expect(isPlayable(q, religion), q.id).toBe(true);
    }
    expect(KALIMAH_BANK.filter((q) => q.explanation.ar === "")).toEqual([]);
    // Énoncés reformulés en relecture : plus aucune note.
    expect(KALIMAH_BANK.filter((q) => q.reviewNotes)).toEqual([]);
    expect(KALIMAH_BANK.find((q) => q.id === "REL-KAL-ARB-L2-04")?.answer.fr).toBe("Celui qui dit « Lā ilāha illā Allāh » sincèrement de son cœur.");
  });
});
