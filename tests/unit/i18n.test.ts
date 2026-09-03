import { describe, expect, it } from "vitest";
import { LOCALES } from "@/core/shared";
import { DEFAULT_LOCALE, dictionaries, directionOf, t } from "@/i18n";
import { fr } from "@/i18n/fr";

describe("i18n", () => {
  it("fournit un dictionnaire pour chaque langue prise en charge", () => {
    for (const locale of LOCALES) {
      expect(dictionaries[locale]).toBeDefined();
    }
  });

  it("chaque langue couvre exactement les clés du dictionnaire français, sans valeur vide", () => {
    const referenceKeys = Object.keys(fr).sort();
    for (const locale of LOCALES) {
      const dictionary = dictionaries[locale];
      expect(Object.keys(dictionary).sort()).toEqual(referenceKeys);
      for (const key of referenceKeys) {
        expect(dictionary[key as keyof typeof fr].trim()).not.toBe("");
      }
    }
  });

  it("l'interface est française par défaut en V1", () => {
    expect(DEFAULT_LOCALE).toBe("fr");
    expect(t(DEFAULT_LOCALE, "app.name")).toBe("Kounouzi");
  });

  it("associe la bonne direction à chaque langue", () => {
    expect(directionOf("fr")).toBe("ltr");
    expect(directionOf("ar")).toBe("rtl");
  });
});
