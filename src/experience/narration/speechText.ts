import type { Locale } from "@/core/shared";
import { t } from "@/i18n";
import type { Utterance } from "./NarrationService";

/**
 * Préparation du TEXTE PARLÉ (couche d'expérience, fonctions pures) :
 * - découpage des choix « A. … B. … » écrits dans l'énoncé en phrases
 *   séparées (« Question : … », « Réponse A : … », « Réponse B : … ») pour
 *   que la voix marque une vraie pause ;
 * - forme prononçable des translittérations (lexique de DONNÉES + règles
 *   déterministes de repli sur les seuls mots portant des signes de
 *   translittération) : le texte AFFICHÉ ne change jamais ;
 * - segmentation par écriture : un passage en écriture arabe est dit avec
 *   la voix arabe quand l'appareil en a une, sinon il est tu (jamais
 *   massacré par une voix française). Aucun hasard, aucune influence sur le jeu.
 */

export interface PronunciationLexicon {
  /** Symboles remplacés partout avant la lecture (ex. ﷺ → formule prononçable). */
  readonly symbols: Readonly<Record<string, string>>;
  /** Mots ou expressions (insensibles à la casse) → forme prononçable en français. */
  readonly words: Readonly<Record<string, string>>;
}

export const EMPTY_LEXICON: PronunciationLexicon = { symbols: {}, words: {} };

export interface Choice {
  readonly letter: string;
  readonly text: string;
}

export interface SplitPrompt {
  readonly question: string;
  readonly choices: readonly Choice[];
}

const CHOICE_MARK = /(^|\s)([A-D])\.\s+/g;

/** Sépare « … ? A. Allah B. Une statue » en question + choix ; sans suite A, B, C… valide, l'énoncé reste entier. */
export function splitChoices(prompt: string): SplitPrompt {
  const marks = [...prompt.matchAll(CHOICE_MARK)].map((m) => ({ letter: m[2]!, start: m.index! + m[1]!.length, end: m.index! + m[0].length }));
  const sequential = marks.length >= 2 && marks.every((m, i) => m.letter === String.fromCharCode(65 + i));
  if (!sequential) return { question: prompt.trim(), choices: [] };
  const question = prompt.slice(0, marks[0]!.start).trim();
  const choices = marks.map((m, i) => ({ letter: m.letter, text: prompt.slice(m.end, i + 1 < marks.length ? marks[i + 1]!.start : undefined).trim() })).filter((c) => c.text !== "");
  if (choices.length !== marks.length || question === "") return { question: prompt.trim(), choices: [] };
  return { question, choices };
}

/** Phrases à dire pour une question : l'énoncé, puis chaque choix en phrase séparée (pause naturelle entre deux phrases). */
export function questionUtterances(prompt: string, locale: Locale): readonly Utterance[] {
  const { question, choices } = splitChoices(prompt);
  return [
    { text: t(locale, "narration.question", { prompt: question }), lang: locale, important: true },
    ...choices.map((c) => ({ text: t(locale, "narration.choice", { letter: c.letter, text: c.text }), lang: locale, important: true })),
  ];
}

const ARABIC_RUN = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]+(?:[\s؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]*[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]+)*/g;

export interface ScriptSegment {
  readonly lang: Locale;
  readonly text: string;
}

/** Découpe un texte en passages latin (« fr ») et arabe (« ar »), dans l'ordre, sans rien perdre. */
export function segmentsByScript(text: string): readonly ScriptSegment[] {
  const out: ScriptSegment[] = [];
  let cursor = 0;
  for (const m of text.matchAll(ARABIC_RUN)) {
    const start = m.index!;
    if (start > cursor) out.push({ lang: "fr", text: text.slice(cursor, start) });
    out.push({ lang: "ar", text: m[0] });
    cursor = start + m[0].length;
  }
  if (cursor < text.length) out.push({ lang: "fr", text: text.slice(cursor) });
  return out.map((s) => ({ ...s, text: s.text.trim() })).filter((s) => /[\p{L}\p{N}]/u.test(s.text));
}

/** Signes de translittération : seuls les mots qui en portent reçoivent les règles de repli. */
const TRANSLIT_MARK = /[āīūĀĪŪḤḥṢṣḌḍṬṭẒẓʿʾ]/;
const WORD = /[\p{L}\p{M}ʿʾ'’-]+/gu;
const CHAR_MAP: Readonly<Record<string, string>> = { ā: "a", ī: "i", ū: "ou", Ā: "A", Ī: "I", Ū: "Ou", Ḥ: "H", ḥ: "h", Ṣ: "S", ṣ: "s", Ḍ: "D", ḍ: "d", Ṭ: "T", ṭ: "t", Ẓ: "Z", ẓ: "z", ʿ: "", ʾ: "" };

/** Repli déterministe pour un mot translittéré : signes simplifiés, u → ou, sh → ch, dh → d, tiret → espace, « ah » final → « a ». */
function fallbackWord(word: string): string {
  let w = word.replace(/[āīūĀĪŪḤḥṢṣḌḍṬṭẒẓʿʾ]/g, (c) => CHAR_MAP[c] ?? c);
  w = w.replace(/(?<![oO])u/g, "ou").replace(/(?<![oO])U/g, "Ou");
  w = w.replace(/sh/g, "ch").replace(/Sh/g, "Ch").replace(/dh/g, "d").replace(/Dh/g, "D");
  w = w.replace(/-/g, " ").replace(/ah\b/g, "a");
  return w;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Texte à faire dire : symboles, lexique (expressions les plus longues d'abord, insensible à la casse), puis repli sur les mots marqués. Le texte affiché reste intact. */
export function pronounceable(text: string, lexicon: PronunciationLexicon): string {
  let out = text;
  for (const [symbol, spoken] of Object.entries(lexicon.symbols)) out = out.split(symbol).join(spoken);
  const entries = Object.entries(lexicon.words).sort((a, b) => b[0].length - a[0].length || a[0].localeCompare(b[0]));
  for (const [word, spoken] of entries) {
    const re = new RegExp(`(?<![\\p{L}\\p{M}])${escapeRegExp(word)}(?![\\p{L}\\p{M}])`, "giu");
    out = out.replace(re, spoken);
  }
  out = out.replace(WORD, (w) => (TRANSLIT_MARK.test(w) ? fallbackWord(w) : w));
  return out.replace(/\s{2,}/g, " ").trim();
}

export interface SpeechPlanOptions {
  readonly hasArabicVoice: boolean;
  readonly lexicon: PronunciationLexicon;
}

/**
 * Plan de lecture d'une phrase : une phrase arabe n'est dite qu'avec une voix
 * arabe ; une phrase française est découpée par écriture, ses passages arabes
 * dits en arabe (ou tus sans voix arabe), ses passages latins rendus prononçables.
 */
export function planUtterances(utterance: Utterance, options: SpeechPlanOptions): readonly Utterance[] {
  if (utterance.lang === "ar") return options.hasArabicVoice ? [utterance] : [];
  const prepared = pronounceable(utterance.text, options.lexicon);
  return segmentsByScript(prepared)
    .filter((s) => s.lang !== "ar" || options.hasArabicVoice)
    .map((s) => ({ text: s.text, lang: s.lang, ...(utterance.important ? { important: true } : {}) }));
}
