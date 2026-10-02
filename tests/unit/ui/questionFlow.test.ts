import { describe, expect, it } from "vitest";
import { CATEGORIES, categoryById } from "@/config/content";
import { afterValidation } from "@/ui/cards/questionFlow";

describe("suite de la validation : l'explication est réservée à la religion", () => {
  it("une SEULE catégorie affiche et lit une explication après la réponse : religion", () => {
    // Décision de l'auteur après des parties réelles : une explication après chaque question
    // casse le rythme du jeu, et c'est en religion qu'elle porte vraiment (ADR 0053).
    expect(CATEGORIES.filter((c) => c.showsExplanation).map((c) => c.id)).toEqual(["religion"]);
  });

  it("religion : Correct / Presque / Incorrect mènent tous à l'explication", () => {
    for (const id of ["religion"]) {
      for (const o of ["correct", "partial", "incorrect"] as const) expect(afterValidation(categoryById(id), o), id).toEqual({ kind: "explain" });
    }
  });

  it("partout ailleurs — y compris Histoire & Géo, logique et gestion — la réponse validée part directement au moteur", () => {
    for (const id of ["maths", "history", "arabic", "culture", "geography", "logic", "management"]) {
      expect(afterValidation(categoryById(id), "correct"), id).toEqual({ kind: "submit", outcome: "correct", mastery: "none" });
      expect(afterValidation(categoryById(id), "partial"), id).toEqual({ kind: "submit", outcome: "partial", mastery: "none" });
    }
  });

  it("une catégorie inconnue n'affiche jamais d'explication par défaut", () => {
    expect(afterValidation(undefined, "incorrect")).toEqual({ kind: "submit", outcome: "incorrect", mastery: "none" });
  });
});
