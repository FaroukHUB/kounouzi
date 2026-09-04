#!/usr/bin/env node
/**
 * Import de la banque religieuse « Oussoul ath-Thalatha » (PDF de contrôle
 * humain → données structurées). Entrée : le TEXTE extrait du PDF (par
 * n'importe quel outil PDF → texte), sortie : JSON versionné consommé par
 * le Content Engine. Toutes les cartes sortent en `draft` ; rien n'est
 * inventé ni complété : le script ne fait que découper et réordonner des
 * glyphes arabes coupés par l'extraction (signalés dans le rapport).
 *
 *   node scripts/content/import-oussoul.mjs <texte.txt> <sortie.json>
 */
import { readFileSync, writeFileSync } from "node:fs";

const [, , input, output] = process.argv;
if (!input || !output) {
  console.error("usage: import-oussoul.mjs <texte.txt> <sortie.json>");
  process.exit(1);
}

const SOURCE_WORK = "Sharh Thalathat al-Usul";
const SOURCE_AUTHOR = "Shaykh Salih Al ash-Shaykh";
const AGE_BANDS = { 1: "5-8", 2: "8-10", 3: "10-12", 4: "12-14", 5: "14+" };
const DIACRITIC = /^[ً-ْٰ\s]+$/;

const lines = readFileSync(input, "utf8")
  .split(/\r?\n/)
  .map((l) => l.replace(/\s+$/, ""))
  .filter((l) => l.trim() !== "" && !/^Kounouzi - Oussoul ath-Thalatha \| \d+$/.test(l));

const cards = [];
const repaired = [];
let level = 0;
let i = 0;
while (i < lines.length) {
  const line = lines[i];
  const lvl = line.match(/^Niveau (\d)$/);
  if (lvl) {
    level = Number(lvl[1]);
    i += 1;
    continue;
  }
  const head = line.match(/^(\d{1,2})\. (.+)$/);
  if (!head || level === 0) {
    i += 1;
    continue;
  }
  const title = head[2].trim();
  i += 1;
  const promptLines = [];
  while (i < lines.length && !lines[i].startsWith("Réponse :")) promptLines.push(lines[i++]);
  const answerLines = [lines[i++].replace(/^Réponse :\s*/, "")];
  while (i < lines.length && !lines[i].startsWith("Explication FR :")) answerLines.push(lines[i++]);
  const explanationFr = [lines[i++].replace(/^Explication FR :\s*/, "")];
  // Les lignes suivantes jusqu'à « Source : » : suite de l'explication FR (latin) puis explication AR (arabe).
  const rest = [];
  while (i < lines.length && !lines[i].startsWith("Source :")) rest.push(lines[i++]);
  const arabic = rest.filter((l) => /[؀-ۿ]/.test(l));
  const frExtra = rest.filter((l) => !/[؀-ۿ]/.test(l));
  const source = lines[i++].replace(/^Source :\s*/, "");
  const id = lines[i++].replace(/^ID :\s*/, "").trim();
  const animation = lines[i++].replace(/^Animation :\s*/, "").trim();

  const explanationAr = joinArabic(arabic, id);
  const pages = source.match(/pages? ([\d\s,\-]+)$/)?.[1]?.trim() ?? "";
  const file = source.match(/fichier source (\S+)/)?.[1] ?? "";
  cards.push({
    id,
    version: 1,
    categoryId: "religion",
    knowledgeNodeId: `religion.tawhid.oussoul.l${level}.${id.slice(-2)}`,
    difficulty: level,
    ageBand: AGE_BANDS[level],
    audienceScope: "all",
    status: "draft",
    title,
    prompt: { fr: promptLines.join(" ").replace(/\s+/g, " ").trim() },
    answer: { fr: answerLines.join(" ").replace(/\s+/g, " ").trim() },
    explanation: { fr: [...explanationFr, ...frExtra].join(" ").replace(/\s+/g, " ").trim(), ar: explanationAr },
    sources: [{ title: SOURCE_WORK, author: SOURCE_AUTHOR, pages, file }],
    animationKey: animation,
  });
}

/** Réassemble une explication arabe coupée par l'extraction autour d'un signe diacritique (ordre extrait : fin, signe, début). */
function joinArabic(parts, id) {
  if (parts.length === 1) return parts[0].trim();
  if (parts.length === 3 && DIACRITIC.test(parts[1])) {
    repaired.push(id);
    return (parts[2].trim() + parts[1].trim() + parts[0].trim()).replace(/\s+/g, " ");
  }
  repaired.push(`${id} (forme inattendue : ${parts.length} lignes)`);
  return parts.map((p) => p.trim()).join(" ");
}

const byLevel = cards.reduce((acc, c) => ({ ...acc, [c.difficulty]: (acc[c.difficulty] ?? 0) + 1 }), {});
const bank = {
  $comment:
    "Banque religieuse « Oussoul ath-Thalatha » — importée depuis le PDF de contrôle humain, source de fond : Sharh Thalathat al-Usul (Shaykh Salih Al ash-Shaykh). TOUTES les cartes sont `draft` tant qu'elles ne sont pas explicitement passées à `validated` après relecture humaine ; seules les cartes validées sont jouables. Aucun contenu n'est inventé ni complété par le code.",
  version: 1,
  work: SOURCE_WORK,
  author: SOURCE_AUTHOR,
  category: "religion.tawhid",
  questions: cards,
};
writeFileSync(output, JSON.stringify(bank, null, 2) + "\n");
console.log(`cartes : ${cards.length}`, JSON.stringify(byLevel));
console.log(`arabe réassemblé (à relire) : ${repaired.length}`, repaired.join(", "));
