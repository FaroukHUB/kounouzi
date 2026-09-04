import { describe, expect, it } from "vitest";
import { CATEGORIES, categoryById } from "@/config/content";
import { afterValidation } from "@/ui/cards/questionFlow";

describe("suite de la validation : explication réservée aux catégories qui la déclarent", () => {
  it("seule la religion affiche et lit une explication après la réponse (donnée de configuration)", () => {
    expect(CATEGORIES.filter((c) => c.showsExplanation).map((c) => c.id)).toEqual(["religion"]);
  });

  it("religion : Correct / Presque / Incorrect mènent à l'explication", () => {
    for (const o of ["correct", "partial", "incorrect"] as const) expect(afterValidation(categoryById("religion"), o)).toEqual({ kind: "explain" });
  });

  it("maths, géographie et les autres : la réponse validée part directement au moteur, sans déclaration de maîtrise", () => {
    for (const id of ["maths", "geography", "history", "arabic", "logic", "management", "culture"]) {
      expect(afterValidation(categoryById(id), "correct"), id).toEqual({ kind: "submit", outcome: "correct", mastery: "none" });
      expect(afterValidation(categoryById(id), "partial"), id).toEqual({ kind: "submit", outcome: "partial", mastery: "none" });
    }
  });

  it("une catégorie inconnue n'affiche jamais d'explication par défaut", () => {
    expect(afterValidation(undefined, "incorrect")).toEqual({ kind: "submit", outcome: "incorrect", mastery: "none" });
  });
});
