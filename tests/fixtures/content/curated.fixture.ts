import type { CuratedQuestion } from "@/core/content";

/**
 * ⚠️ FIXTURES DE TEST — banque curée fictive pour exercer le Learning Engine
 * (langue arabe, logique, culture). Aucune question religieuse : cette
 * catégorie reste vide tant qu'aucun contenu sourcé et validé n'est fourni.
 * Ces questions ne sont PAS la banque Kounouzi.
 */
const q = (id: string, categoryId: string, knowledgeNodeId: string, difficulty: number, audienceScope: CuratedQuestion["audienceScope"], prompt: string, answer: string, answerAr: string): CuratedQuestion => ({
  id,
  version: 1,
  categoryId,
  knowledgeNodeId,
  difficulty,
  audienceScope,
  status: "validated",
  prompt: { fr: prompt, ar: `سؤال اختبار: ${prompt}` },
  answer: { fr: answer, ar: answerAr },
  explanation: { fr: `Explication de test : ${answer}.`, ar: `شرح اختبار: ${answerAr}.` },
  sources: [],
});

export const TEST_ARABIC: readonly CuratedQuestion[] = [
  q("ar-1", "arabic", "arabic.vocab.book", 1, "all", "Comment dit-on « livre » en arabe ?", "kitāb", "كتاب"),
  q("ar-2", "arabic", "arabic.vocab.house", 1, "all", "Comment dit-on « maison » en arabe ?", "bayt", "بيت"),
  q("ar-3", "arabic", "arabic.vocab.water", 2, "all", "Comment dit-on « eau » en arabe ?", "māʾ", "ماء"),
  q("ar-4", "arabic", "arabic.vocab.sun", 2, "all", "Comment dit-on « soleil » en arabe ?", "shams", "شمس"),
  q("ar-5", "arabic", "arabic.vocab.moon", 3, "all", "Comment dit-on « lune » en arabe ?", "qamar", "قمر"),
  q("ar-6", "arabic", "arabic.vocab.sea", 3, "all", "Comment dit-on « mer » en arabe ?", "baḥr", "بحر"),
  q("ar-7", "arabic", "arabic.vocab.tree", 4, "all", "Comment dit-on « arbre » en arabe ?", "shajara", "شجرة"),
  q("ar-8", "arabic", "arabic.vocab.sky", 5, "all", "Comment dit-on « ciel » en arabe ?", "samāʾ", "سماء"),
];

/** Questions réservées à une audience : pour prouver que la frontière n'est jamais franchie. */
export const TEST_CHILD_ONLY: readonly CuratedQuestion[] = [
  q("logic-child-1", "logic", "logic.test.child-1", 1, "child", "Question de test réservée aux enfants 1", "réponse", "جواب"),
  q("logic-child-2", "logic", "logic.test.child-2", 2, "child", "Question de test réservée aux enfants 2", "réponse", "جواب"),
];
export const TEST_ADULT_ONLY: readonly CuratedQuestion[] = [
  q("culture-adult-1", "culture", "culture.test.adult-1", 3, "adult", "Question de test réservée aux adultes 1", "réponse", "جواب"),
  q("culture-adult-2", "culture", "culture.test.adult-2", 4, "adult", "Question de test réservée aux adultes 2", "réponse", "جواب"),
];

export const TEST_CURATED: readonly CuratedQuestion[] = [...TEST_ARABIC, ...TEST_CHILD_ONLY, ...TEST_ADULT_ONLY];
