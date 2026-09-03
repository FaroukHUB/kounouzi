import type { CategoryDefinition, CuratedQuestion } from "./types";

/**
 * Seule porte de sortie de la banque curée vers le jeu. Une question n'est
 * jouable que si elle est validée, bilingue (explication FR et AR non
 * vides) et sourcée lorsque sa catégorie l'exige. Jamais de contournement.
 */
export function playabilityIssues(question: CuratedQuestion, category: CategoryDefinition | undefined): readonly string[] {
  const issues: string[] = [];
  if (!category) issues.push(`catégorie inconnue : ${question.categoryId}`);
  else if (!category.active) issues.push(`catégorie inactive : ${category.id}`);
  if (question.status !== "validated") issues.push(`statut ${question.status} ≠ validated`);
  if (question.prompt.fr.trim() === "") issues.push("énoncé FR manquant");
  if (question.answer.fr.trim() === "") issues.push("réponse FR manquante");
  if (question.explanation.fr.trim() === "") issues.push("explication FR manquante");
  if (question.explanation.ar.trim() === "") issues.push("explication AR manquante");
  if (category?.requiresSource && question.sources.length === 0) issues.push("source obligatoire absente");
  for (const s of question.sources) {
    if (s.title.trim() === "") issues.push("source sans titre");
    if (s.url !== undefined && !/^https?:\/\//.test(s.url)) issues.push(`URL de source invalide : ${s.url}`);
  }
  return issues;
}

export const isPlayable = (question: CuratedQuestion, category: CategoryDefinition | undefined): boolean => playabilityIssues(question, category).length === 0;
