import type { CategoryDefinition } from "@/core/content";
import type { AnswerOutcome, ExplanationMastery } from "@/core/shared";

export type AfterValidation = { readonly kind: "explain" } | { readonly kind: "submit"; readonly outcome: AnswerOutcome; readonly mastery: ExplanationMastery };

/**
 * Suite de la validation Correct / Presque / Incorrect. L'explication n'est
 * affichée (et lue) que pour les catégories qui la déclarent
 * (`showsExplanation`, donnée de configuration : religion) ; ailleurs la
 * réponse part directement au moteur, sans déclaration de maîtrise.
 * Une catégorie inconnue ne montre rien : jamais d'explication par défaut.
 */
export function afterValidation(category: CategoryDefinition | undefined, outcome: AnswerOutcome): AfterValidation {
  return category?.showsExplanation ? { kind: "explain" } : { kind: "submit", outcome, mastery: "none" };
}
