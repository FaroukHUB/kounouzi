#!/usr/bin/env node
/**
 * Import d'une banque religieuse Kounouzi au format « document de contrôle »
 * (DOCX/PDF humain → données structurées). Entrée : le TEXTE extrait du
 * document (un paragraphe ou une ligne par ligne), sortie : JSON versionné
 * consommé par le Content Engine. Toutes les cartes sortent en `draft` ; rien
 * n'est inventé ni complété : le script ne fait que découper, et recoller les
 * fragments arabes que l'extraction PDF a coupés (cas simples seulement,
 * signalés pour relecture ; le reste est laissé vide et annoté).
 *
 * Format attendu (une carte) :
 *   1.01 - Titre
 *   QUESTION : …            (suivi d'éventuels choix « A. … », « Vrai / Faux »)
 *   RÉPONSE : …             (« A. » ou « A. texte » = le choix A, repris tel quel)
 *   Explication FR : …
 *   الشرح بالعربية: …
 *   Source : <ouvrage> - commentaire de <auteur>, PDF transmis, p. 35-36.
 *         ou <ouvrage> - <auteur>, PDF p. 33-36.
 *         ou <ouvrage>, Shaykh <auteur>. <thème>. PDF p. 40.
 *         ou <ouvrage> - commentaire de <auteur>, sur le matn d'…. Matn, vers 3-4, PDF p. 12.
 *   Animation suggérée : <description libre>
 *
 * La description d'animation est conservée telle quelle (`animationHint`) ;
 * une clé de famille visuelle (`animationKey`) en est déduite par mots-clés,
 * de façon déterministe. Présentation pure : aucune influence sur le jeu.
 *
 *   node scripts/content/import-durous.mjs <texte.txt> <sortie.json> <nœud> <préfixe-id> [éditeur]
 *   ex. … durous.txt src/content/questions/religion/ad-durous-al-mouhimmah.v1.json religion.bases.durous REL-DRS-ARB
 */
import { readFileSync, writeFileSync } from "node:fs";

const [, , input, output, nodePrefix, idPrefix, publisher] = process.argv;
if (!input || !output || !nodePrefix || !idPrefix) {
  console.error("usage: import-durous.mjs <texte.txt> <sortie.json> <nœud> <préfixe-id> [éditeur]");
  process.exit(1);
}

const ARABIC = /[؀-ۿﭐ-﷿ﹰ-﻿]/;
const AR_PREFIX = "الشرح بالعربية";
const AR_PREFIX_RE = /^الشرح بالعربية\s*:\s*/;
const DIACRITIC_END = /[ً-ْٰ]$/;
/** Glyphe orphelin d'une extraction PDF (signe diacritique rendu « O », « W », « ? »…). */
const STRAY_GLYPH = /^(?:[A-Za-z?.9_]{1,2}|[\x00-\x1f]+)$/;
const LATIN_WORD = /[A-Za-zÀ-ÿʿʾĀāĪīŪūḤḥṢṣḌḍṬṭẒẓ]{3,}/;
/** Énoncés qui laissent voir le livre : signalés pour reformulation humaine, jamais réécrits ici. */
const CURTAIN = /\b(le texte|l[’']explication|le commentaire|le livre|la source)\b/i;

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
  [/flèche|chemin|parcours|ligne|frise|chaîne|étape|voie|destination|passeport|réseau|bannière|calendrier|chronolog/i, "arrow_path"],
  [/vague|onde|goutte|eau|cœur|bulle|nuage|brouillard|synchronis|langue|lumière/i, "wave_ripple"],
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
const arrows = [];
const repaired = [];
const manual = [];
let level = 0;
let ageBand = "";
let work = "";
let author = "";
let baseText = "";
let i = 0;

/** Lignes jusqu'au prochain marqueur (une ligne coupée sur un tiret se recolle sans espace). */
function collectUntil(stop) {
  const parts = [];
  while (i < lines.length && !stop(lines[i])) parts.push(lines[i++]);
  return parts;
}
const joinWrapped = (parts) => parts.reduce((acc, l) => (acc.endsWith("-") && !acc.endsWith(" -") ? acc + l.trim() : acc + " " + l.trim()), "").replace(/\s+/g, " ").trim();
const isHeader = (l) => /^\d\.\d{1,2} - /.test(l) || /^NIVEAU \d$/.test(l);

while (i < lines.length) {
  const line = lines[i];
  const lvl = line.match(/^NIVEAU (\d)$/);
  if (lvl) {
    level = Number(lvl[1]);
    i += 1;
    const pub = lines[i]?.match(/^(?:Public indicatif : )?(.+?) - \d+ cartes?$/);
    if (pub) {
      ageBand = pub[1].replace(/\s*\/\s*adultes/, "").replace(/\s*ans\s*/g, "").trim();
      i += 1;
    }
    continue;
  }
  const head = line.match(/^(\d)\.(\d{1,2}) - (.+)$/);
  if (!head || level === 0) {
    i += 1;
    continue;
  }
  if (Number(head[1]) !== level) throw new Error(`carte ${head[1]}.${head[2]} hors du niveau ${level}`);
  const number = head[2].padStart(2, "0");
  const id = `${idPrefix}-L${level}-${number}`;
  const title = head[3].trim();
  i += 1;
  const questionLines = [lines[i++].replace(/^QUESTION :\s*/, ""), ...collectUntil((l) => /^[A-D]\. /.test(l) || l.startsWith("RÉPONSE :") || /^(Vrai|Faux|Vrai \/ Faux)$/.test(l))];
  const question = joinWrapped(questionLines);
  let choices = collectUntil((l) => l.startsWith("RÉPONSE :")).map((c) => c.trim());
  if (choices.join(" ") === "Vrai Faux") choices = ["Vrai / Faux"];
  let answer = lines[i++].replace(/^RÉPONSE :\s*/, "").trim();
  const explanationFr = [lines[i++].replace(/^Explication FR :\s*/, "")];
  // Jusqu'à « Source : » : suite de l'explication FR, puis explication AR (éventuellement en fragments).
  const between = collectUntil((l) => l.startsWith("Source :"));
  // Une ligne avec des mots latins est la suite du FR (même si elle cite « رضي الله عنها ») ; sinon fragment arabe, ou glyphe orphelin.
  const isFr = (l) => LATIN_WORD.test(l);
  const pieces = between.filter((l) => !isFr(l) && (ARABIC.test(l) || STRAY_GLYPH.test(l.trim()))).map((l) => l.trim());
  explanationFr.push(...between.filter((l) => isFr(l)));
  const source = joinWrapped([lines[i++].replace(/^Source :\s*/, ""), ...collectUntil((l) => l.startsWith("Animation suggérée :"))]);
  const hint = joinWrapped([lines[i++].replace(/^Animation suggérée :\s*/, ""), ...collectUntil(isHeader)]);

  // « RÉPONSE : A. » ou « A. texte » désigne le choix A : on reprend son texte tel quel (aucune reformulation).
  const letter = answer.match(/^([A-D])\.(?:\s+(.+))?$/);
  if (letter) {
    const choice = choices.find((c) => c.startsWith(`${letter[1]}. `));
    if (!choice) throw new Error(`carte ${id} : réponse « ${answer} » sans choix correspondant`);
    answer = (letter[2] ?? choice.slice(3)).trim().replace(/\.?$/, ".");
    letterAnswers.push(id);
  }
  if (CURTAIN.test(question)) curtain.push(id);
  const arrowsMoved = /→→|→\.?$/.test([question, ...choices, answer].join(" "));
  if (arrowsMoved) arrows.push(id);

  const src = parseSource(source, id);
  work = work || src.title;
  author = author || src.author;
  baseText = baseText || src.baseText;
  const joined = assembleArabic(pieces, id);
  const notes = [
    joined.note ?? "",
    CURTAIN.test(question) ? "L'énoncé mentionne le texte ou le commentaire : à reformuler en relecture pour garder le livre derrière le rideau (la source reste sous la réponse)." : "",
    arrowsMoved ? "Flèches de chronologie déplacées par l'extraction (« → » regroupées en fin de choix) : remettre chaque flèche entre les étapes depuis le document de contrôle." : "",
  ].filter(Boolean);

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
    answer: { fr: answer.replace(/\s+/g, " ") },
    explanation: { fr: joinWrapped(explanationFr), ar: joined.ar },
    sources: [{ title: src.title, author: src.author, pages: src.pages, ...(src.locator ? { locator: src.locator } : {}), ...(publisher ? { publisher } : {}) }],
    animationKey: animationKeyFor(hint),
    animationHint: hint,
    ...(notes.length > 0 ? { reviewNotes: notes.join(" ") } : {}),
  });
}

/**
 * « <ouvrage> - commentaire de <auteur>, PDF transmis, p. 35-36. »
 * « <ouvrage> - commentaire de <auteur>, sur le matn d'<texte>. Matn, vers 3-4, PDF p. 12. »
 */
function parseSource(source, id) {
  const matn = source.match(/^(.+?) - (?:commentaire de\s+)?(.+?), sur le matn d[’'](.+?)\. (Matn, vers [\d\s,\-–]+?), PDF p\. (\d+)\.?$/);
  if (matn) return { title: matn[1].trim(), author: matn[2].trim(), pages: matn[5], locator: matn[4].replace(/\s+/g, " ").trim(), baseText: matn[3].trim() };
  const plain = source.match(/^(.+?) - (?:commentaire de\s+)?(.+?), (?:PDF transmis, p\.|PDF p\.) (.+?)\.?$/);
  if (plain) return { title: plain[1].trim(), author: plain[2].trim(), pages: plain[3].trim(), locator: "", baseText: "" };
  const themed = source.match(/^(.+), (Shaykh [^.]+?)\. (.+?)\. PDF p\. (.+?)\.?$/);
  if (themed) return { title: themed[1].trim(), author: themed[2].trim(), pages: themed[4].trim(), locator: themed[3].trim(), baseText: "" };
  throw new Error(`carte ${id} : source non reconnue « ${source} »`);
}

/**
 * Explication arabe : une ligne propre commençant par « الشرح بالعربية » est
 * reprise telle quelle. L'extraction PDF coupe parfois le texte autour d'un
 * signe diacritique et livre les morceaux à l'envers (fin, [lettre ou glyphe
 * orphelin], début). Seuls ces cas simples (≤ 3 fragments, tête reconnaissable)
 * sont recollés et signalés pour relecture ; quand le signe diacritique est
 * devenu un glyphe orphelin (« F », « O »…), il est perdu à la jonction et la
 * carte le dit. Tout texte recollé doit se terminer par une ponctuation finale
 * sans point collé à une lettre. Tout le reste est laissé VIDE et annoté pour
 * saisie manuelle — jamais un texte religieux approximatif.
 */
function assembleArabic(pieces, id) {
  const strip = (text) => text.replace(AR_PREFIX_RE, "").replace(/\s+/g, " ").trim();
  const isGlyph = (f) => !ARABIC.test(f) && STRAY_GLYPH.test(f);
  const fail = (why) => {
    manual.push(`${id} (${why})`);
    return { ar: "", note: `Explication arabe illisible à l'extraction (${why}) : à saisir manuellement depuis le document de contrôle.` };
  };
  const whole = (text) => /[.؟!]$/.test(text) && !/\.[^\s]/.test(text);
  const accept = (text, flag, note) => {
    if (!whole(text)) return fail(flag ? "réassemblage incertain" : "ligne incomplète");
    if (flag) repaired.push(id);
    return note ? { ar: text, note } : { ar: text };
  };
  /** Recollage tête + fin : la coupure suit un signe diacritique ou une frontière de mot ; une jonction au milieu d'un mot sans signe a pu perdre des lettres. */
  const junction = (headRaw, tail, between = "") => (DIACRITIC_END.test(headRaw) || /\s$/.test(headRaw) || between ? accept(strip(headRaw + between + tail), true) : fail("jonction sans signe diacritique, lettres peut-être perdues"));
  const clean = pieces.filter(Boolean);
  if (clean.length === 0) return fail("absente");
  if (clean.length === 1) {
    if (isGlyph(clean[0])) return fail("glyphe seul");
    const idx = clean[0].indexOf(AR_PREFIX);
    if (idx === 0) return accept(strip(clean[0]), false);
    if (idx > 0) return junction(clean[0].slice(idx), clean[0].slice(0, idx));
    return fail("1 fragment sans en-tête");
  }
  const headLine = clean[clean.length - 1];
  // Une ligne arabe complète accompagnée de seuls glyphes orphelins (caractères de contrôle) : reprise telle quelle.
  if (headLine.startsWith(AR_PREFIX) && clean.slice(0, -1).every(isGlyph)) return accept(strip(headLine), false);
  // Fin, [lettre(s) isolée(s)], début — avec d'éventuels glyphes orphelins (signes diacritiques perdus) entre les morceaux.
  const core = clean.filter((f) => !isGlyph(f));
  const glyphs = clean.length - core.length;
  const tail = core[0];
  const between = core.slice(1, -1);
  const simple = core.length >= 2 && core.length <= 3 && !isGlyph(clean[0]) && headLine === core[core.length - 1] && headLine.startsWith(AR_PREFIX) && !tail.includes(AR_PREFIX) && between.every((f) => /^[ء-ي]{1,2}$/.test(f));
  if (simple && glyphs === 0) return junction(headLine, tail, between.reverse().join(""));
  if (simple) {
    const text = strip(headLine + between.reverse().join("") + tail);
    const junctionMark = `${strip(headLine).slice(-2)}|${tail.slice(0, 3)}`;
    return accept(text, true, `Signe diacritique perdu à l'extraction à la jonction « ${junctionMark} » : à rétablir depuis le document de contrôle.`);
  }
  return fail(`${clean.length} fragments`);
}

const byLevel = cards.reduce((acc, c) => ({ ...acc, [c.difficulty]: (acc[c.difficulty] ?? 0) + 1 }), {});
const bank = {
  $comment: `Banque religieuse importée depuis le document de contrôle humain (source de fond : ${work}, ${author}${baseText ? `, sur le matn d'${baseText}` : ""}). TOUTES les cartes sont \`draft\` tant qu'elles ne sont pas explicitement passées à \`validated\` après relecture humaine ; seules les cartes validées sont jouables. Aucun contenu n'est inventé ni complété par le code ; \`animationHint\` est la suggestion visuelle de l'auteur, \`animationKey\` la famille déduite (présentation pure).`,
  version: 1,
  work,
  author,
  ...(publisher ? { publisher } : {}),
  category: nodePrefix.split(".").slice(0, 2).join("."),
  questions: cards,
};
writeFileSync(output, JSON.stringify(bank, null, 2) + "\n");
const byKey = cards.reduce((acc, c) => ({ ...acc, [c.animationKey]: (acc[c.animationKey] ?? 0) + 1 }), {});
console.log(`cartes : ${cards.length}`, JSON.stringify(byLevel));
console.log(`réponses « lettre » résolues vers le texte du choix : ${letterAnswers.length}`);
console.log("familles d'animation déduites :", JSON.stringify(byKey));
console.log(`énoncés à reformuler (le livre derrière le rideau) : ${curtain.length}`, curtain.join(", "));
console.log(`flèches de chronologie à remettre en place : ${arrows.length}`, arrows.join(", "));
console.log(`arabe réassemblé (à relire) : ${repaired.length}`, repaired.join(", "));
console.log(`arabe à saisir manuellement : ${manual.length}`, manual.join(", "));
