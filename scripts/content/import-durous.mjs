#!/usr/bin/env node
/**
 * Import d'une banque religieuse Kounouzi au format « document de contrôle »
 * (DOCX/PDF humain → données structurées). Entrée : le TEXTE extrait du
 * document (un paragraphe par ligne), sortie : JSON versionné consommé par le
 * Content Engine. Toutes les cartes sortent en `draft` ; rien n'est inventé ni
 * complété : le script ne fait que découper.
 *
 * Format attendu (une carte) :
 *   1.01 - Titre
 *   QUESTION : …            (suivi d'éventuels choix « A. … », « Vrai / Faux »)
 *   RÉPONSE : …             (« A. » seul = le texte du choix A, repris tel quel)
 *   Explication FR : …
 *   الشرح بالعربية: …
 *   Source : <ouvrage> - <auteur>, PDF transmis, p. 35-36.
 *   Animation suggérée : <description libre>
 *
 * La description d'animation est conservée telle quelle (`animationHint`) ;
 * une clé de famille visuelle (`animationKey`) en est déduite par mots-clés,
 * de façon déterministe. Présentation pure : aucune influence sur le jeu.
 *
 *   node scripts/content/import-durous.mjs <texte.txt> <sortie.json> <nœud> <préfixe-id>
 *   ex. … durous.txt src/content/questions/religion/ad-durous-al-mouhimmah.v1.json religion.bases.durous REL-DRS-ARB
 */
import { readFileSync, writeFileSync } from "node:fs";

const [, , input, output, nodePrefix, idPrefix] = process.argv;
if (!input || !output || !nodePrefix || !idPrefix) {
  console.error("usage: import-durous.mjs <texte.txt> <sortie.json> <nœud> <préfixe-id>");
  process.exit(1);
}

const ARABIC = /[؀-ۿ]/;
/** Énoncés qui laissent voir le livre : signalés pour reformulation humaine, jamais réécrits ici. */
const CURTAIN = /\b(le texte|l[’']explication|le commentaire|le livre|la source)\b/i;
const AR_PREFIX = /^الشرح بالعربية\s*:\s*/;

/** Mots-clés → clé d'animation (première règle qui correspond). Clés connues de `src/ui/cards/animations/families.ts`. */
const ANIMATION_RULES = [
  [/coffre/i, "chest_reveal"],
  [/porte/i, "door_pick"],
  [/bouclier|barri[èe]re|frein|alerte|stop|signal|interrompt/i, "shield_guard"],
  [/repouss|s['’]efface|barré|se brise|échoue|interdi|sans effet|bloqu/i, "intruder_out"],
  [/boussole|cadran|tableau|classe|zone/i, "compass_scan"],
  [/jauge|compteur|balance/i, "gauge_rise"],
  [/clé|cadenas|serrure|sceau|tampon|verrou|badge|puzzle|emboît/i, "keys_count"],
  [/étoile|jeton|anneau|colonne|pièce|constellation|socle/i, "keys_count"],
  [/flèche|chemin|parcours|ligne|frise|chaîne|étape|voie|destination|passeport|réseau|bannière/i, "arrow_path"],
  [/vague|onde|goutte|eau|cœur|bulle|nuage|brouillard|synchronis|langue/i, "wave_ripple"],
  [/carte|parchemin|lettres|dévoile|retourne|révèle|déploie|glisse|silhouette|pictogramme|colonnes|fragments|sources|surface/i, "card_flip"],
];

function animationKeyFor(hint) {
  for (const [re, key] of ANIMATION_RULES) if (re.test(hint)) return key;
  return "stars_spark";
}

const lines = readFileSync(input, "utf8")
  .split(/\r?\n/)
  .map((l) => l.replace(/\s+$/, ""))
  .filter((l) => l.trim() !== "");

const cards = [];
const letterAnswers = [];
const curtain = [];
let level = 0;
let ageBand = "";
let work = "";
let author = "";
let i = 0;
while (i < lines.length) {
  const line = lines[i];
  const lvl = line.match(/^NIVEAU (\d)$/);
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
  const head = line.match(/^(\d)\.(\d\d) - (.+)$/);
  if (!head || level === 0) {
    i += 1;
    continue;
  }
  if (Number(head[1]) !== level) throw new Error(`carte ${head[1]}.${head[2]} hors du niveau ${level}`);
  const number = head[2];
  const title = head[3].trim();
  i += 1;
  const question = lines[i++].replace(/^QUESTION :\s*/, "");
  const choices = [];
  while (i < lines.length && !lines[i].startsWith("RÉPONSE :")) choices.push(lines[i++].trim());
  let answer = lines[i++].replace(/^RÉPONSE :\s*/, "").trim();
  const explanationFr = lines[i++].replace(/^Explication FR :\s*/, "").trim();
  const arLine = lines[i++];
  if (!AR_PREFIX.test(arLine)) throw new Error(`carte ${level}.${number} : explication arabe absente`);
  const explanationAr = arLine.replace(AR_PREFIX, "").trim();
  const source = lines[i++].replace(/^Source :\s*/, "").trim();
  const hint = lines[i++].replace(/^Animation suggérée :\s*/, "").trim();

  // « RÉPONSE : A. » désigne le choix A : on reprend son texte tel quel (aucune reformulation).
  const letter = answer.match(/^([A-D])\.?$/);
  if (letter) {
    const choice = choices.find((c) => c.startsWith(`${letter[1]}. `));
    if (!choice) throw new Error(`carte ${level}.${number} : réponse « ${answer} » sans choix correspondant`);
    answer = choice.slice(3).trim().replace(/\.?$/, ".");
    letterAnswers.push(`${idPrefix}-L${level}-${number}`);
  }
  if (CURTAIN.test(question)) curtain.push(`${idPrefix}-L${level}-${number}`);

  // « <ouvrage> - <auteur>, PDF transmis, p. 35-36. »
  const src = source.match(/^(.+?) - (.+?), PDF transmis, p\. (.+?)\.?$/);
  if (!src) throw new Error(`carte ${level}.${number} : source non reconnue « ${source} »`);
  // « commentaire de Shaykh … » : on garde le nom, l'ouvrage étant déjà le commentaire.
  const sourceAuthor = src[2].replace(/^commentaire de\s+/i, "").trim();
  work = work || src[1].trim();
  author = author || sourceAuthor;
  const pages = src[3].trim();

  const id = `${idPrefix}-L${level}-${number}`;
  cards.push({
    id,
    version: 1,
    categoryId: "religion",
    knowledgeNodeId: `${nodePrefix}.l${level}.${number}`,
    difficulty: level,
    ageBand,
    audienceScope: "all",
    status: "draft",
    title,
    prompt: { fr: [question, ...choices].join(" ").replace(/\s+/g, " ").trim() },
    answer: { fr: answer },
    explanation: { fr: explanationFr, ar: explanationAr },
    sources: [{ title: src[1].trim(), author: sourceAuthor, pages }],
    animationKey: animationKeyFor(hint),
    animationHint: hint,
    ...(CURTAIN.test(question) ? { reviewNotes: "L'énoncé mentionne le texte ou le commentaire : à reformuler en relecture pour garder le livre derrière le rideau (la source reste sous la réponse)." } : {}),
  });
}

if (!cards.every((c) => ARABIC.test(c.explanation.ar))) throw new Error("explication arabe vide");

const byLevel = cards.reduce((acc, c) => ({ ...acc, [c.difficulty]: (acc[c.difficulty] ?? 0) + 1 }), {});
const bank = {
  $comment: `Banque religieuse importée depuis le document de contrôle humain (source de fond : ${work}, ${author}). TOUTES les cartes sont \`draft\` tant qu'elles ne sont pas explicitement passées à \`validated\` après relecture humaine ; seules les cartes validées sont jouables. Aucun contenu n'est inventé ni complété par le code ; \`animationHint\` est la suggestion visuelle de l'auteur, \`animationKey\` la famille déduite (présentation pure).`,
  version: 1,
  work,
  author,
  category: nodePrefix.split(".").slice(0, 2).join("."),
  questions: cards,
};
writeFileSync(output, JSON.stringify(bank, null, 2) + "\n");
const byKey = cards.reduce((acc, c) => ({ ...acc, [c.animationKey]: (acc[c.animationKey] ?? 0) + 1 }), {});
console.log(`cartes : ${cards.length}`, JSON.stringify(byLevel));
console.log(`réponses « lettre » résolues vers le texte du choix : ${letterAnswers.length}`);
console.log("familles d'animation déduites :", JSON.stringify(byKey));
console.log(`énoncés à reformuler (le livre derrière le rideau) : ${curtain.length}`, curtain.join(", "));
