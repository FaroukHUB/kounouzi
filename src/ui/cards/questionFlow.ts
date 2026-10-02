import type { CategoryDefinition } from "@/core/content";
import type { AnswerOutcome, ExplanationMastery } from "@/core/shared";

export type AfterValidation = { readonly kind: "explain" } | { readonly kind: "submit"; readonly outcome: AnswerOutcome; readonly mastery: ExplanationMastery };

/**
 * Suite de la validation Correct / Presque / Incorrect. L'explication n'est
 * affichée (et lue) que pour les catégories qui la déclarent
 * (`showsExplanation`, donnée de configuration). Depuis l'ADR 0053, une SEULE
 * la déclare : la religion. Partout ailleurs la réponse validée part
 * directement au moteur, sans étape d'explication ni déclaration de maîtrise —
 * une explication après chaque question cassait le rythme du jeu.
 *
 * Cela ne change rien à l'exigence de CONTENU : la garde de jouabilité continue
 * d'exiger une explication en français ET en arabe pour toute question validée,
 * quelle que soit sa catégorie. Elle est écrite et relue ; elle n'est
 * simplement plus lue à voix haute en partie.
 *
 * Une catégorie inconnue ne montre rien : jamais d'explication par défaut.
 */
export function afterValidation(category: CategoryDefinition | undefined, outcome: AnswerOutcome): AfterValidation {
  return category?.showsExplanation ? { kind: "explain" } : { kind: "submit", outcome, mastery: "none" };
}
