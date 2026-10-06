import type { EcouteConfig } from "@/config/ecoute";
import type { AnswerOutcome } from "@/core/shared";

/**
 * Comparaison d'une phrase entendue au vocabulaire configuré. Fonction PURE :
 * même phrase, même verdict, toujours — rien d'aléatoire, rien d'appris.
 *
 * Trois règles, et elles comptent toutes les trois :
 *
 * 1. On compare des MOTS ENTIERS. Sans cela « bonjuste » ou « injuste »
 *    vaudraient « juste ».
 * 2. La phrase la plus LONGUE gagne. Sans cela « pas juste » serait entendu
 *    comme « juste » : un enfant qui a eu faux serait félicité, et l'inverse.
 * 3. Deux verdicts DIFFÉRENTS à égale longueur ne valident rien. On ne devine
 *    pas un verdict à la place d'un enfant : la tablée redit le mot, ou appuie.
 */

/** Minuscules, sans accents ni signes diacritiques, sans ponctuation, espaces resserrés. */
export function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ًͯ-ْ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** `vrai` si `phrase` apparaît dans `texte` en mots entiers (les deux déjà normalisés). */
function contientMots(texte: string, phrase: string): boolean {
  const mots = texte.split(" ");
  const cible = phrase.split(" ");
  if (cible.length === 0 || cible[0] === "") return false;
  for (let i = 0; i + cible.length <= mots.length; i += 1) {
    if (cible.every((m, k) => mots[i + k] === m)) return true;
  }
  return false;
}

/**
 * Le verdict entendu dans cette phrase, ou `undefined` : rien de reconnu, ou
 * deux verdicts aussi plausibles l'un que l'autre.
 */
export function verdictEntendu(transcription: string, config: EcouteConfig): AnswerOutcome | undefined {
  const texte = normaliser(transcription);
  if (texte === "") return undefined;
  let meilleur: { readonly id: AnswerOutcome; readonly mots: number } | undefined;
  let ambigu = false;
  for (const commande of config.commandes) {
    for (const phrase of commande.phrases) {
      const cible = normaliser(phrase);
      if (cible === "" || !contientMots(texte, cible)) continue;
      const mots = cible.split(" ").length;
      if (meilleur === undefined || mots > meilleur.mots) {
        meilleur = { id: commande.id, mots };
        ambigu = false;
      } else if (mots === meilleur.mots && commande.id !== meilleur.id) {
        ambigu = true;
      }
    }
  }
  return ambigu || meilleur === undefined ? undefined : meilleur.id;
}
