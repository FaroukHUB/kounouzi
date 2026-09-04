#!/usr/bin/env node
/**
 * Import d'une banque religieuse Kounouzi (PDF de contrôle humain → données
 * structurées). Entrée : le TEXTE extrait du PDF (par n'importe quel outil
 * PDF → texte), sortie : JSON versionné consommé par le Content Engine.
 * Toutes les cartes sortent en `draft` ; rien n'est inventé ni complété : le
 * script ne fait que découper, et réordonner des glyphes arabes coupés par
 * l'extraction (signalés dans le rapport pour relecture).
 *
 *   node scripts/content/import-oussoul.mjs <texte.txt> <sortie.json> <nœud> [publisher]
 *   ex. … oussoul.txt src/content/questions/religion/oussoul-ath-thalatha.v1.json religion.tawhid.oussoul
 */
import { readFileSync, writeFileSync } from "node:fs";
import { applyCorrections, loadCorrections } from "./apply-corrections.mjs";

const [, , input, output, nodePrefix, publisher] = process.argv;
if (!input || !output || !nodePrefix) {
  console.error("usage: import-oussoul.mjs <texte.txt> <sortie.json> <nœud> [éditeur]");
  process.exit(1);
}

const DIACRITIC = /^[ً-ْٰ\s]+$/;
const FOOTER = /^Kounouzi - .+ \| \d+$/;

const lines = readFileSync(input, "utf8")
  .split(/\r?\n/)
  .map((l) => l.replace(/\s+$/, ""))
  .filter((l) => l.trim() !== "" && !FOOTER.test(l));

const cards = [];
const manual = [];
const repaired = [];
let level = 0;
let ageBand = "";
let work = "";
let author = "";
let i = 0;
while (i < lines.length) {
  const line = lines[i];
  const lvl = line.match(/^Niveau (\d)$/);
  if (lvl) {
    level = Number(lvl[1]);
    i += 1;
    const pub = lines[i]?.match(/^Public indicatif : (.+?) - \d+ cartes?$/);
    if (pub) {
      ageBand = pub[1].replace(/\s*\/\s*adultes/, "").replace(/\s*ans\s*/g, "").trim();
      i += 1;
    }
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
  // Jusqu'à « Source : » : suite de l'explication FR (latin) puis explication AR (arabe).
  const rest = [];
  while (i < lines.length && !lines[i].startsWith("Source :")) rest.push(lines[i++]);
  const arabic = rest.filter((l) => /[؀-ۿ]/.test(l));
  const frExtra = rest.filter((l) => !/[؀-ۿ]/.test(l));
  // La ligne « Source : » peut être coupée sur plusieurs lignes jusqu'à « ID : ».
  const sourceLines = [lines[i++].replace(/^Source :\s*/, "")];
  while (i < lines.length && !lines[i].startsWith("ID :")) sourceLines.push(lines[i++]);
  // Une coupure de ligne au milieu d'un nom de fichier (« waja-a-shahr-⏎ramadan.pdf ») se recolle sans espace.
  const source = sourceLines
    .reduce((acc, l) => (acc.endsWith("-") && !acc.endsWith(" -") ? acc + l.trim() : acc + " " + l.trim()), "")
    .replace(/\s+/g, " ")
    .trim();
  const id = lines[i++].replace(/^ID :\s*/, "").trim();
  const animation = lines[i++].replace(/^Animation :\s*/, "").trim();

  const [workPart, authorPart] = source.split(" - fichier source ")[0].split(" - ");
  work = work || workPart?.trim() || "";
  author = author || authorPart?.trim() || "";
  const pages = source.match(/pages? ([\d\s,\-]+)$/)?.[1]?.replace(/\s+/g, " ").trim() ?? "";
  const file = source.match(/fichier source (\S+?)(?: - pages?|$)/)?.[1] ?? "";
  const joined = joinArabic(arabic, id);

  cards.push({
    id,
    version: 1,
    categoryId: "religion",
    knowledgeNodeId: `${nodePrefix}.l${level}.${id.slice(-2)}`,
    difficulty: level,
    ageBand,
    audienceScope: "all",
    status: "draft",
    title,
    prompt: { fr: promptLines.join(" ").replace(/\s+/g, " ").trim() },
    answer: { fr: answerLines.join(" ").replace(/\s+/g, " ").trim() },
    explanation: { fr: [...explanationFr, ...frExtra].join(" ").replace(/\s+/g, " ").trim(), ar: joined.ar },
    sources: [{ title: workPart?.trim() ?? "", author: authorPart?.trim() ?? "", pages, file, ...(publisher ? { publisher } : {}) }],
    animationKey: animation,
    ...(joined.note ? { reviewNotes: joined.note } : {}),
  });
}


/**
 * Réassemble une explication arabe coupée par l'extraction autour de signes
 * diacritiques : l'extracteur livre les morceaux dans l'ordre inverse
 * (fin, signe, milieu, signe, début) ; on les recolle à l'envers. Toute autre
 * forme (par ex. un verset entièrement vocalisé éclaté lettre par lettre)
 * n'est PAS reconstituée : l'arabe est laissé vide et la carte est signalée
 * pour saisie manuelle — jamais un texte religieux approximatif.
 */
function joinArabic(parts, id) {
  if (parts.length === 1) return { ar: parts[0].trim() };
  const alternating = parts.length % 2 === 1 && parts.every((p, k) => (k % 2 === 1 ? DIACRITIC.test(p) : !DIACRITIC.test(p)));
  if (alternating) {
    repaired.push(id);
    return { ar: [...parts].reverse().map((p) => p.trim()).join("").replace(/\s+/g, " ") };
  }
  manual.push(`${id} (${parts.length} lignes)`);
  return { ar: "", note: `Explication arabe illisible à l'extraction (${parts.length} fragments) : à saisir manuellement depuis le PDF de contrôle.` };
}

const byLevel = cards.reduce((acc, c) => ({ ...acc, [c.difficulty]: (acc[c.difficulty] ?? 0) + 1 }), {});
const bank = {
  $comment: `Banque religieuse importée depuis le PDF de contrôle humain (source de fond : ${work}, ${author}). TOUTES les cartes sont \`draft\` tant qu'elles ne sont pas explicitement passées à \`validated\` après relecture humaine ; seules les cartes validées sont jouables. Aucun contenu n'est inventé ni complété par le code.`,
  version: 1,
  work,
  author,
  ...(publisher ? { publisher } : {}),
  category: nodePrefix.split(".").slice(0, 2).join("."),
  questions: cards,
};
// Corrections humaines validées (revue) : réappliquées à chaque réimport, jamais perdues.
const corrected = applyCorrections(bank, loadCorrections());
writeFileSync(output, JSON.stringify(corrected.bank, null, 2) + "\n");
console.log(`corrections humaines appliquées : ${corrected.applied} ; cartes validées (décision humaine) : ${corrected.validated}`);
console.log(`cartes : ${cards.length}`, JSON.stringify(byLevel));
console.log(`arabe réassemblé (à relire) : ${repaired.length}`, repaired.join(", "));
console.log(`arabe à saisir manuellement : ${manual.length}`, manual.join(", "));
