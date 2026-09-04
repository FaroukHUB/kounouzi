#!/usr/bin/env node
/**
 * Corrections HUMAINES par-dessus l'import automatique d'une banque de
 * questions. Le fichier de corrections (revue validée) est de la donnée :
 * `set` remplace des champs (`prompt.fr`, `answer.fr`, `explanation.fr`,
 * `explanation.ar`, `title`), `clearReviewNotes` retire la note d'import,
 * `reviewNotes` en pose une nouvelle. Une correction dont la carte n'existe
 * pas dans la banque est ignorée (elle concerne une autre banque).
 *
 *   node scripts/content/apply-corrections.mjs <banque.json> [corrections.json]
 * (utilisé aussi par les importeurs, qui l'appellent après la découpe).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_CORRECTIONS = resolve(here, "../../src/content/questions/religion/corrections.v1.json");

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
  return { bank: { ...bank, questions }, applied };
}

export function loadCorrections(path = DEFAULT_CORRECTIONS) {
  return JSON.parse(readFileSync(path, "utf8"));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , bankPath, correctionsPath] = process.argv;
  if (!bankPath) {
    console.error("usage: apply-corrections.mjs <banque.json> [corrections.json]");
    process.exit(1);
  }
  const bank = JSON.parse(readFileSync(bankPath, "utf8"));
  const { bank: fixed, applied } = applyCorrections(bank, loadCorrections(correctionsPath));
  writeFileSync(bankPath, JSON.stringify(fixed, null, 2) + "\n");
  console.log(`corrections appliquées : ${applied}`);
}
