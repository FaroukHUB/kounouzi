#!/usr/bin/env node
/**
 * Corrections HUMAINES par-dessus l'import automatique d'une banque de
 * questions. Le fichier de corrections (revue validée) est de la donnée :
 * `set` remplace des champs (`prompt.fr`, `answer.fr`, `explanation.fr`,
 * `explanation.ar`, `title`), `clearReviewNotes` retire la note d'import,
 * `reviewNotes` en pose une nouvelle. Une correction dont la carte n'existe
 * pas dans la banque est ignorée (elle concerne une autre banque).
 *
 * Puis la VALIDATION HUMAINE (`validation.v1.json`, liste d'identifiants
 * décidée par une personne) : chaque carte listée passe à `validated` si elle
 * franchit la garde (explication FR et AR présentes, aucune `reviewNotes`, au
 * moins une source) ; sinon l'application échoue. Une carte non listée reste
 * dans le statut donné par l'import (`draft`). Ainsi un réimport ne fait
 * jamais perdre une validation humaine, et ne valide jamais rien de nouveau.
 *
 *   node scripts/content/apply-corrections.mjs <banque.json> [corrections.json] [validation.json]
 * (utilisé aussi par les importeurs, qui l'appellent après la découpe).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_CORRECTIONS = resolve(here, "../../src/content/questions/religion/corrections.v1.json");
export const DEFAULT_VALIDATION = resolve(here, "../../src/content/questions/religion/validation.v1.json");

/** Pourquoi une carte listée comme validée ne peut pas l'être (vide = validable). */
export function validationIssues(q) {
  const issues = [];
  if (!q.explanation?.fr?.trim()) issues.push("explication FR manquante");
  if (!q.explanation?.ar?.trim()) issues.push("explication AR manquante");
  if (q.reviewNotes) issues.push(`reviewNotes en attente : ${q.reviewNotes}`);
  if (!Array.isArray(q.sources) || q.sources.length === 0) issues.push("source obligatoire absente");
  return issues;
}

export function applyCorrections(bank, corrections) {
  let applied = 0;
  const questions = bank.questions.map((q) => {
    const fixes = corrections.corrections.filter((c) => c.id === q.id);
    if (fixes.length === 0) return q;
    let next = { ...q };
    for (const fix of fixes) {
      for (const [path, value] of Object.entries(fix.set ?? {})) {
        const [field, lang] = path.split(".");
        next = lang ? { ...next, [field]: { ...next[field], [lang]: value } } : { ...next, [field]: value };
      }
      if (fix.clearReviewNotes) delete next.reviewNotes;
      if (fix.reviewNotes) next.reviewNotes = fix.reviewNotes;
      applied += 1;
    }
    return next;
  });
  const validatedIds = new Set(corrections.validation?.ids ?? []);
  let validated = 0;
  const finalQuestions = questions.map((q) => {
    if (!validatedIds.has(q.id)) return q;
    const issues = validationIssues(q);
    if (issues.length > 0) throw new Error(`${q.id} est listée comme validée mais ne franchit pas la garde : ${issues.join(" ; ")}`);
    validated += 1;
    return q.status === "validated" ? q : { ...q, status: "validated" };
  });
  return { bank: { ...bank, questions: finalQuestions }, applied, validated };
}

export function loadCorrections(path = DEFAULT_CORRECTIONS, validationPath = DEFAULT_VALIDATION) {
  const corrections = JSON.parse(readFileSync(path, "utf8"));
  const validation = validationPath && existsSync(validationPath) ? JSON.parse(readFileSync(validationPath, "utf8")) : { ids: [] };
  return { ...corrections, validation };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , bankPath, correctionsPath, validationPath] = process.argv;
  if (!bankPath) {
    console.error("usage: apply-corrections.mjs <banque.json> [corrections.json]");
    process.exit(1);
  }
  const bank = JSON.parse(readFileSync(bankPath, "utf8"));
  const { bank: fixed, applied, validated } = applyCorrections(bank, loadCorrections(correctionsPath, validationPath));
  writeFileSync(bankPath, JSON.stringify(fixed, null, 2) + "\n");
  console.log(`corrections appliquées : ${applied} ; cartes validées (décision humaine) : ${validated}`);
}
