import { describe, expect, it } from "vitest";
import { CATEGORIES, categoryById } from "@/config/content";
import { afterValidation } from "@/ui/cards/questionFlow";

describe("suite de la validation : explication réservée aux catégories qui la déclarent", () => {
  it("religion, géographie et gestion affichent et lisent une explication après la réponse (donnée de configuration)", () => {
    // Décision produit : dans ces catégories l'explication FAIT PARTIE de l'apprentissage —
    // la carte porte sa nuance dans l'explication et la perdrait sans elle.
    expect(CATEGORIES.filter((c) => c.showsExplanation).map((c) => c.id)).toEqual(["religion", "geography", "management"]);
  });

  it("religion, géographie et gestion : Correct / Presque / Incorrect mènent à l'explication", () => {
    for (const id of ["religion", "geography", "management"]) {
      for (const o of ["correct", "partial", "incorrect"] as const) expect(afterValidation(categoryById(id), o), id).toEqual({ kind: "explain" });
    }
  });

  it("maths et les autres : la réponse validée part directement au moteur, sans déclaration de maîtrise", () => {
    for (const id of ["maths", "history", "arabic", "logic", "culture"]) {
      expect(afterValidation(categoryById(id), "correct"), id).toEqual({ kind: "submit", outcome: "correct", mastery: "none" });
      expect(afterValidation(categoryById(id), "partial"), id).toEqual({ kind: "submit", outcome: "partial", mastery: "none" });
    }
  });

  it("une catégorie inconnue n'affiche jamais d'explication par défaut", () => {
    expect(afterValidation(undefined, "incorrect")).toEqual({ kind: "submit", outcome: "incorrect", mastery: "none" });
  });
});
